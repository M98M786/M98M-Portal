/* view-adsCentre.js — Hasib items 10/18/22: the advertising command centre. Combined tiles →
 * per-account cards → per-item board in eBay's own vocabulary, fed by the intraday snapshot.
 * The waste rows (£3+ today, zero orders) lead the table, red, exactly per his rule. */
(function () {

  /* review 4: ad revenue = earnings. 10 Nov (owner): the centre is pinned into Husnain's portal,
     so a Team Lead may open it — spend, clicks, CPC, which campaigns are live, and the waste alarm,
     which is a loss alert and his to act on. Ad revenue is still earnings: the engine strips every
     one and sets spend_only, and acSpendOnly below removes the blocks that were only ever revenue
     (the organic/promoted split, the ad-revenue and ROAS columns) rather than drawing them empty. */
  var AC_ROLES = ['Advertising Manager', 'Management', 'Ops Head', 'Team Lead'];
  function acSpendOnly(d) { return !!(d && d.spend_only); }
  /* sort: {key:'', dir:-1} means "nothing chosen", which is the board's own order — the waste rows
     first, then the biggest spend today. A choice is remembered per browser under AC_SORT_KEY. */
  var AC = { timer: null, days: 14, period: '', acct: '', from: '', to: '', items: [], lastDays: 14, win: '14d', landNote: '', sort: { key: '', dir: -1 },
    /* 20 Nov (owner): the went-negative signals, read from the Signals feed and drawn here instead */
    neg: [], negAt: 0, negLoading: null, negDate: '', negProv: [] };
  var AC_NEG_TYPE = 'WENT NEGATIVE YESTERDAY';
  /* the window in words, for every heading that names it: today, yesterday, the dates picked, or the last N days */
  function acWin(d) {
    d = d || {};
    if (d.period === 'today') { return 'today'; }
    if (d.period === 'yesterday') { return 'yesterday'; }
    if (AC.from && AC.to && d.from && d.to) { return String(d.from) + ' \u2192 ' + String(d.to); }
    return 'last ' + (d.days || 14) + ' days';
  }
  var AC_SORT_KEY = 'm98m:adsCentre:sort';

  /* `acc-tbl`, not `ac-tbl`: view-adtool-campaigns.js declares its OWN `.ac-tbl` with a different
   body. VIEW_CSS is one array joined in splice order, and the two portals splice these files in a
   different order, so sharing the name made the same class resolve differently in each portal. That
   is precisely the drift the shared-shell design exists to prevent. Do not rename it back. */
VIEW_CSS.push(
    '.ac-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px}' +
    '.ac-tile{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2)}' +
    '.ac-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ac-tile .v{font-size:24px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.ac-tile.bad .v{color:var(--bad)}.ac-tile.gold .v{color:var(--gold-a)}' +
    '.ac-accs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}' +
    '.ac-acc{border:1px solid var(--gold-line);border-radius:11px;padding:10px 14px;background:var(--panel);font-size:12px;font-weight:700}' +
    '.ac-acc b{display:block;font-size:15px;font-variant-numeric:tabular-nums}' +
    '.ac-acc .w{color:var(--bad);font-size:10.5px;font-weight:800}' +
    '.acc-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:900px}' +
    '.acc-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);text-align:right;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.acc-tbl th:first-child{text-align:left}' +
    /* every heading of the per-item board sorts it (owner, 22 Oct) */
    '.acc-tbl th.acc-s{cursor:pointer;user-select:none}' +
    '.acc-tbl th.acc-s:hover{color:var(--gold-a)}' +
    '.acc-tbl th .acc-ar{color:var(--gold-a);margin-left:3px}' +
    '.acc-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.acc-tbl td:first-child{text-align:left;white-space:normal;min-width:240px}' +
    '.ac-waste td{background:var(--bad-soft,rgba(255,80,80,.08))}' +
    '.ac-waste td:first-child{border-left:3px solid var(--bad)}' +
    /* the two links under an item: eBay, and this listing\'s own Product history in a new tab */
    '.ac-eb{color:var(--text-3);font-weight:800;text-decoration:none}' +
    '.ac-eb:hover{color:var(--gold-a)}' +
    /* R7-8 organic vs promoted split */
    '.ac-split{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:var(--panel-2);margin-bottom:16px}' +
    '.ac-split-h{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin-bottom:9px}' +
    '.ac-bar{height:16px;border-radius:8px;overflow:hidden;background:var(--ok,#2fb170);display:flex}' +
    '.ac-bar-p{display:block;height:100%;background:var(--gold-a);border-right:2px solid var(--panel-2)}' +
    '.ac-bar-lg{display:flex;flex-wrap:wrap;gap:14px;margin-top:9px;font-size:12.5px;font-weight:700;align-items:center}' +
    '.ac-bar-lg b{font-weight:800}' +
    '.ac-lg-p b{color:var(--gold-a)}.ac-lg-o b{color:var(--ok,#2fb170)}' +
    '.ac-bar-tot{margin-left:auto;color:var(--text-3);font-weight:800}' +
    '.ac-split-note{font-size:11px;color:var(--text-3);font-weight:600;margin-top:9px;line-height:1.5}' +
    /* 20 Nov (owner): under every RED row, the listing's own Product history blocks — By period,
       All-time daily, Where its ads sit — drawn small enough to sit in one box with the row. */
    /* the outer board's cell rules are written for ITS cells; the child combinator keeps them off the
       small tables inside the box, which would otherwise inherit the red wash, the red left border and
       the 240px first column */
    '.acc-tbl > tbody > tr.ac-sub > td{padding:0 10px 12px;text-align:left;white-space:normal;background:var(--bad-soft,rgba(255,80,80,.05))}' +
    '.acc-tbl > tbody > tr.ac-sub > td:first-child{border-left:3px solid var(--bad);min-width:0}' +
    '.acc-tbl > tbody > tr.ac-sub:hover > td{background:var(--bad-soft,rgba(255,80,80,.05))}' +
    '.ac-d{width:0;min-width:100%;box-sizing:border-box;overflow:hidden;border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:10px 12px;font-size:11px;color:var(--text-2);line-height:1.45}' +
    /* one campaign = one short card: who/what/status on a line, then its money by window underneath,
       so the eighteen columns of the Product history table fit the box without a sideways scroll */
    '.ac-dcamp{border:1px solid var(--gold-line);border-radius:10px;padding:8px 10px;margin:6px 0 0;background:var(--panel)}' +
    '.ac-dch{display:flex;gap:6px 16px;flex-wrap:wrap;align-items:center;font-size:10.5px;margin:0 0 6px;color:var(--text)}' +
    '.ac-dch .ac-dkv{font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:800;margin-right:4px}' +
    '.ac-dt.ac-dwin{min-width:0;width:auto}' +
    '.ac-d h4{margin:0 0 3px;font-size:11.5px;font-weight:800;color:var(--text);display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}' +
    '.ac-dsrc{font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;white-space:nowrap}' +
    '.ac-dsrc.on{color:var(--gold-a);border-color:rgba(242,176,53,.5)}' +
    '.ac-dsub{font-size:10px;color:var(--text-3);line-height:1.5;margin:0 0 6px}' +
    '.ac-dsec{padding:8px 0 2px;border-top:1px solid var(--gold-line)}.ac-dsec:first-child{border-top:0;padding-top:0}' +
    '.ac-dopen{margin-left:auto;font-size:10px;font-weight:800;color:var(--gold-a);text-decoration:underline;text-underline-offset:2px;white-space:nowrap}' +
    '.ac-dt{width:auto;min-width:640px;border-collapse:collapse;font-size:10.5px;font-variant-numeric:tabular-nums}' +
    '.ac-dt th,.ac-dt td{background:transparent;border-left:0;min-width:0}' +
    '.ac-dt th{font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:3px 6px;border-bottom:1px solid var(--gold-line);text-align:right;white-space:nowrap}' +
    '.ac-dt th:first-child,.ac-dt td:first-child{text-align:left}' +
    '.ac-dt td{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.05);text-align:right;white-space:nowrap;color:var(--text-2)}' +
    '.ac-dt td:first-child{color:var(--text);font-weight:700;white-space:nowrap;min-width:0}' +
    '.ac-dt td .ac-dsm{display:block;font-size:9px;color:var(--text-3);font-weight:600;white-space:normal}' +
    '.ac-dmov{display:inline-block;margin-left:5px;padding:0 5px;border-radius:5px;font-size:8px;letter-spacing:.05em;text-transform:uppercase;font-weight:800;color:var(--gold-a);border:1px solid rgba(242,176,53,.4);vertical-align:1px}' +
    '.ac-dpill{display:inline-block;padding:1px 7px;border-radius:9px;font-size:9.5px;font-weight:800;border:1px solid rgba(242,176,53,.5);color:var(--gold-a)}' +
    '.ac-dchart{max-width:1100px}.ac-dchart svg{width:100%;height:auto;display:block}' +
    '.ac-dchart-ec{width:100%;min-height:200px}' +
    '.ac-d .at-dtabs{margin:0 0 6px}.ac-d .at-dtabs button{padding:4px 9px;font-size:11px}' +
    '.ac-dleg{display:flex;gap:12px;flex-wrap:wrap;font-size:9.5px;color:var(--text-3);font-weight:700;margin:0 0 4px}.ac-dleg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px;vertical-align:-1px}' +
    '.ac-dwait{color:var(--text-3);font-size:11px;padding:4px 0}' +
    /* 20 Nov (owner): the product's picture on every row, and the WENT NEGATIVE rows in their own
       colour (amber), before today's red rows, each with the same box underneath */
    '.ac-item{display:flex;gap:9px;align-items:flex-start;min-width:0}' +
    '.ac-item .adt-pc-img{width:42px;height:42px;border-radius:8px;flex:none}' +
    '.ac-item > div{min-width:0}' +
    '.ac-nline{font-size:9.5px;font-weight:800;color:var(--warn);margin-top:3px;white-space:normal;line-height:1.4}' +
    '.ac-nline span{color:var(--text-3);font-weight:700}' +
    '.ac-negh{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;font-size:11px;color:var(--text-2);font-weight:700;margin:0 0 6px}' +
    '.ac-negh b{color:var(--warn);text-transform:uppercase;letter-spacing:.06em;font-size:10.5px}' +
    '.ac-negsep{height:14px}' +
    '.acc-tbl > tbody > tr.ac-negd > td{padding:9px 10px 4px;text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--warn);background:transparent;border-bottom:1px solid var(--gold-line);white-space:nowrap}' +
    '.acc-tbl > tbody > tr.ac-negd > td span{color:var(--text-3);letter-spacing:0;text-transform:none;font-weight:700;margin-left:8px}' +
    '.ac-neg td{background:rgba(242,176,53,.11)}' +
    '.ac-neg td:first-child{border-left:3px solid var(--warn)}' +
    '.acc-tbl > tbody > tr.ac-sub.ac-subn > td{background:rgba(242,176,53,.06)}' +
    '.acc-tbl > tbody > tr.ac-sub.ac-subn > td:first-child{border-left:3px solid var(--warn)}' +
    '.acc-tbl > tbody > tr.ac-sub.ac-subn:hover > td{background:rgba(242,176,53,.06)}' +
    '.ac-nacts{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0 8px}' +
    '.ac-nacts .minibtn{padding:4px 9px;font-size:10.5px}' +
    '.ac-nackb{margin-left:auto;border-color:var(--gold-line-hi)}' +
    '.ac-nform{margin:0 0 8px}' +
    '.ac-nform textarea{width:100%;box-sizing:border-box;min-height:44px;border:1px solid var(--gold-line);border-radius:8px;background:var(--panel);color:var(--text);padding:6px 8px;font:inherit;font-size:11px}'
  );
  /* ── the went-negative signals, read from the same feed as the Signals page ──
     "Present that data before today's negative-going product, only those products on which no action is
     taken" (owner, 20 Nov). A signal counts as acted on the moment anyone acknowledges it; until then it
     sits here, newest day first, the biggest loss first within a day. */
  function acNegLoad(force) {
    var now = Date.now();
    if (!force && AC.negAt && now - AC.negAt < 60000) { return Promise.resolve(AC.neg); }
    if (AC.negLoading) { return AC.negLoading; }
    AC.negLoading = api('mySignals', {}).then(function (d) {
      AC.neg = ((d && d.signals) || []).filter(function (s) { return s && String(s.type || '') === AC_NEG_TYPE; });
      AC.negDate = String((d && d.date) || '');
      AC.negAt = Date.now(); AC.negLoading = null;
      if ($('acItems')) { acPaintItems(); }
      /* 21 Nov (owner): yesterday's negatives before the Sales Analysis tab exists — when the feed
         holds no card dated yesterday (UK), the engine's own day ledger stands in, marked provisional */
      var yd = acUkDay(-1);
      if (!AC.neg.some(function (s) { return String(s.date) === yd; })) {
        api('adsNegativeDay', { day: yd }).then(function (r) {
          AC.negProv = ((r && r.rows) || []).map(function (x) {
            return { type: AC_NEG_TYPE, date: yd, item_id: String(x.item_id), account: x.account, title: x.title, image: x.image, provisional: true,
              'Actual Profit': x.actual_profit, value: x.actual_profit, ad_spend: x.spend, orders: x.orders, units: x.units, pending_cost_orders: x.pending_cost_orders, actions: [], acked_by_me: false, acknowledged_by_others: [] };
          });
          if ($('acItems')) { acPaintItems(); }
        })['catch'](function () { AC.negProv = []; });
      } else { AC.negProv = []; }
      return AC.neg;
    })['catch'](function () { AC.negLoading = null; AC.negAt = Date.now(); return AC.neg; });
    return AC.negLoading;
  }
  function acUkDay(off) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(Date.now() + (off || 0) * 86400000)); }
  function acNegKey(s) { return [s.account, s.type, s.date, s.item_id].map(function (v) { return String(v == null ? '' : v); }).join('|'); }
  function acNegAll() { return (AC.neg || []).concat(AC.negProv || []); }
  function acNegFind(key) { var all = acNegAll(); for (var i = 0; i < all.length; i++) { if (acNegKey(all[i]) === key) { return all[i]; } } return null; }
  function acNegVal(s) { var v = s['Actual Profit']; if (v == null || v === '') { v = s.value; } return Number(v) || 0; }
  function acNorm(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function acNegRows() {
    return acNegAll().filter(function (s) {
      if (s.acked_by_me || (s.acknowledged_by_others && s.acknowledged_by_others.length) || (s.ack_history && s.ack_history.length)) { return false; }
      if (!String(s.item_id || '').trim()) { return false; }
      if (AC.acct) { var a = acNorm(s.account), w = acNorm(AC.acct); if (!(a === w || (a && w && (a.indexOf(w) >= 0 || w.indexOf(a) >= 0)))) { return false; } }
      return true;
    }).sort(function (a, b) { if (String(a.date) !== String(b.date)) { return String(a.date) < String(b.date) ? 1 : -1; } return acNegVal(a) - acNegVal(b); });
  }
  function acNegWhen(s) { var d = dDay(s.date); return String(s.date) === AC.negDate ? 'yesterday, ' + d : 'on ' + d; }
  /* the signal's own figures, as the card printed them: actual profit, then whichever of order earning,
     raw profit and ad fees the feed sent */
  function acNegBits(s) {
    var bits = [];
    if (s['Order Earning'] != null && s['Order Earning'] !== '') { bits.push('order earning ' + dGbp(s['Order Earning'])); }
    if (s['Raw Profit'] != null && s['Raw Profit'] !== '') { bits.push('raw profit ' + dGbp(s['Raw Profit'])); }
    if (s.ad_fees != null && s.ad_fees !== '') { bits.push('ad fees incl VAT ' + dGbp(s.ad_fees)); }
    if (s.provisional) {
      if (s.ad_spend != null) { bits.push('ad spend ' + dGbp(s.ad_spend)); }
      bits.push((s.orders || 0) + ' order' + (s.orders === 1 ? '' : 's') + (s.pending_cost_orders ? ', ' + s.pending_cost_orders + ' not costed yet' : ''));
    }
    return bits;
  }
  function acNegLine(s) {
    var who = String(s.owner_name || s.owner_email || '').trim();
    return 'WENT NEGATIVE ' + esc(String(s.date) === AC.negDate ? 'YESTERDAY' : dDay(s.date).toUpperCase()) + ' \u00b7 ACTUAL PROFIT ' + esc(dGbp(acNegVal(s))) +
      (acNegBits(s).length ? ' <span>\u00b7 ' + esc(acNegBits(s).join(' \u00b7 ')) + '</span>' : '') +
      (who ? ' <span>\u00b7 listed by ' + esc(who) + '</span>' : '') +
      (s.provisional ? ' <span>\u00b7 provisional, from the engine\u2019s ledger</span>' : '');
  }
  function acNegIntro(s) {
    var bits = acNegBits(s);
    if (s.provisional) {
      return 'This listing went negative ' + esc(acNegWhen(s)) + ', on the engine\u2019s own ledger: actual profit <b style="color:var(--warn)">' + esc(dGbp(acNegVal(s))) + '</b>' +
        (bits.length ? ' (' + esc(bits.join(', ')) + ')' : '') + '. The day\u2019s Sales Analysis tab has not been built yet, so this is provisional: the Signals card, with its Acknowledge, is raised when the tab lands. Its Product history, in the page\u2019s own order:';
    }
    return 'This listing went negative ' + esc(acNegWhen(s)) + ': actual profit <b style="color:var(--warn)">' + esc(dGbp(acNegVal(s))) + '</b>' +
      (bits.length ? ' (' + esc(bits.join(', ')) + ')' : '') + '. Nobody has acted on it yet. Its Product history, in the page\u2019s own order:';
  }
  /* the card's one-tap actions and the acknowledge-with-a-comment form, as the Signals page had them */
  function acNegActs(s) {
    if (s.provisional) { return '<div class="ac-dsub" style="margin:0 0 8px">No action buttons yet: they come with the Signals card once the day\u2019s Sales Analysis tab is built (the Product history link above is live now).</div>'; }
    var k = esc(acNegKey(s));
    var acts = (s.actions || []).map(function (a) { return String(a || '').trim(); }).filter(Boolean);
    return '<div class="ac-nacts">' + acts.map(function (a) { return '<button class="minibtn" data-ac-nact="go" data-ac-nkey="' + k + '" data-ac-nlabel="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') +
      '<button class="minibtn ac-nackb" data-ac-nact="ackopen" data-ac-nkey="' + k + '">Acknowledge\u2026</button></div>' +
      '<div class="ac-nform hidden" data-ac-nform="' + k + '"><textarea rows="2" placeholder="What did you find or do about this? (required)"></textarea>' +
      '<div class="ac-nacts" style="margin-top:6px"><button class="minibtn ac-nackb" style="margin-left:0" data-ac-nact="ack" data-ac-nkey="' + k + '">Acknowledge with this comment</button>' +
      '<button class="minibtn" data-ac-nact="ackcancel" data-ac-nkey="' + k + '">Cancel</button></div></div>';
  }
  function acNegForm(box, key) {
    var fs = box.querySelectorAll('[data-ac-nform]');
    for (var i = 0; i < fs.length; i++) { if (fs[i].getAttribute('data-ac-nform') === key) { return fs[i]; } }
    return null;
  }
  function acNegAck(s, form, btn) {
    var ta = form ? form.querySelector('textarea') : null, note = ta ? String(ta.value || '').trim() : '';
    if (!note) { toast('Write a comment first \u2014 what did you find or do about this listing?'); if (ta) { ta.focus(); } return; }
    if (s._busy) { return; }
    s._busy = true; btn.disabled = true; btn.textContent = 'Clearing\u2026';
    api('acknowledgeSignal', { account: s.account, type: s.type, date: s.date, item_id: s.item_id, note: note }).then(function () {
      var key = acNegKey(s);
      AC.neg = (AC.neg || []).filter(function (x) { return acNegKey(x) !== key; });
      toast('Acknowledged \u00b7 ' + String(s.title || s.item_id) + ' \u2014 off this list and logged.');
      acPaintItems();
    })['catch'](function (e) {
      s._busy = false; btn.disabled = false; btn.textContent = 'Acknowledge with this comment';
      toast('Not acknowledged: ' + ((e && e.message) || 'no answer'));
    });
  }
  function acNegWire(box) {
    box.onclick = function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('[data-ac-nact]') : null;
      if (!el || !box.contains(el)) { return; }
      var act = el.getAttribute('data-ac-nact'), key = el.getAttribute('data-ac-nkey'), s = acNegFind(key), form = acNegForm(box, key);
      if (!s) { return; }
      if (act === 'ackopen' || act === 'ackcancel') {
        if (form) { form.classList.toggle('hidden', act === 'ackcancel'); if (act === 'ackopen') { var ta = form.querySelector('textarea'); if (ta) { ta.focus(); } } }
        return;
      }
      if (act === 'go') {
        var lab = el.getAttribute('data-ac-nlabel') || '';
        if (typeof window.sgSignalGo === 'function' && window.sgSignalGo(lab)) { toast(lab + ' \u00b7 ' + String(s.item_id) + ' \u2014 it stays on the command centre until someone acknowledges it.'); }
        else { toast('That screen is not part of your version \u2014 ask Management to action \u201c' + lab + '\u201d.'); }
        return;
      }
      if (act === 'ack') { acNegAck(s, form, el); }
    };
  }
  /* the box's opening line and its action strip: a went-negative box carries the signal's own words
     and its actions; a red row's box carries the waste sentence */
  function acIntroFor(el) {
    var key = el && el.getAttribute ? el.getAttribute('data-ac-neg') : '', s = key ? acNegFind(key) : null;
    return s ? { intro: acNegIntro(s), acts: acNegActs(s) } : null;
  }
  /* the Product history answers, per listing, for the red rows' boxes; {data, err, at} */
  var AC_DET = {}, AC_DET_TTL = 10 * 60 * 1000, AC_DET_MAX = 80;
  function dNum(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }
  function dGbp(v, dp) { var n = dNum(v); if (n == null) { return '\u2014'; } var a = Math.abs(n); return (n < 0 ? '\u2212\u00a3' : '\u00a3') + (dp === 0 ? Math.round(a).toLocaleString('en-GB') : a.toFixed(2)); }
  function dCnt(v) { var n = dNum(v); return n == null ? '\u2014' : Math.round(n).toLocaleString('en-GB'); }
  function dRoas(v) { var n = dNum(v); return n == null ? '\u2014' : n.toFixed(2) + '\u00d7'; }
  function dDay(s) { s = String(s || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(s) ? s.slice(8) + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(s.slice(5, 7)) - 1] : '\u2014'; }
  function dProfit(v) { return typeof adtProfitCell === 'function' ? adtProfitCell(v, 0, 0) : dGbp(v); }
  function dSrc(t, on) { return '<span class="ac-dsrc' + (on ? ' on' : '') + '">' + esc(t) + '</span>'; }
  function dTypeTxt(f) { f = String(f || ''); return f === 'COST_PER_CLICK' ? 'CPC (Advanced)' : f === 'COST_PER_SALE' ? 'Cost per sale' : (f || '?'); }
  function dStamp(s) { s = String(s || ''); return s ? s.replace('T', ' ').slice(0, 16) : '\u2014'; }
  /* 1 · By period — the Product history table, the same rows and columns, smaller */
  function dPeriods(D) {
    var K = D.kpis || {}, so = !!D.spend_only;
    var firstDay = (D.days && D.days.length && D.days[0] && D.days[0].day) ? dDay(D.days[0].day) : '';
    var w = [['Yesterday', K.yesterday || {}], ['Last 7 days', K.d7 || {}], ['Last 30 days', K.d30 || {}], ['All time' + (firstDay ? ' (from ' + firstDay + ')' : ''), K.all || {}]];
    if (K.today && typeof K.today === 'object') { w.unshift(['Today so far', K.today]); }
    var pcOf = function (s) { return Number(s.pending_cost_orders !== undefined ? s.pending_cost_orders : s.pending) || 0; };
    var pfOf = function (s) { return Number(s.pending_fee_orders !== undefined ? s.pending_fee_orders : s.pending_fee) || 0; };
    var h = '<div class="ac-dsec"><h4>By period ' + dSrc('eBay ads report') + dSrc('orders') + '</h4>' +
      '<div class="ac-dsub">' + (so ? 'Today so far, yesterday, the last 7 and 30 days, and all time: what this listing spent on ads and what it sold.' : 'Today so far, yesterday, the last 7 and 30 days, and all time. Profit after eBay fees, product cost, ad spend and returns, the same way the Sales Analysis sheet works it out. Orders we cannot cost yet are left out and counted separately.') + '</div>' +
      '<div><table class="ac-dt ac-dwin"><thead><tr><th>Period</th><th>Ad spend</th><th>Units from ads</th>' + (so ? '' : '<th>ROAS</th>') + '<th>Orders</th><th>Units</th><th>Units not from ads</th>' + (so ? '' : '<th>Profit</th>') + '</tr></thead><tbody>' +
      w.map(function (x) {
        var s = x[1] || {}, pc = pcOf(s), pf = pfOf(s);
        var notAds = Math.max(0, (Number(s.units) || 0) - (Number(s.attr_units) || 0));
        var moving = x[0] === 'Today so far' || !!s.includes_today;
        var lab = esc(x[0]) + (moving ? '<span class="ac-dmov">still updating</span>' : '');
        if (s.ads_landing) {
          var ln = esc(String(s.landing_note || 'eBay has not published this day yet'));
          return '<tr><td>' + lab + '</td><td colspan="' + (so ? 2 : 3) + '"><span class="ac-dsm">' + ln + '</span></td><td>' + dCnt(s.orders || 0) + '</td><td>' + dCnt(s.units || 0) + '</td><td>\u2014</td>' + (so ? '' : '<td><span class="ac-dsm">' + ln + '</span></td>') + '</tr>';
        }
        var ro = s.roas != null ? s.roas : (Number(s.spend) > 0 && s.attr_revenue != null ? Number(s.attr_revenue) / Number(s.spend) : null);
        return '<tr><td>' + lab + '</td><td>' + dGbp(s.spend) + '</td><td>' + dCnt(s.attr_units || 0) + '</td>' + (so ? '' : '<td>' + dRoas(ro) + '</td>') +
          '<td>' + dCnt(s.orders || 0) + '</td><td>' + dCnt(s.units || 0) + '</td><td>' + dCnt(notAds) + '</td>' +
          (so ? '' : '<td>' + dProfit(s.actual_profit !== undefined ? s.actual_profit : s.actual) + (pc + pf > 0 ? '<span class="ac-dsm">' + (pc + pf) + ' order' + (pc + pf === 1 ? '' : 's') + ' not costed yet</span>' : '') + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    return h;
  }
  /* 2 · All-time daily — the Product history chart, drawn as inline SVG so the box needs no chart
     library: ad spend as faint bars on a right-hand £ scale, units from all channels as the gold line
     with its band, the 7-day average in white, units from ads as gold dots. */
  /* 2 · All-time daily — THE PRODUCT HISTORY CHART ITSELF (owner, 20 Nov: "exactly how it is reflected
     in the Product history page, for this and all products"). The drawing is the product page's own
     function, shared through window.ADT_DAILY, with the same Day / Week / Month tabs; the box only
     provides the element and remembers which tab each listing is on. */
  function dDaily(D, id) {
    var days = (D.days || []).filter(function (d) { return d && d.day; });
    var A = window.ADT_DAILY, mode = (AC_DET[id] && AC_DET[id].mode) || 'day';
    var h = '<div class="ac-dsec"><h4>All-time daily ' + dSrc('orders') + dSrc('eBay ads report') + '</h4>' +
      '<div class="ac-dsub">' + esc(A && A.sub ? A.sub : 'Units sold (green), ad spend (red) and the average ad spend (white).') + '</div>';
    if (!days.length) { return h + '<div class="ac-dwait">No day held for this listing yet.</div></div>'; }
    if (!A) { return h + '<div class="ac-dwait">The chart could not be drawn: the Product history module is not loaded.</div></div>'; }
    return h + A.tabs(mode, 'ac-dtabs') + '<div class="ac-dchart-ec" data-ac-daily="' + esc(id) + '"></div></div>';
  }
  /* wire the tabs and draw, once the box's HTML is in the page */
  function acDailyMount(root, id) {
    var A = window.ADT_DAILY, e = AC_DET[id];
    if (!A || !e || !e.data) { return; }
    var el = root.querySelector('[data-ac-daily="' + id + '"]'); if (!el) { return; }
    var days = (e.data.days || []).filter(function (d) { return d && d.day; });
    var tabs = root.querySelectorAll('.ac-dtabs button');
    var draw = function () { A.ensure().then(function () { A.draw(el, days, e.mode || 'day'); })['catch'](function (err) { el.innerHTML = '<div class="ac-dwait">' + esc((err && err.message) || 'The chart library did not load.') + '</div>'; }); };
    for (var i = 0; i < tabs.length; i++) tabs[i].onclick = function () { e.mode = this.getAttribute('data-dmode') || 'day'; for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j] === this); draw(); };
    draw();
  }
  /* 3 · Where its ads sit — the campaign rows as the Product history prints them */
  function dWhere(D) {
    var Wr = D.where && D.where.rows ? D.where.rows : null, C = D.campaigns || [], so = !!D.spend_only;
    var live = Wr ? Wr.filter(function (c) { return !(c && c.gone); }) : null;
    var nLive = live ? live.filter(function (c) { return c.campaign_running !== false && String(c.campaign_status || '').toUpperCase() !== 'ENDED'; }).length : 0;
    var h = '<div class="ac-dsec"><h4>Where its ads sit ' + dSrc('ad status, read per campaign') + (live ? dSrc(nLive === 1 ? 'in one campaign' : 'in ' + nLive + ' campaigns', true) : '') + '</h4>' +
      '<div class="ac-dsub">Which campaigns this listing is in, and what its own ad said when that campaign\u2019s ads were last read. Each status is a reading, not a live check, so the date of the reading is on every row.' +
      (D.where && D.where.dup && D.where.dup.why ? ' <b>' + esc(String(D.where.dup.why)) + '</b>' : '') +
      /* the eBay read is an object: when it was asked, and the engine's own note on what it found */
      (D.ebay_read && typeof D.ebay_read === 'object' && D.ebay_read.at ? ' <b>Read from eBay ' + esc(String(D.ebay_read.at).replace('T', ' ').slice(11, 19)) + '.</b>' + (D.ebay_read.note ? ' ' + esc(String(D.ebay_read.note)) : '') : '') +
      (Wr && D.where.note ? ' ' + esc(String(D.where.note)) + '.' : '') + '</div>';
    var nk = function (v, f) { return v == null ? '<span class="ac-dsm">no row</span>' : f(v); };
    if (live) {
      if (!live.length) { return h + '<div class="ac-dwait">Not in any campaign that is still on eBay.</div></div>'; }
      h += live.map(function (c) {
        var state = String(c.ad_state || c.ad_status || '?');
        var kv = function (k, v) { return '<span><span class="ac-dkv">' + k + '</span>' + v + '</span>'; };
        var head = '<div class="ac-dch">' +
          '<span style="font-weight:800">' + (typeof adtCampaignLink === 'function' ? adtCampaignLink(c.campaign_id, c.name) : esc(String(c.name || c.campaign_id))) + '</span>' +
          kv('Type', esc(dTypeTxt(c.funding))) + kv('Campaign status', esc(c.campaign_status || '?')) +
          kv('This ad, when last read', '<span class="ac-dpill">' + esc(state) + (c.live ? ' \u00b7 live' : '') + '</span>' + (c.ads_synced_at || c.synced_at ? ' <span class="ac-dsm" style="display:inline">read ' + esc(dStamp(c.ads_synced_at || c.synced_at)) + '</span>' : '')) +
          kv('Ad rate', esc(c.ad_bid ? c.ad_bid + '%' : (c.campaign_bid ? c.campaign_bid + '% (campaign)' : '\u2014'))) +
          kv('Daily budget', c.budget != null ? dGbp(c.budget, 0) : '\u2014') +
          kv('Last change', esc(dStamp(c.last_change))) + '</div>';
        /* 20 Nov (owner): on this page the card stops at this line — the money by window and the
           status-change history stay on the Product history page, which the box links to */
        return '<div class="ac-dcamp" style="margin-top:6px">' + head.replace('margin:0 0 6px', 'margin:0') + '</div>';
      }).join('');
      return h + '</div>';
    }
    if (!C.length) { return h + '<div class="ac-dwait">Not in any campaign we know about.</div></div>'; }
    return h + '<div><table class="ac-dt ac-dwin"><thead><tr><th>Campaign</th><th>Type</th><th>Campaign status</th><th>Ad status, when last read</th><th>Ad rate</th><th>Daily budget</th></tr></thead><tbody>' +
      C.map(function (c) { var st = c.funding === 'COST_PER_SALE' ? (c.ad_status === 'ARCHIVED' ? 'archived' : 'exists (live)') : (c.ad_status || 'unknown'); return '<tr><td>' + (typeof adtCampaignLink === 'function' ? adtCampaignLink(c.campaign_id || c.id, c.name) : esc(String(c.name || ''))) + '</td><td>' + esc(dTypeTxt(c.funding)) + '</td><td>' + esc(c.status || '?') + '</td><td>' + esc(st) + '</td><td>' + esc(c.bid ? c.bid + '%' : '\u2014') + '</td><td>' + (c.budget != null ? dGbp(c.budget, 0) : '\u2014') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  }
  function acDetailHtml(id, o) {
    var e = AC_DET[id];
    var open = '<a class="ac-dopen" href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener">the full Product history \u2197</a>';
    var intro = o && o.intro ? o.intro : 'This row is red: \u00a33+ spent today with no order. Its Product history, in the page\u2019s own order:';
    var acts = o && o.acts ? o.acts : '';
    var top = '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin:0 0 6px"><span class="ac-dsub" style="margin:0">' + intro + '</span>' + open + '</div>' + acts;
    if (!e || (!e.data && !e.err)) { return top + '<div class="ac-dwait">Reading this listing\u2019s Product history\u2026</div>'; }
    if (e.err) { return top + '<div class="ac-dwait">The Product history could not be read: ' + esc(e.err) + '</div>'; }
    var D = e.data;
    return top + dPeriods(D) + dDaily(D, id) + dWhere(D);
  }
  /* the red rows' Product histories are read one after another, never all at once, and kept for ten
     minutes so the two-minute board refresh does not re-ask for every one of them */
  function acDetailsLoad(box) {
    var els = box.querySelectorAll('[data-ac-det]'), ids = [], now = Date.now();
    for (var i = 0; i < els.length && ids.length < AC_DET_MAX; i++) {
      var id = els[i].getAttribute('data-ac-det'), e = AC_DET[id];
      if (!e || (!e.loading && (!e.at || now - e.at > AC_DET_TTL))) { ids.push(id); }
    }
    var next = function () {
      var id = ids.shift(); if (!id) { return; }
      AC_DET[id] = AC_DET[id] || {}; AC_DET[id].loading = true;
      api('adtoolListing', { item_id: id }).then(function (d) {
        AC_DET[id] = { data: d || {}, err: '', at: Date.now() };
      })['catch'](function (err) {
        AC_DET[id] = { data: null, err: (err && err.message) || 'no answer', at: Date.now() };
      }).then(function () {
        /* the same listing can be a went-negative row AND a red row: every box asking for it is filled */
        var els2 = box.querySelectorAll('[data-ac-det="' + id + '"]');
        for (var j = 0; j < els2.length; j++) { els2[j].innerHTML = acDetailHtml(id, acIntroFor(els2[j])); acDailyMount(els2[j], id); }
        next();
      });
    };
    next();
  }

  function acGBP(v) { var n = Number(v) || 0; return '£' + n.toFixed(2); }
  function acROAS(rev, sp) { return Number(sp) > 0.005 ? (Number(rev) / Number(sp)).toFixed(1) + '\u00d7' : '\u2014'; }
  function acNum(v) { return v == null || v === '' || isNaN(Number(v)) ? null : Number(v); }

  /* \u2500\u2500 the per-item board, sortable on every column (owner, 22 Oct: "add sort option on data in ad
     commands center"). The rows are already in hand, so a sort never asks the engine again. Each
     column heading says what it sorts by; numbers sort numerically, text alphabetically, and an
     empty cell sinks to the bottom whichever way the column is pointed. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  /* Owner's Change Spec, 28 Oct 2026: "Ads Command Centre (product click opens Product History in a
     new tab)". The title used to be the eBay link, so a click left the portal; it now opens this
     listing's own Product history in a tab of its own, and the eBay link keeps its place beside the
     item number. The hash carries the item, so a second tab shows ITS listing and not this one's. */
  var AC_COLS = [
    { key: 'title', label: 'Item', text: true, sorts: 'the listing title, A to Z',
      val: function (r) { return String(r.title || r.item_id || ''); },
      cell: function (r) { return acItemCell(r, ''); } },
    { key: 'spend_today', label: 'Spend today', sorts: 'what the listing has spent on ads today',
      val: function (r) { return acNum(r.spend_today); }, cell: function (r) { return acGBP(r.spend_today); } },
    { key: 'clicks_today', label: 'Clicks', sorts: 'clicks on the ad today',
      val: function (r) { return acNum(r.clicks_today); }, cell: function (r) { return r.clicks_today || 0; } },
    { key: 'cpc_today', label: 'Avg CPC', sorts: 'the average cost of a click today',
      val: function (r) { return acNum(r.cpc_today); }, cell: function (r) { return r.cpc_today ? acGBP(r.cpc_today) : '\u2014'; } },
    { key: 'sold_today', label: 'Sold via ads', sorts: 'units eBay credits to the ad today',
      val: function (r) { return acNum(r.sold_today); }, cell: function (r) { return r.sold_today || 0; } },
    { key: 'spend_14d', label: function () { return 'Spend ' + AC.win; }, sorts: 'ad spend over the window',
      val: function (r) { return acNum(r.spend_14d); }, cell: function (r) { return acGBP(r.spend_14d); } },
    { key: 'clicks_14d', label: function () { return 'Clicks ' + AC.win; }, sorts: 'clicks over the window',
      val: function (r) { return acNum(r.clicks_14d); }, cell: function (r) { return r.clicks_14d || 0; } },
    { key: 'sold_14d', label: function () { return 'Sold ' + AC.win; }, sorts: 'units from ads over the window',
      val: function (r) { return acNum(r.sold_14d); }, cell: function (r) { return r.sold_14d || 0; } }
  ];

  /* the Item cell: the product's picture (20 Nov, owner), the title opening its Product history, the
     number, the account, the two links, the waste verdict, and, on a went-negative row, the signal's line */
  function acItemCell(r, extra) {
    var id = String(r.item_id == null ? '' : r.item_id).trim();
    var known = /^\d{9,13}$/.test(id);
    var title = esc(String(r.title || r.item_id || '').slice(0, 80));
    var img = typeof safeUrl === 'function' ? safeUrl(r.image) : '';
    var pic = img ? '<img class="adt-pc-img" src="' + esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="adt-pc-img adt-pc-none" aria-hidden="true">\ud83d\udce6</span>';
    return '<div class="ac-item">' + pic + '<div>' + (known
          ? '<a href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" style="color:inherit" title="open this listing\u2019s Product history in a new tab">' + title + '</a>'
          : title) +
          '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(id) + ' \u00b7 ' + esc(String(r.account)) +
          (known ? ' \u00b7 <a class="ac-eb" href="https://www.ebay.co.uk/itm/' + esc(id) + '" target="_blank" rel="noopener noreferrer" title="open on eBay">eBay \u2197</a>' +
            ' \u00b7 <a class="ac-eb" href="#adtoolProduct/' + esc(id) + '" target="_blank" rel="noopener" title="open this listing\u2019s Product history in a new tab">History \u2197</a>' : '') +
          (r.waste ? ' \u00b7 <b style="color:var(--bad)">\u00a33+ TODAY, NO ORDER \u2014 PAUSE OR FIX</b>' : '') + '</div>' +
          (extra ? '<div class="ac-nline">' + extra + '</div>' : '') + '</div></div>';
  }
  function acCol(key) {
    for (var i = 0; i < AC_COLS.length; i++) { if (AC_COLS[i].key === key) { return AC_COLS[i]; } }
    return null;
  }
  function acLabel(c) { return typeof c.label === 'function' ? c.label() : c.label; }
  function acSortRestore() {
    try {
      var raw = localStorage.getItem(AC_SORT_KEY);
      if (!raw) { return; }
      var s = JSON.parse(raw);
      if (s && acCol(s.key)) { AC.sort = { key: s.key, dir: Number(s.dir) < 0 ? -1 : 1 }; }
    } catch (e) {}
  }
  function acSortSave() { try { localStorage.setItem(AC_SORT_KEY, JSON.stringify(AC.sort)); } catch (e) {} }
  function acSortRows(rows) {
    var out = rows.slice();
    var col = AC.sort.key ? acCol(AC.sort.key) : null;
    if (!col) {
      /* Nothing chosen: the board's own order, reproduced key for key — waste rows first, then the
         biggest spend today, then the biggest spend over the window. That third key is not decoration:
         every listing on the board for its window spend alone has nought spend today, so without it a
         long tail of rows ties and their order depends on the sort being a stable one. */
      return out.sort(function (a, b) {
        var wa = a.waste ? 1 : 0, wb = b.waste ? 1 : 0;
        if (wa !== wb) { return wb - wa; }
        var sa = acNum(a.spend_today) || 0, sb = acNum(b.spend_today) || 0;
        if (sa !== sb) { return sb - sa; }
        return (acNum(b.spend_14d) || 0) - (acNum(a.spend_14d) || 0);
      });
    }
    var dir = AC.sort.dir;
    return out.sort(function (a, b) {
      var va = col.val(a), vb = col.val(b);
      if (col.text) {
        va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase();
        if (!va && vb) { return 1; }
        if (va && !vb) { return -1; }                          /* an empty name sinks either way */
        return va < vb ? -dir : (va > vb ? dir : 0);
      }
      if (va == null && vb == null) { return 0; }
      if (va == null) { return 1; }
      if (vb == null) { return -1; }                           /* nulls sink whichever way we sort */
      return (va - vb) * dir;
    });
  }
  function acPaintItems() {
    var box = $('acItems');
    if (!box) { return; }
    var rows = AC.items || [], neg = acNegRows();
    if (!rows.length && !neg.length) {
      /* "Nothing is recorded" and "eBay has not sent it" are different answers and a reader acts on
         them differently: the first reads as a quiet day. Where the engine says the report for the
         day has not landed, its own sentence is what goes here. */
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' +
        (AC.landNote ? esc(AC.landNote) + '.'
          : AC.period === 'yesterday' ? 'Nothing is recorded for yesterday yet.'
          : 'No ad activity recorded yet today \u2014 eBay produces the first same-day report at about 08:05 UK, so nothing can be read before then.') + '</div>';
      return;
    }
    /* with Today chosen the window IS today, so the three window columns would repeat the three
       beside them; they are left out rather than printed twice */
    var cols = AC.win === 'today' ? AC_COLS.filter(function (c) { return !/_14d$/.test(c.key); }) : AC_COLS;
    var head = '<thead><tr>' + cols.map(function (c) {
      var on = AC.sort.key === c.key;
      return '<th class="acc-s" data-ac-k="' + esc(c.key) + '" title="' + esc('Sort by ' + c.sorts) + '">' +
        esc(acLabel(c)) + (on ? '<span class="acc-ar">' + (AC.sort.dir < 0 ? '\u25bc' : '\u25b2') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead>';
    var h = '';
    /* 20 Nov (owner): the WENT NEGATIVE listings nobody has acted on, before today's red rows, in
       their own colour, each with the same Product history box underneath; the board's own figures
       fill the other columns where the listing is on today's board */
    if (neg.length) {
      var byId = {}; rows.forEach(function (r) { byId[String(r.item_id)] = r; });
      h += '<div class="ac-negh"><b>Went negative</b><span>' + neg.length + ' listing' + (neg.length === 1 ? '' : 's') + ' lost money on the day named and nobody has acted on ' + (neg.length === 1 ? 'it' : 'them') + ' yet \u00b7 from the Signals feed \u00b7 acknowledging one, with a comment, takes it off this list</span></div>' +
        '<div class="scroll"><table class="acc-tbl">' + head + '<tbody>';
      var lastDay = null, perDay = {}; neg.forEach(function (s) { perDay[String(s.date)] = (perDay[String(s.date)] || 0) + 1; });
      neg.forEach(function (s) {
        var id = String(s.item_id), known = /^\d{9,13}$/.test(id), r = known ? byId[id] : null;
        if (String(s.date) !== lastDay) {
          lastDay = String(s.date);
          h += '<tr class="ac-negd"><td colspan="' + cols.length + '">Went negative ' + esc(acNegWhen(s).replace(/^on /, '')) + '<span>' + perDay[lastDay] + ' listing' + (perDay[lastDay] === 1 ? '' : 's') + (s.provisional ? ' \u00b7 provisional, from the engine\u2019s ledger until the day\u2019s Sales Analysis tab is built' : ', not acted on') + '</span></td></tr>';
        }
        var cell = { item_id: known ? id : '', account: (r && r.account) || s.account, title: (r && r.title) || s.title || id, image: (r && r.image) || s.image || null, waste: !!(r && r.waste) };
        h += '<tr class="ac-neg">' + cols.map(function (c, i) {
          return '<td>' + (i === 0 ? acItemCell(cell, acNegLine(s)) : (r ? c.cell(r) : '<span style="color:var(--text-3)">\u2014</span>')) + '</td>';
        }).join('') + '</tr>';
        if (known) {
          h += '<tr class="ac-sub ac-subn"><td colspan="' + cols.length + '"><div class="ac-d" data-ac-det="' + esc(id) + '" data-ac-neg="' + esc(acNegKey(s)) + '">' + acDetailHtml(id, { intro: acNegIntro(s), acts: acNegActs(s) }) + '</div></td></tr>';
        } else {
          /* the Main Sheet knew this listing only by its title, so there is no number to fetch a
             Product history with: the signal's own words and its actions, and nothing invented */
          h += '<tr class="ac-sub ac-subn"><td colspan="' + cols.length + '"><div class="ac-d" data-ac-neg="' + esc(acNegKey(s)) + '">' +
            '<div class="ac-dsub" style="margin:0 0 6px">' + acNegIntro(s).replace(/ Its Product history.*$/, '') + ' The Main Sheet carries no eBay number for it, so no Product history can be drawn here.</div>' + acNegActs(s) + '</div></td></tr>';
        }
      });
      h += '</tbody></table></div>' + (rows.length ? '<div class="ac-negsep"></div>' : '');
    }
    if (rows.length) {
      h += '<div class="scroll"><table class="acc-tbl">' + head + '<tbody>';
      acSortRows(rows).forEach(function (r) {
        h += '<tr' + (r.waste ? ' class="ac-waste"' : '') + '>' +
          cols.map(function (c) { return '<td>' + c.cell(r) + '</td>'; }).join('') + '</tr>';
        /* 20 Nov (owner): a red row carries its Product history underneath, in one box */
        var did = String(r.item_id == null ? '' : r.item_id).trim();
        if (r.waste && /^\d{9,13}$/.test(did)) {
          h += '<tr class="ac-sub"><td colspan="' + cols.length + '"><div class="ac-d" data-ac-det="' + esc(did) + '">' + acDetailHtml(did) + '</div></td></tr>';
        }
      });
      h += '</tbody></table></div>';
    } else {
      h += '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' +
        (AC.landNote ? esc(AC.landNote) + '.'
          : AC.period === 'yesterday' ? 'Nothing is recorded for yesterday yet.'
          : 'No ad activity recorded yet today \u2014 eBay produces the first same-day report at about 08:05 UK, so nothing can be read before then.') + '</div>';
    }
    box.innerHTML = h;
    /* boxes already holding their answer draw their chart now; the rest draw when it lands */
    Array.prototype.forEach.call(box.querySelectorAll('[data-ac-det]'), function (d) { acDailyMount(d, d.getAttribute('data-ac-det')); });
    acDetailsLoad(box);
    acNegWire(box);
    var ths = box.querySelectorAll('th[data-ac-k]');
    for (var i = 0; i < ths.length; i++) ths[i].onclick = function () {
      var k = this.getAttribute('data-ac-k'), col = acCol(k);
      if (!col) { return; }
      if (AC.sort.key === k) { AC.sort.dir = -AC.sort.dir; }
      else { AC.sort = { key: k, dir: col.text ? 1 : -1 }; }
      acSortSave();
      acPaintItems();
    };
  }

  function acLoad() {
    var box = $('acBody');
    if (!box) { return; }
    var payload = AC.period ? { period: AC.period } : { days: AC.days };
    if (AC.acct) { payload.account = AC.acct; }
    if (!AC.period && AC.from && AC.to) { payload.from = AC.from; payload.to = AC.to; }
    acNegLoad();
    api('adsBoard', payload).then(function (d) {
      d = d || {};
      var c = d.combined || {};
      var h = '<div class="ac-tiles">' +
        '<div class="ac-tile gold"><div class="k">Spend today · all accounts</div><div class="v">' + acGBP(c.spend_today) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Clicks today</div><div class="v">' + (c.clicks_today || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Sold via ads today</div><div class="v">' + (c.sold_today || 0) + '</div></div>' +
        '<div class="ac-tile' + (c.waste_n ? ' bad' : '') + '"><div class="k">Wasting £3+ · no order</div><div class="v">' + (c.waste_n || 0) + '</div></div>' +
        '<div class="ac-tile"><div class="k">Spend · ' + esc(acWin(d)) + '</div><div class="v">' + acGBP(c.spend_14d) + '</div></div>' +
      '</div>';
      if (d.window_source) { h += '<div class="ac-split-note" style="margin:-4px 0 10px">Window figures from ' + esc(String(d.window_source)) + '.</div>'; }
      /* A DAY IN THIS WINDOW EBAY'S REPORT HAS NOT LANDED FOR (owner, 11 Nov: the whole portal read
         yesterday as 0.00). This board reads eBay's own daily table, so such a day has no row at all
         and every figure below would be a nought nobody earned. The engine names the day and writes
         the sentence, so this line and every By period table in the tool say the same thing. */
      if (d.ads_landing) {
        h += '<div class="ac-split-note" style="margin:-4px 0 10px;color:var(--bad);font-weight:800">' +
          esc(String(d.landing_note || '')) + ', so the spend and the sales for ' +
          (Number((d.landing_days || []).length) === 1 ? 'that day' : 'those days') + ' are not in these figures.</div>';
      }
      /* THE PEAK LIST'S DAY-STOPS (owner, 10 Nov): one line, and the figure that matters is the last
         one — what those listings have spent SINCE they were stopped, which on a stop that reached eBay
         should read nothing at all. Drawn only where the answer carries the count, because null is not
         nought: an older engine says nothing here rather than "none stopped". */
      var PS = d.peak_stops_today;
      if (PS && acNum(PS.count) != null) {
        h += '<div class="ac-split-note" style="margin:-4px 0 10px">Peak list, today: ' +
          (Number(PS.count) === 0
            ? 'nothing stopped by the spend rule'
            : '<b>' + PS.count + '</b> ' + (Number(PS.count) === 1 ? 'listing' : 'listings') + ' stopped for spending without selling' +
              (acNum(PS.spend_at_stop) == null ? '' : ', ' + acGBP(PS.spend_at_stop) + ' spent by then') +
              (acNum(PS.spend_since) == null ? ' · what they have spent since is not in this answer'
                : ' · <b>' + acGBP(PS.spend_since) + '</b> spent since')) +
          (PS.problem ? ' · ' + esc(String(PS.problem)) : '') + '.</div>';
      }
      /* R7-8 (Hasib): "organic vs promoted sales stats everywhere". Promoted = eBay-attributed
         ad revenue; organic = the rest. Combined bar + per-account split over the window. */
      var sp = d.split_total || {}, spl = d.split || [];
      if (acSpendOnly(d)) { sp = {}; spl = []; }   // the split is sale revenue end to end
      if (d.split_incomplete) {
        h += '<div class="ac-split"><div class="ac-split-h">Organic vs promoted sales · ' + esc(acWin(d)) + '</div>' +
          '<div class="ac-split-note">The day\u2019s sales total has not been rolled up yet, so the split cannot be drawn honestly; the ads alone are credited with ' + acGBP((d.series && d.series[0] && Number(d.series[0].rev)) || sp.promoted_rev) + ' of revenue so far. It fills in once the sales roll-up and eBay\u2019s published report land.</div></div>';
      } else if (Number(sp.total_rev)) {
        var promoPct = Number(sp.promoted_pct) || 0, orgPct = Number(sp.organic_pct);
        if (!isFinite(orgPct)) { orgPct = 100 - promoPct; }
        var rangeLabel = acWin(d);
        h += '<div class="ac-split"><div class="ac-split-h">Organic vs promoted sales · ' + esc(rangeLabel) + '</div>' +
          '<div class="ac-bar"><span class="ac-bar-p" style="width:' + Math.max(0, Math.min(100, promoPct)) + '%"></span></div>' +
          '<div class="ac-bar-lg"><span class="ac-lg-p"><b>Promoted</b> ' + acGBP(sp.promoted_rev) + ' · ' + promoPct.toFixed(1) + '%</span>' +
          '<span class="ac-lg-o"><b>Organic</b> ' + acGBP(sp.organic_rev) + ' · ' + orgPct.toFixed(1) + '%</span>' +
          '<span class="ac-bar-tot">Total ' + acGBP(sp.total_rev) + '</span></div>';
        if (spl.length > 1 && !AC.acct) {
          h += '<div class="scroll" style="max-height:220px;margin-top:8px"><table class="acc-tbl" style="min-width:480px"><thead><tr>' +
            '<th style="text-align:left">Account</th><th>Total</th><th>Promoted</th><th>Organic</th><th>Promoted %</th></tr></thead><tbody>';
          spl.forEach(function (r) {
            h += '<tr><td style="text-align:left;font-weight:800">' + esc(String(r.account)) + '</td>' +
              '<td>' + acGBP(r.total_rev) + '</td><td>' + acGBP(r.promoted_rev) + '</td><td>' + acGBP(r.organic_rev) + '</td>' +
              '<td style="font-weight:800;color:' + (Number(r.promoted_pct) > 60 ? 'var(--warn)' : 'var(--text)') + '">' + (Number(r.promoted_pct) || 0).toFixed(1) + '%</td></tr>';
          });
          h += '</tbody></table></div>';
        }
        h += '<div class="ac-split-note">Promoted is what eBay credits to the ads; organic is the rest of the sale revenue. From the finance feed, over the window above.</div></div>';
      }
      /* the history — every previous day's spend, clicks and ad-attributed sales in the window */
      var ser = d.series || [];
      if (ser.length) {
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:4px 0 4px">Day by day · ' + esc(acWin(d)) + '</div>' +
          '<div class="scroll" style="max-height:220px;margin-bottom:14px"><table class="acc-tbl" style="min-width:520px"><thead><tr>' +
          '<th>Date</th><th>Spend</th>' + (acSpendOnly(d) ? '' : '<th>Ad revenue</th><th>ROAS</th>') + '<th>Clicks</th><th>Avg CPC</th><th>Sold via ads</th></tr></thead><tbody>';
        ser.forEach(function (r) {
          h += '<tr><td style="text-align:left">' + esc(String(r.date)) + '</td>' +
            '<td>' + acGBP(r.spend) + '</td>' +
            (acSpendOnly(d) ? '' : '<td>' + (Number(r.rev) ? acGBP(r.rev) : '\u2014') + '</td>' +
            '<td>' + acROAS(r.rev, r.spend) + '</td>') +
            '<td>' + (r.clicks || 0) + '</td>' +
            '<td>' + (Number(r.clicks) ? acGBP(Number(r.spend) / Number(r.clicks)) : '\u2014') + '</td>' +
            '<td>' + (r.sold || 0) + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      /* account-to-account, day by day (review 3): every account's spend, revenue and ROAS
         per day inside the chosen window */
      var sba = d.series_by_account || [];
      if (sba.length && !AC.acct) {
        var byA = {};
        sba.forEach(function (r) { (byA[r.account] = byA[r.account] || []).push(r); });
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:4px 0 4px">Account to account \u00b7 spend / revenue / ROAS per day</div>' +
          '<div class="scroll" style="max-height:260px;margin-bottom:14px"><table class="acc-tbl" style="min-width:560px"><thead><tr>' +
          '<th style="text-align:left">Account</th><th>Days</th><th>Spend</th><th>Ad revenue</th><th>ROAS</th><th>Worst day</th><th>Best day</th></tr></thead><tbody>';
        Object.keys(byA).forEach(function (a) {
          var list = byA[a];
          var sp = 0, rv = 0, worst = null, best = null;
          list.forEach(function (r) {
            sp += Number(r.spend) || 0; rv += Number(r.rev) || 0;
            var ro = Number(r.spend) > 0.005 ? Number(r.rev) / Number(r.spend) : null;
            if (ro !== null) {
              if (!worst || ro < worst.ro) { worst = { d: r.date, ro: ro }; }
              if (!best || ro > best.ro) { best = { d: r.date, ro: ro }; }
            }
          });
          h += '<tr><td style="text-align:left;font-weight:800">' + esc(a) + '</td><td>' + list.length + '</td>' +
            '<td>' + acGBP(sp) + '</td><td>' + acGBP(rv) + '</td>' +
            '<td style="font-weight:800;color:' + (sp > 0.005 && rv / sp < 5 ? 'var(--warn)' : 'var(--ok)') + '">' + acROAS(rv, sp) + '</td>' +
            '<td>' + (worst ? esc(String(worst.d).slice(5)) + ' \u00b7 ' + worst.ro.toFixed(1) + '\u00d7' : '\u2014') + '</td>' +
            '<td>' + (best ? esc(String(best.d).slice(5)) + ' \u00b7 ' + best.ro.toFixed(1) + '\u00d7' : '\u2014') + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<div class="ac-accs">' + (d.accounts || []).map(function (a) {
        return '<div class="ac-acc">' + esc(String(a.account)) + '<b>' + acGBP(a.spend) + ' today</b>' +
          a.clicks + ' clicks · ' + a.sold + ' sold' + (a.waste_n ? '<div class="w">' + a.waste_n + ' wasting</div>' : '') + '</div>';
      }).join('') + '</div>';
      /* the per-item board is painted on its own so a sort can redraw it without asking the engine again */
      AC.items = (d.items || []).filter(function (r) { return r && typeof r === 'object'; });
      AC.lastDays = Number(d.days) || 14;
      /* the sentence travels with the board so the per-item table, which is painted on its own when
         a sort redraws it, says the same thing as the line above it */
      AC.landNote = d.ads_landing ? String(d.landing_note || '') : '';
      AC.win = d.period === 'today' ? 'today' : d.period === 'yesterday' ? 'yesterday' : AC.lastDays + 'd';
      h += '<div id="acItems"></div>';
      h += '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">Snapshot ' +
        esc(String(d.updated_at || '—')) + ' UTC · ' + esc(String(d.note || '')) + '</p>';
      box.innerHTML = h;
      acPaintItems();
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load the board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.adsCentre = {
    label: 'Ads command centre',
    order: 7.5,
    roles: AC_ROLES,
    icon: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
    prefetch: function () { return api('adsBoard', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Ads <span class="goldtext">command centre</span></h1>' +
          '<span class="sub">every advertised item, live CPC, the waste alarm, and every previous day, combined: per account, per item</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px">' +
            '<button class="minibtn" data-ac-p="today">Today</button>' +
            '<button class="minibtn" data-ac-p="yesterday">Yesterday</button>' +
            '<button class="minibtn" data-ac-d="3">3d</button>' +
            '<button class="minibtn" data-ac-d="7">7d</button>' +
            '<button class="minibtn on" data-ac-d="14">14d</button>' +
            '<button class="minibtn" data-ac-d="30">30d</button>' +
            '<button class="minibtn" data-ac-d="60">60d</button>' +
            '<select id="acAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
            '<input type="date" id="acFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="acTo" class="minibtn" style="padding:5px 6px">' +
            '<button class="minibtn" id="acApply">Apply</button>' +
            '<button class="minibtn" id="acRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="acBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      acSortRestore();
      var rf = $('acRefresh');
      /* Refresh re-reads the window on screen; it no longer throws the picked dates away */
      if (rf) { rf.onclick = function () { acLoad(); }; }
      var chipsOff = function () { document.querySelectorAll('[data-ac-d],[data-ac-p]').forEach(function (x) { x.classList.remove('on'); }); };
      var chipOn = function (sel) { var b = document.querySelector(sel); if (b) { b.classList.add('on'); } };
      if (AC.period) { chipsOff(); chipOn('[data-ac-p="' + AC.period + '"]'); }
      else if (!(AC.from && AC.to)) { chipsOff(); chipOn('[data-ac-d="' + AC.days + '"]'); }
      else { chipsOff(); }
      var sel = $('acAcct');
      if (sel) {
        fillAccountSelect(sel, AC.acct || '', function () { AC.acct = sel.value; acLoad(); });
      }
      var ap = $('acApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('acFrom'), t = $('acTo');
          if (f && t && f.value && t.value) { AC.from = f.value; AC.to = t.value; AC.period = ''; chipsOff(); acLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      document.querySelectorAll('[data-ac-d]').forEach(function (b) {
        b.onclick = function () {
          chipsOff(); this.classList.add('on');
          AC.days = Number(this.getAttribute('data-ac-d')) || 14;
          AC.period = ''; AC.from = ''; AC.to = '';     /* a day chip is a whole window; picked dates no longer override it */
          acLoad();
        };
      });
      document.querySelectorAll('[data-ac-p]').forEach(function (b) {
        b.onclick = function () {
          chipsOff(); this.classList.add('on');
          AC.period = this.getAttribute('data-ac-p') || ''; AC.from = ''; AC.to = '';
          acLoad();
        };
      });
      acLoad();
      if (AC.timer) { clearInterval(AC.timer); }
      AC.timer = setInterval(function () { if ($('acBody') && STATE.idToken) { acLoad(); } else { clearInterval(AC.timer); AC.timer = null; } }, 120000);
    }
  };
})();
