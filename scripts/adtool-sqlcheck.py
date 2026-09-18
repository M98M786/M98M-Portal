#!/usr/bin/env python3
"""Check every SQL column reference in the engine against the CREATE TABLE that defines it.

The unit tests cover the pure functions and never touch SQL, so a query naming a column that does
not exist passes every test and then fails for real the first time somebody opens the page. That is
exactly how Time slots shipped broken: it summed `o.sold` from adtool_orders, which stores the order
total as `sale_price`.

Scope: the adtool_ tables only, and that limit is deliberate. Those are created in this file, so their
column lists are known exactly. Most other tables (orders, items_api, campaign_ads and the rest) are
created elsewhere, and the naive string scanner here also mis-pairs quotes around an apostrophe inside
a double-quoted literal. Widening the prefix produced 202 complaints about columns that demonstrably
exist. A checker that cries wolf gets ignored, and then it is worth less than nothing, so it stays
where its answers are trustworthy.

Deliberately conservative. It only judges an alias it can tie to a table whose CREATE TABLE lives in
this file, and it says out loud how many references it skipped, because a checker that quietly skips
the interesting cases is worse than no checker at all.
"""
import re, sys, os

def join_literals(src):
    """Collapse `'abc' + 'def'` into `'abcdef'`.

    The engine builds long statements by concatenating adjacent string literals, so a CREATE TABLE or
    a SELECT can be split across several. Reading only the first fragment makes the parser think real
    columns do not exist — it reported `cum_spend` missing from adtool_ads_intraday purely because the
    column list continued in the next fragment.

    Newlines inside the joined-away text are kept, so a reported line number still points at the real
    line in the real file. A checker that sends you to the wrong line wastes the time it just saved.
    """
    keep = lambda m: '\n' * m.group(0).count('\n')
    prev = None
    while prev != src:
        prev = src
        src = re.sub(r"'[ \t]*\+[ \t\r\n]*'", keep, src)
        src = re.sub(r'"[ \t]*\+[ \t\r\n]*"', keep, src)
    return src

def tables(src):
    """table name -> set of column names, from the CREATE TABLE statements in the source."""
    out = {}
    for m in re.finditer(r'CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_]+)\s*\((.+?)\)(?:["\']|\s*,\s*["\'])', src, re.S):
        name, body = m.group(1), m.group(2)
        cols = set()
        depth = 0; cur = ''
        for ch in body:
            if ch == '(': depth += 1
            elif ch == ')': depth -= 1
            if ch == ',' and depth == 0:
                cols.add(cur.strip().split()[0] if cur.strip() else ''); cur = ''
            else: cur += ch
        if cur.strip(): cols.add(cur.strip().split()[0])
        cols = {c for c in cols if c and not c.upper() in ('PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'CONSTRAINT')}
        out.setdefault(name, set()).update(cols)
    # Columns are added one at a time with ALTER TABLE rather than by editing the CREATE, so a parser that
    # reads only CREATE statements calls every added column a mistake.
    for m in re.finditer(r'ALTER TABLE\s+([A-Za-z0-9_]+)\s+ADD COLUMN\s+([A-Za-z_][A-Za-z0-9_]*)', src, re.I):
        out.setdefault(m.group(1), set()).add(m.group(2))
    return out

SQL_START = re.compile(r'\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b', re.I)

def main(path, prefix='adtool_'):
    raw = open(path, encoding='utf-8').read()
    src = join_literals(raw)
    tbl = tables(src)
    known = {t: c for t, c in tbl.items() if t.startswith(prefix)}
    bad, checked, skipped = [], 0, 0
    for m in re.finditer(r"'((?:[^'\\]|\\.){20,})'|\"((?:[^\"\\]|\\.){20,})\"", src):
        q = m.group(1) or m.group(2)
        if not SQL_START.search(q) or prefix not in q: continue
        qstart = m.start() + 1   # past the opening quote; newlines survive join_literals, so offsets stay true
        alias = {}
        for a in re.finditer(r'\b(?:FROM|JOIN)\s+([A-Za-z0-9_]+)\s+(?:AS\s+)?([A-Za-z][A-Za-z0-9_]*)', q, re.I):
            t, al = a.group(1), a.group(2)
            if al.upper() in ('ON', 'WHERE', 'GROUP', 'ORDER', 'LEFT', 'INNER', 'JOIN', 'SET', 'VALUES', 'LIMIT', 'AS'): continue
            alias[al] = t
        # INSERT INTO <table> (col, col, ...) — bare names, no alias to bind, and just as wrong when misspelt.
        for ins in re.finditer(r'INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)', q, re.I):
            t = ins.group(1)
            if t not in known: continue
            for col in [c.strip() for c in ins.group(2).split(',')]:
                if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', col or ''): continue
                checked += 1
                if col not in known[t]:
                    line = src[:m.start() + 1 + ins.start()].count('\n') + 1
                    bad.append((line, t, col, ('INSERT INTO ' + t + ' (' + ins.group(2)[:70]).replace('\n', ' ')))
        for r in re.finditer(r'\b([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b', q):
            al, col = r.group(1), r.group(2)
            t = alias.get(al)
            if t is None or t not in known:
                skipped += 1; continue
            checked += 1
            if col not in known[t]:
                line = src[:qstart + r.start()].count('\n') + 1
                near = q[max(0, r.start() - 55):r.start() + 45].replace('\n', ' ')
                bad.append((line, t, al + '.' + col, near))
    print('tables read from CREATE TABLE : %d (%d with the %s prefix)' % (len(tbl), len(known), prefix))
    print('column references checked     : %d' % checked)
    print('references skipped (alias not tied to a known table): %d' % skipped)
    if bad:
        print('\nMISMATCHES (%d):' % len(bad))
        for line, t, ref, q in sorted(set(bad)):
            print('  line %-6d %-24s not a column of %s' % (line, ref, t))
            print('           ...%s...' % q)
        return 1
    print('\nOK — every checked reference names a real column.')
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'engine/worker.js'))
