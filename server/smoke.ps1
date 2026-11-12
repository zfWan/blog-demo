# Blog MVP smoke test (design doc section 6 permission matrix)
# Run after server is listening on :3000   powershell -File smoke.ps1
# NOTE: JSON bodies are ASCII-only to avoid PowerShell 5.1 native-arg encoding issues.
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:3000/api'
$tmp = Join-Path $env:TEMP ("blog-smoke-" + (Get-Random))
New-Item -ItemType Directory -Path $tmp | Out-Null
$script:fail = 0

function Check($name, $actual, $expect) {
  if ("$actual" -eq "$expect") {
    Write-Output ("PASS  {0}  (={1})" -f $name, $actual)
  } else {
    $script:fail++
    Write-Output ("FAIL  {0}  expect={1} actual={2}" -f $name, $expect, $actual)
  }
}

function Req($method, $url, $jar, $body) {
  $args = @('-s', '-o', "$tmp\body.json", '-w', '%{http_code}', '-X', $method, "$base$url")
  if ($jar) { $args += @('-b', $jar, '-c', $jar) }
  if ($body) {
    # PS 5.1 mangles embedded quotes in native args; pass body via file instead
    $bodyFile = "$tmp\req.json"
    [System.IO.File]::WriteAllText($bodyFile, $body, (New-Object System.Text.UTF8Encoding($false)))
    $args += @('-H', 'Content-Type: application/json', '--data', "@$bodyFile")
  }
  $code = & curl.exe @args
  $content = Get-Content "$tmp\body.json" -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  return [pscustomobject]@{ Code = [int]$code; Body = $content }
}

function JsonField($json, $field) {
  try { return ($json | ConvertFrom-Json).$field } catch { return $null }
}

function JsonCount($json) {
  return @( ($json | ConvertFrom-Json) ).Count
}

# ---- 1. anonymous ----
$r = Req 'GET' '/posts' $null $null
Check 'anon GET /posts -> 401' $r.Code 401

# ---- 2. register ----
$r = Req 'POST' '/auth/register' $null '{"email":"alice@test.com","username":"alice","password":"password123"}'
Check 'register alice -> 201' $r.Code 201
$r = Req 'POST' '/auth/register' $null '{"email":"alice@test.com","username":"alice2","password":"password123"}'
Check 'duplicate email -> 409' $r.Code 409
$r = Req 'POST' '/auth/register' $null '{"email":"bad","username":"x","password":"short"}'
Check 'invalid register -> 400' $r.Code 400
$r = Req 'POST' '/auth/register' $null '{"email":"bob@test.com","username":"bob","password":"password123"}'
Check 'register bob -> 201' $r.Code 201

# ---- 3. login ----
$aliceJar = "$tmp\alice.jar"; $bobJar = "$tmp\bob.jar"; $anonJar = "$tmp\anon.jar"
$r = Req 'POST' '/auth/login' $null '{"account":"alice","password":"wrong-pass9"}'
Check 'login wrong password -> 401' $r.Code 401
$r = Req 'POST' '/auth/login' $aliceJar '{"account":"alice","password":"password123"}'
Check 'alice login -> 200' $r.Code 200
$r = Req 'GET' '/auth/me' $aliceJar $null
Check 'cookie /auth/me -> alice' (JsonField $r.Body 'username') 'alice'
$r = Req 'GET' '/auth/me' $null $null
Check 'anon /auth/me -> 401' $r.Code 401
$r = Req 'POST' '/auth/login' $bobJar '{"account":"bob@test.com","password":"password123"}'
Check 'bob login by email -> 200' $r.Code 200

# ---- 4. posts CRUD + permissions ----
$r = Req 'POST' '/posts' $aliceJar '{"title":"alice-draft","content":"# draft content","status":"DRAFT"}'
$draftId = JsonField $r.Body 'id'
Check 'alice create draft -> 201' $r.Code 201
$r = Req 'POST' '/posts' $aliceJar '{"title":"alice-pub","content":"**public** content","status":"PUBLISHED"}'
$pubId = JsonField $r.Body 'id'
Check 'alice create published -> 201' $r.Code 201

$r = Req 'GET' '/posts' $aliceJar $null
Check 'alice list sees 2 (draft+pub)' (JsonCount $r.Body) 2
$r = Req 'GET' '/posts' $bobJar $null
Check 'bob list sees 1 (published only)' (JsonCount $r.Body) 1
$r = Req 'GET' "/posts/$draftId" $bobJar $null
Check 'bob read alice draft -> 404' $r.Code 404
$r = Req 'GET' "/posts/$draftId" $aliceJar $null
Check 'alice read own draft -> 200' $r.Code 200
$r = Req 'PATCH' "/posts/$draftId" $bobJar '{"title":"tamper"}'
Check 'bob patch alice post -> 404' $r.Code 404
$r = Req 'DELETE' "/posts/$pubId" $bobJar $null
Check 'bob delete alice post -> 404' $r.Code 404
$r = Req 'PATCH' "/posts/$draftId" $aliceJar '{"title":"alice-draft-v2"}'
Check 'alice patch own post -> 200' $r.Code 200

