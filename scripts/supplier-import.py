#!/usr/bin/env python3
"""Import supplier links from Hasib's two workbooks into the sourcing table.

Why this exists as a second script (25 Aug 2026): the first one, supplier-import.py,
mapped workbook tabs to accounts with a list that had no 'hasib' pattern in it —

    ACCT = [(r'abrt',...), (r'azhar',...), (r'saif',...), (r'amna',...), (r'hafiza',...)]

so every Sir Hasib tab fell through acct_for() and returned None, and the import
silently skipped all three of them ('Sir Hasib', 'Sir Hasib new', 'SIR HASIB').
That is why he sat at 0 of 152 items with a supplier link while the other five
accounts were fully covered. Same shape of bug as the Engine.gs apiNorm list that
kept switching his API off.

It also writes through the Engine's key-gated sourcingImport action rather than the
Cloudflare dashboard D1 API, because the dashboard WAF is currently 403-ing every
POST from this machine's browser session.

Usage:  python3 supplier-import-hasib.py            # dry run, writes nothing
        python3 supplier-import-hasib.py --push     # actually import
"""
import json, os, re, sys, urllib.request

import openpyxl

ENGINE = 'https://m98m-engine.m98m786.workers.dev'
KEY = open(os.path.expanduser('~/.m98m/sync-key')).read().strip()
PUSH = '--push' in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith('--only='):
        ONLY = a.split('=', 1)[1]

HEADERS = {'content-type': 'application/json', 'Origin': 'https://portal.m98mltd.co.uk',
           'User-Agent': 'Mozilla/5.0 (Macintosh; M98M-Import) AppleWebKit/537.36'}


