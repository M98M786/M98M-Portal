#!/usr/bin/env python3
"""Render a project markdown document as a standalone Royal-styled HTML page.

Deliberately small: this converts the subset of markdown the project's own docs use
(headings, bold, italic, inline code, links, lists, rules, blockquotes, tables).
Anything it does not understand is escaped and shown as written, never dropped.

  usage: md2html.py <in.md> <out.html> ["Page title"]
"""
import html
import os
import re
import sys


def inline(text):
    """Escape first, then re-introduce only the marks we intend to honour."""
    t = html.escape(text)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<em>\1</em>', t)
    t = re.sub(r'(?<!_)_([^_\n]+)_(?!_)', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)',
               r'<a href="\2" rel="noopener noreferrer" target="_blank">\1</a>', t)
    return t


def convert(md):
    out, i, lines = [], 0, md.split('\n')
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if re.match(r'^---+$', stripped):
            out.append('<hr>')
            i += 1
            continue

        m = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if m:
            level = len(m.group(1))
            text = inline(m.group(2))
            anchor = re.sub(r'[^a-z0-9]+', '-', re.sub(r'<[^>]+>', '', m.group(2)).lower()).strip('-')
            out.append('<h%d id="%s">%s</h%d>' % (level, anchor, text, level))
            i += 1
            continue

        # table: a header row followed by a --- separator row
        if '|' in stripped and i + 1 < n and re.match(r'^\s*\|?[\s:\-|]+\|[\s:\-|]*$', lines[i + 1]):
            head = [c.strip() for c in stripped.strip('|').split('|')]
            i += 2
            body = []
            while i < n and '|' in lines[i] and lines[i].strip():
                body.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            out.append('<div class="tablewrap"><table><thead><tr>' +
                       ''.join('<th>%s</th>' % inline(c) for c in head) +
                       '</tr></thead><tbody>' +
                       ''.join('<tr>' + ''.join('<td>%s</td>' % inline(c) for c in r) + '</tr>' for r in body) +
                       '</tbody></table></div>')
            continue

        if stripped.startswith('>'):
            quote = []
            while i < n and lines[i].strip().startswith('>'):
                quote.append(lines[i].strip().lstrip('>').strip())
                i += 1
            out.append('<blockquote>%s</blockquote>' % inline(' '.join(quote)))
            continue

        if re.match(r'^[-*]\s+', stripped) or re.match(r'^\d+[.)]\s+', stripped):
            ordered = bool(re.match(r'^\d+[.)]\s+', stripped))
            items = []
            while i < n and lines[i].strip() and (
                    re.match(r'^[-*]\s+', lines[i].strip()) or re.match(r'^\d+[.)]\s+', lines[i].strip())):
                items.append(re.sub(r'^([-*]|\d+[.)])\s+', '', lines[i].strip()))
                i += 1
            tag = 'ol' if ordered else 'ul'
            out.append('<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % inline(x) for x in items), tag))
            continue

        para = []
        while i < n and lines[i].strip() and not re.match(r'^(#{1,6}\s|---+$|[-*]\s|\d+[.)]\s|>)', lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append('<p>%s</p>' % inline(' '.join(para)))

    return '\n'.join(out)


PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--bg0:#10141F;--bg1:#1C2436;--panel:#171D2C;--panel-2:#1A2130;
 --gold-line:rgba(233,180,60,.16);--gold-line-hi:rgba(233,180,60,.45);
 --text:#F2F4F8;--text-2:#A7B0C0;--text-3:#6B7688;
 --gold-a:#F6D06B;--gold-b:#E9A93C;--gold-c:#B66F1F;
 --blue:#3D9BF0;--blue-2:#63B4FF;--ok:#3FCF8E;--warn:#FF9F43;--bad:#F0605A;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Amazon Ember","Open Sans","Segoe UI",Arial,sans-serif;font-size:16px;line-height:1.72;
 color:var(--text);background:radial-gradient(1100px 520px at 50% -8%,var(--bg1) 0%,var(--bg0) 58%) fixed var(--bg0);
 -webkit-font-smoothing:antialiased;padding:48px 20px 96px}
.wrap{max-width:820px;margin:0 auto}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:34px;padding-bottom:20px;border-bottom:1px solid var(--gold-line)}
.brand img{width:44px;height:44px;border-radius:11px}
.brand b{font-size:15px;letter-spacing:.03em;display:block}
.brand span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-3)}
h1{font-size:clamp(26px,4.6vw,36px);font-weight:800;line-height:1.24;letter-spacing:-.01em;margin:0 0 10px;
 background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 30%,var(--gold-b) 55%,#F8E39B 62%,var(--gold-b) 70%,var(--gold-c));
 -webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:23px;font-weight:800;margin:52px 0 6px;padding-top:26px;border-top:1px solid var(--gold-line);letter-spacing:-.01em}
