#!/usr/bin/env bash
# Deploy engine/worker.js to the m98m-engine Worker with a Cloudflare API token.
# Token lives at ~/.m98m/cf-token (chmod 600) and is never printed.
#   bash scripts/deploy-engine.sh
set -euo pipefail
ACCT=22159c26d5386e3ac543be2bbed95e6d
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKFILE="$HOME/.m98m/cf-token"
[ -f "$TOKFILE" ] || { echo "No token at $TOKFILE"; exit 1; }
TOK="$(tr -d '[:space:]' < "$TOKFILE")"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Bindings re-declared in full. OFFICE_IP and AUTOMSG_LIVE are plain_text: absent from
# metadata they are DROPPED, and an empty OFFICE_IP silently disarms the office sign-in gate.
cat > "$TMP/metadata.json" <<'JSON'
{"main_module":"worker.js","compatibility_date":"2024-09-23",
 "keep_bindings":["plain_text","secret_text","json","d1","kv_namespace","r2_bucket","queue","service","durable_object_namespace","analytics_engine"]}
JSON

echo "verifying token ..."
WHO=$(curl -s -H "Authorization: Bearer $TOK" https://api.cloudflare.com/client/v4/user/tokens/verify)
echo "$WHO" | grep -q '"success":true' || { echo "token rejected: $WHO"; exit 1; }
echo "token OK"

echo "uploading $(wc -c < "$ROOT/engine/worker.js") bytes ..."
RES=$(curl -s --max-time 180 -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/m98m-engine" \
  -H "Authorization: Bearer $TOK" \
  -F "metadata=@$TMP/metadata.json;type=application/json" \
  -F "worker.js=@$ROOT/engine/worker.js;type=application/javascript+module")
echo "$RES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('success'):
    print('DEPLOY FAILED'); print(json.dumps(d.get('errors'),indent=1)[:900]); sys.exit(1)
r=d.get('result') or {}
print('deployed · id', r.get('id'), '· modified', r.get('modified_on'))
"
echo "checking the bindings survived ..."
curl -s -H "Authorization: Bearer $TOK" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/m98m-engine/settings" |
python3 -c "
import json,sys
b=(json.load(sys.stdin).get('result') or {}).get('bindings') or []
names={x['name']:x['type'] for x in b}
print('bindings:', ', '.join(sorted(names)))
for need in ('DB','HOT','SYNC_KEY','OFFICE_IP','EBAY_APP_ID','EBAY_CERT_ID','EBAY_DEV_ID','EBAY_RU_NAME'):
    print(('  OK  ' if need in names else '  MISSING  ')+need)
off=[x for x in b if x['name']=='OFFICE_IP']
print('office gate:', ('ARMED '+off[0].get('text','')) if off and off[0].get('text') else 'OPEN — gate disarmed, set OFFICE_IP')
"
echo "done. allow ~40s for isolate propagation before testing."