def call(action, payload):
    body = json.dumps({'action': action, 'key': KEY, 'payload': payload}).encode()
    req = urllib.request.Request(ENGINE, data=body, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    if not d.get('ok'):
        raise SystemExit('engine error: %s' % d.get('error'))
    return d['data']


fold = lambda s: re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()

# --- live listings -----------------------------------------------------------
items, off = [], 0
while True:
    d = call('backupDump', {'table': 'items_api', 'offset': off})
    idx = {h: i for i, h in enumerate(d['header'])}
    for row in d['rows']:
        items.append({'id': str(row[idx['item_id']]), 'account': str(row[idx['account']]),
                      'title': str(row[idx['title']]), 'status': str(row[idx['status']])})
    off += len(d['rows'])
    if d.get('done') or not d['rows']:
        break
active = [i for i in items if i['status'] == 'ACTIVE']
by_id = {i['id']: i for i in active}
by_key = {}
for i in active:
    by_key.setdefault((i['account'], fold(i['title'])), i)
    by_key.setdefault((i['account'], fold(i['title'])[:45]), i)
print('live ACTIVE listings: %d' % len(active))

# --- tab -> account ----------------------------------------------------------
# 'abrt' is checked first: "AZHAR ABRT" also contains "azhar" and would otherwise
# be captured by the Azhar Bhai pattern. 'Yaseen Bhai' is deliberately unmapped —
# it is not one of the portal's six accounts.
ACCT_PATTERNS = [
    (r'abrt', 'AZHAR ABRT'),
    (r'hasib|ullah', 'Sir Hasib'),          # <- the line that was missing
    (r'azhar', 'Azhar Bhai'),
    (r'saif', 'Saif Bhai'),
    (r'amna', 'Amna Baji'),
    (r'hafiza', 'HAFIZA BHAJI'),
]


def acct_for(tab):
    t = fold(tab)
    for pat, name in ACCT_PATTERNS:
        if re.search(pat, t):
            return name
    return None


LINKCOLS_S1 = ['current supplier working', 'ali express link', 'ali express link 1',
               'supplier link', 'supplier link 1', 'supplier 1', 'free shipping link']
LINKCOLS_S2 = ['suuplier 2', 'supplier 2', 'supplier link 2']
LINKCOLS_S3 = ['supplier 3', 'supplier link 3']

is_link = lambda v: isinstance(v, str) and v.strip().startswith('https://') and 'aliexpress' in v

BOOKS = [os.path.expanduser('~/Downloads/ALL ACCOUNTS Supplier LINK SHEET (1).xlsx'),
         os.path.expanduser('~/Downloads/GENERAL SUPPLIER SHEET ALL ACCOUNTS.xlsx')]

matches, unmatched, skipped, per_tab = {}, [], [], []
for f in BOOKS:
    if not os.path.exists(f):
        print('MISSING WORKBOOK: %s' % f)
        continue
    wb = openpyxl.load_workbook(f, read_only=True)
    for ws in wb.worksheets:
        acct = acct_for(ws.title)
        if not acct or (ONLY and acct != ONLY):
            skipped.append(ws.title.strip())
            continue
        rows = ws.iter_rows(values_only=True)
        try:
            header = [fold(h) for h in next(rows)]
        except StopIteration:
            continue
        hidx = {h: i for i, h in enumerate(header) if h}
        title_i = next((hidx[h] for h in ['listing title', 'lisiting title'] if h in hidx), None)
        item_i = hidx.get('ebay item no')
        s1_i = [hidx[c] for c in LINKCOLS_S1 if c in hidx]
        s2_i = [hidx[c] for c in LINKCOLS_S2 if c in hidx]
        s3_i = [hidx[c] for c in LINKCOLS_S3 if c in hidx]
        if title_i is None and item_i is None:
            skipped.append(ws.title.strip() + ' (no title/item column)')
            continue
        hit_n = miss_n = 0
        for row in rows:
            if row is None:
                continue

            def pick(cols):
                for c in cols:
                    if c < len(row) and is_link(row[c]):
                        return str(row[c]).strip()[:400]
                return ''
            s1, s2, s3 = pick(s1_i), pick(s2_i), pick(s3_i)
            if not (s1 or s2 or s3):
                continue
            hit = None
            if item_i is not None and item_i < len(row) and row[item_i]:
                iid = re.sub(r'\.0$', '', str(row[item_i]).strip())
                hit = by_id.get(iid)
                # an id that belongs to a DIFFERENT account is a data error, not a match
                if hit and hit['account'] != acct:
                    hit = None
            if hit is None and title_i is not None and title_i < len(row) and row[title_i]:
                t = fold(row[title_i])
                hit = by_key.get((acct, t)) or by_key.get((acct, t[:45]))
            if hit is None:
                miss_n += 1
                unmatched.append((acct, ws.title, str(row[title_i])[:60] if title_i is not None and title_i < len(row) else '?'))
                continue
            hit_n += 1
            cur = matches.setdefault(hit['id'], {'account': hit['account'], 's1': '', 's2': '', 's3': ''})
            for k, v in (('s1', s1), ('s2', s2), ('s3', s3)):
                if v and not cur[k]:
                    cur[k] = v
        per_tab.append((os.path.basename(f)[:26], ws.title, acct, hit_n, miss_n))
    wb.close()

print('\n%-28s %-16s %-13s %6s %8s' % ('workbook', 'tab', 'account', 'match', 'nomatch'))
for b, t, a, h, m in per_tab:
    print('%-28s %-16s %-13s %6d %8d' % (b, t[:16], a, h, m))

per = {}
for m in matches.values():
    per[m['account']] = per.get(m['account'], 0) + 1
print('\nitems matched with at least one link: %d' % len(matches))
print('per account: %s' % json.dumps(per, sort_keys=True))
print('rows with links but no live ACTIVE listing: %d' % len(unmatched))
print('skipped tabs: %s' % ', '.join(sorted(set(skipped))))

if not PUSH:
    print('\nDRY RUN — nothing written. Re-run with --push to import.')
    raise SystemExit(0)

rows = [{'item_id': iid, 'account': m['account'], 's1': m['s1'], 's2': m['s2'], 's3': m['s3']}
        for iid, m in matches.items()]
sent = written = 0
for n in range(0, len(rows), 400):
    chunk = rows[n:n + 400]
    res = call('sourcingImport', {'rows': chunk, 'source': 'import:hasib-sheets'})
    sent += res.get('received', 0)
    written += res.get('written', 0)
    print('  pushed %d..%d -> received=%s written=%s' % (n, n + len(chunk), res.get('received'), res.get('written')))
print('\nDONE — sent %d, written %d' % (sent, written))
