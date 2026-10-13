#!/usr/bin/env bash
# Deploy the Phase 1 lab Worker `m98m-rank-lab` (workers.dev only, no custom route).
# Mirrors scripts/deploy-engine.sh: API token at ~/.m98m/cf-token (chmod 600), never printed.
#   bash rank-lab/deploy.sh
#
# LAB_KEY is pushed from ~/.m98m/rank-lab-key (run rank-lab/mint-lab-key.sh first) — it is our
# own gate key, not an eBay credential, and its value is never printed.
#
# The eBay secrets are NOT set here. Hasib adds them once, himself, in the dashboard:
#   Workers & Pages -> m98m-rank-lab -> Settings -> Variables and Secrets -> Add (type: Secret)
#     EBAY_APP_ID    ZAREENLT production App ID  (Client ID)
#     EBAY_CERT_ID   ZAREENLT production Cert ID (Client Secret)
# metadata.json carries "keep_bindings": ["secret_text"], so every later deploy preserves them.
set -euo pipefail
ACCT=22159c26d5386e3ac543be2bbed95e6d
NAME=m98m-rank-lab
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKFILE="$HOME/.m98m/cf-token"
[ -f "$TOKFILE" ] || { echo "No Cloudflare API token at $TOKFILE (needs Workers Scripts: Edit)"; exit 1; }
TOK="$(tr -d '[:space:]' < "$TOKFILE")"

echo "verifying token ..."
curl -s -H "Authorization: Bearer $TOK" https://api.cloudflare.com/client/v4/user/tokens/verify \
  | grep -q '"success":true' || { echo "token rejected"; exit 1; }
echo "token OK"

echo "uploading $(wc -c < "$ROOT/rank-lab/worker.js") bytes to $NAME ..."
RES=$(curl -s --max-time 120 -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/$NAME" \
  -H "Authorization: Bearer $TOK" \
  -F "metadata=@$ROOT/rank-lab/metadata.json;type=application/json" \
  -F "worker.js=@$ROOT/rank-lab/worker.js;type=application/javascript+module")
echo "$RES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('success'):
    print('DEPLOY FAILED'); print(json.dumps(d.get('errors'),indent=1)[:900]); sys.exit(1)
r=d.get('result') or {}
print('deployed ·', r.get('id'), '· modified', r.get('modified_on'))
"

# workers.dev subdomain is OFF by default on a new script — turn it on, and nothing else.
echo "enabling the workers.dev subdomain (no custom route, ever) ..."
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/$NAME/subdomain" \
  -H "Authorization: Bearer $TOK" -H "content-type: application/json" \
  --data '{"enabled":true,"previews_enabled":false}' \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('subdomain:', 'on' if (d.get('result') or {}).get('enabled') else d.get('errors'))
"

# LAB_KEY, straight from the file — piped, never echoed.
KEYFILE="$HOME/.m98m/rank-lab-key"
if [ -f "$KEYFILE" ]; then
  echo "pushing the LAB_KEY secret ..."
  python3 - "$TOK" "$ACCT" "$NAME" "$KEYFILE" <<'PY'
import json, sys, urllib.request
tok, acct, name, keyfile = sys.argv[1:5]
key = open(keyfile).read().strip()
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/accounts/{acct}/workers/scripts/{name}/secrets",
    data=json.dumps({"name": "LAB_KEY", "text": key, "type": "secret_text"}).encode(),
    headers={"Authorization": "Bearer " + tok, "content-type": "application/json"},
    method="PUT")
try:
    d = json.load(urllib.request.urlopen(req, timeout=60))
    print("  LAB_KEY:", "set" if d.get("success") else d.get("errors"))
except Exception as e:
    print("  LAB_KEY push failed:", str(e)[:200])
PY
else
  echo "no $KEYFILE — run: bash rank-lab/mint-lab-key.sh"
fi

echo "bindings that survived:"
curl -s -H "Authorization: Bearer $TOK" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/$NAME/bindings" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for b in (d.get('result') or []): print('  -', b.get('name'), '('+str(b.get('type'))+')')
"
echo
echo "Worker propagates in ~30-60 s. Then:"
echo "  curl -s -H \"x-lab-key: \$(cat ~/.m98m/rank-lab-key)\" https://$NAME.m98m786.workers.dev/"
