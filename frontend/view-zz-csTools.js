/* view-zz-csTools.js — 2 Sept (owner): Husnain's three CS agents become NATIVE live desks.
 * The playbooks are his own, verbatim, seeded into D1 (cs_playbook) and editable in the
 * portal by Management/Ops Head/Team Lead; every copy is logged (cs_tool_log) so usage is a
 * live dashboard; the Recovery desk adds a per-order tracker fed by the live order truth.
 *   #csReplyDesk    — CS Reply Agent v1.7 (80 scenarios)
 *   #csDefenseDesk  — eBay Defense Agent v1.8 (69 scenarios, staged appeal flows, tips)
 *   #csRecoveryDesk — AliExpress Recovery Agent v1.2 (39 scenarios + recovery trackers)
 * Money figures on these desks are OPERATIONAL (eBay refunds, Ali recoveries) — labeled so;
 * book P&L stays on the Sales-analysis pages per the sheet law. */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.ct-wrap{display:grid;grid-template-columns:330px 1fr;gap:14px}' +
    '@media (max-width:980px){.ct-wrap{grid-template-columns:1fr}}' +
    '.ct-list{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);max-height:74vh;overflow:auto}' +
    '.ct-cat{position:sticky;top:0;background:var(--panel-2);padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);font-weight:800;border-bottom:1px solid var(--gold-line)}' +
    '.ct-item{padding:9px 12px;border-bottom:1px solid var(--gold-line);cursor:pointer}' +
    '.ct-item:hover{background:var(--panel)}' +
    '.ct-item.on{border-left:3px solid var(--gold);background:var(--panel)}' +
    '.ct-item .t{font-size:12px;font-weight:800}' +
    '.ct-item .k{font-size:10px;color:var(--text-3);font-weight:600;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ct-pane{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);padding:14px 16px;min-height:400px}' +
    '.ct-tip{border:1px solid rgba(233,196,106,.45);background:rgba(233,196,106,.08);border-radius:10px;padding:9px 12px;font-size:12px;font-weight:700;margin:10px 0;line-height:1.5}' +
    '.ct-vars{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}' +
    '.ct-var{font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel);cursor:pointer;color:var(--text-2)}' +
    '.ct-var.on{border-color:var(--gold);color:var(--gold)}' +
    '.ct-ph{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:10px 0}' +
    '.ct-ph label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;display:block;margin-bottom:3px}' +
    '.ct-ph input{width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12px;font-weight:600}' +
    '.ct-ph .auto input{border-color:rgba(63,207,142,.5)}' +
    '.ct-prev{border:1px solid var(--gold-line);border-radius:11px;background:var(--panel);padding:13px 15px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;max-height:44vh;overflow:auto}' +
    '.ct-prev mark{background:rgba(240,96,90,.25);color:var(--text);border-radius:4px;padding:0 3px}' +
    '.ct-stats{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:12px}' +
    '.ct-stat{border:1px solid var(--gold-line);border-radius:11px;padding:10px 13px;background:var(--panel-2)}' +
    '.ct-stat .l{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ct-stat b{display:block;font-size:19px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.ct-stat .s{font-size:10px;color:var(--text-3);font-weight:600;margin-top:2px}' +
    '.ct-pick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}' +
    '.ct-pick input{padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12px;min-width:220px}' +
    '.ct-ctx{font-size:11px;font-weight:700;color:var(--ok)}' +
    '.ct-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:680px}' +
    '.ct-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:left;padding:7px 9px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.ct-tbl td{padding:7px 9px;border-bottom:1px solid var(--gold-line);font-variant-numeric:tabular-nums}'
  );

  function ctS(v) { return String(v == null ? '' : v); }
  function ctJ(v, fb) { try { return JSON.parse(v); } catch (e) { return fb; } }
  function ctGBP(v) { return '£' + (Number(v) || 0).toFixed(2); }

  /* one engine, three desks */
  function ctMakeDesk(tool, opts) {
    var S = { entries: [], sel: null, vi: 0, q: '', cat: '', ctx: null, fills: {}, canEdit: false, editing: false };
    var P = opts.prefix;

    /* placeholder → live-order-context auto-fill (case-insensitive, the tools' own vocabulary) */
    function autoFor(ph) {
      if (!S.ctx) { return ''; }
      var k = ph.toLowerCase();
      var c = S.ctx;
      if (/buyer name|buyer username/.test(k)) { return c.buyer || ''; }
      if (/^order numbers?$/.test(k)) { return (tool === 'recovery' && c.ali_order) ? c.ali_order : c.order_id; }
      if (/item name|item purchased|listing title|item sent/.test(k)) { return c.item_title || ''; }
      if (/item number|item id/.test(k)) { return c.item_id || ''; }
      if (/tracking number/.test(k)) { return c.tracking || ''; }
      if (/courier name/.test(k)) { return c.courier || ''; }
      if (/order date/.test(k)) { return c.order_date || ''; }
      if (/dispatch date/.test(k)) { return c.ship_by || ''; }
      if (/account name/.test(k)) { return c.account || ''; }
      if (/qty ordered/.test(k)) { return ctS(c.qty); }
      if (/dispute id|ali/.test(k) && c.ali_order) { return c.ali_order; }
      return '';
    }

    function phList(text) {
      var seen = {}, out = [];
      (ctS(text).match(/\[([^\]\n]{2,60})\]/g) || []).forEach(function (m) {
        var name = m.slice(1, -1);
        if (!seen[name]) { seen[name] = 1; out.push(name); }
      });
      return out;
    }

    function render(text) {
      return esc(ctS(text)).replace(/\[([^\]\n]{2,60})\]/g, function (m, name) {
        var v = S.fills[name] !== undefined ? S.fills[name] : autoFor(name);
        return v ? esc(v) : '<mark>[' + esc(name) + ']</mark>';
      });
    }
    function plain(text) {
      return ctS(text).replace(/\[([^\]\n]{2,60})\]/g, function (m, name) {
        var v = S.fills[name] !== undefined ? S.fills[name] : autoFor(name);
        return v || m;
      });
    }

    function paintList() {
      var box = $(P + 'List');
      if (!box) { return; }
      var q = S.q.toLowerCase();
      var byCat = {};
      S.entries.forEach(function (e) {
        if (S.cat && e.cat !== S.cat) { return; }
        if (q) {
          var hay = (e.name + ' ' + (e._kw || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) < 0) { return; }
        }
        (byCat[e.cat] = byCat[e.cat] || []).push(e);
      });
      var cats = Object.keys(byCat);
      if (!cats.length) { box.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--text-3);font-weight:600">Nothing matches — clear the search.</div>'; return; }
      box.innerHTML = cats.map(function (c) {
        return '<div class="ct-cat">' + esc(c) + ' · ' + byCat[c].length + '</div>' +
          byCat[c].map(function (e) {
            return '<div class="ct-item' + (S.sel && S.sel.tid === e.tid ? ' on' : '') + '" data-' + P + '-t="' + esc(e.tid) + '">' +
              '<div class="t">' + esc(e.name) + '</div>' +
              '<div class="k">' + esc((e._kw || []).slice(0, 5).join(' · ')) + '</div></div>';
          }).join('');
      }).join('');
      box.querySelectorAll('[data-' + P + '-t]').forEach(function (el) {
        el.onclick = function () {
          var tid = this.getAttribute('data-' + P + '-t');
          S.sel = S.entries.filter(function (e) { return e.tid === tid; })[0] || null;
          S.vi = 0; S.editing = false;
          paintList(); paintPane();
        };
      });
    }

    function paintPane() {
      var box = $(P + 'Pane');
      if (!box) { return; }
      var e = S.sel;
      if (!e) { box.innerHTML = '<div style="padding:30px;text-align:center;font-size:12.5px;color:var(--text-3);font-weight:600">Pick a scenario on the left — search by any keyword, the way the old tool worked.</div>'; return; }
      var vars = e._variants || [];
      var v = vars[S.vi] || vars[0] || { text: '' };
      var h = '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">' +
        '<h3 style="font-size:15px;font-weight:800;margin:0">' + esc(e.name) + '</h3>' +
        '<span class="pill role">' + esc(e.cat) + '</span>' +
        (e.flag ? '<span class="pill al-p-sev">' + esc(e.flag) + '</span>' : '') +
        (S.canEdit ? '<button class="minibtn" id="' + P + 'Edit" style="margin-left:auto">' + (S.editing ? 'Cancel edit' : 'Edit…') + '</button>' : '') +
        '</div>';
      if (e.tip) { h += '<div class="ct-tip">💡 ' + esc(e.tip) + '</div>'; }
      if (vars.length > 1) {
        h += '<div class="ct-vars">' + vars.map(function (vv, i) {
          return '<span class="ct-var' + (i === S.vi ? ' on' : '') + '" data-' + P + '-v="' + i + '">' + esc(ctS(vv.label) || ('Message ' + (i + 1))) + '</span>';
        }).join('') + '</div>';
      }
      if (S.editing) {
        h += '<div style="margin:10px 0"><label style="font-size:10px;font-weight:800;color:var(--text-3)">MESSAGE TEXT (variant ' + (S.vi + 1) + ') — [Placeholders] stay in square brackets</label>' +
          '<textarea id="' + P + 'EditTa" style="width:100%;min-height:220px;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12.5px;line-height:1.5">' + esc(ctS(v.text)) + '</textarea>' +
          '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn-gold" id="' + P + 'SaveTa">Save this variant</button>' +
          '<span style="font-size:10.5px;color:var(--text-3);font-weight:600;align-self:center">saves for every CS agent instantly — the old HTML file stays untouched as backup</span></div></div>';
        box.innerHTML = h;
      } else {
        var phs = phList(v.text);
        if (phs.length) {
          h += '<div class="ct-ph">' + phs.map(function (name) {
            var auto = autoFor(name);
            var val = S.fills[name] !== undefined ? S.fills[name] : auto;
            return '<div class="' + (auto && S.fills[name] === undefined ? 'auto' : '') + '"><label>' + esc(name) + (auto && S.fills[name] === undefined ? ' · auto' : '') + '</label>' +
              '<input data-' + P + '-ph="' + esc(name) + '" value="' + esc(val) + '"></div>';
          }).join('') + '</div>';
        }
        h += '<div class="ct-prev" id="' + P + 'Prev">' + render(v.text) + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap">' +
          '<button class="btn-gold" id="' + P + 'Copy">Copy message</button>' +
          '<span style="font-size:10.5px;color:var(--text-3);font-weight:600">copying logs the use — red [brackets] are still unfilled</span></div>';
        box.innerHTML = h;
      }
      box.querySelectorAll('[data-' + P + '-v]').forEach(function (el) {
        el.onclick = function () { S.vi = Number(this.getAttribute('data-' + P + '-v')) || 0; paintPane(); };
      });
      box.querySelectorAll('[data-' + P + '-ph]').forEach(function (el) {
        el.oninput = function () {
          S.fills[this.getAttribute('data-' + P + '-ph')] = this.value;
          var pv = $(P + 'Prev');
          if (pv) { pv.innerHTML = render(v.text); }
        };
      });
      var cp = $(P + 'Copy');
      if (cp) {
        cp.onclick = function () {
          var txt = plain(v.text);
          var done = function () {
            toast('Copied. Logged as a ' + opts.title + ' use.');
            api('csToolLog', { tool: tool, tid: e.tid, variant_label: ctS(v.label), account: (S.ctx || {}).account || '', order_id: (S.ctx || {}).order_id || '' }).catch(function () {});
            loadStats();
          };
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, done); }
          else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); done(); }
        };
      }
      var ed = $(P + 'Edit');
      if (ed) { ed.onclick = function () { S.editing = !S.editing; paintPane(); }; }
      var sv = $(P + 'SaveTa');
      if (sv) {
        sv.onclick = function () {
          var ta = $(P + 'EditTa');
          if (!ta || !ctS(ta.value).trim()) { toast('The message cannot be empty.'); return; }
          var vars2 = (e._variants || []).map(function (vv) { return { label: vv.label, text: vv.text }; });
          vars2[S.vi] = { label: (vars2[S.vi] || {}).label || null, text: ta.value };
          sv.disabled = true;
          api('csPlaybookSave', { tool: tool, tid: e.tid, cat: e.cat, name: e.name, kw: e._kw, flag: e.flag, tip: e.tip, variants: vars2, sort: e.sort })
            .then(function () { e._variants = vars2; S.editing = false; toast('Saved — live for everyone now.'); paintPane(); })
            .catch(function (err) { sv.disabled = false; toast('Not saved — ' + err.message); });
        };
      }
    }

    function loadStats() {
      api('csToolStats', { tool: tool, days: 7 }).then(function (d) {
        var el = $(P + 'Stats');
        if (!el) { return; }
        var top = (d.by_who || [])[0];
        el.innerHTML =
          '<div class="ct-stat"><span class="l">Uses · 7 days</span><b>' + d.total + '</b><span class="s">every copy is logged</span></div>' +
          '<div class="ct-stat"><span class="l">Most active</span><b style="font-size:14px">' + esc(top ? ctS(top.used_by).split('@')[0] : '—') + '</b><span class="s">' + (top ? top.n + ' use(s)' : 'nobody yet') + '</span></div>' +
          '<div class="ct-stat"><span class="l">Top scenario</span><b style="font-size:12px">' + esc(((d.by_template || [])[0] || {}).tid || '—') + '</b><span class="s">' + (((d.by_template || [])[0] || {}).n || 0) + ' use(s)</span></div>' +
          (opts.extraStat ? opts.extraStat() : '');
      }).catch(function () {});
    }

    function loadBook() {
      var lb = $(P + 'List');
      if (lb) { lb.innerHTML = '<div class="spinner"></div>'; }
      api('csPlaybook', { tool: tool }).then(function (d) {
        S.canEdit = !!d.can_edit;
        S.entries = (d.entries || []).map(function (e) {
          e._kw = ctJ(e.kw, []); e._variants = ctJ(e.variants, []);
          return e;
        });
        if (!S.entries.length && lb) {
          lb.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--warn);font-weight:700">The playbook is not seeded yet — Management runs the one-time import from the old tool.</div>';
          return;
        }
        paintList(); paintPane();
      }).catch(function (e) {
        if (lb) { lb.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--bad);font-weight:700">' + esc(e.message) + '</div>'; }
      });
    }

    function wirePicker() {
      var inp = $(P + 'Ord'), go = $(P + 'OrdGo'), outEl = $(P + 'Ctx');
      if (!go) { return; }
      go.onclick = function () {
        var q = ctS(inp && inp.value).trim();
        if (q.length < 4) { toast('Type at least 4 characters of the order id.'); return; }
        go.disabled = true;
        api('csFillContext', { order_id: q }).then(function (d) {
          go.disabled = false;
          var r = (d.rows || [])[0];
          if (!r) { if (outEl) { outEl.textContent = 'no order found'; outEl.style.color = 'var(--bad)'; } return; }
          S.ctx = r; S.fills = {};
          if (outEl) {
            outEl.style.color = 'var(--ok)';
            outEl.textContent = '✓ ' + r.order_id + ' · ' + r.account + ' · ' + ctS(r.buyer) + ' · ' + ctS(r.item_title).slice(0, 40) + (r.tracking ? ' · trk ' + r.tracking : '');
          }
          paintPane();
        }).catch(function (e) { go.disabled = false; toast(e.message); });
      };
      if (inp) { inp.onkeydown = function (ev) { if (ev.key === 'Enter') { go.onclick(); } }; }
    }

    return {
      html: function () {
        return '<div class="ct-stats" id="' + P + 'Stats"></div>' +
          '<div class="ct-pick"><input id="' + P + 'Ord" placeholder="Order id — fills buyer, item, tracking, dates automatically">' +
          '<button class="minibtn" id="' + P + 'OrdGo">Load order</button>' +
          '<span class="ct-ctx" id="' + P + 'Ctx"></span>' +
          '<input id="' + P + 'Q" placeholder="Search scenarios… (keywords work like the old tool)" style="margin-left:auto;min-width:240px">' +
          '</div>' +
          '<div class="ct-wrap"><div class="ct-list" id="' + P + 'List"><div class="spinner"></div></div>' +
          '<div class="ct-pane" id="' + P + 'Pane"></div></div>';
      },
      init: function () {
        var q = $(P + 'Q');
        if (q) { q.oninput = function () { S.q = this.value; paintList(); }; }
        wirePicker();
        loadStats();
        loadBook();
      },
      state: S,
      reloadStats: loadStats
    };
  }

  /* ————— Reply desk ————— */
  var REPLY = ctMakeDesk('reply', { prefix: 'ctr', title: 'Reply Agent' });
  VIEWS.csReplyDesk = {
    label: 'CS Reply desk',
    icon: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    roles: ['CS', 'Management', 'Ops Head', 'Team Lead'],
    order: 12.2,
    render: function () {
      return '<div class="hgroup enter d1"><h1>CS Reply <span class="goldtext">desk</span></h1>' +
        '<span class="sub">Husnain’s Reply Agent v1.7, live — 80 scenarios, auto-filled from the real order, every use logged</span></div>' +
        REPLY.html();
    },
    init: function () { REPLY.init(); }
  };

  /* ————— Defense desk ————— */
  var DEF = ctMakeDesk('defense', { prefix: 'ctd', title: 'Defense Agent' });
  VIEWS.csDefenseDesk = {
    label: 'Defense desk',
    icon: '<path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7z"/>',
    roles: ['CS', 'Management', 'Ops Head', 'Team Lead'],
    order: 12.3,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Defense <span class="goldtext">desk</span></h1>' +
        '<span class="sub">eBay Defense Agent v1.8, live — staged appeal flows with Husnain’s own tips; numbered variants are the sequence</span></div>' +
        DEF.html();
    },
    init: function () { DEF.init(); }
  };

  /* ————— Recovery desk (templates + the live tracker) ————— */
  var REC = ctMakeDesk('recovery', { prefix: 'ctv', title: 'Recovery Agent' });
  var RECOVERY_STAGES = ['OPENED', 'SUPPLIER_MESSAGED', 'DISPUTE_OPENED', 'DISPUTE_ESCALATED', 'FORMAL_APPEAL', 'AWAITING_DECISION'];

  function recLoadBoard() {
    var box = $('ctvBoard');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('recoveryBoard', {}).then(function (d) {
      if (!$('ctvBoard')) { return; }
      var tot = { open: 0, openAmt: 0, rec: 0 };
      (d.totals || []).forEach(function (t) {
        if (t.status === 'OPEN') { tot.open = t.n; tot.openAmt = t.amt || 0; }
        if (t.status === 'RECOVERED') { tot.rec = t.rec || 0; }
      });
      var h = '<div class="ct-stats">' +
        '<div class="ct-stat"><span class="l">Chaseable refunds</span><b>' + (d.candidates || []).length + '</b><span class="s">refunded on eBay · Ali order id known · 60d</span></div>' +
        '<div class="ct-stat"><span class="l">Open trackers</span><b>' + tot.open + '</b><span class="s">' + ctGBP(tot.openAmt) + ' being chased</span></div>' +
        '<div class="ct-stat"><span class="l">Recovered · 30d</span><b style="color:var(--ok)">' + ctGBP(tot.rec) + '</b><span class="s">operational (AliExpress refunds) — not book P&L</span></div>' +
        '</div>';

      if ((d.candidates || []).length) {
        h += '<div class="card" style="margin-bottom:14px"><div class="hd">Start chasing <span class="hint">every refunded eBay order whose AliExpress order id is on file</span></div><div class="bd"><div class="scroll"><table class="ct-tbl"><thead><tr>' +
          '<th>Order</th><th>Account</th><th>Item</th><th>Refunded</th><th>Ali order</th><th></th></tr></thead><tbody>' +
          d.candidates.slice(0, 15).map(function (c) {
            return '<tr><td class="mono" style="font-size:11px">' + esc(c.order_id) + '</td><td>' + esc(c.account) + '</td>' +
              '<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(ctS(c.title)) + '</td>' +
              '<td style="color:var(--bad);font-weight:700">' + ctGBP(c.refunded) + '</td>' +
              '<td class="mono" style="font-size:11px">' + esc(ctS(c.ali_order)) + '</td>' +
              '<td><button class="minibtn" data-ctv-start="' + esc(c.order_id) + '">Start tracker</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          ((d.candidates || []).length > 15 ? '<p style="font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:6px">Showing the 15 largest of ' + d.candidates.length + '.</p>' : '') +
          '</div></div>';
      }

      if ((d.open || []).length) {
        h += '<div class="card" style="margin-bottom:14px"><div class="hd">Open trackers <span class="hint">stage → amount recovered → close</span></div><div class="bd"><div class="scroll"><table class="ct-tbl"><thead><tr>' +
          '<th>Order</th><th>Ali order</th><th>Item</th><th>Chasing</th><th>Stage</th><th>Recovered £</th><th></th></tr></thead><tbody>' +
          d.open.map(function (r) {
            return '<tr><td class="mono" style="font-size:11px">' + esc(r.order_id) + '</td>' +
              '<td class="mono" style="font-size:11px">' + esc(ctS(r.ali_order)) + '</td>' +
              '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(ctS(r.item_title)) + '</td>' +
              '<td>' + ctGBP(r.amount) + '</td>' +
              '<td><select data-ctv-stage="' + r.id + '" class="alx-sel" style="font-size:10.5px">' +
              RECOVERY_STAGES.map(function (s) { return '<option' + (s === r.stage ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
              '<td><input data-ctv-amt="' + r.id + '" value="' + (r.recovered_amount || '') + '" placeholder="0.00" style="width:74px;padding:5px 7px;border-radius:7px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text);font:inherit;font-size:11px"></td>' +
              '<td style="white-space:nowrap"><button class="minibtn" data-ctv-won="' + r.id + '">✓ Recovered</button> <button class="minibtn" data-ctv-lost="' + r.id + '">✕ Lost</button></td></tr>';
          }).join('') + '</tbody></table></div></div></div>';
      } else {
        h += '<div class="alx-empty" style="margin-bottom:14px">No open trackers. Start one from the list above — or from any order id in the picker below.</div>';
      }
      box.innerHTML = h;

      box.querySelectorAll('[data-ctv-start]').forEach(function (b) {
        b.onclick = function () {
          var me = this; me.disabled = true;
          api('recoveryUpsert', { order_id: this.getAttribute('data-ctv-start') })
            .then(function () { toast('Tracker opened — chase it with the supplier messages below.'); recLoadBoard(); })
            .catch(function (e) { me.disabled = false; toast(e.message); });
        };
      });
      box.querySelectorAll('[data-ctv-stage]').forEach(function (sel) {
        sel.onchange = function () {
          api('recoveryUpsert', { id: Number(this.getAttribute('data-ctv-stage')), stage: this.value })
            .then(function () { toast('Stage saved.'); }).catch(function (e) { toast(e.message); });
        };
      });
      var close = function (id, status, btn) {
        var amtEl = box.querySelector('[data-ctv-amt="' + id + '"]');
        var amt = amtEl ? Number(amtEl.value) || 0 : 0;
        if (status === 'RECOVERED' && !amt) { toast('Type the recovered amount first.'); if (amtEl) { amtEl.focus(); } return; }
        btn.disabled = true;
        api('recoveryUpsert', { id: id, status: status, recovered_amount: amt })
          .then(function () { toast(status === 'RECOVERED' ? 'Recovered ' + ctGBP(amt) + ' — well chased.' : 'Closed as lost.'); recLoadBoard(); })
          .catch(function (e) { btn.disabled = false; toast(e.message); });
      };
      box.querySelectorAll('[data-ctv-won]').forEach(function (b) { b.onclick = function () { close(Number(this.getAttribute('data-ctv-won')), 'RECOVERED', this); }; });
      box.querySelectorAll('[data-ctv-lost]').forEach(function (b) { b.onclick = function () { close(Number(this.getAttribute('data-ctv-lost')), 'LOST', this); }; });
    }).catch(function (e) {
      box.innerHTML = '<div class="alx-empty">' + esc(e.message) + '</div>';
    });
  }

  VIEWS.csRecoveryDesk = {
    label: 'AliExpress recovery',
    icon: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    roles: ['CS', 'Order Processor', 'Management', 'Ops Head', 'Team Lead'],
    order: 12.4,
    render: function () {
      return '<div class="hgroup enter d1"><h1>AliExpress <span class="goldtext">recovery</span></h1>' +
        '<span class="sub">Recovery Agent v1.2, live — chase every eBay refund back from the supplier; trackers, stages, recovered totals</span></div>' +
        '<div id="ctvBoard"><div class="spinner"></div></div>' +
        REC.html();
    },
    init: function () {
      recLoadBoard();
      REC.init();
    }
  };
})();
