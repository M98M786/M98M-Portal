/* view-adtool-sales.js — Advertising · Sale event, rebuilt around the WEEKLY BATCH (the owner's
 * request, 6 November 2026).
 *
 * "Every Friday, every week, we will run a new sale event for 14 days. Every listing that is
 *  eligible is entered by hand into that event and the event runs. The portal should give us the
 *  data: each item's current profit, and what its profit will be if we run it in a sale at 5%."
 *
 * WHY A BATCH. Left to a sale that covers the whole shop, eBay puts a listing in the moment it
 * judges it eligible, so a listing that becomes eligible near the end of an event is in that sale
 * for a day or two and then the event is over. Entering a batch by hand on one named day gives
 * every listing in it the whole run. The page is built around that one day: what goes in on it,
 * what it earns now, what it would earn at the sale price, and when everything else comes round.
 *
 * THE MONEY. Profit at the sale price is the engine's one pure rule (adSaleProfitAfter): the
 * listing's profit per unit now, less four fifths of the discount on the price and the percentage
 * fees that come off with it. The supplier cost does not move. Every figure on this page comes out
 * of the payload; nothing is worked out here. A figure we do not have prints as "not known" and
 * never as zero, because a listing nobody has costed is not a listing that earns nothing.
 *
 * NOTHING IS EVER SENT TO EBAY. The batch is entered by hand on eBay; the only write this page
 * makes is our own record of who entered it and which listings they said they entered, so the next
 * membership check has something to agree or disagree with.
 *
 * Engine action: adtoolSales (read; ops task_done / task_dismiss / batch_entered). Own prefix .sv-
 */
