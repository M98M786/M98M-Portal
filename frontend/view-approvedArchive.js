/* view-approvedArchive.js — 22 Oct (owner): "approved items will have a proper presentational
 * archive, and from that page I will select a lister and then send the listing." Approval no longer
 * assigns a lister (actionDecideHunt_ only approves); this page is the second step. Two sections:
 * PENDING SEND — approved items with no listing task yet, each a product card with a send form
 * (account · campaign type · lister → Send, which creates the listing_new task via huntSendToLister);
 * and SENT — items already handed to a lister, with who holds it and the status. Reads approvedArchive.
 * Reuses the shared hu-* card styles. Profit/ROI ride only for roles the server lets see them. */
(function () {
  'use strict';

  var AA_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Listing Manager'];

  VIEW_CSS.push(
    '.aa-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.aa-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.aa-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.aa-tile b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    /* 13 Nov (owner): the per-lister load, on the page where the sending decision is made */
    '.aa-load{margin:0 0 14px}' +
    '.aa-load-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}' +
    '.aa-load-h b{font-size:12.5px;font-weight:800}' +
    '.aa-load-h span{font-size:11px;color:var(--text-3);font-weight:600;line-height:1.5}' +
    '.aa-lgrid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}' +
    '.aa-l{border:1px solid var(--gold-line);border-radius:12px;padding:11px 13px;background:var(--panel-2)}' +
    '.aa-l .n{font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.aa-l .r{font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em}' +
    '.aa-l b{display:block;font-size:26px;font-weight:800;margin:6px 0 1px;font-variant-numeric:tabular-nums;line-height:1}' +
    '.aa-l .w{font-size:10.5px;color:var(--text-3);font-weight:700}' +
    '.aa-l .d{font-size:10.5px;color:var(--text-2);font-weight:600;margin-top:6px;line-height:1.5}' +
    '.aa-l.free{border-color:rgba(72,199,142,.45)}.aa-l.free b{color:var(--ok)}' +
    '.aa-l.busy{border-color:rgba(255,159,67,.45)}.aa-l.busy b{color:var(--warn)}' +
    '.aa-l.heavy{border-color:rgba(240,96,90,.5)}.aa-l.heavy b{color:var(--bad)}' +
    '.aa-l .late{color:var(--bad);font-weight:800}' +
    '.aa-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}' +
    '.aa-card{border:1px solid var(--gold-line);border-radius:14px;background:var(--panel-2);overflow:hidden;display:flex;flex-direction:column}' +
    '.aa-card .aa-hd{display:flex;gap:11px;padding:12px 13px;border-bottom:1px solid var(--gold-line)}' +
    '.aa-img{width:62px;height:62px;border-radius:10px;object-fit:cover;background:var(--panel);border:1px solid var(--gold-line);flex:none}' +
    '.aa-t{font-weight:800;font-size:13px;line-height:1.25;max-height:3.2em;overflow:hidden}' +
    '.aa-meta{font-size:11px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.aa-nums{display:flex;flex-wrap:wrap;gap:6px;padding:10px 13px}' +
    '.aa-num{font-size:11px;font-weight:700;background:var(--panel);border:1px solid var(--gold-line);border-radius:8px;padding:3px 8px}' +
    '.aa-num b{color:var(--gold-a)}' +
    '.aa-links{display:flex;flex-wrap:wrap;gap:8px;padding:0 13px 10px}' +
    '.aa-links a{font-size:11px;font-weight:800}' +
    '.aa-send{margin-top:auto;padding:11px 13px;border-top:1px solid var(--gold-line);background:var(--panel)}' +
    '.aa-send .aa-row{display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:8px}' +
    '.aa-in{width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel-2);color:var(--text);font:inherit;font-weight:700;font-size:12px}' +
    '.aa-send label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);font-weight:800;margin-bottom:3px}' +
    '.aa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
    '.aa-tab{padding:9px 15px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-2);font-weight:800;font-size:12.5px;cursor:pointer}' +
    '.aa-tab.on{background:var(--gold-a);color:#1a1204;border-color:var(--gold-a)}' +
    '.aa-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:620px}' +
    '.aa-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.aa-tbl td{padding:8px 10px;border-bottom:1px solid var(--gold-line)}' +
    '.aa-empty{color:var(--text-2);font-weight:700;padding:16px 0}.aa-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}'
  );

  /* `load` is deliberately absent until listingLoad answers: undefined means "not asked yet" and
     draws nothing, null means "asked and refused" and says so. */
  var AA = { data: null, sentData: null, tab: 'pending', accounts: [], listers: [], autoListers: [], autoAccounts: [], seq: 0, sentSeq: 0, loadErr: '' };

  /* 22 Oct (owner): auto-select the deadline as a datetime-local value, so the owner never types it.
     13 Nov (owner): "auto select the date two days into the future, don't select Sunday rather skip
     to Monday" — two days after today in Pakistan time, 11:59 PM; a Sunday moves to the Monday.
     PKT is UTC+5; a datetime-local wants local wall time. */
  function aaTodayEndPkt(nowMs) {
    var pk = new Date((nowMs == null ? Date.now() : nowMs) + 5 * 3600000 + 2 * 86400000);   // PKT, two days on
    if (pk.getUTCDay() === 0) { pk = new Date(pk.getTime() + 86400000); }                    // Sunday → Monday
    var y = pk.getUTCFullYear(), m = ('0' + (pk.getUTCMonth() + 1)).slice(-2), d = ('0' + pk.getUTCDate()).slice(-2);
    return y + '-' + m + '-' + d + 'T23:59';
  }
  /* 13 Nov (owner): "Lister selection alternating between four Listers" — the auto-pick rotates
     round-robin, card by card, across the listing staff (Item Lister + Listing Manager roles; the
     Team Lead stays in the dropdown for a manual pick but is not dealt cards). */
  /* 14 Nov (owner): "Husnain Naeem is removed listers, and also in listers selections" — the Team
     Lead is no longer asked for at all, so he sits in neither the workload boxes nor the Lister
     dropdown; both are drawn from this one list, so they cannot disagree. */
  var AA_LISTER_ROLES = ['Item Lister', 'Listing Manager'];
  function aaComputeAutoListers() {
    AA.autoListers = AA.listers.filter(function (l) { return l.role === 'Item Lister' || l.role === 'Listing Manager'; })
      .map(function (l) { return l.email; });
  }
  /* 13 Nov (owner): "auto selections of all accounts except for Rabia & Yaseen" — every pending card
     gets an account, dealt round-robin across the accounts that are not Rabia's or Yaseen's. */
  function aaComputeAutoAccounts() {
    AA.autoAccounts = AA.accounts.filter(function (a) { return !/\b(rabia|yaseen)\b/i.test(a); });
  }

  function aaStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function aaAttr(v) { return esc(aaStr(v)).replace(/"/g, '&quot;'); }
  function aaMoney(v) { var n = Number(String(v).replace(/[£$,]/g, '')); return isFinite(n) && n !== 0 ? '£' + n.toFixed(2) : aaStr(v); }
  function aaLink(url, label) {
    var u = aaStr(url); if (!/^https?:\/\//i.test(u)) { return ''; }
    var safe = typeof safeUrl === 'function' ? safeUrl(u) : u; if (!safe) { return ''; }
    return '<a href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }

  function aaStatusPill(st) {
    st = aaStr(st);
    if (st === 'Completed') { return '<span class="pill hu-ok">Listed</span>'; }
    if (st === 'Submitted — awaiting approval') { return '<span class="pill">Submitted</span>'; }
    if (st === 'Working' || st === 'Updated') { return '<span class="pill hu-rev">Being listed</span>'; }
    return '<span class="pill hu-wait">Not started</span>';
  }

  function aaCard(h, canSend, idx) {
    var id = aaStr(h.hunt_id);
    var autoL = AA.autoListers.length ? AA.autoListers[(idx || 0) % AA.autoListers.length] : '';
    var autoA = AA.autoAccounts.length ? AA.autoAccounts[(idx || 0) % AA.autoAccounts.length] : '';
    var img = aaStr(h['Image Link']);
    var nums = '';
    function num(label, v, money) { var val = money ? aaMoney(v) : aaStr(v); if (!val || val === '0') { return; } nums += '<span class="aa-num">' + esc(label) + ' <b>' + esc(val) + '</b></span>'; }
    num('Source', h['Source Price'], true);
    num('Sell', h['E-Bey Caluclator + £4'], true);
    if (h['Our Profit'] !== undefined) { num('Profit', h['Our Profit'], true); num('ROI', h['ROI'] ? aaStr(h['ROI']) + '%' : '', false); }
    num('Top-3 / 30d', h['TOP THREE SALES'], false);
    num('Sell-through', h['Sell Through'], false);
    var links = [aaLink(h['Product Link 1 Main supplier'], 'Supplier'), aaLink(h['Ebay Link'], 'eBay'),
      aaLink(h['Main Keyword Terapeak link'], 'Terapeak'), aaLink(h['Temu Link'], 'Temu')].filter(Boolean).join('');
    var when = (typeof fmtPkt === 'function' ? fmtPkt(h.ts, true) : '') || '';
    var who = aaStr(h.hunter_name) || aaStr(h.hunter_email);

    var send = '';
    if (canSend) {
      send = '<div class="aa-send">' +
        '<div class="aa-row">' +
          '<div><label>Account</label><select class="aa-in" data-aa-acc="' + aaAttr(id) + '"><option value="">— choose —</option>' + aaAccountOpts(aaStr(h.account_hint) || autoA) + '</select></div>' +
          '<div><label>Campaign type</label><select class="aa-in" data-aa-camp="' + aaAttr(id) + '"><option value="">— choose —</option>' + aaCampOpts(h['CPC Selling Chance']) + '</select></div>' +
        '</div>' +
        '<div class="aa-row">' +
          '<div><label>Lister' + (autoL ? ' <span style="color:var(--text-3);font-weight:600;text-transform:none;letter-spacing:0">· auto</span>' : '') + '</label><select class="aa-in" data-aa-lister="' + aaAttr(id) + '"><option value="">— choose —</option>' + aaListerOpts(autoL) + '</select></div>' +
          '<div><label>Deadline (PKT)</label><input class="aa-in" type="datetime-local" data-aa-due="' + aaAttr(id) + '" value="' + aaTodayEndPkt() + '"></div>' +
        '</div>' +
        '<button class="btn-gold" data-aa-send="' + aaAttr(id) + '" style="width:100%">Send to lister</button>' +
      '</div>';
    } else {
      send = '<div class="aa-send"><div class="hu-hint" style="margin:0">Management sends this to a lister.</div></div>';
    }

    return '<div class="aa-card" data-aa-card="' + aaAttr(id) + '">' +
      '<div class="aa-hd">' +
        (img && (typeof safeUrl !== 'function' || safeUrl(img)) ? '<img class="aa-img" loading="lazy" src="' + esc(typeof safeUrl === 'function' ? safeUrl(img) : img) + '" alt="">' : '<div class="aa-img"></div>') +
        '<div><div class="aa-t">' + esc(aaStr(h['Title']) || id) + '</div>' +
          '<div class="aa-meta"><span class="mono">' + esc(id) + '</span>' + (who ? ' · ' + esc(who) : '') + (when ? ' · ' + esc(when) : '') +
          (aaStr(h['Seasonal']) ? ' · ' + esc(aaStr(h['Seasonal'])) : '') + '</div></div>' +
      '</div>' +
      (nums ? '<div class="aa-nums">' + nums + '</div>' : '') +
      (links ? '<div class="aa-links">' + links + '</div>' : '') +
      send +
    '</div>';
  }

  function aaAccountOpts(hint) {
    return AA.accounts.map(function (a) {
      return '<option value="' + aaAttr(a) + '"' + (aaStr(hint) && aaStr(hint) === a ? ' selected' : '') + '>' + esc(a) + '</option>';
    }).join('');
  }
  function aaCampOpts(cur) {
    var types = (AA.data && AA.data.advertising_types) || [];
    return types.map(function (t) { return '<option value="' + aaAttr(t) + '"' + (aaStr(cur) === aaStr(t) ? ' selected' : '') + '>' + esc(t) + (aaStr(cur) === aaStr(t) ? ' — hunt pick' : '') + '</option>'; }).join('');
  }
  function aaListerOpts(sel) {
    return AA.listers.map(function (l) { return '<option value="' + aaAttr(l.email) + '"' + (aaStr(sel) && aaStr(sel) === aaStr(l.email) ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('');
  }

  /* ---------- who is holding how much, right now (owner, 13 Nov) ----------
     "boxes at the top showing how many items each lister already has assigned right now, so we
     know how many more to send them, and how many are still pending on their portal where they
     have not added the draft link yet."
     THOSE TWO ARE ONE NUMBER, and the page says so instead of printing it twice: adding the draft
     link hands the task to the go-live desk, so a listing still sitting with a lister is exactly a
     listing with no draft link yet. Checked against the live book before building this — all four
     listers held zero drafted items; every drafted one had already moved to the go-live holder.
     The same engine read Hunt approvals uses (listingLoad), so there is one source of truth for
     the workload and no second route to keep in step. It is fetched AFTER the archive paints, so
     the page opens no slower than it does today.
     Ordered with the most room first: this page exists to choose who gets the next one. */
  var AA_SUBMITTED = 'Submitted — awaiting approval';   // the TASKS tab's own words, em dash included
  function aaLoadLoad() {
    if (typeof engineCall !== 'function') { return; }
    engineCall('listingLoad', {}, 20000).then(function (d) {
      AA.load = (d && d.tasks) || [];
      AA.loadErr = '';
      aaPaintLoad();
    }).catch(function (e) {
      AA.load = null; AA.loadErr = (e && e.message) || 'no answer';
      aaPaintLoad();
    });
  }
  function aaPaintLoad() {
    var box = $('aaLoad'); if (!box) { return; }
    if (AA.load === undefined) { return; }
    if (AA.load === null) {
      box.innerHTML = '<div class="aa-load-h"><b>Lister workload</b><span>could not be read \u2014 ' + esc(AA.loadErr) + '</span></div>';
      return;
    }
    var by = {};
    AA.load.forEach(function (t) {
      if (!t.open) { return; }
      var k = aaStr(t.assigned_to).toLowerCase();
      if (!k) { return; }
      var b = by[k] || (by[k] = { waiting: 0, notStarted: 0, working: 0, submitted: 0, overdue: 0, oldest: null });
      /* a submitted task is waiting on US to approve it, not on the lister's draft link */
      if (t.status === AA_SUBMITTED) { b.submitted++; return; }
      b.waiting++;
      if (t.status === 'Working' || t.status === 'Updated') { b.working++; } else { b.notStarted++; }
      if (t.overdue) { b.overdue++; }
      var ms = Date.parse(aaStr(t.assigned_at));
      if (isFinite(ms)) {
        var days = Math.floor((Date.now() - ms) / 86400000);
        if (b.oldest === null || days > b.oldest) { b.oldest = days; }
      }
    });
    /* exactly the people the Send form can choose — the boxes and the dropdown must agree */
    var rows = AA.listers.map(function (l) {
      var b = by[aaStr(l.email).toLowerCase()] || { waiting: 0, notStarted: 0, working: 0, submitted: 0, overdue: 0, oldest: null };
      return { name: aaStr(l.name).split(' \u2014 ')[0], role: aaStr(l.role), b: b };
    }).sort(function (x, y) { return x.b.waiting - y.b.waiting; });
    if (!rows.length) { box.innerHTML = ''; return; }
    var total = rows.reduce(function (n, r) { return n + r.b.waiting; }, 0);
    box.innerHTML =
      '<div class="aa-load-h"><b>Waiting with the listers right now</b>' +
        '<span>' + total + ' listing' + (total === 1 ? '' : 's') + ' on their desks \u00b7 most room first. ' +
        'A listing leaves a lister the moment its draft link is added, so what they are holding IS what has no draft link yet.</span></div>' +
      '<div class="aa-lgrid">' + rows.map(function (r) {
        var b = r.b;
        var cls = b.waiting === 0 ? ' free' : (b.waiting >= 20 ? ' heavy' : (b.waiting >= 8 ? ' busy' : ''));
        var bits = [];
        if (b.notStarted) { bits.push(b.notStarted + ' not opened'); }
        if (b.working) { bits.push(b.working + ' started'); }
        if (b.oldest !== null && b.waiting) { bits.push('oldest ' + b.oldest + 'd'); }
        if (b.submitted) { bits.push(b.submitted + ' with us to approve'); }
        return '<div class="aa-l' + cls + '"><div class="n" title="' + esc(r.name) + '">' + esc(r.name) + '</div>' +
          '<div class="r">' + esc(r.role) + '</div>' +
          '<b>' + b.waiting + '</b>' +
          '<div class="w">' + (b.waiting === 0 ? 'nothing waiting \u2014 free' : 'waiting for a draft link') + '</div>' +
          (b.overdue ? '<div class="d"><span class="late">' + b.overdue + ' past the deadline</span>' + (bits.length ? ' \u00b7 ' + esc(bits.join(' \u00b7 ')) : '') + '</div>'
                     : (bits.length ? '<div class="d">' + esc(bits.join(' \u00b7 ')) + '</div>' : '')) +
        '</div>';
      }).join('') + '</div>';
  }

  function aaPaint() {
    var d = AA.data;
    var tiles = $('aaTiles'); if (tiles && d) {
      var sc = AA.sentData && AA.sentData.counts;
      var withL = sc ? sc.with_listers : null, listed = sc ? sc.listed : null;
      tiles.innerHTML =
        '<div class="aa-tile"><span class="k">Approved · pending send</span><b class="goldtext">' + (d.counts ? d.counts.pending_send : 0) + '</b></div>' +
        '<div class="aa-tile"><span class="k">With listers · in progress</span><b style="color:var(--warn)">' + (withL == null ? '…' : withL) + '</b></div>' +
        '<div class="aa-tile"><span class="k">Listed</span><b style="color:var(--ok)">' + (listed == null ? '…' : listed) + '</b></div>';
    }
    aaPaintLoad();   // AA.listers arrives with the archive, so the boxes are drawn with it
    var tabs = $('aaTabs'); if (tabs && d) {
      tabs.innerHTML =
        '<button class="aa-tab' + (AA.tab === 'pending' ? ' on' : '') + '" data-aa-tab="pending">Pending send <span style="opacity:.7">' + (d.counts ? d.counts.pending_send : 0) + '</span></button>' +
        '<button class="aa-tab' + (AA.tab === 'sent' ? ' on' : '') + '" data-aa-tab="sent">Sent to listers <span style="opacity:.7">' + ((AA.sentData && AA.sentData.counts) ? AA.sentData.counts.sent : '…') + '</span></button>';
      Array.prototype.forEach.call(tabs.querySelectorAll('[data-aa-tab]'), function (b) {
        b.onclick = function () { AA.tab = this.getAttribute('data-aa-tab'); if (AA.tab === 'sent' && !AA.sentData) { aaLoadSent(); } aaPaint(); };
      });
    }
    var body = $('aaBody'); if (!body || !d) { return; }
    if (AA.tab === 'pending') {
      var items = d.pending_send || [];
      if (!items.length) { body.innerHTML = '<div class="aa-empty">Nothing waiting to be sent.<span>Approved items land here; choose a lister and send each one.</span></div>'; return; }
      body.innerHTML = '<div class="aa-grid">' + items.map(function (h, i) { return aaCard(h, !!d.can_send, i); }).join('') + '</div>';
      aaWireSend(body);
    } else {
      if (!AA.sentData) { body.innerHTML = '<div class="spinner"></div>'; aaLoadSent(); return; }
      var sent = AA.sentData.sent || [];
      if (!sent.length) { body.innerHTML = '<div class="aa-empty">Nothing sent yet.</div>'; return; }
      body.innerHTML = '<div class="scroll"><table class="aa-tbl"><thead><tr>' +
        '<th>Product</th><th>Account</th><th>Lister</th><th>Status</th><th>Sent</th></tr></thead><tbody>' +
        sent.map(function (x) {
          return '<tr><td style="max-width:280px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(aaStr(x.title) || aaStr(x.hunt_id)) + '</div>' +
            '<span class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(aaStr(x.hunt_id)) + '</span></td>' +
            '<td>' + esc(aaStr(x.account) || '—') + '</td>' +
            '<td>' + esc(aaStr(x.lister).split('@')[0] || '—') + '</td>' +
            '<td>' + aaStatusPill(x.status) + '</td>' +
            '<td style="white-space:nowrap;font-size:11.5px;color:var(--text-3)">' + esc((typeof fmtPkt === 'function' ? fmtPkt(x.created_at, true) : '') || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  }

  function aaWireSend(box) {
    Array.prototype.forEach.call(box.querySelectorAll('[data-aa-send]'), function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-aa-send');
        var acc = box.querySelector('[data-aa-acc="' + id.replace(/"/g, '') + '"]');
        var camp = box.querySelector('[data-aa-camp="' + id.replace(/"/g, '') + '"]');
        var lst = box.querySelector('[data-aa-lister="' + id.replace(/"/g, '') + '"]');
        var due = box.querySelector('[data-aa-due="' + id.replace(/"/g, '') + '"]');
        var account = acc ? aaStr(acc.value) : '', campV = camp ? aaStr(camp.value) : '', lister = lst ? aaStr(lst.value) : '';
        if (!account) { toast('Choose the account this item lists on.'); if (acc) { acc.focus(); } return; }
        if (!campV) { toast('Choose the campaign type.'); if (camp) { camp.focus(); } return; }
        if (!lister) { toast('Choose the lister to send it to.'); if (lst) { lst.focus(); } return; }
        var btn = this; btn.disabled = true; btn.textContent = 'Sending…';
        var card = box.querySelector('[data-aa-card="' + id.replace(/"/g, '') + '"]');
        api('huntSendToLister', { hunt_id: id, account: account, advertising_type: campV,
          lister_email: lister, deadline_pkt: due ? aaStr(due.value) : '' }).then(function (r) {
          if (card) { card.style.transition = 'opacity .3s'; card.style.opacity = '0'; setTimeout(function () { if (card.parentNode) { card.parentNode.removeChild(card); } }, 300); }
          toast('Sent to ' + (aaStr(r && r.assigned_to).split('@')[0] || 'the lister') + ' ✓');
          /* reconcile counts after a moment (the task mirror lands) */
          setTimeout(aaLoad, 1500);
        }).catch(function (e) {
          btn.disabled = false; btn.textContent = 'Send to lister';
          toast('NOT sent — ' + String((e && e.message) || ''));
        });
      };
    });
  }

  function aaLoadSent() {
    var seq = ++AA.sentSeq;
    api('approvedArchive', { view: 'sent' }).then(function (d) {
      if (seq !== AA.sentSeq) { return; }
      AA.sentData = d || { sent: [], counts: {} };
      aaPaint();
    }).catch(function () { /* leave the tiles at … ; the pending workflow is unaffected */ });
  }

  function aaLoad() {
    AA.sentData = null;
    var seq = ++AA.seq;
    var body = $('aaBody'); if (body && !AA.data) { body.innerHTML = '<div class="spinner"></div>'; }
    Promise.all([
      api('approvedArchive', {}),
      api('accountList', {}).catch(function () { return { accounts: [] }; }),
      api('assignableStaff', { roles: AA_LISTER_ROLES }).catch(function () { return { staff: [] }; })
    ]).then(function (res) {
      if (seq !== AA.seq) { return; }
      AA.data = res[0] || {};
      AA.accounts = ((res[1] && res[1].accounts) || []).map(function (a) { return aaStr(a.account); }).filter(Boolean);
      AA.listers = ((res[2] && res[2].staff) || []).map(function (s) { return { email: aaStr(s.email), role: aaStr(s.role), name: aaStr(s.name) + ' — ' + aaStr(s.role) }; });
      aaComputeAutoListers();
      aaComputeAutoAccounts();
      if (STATE.counts) { STATE.counts.approvedArchive = (AA.data.counts && AA.data.counts.pending_send) || 0; }
      if (typeof refreshBadges === 'function') { try { refreshBadges(); } catch (e) {} }
      aaPaint();
      aaLoadSent();   // the heavy list, in the background, so the tiles fill and the Sent tab is ready
      aaLoadLoad();   // and who is holding how much, so the choice of lister is an informed one
    }).catch(function (e) {
      if (seq !== AA.seq) { return; }
      var b = $('aaBody'); if (b) { b.innerHTML = '<div class="aa-empty">Could not load the archive.<span>' + esc((e && e.message) || 'no answer') + '</span></div>'; }
    });
  }

  VIEWS.approvedArchive = {
    label: 'Send to listers',
    icon: '<path d="M4 4h16v6H4z"/><path d="M4 14h10v6H4z"/><path d="m16 17 2 2 4-4"/>',
    roles: AA_ROLES,
    order: 16.05,
    badge: function () { return (STATE.counts && STATE.counts.approvedArchive) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Approved — <span class="goldtext">send to listers</span></h1>' +
          '<span class="sub">every approved product, waiting for you to pick a lister and send it · the listing task is created the moment you send</span>' +
          '<button class="minibtn" id="aaRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="aa-tiles enter d1" id="aaTiles"></div>' +
        '<div class="aa-load enter d2" id="aaLoad"></div>' +
        '<div class="aa-tabs enter d2" id="aaTabs"></div>' +
        '<div class="card enter d2"><div class="bd" id="aaBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var r = $('aaRefresh'); if (r) { r.onclick = aaLoad; }
      aaLoad();
    }
  };
})();
