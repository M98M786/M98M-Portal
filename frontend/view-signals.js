/* Phase 6 — §27 SIGNALS on the screen, plus the §28.1 two taps in the top bar.
 * Exports: renderSignalCards(container) for the HOME screen · VIEWS.signals (everything pinned).
 * Backend: mySignals, acknowledgeSignal · clockIn, clockOut, myAttendance.
 *
 * §27 calls these "the loudest elements on any screen", so the pinned cards are drawn ABOVE the
 * greeting, in Royal alert styling, and stay until this person acknowledges them.
 *
 * Three constraints the code cannot show on its own:
 *  · The server (Signals.gs) serves the two money signals only to profit-cleared roles, so where a
 *    money type is on screen at all, printing its `value` as money is safe. Everything else is
 *    printed ONLY when the field is actually present in the payload — a lister receives the returns
 *    card with counts and reasons and no money keys at all (RL-4 strips them server-side), and the
 *    card is laid out so those rows are absent rather than empty.
 *  · SIGNALS.item_id carries the eBay number when the account's Main Sheet knew it and the item's
 *    own TITLE when it did not (the Sales Analysis daily tabs carry no number — REALITY over §27).
 *    So it is echoed back to acknowledgeSignal verbatim but only shown as a number when it is one.
 *  · The one-tap actions are the server's own list (SIG_ACTIONS) and are never invented here; each
 *    opens the screen that owns that job. A label this build has no screen for renders as a step to
 *    do, not as a button that does nothing.
 *
 * Performance: one mySignals payload feeds the home pins and this view, cached for a minute; the
 * cards are read from DASH_CACHE server-side and never recomputed per viewer. The attendance state
 * is asked for in the same tick as the signals, so the shell batches both into ONE round trip.
 */