(function () {
  var LOSS = '#e0563f';
  VIEW_CSS.push([
    '.sv-wrap{max-width:1460px}',
    '.sv-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.sv-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.sv-panel h4{margin:14px 0 6px;font-size:13px;font-weight:800;color:var(--text)}',
    '.sv-note{color:var(--text-2);font-size:12px;line-height:1.55;margin-bottom:10px}',
    '.sv-warn{background:rgba(224,86,63,.1);border:1px solid rgba(224,86,63,.45);border-radius:12px;padding:12px 14px;margin-bottom:14px;color:#ffb3a6;font-size:12.5px;line-height:1.55}',
    '.sv-limits{background:rgba(255,255,255,.03);border:1px dashed var(--gold-line);border-radius:12px;padding:11px 14px;margin-bottom:14px;color:var(--text-3);font-size:11.5px;line-height:1.6}',
    '.sv-limits b{color:var(--text-2)}',
    '.sv-set{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.sv-setc{border:1px solid var(--gold-line);border-radius:12px;padding:9px 13px;background:rgba(255,255,255,.03);min-width:132px}',
    '.sv-setc .k{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800}',
    '.sv-setc .v{font-size:16px;font-weight:800;color:var(--text);margin-top:2px}',
    '.sv-setc .m{font-size:10.5px;color:var(--text-3);margin-top:2px;line-height:1.45}',
    '.sv-cal{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '.sv-calc{border:1px solid var(--gold-line);border-radius:10px;padding:7px 12px;background:rgba(255,255,255,.02);font-size:11.5px;color:var(--text-2)}',
    '.sv-calc.now{border-color:var(--gold-b);color:var(--text)}',
    '.sv-calc b{color:var(--text);font-weight:800}',
    '.sv-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.sv-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.sv-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.sv-tbl td.r,.sv-tbl th.r{text-align:right}',
    '.sv-tbl tr.loses td{background:rgba(224,86,63,.07)}',
    '.sv-scroll{overflow-x:auto}',
    '.sv-pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;white-space:nowrap}',
    '.sv-pill.worth{background:rgba(242,176,53,.16);border:1px solid var(--gold-line-hi);color:var(--gold-a)}',
    '.sv-pill.thin{background:rgba(255,255,255,.05);border:1px solid var(--gold-line);color:var(--text-2)}',
    '.sv-pill.loses{background:rgba(224,86,63,.14);border:1px solid rgba(224,86,63,.5);color:#ffb3a6}',
    '.sv-pill.unknown{background:rgba(255,255,255,.03);border:1px dashed var(--gold-line);color:var(--text-3)}',
    '.sv-m{font-variant-numeric:tabular-nums;font-weight:700}',
    '.sv-m.neg{color:' + LOSS + '}',
    '.sv-nk{color:var(--text-3);font-size:11.5px;font-weight:600}',
    '.sv-sub{font-size:10.5px;color:var(--text-3);margin-top:2px;line-height:1.45}',
    '.sv-blk{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-bottom:12px;background:rgba(255,255,255,.02)}',
    '.sv-blk-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:8px}',
    '.sv-blk-h .a{font-size:14px;font-weight:800;color:var(--text)}',
    '.sv-blk-h .m{font-size:11.5px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.sv-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}',
    '.sv-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:6px 14px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}',
    '.sv-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.sv-btn[disabled]{opacity:.5;cursor:default}',
    '.sv-tick{font-size:11.5px;color:var(--text-2);display:flex;gap:6px;align-items:center;cursor:pointer}',
    '.sv-ta{width:100%;box-sizing:border-box;background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:11.5px;padding:8px 10px;resize:vertical;min-height:46px;margin-top:8px}',
    '.sv-done{background:rgba(242,176,53,.1);border:1px solid var(--gold-line-hi);border-radius:10px;padding:9px 12px;font-size:11.5px;color:var(--text-2);line-height:1.55;margin-top:9px}',
    '.sv-done b{color:var(--text)}',
    '.sv-task{border:1px solid rgba(224,86,63,.4);border-radius:12px;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,.02)}',
    '.sv-reg{margin-left:8px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;font-weight:800;cursor:pointer}',
    '.sv-empty{color:var(--text-3);font-size:12px;padding:10px 2px}'
  ].join(''));

  /* per-block page state. `loses` is which blocks have the losing rows ticked into the copy list,
     `pending` is the block whose "mark as entered" is waiting on a note, and `busy` stops a second
     click writing the record twice. All keyed by account, because every block acts on its own. */
  var SV = { data: null, loses: {}, pending: '', busy: '', note: {} };

  VIEWS.adtoolSales = {
    label: 'Sale events (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 9h18M7 3v4M17 3v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="m9 14 6-3"/>',
    render: function () {
      return adtHgroup('Sale event', 'The weekly batch: which listings go in, what they earn now, what they earn in the sale', 'svFresh') +
        '<div id="svBody" class="sv-wrap"><div class="sv-note">Loading…</div></div>';
    },
    init: function () { load(); }
  };

  function load() {
    api('adtoolSales', {}).then(function (d) { SV.data = d; adtFreshShow('svFresh', d && d.fresh); draw(); })
      .catch(function (e) { $('svBody').innerHTML = '<div class="sv-panel"><div class="sv-note">' + esc(e && e.message ? e.message : 'This page could not load.') + '</div></div>'; });
  }

  /* ---------- small guards. A number we do not have says so; it never prints as zero. ---------- */
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  function nk() { return '<span class="sv-nk">not known</span>'; }
  function money(v) {
    var n = num(v); if (n == null) return nk();
    return '<span class="sv-m' + (n < 0 ? ' neg' : '') + '">' + (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2) + '</span>';
  }
  function units(v) { var n = num(v); return n == null ? nk() : '<span class="sv-m">' + n + '</span>'; }
  function day(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? esc(String(v)) : nk(); }
  function txt(v) { var s = String(v == null ? '' : v).trim(); return s ? esc(s) : nk(); }
  function D() { return SV.data || {}; }
  function rules() { return (D().settings && D().settings.rules) || {}; }
  function cal() { return D().calendar || {}; }
  function batchName() { return String(cal().weekday_name || rules().batch_weekday_name || 'batch day'); }
  /* the explainer hook. Only these labels have a pattern of their own in the register map. */
  function reg(label, shown) {
    return '<span class="sv-reg" data-adtreg="' + esc(label) + '" title="how is this worked out">' + esc(shown || label) + '</span>';
  }
  var VERDICT_CLASS = { 'worth it': 'worth', thin: 'thin', loses: 'loses', unknown: 'unknown' };
  function verdictPill(v) {
    var k = String(v || 'unknown');
    return '<span class="sv-pill ' + (VERDICT_CLASS[k] || 'unknown') + '">' + esc(k === 'unknown' ? 'not known' : k) + '</span>';
  }
  function countdown(to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(to || ''))) return '';
    var a = new Date((D().today || adtUkDay()) + 'T12:00:00Z'), b = new Date(String(to) + 'T12:00:00Z');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return '';
    var n = Math.round((b - a) / 86400000);
    return n <= 0 ? 'today' : 'in ' + n + ' day' + (n === 1 ? '' : 's');
  }

  /* ---------------------------------------- the page ---------------------------------------- */
  function draw() {
    var d = D(), h = '';
    h += settingsStrip();
    h += wholeShopWarning();
    h += estimateBanner();
    h += accountTable();
    h += thisBatch();
    h += inSaleNow();
    h += upcoming();
    h += noDate();
    h += endingTasks();
    h += limits();
    $('svBody').innerHTML = h;
    wire();
  }

  function settingsStrip() {
    var d = D(), r = rules(), c = cal(), rows = (d.settings && d.settings.rows) || [];
    var stored = {}; rows.forEach(function (x) { stored[String(x.key)] = x; });
    var k = (d.settings && d.settings.keys) || {};
    function cell(label, value, key, extra) {
      var s = stored[key] || null;
      var sub = s && s.stored
        ? ('set' + (s.updated_at ? ' ' + esc(String(s.updated_at).slice(0, 10)) : '') + (s.value != null ? ', stored as ' + esc(String(s.value)) : ''))
        : 'nobody has set this, so the figure in force is shown';
      return '<div class="sv-setc"><div class="k">' + esc(label) + '</div><div class="v">' + value + '</div>' +
        '<div class="m">' + sub + (extra ? '<br>' + esc(extra) : '') + '</div></div>';
    }
    var h = '<div class="sv-panel"><h3>The weekly batch' + reg('sale batch') + '</h3>' +
      '<div class="sv-note">' + txt(d.why_batching) + '</div>' +
      '<div class="sv-set">' +
      cell('Discount', txt(r.discount_text), k.discount_pct) +
      cell('Event runs', r.days == null ? nk() : '<span class="sv-m">' + r.days + '</span> days', k.days) +
      cell('Batch day', txt(c.weekday_name || r.batch_weekday_name), k.batch_weekday) +
      cell('Worth-it floor', money(r.floor), k.min_profit, 'per unit, after the sale') +
      '</div>';
    if ((c.batches || []).length) {
      h += '<div class="sv-cal">' + c.batches.map(function (b) {
        return '<div class="sv-calc' + (b.is_today ? ' now' : '') + '"><b>' + day(b.batch_on) + '</b> ' + esc(String(b.label || '')) +
          '<br>runs to ' + day(b.ends_on) + '</div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="sv-empty">The batch calendar could not be worked out.</div>';
    }
    h += '<div class="sv-note" style="margin:0">' + txt((d.batches && d.batches.verdict_rule) || '') + '</div>';
    return h + '</div>';
  }

  function wholeShopWarning() {
    var ws = D().whole_shop_running || [];
    if (!ws.length) return '';
    return '<div class="sv-warn"><b>A sale covering the whole shop is running, which brings the problem back.</b> ' +
      'On ' + ws.map(function (e) { return esc(String(e.account || '')) + (e.ends ? ' (ends ' + esc(String(e.ends)) + ')' : ''); }).join(', ') +
      ' eBay adds every listing it judges eligible by itself, so a listing that becomes eligible near the end of that event is in the sale ' +
      'for the day or two left of it. End it, or expect the batch below to be overtaken by it.</div>';
  }

  function estimateBanner() {
    var d = D();
    if (d.clock_is_real) return '';
    return '<div class="sv-warn"><b>The eligible dates below are an estimate for now.</b> eBay counts 14 days at the same ' +
      '<b>price</b>, and our daily price record holds ' + (d.price_history_days == null ? 'no days' : esc(String(d.price_history_days)) + ' of 14 days') +
      ', so earlier dates fall back on the last change of any kind. Each date firms up as the record lengthens.</div>';
  }

  function accountTable() {
    var d = D(), rows = d.by_account || [], r = rules();
    var h = '<div class="sv-panel"><h3>Account by account' + reg('sale batch') + '</h3>' +
      '<div class="sv-note">Where each account stands for the batch on ' + day(cal().f0) + ', and what the discount costs it over a month at the rate it is selling now.</div>';
    if (!rows.length) return h + '<div class="sv-empty">No account has an active listing to judge.</div></div>';
    h += '<div class="sv-scroll"><table class="sv-tbl"><thead><tr>' +
      '<th>Account</th><th>In the sale now</th><th>This ' + esc(batchName()) + '</th><th>Next ' + esc(batchName()) + '</th>' +
      '<th>Later</th><th>No date yet</th><th class="r">' + esc(txtPlain(r.discount_text)) + ' off, a month</th></tr></thead><tbody>';
    rows.forEach(function (a) {
      var ev = a.event || null, tb = a.this_batch || {};
      h += '<tr><td><b>' + txt(a.account) + '</b><div class="sv-sub">' + (a.active == null ? '' : esc(String(a.active)) + ' active listings') + '</div></td>' +
        '<td>' + ((a.in_sale && a.in_sale.n) || 0) +
          (ev ? '<div class="sv-sub">' + txt(ev.name) + ', ' + txt(ev.discount_text) + ', ' + esc(String(ev.covers || '')) +
            '<br>ends ' + day(ev.ends) + (ev.days_left == null ? '' : ' (' + esc(String(ev.days_left)) + ' days left)') + '</div>'
            : '<div class="sv-sub">no sale event running</div>') + '</td>' +
        '<td><b>' + esc(String(tb.n || 0)) + '</b><div class="sv-sub">' + esc(String(tb.worth_it || 0)) + ' worth it · ' +
          esc(String(tb.thin || 0)) + ' thin · <span style="color:' + LOSS + '">' + esc(String(tb.loses || 0)) + ' lose</span>' +
          (tb.unknown ? ' · ' + esc(String(tb.unknown)) + ' not known' : '') + '</div></td>' +
        '<td>' + esc(String((a.next_batch && a.next_batch.n) || 0)) + '</td>' +
        '<td>' + esc(String((a.later && a.later.n) || 0)) + '</td>' +
        '<td>' + esc(String((a.no_date && a.no_date.n) || 0)) + '</td>' +
        '<td class="r">' + money(a.month_drop_estimate) +
          '<div class="sv-sub">' + (a.month_drop_items ? 'summed over ' + esc(String(a.month_drop_items)) + ' listings' : 'nothing to sum') + '</div></td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="sv-note" style="margin:10px 0 0">' + txt((d.batches && d.batches.month_drop_label) || '') + '</div>';
    return h + '</div>';
  }

  function txtPlain(v) { var s = String(v == null ? '' : v).trim(); return s || 'the discount'; }

  function thisBatch() {
    var d = D(), tb = d.this_batch || {}, blocks = tb.accounts || [];
    var h = '<div class="sv-panel"><h3>Enter this ' + esc(batchName()) + ': ' + day(tb.batch_on) +
      reg('profit after sale') + '</h3>' +
      '<div class="sv-note">Every listing here can go into the event on ' + day(tb.batch_on) + ' and run to ' + day(tb.ends_on) +
      '. The losing ones are at the top of each block on purpose, so they are seen before anybody enters them. ' +
      txt((d.batches && d.batches.profit_after_rule) || '') + '</div>';
    if (!blocks.length) return h + '<div class="sv-empty">No listing is due on ' + day(tb.batch_on) + '.</div></div>';
    blocks.forEach(function (b) { h += batchBlock(b, tb); });
    return h + '</div>';
  }

  function copyIds(b) {
    var want = SV.loses[b.account] ? { 'worth it': 1, thin: 1, loses: 1 } : { 'worth it': 1, thin: 1 };
    return (b.rows || []).filter(function (r) { return want[String(r.verdict)]; }).map(function (r) { return String(r.item_id); });
  }

  function batchBlock(b, tb) {
    var c = b.counts || {}, ids = copyIds(b), ent = b.entered || null, chk = b.entered_check || null;
    var h = '<div class="sv-blk" data-acct="' + esc(b.account) + '">' +
      '<div class="sv-blk-h"><div><div class="a">' + txt(b.account) + '</div>' +
      '<div class="m">' + esc(String(c.n || 0)) + ' listings due · ' + esc(String(c.worth_it || 0)) + ' worth it · ' +
      esc(String(c.thin || 0)) + ' thin · <span style="color:' + LOSS + '">' + esc(String(c.loses || 0)) + ' lose</span>' +
      (c.unknown ? ' · ' + esc(String(c.unknown)) + ' we cannot judge' : '') + '</div></div></div>';
    h += '<div class="sv-scroll"><table class="sv-tbl"><thead><tr>' +
      '<th>Listing</th><th class="r">Price now</th><th class="r">In the sale</th><th class="r">Profit now</th>' +
      '<th class="r">Profit in the sale</th><th class="r">Off each unit</th><th class="r">Units 7d / 30d</th>' +
      '<th class="r">Profit 7d / 30d</th><th class="r">Ad cost 7d</th><th>Next eligible</th><th>Verdict</th></tr></thead><tbody>' +
      (b.rows || []).map(batchRow).join('') + '</tbody></table></div>';
    h += '<div class="sv-btns">' +
      '<button class="sv-btn" data-copy="' + esc(b.account) + '">Copy the item numbers</button>' +
      '<label class="sv-tick"><input type="checkbox" data-loses="' + esc(b.account) + '"' + (SV.loses[b.account] ? ' checked' : '') + '> include the ' + esc(String(c.loses || 0)) + ' that lose money</label>' +
      '<button class="sv-btn ghost" data-enter="' + esc(b.account) + '"' + (ids.length ? '' : ' disabled') + '>Mark as entered on eBay</button>' +
      '</div>';
    h += '<div class="sv-note" style="margin:8px 0 0">' + esc(String(ids.length)) + ' item numbers below' +
      (c.unknown ? ', and ' + esc(String(c.unknown)) + ' we cannot judge are left out' : '') +
      '. Marking the batch as entered writes our own record of who did it and when. Nothing is sent to eBay.</div>';
    h += '<textarea class="sv-ta" readonly data-ta="' + esc(b.account) + '">' + esc(ids.join(',')) + '</textarea>';
    if (SV.pending === b.account) {
      h += '<textarea class="sv-ta" data-note="' + esc(b.account) + '" placeholder="Add a note (optional): anything about this batch">' + esc(SV.note[b.account] || '') + '</textarea>' +
        '<div class="sv-btns"><button class="sv-btn" data-confirm="' + esc(b.account) + '"' + (SV.busy === b.account ? ' disabled' : '') + '>Confirm, ' + esc(String(ids.length)) + ' listings</button>' +
        '<button class="sv-btn ghost" data-cancel="' + esc(b.account) + '">Cancel</button></div>';
    }
    if (ent) {
      h += '<div class="sv-done">Entered by <b>' + txt(ent.by) + '</b> at <b>' + esc(String(ent.at || '').replace('T', ' ').slice(0, 16)) + '</b>, ' +
        '<b>' + esc(String(ent.n || 0)) + '</b> listings. ' + (chk ? esc(String(chk.note || '')) : '') +
        (chk && chk.checked ? ' (' + esc(String(chk.in_sale_now || 0)) + ' in a sale, ' + esc(String(chk.missing || 0)) + ' not)' : '') + '</div>';
    }
    return h + '</div>';
  }

  function batchRow(r) {
    var cls = String(r.verdict) === 'loses' ? ' class="loses"' : '';
    return '<tr' + cls + '><td>' + adtProductCell(r) + '</td>' +
      '<td class="r">' + money(r.price) + '</td>' +
      '<td class="r">' + money(r.sale_price) + '</td>' +
      '<td class="r">' + money(r.margin_before_ads) + '<div class="sv-sub">' + (r.margin_source ? esc(String(r.margin_source)) : 'source not known') + '</div></td>' +
      '<td class="r">' + money(r.profit_after) + (r.profit_after == null && r.profit_after_why ? '<div class="sv-sub">' + esc(String(r.profit_after_why)) + '</div>' : '') + '</td>' +
      '<td class="r">' + money(r.drop) + '<div class="sv-sub">' + (r.drop_month_estimate == null ? 'a month: not known' : 'a month: ' + moneyPlain(r.drop_month_estimate)) + '</div></td>' +
      '<td class="r">' + units(r.units_7d) + ' / ' + units(r.units_30d) + '</td>' +
      '<td class="r">' + money(r.actual_profit_7d) + ' / ' + money(r.actual_profit_30d) + '</td>' +
      '<td class="r">' + money(r.ad_spend_7d) + '</td>' +
      '<td>' + day(r.next_eligible_on) + '<div class="sv-sub">' + esc(String(r.next_eligible_why || '')) + '</div></td>' +
      '<td>' + verdictPill(r.verdict) + '</td></tr>';
  }
  function moneyPlain(v) { var n = num(v); return n == null ? 'not known' : (n < 0 ? '−£' : '£') + Math.abs(n).toFixed(2); }
  /* a discount the payload sends as a fraction, printed. Never a figure typed in here: a listing in
     a sale is judged at its own event's discount and the rest at the batch setting, and the row says
     which it was. */
  function pctOf(v) { var n = num(v); return n == null ? '' : (Math.round(n * 10000) / 100) + '%'; }

  function inSaleNow() {
    var d = D(), blocks = d.in_sale || [];
    var h = '<div class="sv-panel"><h3>In the sale now' + reg('sale events') + '</h3>' +
      '<div class="sv-note">What is running, and how each listing has traded since its event started against the same number of days before it. Each listing against itself, never added up.</div>';
    if (!blocks.length) return h + '<div class="sv-empty">No listing is in a sale event on any account.</div></div>';
    blocks.forEach(function (b) {
      var ev = b.event || {};
      h += '<div class="sv-blk"><div class="sv-blk-h"><div><div class="a">' + txt(b.account) + '</div>' +
        '<div class="m"><b>' + txt(ev.name) + '</b> · ' + txt(ev.discount_text) + ' · ' + esc(String(ev.covers || '')) +
        '<br>' + day(ev.starts) + ' to ' + day(ev.ends) + (ev.days_left == null ? '' : ' · ' + esc(String(ev.days_left)) + ' days left') +
        ' · ' + esc(String(b.n || 0)) + ' listings</div></div></div>';
      h += '<div class="sv-scroll"><table class="sv-tbl"><thead><tr><th>Listing</th><th class="r">Sale price</th>' +
        '<th class="r">Profit in the sale</th><th class="r">Units since / before</th><th class="r">Profit since / before</th>' +
        '<th>Next eligible' + reg('next eligible') + '</th></tr></thead><tbody>' +
        (b.rows || []).map(function (r) {
          return '<tr><td>' + adtProductCell(r) + '</td>' +
            '<td class="r">' + money(r.sale_price) + '<div class="sv-sub">was ' + moneyPlain(r.price) + '</div></td>' +
            '<td class="r">' + money(r.profit_after) + '<div class="sv-sub">at ' + txt(pctOf(r.discount_pct)) + ' off, ' +
              esc(String(r.discount_source || 'source not known')) + '<br>' + (r.margin_source ? 'profit now from ' + esc(String(r.margin_source)) : 'profit source not known') + '</div></td>' +
            '<td class="r">' + units(r.units_since) + ' / ' + units(r.units_before) +
              '<div class="sv-sub">' + (r.days_since == null ? 'days not known' : esc(String(r.days_since)) + ' days against ' + esc(String(r.days_before == null ? 0 : r.days_before))) + '</div></td>' +
            '<td class="r">' + money(r.actual_profit_since) + ' / ' + money(r.actual_profit_before) + '</td>' +
            '<td>' + day(r.next_eligible_on) + '<div class="sv-sub">' + esc(String(r.next_eligible_why || '')) +
              (r.batch_on ? '<br>goes in on ' + esc(String(r.batch_on)) : '') + '</div></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    });
    return h + '</div>';
  }

  function upcoming() {
    var d = D(), g = (d.batches && d.batches.groups) || {}, nx = g.next_friday || [], later = g.later || [];
    var h = '<div class="sv-panel"><h3>Coming up' + reg('next eligible') + '</h3>' +
      '<div class="sv-note">The batch after this one, then every batch day after that, with the date each listing can join and what is holding it.</div>';
    h += '<h4>Next ' + esc(batchName()) + ': ' + day(cal().f1) + ' · ' + esc(String(nx.length)) + ' listings</h4>';
    h += nx.length ? upcomingTable(nx) : '<div class="sv-empty">Nothing is due on ' + day(cal().f1) + '.</div>';
    if (!later.length) {
      h += '<h4>Later</h4><div class="sv-empty">Nothing is placed on a later batch day.</div>';
    } else {
      later.forEach(function (blk) {
        h += '<h4>' + esc(batchName()) + ' ' + day(blk.batch_on) + ' · ' + esc(String(blk.n || 0)) + ' listings' +
          (blk.ends_on ? ' <span class="sv-nk">runs to ' + esc(String(blk.ends_on)) + '</span>' : '') + '</h4>' + upcomingTable(blk.rows || []);
      });
    }
    return h + '</div>';
  }

  function upcomingTable(rows) {
    return '<div class="sv-scroll"><table class="sv-tbl"><thead><tr><th>Listing</th><th>Eligible on</th><th>Why not yet</th>' +
      '<th class="r">Profit now</th><th class="r">Profit in the sale</th><th class="r">Units 30d</th><th>Verdict</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr' + (String(r.verdict) === 'loses' ? ' class="loses"' : '') + '><td>' + adtProductCell(r) + '</td>' +
          '<td>' + day(r.next_eligible_on) + '<div class="sv-sub">' + esc(countdown(r.next_eligible_on)) + '</div></td>' +
          '<td>' + txt(r.why || r.next_eligible_why) + '</td>' +
          '<td class="r">' + money(r.margin_before_ads) + '</td>' +
          '<td class="r">' + money(r.profit_after) + '</td>' +
          '<td class="r">' + units(r.units_30d) + '</td>' +
          '<td>' + verdictPill(r.verdict) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function noDate() {
    var g = (D().batches && D().batches.groups) || {}, rows = g.no_date || [];
    var h = '<div class="sv-panel"><h3>No date yet' + reg('next eligible') + '</h3>' +
      '<div class="sv-note">The clock cannot place these on a batch day. Each one says why rather than being given a date that eBay would not honour.</div>';
    if (!rows.length) return h + '<div class="sv-empty">Every listing has a date.</div></div>';
    h += '<div class="sv-scroll"><table class="sv-tbl"><thead><tr><th>Listing</th><th>Where it stands</th><th>Why there is no date</th>' +
      '<th class="r">Profit now</th><th class="r">Profit in the sale</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + adtProductCell(r) + '</td><td>' + txt(r.status) + '</td>' +
          '<td>' + txt(r.next_eligible_why || r.why) + '</td>' +
          '<td class="r">' + money(r.margin_before_ads) + '</td>' +
          '<td class="r">' + money(r.profit_after) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h + '</div>';
  }

  function endingTasks() {
    var tasks = D().tasks || [];
    var h = '<div class="sv-panel"><h3>An event ending with nothing to follow it · ' + esc(String(tasks.length)) + ' open</h3>' +
      '<div class="sv-note">Raised when a running event is about to end and no later event covers the account from the day after. The old task for each listing becoming eligible has gone: the batch above is that list.</div>';
    if (!tasks.length) return h + '<div class="sv-empty">Nothing needs a hand today.</div></div>';
    tasks.forEach(function (t) {
      var ev = endingEvent(t), ends = String(t.ends || t.eligible_on || (ev && ev.ends) || '').slice(0, 10);
      h += '<div class="sv-task" data-tid="' + esc(String(t.task_id)) + '">' +
        '<div class="sv-blk-h"><div><div class="a">' + txt(t.account) + '</div><div class="m">' +
        (ev ? '<b>' + txt(ev.name) + '</b>' + (ev.discount ? ' · ' + esc(String(ev.discount)) : '') + ' · ' + esc(String(ev.covers || ev.criterion || '')) + '<br>' : '') +
        'ends <b>' + day(ends) + '</b>' + (ends ? ' · ' + esc(countdown(ends)) : '') + ' · no replacement event seen for this account</div></div>' +
        '<div style="font-size:12px;font-weight:800;color:var(--gold-a);text-align:right">Create the next sale event</div></div>' +
        '<div class="sv-btns"><button class="sv-btn" data-act="task_done">Done</button>' +
        '<button class="sv-btn ghost" data-act="task_dismiss">Dismiss</button></div>' +
        '<textarea class="sv-ta" hidden placeholder="Add a note (optional): what you did"></textarea>' +
        '<div class="sv-btns" hidden data-taskrow><button class="sv-btn" data-tconfirm>Confirm</button>' +
        '<button class="sv-btn ghost" data-tcancel>Cancel</button></div></div>';
    });
    return h + '</div>';
  }

  /* the running event an event-ending task is about: matched on the promo id folded into the task id
     ('end:<account>:<promo>:<end>'), else on the account, because the engine sends no promo field */
  function endingEvent(t) {
    var evs = D().running_events || [], parts = String(t.task_id || '').split(':');
    var promo = parts.length >= 4 ? parts[parts.length - 2] : '';
    for (var i = 0; i < evs.length; i++) if (promo && String(evs[i].promo_id || '') === promo) return evs[i];
    for (var j = 0; j < evs.length; j++) if (String(evs[j].account || '') === String(t.account || '')) return evs[j];
    return null;
  }

  function limits() {
    var d = D(), lim = d.honest_limits || [];
    return '<div class="sv-limits"><b>How to read this page.</b> Everything here is watched once a day' +
      (d.observed_since ? ' from <b>' + esc(String(d.observed_since)) + '</b>' : '') + '. ' +
      '<ul style="margin:6px 0 0 16px;padding:0">' + lim.map(function (x) { return '<li>' + esc(String(x)) + '</li>'; }).join('') + '</ul></div>';
  }

  /* ---------------------------------------- wiring ---------------------------------------- */
  function wire() {
    var body = $('svBody');
    if (!body) return;
    each(body.querySelectorAll('[data-loses]'), function (el) {
      el.onchange = function () { SV.loses[this.getAttribute('data-loses')] = !!this.checked; draw(); };
    });
    each(body.querySelectorAll('[data-copy]'), function (el) {
      el.onclick = function () {
        var acct = this.getAttribute('data-copy'), blk = blockFor(acct), btn = this;
        if (!blk) return;
        var text = copyIds(blk).join(',');
        if (!text) { toast('Nothing to copy in this block.'); return; }
        copyText(text, btn, 'Copy the item numbers');
      };
    });
    each(body.querySelectorAll('[data-enter]'), function (el) {
      el.onclick = function () { SV.pending = this.getAttribute('data-enter'); draw(); };
    });
    each(body.querySelectorAll('[data-cancel]'), function (el) {
      el.onclick = function () { SV.pending = ''; draw(); };
    });
    each(body.querySelectorAll('[data-note]'), function (el) {
      el.oninput = function () { SV.note[this.getAttribute('data-note')] = this.value; };
    });
    each(body.querySelectorAll('[data-confirm]'), function (el) {
      el.onclick = function () {
        var acct = this.getAttribute('data-confirm'), blk = blockFor(acct), tb = D().this_batch || {};
        if (!blk || SV.busy) return;
        var ids = copyIds(blk);
        if (!ids.length) { toast('Nothing to record in this block.'); return; }
        SV.busy = acct; this.disabled = true;
        api('adtoolSales', { op: 'batch_entered', account: acct, batch_on: tb.batch_on, item_ids: ids, note: SV.note[acct] || '' })
          .then(function (res) {
            SV.busy = ''; SV.pending = ''; SV.note[acct] = '';
            toast('Recorded ' + ((res && res.n) || ids.length) + ' listings for ' + acct);
            load();
          })
          .catch(function (e) { SV.busy = ''; toast(e && e.message ? e.message : 'could not record it'); draw(); });
      };
    });
    /* the event-ending task's own inline note flow (no window.prompt) */
    each(body.querySelectorAll('.sv-task'), function (card) {
      var ta = card.querySelector('textarea'), row = card.querySelector('[data-taskrow]'), pending = null;
      each(card.querySelectorAll('[data-act]'), function (b) {
        b.onclick = function () { pending = this.getAttribute('data-act'); if (ta) { ta.hidden = false; ta.focus(); } if (row) row.hidden = false; };
      });
      var cancel = card.querySelector('[data-tcancel]');
      if (cancel) cancel.onclick = function () { pending = null; if (ta) ta.hidden = true; if (row) row.hidden = true; };
      var ok = card.querySelector('[data-tconfirm]');
      if (ok) ok.onclick = function () {
        if (!pending) return;
        var tid = card.getAttribute('data-tid'), note = ta ? ta.value.trim() : '';
        ok.disabled = true;
        api('adtoolSales', { op: pending, task_id: tid, note: note })
          .then(function () { toast(pending === 'task_done' ? 'Marked done' : 'Dismissed'); load(); })
          .catch(function (e) { ok.disabled = false; toast(e && e.message ? e.message : 'failed'); });
      };
    });
  }

  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i]); }
  function blockFor(acct) {
    var blocks = (D().this_batch && D().this_batch.accounts) || [];
    for (var i = 0; i < blocks.length; i++) if (String(blocks[i].account) === String(acct)) return blocks[i];
    return null;
  }
  /* the clipboard, with the textarea above it as the hand-copy path when the browser refuses */
  function copyText(text, btn, label) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1500); };
    var manual = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Select the item numbers in the box and copy them by hand.'); }
      document.body.removeChild(ta);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, manual); return; }
    } catch (e) { /* falls through to the manual path */ }
    manual();
  }
})();
