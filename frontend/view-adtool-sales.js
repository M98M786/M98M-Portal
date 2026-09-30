/* Sale events — the observed lifecycle (Phase 5). Per listing: is it in a running sale, when was it
 * dropped, when does the 14-day 'not in another sale' restriction end, when is it eligible again, and
 * what the buyer actually paid. All nine running events are whole-shop (INVENTORY_ANY, 5% off): eBay
 * auto-enrols and silently skips a listing whose price moved in the last 14 days, and gives no per-item
 * list — so removal of an individual item cannot be seen directly. Everything here is OBSERVED at
 * one-day granularity from `observed_since`, with the limits stated on the page. Nothing is ever sent
 * to eBay; the tool only records what eBay already did. Engine action: adtoolSales. */
(function () {
  var GOLD = '#f2b035', LOSS = '#e0563f';
  VIEW_CSS.push([
    '.sv-panel{background:linear-gradient(var(--panel),var(--panel)),var(--bg0);border:1px solid var(--gold-line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
    '.sv-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.sv-note{color:var(--text-2);font-size:12px;line-height:1.55;margin-bottom:10px}',
    '.sv-warn{background:rgba(224,86,63,.1);border:1px solid rgba(224,86,63,.45);border-radius:12px;padding:12px 14px;margin-bottom:14px;color:#ffb3a6;font-size:12.5px;line-height:1.55}',
    '.sv-limits{background:rgba(255,255,255,.03);border:1px dashed var(--gold-line);border-radius:12px;padding:11px 14px;margin-bottom:14px;color:var(--text-3);font-size:11.5px;line-height:1.6}',
    '.sv-limits b{color:var(--text-2)}',
    '.sv-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
    '.sv-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:5px 13px;font-size:12px;color:var(--text-2);font-weight:700;cursor:pointer}',
    '.sv-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.sv-chip .n{opacity:.7;margin-left:5px;font-weight:700}',
    '.sv-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.sv-tbl th{text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:700;padding:6px 8px;border-bottom:1px solid var(--gold-line)}',
    '.sv-tbl td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.sv-tbl td.r,.sv-tbl th.r{text-align:right}',
    '.sv-scroll{overflow-x:auto}',
    '.sv-pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;white-space:nowrap}',
    '.sv-pill.live,.sv-pill.eligible{background:rgba(242,176,53,.16);border:1px solid var(--gold-line-hi);color:var(--gold-a)}',
    '.sv-pill.waiting,.sv-pill.notinsale{background:rgba(255,255,255,.05);border:1px solid var(--gold-line);color:var(--text-2)}',
    '.sv-pill.removed{background:rgba(224,86,63,.12);border:1px solid rgba(224,86,63,.45);color:#ffb3a6}',
    '.sv-cd{font-size:11px;color:var(--text-3);margin-top:3px}',
    '.sv-cd.soon{color:var(--gold-a)}.sv-cd.ready{color:var(--gold-a);font-weight:700}',
    '.sv-price .o{color:var(--text-2)}.sv-price .s{color:var(--text);font-weight:700}.sv-price .d{color:' + LOSS + ';font-weight:700}',
    '.sv-obs{font-size:11px;color:var(--text-3);margin-top:4px;line-height:1.5}',
    '.sv-run{display:flex;gap:10px;flex-wrap:wrap}',
    '.sv-runc{border:1px solid var(--gold-line);border-radius:12px;padding:10px 13px;background:rgba(255,255,255,.03);min-width:180px}',
    '.sv-runc .a{font-size:12px;font-weight:800;color:var(--text)}',
    '.sv-runc .m{font-size:11px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.sv-task{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,.02)}',
    '.sv-task.ending{border-color:rgba(224,86,63,.4)}',
    '.sv-acct .a{font-size:14px;font-weight:800;color:var(--text)}.sv-acct .m{font-size:11.5px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.sv-task-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}',
    '.sv-flags{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
    '.sv-flag{font-size:11px;color:var(--text-2);background:rgba(255,255,255,.04);border:1px solid var(--gold-line);border-radius:8px;padding:3px 9px}',
    '.sv-flag b{color:var(--text)}.sv-flag.yes b{color:var(--gold-a)}.sv-flag.warn b{color:' + LOSS + '}',
    '.sv-task-btns{display:flex;gap:8px;margin-top:10px}',
    '.sv-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:6px 14px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}',
    '.sv-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.sv-notebox{margin-top:10px}',
    '.sv-notebox textarea{width:100%;box-sizing:border-box;background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:8px 10px;resize:vertical;min-height:52px}',
    '.sv-notebox .row{display:flex;gap:8px;margin-top:8px}',
    '.sv-empty{color:var(--text-3);font-size:12px;padding:10px 2px}'
  ].join(''));

  var SV = { data: null, filter: '' };

  VIEWS.adtoolSales = {
    label: 'Sale events (ads)', hidden: true, order: 93, roles: ['Management', 'Ops Head', 'Advertising Manager'],
    icon: '<path d="M3 9h18M7 3v4M17 3v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="m9 14 6-3"/>',
    render: function () {
      return adtHgroup('Sale events', 'the observed lifecycle: in a sale, removed, waiting out the 14 days, eligible again', 'svFresh') +
        '<div id="svBody"><div class="sv-note">Reading every advertised and active listing against the running sale events…</div></div>';
    },
    init: function () { load(); }
  };

  function load() {
    api('adtoolSales', {}).then(function (d) { SV.data = d; adtFreshShow('svFresh', d && d.fresh); draw(); })
      .catch(function (e) { $('svBody').innerHTML = '<div class="sv-panel"><div class="sv-note">' + esc(e && e.message ? e.message : 'could not read') + '</div></div>'; });
  }

  /* one of the six filter buckets a row's status falls into */
  function bucket(s) {
    s = String(s || '').toLowerCase();
    if (s === 'live' || s === 'added-unconfirmed') return 'live';
    if (s === 'eligible') return 'eligible';
    if (s === 'waiting') return 'waiting';
    if (s === 'removed') return 'removed';
    return 'notinsale';                                   /* not-discounted · no-event · unknown */
  }
  var CHIPS = [['', 'All'], ['live', 'Live'], ['eligible', 'Eligible'], ['waiting', 'Waiting'], ['removed', 'Removed'], ['notinsale', 'Not in sale']];
  var STATUS_LABEL = {
    'live': 'live', 'added-unconfirmed': 'added — unconfirmed', 'not-discounted': 'not discounted',
    'removed': 'removed', 'waiting': 'waiting', 'eligible': 'eligible', 'no-event': 'no event'
  };

  function draw() {
    var D = SV.data || {}, rows = D.rows || [], h = '';

    /* the lead: the running events are whole-shop, so the owner's "always a sale running" rule is met */
    var cover = D.covers_whole_shop || [];
    if (cover.length) {
      h += '<div class="sv-panel" style="border-color:var(--gold-b)"><h3>You already have this</h3>' +
        '<div class="sv-note">All ' + cover.length + ' of your accounts with a sale run it on <b>ALL INVENTORY</b> — the whole shop, not a chosen ' +
        'list. eBay enrols every eligible listing itself and drops each one when it stops, so a sale is always running and covers ' +
        'far more than half the listings. What limits coverage is the 14-day price rule below — a revision problem, not a scheduling one.</div></div>';
    }

    /* the honest estimate banner, kept until the price record is long enough for eBay's real 14-day clock */
    if (!D.clock_is_real) {
      h += '<div class="sv-warn"><b>The eligible-again dates below are an estimate for now.</b> eBay counts 14 days at the same ' +
        '<b>price</b>. A full daily price record only exists from ' + esc(D.observed_since || 'the first snapshot') + ', so early dates lean ' +
        'on the last revision of any kind (a title edit counts the same as a price cut). Each date firms up on its own as the record lengthens.</div>';
    }

    /* running events, straight from eBay's markdown sales */
    var ev = D.running_events || [];
    h += '<div class="sv-panel"><h3>Running on eBay right now</h3>' +
      '<div class="sv-note">' + (ev.length ? 'These markdown sale events are live. A whole-shop event returns no listing list — eBay auto-enrols by rule.' : 'No markdown sale event is running on any account.') + '</div>' +
      (ev.length ? '<div class="sv-run">' + ev.map(function (e) {
        return '<div class="sv-runc"><div class="a">' + esc(e.account || '') + '</div>' +
          '<div class="m"><b style="color:var(--text)">' + esc(e.name || 'Sale') + '</b>' + (e.discount ? ' · ' + esc(e.discount) : '') + '<br>' +
          esc(e.criterion || e.covers || 'whole shop') + '<br>' + esc(e.starts || '?') + ' → ' + esc(e.ends || '?') + '</div></div>';
      }).join('') + '</div>' : '') + '</div>';

    /* status filter chips — counts from the engine when it gives them, else from the rows on screen */
    var counts = (D.status_filter && typeof D.status_filter === 'object') ? D.status_filter : countBuckets(rows);
    h += '<div class="sv-chips">' + CHIPS.map(function (c) {
      var n = c[0] === '' ? rows.length : (counts[c[0]] || 0);
      return '<button class="sv-chip' + (SV.filter === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + esc(c[1]) + '<span class="n">' + n + '</span></button>';
    }).join('') + '</div>';

    /* the lifecycle table */
    var shown = SV.filter ? rows.filter(function (r) { return bucket(r.status) === SV.filter; }) : rows;
    h += '<div class="sv-panel"><h3>Every advertised &amp; active listing' +
      '<span class="sv-src" data-adtreg="sale events" title="how is this computed" style="margin-left:8px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;font-weight:800;cursor:pointer">sale events</span></h3>' +
      '<div class="sv-note">Where each listing sits in the cycle — in a sale, dropped, waiting out the 14 days, or eligible again — with the price the buyer actually paid where an order let us see it. ' +
      (D.observed_since ? 'Observed since <b>' + esc(D.observed_since) + '</b>.' : '') + '</div>';
    if (!shown.length) {
      h += '<div class="sv-empty">No listing in this bucket.</div>';
    } else {
      h += '<div class="sv-scroll"><table class="sv-tbl"><thead><tr><th>Listing</th><th>Status</th><th>Event</th>' +
        '<th>Dropped</th><th>Restriction ends</th><th>Eligible again</th><th class="r">Price</th><th>Observed</th></tr></thead><tbody>' +
        shown.map(rowHtml).join('') + '</tbody></table></div>';
    }
    h += '</div>';

    /* tasks — one open per listing, with the five flags the brief asks for */
    var tasks = D.tasks || [];
    h += '<div class="sv-panel"><h3>Tasks — ' + tasks.length + ' open</h3>' +
      '<div class="sv-note">Raised automatically when a listing becomes eligible again, or when a running event ends within two days with no replacement. Each carries the product, the account, when it becomes eligible, when to act, and whether it is already added, currently live, and had a price change.</div>' +
      (tasks.length ? tasks.map(taskHtml).join('') : '<div class="sv-empty">Nothing needs a hand today.</div>') + '</div>';

    /* the honest limits, printed not buried */
    h += '<div class="sv-limits"><b>How to read these dates.</b> Everything is observed at one-day granularity' +
      (D.observed_since ? ' from <b>' + esc(D.observed_since) + '</b>' : '') + '. For a whole-shop (ALL INVENTORY) event eBay gives no per-item list, so an ' +
      'individual listing\'s removal cannot be seen directly — it counts as in the sale while the event runs and the listing is active, with a ' +
      'price-history dip as corroboration. The sale price is computed from the event\'s discount unless an actual order proves the marked-down price. ' +
      '<b>Nothing on this page is ever sent to eBay</b> — the tool only records what eBay already did.</div>';

    $('svBody').innerHTML = h;
    wire();
  }

  function countBuckets(rows) {
    var c = { live: 0, eligible: 0, waiting: 0, removed: 0, notinsale: 0 };
    (rows || []).forEach(function (r) { var b = bucket(r.status); c[b] = (c[b] || 0) + 1; });
    return c;
  }

  function rowHtml(r) {
    var st = String(r.status || '').toLowerCase(), b = bucket(st);
    var pill = '<span class="sv-pill ' + b + '">' + esc(STATUS_LABEL[st] || st || '—') + '</span>';
    var evt = r.event_running
      ? '<b style="color:var(--text)">' + esc(r.discount_pct != null && r.discount_pct !== '' ? pctTxt(r.discount_pct) + ' off' : (r.discount_shown || 'in sale')) + '</b>' + (r.ends ? '<div class="sv-cd">ends ' + esc(r.ends) + '</div>' : '')
      : '<span style="color:var(--text-3)">—</span>';
    var cd = countdown(D_today(), r.eligible_on);
    return '<tr><td>' + adtProductCell(r) + '</td>' +
      '<td>' + pill + '</td>' +
      '<td>' + evt + '</td>' +
      '<td>' + dcell(r.removed_on) + '</td>' +
      '<td>' + dcell(r.restriction_end) + '</td>' +
      '<td>' + dcell(r.eligible_on) + (cd ? '<div class="sv-cd ' + cd.cls + '">' + esc(cd.txt) + '</div>' : '') + '</td>' +
      '<td class="r">' + priceBlock(r) + '</td>' +
      '<td>' + (r.observed_note ? '<div class="sv-obs">' + esc(r.observed_note) + '</div>' : '<span style="color:var(--text-3)">—</span>') + '</td></tr>';
  }

  function priceBlock(r) {
    var o = num(r.original_price), s = num(r.sale_price), d = num(r.difference);
    if (o == null && s == null) return '<span style="color:var(--text-3)">—</span>';
    var pct = (o && d != null) ? Math.round(d / o * 100) : (r.discount_pct != null ? Math.round(pctNum(r.discount_pct)) : null);
    var h = '<div class="sv-price">';
    if (o != null) h += '<span class="o">£' + o.toFixed(2) + '</span>';
    if (s != null) h += ' → <span class="s">£' + s.toFixed(2) + '</span>';
    if (d != null && d !== 0) h += '<div class="d">−£' + Math.abs(d).toFixed(2) + (pct != null ? ' · ' + Math.abs(pct) + '%' : '') + '</div>';
    else if (pct != null) h += '<div class="d">' + Math.abs(pct) + '% off</div>';
    return h + '</div>';
  }

  /* the running event an event-ending task is about: matched on the promo id folded into the task id
     ('end:<account>:<promo>:<end>'), else on the account — the engine sends no promo field on the task */
  function endingEvent(t) {
    var evs = (SV.data && SV.data.running_events) || [], parts = String(t.task_id || '').split(':');
    var promo = parts.length >= 4 ? parts[parts.length - 2] : '';
    for (var i = 0; i < evs.length; i++) if (promo && String(evs[i].promo_id || '') === promo) return evs[i];
    for (var j = 0; j < evs.length; j++) if (String(evs[j].account || '') === String(t.account || '')) return evs[j];
    return null;
  }

  function taskHtml(t) {
    var f = t.flags || {}, kind = String(t.kind || ''), ending = kind === 'event-ending';
    var perform = t.perform_on || t.eligible_on;
    var head, kindTxt, flags;
    if (ending) {
      /* an ACCOUNT task (item_id ''): the ending event and its date, never a product cell */
      var ev = endingEvent(t), ends = String(t.ends || t.eligible_on || (ev && ev.ends) || '').slice(0, 10);
      var cd = ends ? countdown(D_today(), ends) : null;
      kindTxt = 'Create the next sale event on ' + (t.account || '—') + (ends ? ' — ends ' + ends : '');
      head = '<div class="sv-acct"><div class="a">' + esc(t.account || 'account —') + '</div><div class="m">' +
        (ev ? '<b>' + esc(ev.name || 'Sale') + '</b>' + (ev.discount ? ' · ' + esc(ev.discount) : '') + ' · ' + esc(ev.covers || ev.criterion || 'whole shop') + '<br>' : '') +
        'ends <b>' + esc(ends || '—') + '</b>' + (cd ? ' · ' + esc(cd.txt.replace('eligible now', 'ended')) : '') + ' · no replacement event seen for this account</div></div>';
      flags = '<div class="sv-flags">' +
        '<span class="sv-flag">account <b>' + esc(t.account || '—') + '</b></span>' +
        '<span class="sv-flag warn">event ends <b>' + esc(ends || '—') + '</b></span>' +
        '<span class="sv-flag">perform <b>' + esc(perform || '—') + '</b></span>' +
        '</div>';
    } else {
      kindTxt = kind === 'check' ? 'Check this listing in the sale event' : 'Eligible for a sale event';
      head = adtProductCell(t);
      flags = '<div class="sv-flags">' +
        '<span class="sv-flag">account <b>' + esc(t.account || '—') + '</b></span>' +
        '<span class="sv-flag">eligible <b>' + esc(t.eligible_on || '—') + '</b></span>' +
        '<span class="sv-flag">perform <b>' + esc(perform || '—') + '</b></span>' +
        '<span class="sv-flag ' + (f.already_added ? 'yes' : '') + '">already added <b>' + (f.already_added ? 'yes' : 'no') + '</b></span>' +
        '<span class="sv-flag ' + (f.live ? 'yes' : '') + '">currently live <b>' + (f.live ? 'yes' : 'no') + '</b></span>' +
        '<span class="sv-flag ' + (f.price_changed_on ? 'warn' : '') + '">price change <b>' + (f.price_changed_on ? esc(String(f.price_changed_on)) : 'no') + '</b></span>' +
        '</div>';
    }
    return '<div class="sv-task' + (ending ? ' ending' : '') + '" data-tid="' + esc(t.task_id) + '">' +
      '<div class="sv-task-h"><div style="flex:1 1 320px">' + head + '</div>' +
      '<div style="font-size:12px;font-weight:800;color:var(--gold-a);text-align:right">' + esc(kindTxt) + '</div></div>' +
      flags +
      '<div class="sv-task-btns"><button class="sv-btn" data-act="task_done">Done</button>' +
      '<button class="sv-btn ghost" data-act="task_dismiss">Dismiss</button></div>' +
      '<div class="sv-notebox" hidden><textarea placeholder="Add a note (optional) — what you did"></textarea>' +
      '<div class="row"><button class="sv-btn" data-confirm>Confirm</button><button class="sv-btn ghost" data-cancel>Cancel</button></div></div>' +
      '</div>';
  }

  /* wire the chips and the task Done/Dismiss inline-note flow (no window.prompt) */
  function wire() {
    var chips = document.querySelectorAll('#svBody .sv-chip');
    for (var i = 0; i < chips.length; i++) chips[i].onclick = function () { SV.filter = this.getAttribute('data-f'); draw(); };

    var cards = document.querySelectorAll('#svBody .sv-task');
    for (var c = 0; c < cards.length; c++) (function (card) {
      var box = card.querySelector('.sv-notebox'), ta = box ? box.querySelector('textarea') : null, pending = null;
      var acts = card.querySelectorAll('[data-act]');
      for (var a = 0; a < acts.length; a++) acts[a].onclick = function () {
        pending = this.getAttribute('data-act');
        if (box) { box.hidden = false; if (ta) ta.focus(); }
      };
      var cancel = card.querySelector('[data-cancel]'); if (cancel) cancel.onclick = function () { if (box) box.hidden = true; pending = null; };
      var confirm = card.querySelector('[data-confirm]');
      if (confirm) confirm.onclick = function () {
        if (!pending) return;
        var tid = card.getAttribute('data-tid'), note = ta ? ta.value.trim() : '';
        confirm.disabled = true;
        api('adtoolSales', { op: pending, task_id: tid, note: note }).then(function () {
          toast(pending === 'task_done' ? 'Marked done' : 'Dismissed'); load();
        }).catch(function (e) { confirm.disabled = false; toast(e && e.message ? e.message : 'failed'); });
      };
    })(cards[c]);
  }

  /* small guards */
  function num(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  function pctNum(v) { var n = Number(v); return Math.abs(n) <= 1 ? n * 100 : n; }        /* 0.05 or 5 → 5 */
  function pctTxt(v) { return Math.round(pctNum(v)) + '%'; }
  function dcell(ymd) { return ymd ? esc(String(ymd).slice(0, 10)) : '<span style="color:var(--text-3)">—</span>'; }
  function D_today() { return SV.data && SV.data.today ? SV.data.today : adtUkDay(); }
  function countdown(today, ymd) {
    if (!ymd) return null;
    var a = new Date(today + 'T12:00:00Z'), b = new Date(String(ymd).slice(0, 10) + 'T12:00:00Z');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    var n = Math.round((b - a) / 86400000);
    if (n <= 0) return { txt: 'eligible now', cls: 'ready' };
    return { txt: 'in ' + n + ' day' + (n === 1 ? '' : 's'), cls: n <= 3 ? 'soon' : '' };
  }
})();
