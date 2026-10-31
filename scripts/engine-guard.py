#!/usr/bin/env python3
"""Engine guard: keep the live m98m-engine Worker equal to engine/worker.js on main, and its cron slots equal to
engine/crons.json. Runs from GitHub Actions (every 15 minutes, on push, or by hand). It never guesses: a binding that
is missing is reported loudly, never recreated, because its value is not known here.
Token comes from the CF_API_TOKEN environment variable and is never printed."""
import json, os, sys, time, urllib.request, uuid
ACCT = '22159c26d5386e3ac543be2bbed95e6d'; NAME = 'm98m-engine'
BASE = 'https://api.cloudflare.com/client/v4/accounts/%s/workers/scripts/%s' % (ACCT, NAME)
TOK = os.environ.get('CF_API_TOKEN', '').strip()
if not TOK: print('no CF_API_TOKEN'); sys.exit(2)
H = {'Authorization': 'Bearer ' + TOK}
def req(url, method='GET', data=None, headers=None, timeout=180):
    h = dict(H); h.update(headers or {})
    r = urllib.request.Request(url, data=data, method=method, headers=h)
    with urllib.request.urlopen(r, timeout=timeout) as x: return x.read()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
want = open(os.path.join(root, 'engine', 'worker.js'), 'rb').read()
crons = json.load(open(os.path.join(root, 'engine', 'crons.json')))['crons']
# 1. the script body
live = req(BASE)
script_ok = want in live
print('live script == main engine/worker.js:', script_ok, '(%d bytes on main)' % len(want))
if not script_ok:
    b = uuid.uuid4().hex
    meta = json.dumps({'main_module': 'worker.js', 'compatibility_date': '2024-09-23',
                       'keep_bindings': ['plain_text', 'secret_text', 'json', 'd1', 'kv_namespace', 'r2_bucket', 'queue', 'service', 'durable_object_namespace', 'analytics_engine']}).encode()
    body = (b'--' + b.encode() + b'\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\nContent-Type: application/json\r\n\r\n' + meta +
            b'\r\n--' + b.encode() + b'\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n' + want +
            b'\r\n--' + b.encode() + b'--\r\n')
    res = json.loads(req(BASE, 'PUT', body, {'Content-Type': 'multipart/form-data; boundary=' + b}))
    if not res.get('success'): print('REDEPLOY FAILED', json.dumps(res.get('errors'))[:600]); sys.exit(1)
    print('REDEPLOYED main engine/worker.js over a drifted live worker · modified', (res.get('result') or {}).get('modified_on'))
# 2. the cron slots
sch = json.loads(req(BASE + '/schedules'))
have = sorted(s['cron'] for s in (sch.get('result') or {}).get('schedules', []))
crons_ok = have == sorted(crons)
print('live cron slots == engine/crons.json:', crons_ok, '(%d slots)' % len(crons))
if not crons_ok:
    print('  only live:', sorted(set(have) - set(crons)), '| only in crons.json:', sorted(set(crons) - set(have)))
    res = json.loads(req(BASE + '/schedules', 'PUT', json.dumps([{'cron': c} for c in crons]).encode(), {'Content-Type': 'application/json'}))
    if not res.get('success'): print('SCHEDULE PUT FAILED', json.dumps(res.get('errors'))[:600]); sys.exit(1)
    print('RE-REGISTERED the %d slots from engine/crons.json' % len(crons))
# 3. the bindings must have survived (reported, never recreated)
st = json.loads(req(BASE + '/settings')); b = (st.get('result') or {}).get('bindings') or []
names = {x['name']: x for x in b}
missing = [n for n in ('DB', 'HOT', 'SYNC_KEY', 'OFFICE_IP', 'EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_DEV_ID', 'EBAY_RU_NAME') if n not in names]
off = names.get('OFFICE_IP') or {}
print('bindings:', ', '.join(sorted(names)), '| office gate:', 'ARMED' if off.get('text') else 'OPEN (OFFICE_IP missing or empty)')
if missing or not off.get('text'): print('BINDINGS PROBLEM, missing:', missing); sys.exit(1)
print('engine guard: ' + ('nothing to do' if script_ok and crons_ok else 'drift corrected'))
