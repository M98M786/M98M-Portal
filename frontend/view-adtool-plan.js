/* War room — the page that says what to do today.
 * (spec §7 in spirit, owner 19 Sep: "i need exactly what strategy required for what time, what
 * actions needs to be taken on which listing ... you are just presenting data and doing no data
 * analysis".) Every other page reports. This one decides, and shows the arithmetic it decided on.
 * 27 Sep (owner's big-update brief, Phase 1A): the curve, "Running now / Best it can be / At 6× /
 * Difference / What each target costs / Which day to change" are gone — they stood on est. ad profit,
 * which overstated every account by half or more. Until Phase 2 rebuilds the frontier this page is
 * an honest hero (spend, attributed sales, ROAS over the stated window), the cut list, the push list
 * and the budget panel. Profit appears only per item, under the Sales Analysis law.
 * Galaxy tokens, gold the only accent, #e0563f for a loss. */
(function () {
  var LOSS = '#e0563f';

  VIEW_CSS.push([
    '.wr-hero{background:linear-gradient(180deg,rgba(242,176,53,.16),rgba(242,176,53,.04));border:1px solid var(--gold-line);border-radius:14px;padding:18px 20px;margin-bottom:14px}',
    '.wr-hero h2{margin:0 0 6px;font-size:20px;font-weight:800;color:var(--gold-a)}',
    '.wr-hero .wr-sub{color:var(--text-2);font-size:13px;line-height:1.55}',
    '.wr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:10px;margin:14px 0}',
    '.wr-k{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px}',
    '.wr-k .l{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);font-weight:700}',
    '.wr-k .v{font-size:23px;font-weight:800;margin-top:3px;color:var(--text)}',
    '.wr-k .v.pos{color:var(--gold-a)} .wr-k .v.neg{color:' + LOSS + '}',
    '.wr-k .s{font-size:11px;color:var(--text-2);margin-top:2px}',
    '.wr-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.wr-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.wr-panel .wr-note{color:var(--text-2);font-size:12px;margin-bottom:10px;line-height:1.5}',
    '.wr-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.wr-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.wr-tbl td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.wr-tbl td.r,.wr-tbl th.r{text-align:right}',
    '.wr-tbl tr.pick td{background:rgba(242,176,53,.1)}',
    '.wr-tbl tr.pick td:first-child{box-shadow:inset 3px 0 0 var(--gold-b)}',
    '.wr-neg{color:' + LOSS + ';font-weight:700} .wr-pos{color:var(--gold-a);font-weight:700}',
    '.wr-tag{display:inline-block;font-size:9px;letter-spacing:.07em;text-transform:uppercase;font-weight:800;padding:2px 7px;border-radius:99px;margin-left:6px}',
    '.wr-tag.cut{background:rgba(224,86,63,.18);color:#ffb3a6}',
    '.wr-tag.push{background:rgba(242,176,53,.2);color:var(--gold-a)}',
    '.wr-tag.keep{background:rgba(255,255,255,.08);color:var(--text-2)}',
    '.wr-scroll{overflow-x:auto}',
    '.wr-empty{color:var(--text-3);font-size:12px;padding:10px 0}',
    '.wr-src{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-left:8px;border-bottom:1px dotted var(--gold-line);cursor:pointer}'
  ].join(''));

  var WR = { data: null, account: '' };

  function gbp(n) { if (n == null || n === '' || isNaN(Number(n))) return '—'; var v = Number(n); return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function gbp0(n) { if (n == null || n === '' || isNaN(Number(n))) return '—'; var v = Number(n); return (v < 0 ? '−£' : '£') + Math.round(Math.abs(v)); }
  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function roasTxt(v) { v = num(v); return v == null ? '—' : v.toFixed(2) + '×'; }

  VIEWS.adtoolPlan = {
    label: 'War room (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 3v18h18"/><path d="m7 14 4-5 4 3 5-8"/><circle cx="11" cy="9" r="1.6"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>War room</h1>' +
        '<span class="sub">what to change today, and the arithmetic it is based on</span></div>' +
        '<div id="wrBody"><div class="wr-empty">Reading the last 30 report days…</div></div>';
    },
    init: function () {
      api('adtoolPlan', WR.account ? { account: WR.account } : {}).then(function (d) {
        WR.data = d; draw();
      }).catch(function (e) {
        $('wrBody').innerHTML = '<div class="wr-panel"><div class="wr-note">' +
          esc(e && e.message ? e.message : 'the war room could not be read') + '</div></div>';
      });
    }
  };

  /* The window the whole page stands on. The engine names it; the page never assumes 30. */
  function windowText(D) {
    var w = D.window || {};
    var days = num(w.days);
    return 'last ' + (days != null ? days : 30) + ' days to yesterday' + (w.from && w.to ? ' (' + esc(w.from) + ' → ' + esc(w.to) + ')' : '');
  }
  function windowDays(D) { var d = num(D.window && D.window.days); return d && d > 0 ? d : 30; }

  /* Item profit under the law. Reads only the contract keys, with the d30/d7 pair when the engine
     sends it and the plain figure otherwise; never a key from the estimated-profit era. */
  function lawD30(r) { return r.actual_profit_d30 !== undefined ? num(r.actual_profit_d30) : num(r.actual_profit); }
  function lawD7(r) { return r.actual_profit_d7 !== undefined ? num(r.actual_profit_d7) : null; }
  function hasD7(rows) { return rows.some(function (r) { return r && r.actual_profit_d7 !== undefined; }); }
  function hasStage(rows) { return rows.some(function (r) { return r && r.stage; }); }
  function perDay(r, key, days) {
    if (r[key + '_day'] !== undefined) return num(r[key + '_day']);
    var v = num(r[key]); return v == null ? null : Math.round(v / days * 100) / 100;
  }
  function ownRoas(r) {
    if (r.roas != null && r.roas !== '') return num(r.roas);
    var s = num(r.spend), v = num(r.rev != null ? r.rev : r.attr_revenue);
    return s && s > 0 && v != null ? Math.round(v / s * 100) / 100 : null;
  }
  function pending(r) { return [num(r.pending_cost_orders) || 0, num(r.pending_fee_orders) || 0]; }

  function draw() {
    var D = WR.data, h = '';
    if (!D) { $('wrBody').innerHTML = '<div class="wr-empty">No listing has ad spend in the window.</div>'; return; }

    h += heroPanel(D);
    h += budgetPanel(D);
    h += cutPanel(D);
    h += pushPanel(D);

    h += '<div class="wr-note" style="margin-top:6px">' + esc(D.source || '') + (D.window ? ' · ' + esc(D.window.from || '') + ' to ' + esc(D.window.to || '') +
      ' (' + (num(D.window.days) != null ? D.window.days : '?') + ' days)' : '') + (D.computed_at ? ' · computed ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC' : '') + '</div>';

    $('wrBody').innerHTML = h;
  }

  function kpi(label, value, sub, cls) {
    return '<div class="wr-k"><div class="l">' + esc(label) + '</div>' +
      '<div class="v ' + (cls || '') + '">' + esc(value) + '</div><div class="s">' + esc(sub) + '</div></div>';
  }
  function src(t) { return '<span class="wr-src" data-adtreg="' + esc(t) + '" title="how is this computed">' + esc(t) + '</span>'; }

  /* Temporary honest hero until Phase 2 brings the frontier: what the fleet spent and got back
     over the stated window. Reads `hero` when the engine sends one, else the old `now` point's
     spend/revenue/listing fields (never its profit), else adds up the lists it has. */
  function heroPanel(D) {
    var H = D.hero || D.summary || null, N = D.now || null, days = windowDays(D);
    var spendDay = null, salesDay = null, roas = null, listings = null;
    if (H) { spendDay = num(H.spend_day); salesDay = num(H.attr_revenue_day != null ? H.attr_revenue_day : H.revenue_day); roas = num(H.roas); listings = num(H.listings != null ? H.listings : H.keep); }
    else if (N) { spendDay = num(N.spend_day); salesDay = num(N.revenue_day); roas = num(N.roas); listings = num(N.keep); }
    if (spendDay == null && (D.cut || D.push)) {
      var rows = (D.cut || []).concat(D.push || []), s = 0, v = 0;
      rows.forEach(function (r) { s += num(r.spend) || 0; v += num(r.rev != null ? r.rev : r.attr_revenue) || 0; });
      if (s > 0) { spendDay = Math.round(s / days * 100) / 100; salesDay = Math.round(v / days * 100) / 100; roas = Math.round(v / s * 100) / 100; listings = rows.length; }
    }
    if (roas == null && spendDay && salesDay != null) roas = Math.round(salesDay / spendDay * 100) / 100;
    var acct = D.account && D.account !== 'all' ? D.account : 'all accounts';
    var h = '<div class="wr-hero"><h2>Advertising, ' + windowText(D) + '</h2>' +
      '<div class="wr-sub">' + esc(acct) + ' · spend and attributed sales per report day, ROAS = attributed revenue ÷ spend. ' +
      'The old profit curve is gone: it stood on est. ad profit, which the Sales Analysis check showed overstating every account. ' +
      'Profit on this page is per listing only, under the Sales Analysis law; the frontier that replaces the curve lands with the next phase.</div>' +
      '<div class="wr-kpis">' +
      kpi('Spend / day', gbp0(spendDay), spendDay != null ? 'about ' + gbp0(spendDay * days) + ' over the window' : 'no report row in the window') +
      kpi('Attributed sales / day', gbp0(salesDay), 'revenue eBay credits to the ads', 'pos') +
      kpi('ROAS', roasTxt(roas), 'attributed revenue ÷ spend', roas != null && roas < 1 ? 'neg' : (roas != null ? 'pos' : '')) +
      kpi('Listings advertised', listings != null ? String(listings) : '—', 'with spend in the window') +
      '</div></div>';
    return h;
  }

  /* Cost-per-click campaigns — most of the fleet — are steered by daily budget, not by a bid; eBay
     exposes no bid percentage for them at all. So "when to raise budget on which listing" is the real
     question, and on this fleet the answer is not the obvious one. */
  function budgetPanel(D) {
    var B = D.budget; if (!B) return '';
    var earn = B.deserve_more || [], lose = B.losing_sample || [];
    var out = '<div class="wr-panel"><h3>Budget — who actually ran out of money' + src('eBay ads report') + '</h3>' +
      '<div class="wr-note"><b>' + esc(B.verdict || '') + '</b></div>';
    if (!B.capped) return out + '<div class="wr-empty">Nothing hit its cap in the window.</div></div>';
    out += '<div class="wr-note">Seen over ' + (B.days_observed || 0) + ' day' + (B.days_observed === 1 ? '' : 's') +
      ' of cap data, so read the lists as a direction rather than a verdict. Profit is the listing\'s own, under the Sales Analysis law.</div>';
    var row = function (r, pick) {
      var p = pending(r);
      return '<tr' + (pick ? ' class="pick"' : '') + '><td>' + adtProductCell(r) + '</td>' +
        '<td class="r">' + (num(r.budget) != null ? gbp(r.budget) : '—') + '</td>' +
        '<td class="r">' + (num(r.earliest_hour) === 0 ? 'straight away' : (num(r.earliest_hour) != null ? String(r.earliest_hour) + ':00' : '—')) + '</td>' +
        '<td class="r">' + (r.capped_days != null ? esc(String(r.capped_days)) : '—') + '</td>' +
        '<td class="r">' + gbp(r.spend) + '</td>' +
        '<td class="r">' + adtProfitCell(lawD30(r), p[0], p[1]) + '</td></tr>';
    };
    if (earn.length) {
      out += '<div class="wr-scroll"><table class="wr-tbl"><thead><tr><th>Raise these</th><th class="r">Budget</th>' +
        '<th class="r">Ran out at</th><th class="r">Days</th><th class="r">Spend</th><th class="r">Profit (Sales Analysis law)</th></tr></thead><tbody>' +
        earn.map(function (r) { return row(r, true); }).join('') + '</tbody></table></div>';
    }
    if (lose.length) {
      out += '<div class="wr-note" style="margin-top:12px">These also ran out, and were losing money when they did. ' +
        'Leave them capped — most are on the switch-off list below.</div>' +
        '<div class="wr-scroll"><table class="wr-tbl"><thead><tr><th>Leave capped</th><th class="r">Budget</th><th class="r">Ran out at</th>' +
        '<th class="r">Days</th><th class="r">Spend</th><th class="r">Profit (Sales Analysis law)</th></tr></thead><tbody>' +
        lose.map(function (r) { return row(r, false); }).join('') + '</tbody></table></div>';
    }
    return out + '</div>';
  }

  function listHead(rows, first) {
    return '<thead><tr><th>' + first + '</th><th class="r">Spend / day</th><th class="r">Attributed sales / day</th>' +
      '<th class="r">Own ROAS</th><th class="r">Break-even</th><th class="r">Profit (Sales Analysis law) · 30 d</th>' +
      (hasD7(rows) ? '<th class="r">· 7 d</th>' : '') + (hasStage(rows) ? '<th>Stage</th>' : '') + '</tr></thead>';
  }
  function listRow(rows, r, days, tag) {
    var p = pending(r), d30 = lawD30(r), d7 = lawD7(r), be = num(r.breakeven), ro = ownRoas(r);
    /* 30-day bad but 7-day good is a listing on the mend, not one to switch off (owner, 27 Sep) */
    var improving = tag === 'cut' && d30 != null && d30 < 0 && d7 != null && d7 >= 0 && (num(r.spend_d7) == null || num(r.spend_d7) >= 5);
    return '<tr><td>' + adtProductCell(r) + (improving ? '<span class="wr-tag keep">improving — keep</span>' : '') + '</td>' +
      '<td class="r">' + gbp(perDay(r, 'spend', days)) + '</td>' +
      '<td class="r">' + gbp(perDay(r, r.rev != null ? 'rev' : 'attr_revenue', days)) + '</td>' +
      '<td class="r ' + (ro != null && be != null ? (ro < be ? 'wr-neg' : 'wr-pos') : '') + '">' + roasTxt(ro) + '</td>' +
      '<td class="r">' + (be ? be.toFixed(2) + '×' : '—') + '</td>' +
      '<td class="r">' + adtProfitCell(d30, p[0], p[1]) + '</td>' +
      (hasD7(rows) ? '<td class="r">' + adtProfitCell(d7, num(r.pending_cost_orders_d7) || 0, num(r.pending_fee_orders_d7) || 0) + '</td>' : '') +
      (hasStage(rows) ? '<td>' + esc(r.stage || '—') + '</td>' : '') + '</tr>';
  }

  function cutPanel(D) {
    var cut = D.cut || [], days = windowDays(D);
    if (!cut.length) return '<div class="wr-panel"><h3>Switch off</h3><div class="wr-note">Nothing is losing enough to be worth switching off.</div></div>';
    var total = num(D.cut_total) != null ? D.cut_total : cut.length;
    return '<div class="wr-panel"><h3>Switch off — ' + esc(String(total)) + ' listings, ' + windowText(D) + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Worst first, on the listing\'s own profit under the Sales Analysis law over the window stated above' +
      (num(D.cut_frees) != null ? '. Together they spent <b>' + gbp(D.cut_frees) + '</b> in the window' : '') + '. ' +
      'A row marked <b>improving</b> lost over 30 days but earned over the last 7 — leave it running and look again next week. ' +
      'Cutting a listing does not take its sales to zero — some would have come without the ad — so this is the floor on what switching off is worth, not the ceiling. ' +
      'Showing the ' + Math.min(60, cut.length) + ' worst.</div>' +
      '<div class="wr-scroll"><table class="wr-tbl">' + listHead(cut, 'Listing') + '<tbody>' +
      cut.map(function (r) { return listRow(cut, r, days, 'cut'); }).join('') + '</tbody></table></div></div>';
  }

  function pushPanel(D) {
    var push = D.push || [], days = windowDays(D);
    if (!push.length) return '';
    return '<div class="wr-panel"><h3>Worth more money — ' + push.length + ' listings, ' + windowText(D) + src('eBay ads report') + '</h3>' +
      '<div class="wr-note">Already earning under the Sales Analysis law and running at least half again above their own break-even, so more spend on these is the ' +
      'least speculative bet on the board. Raise the budget on their campaign before you raise a bid anywhere else.</div>' +
      '<div class="wr-scroll"><table class="wr-tbl">' + listHead(push, 'Listing') + '<tbody>' +
      push.map(function (r) { return listRow(push, r, days, 'push'); }).join('') + '</tbody></table></div></div>';
  }
})();
