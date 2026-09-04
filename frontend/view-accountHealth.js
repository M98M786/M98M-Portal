/* view-accountHealth.js — V2 Phase C (§9-C "account health, own menu"): one row per selling
 * account with the numbers Management actually checks — live from the Engine, with the nightly
 * snapshot trend behind each figure. Server-gated to Management/Ops (account totals live here). */
(function () {

  VIEW_CSS.push(
    '.ah-stds{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-bottom:18px}' +
    '.ah-std-card{border:1px solid var(--gold-line);border-radius:12px;padding:14px;background:var(--panel-2)}' +
    '.ah-std-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
    '.ah-std-head b{font-size:14px}' +
    '.ah-std-when{margin-left:auto;font-size:10.5px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em}' +
    '.ah-lvl{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 9px;border-radius:99px}' +
    '.ah-lvl.top{background:var(--gold-soft,rgba(246,208,107,.15));color:var(--gold-a)}' +
    '.ah-lvl.mid{background:var(--panel);color:var(--text-2);border:1px solid var(--gold-line)}' +
    '.ah-lvl.bad{background:var(--bad-soft,rgba(255,80,80,.12));color:var(--bad)}' +
    '.ah-std-tbl{width:100%;border-collapse:collapse;font-size:12px}' +
    '.ah-std-tbl td{padding:5px 8px;border-bottom:1px solid var(--gold-line)}' +
    '.ah-std-tbl tr:last-child td{border-bottom:none}' +
    '.ah-std-thr{color:var(--text-3);font-size:10.5px;text-align:right}' +
    '.ah-std-bad td{color:var(--bad)}' +
    '.ah-note{color:var(--text-3);font-weight:600;font-size:12.5px;margin-bottom:14px}' +
    '.ah-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px}' +
    '.ah-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ah-tbl td{padding:9px 12px;border-bottom:1px solid var(--gold-line)}' +
    '.ah-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.ah-num{font-variant-numeric:tabular-nums;font-weight:700}' +
    '.ah-delta{font-size:10.5px;margin-left:6px;font-weight:800}' +
    '.ah-up{color:var(--ok)}.ah-down{color:var(--bad)}' +
    '.ah-err{font-size:12px;color:var(--bad);font-weight:700}' +
    '.ah-ok{font-size:12px;color:var(--ok);font-weight:700}' +
    '.ah-sync{margin-top:14px;font-size:12px}' +
    '.ah-sync li{list-style:none;padding:5px 0;border-bottom:1px solid var(--gold-line)}' +
    '.ah-ov{margin:6px 0 22px}' +
    '.ah-ov-wins{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}' +
    '.ah-ov-wins button{font:inherit;font-size:11.5px;font-weight:800;padding:6px 13px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-2);cursor:pointer}' +
    '.ah-ov-wins button.on{background:var(--blue);border-color:var(--blue);color:#fff}' +
    '.ah-cat-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));margin-bottom:16px}' +
    '.ah-cat{border:1px solid var(--gold-line);border-radius:12px;padding:14px;background:var(--panel-2)}' +
    '.ah-cat.risk{border-color:var(--bad)}' +
    '.ah-cat .k{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800}' +
    '.ah-cat .v{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:2px}' +
    '.ah-cat.risk .v{color:var(--bad)}' +
    '.ah-cat .chint{font-size:11px;color:var(--text-3);font-weight:600;margin-top:2px;min-height:28px}' +
    '.ah-cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;margin-top:10px;padding-top:9px;border-top:1px solid var(--gold-line)}' +
    '.ah-cat-grid div{font-size:11px;color:var(--text-3);font-weight:600;font-variant-numeric:tabular-nums}' +
    '.ah-cat-grid b{color:var(--text-2);font-weight:800}' +
    '.ah-cat-grid .on2,.ah-cat-grid .on2 b{color:var(--blue)}'
  );

  function ahStr(v) { return String(v == null ? '' : v).trim(); }
  function ahGBP(v) { var n = Number(v); return isFinite(n) ? '£' + n.toFixed(2) : '—'; }
  function ahDelta(nowV, prevV) {
    if (prevV == null) { return ''; }
    var d = (Number(nowV) || 0) - (Number(prevV) || 0);
    if (!d) { return ''; }
    return '<span class="ah-delta ' + (d > 0 ? 'ah-up' : 'ah-down') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(Math.round(d * 100) / 100) + '</span>';
  }

  function ahFetch() {
    return api('accountHealth', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('accountHealth', {}, d); }
      return d;
    });
  }

  /* One metric value, in eBay's own shapes: booleans, plain numbers, and rate objects
     ({value, numerator, denominator}) all occur in seller_standards_profile. */
  function ahMetricValue(m) {
    var v = m && m.value;
    if (v === true) { return '✓'; }
    if (v === false) { return '✗'; }
    if (v !== null && typeof v === 'object') {
      /* eBay ships two object shapes here: RATE carries numerator/denominator and means percent;
         AMOUNT carries currencyCodeEnum and means money. Treating every object as a rate printed
         the fleet's annual sales amount as '41976.84%'. */
      if (v.currencyCodeEnum || v.currency) {
        return ahStr(v.value) + ' ' + ahStr(v.currencyCodeEnum || v.currency);
      }
      if (v.numerator != null && v.denominator != null) {
        return ahStr(v.value) + '% (' + v.numerator + ' of ' + v.denominator + ')';
      }
      return ahStr(v.value);
    }
    return ahStr(v);
  }

  /* Thresholds arrive as plain numbers OR as {value:...} objects (AMOUNT/RATE metrics) — the
     bare String() rendered the latter as 'needs [object Object]'. RATE requirements are usually
     an UPPER bound, so that side is the fallback. */
  function ahThreshold(m) {
    var thr = m && m.thresholdLowerBound;
    if (thr == null) { thr = m && m.thresholdUpperBound; }
    if (thr !== null && typeof thr === 'object') { thr = thr.value; }
    return thr != null && thr !== '' ? 'needs ' + ahStr(thr) : '';
  }

  function ahLevelPill(level) {
    var l = ahStr(level);
    var cls = /TOP/.test(l) ? 'top' : /BELOW/.test(l) ? 'bad' : 'mid';
    return '<span class="ah-lvl ' + cls + '">' + esc(l.replace(/_/g, ' ') || '—') + '</span>';
  }

  /* relative "synced … ago" from a UTC 'YYYY-MM-DD HH:MM:SS' stamp */
  function ahAgo(s) {
    var t = Date.parse(String(s || '').replace(' ', 'T') + 'Z');
    if (!isFinite(t)) { return ahStr(s).slice(0, 16); }
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) { return 'just now'; }
    if (m < 60) { return m + ' min ago'; }
    var hr = Math.round(m / 60);
    if (hr < 24) { return hr + 'h ago'; }
    return Math.round(hr / 24) + 'd ago';
  }

  function ahStandards(rows) {
    if (!rows.length) {
      return '<div class="ah-note">eBay\u2019s seller-standards report arrives with the nightly sync — nothing stored yet.</div>';
    }
    var h = '<div class="ah-stds">';
    rows.forEach(function (r) {
      /* 4 Sept (owner): show eBay's FRESHER cycle. eBay returns a CURRENT (last monthly
         evaluation) and a PROJECTED (the running estimate for the next one, updated ~daily) —
         prefer PROJECTED, else the latest evaluationDate, else the first. */
      var profs = r.profiles || [];
      var p = profs.filter(function (x) { return String((x.cycle || {}).cycleType || '').toUpperCase() === 'PROJECTED'; })[0]
        || profs.slice().sort(function (a, b) { return String((b.cycle || {}).evaluationDate || '').localeCompare(String((a.cycle || {}).evaluationDate || '')); })[0]
        || {};
      var cyc = p.cycle || {};
      var live = String(cyc.cycleType || '').toUpperCase() === 'PROJECTED';
      var cycMonth = ahStr(cyc.evaluationMonth);
      var cycTxt = live ? ('current period' + (cycMonth ? ' · ' + cycMonth : '') + ' · live')
        : (cycMonth ? ('evaluated ' + cycMonth) : '');
      h += '<div class="ah-std-card">' +
        '<div class="ah-std-head"><b>' + esc(ahStr(r.account)) + '</b>' + ahLevelPill(p.standardsLevel) +
          '<span class="ah-std-when">' + esc(ahStr(p.program).replace('PROGRAM_', '')) +
          (cycTxt ? ' · ' + esc(cycTxt) : '') +
          (r.synced_at ? ' · synced ' + esc(ahAgo(r.synced_at)) : '') + '</span></div>';
      var mets = p.metrics || [];
      if (mets.length) {
        h += '<table class="ah-std-tbl"><tbody>';
        mets.forEach(function (m) {
          var below = /BELOW/.test(ahStr(m.level));
          h += '<tr' + (below ? ' class="ah-std-bad"' : '') + '>' +
            '<td>' + esc(ahStr(m.name || m.metricKey)) + '</td>' +
            '<td class="ah-num">' + esc(ahMetricValue(m)) + '</td>' +
            '<td>' + ahLevelPill(m.level) + '</td>' +
            '<td class="ah-std-thr">' + esc(ahThreshold(m)) + '</td>' +
          '</tr>';
        });
        h += '</tbody></table>';
      }
      h += '</div>';
    });
    return h + '</div>';
  }

  /* Hasib item 13: the Seller Hub service-metrics panel — your INAD / INR rate against eBay's
     peer benchmark, per account, per evaluation row (eBay grades INAD per listing category and
     INR per shipping region — exactly the rows his screenshot shows). Red only when eBay's own
     rating says HIGH or VERY HIGH; lower is better throughout. */
  function ahServiceMetrics(rows) {
    if (!rows.length) {
      return '<div class="ah-note">eBay’s service metrics (item not as described / item not received, you vs peers) arrive with the nightly sync. Accounts without the analytics scope stay absent.</div>';
    }
    var names = { ITEM_NOT_AS_DESCRIBED: 'Item not as described', ITEM_NOT_RECEIVED: 'Item not received' };
    var by = {};
    rows.forEach(function (r) { (by[r.account] = by[r.account] || []).push(r); });
    var h = '<h3 style="margin:14px 0 6px;font-size:13px">Service metrics vs peers <span style="color:var(--text-3);font-weight:600">(eBay’s own evaluation — lower is better)</span></h3><div class="ah-stds">';
    Object.keys(by).sort().forEach(function (acc) {
      h += '<div class="ah-std-card"><div class="ah-std-head"><b>' + esc(acc) + '</b>' +
        '<span class="ah-std-when">' + esc(ahStr((by[acc][0] || {}).synced_at).slice(0, 10)) + '</span></div>' +
        '<table class="ah-std-tbl"><tbody>';
      by[acc].forEach(function (m) {
        var label = names[m.metric_type] || m.metric_type;
        (m.dims || []).forEach(function (d) {
          var have = d.you != null;
          var bad = /^(HIGH|VERY_HIGH)$/.test(ahStr(d.rating));
          var verdict = !have ? '' :
            bad ? '<span class="ah-lvl bad">' + esc(ahStr(d.rating).replace(/_/g, ' ')) + '</span>' :
            /NOT_APPLICABLE/.test(ahStr(d.rating)) || !ahStr(d.rating) ? '<span class="ah-std-thr">too few to grade</span>' :
            '<span class="ah-lvl top">' + esc(ahStr(d.rating).replace(/_/g, ' ')) + '</span>';
          /* R8-4: current AND projected, side by side — the projection holds today's defect
             count and adds the sales this account really runs at, so it shows where the rate
             lands if nothing new goes wrong. Absent when eBay gave no count/transactions. */
          var pj = d.projected;
          var better = pj && have && Number(pj.rate) < Number(d.you);
          h += '<tr' + (bad ? ' class="ah-std-bad"' : '') + '>' +
            '<td>' + esc(label) + (d.dim ? ' · ' + esc(String(d.dim)) : '') + '</td>' +
            '<td class="ah-num">' + (have ? Number(d.you).toFixed(2) + '%' : '—') +
              (pj ? '<span class="ah-std-thr" style="display:block;font-weight:700;color:' + (better ? 'var(--ok)' : 'var(--text-3)') + '">' +
                '→ ' + Number(pj.rate).toFixed(2) + '% projected</span>' : '') + '</td>' +
            '<td class="ah-std-thr">peers ' + (d.peer != null ? Number(d.peer).toFixed(2) + '%' : '—') +
              (d.count != null ? ' · ' + d.count + ' case(s)' : '') +
              (d.transactions != null ? ' · ' + d.transactions + ' transactions' : '') +
              (pj ? '<span style="display:block">projection adds ' + pj.added_transactions + ' clean sales (30 days at today’s rate)</span>' : '') + '</td>' +
            '<td>' + verdict + '</td></tr>';
        });
      });
      h += '</tbody></table></div>';
    });
    return h + '</div>';
  }

  /* 4 Sept (owner): the service-metrics OVERVIEW — the case scoreboard behind eBay's grade, said
     in plain words. Four kinds of case (return requests, disputes & claims, item not received,
     not-as-described) across four windows (30 days / 90 days / this month / last month): a fleet
     headline up top and a per-account table below. ONE 'serviceCases' read carries all four
     windows, so the window chips switch instantly with no refetch. INAD (not-as-described) is the
     seller-fault slice of returns — the part that actually moves the service-metric rating — so it
     rides its own red tile even though it is also counted inside returns. */
  var AH_SC = null;
  var AH_WIN = 'd30';
  var AH_WINS = [['d30', 'Last 30 days'], ['d90', 'Last 90 days'], ['tm', 'This month'], ['lm', 'Last month']];
  var AH_CATS = [
    ['returns', 'Return requests', 'buyers asking to send something back', 0],
    ['disputes', 'Disputes & claims', 'cases and payment disputes opened against you', 0],
    ['inr', 'Item not received', 'buyer says the parcel never arrived', 0],
    ['inad', 'Not as described', 'damaged, faulty or wrong — this is the part that hurts your rating', 1]
  ];
  function ahWinLabel(k) { for (var i = 0; i < AH_WINS.length; i++) { if (AH_WINS[i][0] === k) { return AH_WINS[i][1]; } } return k; }
  function ahCasesOverview() {
    var sc = AH_SC;
    if (!sc) { return '<div class="ah-note">Service-metric case counts did not load.</div>'; }
    var tot = sc.total || {};
    var winSel = '<div class="ah-ov-wins">' + AH_WINS.map(function (w) {
      return '<button data-ah-win="' + w[0] + '"' + (w[0] === AH_WIN ? ' class="on"' : '') + '>' + esc(w[1]) + '</button>';
    }).join('') + '</div>';
    var tiles = '<div class="ah-cat-tiles">' + AH_CATS.map(function (c) {
      var key = c[0], active = (tot[AH_WIN] || {})[key] || 0;
      var grid = AH_WINS.map(function (w) {
        var lbl = w[1].replace('Last ', '').replace('This month', 'this month');
        return '<div' + (w[0] === AH_WIN ? ' class="on2"' : '') + '>' + esc(lbl) + ' <b>' + (((tot[w[0]] || {})[key]) || 0) + '</b></div>';
      }).join('');
      return '<div class="ah-cat' + (c[3] ? ' risk' : '') + '"><div class="k">' + esc(c[1]) + '</div>' +
        '<div class="v">' + active + '</div>' +
        '<div class="chint">' + esc(c[2]) + '</div>' +
        '<div class="ah-cat-grid">' + grid + '</div></div>';
    }).join('') + '</div>';
    var byA = sc.by_account || {};
    var rows = Object.keys(byA).sort().map(function (a) {
      var w = (byA[a] || {})[AH_WIN] || {};
      return '<tr><td style="font-weight:700">' + esc(a) + '</td>' +
        '<td class="ah-num">' + (w.returns || 0) + '</td>' +
        '<td class="ah-num">' + (w.disputes || 0) + '</td>' +
        '<td class="ah-num">' + (w.inr || 0) + '</td>' +
        '<td class="ah-num' + ((w.inad || 0) > 0 ? ' ah-err' : '') + '">' + (w.inad || 0) + '</td>' +
        '<td class="ah-num">' + (w.total || 0) + '</td></tr>';
    }).join('');
    var tw = tot[AH_WIN] || {};
    var table = '<div class="scroll"><table class="ah-tbl" style="min-width:560px"><thead><tr>' +
      '<th>Account</th><th>Return requests</th><th>Disputes</th><th>Not received</th><th>Not as described</th><th>All cases</th></tr></thead><tbody>' +
      rows +
      '<tr style="border-top:2px solid var(--gold-line)"><td style="font-weight:800">All accounts</td>' +
      '<td class="ah-num" style="font-weight:800">' + (tw.returns || 0) + '</td>' +
      '<td class="ah-num" style="font-weight:800">' + (tw.disputes || 0) + '</td>' +
      '<td class="ah-num" style="font-weight:800">' + (tw.inr || 0) + '</td>' +
      '<td class="ah-num' + ((tw.inad || 0) > 0 ? ' ah-err' : '') + '" style="font-weight:800">' + (tw.inad || 0) + '</td>' +
      '<td class="ah-num" style="font-weight:800">' + (tw.total || 0) + '</td></tr>' +
      '</tbody></table></div>';
    return '<h3 style="margin:2px 0 4px;font-size:13px">Service metrics — overview ' +
        '<span style="color:var(--text-3);font-weight:600">(' + esc(ahWinLabel(AH_WIN)) + ' · every case behind eBay’s grade)</span></h3>' +
      winSel + tiles + table;
  }
  function ahFillCases() {
    var box = $('ahCasesBox');
    if (!box) { return; }
    box.innerHTML = AH_SC ? ahCasesOverview()
      : '<div class="ah-note">Service-metric case counts are loading…</div>';
  }

  function ahPaint(d) {
    var box = $('ahBody');
    if (!box) { return; }
    var now = (d && d.now) || [];
    // "last night" must exclude today: a daytime forced rollup writes today's snapshot, and
    // comparing live numbers against a minutes-old copy of themselves reads as "no change".
    var todayUk = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
    var prev = {};
    ((d && d.trend) || []).forEach(function (t) {
      if (String(t.day) < todayUk && !(t.account in prev)) { prev[t.account] = t; }
    });

    /* eBay's own verdict first — this is THE account health report: the standards level eBay
       grades each shop at, and every metric behind it with eBay's own thresholds. Everything
       below it is the portal's operational picture; this section is eBay speaking. */
    var h = ahStandards((d && d.standards) || []);
    /* the service-metrics OVERVIEW (case scoreboard) fills in from its own 'serviceCases' read —
       an empty box here so the section keeps its place whichever feed lands first */
    h += '<div id="ahCasesBox" class="ah-ov"><div class="ah-note">Service-metric case counts are loading…</div></div>';
    h += ahServiceMetrics((d && d.metrics) || []);

    h += '<div class="scroll"><table class="ah-tbl"><thead><tr>' +
      '<th>Account</th><th>Active listings</th><th>Orders 7d</th><th>Revenue 7d</th><th>Loss items</th><th>Campaigns</th></tr></thead><tbody>';
    now.forEach(function (r) {
      var p = prev[r.account] || null;
      var pj = {};
      try { pj = p && p.json ? JSON.parse(p.json) : {}; } catch (e) { pj = {}; }
      h += '<tr><td style="font-weight:700">' + esc(ahStr(r.account)) + '</td>' +
        '<td class="ah-num">' + (Number(r.listings) || 0) + ahDelta(r.listings, p && p.listings) + '</td>' +
        '<td class="ah-num">' + (Number(r.orders_7d) || 0) + ahDelta(r.orders_7d, p && p.orders_7d) + '</td>' +
        '<td class="ah-num">' + ahGBP(r.revenue_7d) + ahDelta(r.revenue_7d, p && p.revenue_7d) + '</td>' +
        '<td class="ah-num' + (Number(r.loss_items) > 0 ? ' ah-err' : '') + '">' + (Number(r.loss_items) || 0) + '</td>' +
        '<td class="ah-num">' + (Number(r.campaigns_running) || 0) + ' / ' + (Number(r.campaigns_total) || 0) +
          ((pj.campaigns_running != null) ? ahDelta(r.campaigns_running, pj.campaigns_running) : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';

    /* 'adsEnrolment' rows are a STATE, not a failure — eBay simply refuses the campaign list
     * for a seller who is not in Promoted Listings. Never paint those red. */
    var all = (d && d.sync) || [];
    var notes = all.filter(function (s) { return ahStr(s.job) === 'adsEnrolment'; });
    var bad = all.filter(function (s) { return ahStr(s.job) !== 'adsEnrolment' && ahStr(s.last_error); });
    h += '<div class="ah-sync"><h3 style="margin:0 0 6px;font-size:13px">Engine sync</h3><ul style="margin:0;padding:0">';
    if (!bad.length) {
      h += '<li class="ah-ok">✓ Every sync job is green.</li>';
    }
    bad.forEach(function (s) {
      h += '<li><span class="ah-err">' + esc(ahStr(s.job)) + (ahStr(s.account) ? ' · ' + esc(ahStr(s.account)) : '') + '</span> — ' + esc(ahStr(s.last_error)) + '</li>';
    });
    notes.forEach(function (s) {
      h += '<li><span style="color:var(--warn);font-weight:800">' + esc(ahStr(s.account)) + '</span> — ' + esc(ahStr(s.last_error)) +
        '<span style="display:block;color:var(--text-3);font-weight:600;font-size:11.5px">Its orders, listings and CS keep syncing normally. Enrol that shop in Promoted Listings and campaign watching starts on the next tick.</span></li>';
    });
    h += '</ul></div>';

    /* Self-service re-consent (extended scopes: campaigns, standards, fees). One click per
     * account, done from here — no build session needed. */
    h += '<div class="ah-sync"><h3 style="margin:14px 0 6px;font-size:13px">eBay connections</h3>' +
      '<p style="font-size:11.5px;color:var(--text-3);font-weight:600;margin:0 0 8px">A one-time re-consent per account unlocks campaign watching (ABRT, Hafiza), standards and real fees for everyone. Nothing existing breaks — the sheet automations keep their own keys.</p>' +
      '<button class="minibtn" id="ahConsent">Get the consent links</button><div id="ahConsentBox" style="margin-top:8px"></div></div>';
    box.innerHTML = h;
    ahFillCases();

    var cb = $('ahConsent');
    if (cb) {
      cb.onclick = function () {
        cb.disabled = true;
        api('ebayConsentLinks', {}).then(function (r) {
          cb.disabled = false;
          var host = $('ahConsentBox');
          if (!host) { return; }
          var hh = '<p style="font-size:11.5px;color:var(--text-3);font-weight:600">' + esc(ahStr(r && r.note)) + '</p>';
          ((r && r.links) || []).forEach(function (l) {
            var aAttr = esc(ahStr(l.account)).replace(/"/g, '&quot;');
            var isNew = !l.connected;
            hh += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--gold-line)">' +
              '<b style="min-width:110px">' + esc(ahStr(l.account)) +
                (isNew ? '<span style="display:block;color:var(--warn);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em">not connected yet</span>'
                       : '<span style="display:block;color:var(--ok);font-size:10px;font-weight:700">connected · re-consent</span>') + '</b>' +
              '<a href="' + esc(ahStr(l.url)) + '" target="_blank" rel="noopener" class="minibtn"' + (isNew ? ' style="border-color:rgba(255,159,67,.55);color:var(--warn)"' : '') + '>Open consent page ↗</a>' +
              '<input type="text" placeholder="paste the code (or the whole URL)" data-ah-code="' + aAttr + '" style="flex:1;min-width:180px" class="rc-in">' +
              '<button class="minibtn" data-ah-submit="' + aAttr + '">' + (isNew ? 'Connect account' : 'Connect') + '</button></div>';
          });
          host.innerHTML = hh;
          host.onclick = function (ev) {
            var b = ev.target && ev.target.closest ? ev.target.closest('[data-ah-submit]') : null;
            if (!b) { return; }
            var acct = b.getAttribute('data-ah-submit');
            // row-scoped lookup: the input lives in the same row div — no selector-escaping games
            var rowEl = b.parentElement;
            var inp = rowEl ? rowEl.querySelector('input[data-ah-code]') : null;
            if (!inp || !inp.value.trim()) { toast('Paste the code first.'); return; }
            b.disabled = true;
            api('ebaySubmitConsent', { account: acct, code: inp.value }).then(function (res) {
              // mark THIS row done in place — a full repaint would wipe codes pasted for the others
              if (rowEl) { rowEl.innerHTML = '<b style="min-width:110px">' + esc(acct) + '</b><span style="color:var(--ok);font-weight:800;font-size:12px">connected ✓ · ' + esc(ahStr(res && res.marketing)) + ' · token ~' + esc(String((res && res.expires_days) || '?')) + ' days</span>'; }
              toast(acct + ' connected.');
            }).catch(function (e) {
              b.disabled = false;
              toast(e.message || 'eBay did not accept that code.');
            });
          };
        }).catch(function (e) {
          cb.disabled = false;
          toast(e.message || 'Could not fetch the links.');
        });
      };
    }
  }

  function ahLoad() {
    var box = $('ahBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('accountHealth', {}) : null;
    if (had) { try { ahPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    ahFetch().then(ahPaint).catch(function (e) {
      if (had) { toast('Showing the last health picture — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load account health.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
    /* the case scoreboard rides its own feed — all four windows in one read, so it never blocks
       the main health picture and the window chips need no further server calls */
    var scHad = (typeof cacheRead === 'function') ? cacheRead('serviceCases', {}) : null;
    if (scHad) { AH_SC = scHad; }
    api('serviceCases', {}).then(function (sc) {
      AH_SC = sc || null;
      if (typeof cacheWrite === 'function') { cacheWrite('serviceCases', {}, sc); }
      ahFillCases();
    }).catch(function () { ahFillCases(); });
  }

  VIEWS.accountHealth = {
    label: 'Account health',
    order: 8,
    roles: ['Management', 'Ops Head'],
    icon: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    prefetch: function () { return ahFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">health</span></h1>' +
          '<span class="sub">Live Engine numbers · arrows compare with last night\'s snapshot · sync problems surface here first</span>' +
          '<button class="minibtn" id="ahSelfTest" style="margin-left:auto">Run validation</button></div>' +
        '<div id="ahSelfTestOut"></div>' +
        '<div class="card enter d2"><div class="bd"><div id="ahBody"><div class="spinner"></div></div></div></div>' +
        /* Engine ops — the runJobNow lever with a face. Every button fires the same job the
           cron runs on its own; the '@lock' lease server-side stops a press racing a real tick.
           Management-only: a module-granted viewer (R5: Husnain) reads health but gets no levers
           — the server refuses runJobNow below management anyway; not drawing them is honest. */
        (!(STATE.user && (['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0 || STATE.user.super)) ? '' :
        '<div class="card enter d3" style="margin-top:14px"><div class="hd">Engine ops' +
          '<span class="hint">run any Engine job now — same jobs the clock runs, useful after a repair or when a number looks stale</span></div>' +
          '<div class="bd"><div id="ahOpsBtns" style="display:flex;flex-wrap:wrap;gap:8px">' +
          [['rollups', 'Re-roll books · 8 days'], ['rollupsWide', 'Re-roll books · 45 days'],
           ['orderSync', 'Pull latest orders'], ['statusRefresh', 'Refresh order statuses'],
           ['adsIntraday', 'Pull today’s ad spend'], ['adsReportKick', 'Request eBay ad reports'],
           ['trafficSync', 'Pull traffic report'], ['csSync', 'Pull cases & returns'],
           ['listingSync', 'Pull listings'], ['selfTestJob', 'Validation + letters'],
           ['nightlyCatchup', 'Heal missed nightly jobs'], ['backup', 'Backup now'],
           ['marketingSync', 'Pull sale events'], ['feedbackSync', 'Pull feedback'],
           ['securitySweep', 'Security sweep now']
          ].map(function (j) {
            return '<button class="minibtn" data-ah-job="' + j[0] + '">' + j[1] + '</button>';
          }).join('') +
          '</div><div id="ahOpsOut" style="margin-top:10px"></div></div></div>');
    },
    init: function () {
      ahLoad();
      /* window chips on the service-metrics overview — one delegated listener on the stable body,
         so it survives every repaint; switching a window is pure client render (data's already in) */
      var ahb = $('ahBody');
      if (ahb) {
        ahb.addEventListener('click', function (ev) {
          var w = ev.target && ev.target.closest ? ev.target.closest('[data-ah-win]') : null;
          if (!w) { return; }
          AH_WIN = w.getAttribute('data-ah-win');
          ahFillCases();
        });
      }
      var ops = $('ahOpsBtns');
      if (ops) {
        ops.onclick = function (ev) {
          var b = ev.target && ev.target.closest ? ev.target.closest('[data-ah-job]') : null;
          if (!b || b.disabled) { return; }
          var job = b.getAttribute('data-ah-job'), label = b.textContent;
          var out = $('ahOpsOut');
          b.disabled = true; b.textContent = 'Running…';
          out.innerHTML = '<div class="tl-row"><span class="k">⏳ ' + esc(label) + '</span><span style="color:var(--text-3);font-weight:600">the Engine is running it now — long jobs can take a minute or two</span></div>';
          api('runJobNow', { job: job }).then(function (d) {
            var h = '';
            ((d && d.state) || []).forEach(function (s) {
              if (String(s.account) === '@lock') { return; }
              h += '<div class="tl-row"><span class="k">' + (s.last_error ? '🔴' : '✅') + ' ' + esc(String(d.ran || job)) + (s.account ? ' · ' + esc(String(s.account)) : '') + '</span>' +
                '<span style="color:var(--text-3);font-weight:600">' + (s.last_error ? esc(String(s.last_error)) : 'done ' + esc(String(s.last_ok || '')) + ' UTC') + '</span></div>';
            });
            out.innerHTML = h || '<div class="tl-row"><span class="k">✅ ' + esc(job) + '</span><span style="color:var(--text-3);font-weight:600">ran</span></div>';
            b.disabled = false; b.textContent = label;
          }).catch(function (e) {
            out.innerHTML = '<div class="tl-row"><span class="k">🔴 ' + esc(job) + '</span><span style="color:var(--bad);font-weight:700">' + esc(e.message || 'failed') + '</span></div>';
            b.disabled = false; b.textContent = label;
          });
        };
      }
      /* The night list's validation setup, one press: every calculation invariant answers. The
         same battery runs nightly on its own and files a letter for every failure. */
      var st = $('ahSelfTest');
      if (st) {
        st.onclick = function () {
          var out = $('ahSelfTestOut');
          out.innerHTML = '<div class="card enter d1" style="margin-bottom:14px"><div class="bd"><div class="spinner"></div></div></div>';
          api('selfTest', {}).then(function (d) {
            var rows = (d && d.results) || [];
            var h = '<div class="card enter d1" style="margin-bottom:14px"><div class="hd">Validation — ' +
              ((d.failed || 0) === 0 ? '<span style="color:var(--ok)">all ' + rows.length + ' checks pass</span>' : '<span style="color:var(--bad)">' + d.failed + ' of ' + rows.length + ' checks FAILED</span>') +
              '<span class="hint">runs nightly on its own — failures land as letters in the Alerts centre</span></div><div class="bd">';
            rows.forEach(function (r) {
              h += '<div class="tl-row"><span class="k">' + (r.pass ? '✅' : '🔴') + ' ' + esc(String(r.check)) + '</span><span style="color:var(--text-3);font-weight:600">' + esc(String(r.detail)) + '</span></div>';
            });
            out.innerHTML = h + '</div></div>';
          }).catch(function (e) {
            out.innerHTML = '<div class="card enter d1" style="margin-bottom:14px"><div class="bd" style="color:var(--bad);font-weight:700">Validation could not run: ' + esc(e.message) + '</div></div>';
          });
        };
      }
    }
  };
})();
