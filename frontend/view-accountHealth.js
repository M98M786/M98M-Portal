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
    '.ah-sync li{list-style:none;padding:5px 0;border-bottom:1px solid var(--gold-line)}'
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
      var pct = ahStr(v.value);
      var frac = (v.numerator != null && v.denominator != null) ? ' (' + v.numerator + ' of ' + v.denominator + ')' : '';
      return pct + '%' + frac;
    }
    return ahStr(v);
  }

  function ahLevelPill(level) {
    var l = ahStr(level);
    var cls = /TOP/.test(l) ? 'top' : /BELOW/.test(l) ? 'bad' : 'mid';
    return '<span class="ah-lvl ' + cls + '">' + esc(l.replace(/_/g, ' ') || '—') + '</span>';
  }

  function ahStandards(rows) {
    if (!rows.length) {
      return '<div class="ah-note">eBay\u2019s seller-standards report arrives with the nightly sync — nothing stored yet.</div>';
    }
    var h = '<div class="ah-stds">';
    rows.forEach(function (r) {
      var p = (r.profiles || [])[0] || {};
      var cyc = p.cycle || {};
      h += '<div class="ah-std-card">' +
        '<div class="ah-std-head"><b>' + esc(ahStr(r.account)) + '</b>' + ahLevelPill(p.standardsLevel) +
          '<span class="ah-std-when">' + esc(ahStr(p.program).replace('PROGRAM_', '')) +
          (cyc.evaluationMonth ? ' · evaluated ' + esc(ahStr(cyc.evaluationMonth)) : '') + '</span></div>';
      var mets = p.metrics || [];
      if (mets.length) {
        h += '<table class="ah-std-tbl"><tbody>';
        mets.forEach(function (m) {
          var below = /BELOW/.test(ahStr(m.level));
          h += '<tr' + (below ? ' class="ah-std-bad"' : '') + '>' +
            '<td>' + esc(ahStr(m.name || m.metricKey)) + '</td>' +
            '<td class="ah-num">' + esc(ahMetricValue(m)) + '</td>' +
            '<td>' + ahLevelPill(m.level) + '</td>' +
            '<td class="ah-std-thr">' + (m.thresholdLowerBound != null ? 'needs ' + esc(String(m.thresholdLowerBound)) : '') + '</td>' +
          '</tr>';
        });
        h += '</tbody></table>';
      }
      h += '</div>';
    });
    return h + '</div>';
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
            hh += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--gold-line)">' +
              '<b style="min-width:110px">' + esc(ahStr(l.account)) + '</b>' +
              '<a href="' + esc(ahStr(l.url)) + '" target="_blank" rel="noopener" class="minibtn">Open consent page ↗</a>' +
              '<input type="text" placeholder="paste the code (or the whole URL)" data-ah-code="' + aAttr + '" style="flex:1;min-width:180px" class="rc-in">' +
              '<button class="minibtn" data-ah-submit="' + aAttr + '">Connect</button></div>';
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
  }

  VIEWS.accountHealth = {
    label: 'Account health',
    order: 8,
    roles: ['Management', 'Ops Head'],
    icon: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    prefetch: function () { return ahFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Account <span class="goldtext">health</span></h1>' +
          '<span class="sub">Live Engine numbers · arrows compare with last night\'s snapshot · sync problems surface here first</span></div>' +
        '<div class="card enter d2"><div class="bd"><div id="ahBody"><div class="spinner"></div></div></div></div>';
    },
    init: function () { ahLoad(); }
  };
})();
