/* Sale events — who qualifies, and the rotation that keeps one running for ever.
 * Owner: "i need a sale event running on my account every time, with at least 50% of the account's
 * active listings in it ... properly schedule every listing". eBay's rules make that a scheduling
 * problem: 14 days at the same price, 14 days out between sales, events of 1-45 days. Two cohorts
 * alternating 14 days solves it exactly — while one runs the other serves its cooldown. */
(function () {
  var GOLD = '#f2b035', LOSS = '#e0563f';
  VIEW_CSS.push([
    '.sv-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.sv-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.sv-note{color:var(--text-2);font-size:12px;line-height:1.55;margin-bottom:10px}',
    '.sv-warn{background:rgba(224,86,63,.1);border:1px solid rgba(224,86,63,.45);border-radius:12px;padding:12px 14px;margin-bottom:14px;color:#ffb3a6;font-size:12.5px;line-height:1.55}',
    '.sv-rules{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
    '.sv-rule{background:rgba(242,176,53,.12);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font-size:11px;color:var(--gold-a);font-weight:700}',
    '.sv-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.sv-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.sv-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text)}',
    '.sv-tbl td.r,.sv-tbl th.r{text-align:right}',
    '.sv-ok{color:var(--gold-a);font-weight:700} .sv-no{color:' + LOSS + ';font-weight:700}',
    '.sv-cal{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}',
    '.sv-slot{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:rgba(255,255,255,.03)}',
    '.sv-slot.a{border-color:var(--gold-b);box-shadow:inset 3px 0 0 var(--gold-b)}',
    '.sv-slot .c{font-size:19px;font-weight:800;color:var(--gold-a)}',
    '.sv-slot .d{font-size:11px;color:var(--text-2);margin-top:3px}',
    '.sv-slot .n{font-size:11px;color:var(--text-3);margin-top:5px}'
  ].join(''));

  var SV = { data: null };

  VIEWS.adtoolSales = {
    label: 'Sale events (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 9h18M7 3v4M17 3v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="m9 14 6-3"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>Sale events</h1>' +
        '<span class="sub">who qualifies today, and the rotation that keeps a sale running for ever</span></div>' +
        '<div id="svBody"><div class="sv-note">Checking every active listing against eBay’s rules…</div></div>';
    },
    init: function () {
      api('adtoolSales', {}).then(function (d) { SV.data = d; draw(); })
        .catch(function (e) { $('svBody').innerHTML = '<div class="sv-panel"><div class="sv-note">' + esc(e && e.message ? e.message : 'could not read') + '</div></div>'; });
    }
  };

  function draw() {
    var D = SV.data, h = '';
    h += '<div class="sv-rules">' + (D.rules || []).map(function (r) { return '<span class="sv-rule">' + esc(r) + '</span>'; }).join('') + '</div>';

    /* the honest health warning comes first, not buried */
    if (!D.clock_is_real) {
      h += '<div class="sv-warn"><b>The qualifying clock is an estimate until ' +
        esc(addDays(D.today, 14 - (D.price_history_days || 0))) + '.</b> eBay counts 14 days at the same <b>price</b>. ' +
        'Nothing was recording price until today, so the only measure available is the last revision of any kind — ' +
        'a title edit counts against a listing exactly as a price cut does. That reading is deliberately pessimistic: it ' +
        'says <b>' + (D.active_total - D.eligible_total) + ' of ' + D.active_total + '</b> listings are blocked. ' +
        'A real price history is being recorded from today (' + (D.price_history_days || 0) + ' of 14 days), and this page ' +
        'switches to it on its own.</div>';
    }

    /* can each account even field half its listings? */
    h += '<div class="sv-panel"><h3>Can each account fill a sale with half its listings?</h3>' +
      '<div class="sv-note">Your rule is at least half the active listings in a running event. This is who qualifies today.</div>' +
      '<table class="sv-tbl"><thead><tr><th>Account</th><th class="r">Active</th><th class="r">Half of them</th>' +
      '<th class="r">Qualify today</th><th class="r">Blocked</th><th>Verdict</th></tr></thead><tbody>' +
      (D.by_account || []).map(function (a) {
        return '<tr><td>' + esc(a.account) + '</td><td class="r">' + a.active + '</td><td class="r">' + a.half + '</td>' +
          '<td class="r ' + (a.meets_half ? 'sv-ok' : 'sv-no') + '">' + a.eligible + '</td>' +
          '<td class="r">' + a.blocked + '</td>' +
          '<td>' + (a.meets_half ? '<span class="sv-ok">can run one now</span>' : '<span class="sv-no">short by ' + (a.half - a.eligible) + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    /* the rotation itself */
    h += '<div class="sv-panel"><h3>The rotation that never stops</h3>' +
      '<div class="sv-note">Split the qualifying listings in two and alternate them every 14 days. While one half is in a sale the ' +
      'other half is serving the 14-day cooldown eBay requires, so there is always an event running and every listing is always ' +
      'either selling at a discount or earning back its eligibility. Cohort A holds <b>' + D.cohorts.a + '</b> listings, B holds <b>' +
      D.cohorts.b + '</b>.</div>' +
      '<div class="sv-cal">' + (D.schedule || []).map(function (s, i) {
        return '<div class="sv-slot' + (i === 0 ? ' a' : '') + '"><div class="c">Cohort ' + esc(s.cohort) + '</div>' +
          '<div class="d">' + esc(s.starts) + ' → ' + esc(s.ends) + '</div>' +
          '<div class="n">' + s.listings + ' listings' + (i === 0 ? ' · start this one' : '') + '</div></div>';
      }).join('') + '</div></div>';

    /* what is actually running right now */
    h += '<div class="sv-panel"><h3>Running on eBay right now</h3>' +
      '<div class="sv-note">' + ((D.running || []).length ? 'eBay reports these sale events live. Where the item count reads zero the event was built ' +
        '<b>by rule</b> rather than by listing, and eBay returns no listing list for those — the tool now records which kind each is, ' +
        'so this column stops being a mystery as the sync comes round.' : 'No markdown sale event is running on any account.') + '</div>' +
      ((D.running || []).length ? '<table class="sv-tbl"><thead><tr><th>Account</th><th>Event</th><th>Discount</th>' +
        '<th class="r">Items</th><th>Chosen by</th><th>Ends</th></tr></thead><tbody>' +
        D.running.map(function (r) {
          return '<tr><td>' + esc(r.account) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.discount || '—') + '</td>' +
            '<td class="r">' + (r.item_n > 0 ? r.item_n : '<span class="sv-no">not returned</span>') + '</td>' +
            '<td>' + esc(r.criterion || 'reading…') + '</td><td>' + esc(r.ends) + '</td></tr>';
        }).join('') + '</tbody></table>' : '') + '</div>';

    /* why the blocked ones are blocked — the actionable half */
    if ((D.blocked_sample || []).length) {
      h += '<div class="sv-panel"><h3>Why listings are blocked — ' + (D.active_total - D.eligible_total) + ' of them</h3>' +
        '<div class="sv-note">Each one names its own clock and when it runs out. Showing ' + D.blocked_sample.length + '.</div>' +
        '<table class="sv-tbl"><thead><tr><th>Item</th><th>Account</th><th class="r">Price</th><th class="r">Days steady</th>' +
        '<th>Measured on</th><th>Why not yet</th></tr></thead><tbody>' +
        D.blocked_sample.map(function (r) {
          return '<tr><td>' + esc(r.item_id) + ' ' + esc(String(r.title || '').slice(0, 34)) + '</td><td>' + esc(r.account) + '</td>' +
            '<td class="r">£' + (Number(r.price) || 0).toFixed(2) + '</td>' +
            '<td class="r">' + (r.steady_days == null ? '—' : r.steady_days) + '</td>' +
            '<td>' + esc(r.basis === 'price' ? 'price history' : 'last revision') + '</td>' +
            '<td class="sv-no">' + esc(r.why) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    h += '<div class="sv-note">' + esc(D.source) + ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC</div>';
    $('svBody').innerHTML = h;
  }

  function addDays(ymd, n) {
    var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.max(0, n));
    return d.toISOString().slice(0, 10);
  }
})();
