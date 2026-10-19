#!/usr/bin/env bash
# End-to-end smoke test of the BDU Store API over HTTP.
# Exercises the whole storage -> release workflow plus the negative cases.
set -uo pipefail

API="${API:-http://127.0.0.1:4000/api}"
TMP="$(mktemp -d)"
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s — %s\n' "$1" "$2"; }

# check <name> <expected_status> <actual_status> [extra]
check() {
  if [ "$2" = "$3" ]; then pass "$1 (HTTP $3)"; else fail "$1" "expected HTTP $2, got $3 ${4:-}"; fi
}

req() { # req <method> <path> <jar> [json]
  local method="$1" path="$2" jar="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -o "$TMP/body" -w '%{http_code}' -X "$method" "$API$path" \
      -H 'Content-Type: application/json' -b "$jar" -c "$jar" -d "$body"
  else
    curl -s -o "$TMP/body" -w '%{http_code}' -X "$method" "$API$path" \
      -b "$jar" -c "$jar"
  fi
}
json() { python3 -c "import json,sys;d=json.load(open('$TMP/body'));print(eval(sys.argv[1]))" "$1" 2>/dev/null; }

echo "BDU Store API smoke test against $API"
echo

echo "1. Registration"
STAMP=$(( RANDOM % 900 + 100 ))
UNI="bdu1${STAMP}001"
UNI_B="bdu2${STAMP}001"
code=$(req POST /auth/register "$TMP/u.jar" "{\"fullName\":\"Smoke Tester\",\"universityId\":\"$UNI\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret123\"}")
check "register a new campus user" 201 "$code" "$(cat $TMP/body)"
USER_ID=$(json "d['data']['id']")
[ -n "$USER_ID" ] && pass "user id returned" || fail "user id returned" "missing"

code=$(req POST /auth/register "$TMP/x.jar" "{\"fullName\":\"Clone\",\"universityId\":\"$UNI\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret123\"}")
check "duplicate university ID rejected" 409 "$code"

code=$(req POST /auth/register "$TMP/x.jar" "{\"fullName\":\"Clone Case\",\"universityId\":\"${UNI^^}\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret123\"}")
check "upper-case university ID is a separate account" 201 "$code"

code=$(req POST /auth/register "$TMP/x.jar" "{\"fullName\":\"Non-Canonical ID\",\"universityId\":\"abc$STAMP\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret123\"}")
check "non-canonical university ID accepted" 201 "$code"

code=$(req POST /auth/register "$TMP/x.jar" "{\"fullName\":\"Mismatch\",\"universityId\":\"bdu9${STAMP}001\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret999\"}")
check "password mismatch rejected" 422 "$code"

echo
echo "2. Login and session"
code=$(req POST /auth/login "$TMP/u.jar" "{\"universityId\":\"$UNI\",\"password\":\"Secret123\"}")
check "login with university ID" 200 "$code"
code=$(req POST /auth/login "$TMP/u.jar" "{\"universityId\":\"${UNI^^}\",\"password\":\"Secret123\"}")
check "login with upper-case university ID fails" 401 "$code"
code=$(req POST /auth/login "$TMP/x.jar" "{\"universityId\":\"$UNI\",\"password\":\"WrongPass1\"}")
check "wrong password rejected" 401 "$code"
code=$(req GET /auth/me "$TMP/u.jar")
check "GET /auth/me with session" 200 "$code"
code=$(req GET /auth/me "$TMP/none.jar")
check "GET /auth/me without session rejected" 401 "$code"

echo
echo "3. Device registration"
code=$(req POST /devices "$TMP/u.jar" "{\"productType\":\"LAPTOP\",\"productName\":\"Smoke Laptop\",\"brand\":\"Lenovo\",\"serialNumber\":\"SMOKE-LAP-$STAMP\"}")
check "register a laptop with serial" 201 "$code"
DEVICE_ID=$(json "d['data']['id']")
STATUS=$(json "d['data']['storageStatus']")
TOKEN=$(json "d['data']['storageToken']")
[ "$STATUS" = "PENDING" ] && pass "new device starts PENDING" || fail "new device starts PENDING" "got $STATUS"
[ "$TOKEN" = "None" ] && pass "no storage token issued at registration" || fail "no token at registration" "got $TOKEN"

code=$(req POST /devices "$TMP/u.jar" "{\"productType\":\"LAPTOP\",\"productName\":\"No Serial Laptop\"}")
check "laptop without serial rejected" 422 "$code"

code=$(req POST /devices "$TMP/u.jar" "{\"productType\":\"OTHER\",\"productName\":\"Desk Lamp\"}")
check "OTHER device without serial accepted" 201 "$code"
OTHER_ID=$(json "d['data']['id']")

code=$(req POST /devices "$TMP/u.jar" "{\"productType\":\"TOASTER\",\"productName\":\"Bad Type\"}")
check "unknown product type rejected" 422 "$code"

code=$(req GET /devices/my "$TMP/u.jar")
check "list my devices" 200 "$code"
COUNT=$(json "len(d['data'])")
[ "$COUNT" = "2" ] && pass "both devices returned" || fail "both devices returned" "got $COUNT"

code=$(req GET /devices/my "$TMP/none.jar")
check "device list without session rejected" 401 "$code"