(function () {
  'use strict';

  // ---------- the launch set, spelled exactly as the server and §27 spell it ----------
  var SG_NEGATIVE = 'WENT NEGATIVE YESTERDAY';
  var SG_WORST_CPC = 'WORST CPC PERFORMER YESTERDAY';
  var SG_RETURNS = 'RETURNS ABOVE USUAL';

  /* SIG_ACTIONS, verbatim, mapped to the screens that own the work. First key the person's own
     version carries wins; §9.4b's three advertising steps all live on the Advertising screen. */
  var SG_ACTION_VIEWS = {
    'open record': ['viewer', 'sheets', 'cs', 'advertising'],
    'create revision task': ['tasks', 'listing'],
    'flag to advertising': ['advertising', 'wrongAds', 'inbox'],
    'pause': ['advertising'],
    'day-4 verdict': ['advertising'],
    'move tier': ['advertising'],
    'open case history': ['returns', 'cs']
  };

  /* A pinned card is a fact about yesterday: a minute-old copy is current, and 13 people reloading
     their home screen must not each start a fresh read. Recompute happens only on an explicit tap. */
  var SG_TTL_MS = 60000;
  var SG_ATT_TTL_MS = 120000;
  /* Home shows the loudest few; the rest are one tap away on the Signals screen. A manager with
     thirty pinned cards must still be able to reach the rest of their home screen. */
  var SG_HOME_MAX = 4;

  var SG = {
    data: null, at: 0, loading: null,
    att: null, attAt: 0, attLoading: null,
    epoch: 0, mountedEpoch: -1, busy: {}, clockBusy: false
  };

  VIEW_CSS.push([
    /* .scroll and .minibtn belong to the Royal preview but are not in the shell's stylesheet yet;
       these are the preview's own values, identical in every view module. */
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}',
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}',

    '.sig-pins{display:grid;gap:14px;margin-bottom:20px}',
    '.sig-list{display:grid;gap:14px}',
    /* Royal alert card: the accent rail carries the status colour and pulses while the card is
       still pinned — gold is reserved for money and winning, and none of these is winning. */
    '.sig{position:relative;border-radius:var(--radius);border:1px solid var(--gold-line-hi);background:linear-gradient(180deg,var(--panel-2),var(--panel));box-shadow:0 12px 34px rgba(0,0,0,.34);overflow:hidden;transition:opacity .3s,transform .3s,margin .3s,max-height .3s;max-height:1400px}',
    '.sig.sig-bad{--sig-c:var(--bad);--sig-s:var(--bad-soft)}',
    '.sig.sig-warn{--sig-c:var(--warn);--sig-s:var(--warn-soft)}',
    '.sig::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--sig-c);animation:sigRail 2.4s ease-in-out infinite}',
    '@keyframes sigRail{0%,100%{opacity:1}50%{opacity:.45}}',
    '.sig.sig-gone{opacity:0;transform:translateX(26px);max-height:0;margin-top:-14px}',
    '.sig-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:13px 16px 0 20px}',
    '.sig-type{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--sig-c)}',
    '.sig-type svg{width:15px;height:15px;flex:none;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}',
    '.pill.sig-acct{background:rgba(120,132,152,.16);color:var(--text-2)}',
    '.pill.sig-mine{background:var(--sig-s);color:var(--sig-c)}',
    '.sig-when{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--text-3);white-space:nowrap}',
    '.sig-bd{display:flex;gap:14px;padding:11px 16px 13px 20px;min-width:0}',
    '.sig-thumb{width:74px;height:74px;flex:none;border-radius:10px;overflow:hidden;border:1px solid var(--gold-line);background:var(--panel);display:grid;place-items:center}',
    '.sig-thumb img{width:100%;height:100%;object-fit:cover;display:block}',
    '.sig-thumb .ph{font-size:15px;font-weight:800;color:var(--text-3);letter-spacing:.06em}',
    '.sig-info{flex:1;min-width:0}',
    '.sig-title{font-weight:800;font-size:14px;line-height:1.35;overflow-wrap:anywhere}',
    '.sig-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:5px;font-size:11.5px;font-weight:700;color:var(--text-3)}',
    '.sig-figs{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px;margin-top:12px}',
    '.sig-fig .k{display:block;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3)}',
    '.sig-fig b{display:block;margin-top:2px;font-size:16px;font-weight:800}',
    '.sig-fig.big b{font-size:27px;line-height:1.08;letter-spacing:-.01em}',
    '.sig-fig.loss b{color:var(--sig-c)}',
    /* Money that is still money gets the metallic treatment; the minus figure never does. */
    '.sig-fig.gold b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}',
    '.sig-vs{align-self:center;padding-bottom:5px;font-size:11.5px;font-weight:800;color:var(--text-3);letter-spacing:.08em}',
    '.sig-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}',
    '.sig-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;border:1px solid var(--gold-line);font-size:11.5px;font-weight:700;color:var(--text-2);min-width:0}',
    '.sig-chip b{color:var(--sig-c);font-weight:800}',
    '.sig-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}',
    '.sig-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 16px 13px 20px}',
    '.sig-todo{padding:6px 12px;border-radius:8px;border:1px dashed rgba(120,132,152,.35);font-size:12px;font-weight:800;color:var(--text-3)}',
    '.sig-ackb{margin-left:auto;padding:7px 15px;border-radius:8px;border:1px solid var(--gold-line-hi);font-size:12px;font-weight:800;color:var(--text-2);transition:all .15s}',
    '.sig-ackb:hover{color:var(--gold-a);border-color:var(--gold-a);box-shadow:var(--glow-gold)}',
    '.sig-ackb[disabled]{opacity:.55}',
    '.sig-foot{padding:0 16px 12px 20px;font-size:11.5px;font-weight:600;color:var(--text-3);line-height:1.5;overflow-wrap:anywhere}',
    '.sig-more{display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:var(--text-3)}',
    '.sig-sum{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:16px;font-size:12.5px;font-weight:700;color:var(--text-3)}',
    '.sig-empty{padding:2px 0;font-size:13px;font-weight:600;color:var(--text-3);line-height:1.6}',
    '.sig-empty b{display:block;color:var(--text-2);font-size:13.5px;margin-bottom:3px}',
    '.sig-warnline{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:10px;border:1px solid var(--gold-line);font-size:12.5px;font-weight:700;color:var(--warn)}',

    /* §28.1 — the two taps live in the top bar, where they are visible on every screen. */
    '.clockbtn{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:99px;border:1px solid var(--gold-line-hi);font-size:12.5px;font-weight:800;color:var(--text-2);white-space:nowrap;transition:all .15s}',
    '.clockbtn:hover{color:var(--blue-2);border-color:var(--blue)}',
    '.clockbtn.go{color:var(--gold-ink);border-color:transparent;background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 55%,var(--gold-c));box-shadow:0 3px 14px rgba(233,169,60,.35)}',
    '.clockbtn.go:hover{color:var(--gold-ink);filter:brightness(1.07)}',
    '.clockbtn.done{cursor:default}',
    '.clockbtn.done:hover{color:var(--text-2);border-color:var(--gold-line-hi)}',
    '.clockbtn.done b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}',
    '.clockbtn[disabled]{opacity:.6}',
    '.clockbtn .live{width:7px;height:7px;flex:none;border-radius:50%;background:var(--blue-2);box-shadow:var(--glow-blue);animation:sigLive 1.8s ease-in-out infinite}',
    '@keyframes sigLive{0%,100%{opacity:1}50%{opacity:.35}}',
    '.clockbtn .short{display:none}',

    '@media(max-width:880px){',
    '.sig-hd,.sig-bd,.sig-acts,.sig-foot{padding-left:15px}',
    '.sig-thumb{width:58px;height:58px}',
    '.sig-fig.big b{font-size:23px}',
    '.sig-when{margin-left:0}',
    '.sig-ackb{margin-left:0}',
    '.clockbtn{padding:7px 11px}',
    '.clockbtn .long{display:none}.clockbtn .short{display:inline}',
    '}'
  ].join(''));

  // ============================== small helpers ==============================

  function sgStr(v) { return String(v === null || v === undefined ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function sgAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function sgRole() { return (STATE.user && STATE.user.role) || ''; }

  /** The one gate behind "never render a profit figure the backend did not send": a figure is
   *  drawn only when its own key came back on this record, with a number in it. */
  function sgField(rec, key) {
    if (!rec || !Object.prototype.hasOwnProperty.call(rec, key)) { return null; }
    var v = rec[key], n;
    if (v === null || v === undefined || v === '') { return null; }
    n = Number(v);
    return isFinite(n) ? n : null;
  }

  /** Money is rounded once, here, at the end (§4.2). */
  function sgGbp(n) {
    var v = Number(n) || 0;
    return (v < 0 ? '-£' : '£') + Math.abs(v).toFixed(2);
  }
  function sgNumText(n) {
    var v = Number(n);
    if (!isFinite(v)) { return ''; }
    return String(Math.round(v * 100) / 100);
  }

  /** A bare yyyy-mm-dd is a day, not an instant: formatting it by hand keeps it off a timezone. */
  var SG_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function sgDay(ymd) {
    var s = sgStr(ymd), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) { return s; }
    return String(Number(m[3])) + ' ' + SG_MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }
  function sgWhen(rec) {
    var d = sgStr(rec.date), pretty = sgDay(d);
    if (SG.data && sgStr(SG.data.date) === d) { return 'Yesterday · ' + pretty; }
    return pretty;
  }
  /** '14:22' as the team reads it. Attendance stamps are already PKT wall time. */
  function sgHm12(hm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(sgStr(hm)), h;
    if (!m) { return sgStr(hm); }
    h = Number(m[1]);
    return (h % 12 === 0 ? 12 : h % 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function sgCanSee(v) {
    if (!v) { return false; }
    if (typeof canSee === 'function') { return canSee(v); }
    return !v.roles || v.roles === '*' || v.roles.indexOf(sgRole()) >= 0;
  }
  /** Click the nav entry so the rail highlight follows; fall back to a plain render. */
  function sgOpen(key) {
    var a = document.querySelector('.nav a[data-key="' + key.replace(/"/g, '') + '"]');
    if (a) { a.click(); return true; }
    if (typeof renderView === 'function') { renderView(key); return true; }
    return false;
  }
  function sgBadge(n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts.signals = n || 0;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  function sgList() { return (SG.data && SG.data.signals) || []; }
  function sgKey(rec) {
    return sgStr(rec.account) + '|' + sgStr(rec.type) + '|' + sgStr(rec.date) + '|' + sgStr(rec.item_id);
  }
  /** The Main Sheet's eBay numbers are long digit strings; anything else in item_id is the title
      the engine fell back to, and must not be dressed up as a number. */
  function sgItemNumber(rec) {
    var s = sgStr(rec.item_id);
    return /^\d{6,}$/.test(s) ? s : '';
  }
  function sgTitle(rec) {
    var t = sgStr(rec.title);
    if (t) { return t; }
    if (!sgItemNumber(rec) && sgStr(rec.item_id)) { return sgStr(rec.item_id); }
    return 'Item not matched on the Main Sheet';
  }
  function sgInitials(title) {
    var s = sgStr(title).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
    var parts = s ? s.split(' ') : [];
    if (!parts.length || !parts[0]) { return '—'; }
    return ((parts[0].charAt(0) || '') + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
  }

  // ============================== loading ==============================

  /** payload.refresh asks the engine to recompute; the server accepts that from Management only and
      throttles it to the dashboard's own cadence, so it is sent on an explicit tap and never here. */
  function sgLoad(opts) {
    var o = opts || {}, now = Date.now(), p;
    // First look of the session: seed from the last visit so the cards paint at once, but mark
    // the copy stale so the refresh underneath still happens.
    if (!SG.data && typeof cacheRead === 'function') {
      var had = cacheRead('mySignals', {});
      if (had) { SG.data = had; SG.at = now - SG_TTL_MS - 1; sgBadge(Number(had.count) || 0); }
    }
    if (!o.fresh && !o.recompute && SG.data && now - SG.at < SG_TTL_MS) { return Promise.resolve(SG.data); }
    if (!o.recompute && SG.loading) { return SG.loading; }
    p = api('mySignals', o.recompute ? { refresh: true } : {}).then(function (d) {
      SG.data = d || {}; SG.at = Date.now(); SG.loading = null;
      if (typeof cacheWrite === 'function') { cacheWrite('mySignals', {}, SG.data); }
      sgBadge(Number(SG.data.count) || 0);
      return SG.data;
    })['catch'](function (e) { SG.loading = null; throw e; });
    SG.loading = p;
    return p;
  }

  function sgAttLoad(fresh) {
    var now = Date.now(), p;
    if (!fresh && SG.att && now - SG.attAt < SG_ATT_TTL_MS) { return Promise.resolve(SG.att); }
    if (SG.attLoading) { return SG.attLoading; }
    // days:1 — the chip needs today's session, not a history the top bar cannot show.
    p = api('myAttendance', { days: 1 }).then(function (d) {
      SG.att = d || {}; SG.attAt = Date.now(); SG.attLoading = null;
      return SG.att;
    })['catch'](function (e) { SG.attLoading = null; throw e; });
    SG.attLoading = p;
    return p;
  }

  // ============================== one card ==============================

  function sgAccent(type) {
    /* Red is kept for money already lost; the two off-trend signals carry the warn colour. */
    return type === SG_NEGATIVE ? 'sig-bad' : 'sig-warn';
  }

  function sgIcon(type) {
    var d;
    if (type === SG_NEGATIVE) { d = '<path d="M3 7.5 10 14l4-4 7 7"/><path d="M21 12v5h-5"/>'; }
    else if (type === SG_WORST_CPC) { d = '<path d="M4 10v4h3l6 4V6l-6 4H4z"/><path d="M17.5 9.6a4 4 0 0 1 0 4.8"/>'; }
    else if (type === SG_RETURNS) { d = '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'; }
    else { d = '<path d="M12 4 3 19.5h18L12 4z"/><path d="M12 10.5v4M12 17.6h.01"/>'; }
    return '<svg viewBox="0 0 24 24">' + d + '</svg>';
  }

  function sgFig(cls, label, value) {
    return '<div class="sig-fig ' + cls + '"><span class="k">' + esc(label) + '</span>' +
      '<b class="num">' + esc(value) + '</b></div>';
  }

  /** §27's three cards. Every money row is drawn from its own named field and only when that field
      arrived; nothing is inferred, defaulted to zero, or left as an empty placeholder. */
  function sgFigures(rec) {
    var type = sgStr(rec.type), out = '', loss, earning, spend, excess, raw, count, base, days, seen;

    if (type === SG_NEGATIVE) {
      // A profit-restricted role never receives this type (server gate), so `value` — the signal's
      // own figure, which is the item's Actual Profit — may stand in when the card is missing.
      loss = sgField(rec, 'Actual Profit');
      if (loss === null) { loss = sgField(rec, 'value'); }
      if (loss !== null) { out += sgFig('big loss', 'Actual Profit', sgGbp(loss)); }
      earning = sgField(rec, 'Order Earning');
      if (earning !== null) { out += sgFig('gold', 'Order Earning', sgGbp(earning)); }
      raw = sgField(rec, 'Raw Profit');
      if (raw !== null) { out += sgFig('', 'Raw Profit', sgGbp(raw)); }
      spend = sgField(rec, 'ad_fees');
      if (spend !== null) { out += sgFig('', 'Ad fees incl VAT', sgGbp(spend)); }
      return out;
    }

    if (type === SG_WORST_CPC) {
      spend = sgField(rec, 'ad_fees');
      if (spend === null) { spend = sgField(rec, 'value'); }
      earning = sgField(rec, 'Order Earning');
      if (earning === null) { earning = sgField(rec, 'baseline'); }
      if (spend !== null) { out += sgFig('big loss', 'Ad fees incl VAT', sgGbp(spend)); }
      if (spend !== null && earning !== null) { out += '<div class="sig-vs">AGAINST</div>'; }
      if (earning !== null) { out += sgFig('big gold', 'Order Earning', sgGbp(earning)); }
      excess = sgField(rec, 'ad_spend_over_earning');
      if (excess === null && spend !== null && earning !== null) { excess = spend - earning; }
      if (excess !== null) { out += sgFig('loss', 'Spent over earned', sgGbp(excess)); }
      raw = sgField(rec, 'Actual Profit');
      if (raw !== null) { out += sgFig(raw < 0 ? 'loss' : '', 'Actual Profit', sgGbp(raw)); }
      return out;
    }

    if (type === SG_RETURNS) {
      count = sgField(rec, 'returns_today');
      if (count === null) { count = sgField(rec, 'value'); }
      base = sgField(rec, 'baseline_per_day');
      if (base === null) { base = sgField(rec, 'baseline'); }
      days = sgField(rec, 'baseline_days');
      if (count !== null) { out += sgFig('big loss', 'Returns', sgNumText(count)); }
      if (base !== null) {
        out += sgFig('', 'Its usual rate', sgNumText(base) + ' a day' + (days !== null ? ' over ' + sgNumText(days) + ' days' : ''));
      }
      seen = sgField(rec, 'baseline_count');
      if (seen !== null && days !== null) {
        out += sgFig('', 'Before this', sgNumText(seen) + ' in ' + sgNumText(days) + ' days');
      }
      return out;
    }

    // An extensible registry type (§27): show what the row carries, and assume nothing about it.
    count = sgField(rec, 'value');
    base = sgField(rec, 'baseline');
    if (count !== null) { out += sgFig('big loss', 'Value', sgNumText(count)); }
    if (base !== null) { out += sgFig('', 'Baseline', sgNumText(base)); }
    return out;
  }

  function sgChips(rec) {
    var out = '';
    if (sgStr(rec.type) !== SG_RETURNS) { return ''; }
    out += sgChipRow(rec.reasons);
    out += sgChipRow(rec.types);
    return out ? '<div class="sig-chips">' + out + '</div>' : '';
  }
  function sgChipRow(list) {
    var i, row, out = '';
    if (!list || !list.length) { return ''; }
    for (i = 0; i < list.length; i++) {
      row = list[i] || {};
      if (!sgStr(row.label)) { continue; }
      out += '<span class="sig-chip"><span>' + esc(sgStr(row.label)) + '</span>' +
        (sgField(row, 'count') !== null ? '<b class="num">×' + esc(sgNumText(row.count)) + '</b>' : '') + '</span>';
    }
    return out;
  }

  function sgThumb(rec, title) {
    var url = safeUrl(rec.image);
    if (url) {
      return '<div class="sig-thumb"><img src="' + sgAttr(url) + '" alt="" loading="lazy" data-sig-img="1"></div>';
    }
    return '<div class="sig-thumb"><span class="ph">' + esc(sgInitials(title)) + '</span></div>';
  }

  function sgMeta(rec) {
    var bits = [], num = sgItemNumber(rec), owner = sgStr(rec.owner_name) || sgStr(rec.owner_email);
    if (num) { bits.push('<span class="mono">' + esc(num) + '</span>'); }
    if (owner) { bits.push('<span>Listed by ' + esc(owner) + '</span>'); }
    if (sgStr(rec.tab)) { bits.push('<span>' + esc(sgStr(rec.tab)) + '</span>'); }
    return bits.length ? '<div class="sig-meta">' + bits.join('<span>·</span>') + '</div>' : '';
  }

  function sgActions(rec, i) {
    var list = rec.actions || [], out = '', j, label;
    for (j = 0; j < list.length; j++) {
      label = sgStr(list[j]);
      if (!label) { continue; }
      if (SG_ACTION_VIEWS[label]) {
        out += '<button class="minibtn" data-sig-do="go" data-sig-act="' + sgAttr(label) + '" data-sig-i="' + i + '">' +
          esc(label) + '</button>';
      } else {
        // A signal type Management added later can name a step this build has no screen for; it is
        // shown as the step it is rather than as a button that would do nothing.
        out += '<span class="sig-todo" title="This step is done outside the portal for now">' + esc(label) + '</span>';
      }
    }
    out += '<button class="sig-ackb" data-sig-do="ack" data-sig-i="' + i + '">Acknowledge</button>';
    return '<div class="sig-acts">' + out + '</div>';
  }

  function sgFoot(rec, full) {
    var acks = rec.acknowledged_by_others || [], j, out;
    if (!acks.length) { return ''; }
    if (!full) {
      return '<div class="sig-foot">Already acknowledged by ' + esc(String(acks.length)) +
        ' other' + (acks.length === 1 ? '' : 's') + ' — it stays pinned for you until you clear it.</div>';
    }
    out = '';
    for (j = 0; j < acks.length; j++) { out += (out ? '<br>' : '') + esc(sgStr(acks[j])); }
    return '<div class="sig-foot">Acknowledged so far · ' + out + '</div>';
  }

  function sgCard(rec, i, full) {
    var title = sgTitle(rec), mine = sgStr(rec.owner_email) && sgStr(rec.type) === SG_RETURNS;
    return '<article class="sig ' + sgAccent(sgStr(rec.type)) + ' enter d' + ((i % 3) + 1) +
        '" data-sig-key="' + sgAttr(sgKey(rec)) + '">' +
      '<div class="sig-hd">' +
        '<span class="sig-type">' + sgIcon(sgStr(rec.type)) + esc(sgStr(rec.type)) + '</span>' +
        '<span class="pill sig-acct">' + esc(sgStr(rec.account)) + '</span>' +
        (mine ? '<span class="pill sig-mine">Your listing</span>' : '') +
        '<span class="sig-when num">' + esc(sgWhen(rec)) + '</span>' +
      '</div>' +
      '<div class="sig-bd">' + sgThumb(rec, title) +
        '<div class="sig-info">' +
          '<div class="sig-title">' + esc(title) + '</div>' +
          sgMeta(rec) +
          '<div class="sig-figs">' + sgFigures(rec) + '</div>' +
          sgChips(rec) +
        '</div>' +
      '</div>' +
      sgActions(rec, i) +
      sgFoot(rec, full) +
    '</article>';
  }

  // ============================== wiring ==============================

  function sgWire(host) {
    var imgs = host.querySelectorAll('img[data-sig-img]'), i;
    host.onclick = sgClick;
    for (i = 0; i < imgs.length; i++) {
      // A listing image that 404s must not leave a hole where the product should be.
      imgs[i].onerror = function () {
        var box = this.parentNode;
        if (box) { box.innerHTML = '<span class="ph">—</span>'; }
      };
    }
  }

  function sgClick(ev) {
    var el = ev.target, act, idx;
    while (el && el !== this && !el.getAttribute) { el = el.parentNode; }
    while (el && el !== this && !el.getAttribute('data-sig-do')) { el = el.parentNode; }
    if (!el || el === this) { return; }
    act = el.getAttribute('data-sig-do');
    idx = Number(el.getAttribute('data-sig-i'));
    if (act === 'ack') { sgAck(idx, el); return; }
    if (act === 'go') { sgGo(idx, el.getAttribute('data-sig-act')); return; }
    if (act === 'all') { sgOpen('signals'); return; }
    if (act === 'recompute') { sgRefresh(el); return; }
  }

  /** §27's one-tap actions: open the screen that owns the job. The card stays pinned either way —
      leaving the signal is not the same as answering it. */
  function sgGo(i, label) {
    var rec = sgList()[i], keys = SG_ACTION_VIEWS[label] || [], j, v;
    if (!rec) { return; }
    for (j = 0; j < keys.length; j++) {
      v = VIEWS[keys[j]];
      if (v && sgCanSee(v) && sgOpen(keys[j])) {
        toast(label + ' · ' + (sgItemNumber(rec) || sgTitle(rec)) + ' — opening ' + (v.label || keys[j]) +
          '. The signal stays pinned until you acknowledge it.');
        return;
      }
    }
    toast('That screen is not part of your version — ask Management to action “' + label + '”.');
  }

  /** §27: acknowledging unpins it for THIS person and is logged; nothing is deleted, and the same
      problem stays in front of everyone else it was raised for. */
  function sgAck(i, btn) {
    var rec = sgList()[i], key;
    if (!rec) { return; }
    key = sgKey(rec);
    if (SG.busy[key]) { return; }
    SG.busy[key] = true;
    btn.disabled = true;
    btn.textContent = 'Clearing…';
    api('acknowledgeSignal', {
      account: rec.account, type: rec.type, date: rec.date, item_id: rec.item_id
    }).then(function (res) {
      delete SG.busy[key];
      sgDrop(key);
      sgUnpin(key);
      toast((res && res.alreadyAcknowledged) ? 'Already acknowledged — unpinned.'
        : 'Acknowledged · ' + sgStr(rec.type) + ' · ' + sgStr(rec.account) + ' — unpinned and logged.');
    })['catch'](function (e) {
      delete SG.busy[key];
      btn.disabled = false;
      btn.textContent = 'Acknowledge';
      toast('Not acknowledged: ' + e.message);
    });
  }

  function sgDrop(key) {
    var list = sgList(), keep = [], i;
    for (i = 0; i < list.length; i++) { if (sgKey(list[i]) !== key) { keep.push(list[i]); } }
    if (SG.data) {
      SG.data.signals = keep;
      SG.data.count = keep.length;
      SG.data.acknowledged = (Number(SG.data.acknowledged) || 0) + 1;
    }
    sgBadge(keep.length);
  }

  function sgUnpin(key) {
    var nodes = document.querySelectorAll('.sig[data-sig-key]'), i, hit = [];
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-sig-key') === key) { hit.push(nodes[i]); }
    }
    for (i = 0; i < hit.length; i++) { hit[i].className += ' sig-gone'; }
    setTimeout(function () {
      var host = document.getElementById('sigPins'), all = document.getElementById('sigAll');
      if (host) { sgPaintPins(host); }
      if (all) { sgPaintAll(all); }
    }, 320);
  }

  // ============================== the home pins ==============================

  function sgHost(container) {
    var el = null, main;
    if (container) { el = (typeof container === 'string') ? document.getElementById(container) : container; }
    if (el) { return el; }
    el = document.getElementById('sigPins');
    if (el) { return el; }
    main = document.getElementById('mainView');
    if (!main) { return null; }
    el = document.createElement('div');
    el.id = 'sigPins';
    el.className = 'sig-pins';
    // §27: pinned to the TOP of the home screen — above the greeting, where nothing can bury them.
    main.insertBefore(el, main.firstChild);
    return el;
  }

  function sgPaintPins(host) {
    var list = sgList(), n = Math.min(list.length, SG_HOME_MAX), out = '', i;
    if (!list.length) { host.innerHTML = ''; return; }
    for (i = 0; i < n; i++) { out += sgCard(list[i], i, false); }
    if (list.length > n) {
      out += '<div class="sig-more"><span>' + esc(String(list.length - n)) + ' more pinned to you</span>' +
        '<button class="minibtn" data-sig-do="all">Open Signals</button></div>';
    }
    host.innerHTML = out;
    sgWire(host);
  }

  /** Called by the HOME screen. Safe to call with no argument: the pins then mount themselves at the
      top of the main column. Idempotent per render, so home calling it does not double up. */
  window.renderSignalCards = function (container) {
    var host = sgHost(container);
    if (!host) { return; }
    SG.mountedEpoch = SG.epoch;
    host.className = 'sig-pins';
    if (SG.data) { sgPaintPins(host); }
    sgLoad().then(function () {
      if (!document.body.contains(host)) { return; }
      sgPaintPins(host);
    })['catch'](function (e) {
      if (!document.body.contains(host) || sgList().length) { return; }
      // A signal nobody can see is worse than a slow home screen: say so rather than show nothing.
      host.innerHTML = '<div class="sig-warnline">Signals could not be loaded — ' + esc(e.message) + '</div>';
    });
  };

  // ============================== the Signals screen ==============================

  function sgSummary() {
    var d = SG.data || {}, bits = [];
    bits.push('<b class="num">' + esc(String(Number(d.count) || 0)) + '</b> pinned to you');
    if (sgStr(d.date)) { bits.push('yesterday · ' + esc(sgDay(d.date))); }
    if (Number(d.acknowledged)) { bits.push(esc(String(d.acknowledged)) + ' already acknowledged by you'); }
    if (d.truncated) { bits.push('showing the ' + esc(String(Number(d.count) || 0)) + ' loudest of ' + esc(String(Number(d.total) || 0))); }
    return bits.join(' <span>·</span> ');
  }

  function sgPaintAll(box) {
    var list = sgList(), out = '', i, sum = document.getElementById('sigSum');
    if (sum) { sum.innerHTML = sgSummary(); }
    if (!list.length) {
      box.innerHTML = '<div class="card enter d1"><div class="hd">Nothing pinned</div><div class="bd">' +
        '<div class="sig-empty"><b>No signal is waiting on you.</b>' +
        'Problems come to people here — a signal appears on this screen and at the top of your home screen ' +
        'the moment the daily engine finds one, and stays until you acknowledge it.</div></div></div>';
      return;
    }
    for (i = 0; i < list.length; i++) { out += sgCard(list[i], i, true); }
    box.innerHTML = out;
    sgWire(box);
  }

  function sgRefresh(btn) {
    var box = document.getElementById('sigAll');
    if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }
    // Management's tap is the only thing that may start a recompute; the server throttles it and
    // ignores it from anyone else, who still gets a fresh read of the cards already computed.
    sgLoad({ recompute: true, fresh: true }).then(function () {
      if (box) { sgPaintAll(box); }
      var host = document.getElementById('sigPins');
      if (host) { sgPaintPins(host); }
    })['catch'](function (e) { toast('Not refreshed: ' + e.message); })
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = 'Refresh'; } });
  }

  VIEWS.signals = {
    label: 'Signals',
    icon: '<path d="M12 4 3 19.5h18L12 4z"/><path d="M12 10.5v4M12 17.6h.01"/>',
    roles: '*',
    order: 8,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Signals</h1>' +
          '<span class="sub">Pinned until you acknowledge them · Pakistan time</span>' +
          '<button class="minibtn" data-sig-do="recompute" id="sigRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="sig-sum" id="sigSum">Loading…</div>' +
        '<div class="sig-list" id="sigAll"><div class="spinner"></div></div>';
    },
    init: function () {
      var box = document.getElementById('sigAll'), btn = document.getElementById('sigRefresh');
      if (btn) { btn.onclick = function () { sgRefresh(btn); }; }
      if (!box) { return; }
      if (SG.data) { sgPaintAll(box); }
      sgLoad().then(function () {
        if (!document.body.contains(box)) { return; }
        sgPaintAll(box);
      })['catch'](function (e) {
        if (!document.body.contains(box)) { return; }
        box.innerHTML = '<div class="sig-warnline">Signals could not be loaded — ' + esc(e.message) + '</div>';
      });
    }
  };

  // ============================== §28.1 clock in / clock out ==============================

  function sgClockMount() {
    var btn = document.getElementById('clockChip'), slot;
    if (btn) { return btn; }
    slot = document.getElementById('meetingChip') || document.getElementById('bellBtn');
    if (!slot || !slot.parentNode) { return null; }
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'clockChip';
    btn.className = 'clockbtn';
    btn.onclick = sgClockTap;
    slot.parentNode.insertBefore(btn, slot);
    sgClockPaint();
    return btn;
  }

  function sgSession() {
    return (SG.att && SG.att.session) || null;
  }

  function sgClockPaint() {
    var btn = document.getElementById('clockChip'), s = sgSession(), today, open, title;
    if (!btn) { return; }
    if (!SG.att) {
      btn.className = 'clockbtn';
      btn.disabled = true;
      btn.innerHTML = '<span class="long">Office working</span><span class="short">Working</span>';
      return;
    }
    today = s && s.today;
    open = s && s.open_session;
    btn.disabled = false;

    if (s && s.can_clock_out) {
      // An unconcluded session from an earlier date keeps this button on Conclude, so the open day
      // is closed first and "Start office working" comes back on its own afterwards.
      title = 'Started ' + sgHm12(open && open.clock_in) + ' PKT' +
        (open && sgStr(open.date) !== sgStr(SG.att.date) ? ' on ' + sgDay(open.date) : '') +
        (open && sgStr(open.late_flag) ? ' · ' + sgStr(open.late_flag) : '');
      btn.className = 'clockbtn';
      btn.title = title;
      btn.innerHTML = '<span class="live"></span><span class="long">Conclude working</span><span class="short">Conclude</span>';
      return;
    }
    if (today && sgStr(today.clock_out)) {
      btn.className = 'clockbtn done';
      btn.disabled = true;
      btn.title = 'Started ' + sgHm12(today.clock_in) + ' · concluded ' + sgHm12(today.clock_out) + ' PKT' +
        (sgStr(today.late_flag) ? ' · ' + sgStr(today.late_flag) : '') +
        (sgStr(today.early_flag) ? ' · ' + sgStr(today.early_flag) : '');
      btn.innerHTML = '<b class="num">' + esc(sgStr(today.hours_label) || '—') + '</b>' +
        '<span class="long">today</span>';
      return;
    }
    btn.className = 'clockbtn go';
    btn.title = SG.att.working_today === false
      ? 'Not a working day on your timetable — the tap still records it'
      : 'Registers your office working start (§28.1)';
    btn.innerHTML = '<span class="long">Start office working</span><span class="short">Start</span>';
  }

  function sgClockTap() {
    var s = sgSession(), action;
    if (SG.clockBusy || !s) { return; }
    action = s.can_clock_out ? 'clockOut' : 'clockIn';
    if (action === 'clockIn' && !s.can_clock_in) { return; }
    SG.clockBusy = true;
    var btn = document.getElementById('clockChip');
    if (btn) { btn.disabled = true; }
    api(action, { days: 1 }).then(function (d) {
      SG.clockBusy = false;
      SG.att = d || {};
      SG.attAt = Date.now();
      sgClockPaint();
      if (sgStr(SG.att.message)) { toast(sgStr(SG.att.message)); }
    })['catch'](function (e) {
      SG.clockBusy = false;
      sgClockPaint();
      toast('Not recorded: ' + e.message);
    });
  }

  // ============================== mounting ==============================

  /** The shell renders a view, then this runs: the top-bar taps mount once and the §27 pins mount
      on home — unless the home screen called renderSignalCards itself, which it is meant to. Both
      requests are fired inside the same tick so the shell batches them into ONE round trip. */
  var sgPrevRender = (typeof renderView === 'function') ? renderView : null;
  if (sgPrevRender) {
    window.renderView = function (key) {
      SG.epoch++;
      sgPrevRender(key);
      sgClockMount();
      if (key === 'home' && SG.mountedEpoch !== SG.epoch) { window.renderSignalCards(); }
      sgAttLoad().then(sgClockPaint)['catch'](function () {
        // The two taps are not worth an error banner on someone else's screen; the chip simply
        // waits, and the next view they open asks again.
      });
    };
  }
}());