# ---- 5. markdown preview (XSS escaped) ----
$r = Req 'POST' '/posts/preview' $aliceJar '{"content":"<script>alert(1)</script>"}'
if ($r.Body -match '&lt;script&gt;') { Check 'preview escapes script tag' 'escaped' 'escaped' } else { Check 'preview escapes script tag' 'not-escaped' 'escaped' }

# ---- 6. share without password ----
$r = Req 'POST' "/posts/$draftId/shares" $aliceJar '{}'
$freeShare = $r.Body | ConvertFrom-Json
$freeToken = $freeShare.token
Check 'alice create free share -> 201' $r.Code 201
$r = Req 'GET' "/share/$freeToken" $null $null
Check 'anon free share -> 200' $r.Code 200
$r = Req 'GET' "/posts/$draftId/shares" $bobJar $null
Check 'bob list alice shares -> 404' $r.Code 404
$r = Req 'PATCH' "/shares/$($freeShare.id)" $bobJar '{"enabled":false}'
Check 'bob disable alice share -> 404' $r.Code 404

# ---- 7. share with password ----
$r = Req 'POST' "/posts/$pubId/shares" $aliceJar '{"password":"share66"}'
$pwShare = $r.Body | ConvertFrom-Json
$pwToken = $pwShare.token
Check 'alice create password share -> 201' $r.Code 201
$r = Req 'GET' "/share/$pwToken" $null $null
Check 'anon locked share -> 401' $r.Code 401
Check 'response needPassword=true' (JsonField $r.Body 'needPassword') 'True'
$unlockJar = "$tmp\unlock.jar"
$r = Req 'POST' "/share/$pwToken/unlock" $unlockJar '{"password":"wrong66"}'
Check 'unlock wrong password -> 401' $r.Code 401
$r = Req 'POST' "/share/$pwToken/unlock" $unlockJar '{"password":"share66"}'
Check 'unlock correct password -> 200' $r.Code 200
$r = Req 'GET' "/share/$pwToken" $unlockJar $null
Check 'unlocked session -> 200' $r.Code 200
$r = Req 'GET' "/share/$pwToken" $anonJar $null
Check 'other anon session -> 401' $r.Code 401

# ---- 8. share enable/disable/delete ----
$r = Req 'PATCH' "/shares/$($pwShare.id)" $aliceJar '{"enabled":false}'
Check 'alice disable share -> 200' $r.Code 200
$r = Req 'GET' "/share/$pwToken" $null $null
Check 'disabled share -> 404' $r.Code 404
$r = Req 'PATCH' "/shares/$($pwShare.id)" $aliceJar '{"enabled":true}'
Check 'alice re-enable share -> 200' $r.Code 200
$r = Req 'DELETE' "/shares/$($pwShare.id)" $aliceJar $null
Check 'alice delete share -> 200' $r.Code 200
$r = Req 'GET' "/share/$pwToken" $null $null
Check 'deleted share -> 404' $r.Code 404

# ---- 9. cascade delete via post ----
$r = Req 'POST' "/posts/$draftId/shares" $aliceJar '{}'
$s2 = $r.Body | ConvertFrom-Json
$r = Req 'DELETE' "/posts/$draftId" $aliceJar $null
Check 'alice delete post -> 200' $r.Code 200
$r = Req 'GET' "/share/$($s2.token)" $null $null
Check 'cascade share -> 404' $r.Code 404

# ---- 10. SPA static hosting ----
$code = & curl.exe -s -o "$tmp\root.html" -w '%{http_code}' http://localhost:3000/
$root = Get-Content "$tmp\root.html" -Raw
if ($code -eq '200' -and $root -match 'id="app"') { Check 'GET / serves index.html' 'spa' 'spa' } else { Check 'GET / serves index.html' $code '200+index' }
$code2 = & curl.exe -s -o "$tmp\spa2.html" -w '%{http_code}' http://localhost:3000/login
if ($code2 -eq '200') { Check 'SPA fallback /login -> 200' 'ok' 'ok' } else { Check 'SPA fallback /login -> 200' $code2 '200' }

Write-Output ''
if ($script:fail -eq 0) { Write-Output 'SMOKE RESULT: ALL PASS' } else { Write-Output ("SMOKE RESULT: {0} FAIL" -f $script:fail) }
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