echo
echo "4. Ownership enforcement"
code=$(req POST /auth/register "$TMP/x.jar" "{\"fullName\":\"Second Tester\",\"universityId\":\"$UNI_B\",\"password\":\"Secret123\",\"confirmPassword\":\"Secret123\"}")
check "register a second campus user" 201 "$code"
code=$(req POST /auth/login "$TMP/x.jar" "{\"universityId\":\"$UNI_B\",\"password\":\"Secret123\"}")
check "second user logs in" 200 "$code"
code=$(req POST /devices "$TMP/x.jar" "{\"productType\":\"TABLET\",\"productName\":\"Second Tablet\",\"serialNumber\":\"SMOKE-INT-$STAMP\"}")
check "second user registers their own tablet" 201 "$code"
INTRUDER_DEVICE=$(json "d['data']['id']")
code=$(req GET "/devices/$INTRUDER_DEVICE" "$TMP/u.jar")
check "cannot read another user's device" 403 "$code"
code=$(req POST "/devices/$INTRUDER_DEVICE/release-requests" "$TMP/u.jar")
check "cannot request release of another user's device" 403 "$code"

echo
echo "5. Role enforcement"
code=$(req GET /admin/storage-requests "$TMP/u.jar")
check "campus user blocked from admin endpoint" 403 "$code"

echo
echo "6. Administrator storage decision"
code=$(req POST /auth/login "$TMP/a.jar" "{\"universityId\":\"bdu0000001\",\"password\":\"Admin12345\"}")
check "administrator login" 200 "$code"
code=$(req GET '/admin/storage-requests?status=PENDING' "$TMP/a.jar")
check "list pending storage requests" 200 "$code"
code=$(req PATCH "/admin/devices/$DEVICE_ID/approve-storage" "$TMP/a.jar")
check "approve storage" 200 "$code"
TOKEN=$(json "d['data']['storageToken']")
STATUS=$(json "d['data']['storageStatus']")
[ "$STATUS" = "STORED" ] && pass "device moved to STORED" || fail "device moved to STORED" "got $STATUS"
[ -n "$TOKEN" ] && [ "$TOKEN" != "None" ] && pass "storage token issued: $TOKEN" || fail "token issued" "got $TOKEN"
code=$(req PATCH "/admin/devices/$DEVICE_ID/approve-storage" "$TMP/a.jar")
check "double approval rejected" 409 "$code"

code=$(req PATCH "/admin/devices/$OTHER_ID/reject-storage" "$TMP/a.jar" '{"rejectionReason":""}')
check "rejection without reason rejected" 422 "$code"
code=$(req PATCH "/admin/devices/$OTHER_ID/reject-storage" "$TMP/a.jar" '{"rejectionReason":"Device was never handed in at the counter."}')
check "reject storage with reason" 200 "$code"
RSTATUS=$(json "d['data']['storageStatus']")
[ "$RSTATUS" = "REJECTED" ] && pass "device moved to REJECTED" || fail "device REJECTED" "got $RSTATUS"

echo
echo "7. Release request"
code=$(req POST "/devices/$DEVICE_ID/release-requests" "$TMP/u.jar")
check "owner requests release of stored device" 201 "$code"
RELEASE_ID=$(json "d['data']['id']")
code=$(req POST "/devices/$DEVICE_ID/release-requests" "$TMP/u.jar")
check "duplicate pending release request rejected" 409 "$code"
code=$(req POST "/devices/$OTHER_ID/release-requests" "$TMP/u.jar")
check "release of a non-stored device rejected" 409 "$code"

code=$(req GET '/admin/release-requests?status=PENDING' "$TMP/a.jar")
check "admin lists pending release requests" 200 "$code"

echo
echo "8. Administrator release decisions"
code=$(req PATCH "/admin/release-requests/$RELEASE_ID/reject" "$TMP/a.jar" '{"rejectionReason":"Please collect it after 16:00."}')
check "reject release request" 200 "$code"
DSTATUS=$(json "d['data']['device']['storageStatus']")
[ "$DSTATUS" = "STORED" ] && pass "device still STORED after release rejection" || fail "device stays STORED" "got $DSTATUS"

code=$(req POST "/devices/$DEVICE_ID/release-requests" "$TMP/u.jar")
check "owner may request release again after rejection" 201 "$code"
RELEASE2=$(json "d['data']['id']")
code=$(req PATCH "/admin/release-requests/$RELEASE2/approve" "$TMP/a.jar")
check "approve release request" 200 "$code"
DSTATUS=$(json "d['data']['device']['storageStatus']")
[ "$DSTATUS" = "RELEASED" ] && pass "device moved to RELEASED" || fail "device RELEASED" "got $DSTATUS"
code=$(req PATCH "/admin/release-requests/$RELEASE2/approve" "$TMP/a.jar")
check "double release approval rejected" 409 "$code"

echo
echo "9. Persistence and listing"
code=$(req GET /devices/my "$TMP/u.jar")
FINAL=$(json "[ (x['productName'], x['storageStatus'], x['releaseRequest']['status'] if x['releaseRequest'] else None) for x in d['data'] ]")
echo "     stored state: $FINAL"
code=$(req GET /admin/devices/stored "$TMP/a.jar")
check "stored devices listing" 200 "$code"

echo
echo "-----------------------------------------------"
printf 'passed: %d   failed: %d\n' "$PASS" "$FAIL"
rm -rf "$TMP"
[ "$FAIL" -eq 0 ]
