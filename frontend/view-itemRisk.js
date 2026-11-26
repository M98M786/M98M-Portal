/* view-itemRisk.js — review 3: "a proper return dashboard, item to item … same with item not
 * received … same with late orders". Three boards on one screen, every product folded across
 * accounts by title (a duplicated listing carries a different id per shop), windows
 * today · yesterday · 7d · 30d · all time, reasons inline, and the management decision alerts
 * (>5 returns, >5 INR, >10 late-tracking orders) pinned red at the top. */
(function () {

  /* 26 Nov (owner): the page is Product Returns now; `win` is the window picker (today … all time),
     `hideAck` hides the products already acknowledged */
  /* 26 Nov (owner): "acknowledgement to clear once seen and decided by management" — an acknowledged
     product leaves the decision box and the table; the tick brings them back */
  var IR = { tab: 'returns', data: null, acct: '', win: 'all', accCol: '', hideAck: true };

  VIEW_CSS.push(
    '.ir-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:820px}' +
    '.ir-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:right;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ir-tbl th:first-child{text-align:left}' +
    '.ir-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums}' +
    '.ir-tbl td:first-child{text-align:left}' +
    '.ir-alert{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft);padding:12px 14px;margin-bottom:14px;font-size:12.5px}' +
    '.ir-hot{background:var(--bad-soft)}' +
    '.ir-dup{font-size:9.5px;font-weight:800;letter-spacing:.05em;color:var(--warn);border:1px solid rgba(255,159,67,.5);border-radius:99px;padding:1px 7px;margin-left:6px}' +
    '.ir-speed-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:14px}' +
    '.ir-st{border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel-2)}' +
    '.ir-st .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ir-st b{display:block;font-size:20px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.ir-st .p{font-size:11px;color:var(--text-3);font-weight:700}.ir-st.bad b{color:var(--bad)}.ir-st.ok b{color:var(--ok)}' +
    /* 26 Nov: the window picker's column, the links under each listing, the acknowledgement box */
    '.ir-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 8px;font-size:12px;color:var(--text-2);font-weight:700}' +
    /* 26 Nov: the window and the account are each one column whose heading is the dropdown */
    /* 26 Nov (owner): the window and the account are chip rows, like Yesterday / 7 days / 30 days */
    '.ir-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 8px}' +
    '.ir-chips .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-right:4px}' +
    '.ir-chips button{padding:6px 12px;border-radius:9px;font-weight:700;font-size:12px;color:var(--text-2);border:1px solid var(--gold-line);background:var(--panel);cursor:pointer;font-family:inherit}' +
    '.ir-chips button.on{color:var(--gold-a);background:rgba(233,169,60,.12);border-color:var(--gold-line-hi);font-weight:800}' +
    '.ir-tbl td.ir-on{color:var(--gold-a);font-weight:800;font-size:13.5px}' +
    '.ir-chk{display:inline-flex;gap:5px;align-items:center;font-size:11.5px;color:var(--text-3);font-weight:700;cursor:pointer}' +
    '.ir-tbl th.ir-on,.ir-tbl td.ir-on{color:var(--gold-a)}' +
    '.ir-links{font-size:10px;color:var(--text-3);margin-top:3px;display:flex;flex-wrap:wrap;gap:3px 9px;align-items:center;font-weight:700}' +
    '.ir-links a{color:var(--text-3);font-weight:800;text-decoration:none;white-space:nowrap}.ir-links a:hover{color:var(--gold-a)}' +
    '.ir-links .mono{font-size:9.5px;font-weight:600}' +
    '.ir-ack{color:var(--ok);font-weight:800;font-size:11px;white-space:nowrap}.ir-acknote{font-size:10.5px;color:var(--text-2);white-space:normal;max-width:240px;line-height:1.4}' +
    '.ir-ackb{margin-top:4px;padding:3px 8px;font-size:10.5px}' +
    '.ir-ackrow td{background:var(--panel-2)}' +
    '.ir-ta{width:100%;box-sizing:border-box;min-height:46px;border:1px solid var(--gold-line);border-radius:8px;background:var(--panel);color:var(--text);padding:6px 8px;font:inherit;font-size:12px}'
  );
  /* under each listing: its number, eBay, its Product history, and every supplier link the item facts hold */
  function irLinks(ids) {
    var L = (IR.data && IR.data.links) || {}, all = ids || [], show = all.slice(0, 4);
    if (!show.length) { return ''; }
    var sup = function (u, lab) { u = String(u || ''); var s = u && typeof safeUrl === 'function' ? safeUrl(u) : ''; return s ? '<a href="' + esc(s) + '" target="_blank" rel="noopener noreferrer" title="' + esc(lab + ' \u00b7 ' + u) + '">' + lab + ' \u2197</a>' : ''; };
    return show.map(function (id) {
      id = String(id); var k = L[id] || {};
      var sups = [sup(k.s1, 'Supplier 1'), sup(k.s2, 'Supplier 2'), sup(k.s3, 'Supplier 3')].filter(Boolean);
      /* an address anywhere in the current-supplier field is the click link; what is left is the name */
      var cm = /https?:\/\/\S+/i.exec(String(k.cur || '')), curUrl = cm ? cm[0] : '', curName = String(k.cur || '').replace(curUrl, '').replace(/[\s:\-\u00b7|,]+$/, '').trim();
      return '<div class="ir-links"><span class="mono">' + esc(id) + '</span>' +
        '<a href="https://www.ebay.co.uk/itm/' + esc(id) + '" target="_blank" rel="noopener noreferrer">eBay \u2197</a>' +
        '<a href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener">History \u2197</a>' +
        /* the current-supplier field is often the working link itself, not a name: a link is drawn as
           one, a name is printed, and a link already among the three is not printed twice */
        (sups.length || curUrl ? sups.join('') : '<span>no supplier link on file</span>') +
        (curUrl && [k.s1, k.s2, k.s3].indexOf(curUrl) < 0 ? sup(curUrl, 'Current supplier') : '') +
        (curName ? '<span>\u00b7 ' + esc(curName.slice(0, 40)) + '</span>' : '') + '</div>';
    }).join('') + (all.length > show.length ? '<div class="ir-links"><span>+' + (all.length - show.length) + ' more listing' + (all.length - show.length === 1 ? '' : 's') + ' under this title</span></div>' : '');
  }
  function irWho(email) { var e = String(email || ''); return e.indexOf('@') > 0 ? e.slice(0, e.indexOf('@')) : (e || 'someone'); }
  var IR_WL = { all: 'All time', today: 'Today', yesterday: 'Yesterday', d7: '7 days', d30: '30 days' };

  /* 1 Oct (owner): "update late tracking with different time frames — 2, 3, 4, 5 days — in which
     time tracking is being uploaded for that item, and how much time orders are really waiting."
     Every order of the last 30 days by the days from the order to its FIRST tracking number;
     "still waiting" = no tracking yet, with how long those orders have waited so far. */
  function irSpeedTable(d) {
    var rows = d.track_speed || [], tot = { all: 0, within2: 0, d3: 0, d4: 0, d5: 0, over5: 0, untracked: 0 };
    rows.forEach(function (r) { Object.keys(tot).forEach(function (k) { tot[k] += Number(r[k]) || 0; }); });
    var pc = function (n) { return tot.all ? Math.round(n / tot.all * 100) + '%' : ''; };
    var h = '<div class="ir-speed-tiles">' + [
      ['Orders · 30 days', tot.all, '', ''], ['Tracked within 2 days', tot.within2, pc(tot.within2), 'ok'], ['Day 3', tot.d3, pc(tot.d3), ''], ['Day 4', tot.d4, pc(tot.d4), ''],
      ['Day 5', tot.d5, pc(tot.d5), ''], ['After 5 days', tot.over5, pc(tot.over5), tot.over5 ? 'bad' : ''], ['Still waiting', tot.untracked, pc(tot.untracked), tot.untracked ? 'bad' : '']
    ].map(function (t) { return '<div class="ir-st ' + t[3] + '"><span class="k">' + t[0] + '</span><b>' + t[1] + '</b>' + (t[2] ? '<span class="p">' + t[2] + ' of orders</span>' : '') + '</div>'; }).join('') + '</div>';
    h += '<div class="scroll"><table class="ir-tbl"><thead><tr><th>#</th><th style="text-align:left">Product · folded across accounts</th><th>Orders 30d</th>' +
      '<th>≤2 days</th><th>3 days</th><th>4 days</th><th>5 days</th><th>&gt;5 days</th><th>Still waiting</th><th>Avg days to tracking</th><th>Waiting now · avg days</th><th>Late share</th></tr></thead><tbody>';
    if (!rows.length) { h += '<tr><td colspan="12" style="text-align:left"><div class="empty">No orders in the last 30 days for this view.</div></td></tr>'; }
    rows.forEach(function (r, i) {
      var hot = r.late_share >= 50 && r.all >= 3;
      h += '<tr' + (hot ? ' class="ir-hot"' : '') + '><td>' + (i + 1) + '</td><td><b>' + esc(String(r.title || r.key).slice(0, 70)) + '</b>' +
        '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + (r.item_ids || []).slice(0, 4).map(function (id) {
          return '<a href="https://www.ebay.co.uk/itm/' + esc(String(id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + esc(String(id)) + '</a>';
        }).join(' · ') + ((r.item_ids || []).length > 4 ? ' +' + (r.item_ids.length - 4) : '') + '</div></td>' +
        '<td style="font-weight:800">' + r.all + '</td><td style="color:var(--ok)">' + (r.within2 || '—') + '</td><td>' + (r.d3 || '—') + '</td><td>' + (r.d4 || '—') + '</td><td>' + (r.d5 || '—') + '</td>' +
        '<td' + (r.over5 ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.over5 || '—') + '</td><td' + (r.untracked ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.untracked || '—') + '</td>' +
        '<td>' + (r.avg_days === null || r.avg_days === undefined ? '—' : r.avg_days + 'd') + '</td><td>' + (r.waiting_avg_days === null || r.waiting_avg_days === undefined ? '—' : r.waiting_avg_days + 'd') + '</td>' +
        '<td' + (hot ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + (r.late_share || 0) + '%</td></tr>';
    });
    return h + '</tbody></table></div>' +
      (d.track_truncated ? '<div class="ir-alert" style="margin-top:8px"><b style="color:var(--bad)">This table hit its row cap</b> — the 30-day window holds more orders than the board reads, so the counts below are a floor, not the whole fleet. Tell the portal team to raise it.</div>' : '') +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Days = from the order to its FIRST tracking number in the tracking ledger. ' +
      '“Still waiting” = no tracking yet; its average is how long those orders have waited so far. Late share = orders not tracked within 2 days. The 2-day marks tab is the permanent ledger of orders that crossed 2 business days untracked.</p>';
  }

  function irLoad() {
    var box = $('irBody');
    if (!box) { return; }
    if (!IR.data) { box.innerHTML = '<div class="spinner"></div>'; }
    api('itemRisk', IR.acct ? { account: IR.acct } : {}).then(function (d) {
      IR.data = d || {};
      irPaint();
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">The board did not answer — ' + esc(e.message) + '</div>';
    });
  }

  function irPaint() {
    var box = $('irBody');
    var d = IR.data;
    if (!box || !d) { return; }
    var a = d.alerts || {};
    var h = '';
    var acksAll = d.acks || {};
    var alerts = [].concat(
      (a.returns5 || []).map(function (x) { return { x: x, w: 'returns', tab: 'returns' }; }),
      (a.inr5 || []).map(function (x) { return { x: x, w: 'not-received cases', tab: 'inr' }; }),
      (a.late10 || []).map(function (x) { return { x: x, w: 'late-tracking orders', tab: 'late' }; })
    );
    var alertsAcked = alerts.filter(function (al) { return !!acksAll[al.tab + '|' + al.x.key]; }).length;
    var alertsOpen = alerts.filter(function (al) { return !acksAll[al.tab + '|' + al.x.key]; });
    if (alertsOpen.length || alertsAcked) {
      h += '<div class="ir-alert"><b style="color:var(--bad)">🔴 ' + alertsOpen.length + ' item(s) need a MANAGEMENT DECISION</b>' +
        (alertsAcked ? ' <span style="color:var(--text-3);font-weight:700">· ' + alertsAcked + ' decided and acknowledged' + (IR.hideAck ? ', cleared from here' : '') + '</span>' : '');
      (IR.hideAck ? alertsOpen : alerts).slice(0, 12).forEach(function (al) {
        var ak = acksAll[al.tab + '|' + al.x.key], kq = esc(String(al.x.key)).replace(/"/g, '&quot;');
        h += '<div style="margin-top:7px;display:flex;gap:10px;align-items:flex-start" data-ir-entry="1"' + (ak ? ' data-acked="1" style="opacity:.6;margin-top:7px;display:flex;gap:10px;align-items:flex-start"' : '') + '><div style="flex:1 1 auto;min-width:0"><b>' + esc(String(al.x.title || al.x.key).slice(0, 80)) + '</b>' +
          (al.x.duplicated ? '<span class="ir-dup">DUPLICATED · ' + al.x.item_ids.length + ' listings</span>' : '') +
          ' — <b>' + al.x.all + '</b> ' + al.w + ' across ' + Object.keys(al.x.accounts || {}).length + ' account(s)' +
          (al.x.reasons ? ' · ' + esc(String(al.x.reasons)) : '') + irLinks(al.x.item_ids) +
          (ak ? '<div class="ir-ack">✓ ' + esc(irWho(ak.email)) + ' · ' + esc(String(ak.at).replace('T', ' ').slice(0, 16)) + ' · ' + esc(ak.note) + '</div>' : '') + '</div>' +
          '<button class="minibtn ir-ackb" style="flex:none;margin-top:0" data-ir-ack="' + kq + '" data-ir-tab="' + al.tab + '">' + (ak ? 'Update…' : 'Acknowledge…') + '</button></div>';
      });
      if (!alertsOpen.length) { h += '<div style="margin-top:6px;color:var(--ok);font-weight:800">Every decision item is acknowledged.</div>'; }
      h += '<div style="margin-top:6px;font-size:11px;color:var(--text-3);font-weight:600">The same alerts land as letters in the Alerts centre, one per tier (5, 10, 15…), so nothing rings twice. Acknowledging here records who decided, when and what; the item clears from this box and the table.</div></div>';
    }

    if (IR.tab === 'speed') { box.innerHTML = h + irSpeedTable(d); return; }
    var list = IR.tab === 'returns' ? (d.returns || []) : IR.tab === 'inr' ? (d.inr || []) : (d.late || []);
    var threshold = IR.tab === 'late' ? 10 : 5;
    var showReasons = IR.tab !== 'late';
    /* 26 Nov (owner): "a dropdown from today to all time — selecting one shows that window's data".
       The list is cut to the products with a count in the window, sorted by it, the window's column is
       lit, and the per-account columns follow the window too. */
    var W = IR_WL[IR.win] ? IR.win : 'all';
    var cnt = function (r) { return W === 'today' ? (r.today || 0) : W === 'yesterday' ? (r.yesterday || 0) : W === 'd7' ? (r.d7 || 0) : W === 'd30' ? (r.d30 || 0) : (r.all || 0); };
    var accOf = function (r) { return (r.accounts_by && r.accounts_by[W]) || (W === 'all' ? (r.accounts || {}) : {}); };
    /* 26 Nov (owner): "a box showing all-time data with a dropdown to see today, yesterday, 7 days, 30
       days; similarly a box showing all-account data with a dropdown for each account". Two columns:
       the window column, whose heading is the window dropdown, and the account column, whose heading
       is the account dropdown — all accounts by default, one account when picked. The list is cut to
       the products with a count in that window (and for that account), sorted by it. */
    var allAccts = {};
    list.forEach(function (r) { Object.keys((r.accounts_by && r.accounts_by.all) || r.accounts || {}).forEach(function (a2) { allAccts[a2] = 1; }); });
    var acctNames = Object.keys(allAccts).sort();
    var A = IR.accCol && allAccts[IR.accCol] ? IR.accCol : '';
    var acnt = function (r) { return A ? (accOf(r)[A] || 0) : cnt(r); };
    var sortBy = A ? acnt : cnt;
    if (W !== 'all' || A) { list = list.filter(function (r) { return sortBy(r) > 0; }).slice().sort(function (x, y) { return sortBy(y) - sortBy(x); }); }
    var acks = d.acks || {};
    var ackKey = function (r) { return IR.tab + '|' + r.key; };
    var nAck = list.filter(function (r) { return !!acks[ackKey(r)]; }).length;
    if (IR.hideAck) { list = list.filter(function (r) { return !acks[ackKey(r)]; }); }
    h += '<div class="ir-tools"><span>' + esc(IR_WL[W]) + ' · ' + (A ? esc(A) : (IR.acct ? esc(IR.acct) : 'all accounts')) + ' · ' + list.length + ' product' + (list.length === 1 ? '' : 's') + (nAck ? ' · ' + nAck + ' acknowledged' : '') + '</span>' +
      '<label class="ir-chk"><input type="checkbox" id="irShowAck"' + (IR.hideAck ? '' : ' checked') + '> show acknowledged</label>' +
      (list.length ? '<button class="minibtn" id="irAckAll">Acknowledge all shown\u2026</button>' : '') + '</div>';
    h += '<div class="ir-chips"><span class="k">Window</span>' + ['all', 'today', 'yesterday', 'd7', 'd30'].map(function (k) { return '<button data-ir-win="' + k + '"' + (W === k ? ' class="on"' : '') + '>' + IR_WL[k] + '</button>'; }).join('') + '</div>' +
      '<div class="ir-chips"><span class="k">Account</span><button data-ir-acc=""' + (A ? '' : ' class="on"') + '>All accounts</button>' + acctNames.map(function (a2) { return '<button data-ir-acc="' + esc(a2).replace(/"/g, '&quot;') + '"' + (A === a2 ? ' class="on"' : '') + '>' + esc(a2) + '</button>'; }).join('') + '</div>';
    h += '<div class="scroll"><table class="ir-tbl"><thead><tr>' +
      '<th>#</th><th style="text-align:left">Product \u00b7 folded across accounts</th>' +
      '<th class="ir-on">' + esc(IR_WL[W]) + '</th><th' + (A ? ' class="ir-on"' : '') + '>' + (A ? esc(A) : 'All accounts') + '</th>' +
      (showReasons ? '<th>Refund \u00a3</th><th style="text-align:left">Reasons (qty per reason)</th>' : '') +
      '<th>% of total</th><th style="text-align:left">Acknowledged</th></tr></thead><tbody>';
    if (!list.length) {
      h += '<tr><td colspan="9" style="text-align:left"><div class="empty">' +
        (IR.tab === 'late' ? 'No late-tracking marks yet \u2014 counting started 21 Aug; every order that crosses 2 business days untracked lands here permanently.'
          : (W !== 'all' || A) ? 'Nothing recorded for ' + esc(IR_WL[W].toLowerCase()) + (A ? ' on ' + esc(A) : '') + (IR.hideAck ? ' that is not acknowledged' : '') + '.' : IR.hideAck ? 'Everything here is acknowledged.' : 'Nothing recorded.') + '</div></td></tr>';
    }
    list.forEach(function (r, rank) {
      var hot = r.all > threshold, ak = acks[ackKey(r)];
      var kq = esc(String(r.key)).replace(/"/g, '&quot;');
      h += '<tr' + (hot ? ' class="ir-hot"' : '') + (ak ? ' style="opacity:.75"' : '') + '><td>' + (rank + 1) + '</td>' +
        '<td style="text-align:left;min-width:300px"><b>' + esc(String(r.title || r.key).slice(0, 70)) + '</b>' +
        (r.duplicated ? '<span class="ir-dup">DUPLICATED</span>' : '') +
        (hot ? ' <b style="color:var(--bad)">\u00b7 DECISION</b>' : '') +
        irLinks(r.item_ids) + '</td>' +
        '<td class="ir-on">' + cnt(r) + '</td>' +
        '<td' + (A ? ' class="ir-on"' : '') + '>' + (A ? (acnt(r) || '\u2014') : cnt(r)) + '</td>' +
        (showReasons
          ? '<td>' + (Number(r.refund) ? '\u00a3' + Number(r.refund).toFixed(2) : '\u2014') + '</td>' +
            '<td style="text-align:left;font-size:11px;color:var(--text-2);max-width:260px;white-space:normal">' + esc(String(r.reasons || '')) + '</td>'
          : '') +
        '<td>' + (r.pct || 0) + '%</td>' +
        '<td style="text-align:left;min-width:180px">' +
          (ak ? '<span class="ir-ack">\u2713 ' + esc(irWho(ak.email)) + ' \u00b7 ' + esc(String(ak.at).replace('T', ' ').slice(0, 16)) + '</span><div class="ir-acknote">' + esc(ak.note) + '</div>' : '') +
          '<button class="minibtn ir-ackb" data-ir-ack="' + kq + '">' + (ak ? 'Update\u2026' : 'Acknowledge\u2026') + '</button></td></tr>';
    });
    h += '</tbody></table></div>' +
      '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' + esc(String(d.note || '')) + ' Acknowledging records who looked, when, and what they said, per board and product; it hides nothing unless you tick hide acknowledged.</p>';
    box.innerHTML = h;
    irWire(box, list);
  }

  /* the acknowledgement box: one product (a comment row opens under it) or every product shown */
  function irWire(box, list) {
    var hc = $('irShowAck'); if (hc) { hc.onchange = function () { IR.hideAck = !this.checked; irPaint(); }; }
    box.querySelectorAll('[data-ir-win]').forEach(function (b) { b.onclick = function () { IR.win = this.getAttribute('data-ir-win') || 'all'; irPaint(); }; });
    box.querySelectorAll('[data-ir-acc]').forEach(function (b) { b.onclick = function () { IR.accCol = this.getAttribute('data-ir-acc') || ''; irPaint(); }; });
    var aa = $('irAckAll');
    if (aa) {
      aa.onclick = function () {
        var note = window.prompt('Acknowledge every product shown (' + list.length + '). One comment is recorded on each \u2014 what did you find or decide?');
        if (note === null) { return; }
        note = String(note).trim(); if (!note) { toast('A comment is required to acknowledge.'); return; }
        aa.disabled = true;
        api('itemRiskAck', { tab: IR.tab, keys: list.map(function (r) { return r.key; }), note: note }).then(function (res) {
          IR.data.acks = IR.data.acks || {};
          list.forEach(function (r) { IR.data.acks[IR.tab + '|' + r.key] = { email: (res && res.email) || '', note: note, at: (res && res.at) || new Date().toISOString() }; });
          toast('Acknowledged ' + list.length + ' product' + (list.length === 1 ? '' : 's'));
          irPaint();
        })['catch'](function (e) { aa.disabled = false; toast('Not acknowledged: ' + ((e && e.message) || 'no answer')); });
      };
    }
    box.onclick = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-ir-ack]') : null; if (!b) { return; }
      var key = b.getAttribute('data-ir-ack'), tab = b.getAttribute('data-ir-tab') || IR.tab;
      var tr = b.closest('tr') || b.closest('[data-ir-entry]'); if (!tr) { return; }
      var nx = tr.nextElementSibling;
      if (nx && nx.classList.contains('ir-ackrow')) { nx.parentNode.removeChild(nx); return; }
      var inTable = tr.tagName === 'TR';
      var row = document.createElement(inTable ? 'tr' : 'div'); row.className = 'ir-ackrow';
      var inner = '<textarea class="ir-ta" rows="2" placeholder="What did you find or decide about this product? (required)"></textarea>' +
        '<div style="margin-top:6px;display:flex;gap:6px"><button class="minibtn ir-save">Acknowledge with this comment</button><button class="minibtn ir-cancel">Cancel</button></div>';
      row.innerHTML = inTable ? '<td colspan="20" style="text-align:left">' + inner + '</td>' : inner;
      if (!inTable) { row.style.cssText = 'margin:6px 0 4px;padding:8px;border:1px solid var(--gold-line);border-radius:10px;background:var(--panel-2)'; }
      tr.parentNode.insertBefore(row, tr.nextSibling);
      var ta = row.querySelector('textarea'); if (ta) { ta.focus(); }
      row.querySelector('.ir-cancel').onclick = function () { row.parentNode.removeChild(row); };
      row.querySelector('.ir-save').onclick = function () {
        var note = String(ta.value || '').trim(); if (!note) { toast('Write a comment first.'); ta.focus(); return; }
        this.disabled = true;
        api('itemRiskAck', { tab: tab, key: key, note: note }).then(function (res) {
          IR.data.acks = IR.data.acks || {};
          IR.data.acks[tab + '|' + key] = { email: (res && res.email) || '', note: note, at: (res && res.at) || new Date().toISOString() };
          toast('Acknowledged — cleared'); irPaint();
        })['catch'](function (e) { toast('Not acknowledged: ' + ((e && e.message) || 'no answer')); });
      };
    };
  }

  VIEWS.itemRisk = {
    /* 26 Nov (owner): "first change the name to Product Returns" */
    label: 'Product Returns',
    order: 8.5,
    roles: ['Management', 'Ops Head', 'CS', 'Team Lead', 'Product Hunter', 'Order Processor'],
    icon: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    prefetch: function () { return api('itemRisk', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Product <span class="goldtext">Returns</span></h1>' +
        '<span class="sub">returns · item not received · late tracking by 2 / 3 / 4 / 5 days — item by item, across all accounts, with the decision alerts</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
        [['returns', 'Returns'], ['inr', 'Not received'], ['speed', 'Late tracking'], ['late', '2-day marks']].map(function (t) {
          return '<button class="minibtn' + (IR.tab === t[0] ? ' on' : '') + '" data-ir-t="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
        '<select id="irAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
        '<button class="minibtn" id="irRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="irBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      document.querySelectorAll('[data-ir-t]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-ir-t]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          IR.tab = this.getAttribute('data-ir-t');
          irPaint();
        };
      });
      var sa = $('irAcct');
      if (sa) {
        fillAccountSelect(sa, IR.acct, function () { IR.acct = sa.value; IR.data = null; irLoad(); });
      }
      var rf = $('irRefresh');
      if (rf) { rf.onclick = irLoad; }
      irLoad();
    }
  };
})();