h3{font-size:18.5px;font-weight:800;margin:36px 0 4px;color:var(--gold-a);line-height:1.4}
h4{font-size:16px;font-weight:800;margin:24px 0 4px}
p{margin:13px 0;color:var(--text-2)}
p>strong,li>strong{color:var(--text);font-weight:700}
ul,ol{margin:13px 0 13px 22px}
li{margin:9px 0;color:var(--text-2)}
li::marker{color:var(--gold-b)}
code{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:.855em;
 background:rgba(61,155,240,.11);border:1px solid rgba(61,155,240,.2);color:var(--blue-2);
 padding:1.5px 6px;border-radius:5px;white-space:nowrap}
a{color:var(--blue-2);text-decoration:none;border-bottom:1px solid rgba(99,180,255,.35)}
a:hover{border-bottom-color:var(--blue-2)}
hr{border:0;height:1px;background:var(--gold-line);margin:34px 0}
blockquote{margin:18px 0;padding:14px 18px;border-left:3px solid var(--gold-b);
 background:linear-gradient(90deg,rgba(233,169,60,.09),transparent);border-radius:0 10px 10px 0;color:var(--text-2)}
em{color:var(--text-2);font-style:italic}
.tablewrap{overflow-x:auto;margin:20px 0;border:1px solid var(--gold-line);border-radius:11px}
table{width:100%;border-collapse:collapse;font-size:14.5px;min-width:460px}
th{text-align:left;padding:11px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.09em;
 color:var(--text-3);font-weight:800;border-bottom:1px solid var(--gold-line);background:rgba(255,255,255,.02)}
td{padding:11px 14px;border-bottom:1px solid var(--gold-line);color:var(--text-2);vertical-align:top}
tr:last-child td{border-bottom:0}
@media print{body{background:#fff;color:#111;padding:0}h1,h3{color:#8C6314;-webkit-text-fill-color:#8C6314}
 p,li,td{color:#222}code{background:#f2f2f2;color:#0b3d63;border-color:#ddd}.brand{border-color:#ccc}}
@media(max-width:620px){body{padding:30px 15px 70px;font-size:15.5px}h2{margin-top:40px}}
</style></head><body><div class="wrap">
<div class="brand">__LOGO__<div><b>M98M LTD</b><span>E-commerce</span></div></div>
__BODY__
</div></body></html>
"""


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, dest = sys.argv[1], sys.argv[2]
    with open(src) as fh:
        md = fh.read()
    title = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(src)

    logo = ''
    rel = os.path.relpath(os.path.join(os.path.dirname(os.path.abspath(dest)), 'assets', 'logo.png'))
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(dest)), 'assets', 'logo.png')):
        logo = '<img src="assets/logo.png" alt="M98M">'

    page = (PAGE.replace('__TITLE__', html.escape(title))
                .replace('__LOGO__', logo)
                .replace('__BODY__', convert(md)))
    with open(dest, 'w') as fh:
        fh.write(page)
    print('%s -> %s  (%d bytes)' % (src, dest, len(page)))


if __name__ == '__main__':
    main()
