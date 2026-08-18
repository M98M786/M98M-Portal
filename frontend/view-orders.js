/* view-orders.js — §10.1 the processor's daily order workspace · §10.2 the dispatch dashboard.
 * Views: orders (Today's orders) · dispatch (Dispatch).
 * Backend: todayOrders · recordPurchase · recordTracking · dispatchDashboard · accountList.
 *
 * REALITY WINS over the spec on every label here, because Orders.gs keys the payload by the live
 * workbook's own headers:
 *  · §10.1 writes 'Order number (eBay)' and 'Order Number (AliExpress)'. The live tabs carry
 *    'Order number' (col B) and 'Order Number' (col M) — same letters, different case, no
 *    qualifiers. Both spellings are printed as the sheet has them and told apart by a hint, never
 *    by renaming a column the staff read every day.
 *  · 'Ali Express Link' is two words on the sheet; 'Cost ', 'Image Link ' carry trailing spaces on
 *    wide tabs and none on narrow ones. The server already emits one canonical key per field, so
 *    this file addresses those keys and prints the header words as the team knows them.
 *  · The Post-to block floats across 14 column positions and is missing from 7 tabs entirely — so
 *    no address field is ever assumed present; each one renders only when the payload carries it.
 *  · REPLACEMENT has no 'New Ali Link' column, so that field is drawn from `writable`, never
 *    hardcoded.
 * §4.2 / RL-4: 'Order Earning' and every buyer address field are decided SERVER-side. This screen
 * renders what arrives and derives nothing — there is no client-side profit or PII rule here to
 * get wrong, and no field is ever merely hidden by CSS.
 * RL-3: sheet cells are buyer-authored text. Everything goes through esc(); links render only
 * through safeUrl(). */
(function () {

  var OD_VIEW_ROLES = ['Order Processor', 'Management', 'Ops Head'];
  /* §10.2 says surface the tiles to processors and Management; the Team Lead reads them too
     (Orders.gs ORDERS_READ_ROLES) but has no working row of his own, so he gets Dispatch only. */
  var OD_DISPATCH_ROLES = ['Order Processor', 'Management', 'Ops Head', 'Team Lead'];

  var OD_TZ_PKT = 'Asia/Karachi';
  var OD_REPLACEMENT_TAB = 'REPLACEMENT';

  /* The live daily-tab headers, exactly as the workbook spells them — these are the keys the
     server emits AND the words printed on screen. */
  var OD_H = {
    imageLink: 'Image Link',
    orderNo: 'Order number',            // col B — eBay's, lowercase n
    title: 'Item title',
    soldFor: 'Sold for',
    address: 'Full Address',
    earning: 'Order Earning',
    aliLink: 'Ali Express Link',
    newAliLink: 'New Ali Link',
    qty: 'Quantity',
    variation: 'Variation details',
    cost: 'Cost',
    aliOrderNo: 'Order Number',         // col M — AliExpress's, capital N
    tracking: 'Tracking number',
    email: 'Email',                     // col O — the purchasing account used, not a buyer address
    status: 'Delivery Status',
    sup1: 'Supplier Link 1',
    sup2: 'Supplier Link 2',
    sup3: 'Supplier Link 3'
  };
  /* The Post-to block, in the workbook's own order. Rendered one by one, only where present. */
  var OD_POST = ['Post to name', 'Post to address 1', 'Post to address 2', 'Post to city',
    'Post to county', 'Post to postcode', 'Post to phone'];

  /* Fallback only — todayOrders sends the tab's real dropdown in delivery_status_options and that
     wins. The first token of the sheet's own list ('Delivery Status') is the row-2 pseudo-header
     and is deliberately not an option. */
  var OD_STATUS_FALLBACK = ['Pending', 'Complete', 'Tracking', 'Custom Stuck', 'Delivered',
    'Left China', 'IN UK', 'Contact Customer/ Late'];

  /* §10.2 tile and table labels, verbatim from the live Dashboard tab. */
  var OD_TILE_MONTH = 'Orders This Month';
  var OD_TILE_AWAITING = 'Awaiting Dispatch';
  var OD_TILE_DUE = 'Due in Next 3 Days';
  var OD_TILE_OVERDUE = 'OVERDUE NOW';
  var OD_ROW_DISPATCHED = 'Dispatched';
  var OD_ROW_SAFE = 'Awaiting (safe)';
  var OD_ROW_DUE = 'Due ≤3 days';
  var OD_ROW_OVERDUE = 'Overdue';
  var OD_DUE_COLS = ['Day Tab', 'Order No', 'Item', 'Order Date', 'Ship By', 'Days Left', 'Status'];

  VIEW_CSS.push(
    '.od-livetiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
    '.od-lt{background:var(--panel-2);border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px}' +
    '.od-lt b{display:block;font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}' +
    '.od-lt span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);font-weight:800;margin-top:3px}' +
    '.od-lt i{display:block;font-style:normal;font-size:11.5px;color:var(--text-2);font-weight:700;margin-top:4px}' +
    '.od-lt.bad{border-color:var(--bad);background:var(--bad-soft,var(--panel-2))}' +
    '.od-lt.bad b{color:var(--bad)}' +
    '.od-lt.good b{color:var(--ok)}' +
    '.od-late{font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--bad-soft,var(--panel-2));color:var(--bad)}' +
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{color:var(--blue-2);border-color:var(--blue)}' +
    '.od-bar{display:grid;grid-template-columns:1.5fr 1fr auto auto;gap:12px;align-items:end}' +
    '.od-in,.od-sel,.od-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.od-in:focus,.od-sel:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.od-in.od-dirty{border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.od-in.mono{font-family:var(--mono);letter-spacing:.04em}' +
    '.od-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
    '.od-tab{padding:7px 13px;border:1px solid var(--gold-line);border-radius:9px;font-size:12px;font-weight:800;color:var(--text-2);transition:all .15s}' +
    '.od-tab:hover{border-color:var(--blue);color:var(--blue-2)}' +
    '.od-tab.on{border-color:var(--gold-line-hi);color:var(--gold-a);background:linear-gradient(135deg,rgba(233,169,60,.16),rgba(233,169,60,.03))}' +
    '.od-sum{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px}' +
    '.od-chip{font-size:11.5px;font-weight:700;color:var(--text);border:1px solid var(--gold-line);border-radius:8px;padding:5px 11px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.od-chip .k{color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:800;margin-right:6px}' +
    '.od-chip.od-warn{border-color:rgba(255,159,67,.45);color:var(--warn)}' +
    '.od-chip.od-bad{border-color:rgba(240,96,90,.45);color:var(--bad)}' +
    '.od-row{margin-top:14px}' +
    '.od-row .hd{align-items:flex-start;flex-wrap:wrap}' +
    '.od-name{font-weight:800;word-break:break-word;flex:1 1 240px;min-width:0;line-height:1.45}' +
    '.od-prod{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;align-items:start}' +
    '.od-shot{border:1px solid var(--gold-line);border-radius:10px;overflow:hidden;background:var(--panel);display:block}' +
    '.od-shot img{display:block;width:100%;height:104px;object-fit:cover;background:rgba(120,132,152,.10)}' +
    '.od-shot .od-alt{display:grid;place-items:center;height:104px;font-size:11px;font-weight:700;color:var(--text-3);padding:8px;text-align:center}' +
    '.od-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}' +
    '.od-fact{border:1px solid var(--gold-line);border-radius:10px;padding:9px 11px;min-width:0}' +
    '.od-fact .k{font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.od-fact b{display:block;font-size:14px;font-weight:800;margin-top:4px;word-break:break-word}' +
    '.od-fact.od-gold b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.od-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}' +
    '.od-links a{display:inline-block;text-decoration:none}' +
    '.od-ali{padding:7px 14px;border-radius:9px;font-weight:800;font-size:12px;color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 55%,var(--gold-c));box-shadow:var(--glow-gold)}' +
    '.od-addr{margin-top:13px;border:1px solid var(--gold-line);border-radius:10px;background:rgba(120,132,152,.07)}' +
    '.od-addr-h{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--gold-line)}' +
    '.od-addr-h .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.od-addr-b{padding:10px 12px;white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6}' +
    '.od-addr-l{display:flex;gap:10px;font-size:12.5px;padding:4px 0}' +
    '.od-addr-l .k{flex:none;min-width:124px;color:var(--text-3);font-weight:700;font-size:11.5px}' +
    '.od-work{margin-top:14px;padding:13px;border-radius:11px;border:1px solid var(--gold-line-hi);background:rgba(16,20,31,.26)}' +
    '[data-theme="ivory"] .od-work{background:rgba(255,255,255,.55)}' +
    '.od-work .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.od-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:11px;margin-top:9px}' +
    '.od-grid .field{margin-top:0}' +
    '.od-grid .field label{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}' +
    '.od-grid .field label em{font-style:normal;text-transform:none;letter-spacing:0;font-size:10.5px;font-weight:700;color:var(--text-3)}' +
    '.od-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}' +
    '.od-note{font-size:11.5px;color:var(--text-3);font-weight:700;line-height:1.5}' +
    '.od-note.od-ok{color:var(--ok)}.od-note.od-bad{color:var(--bad)}.od-note.od-warn{color:var(--warn)}' +
    '.od-sep{margin-top:13px;padding-top:12px;border-top:1px solid var(--gold-line)}' +
    '.od-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.od-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.od-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}' +
    '.od-tile{border:1px solid var(--gold-line);border-radius:12px;padding:14px 15px;background:rgba(120,132,152,.06);min-width:0}' +
    '.od-tile .k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);line-height:1.4}' +
    '.od-tile b{display:block;font-size:30px;font-weight:800;margin-top:7px;line-height:1.05}' +
    '.od-tile .od-sub{display:block;font-size:11px;font-weight:700;color:var(--text-3);margin-top:5px}' +
    '.od-tile.od-t-gold b{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 40%,var(--gold-b));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.od-tile.od-t-live{border-color:rgba(61,155,240,.34)}.od-tile.od-t-live b{color:var(--blue-2)}' +
    '.od-tile.od-t-warn{border-color:rgba(255,159,67,.42)}.od-tile.od-t-warn b{color:var(--warn)}' +
    /* OVERDUE NOW is the number that costs money — it is the loudest tile on the screen. */
    '.od-tile.od-t-over{grid-column:span 2;border-color:var(--gold-line-hi)}' +
    '.od-tile.od-t-over b{font-size:40px}' +
    '.od-tile.od-t-over.od-hot{border-color:rgba(240,96,90,.62);background:linear-gradient(135deg,rgba(240,96,90,.16),rgba(240,96,90,.03));box-shadow:0 6px 26px rgba(240,96,90,.20)}' +
    '.od-tile.od-t-over.od-hot .k{color:var(--bad)}' +
    '.od-tile.od-t-over.od-hot b{color:var(--bad)}' +
    '.od-tile.od-t-over.od-cool b{color:var(--ok)}' +
    '.od-alarm{border:1px solid rgba(240,96,90,.62);border-radius:12px;padding:16px 18px;background:linear-gradient(135deg,rgba(240,96,90,.15),rgba(240,96,90,.02));box-shadow:0 8px 30px rgba(240,96,90,.22)}' +
    '.od-alarm h2{font-size:15px;font-weight:800;color:var(--bad);display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.od-alarm .od-big{font-size:44px;font-weight:800;color:var(--bad);line-height:1;letter-spacing:-.02em}' +
    '.od-alarm .od-said{font-size:12.5px;color:var(--text-2);font-weight:700;margin-top:8px;line-height:1.55}' +
    '.od-calm{border:1px solid rgba(63,207,142,.35);border-radius:12px;padding:13px 16px;background:var(--ok-soft);font-weight:800;font-size:13px;color:var(--ok)}' +
    '.od-calm span{display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:3px}' +
    '.od-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:620px}' +
    '.od-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:8px 11px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.od-tbl td{padding:9px 11px;border-bottom:1px solid var(--gold-line);vertical-align:top;word-break:break-word}' +
    '.od-tbl td.od-r{text-align:right;white-space:nowrap}' +
    '.od-tbl tr.od-late td{color:var(--bad);font-weight:800}' +
    '.od-tbl.od-narrow{min-width:0}' +
    '.od-ds{width:100%;border-collapse:collapse;font-size:12.5px}' +
    '.od-ds td{padding:8px 2px;border-bottom:1px solid var(--gold-line)}' +
    '.od-ds td.od-v{text-align:right;font-weight:800}' +
    '.od-ds tr.od-late td{color:var(--bad)}' +
    '.od-acct{margin-top:16px}' +
    '.od-mini{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}' +
    '.od-mini .od-tile{padding:11px 12px}.od-mini .od-tile b{font-size:22px}' +
    '.od-mini .od-tile.od-t-over{grid-column:span 1}.od-mini .od-tile.od-t-over b{font-size:26px}' +
    '.pill.od-p-pending{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.od-p-move{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.od-p-done{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.od-p-bad{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.od-p-shadow{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '@media (max-width:880px){' +
      '.od-bar{grid-template-columns:1fr 1fr}' +
      '.od-tiles{grid-template-columns:1fr 1fr}.od-tile.od-t-over{grid-column:span 2}' +
      '.od-mini{grid-template-columns:1fr 1fr}' +
      '.od-prod{grid-template-columns:1fr}.od-shot img,.od-shot .od-alt{height:150px}' +
      '.od-facts{grid-template-columns:1fr 1fr}' +
      '.od-grid{grid-template-columns:1fr}' +
      '.od-addr-l{flex-direction:column;gap:2px}.od-addr-l .k{min-width:0}' +
    '}' +
    '@media (max-width:430px){' +
      '.od-bar{grid-template-columns:1fr}' +
      '.od-tiles{grid-template-columns:1fr}.od-tile.od-t-over{grid-column:span 1}' +
      '.od-facts{grid-template-columns:1fr}' +
      '.od-tile b{font-size:26px}.od-tile.od-t-over b{font-size:34px}' +
    '}'
  );

  // ---------- safety (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function odAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function odStr(v) { return String(v == null ? '' : v).trim(); }
  function odRaw(v) { return String(v == null ? '' : v); }
  function odHas(arr, v) { return !!arr && arr.indexOf(v) >= 0; }
  function odPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) { return els[i]; } }
    return null;
  }
  function odRole() { return (STATE.user && STATE.user.role) || ''; }

  /** 'Sold for' is TEXT carrying its own '£' on the live tabs; 'Cost' is a float. Print money as
   *  the sheet stores it, and only format what is genuinely numeric. */
  function odMoney(v) {
    var s = odStr(v), n;
    if (!s) { return ''; }
    if (/[£$€]/.test(s)) { return s; }
    n = Number(s.replace(/,/g, ''));
    return isFinite(n) && s !== '' ? '£' + n.toFixed(2) : s;
  }
  function odInt(v) { var n = Number(v); return isFinite(n) ? String(Math.round(n)) : odStr(v); }
  function odCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }
  function odTodayPkt() {
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: OD_TZ_PKT, year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) { return ''; }
  }
  function odRetry(msg, err, id) {
    return '<div class="od-empty">' + esc(msg) + '<span>' + esc(err) + '</span>' +
      '<button class="minibtn" id="' + id + '" style="margin-top:10px">Try again</button></div>';
  }
  function odStatusPill(status) {
    var s = odStr(status);
    if (!s) { return 'od-p-pending'; }
    if (s === 'Delivered' || s === 'Complete') { return 'od-p-done'; }
    if (s === 'Custom Stuck' || s === 'Contact Customer/ Late') { return 'od-p-bad'; }
    if (s === 'Pending') { return 'od-p-pending'; }
    return 'od-p-move';
  }

  /* Accounts are BUSINESS DATA: fetched from the signed-in backend, never listed in this file —
     the built page is public (RL-2/RL-9), and the registry stays the single source of truth. */
  var OD_ACCOUNTS = [];
  function odLoadAccounts(then) {
    cachedCall('accountList', {}, function (d) {
      OD_ACCOUNTS = ((d && d.accounts) || []).map(function (a) { return odStr(a.account); })
        .filter(function (a) { return !!a; });
      if (typeof then === 'function') { then(); then = null; }
    }).done.catch(function () { if (typeof then === 'function') { then(); } });
  }
  function odAccountOptions(selected) {
    var opts = OD_ACCOUNTS.map(function (a) {
      return '<option value="' + odAttr(a) + '"' + (a === selected ? ' selected' : '') + '>' + esc(a) + '</option>';
    }).join('');
    return OD_ACCOUNTS.length ? opts : '<option value="">No account connected yet</option>';
  }

  // ============================================================================================
  //                        §10.1 — TODAY'S ORDERS (the processor's screen)
  // ============================================================================================

  var OD_ACCOUNT = '';
  var OD_DATE = '';
  var OD_REPLACEMENT = false;
  var OD_DATA = null;                 // the last todayOrders payload
  /* Typed-but-unsaved values, keyed account|tab|row|field. The processor fills Cost and the
     AliExpress order number in one pass and the tracking number an hour later; a save of one
     step, a reload, or a re-render of one card must never wipe what is typed in another. */
  var OD_DRAFT = {};

  function odDraftKey(row, field) {
    return OD_ACCOUNT + '|' + odStr(OD_DATA && OD_DATA.tab) + '|' + row + '|' + field;
  }
  function odDraftGet(row, field) {
    var k = odDraftKey(row, field);
    return Object.prototype.hasOwnProperty.call(OD_DRAFT, k) ? OD_DRAFT[k] : null;
  }
  function odDraftSet(row, field, value) { OD_DRAFT[odDraftKey(row, field)] = value; }
  function odDraftClear(row, field) { delete OD_DRAFT[odDraftKey(row, field)]; }

  /** The value a field should show: the draft if one exists, otherwise the sheet's own value. */
  function odFieldValue(o, field, sheetKey) {
    var d = odDraftGet(o._row, field);
    return d === null ? odStr(o[sheetKey]) : d;
  }
  function odDirty(o, field, sheetKey) {
    var d = odDraftGet(o._row, field);
    return d !== null && d !== odStr(o[sheetKey]);
  }

  VIEWS.orders = {
    label: 'Today\'s orders',
    icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    roles: OD_VIEW_ROLES,
    order: 3,
    badge: function () { return (STATE.counts && STATE.counts.orders) || 0; },
    render: function () {
      OD_DATE = OD_DATE || odTodayPkt();
      return '<div class="hgroup enter d1"><h1>Today\'s orders</h1>' +
          '<span class="sub">Purchase on AliExpress · record Cost, the AliExpress order number and the purchasing account · tracking follows</span>' +
          '<button class="minibtn" id="odRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">Account and day ' +
          '<span class="hint">Pakistan time · one workbook per account, one tab per day</span></div>' +
          '<div class="bd">' +
            '<div class="od-bar">' +
              '<div class="field" style="margin-top:0"><label>Account</label>' +
                '<select class="od-sel" id="odAccount"><option value="">Loading…</option></select></div>' +
              '<div class="field" style="margin-top:0"><label>Day</label>' +
                '<input class="od-in" id="odDate" type="date" value="' + odAttr(OD_DATE) + '"></div>' +
              '<button class="btn-gold" id="odLoad">Open the day</button>' +
              '<button class="minibtn" id="odToday">Today</button>' +
            '</div>' +
            '<div class="od-tabs">' +
              '<button class="od-tab on" id="odTabDay">Daily orders</button>' +
              '<button class="od-tab" id="odTabRep">' + esc(OD_REPLACEMENT_TAB) + '</button>' +
              '<span class="od-note" id="odWhere" style="align-self:center"></span>' +
            '</div>' +
            '<div class="od-sum" id="odSummary"></div>' +
          '</div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Orders ' +
          '<span class="hint">The portal writes Cost · Order Number · Tracking number · Email · Delivery Status · New Ali Link — nothing else on the row</span></div>' +
          '<div class="bd" id="odList"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      $('odRefresh').onclick = odLoad;
      $('odLoad').onclick = function () {
        OD_ACCOUNT = odStr($('odAccount').value);
        OD_DATE = odStr($('odDate').value);
        odLoad();
      };
      $('odToday').onclick = function () {
        OD_DATE = odTodayPkt();
        $('odDate').value = OD_DATE;
        OD_REPLACEMENT = false;
        odMarkTabs();
        odLoad();
      };
      if ($('odDate')) {
        $('odDate').addEventListener('change', function () { OD_DATE = odStr(this.value); OD_REPLACEMENT = false; odMarkTabs(); odLoad(); });
        enhanceDate($('odDate'), { kind: 'day' });
      }
      $('odTabDay').onclick = function () { if (!OD_REPLACEMENT) { return; } OD_REPLACEMENT = false; odMarkTabs(); odLoad(); };
      $('odTabRep').onclick = function () { if (OD_REPLACEMENT) { return; } OD_REPLACEMENT = true; odMarkTabs(); odLoad(); };
      $('odDate').onchange = function () { OD_DATE = odStr(this.value); };
      odMarkTabs();
      odLoadAccounts(function () {
        var sel = $('odAccount');
        if (!sel) { return; }
        if (!OD_ACCOUNT && OD_ACCOUNTS.length) { OD_ACCOUNT = OD_ACCOUNTS[0]; }
        sel.innerHTML = odAccountOptions(OD_ACCOUNT);
        sel.onchange = function () { OD_ACCOUNT = odStr(this.value); };
        odLoad();
      });
    }
  };

  function odMarkTabs() {
    var day = $('odTabDay'), rep = $('odTabRep'), date = $('odDate');
    if (day) { day.className = 'od-tab' + (OD_REPLACEMENT ? '' : ' on'); }
    if (rep) { rep.className = 'od-tab' + (OD_REPLACEMENT ? ' on' : ''); }
    if (date) { date.disabled = OD_REPLACEMENT; }      // REPLACEMENT is one standing tab, not a day
  }

  function odLoad() {
    var box = $('odList');
    if (!box) { return; }
    if (!OD_ACCOUNT) {
      box.innerHTML = '<div class="od-empty">Choose an account first.' +
        '<span>Accounts come from the Central Sheets registry — if one is missing, Management links its Order Processing workbook.</span></div>';
      odSummary(null);
      return;
    }
    var payload = { account: OD_ACCOUNT };
    if (OD_REPLACEMENT) { payload.tab = OD_REPLACEMENT_TAB; } else { payload.date = OD_DATE || odTodayPkt(); }

    var oc = cachedCall('todayOrders', payload, function (d) {
      OD_DATA = d || null;
      if (!d || !d.ok) {
        odSummary(d);
        box.innerHTML = '<div class="od-empty">' + esc(odStr(d && d.reason) || 'Nothing to open here.') +
          '<span>' + esc(OD_ACCOUNT) + ' · ' + esc(OD_REPLACEMENT ? OD_REPLACEMENT_TAB : odStr(d && d.date) || odStr(OD_DATE)) +
          ' — a day with no tab yet is normal before the sync builds it.</span></div>';
        odCount('orders', 0);
        return;
      }
      odSummary(d);
      var orders = d.orders || [];
      if (!orders.length) {
        box.innerHTML = '<div class="od-empty">No order rows on ' + esc(odStr(d.tab)) + ' yet.' +
          '<span>The automation pulls the orders in; they appear here the moment the tab has them.</span></div>';
        odCount('orders', 0);
        return;
      }
      box.innerHTML = orders.map(odCard).join('');
      odWire(box);
      /* req 16 capture — delegated, wired once (odLoad repaints must not stack listeners) */
      if (!box.dataset.aliWired) { box.dataset.aliWired = '1';
      box.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-od-alilink-save]') : null;
        if (!b) { return; }
        var ono = b.getAttribute('data-od-alilink-save');
        var inp = box.querySelector('[data-od-alilink-in="' + ono.replace(/"/g, '\\"') + '"]');
        if (!inp || !inp.value.trim()) { toast('Paste the AliExpress link first.'); return; }
        b.disabled = true;
        api('orderAddAliLink', { account: OD_ACCOUNT, order_id: ono, ali_link: inp.value.trim() }).then(function (res) {
          b.disabled = false;
          toast(odStr(res && res.note) || 'Link saved.');
          b.parentNode.innerHTML = '<span class="od-note" style="color:var(--ok);font-weight:800">link saved ✓</span>';
        }).catch(function (e) {
          b.disabled = false;
          toast(e.message || 'Could not save the link.');
        });
      }); }
      odCount('orders', odOutstanding(orders));
    });
    if (!oc.painted) {
      box.innerHTML = '<div class="spinner"></div>';
      /* Engine fast paint (§10 step 1): today's eBay-side orders in ~150ms while the sheet
       * workspace loads. Replaced the moment the real payload lands; never overwrites it. */
      if (OD_ACCOUNT) {
        api('ordersLive', { account: OD_ACCOUNT }).then(function (d) {
          var b2 = $('odList');
          if (!b2 || OD_DATA) { return; }                  // the sheet answer already took over
          var rows = (d && d.rows) || [];
          if (!rows.length) { return; }
          var h = '<div class="od-empty" style="padding:8px 0 12px">⚡ ' + rows.length + ' order(s) today, live from eBay — the sheet workspace is loading behind this…</div>';
          rows.slice(0, 30).forEach(function (r) {
            var st = odStr(r.status);
            h += '<div class="od-fact" style="display:flex;gap:12px;align-items:center;margin-bottom:6px;flex-wrap:wrap">' +
              '<span class="mono" style="font-size:11.5px">' + esc(odStr(r.order_id)) + '</span>' +
              '<span style="flex:1;min-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700">' + esc(odStr(r.title) || odStr(r.item_id)) + '</span>' +
              '<span>' + esc(odStr(r.buyer)) + '</span>' +
              '<span class="num" style="font-weight:800">£' + (Number(r.sold) || 0).toFixed(2) + '</span>' +
              '<span style="font-size:10.5px;font-weight:800;color:' + (/FULFILLED/i.test(st) ? 'var(--ok)' : 'var(--warn)') + '">' + esc(st || '—') + '</span></div>';
          });
          b2.innerHTML = h;
        }).catch(function () {});
      }
    }
    oc.done.catch(function (e) {
      OD_DATA = null;
      odSummary(null);
      box.innerHTML = odRetry('The day could not be opened just now.', e.message, 'odRetry');
      var r = $('odRetry'); if (r) { r.onclick = odLoad; }
    });
  }

  /** Work still outstanding on this tab: a row with no Cost has not been purchased, a purchased
   *  row with no Tracking number has not been tracked. That is the processor's own queue. */
  function odOutstanding(orders) {
    var n = 0, i, o;
    for (i = 0; i < orders.length; i++) {
      o = orders[i];
      if (!odStr(o[OD_H.cost]) || !odStr(o[OD_H.tracking])) { n++; }
    }
    return n;
  }

  function odSummary(d) {
    var where = $('odWhere'), sum = $('odSummary');
    if (where) {
      where.textContent = d && d.ok
        ? 'Open: ' + odStr(d.tab) + ' · today in Pakistan is ' + odStr(d.today_pkt)
        : (d ? 'Not open · ' + odStr(d.reason || '') : '');
    }
    if (!sum) { return; }
    if (!d || !d.ok) { sum.innerHTML = ''; return; }

    var t = d.totals || null, chips = '';
    var orders = d.orders || [], noCost = 0, noTrack = 0, i;
    for (i = 0; i < orders.length; i++) {
      if (!odStr(orders[i][OD_H.cost])) { noCost++; }
      else if (!odStr(orders[i][OD_H.tracking])) { noTrack++; }
    }
    chips += odChip('Orders', esc(odInt(d.count)));
    chips += odChip('To purchase', esc(String(noCost)), noCost ? 'od-warn' : '');
    chips += odChip('Awaiting tracking', esc(String(noTrack)), noTrack ? 'od-warn' : '');
    if (t) {
      /* The tab's own row-2 totals line, read back rather than re-added here — the sheet's
         arithmetic stays the sheet's. */
      if (odStr(t[OD_H.qty])) { chips += odChip('Row 2 total', esc(odStr(t[OD_H.qty]))); }
      if (odStr(t[OD_H.cost])) { chips += odChip('Cost total', '<span class="num">' + esc(odMoney(t[OD_H.cost])) + '</span>'); }
      if (odStr(t[OD_H.earning])) { chips += odChip('Order Earning total', '<span class="num">' + esc(odMoney(t[OD_H.earning])) + '</span>'); }
    }
    if (!d.can_write) { chips += odChip('Read only', 'your role does not write order rows'); }
    if (d.truncated) { chips += odChip('Long tab', 'the portal read the first rows only', 'od-bad'); }
    sum.innerHTML = chips;
  }
  function odChip(k, v, cls) {
    return '<span class="od-chip' + (cls ? ' ' + cls : '') + '"><span class="k">' + esc(k) + '</span>' + v + '</span>';
  }

  // ---------- one order row ----------
  function odCard(o) {
    var row = String(o._row);
    var title = odStr(o[OD_H.title]) || 'Order';
    var status = odStr(o[OD_H.status]);
    var cols = (OD_DATA && OD_DATA.columns) || [];

    /* The pill is always in the DOM, empty and hidden when the cell is blank, so recording a
       status on a row that had none can light it up without re-rendering the card. */
    return '<div class="card od-row" data-card="' + odAttr(row) + '"><div class="hd">' +
        '<span class="od-name">' + esc(title) + '</span>' +
        '<span class="pill ' + odStatusPill(status) + (status ? '' : ' hidden') + '" data-pill="' + odAttr(row) + '">' +
          esc(status) + '</span>' +
        '<span class="mono" style="color:var(--text-3)">' + esc(odStr(o[OD_H.orderNo])) + '</span>' +
      '</div><div class="bd">' +
        odProduct(o, cols) +
        odAddress(o, cols) +
        odWorkBlock(o, cols, row) +
      '</div></div>';
  }

  /** What the processor needs in front of them to buy the right thing: the picture, what it sold
   *  for, how many, which variation, and the AliExpress link to open. */
  function odProduct(o, cols) {
    var img = safeUrl(odStr(o[OD_H.imageLink]));
    var ali = safeUrl(odStr(o[OD_H.aliLink]));
    var newAli = safeUrl(odStr(o[OD_H.newAliLink]));
    var facts = '';

    facts += odFact(OD_H.soldFor, '<span class="num">' + esc(odMoney(o[OD_H.soldFor])) + '</span>', true);
    facts += odFact(OD_H.qty, '<span class="num">' + esc(odStr(o[OD_H.qty]) || '1') + '</span>');
    /* §4.2 / RL-4: this renders only because the server chose to send it. */
    if (odHas(cols, OD_H.earning)) {
      facts += odFact(OD_H.earning, '<span class="num">' + esc(odMoney(o[OD_H.earning])) + '</span>', true);
    }
    facts += odFact(OD_H.variation, esc(odStr(o[OD_H.variation]) || '—'));

    var links = '';
    if (ali) {
      links += '<a class="od-ali" href="' + odAttr(ali) + '" target="_blank" rel="noopener noreferrer">Open ' + esc(OD_H.aliLink) + '</a>';
    } else if (newAli) {
      links += '<span class="od-note od-warn">No ' + esc(OD_H.aliLink) + ' on this row</span>';
    } else {
      /* Req 16: the seller link is captured ONCE, here, on the first order — it lands in the
       * Engine and (through the v19 bridge, under the sheet law) in the day tab's own
       * 'New Ali Link' column. */
      links += '<span class="od-note od-warn">No ' + esc(OD_H.aliLink) + ' yet</span>' +
        '<span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:100%">' +
        '<input class="od-in" style="width:220px;padding:6px 9px;font-size:12px" placeholder="paste the AliExpress link once" data-od-alilink-in="' + odAttr(odStr(o[OD_H.orderNo])) + '">' +
        '<button class="minibtn" data-od-alilink-save="' + odAttr(odStr(o[OD_H.orderNo])) + '">Save link</button></span>';
    }
    if (newAli) {
      links += '<a class="minibtn" href="' + odAttr(newAli) + '" target="_blank" rel="noopener noreferrer">' + esc(OD_H.newAliLink) + '</a>';
    }
    [OD_H.sup1, OD_H.sup2, OD_H.sup3].forEach(function (k) {
      var u = safeUrl(odStr(o[k]));
      if (u) { links += '<a class="minibtn" href="' + odAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(k) + '</a>'; }
    });

    return '<div class="od-prod">' +
        '<span class="od-shot">' + (img
          ? '<img src="' + odAttr(img) + '" alt="" data-shot="1">'
          : '<span class="od-alt">No image</span>') + '</span>' +
        '<div><div class="od-facts">' + facts + '</div>' +
          '<div class="od-links">' + links + '</div></div>' +
      '</div>';
  }
  function odFact(k, v, gold) {
    return '<div class="od-fact' + (gold ? ' od-gold' : '') + '"><span class="k">' + esc(k) + '</span><b>' + v + '</b></div>';
  }

  /** §4.2: buyer address is PII and the SERVER decides who gets it. Nothing is hidden here — the
   *  block simply does not exist when the payload carries no address field. The Post-to columns
   *  are also genuinely absent from 7 real tabs, so each line is drawn only when it arrives. */
  function odAddress(o, cols) {
    var full = odRaw(o[OD_H.address]);
    var lines = '', copy = [];
    OD_POST.forEach(function (k) {
      var v = odStr(o[k]);
      if (!odHas(cols, k) || !v) { return; }
      lines += '<div class="od-addr-l"><span class="k">' + esc(k) + '</span><span>' + esc(v) + '</span></div>';
      copy.push(v);
    });
    if (!odStr(full) && !lines) { return ''; }
    var text = odStr(full) || copy.join('\n');

    return '<div class="od-addr"><div class="od-addr-h"><span class="k">' + esc(OD_H.address) + '</span>' +
        '<span class="od-note">Buyer data — Order Processors, CS and Management only</span>' +
        '<button class="minibtn" data-act="copy" data-row="' + odAttr(String(o._row)) + '" style="margin-left:auto">Copy</button>' +
      '</div>' +
      '<div class="od-addr-b" data-addr="' + odAttr(String(o._row)) + '">' + esc(text) + '</div>' +
      (lines ? '<div class="od-addr-b" style="border-top:1px solid var(--gold-line)">' + lines + '</div>' : '') +
    '</div>';
  }

  /** The fields the processor fills. Two steps, two backend actions — and each sends ONLY its own
   *  fields, so recording tracking can never blank a Cost and recording a purchase can never
   *  blank a tracking number. Anything typed and not yet saved is held in OD_DRAFT. */
  function odWorkBlock(o, cols, row) {
    var w = (OD_DATA && OD_DATA.writable) || [];
    var can = !!(OD_DATA && OD_DATA.can_write);
    var opts = (OD_DATA && OD_DATA.delivery_status_options) || OD_STATUS_FALLBACK;
    var carrier = odCarrier(o);
    var dis = can ? '' : ' disabled';
    var purchase = '', track = '';

    if (odHas(w, OD_H.cost)) {
      purchase += odField(OD_H.cost, 'what you paid, £', odInput(row, 'cost', odFieldValue(o, 'cost', OD_H.cost),
        odDirty(o, 'cost', OD_H.cost), 'text', 'decimal', '', dis));
    }
    if (odHas(w, OD_H.aliOrderNo)) {
      purchase += odField(OD_H.aliOrderNo, 'AliExpress — 16 digits', odInput(row, 'ali', odFieldValue(o, 'ali', OD_H.aliOrderNo),
        odDirty(o, 'ali', OD_H.aliOrderNo), 'text', 'numeric', ' mono', dis));
    }
    if (odHas(w, OD_H.email)) {
      purchase += odField(OD_H.email, 'purchasing account used', odInput(row, 'email', odFieldValue(o, 'email', OD_H.email),
        odDirty(o, 'email', OD_H.email), 'text', '', '', dis));
    }
    if (odHas(w, OD_H.newAliLink)) {
      purchase += odField(OD_H.newAliLink, 'only if the first supplier failed', odInput(row, 'link', odFieldValue(o, 'link', OD_H.newAliLink),
        odDirty(o, 'link', OD_H.newAliLink), 'url', '', '', dis));
    }
    if (odHas(w, OD_H.tracking)) {
      track += odField(OD_H.tracking, 'from AliExpress', odInput(row, 'tracking', odFieldValue(o, 'tracking', OD_H.tracking),
        odDirty(o, 'tracking', OD_H.tracking), 'text', '', ' mono', dis));
    }
    if (odHas(w, OD_H.status)) {
      track += odField(OD_H.status, 'the tab\'s own dropdown', odSelect(row, 'status', odFieldValue(o, 'status', OD_H.status), opts, dis));
    }

    return '<div class="od-work">' +
      (purchase ? '<span class="k">Purchase</span><div class="od-grid">' + purchase + '</div>' +
        '<div class="od-btns">' +
          '<button class="btn-gold" data-act="purchase" data-row="' + odAttr(row) + '"' + dis + '>Record purchase</button>' +
          '<span class="od-note" data-msg="p' + odAttr(row) + '"></span>' +
        '</div>' : '') +
      (track ? '<div class="' + (purchase ? 'od-sep' : '') + '"><span class="k">Tracking</span><div class="od-grid">' + track + '</div>' +
        '<div class="od-btns">' +
          '<button class="btn-gold" data-act="tracking" data-row="' + odAttr(row) + '"' + dis + '>Record tracking</button>' +
          '<button class="btn-ghost" data-act="uploaded" data-row="' + odAttr(row) + '"' + dis + '>Uploaded to eBay</button>' +
          '<span class="od-note" data-msg="t' + odAttr(row) + '"></span>' +
        '</div></div>' : '') +
      (carrier ? '<div class="od-sep"><span class="k">Carrier note</span>' +
        '<div class="od-addr-b" style="padding:8px 0 0">' + esc(carrier) + '</div></div>' : '') +
      (can ? '' : '<div class="od-note" style="margin-top:10px">Read only — the Order Processors fill these fields.</div>') +
    '</div>';
  }

  function odField(label, hint, control) {
    return '<div class="field"><label>' + esc(label) + (hint ? ' <em>' + esc(hint) + '</em>' : '') + '</label>' + control + '</div>';
  }
  function odInput(row, field, value, dirty, type, mode, cls, dis) {
    return '<input class="od-in' + (cls || '') + (dirty ? ' od-dirty' : '') + '" type="' + odAttr(type || 'text') + '"' +
      (mode ? ' inputmode="' + odAttr(mode) + '"' : '') +
      ' autocomplete="off" data-f="' + odAttr(field) + '" data-row="' + odAttr(row) + '" value="' + odAttr(value) + '"' + dis + '>';
  }
  function odSelect(row, field, value, opts, dis) {
    var seen = false;
    var body = opts.map(function (s) {
      if (s === value) { seen = true; }
      return '<option value="' + odAttr(s) + '"' + (s === value ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('');
    /* The live column is polluted with free text ('Delivered' typed by hand, tracking numbers,
       notes). Whatever is in the cell is shown as its own option so opening the row never
       silently rewrites it to the first dropdown value. */
    var head = '<option value=""' + (value ? '' : ' selected') + '>—</option>' +
      (value && !seen ? '<option value="' + odAttr(value) + '" selected>' + esc(value) + '</option>' : '');
    return '<select class="od-sel" data-f="' + odAttr(field) + '" data-row="' + odAttr(row) + '"' + dis + '>' + head + body + '</select>';
  }
  /** The unheaded column after Delivery Status holds the carrier's own status text; the server
   *  emits it under a positional key because it genuinely has no name to preserve. */
  function odCarrier(o) {
    var k, v = '';
    for (k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k) && k.indexOf('col:') === 0) {
        if (odStr(o[k])) { v = odStr(o[k]); }
      }
    }
    return v;
  }

  // ---------- wiring ----------
  function odWire(box) {
    var btns = box.querySelectorAll('button[data-act]'), i;
    var ins = box.querySelectorAll('.od-in[data-f],.od-sel[data-f]');
    var imgs = box.querySelectorAll('img[data-shot]');

    for (i = 0; i < ins.length; i++) {
      (function (el) {
        var handler = function () {
          odDraftSet(el.getAttribute('data-row'), el.getAttribute('data-f'), odStr(el.value));
          odRedirty(el);
        };
        el.oninput = handler;
        el.onchange = handler;
      })(ins[i]);
    }
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { odAction(box, b.getAttribute('data-act'), b.getAttribute('data-row'), b); };
      })(btns[i]);
    }
    for (i = 0; i < imgs.length; i++) {
      (function (im) {
        im.onerror = function () {                       // a dead image link must not leave a broken frame
          var alt = document.createElement('span');
          alt.className = 'od-alt';
          alt.textContent = 'No image';
          if (im.parentNode) { im.parentNode.insertBefore(alt, im); }
          im.classList.add('hidden');
        };
      })(imgs[i]);
    }
  }
  function odRedirty(el) {
    var o = odFind(el.getAttribute('data-row'));
    var f = el.getAttribute('data-f');
    var keyed = { cost: OD_H.cost, ali: OD_H.aliOrderNo, email: OD_H.email, link: OD_H.newAliLink, tracking: OD_H.tracking, status: OD_H.status };
    if (!o || !keyed[f] || el.className.indexOf('od-sel') >= 0) { return; }
    if (odStr(el.value) !== odStr(o[keyed[f]])) { el.classList.add('od-dirty'); } else { el.classList.remove('od-dirty'); }
  }

  function odFind(row) {
    var orders = (OD_DATA && OD_DATA.orders) || [], i;
    for (i = 0; i < orders.length; i++) { if (String(orders[i]._row) === String(row)) { return orders[i]; } }
    return null;
  }
  function odMsg(box, slot, text, cls) {
    var el = odPick(box, 'data-msg', slot);
    if (!el) { return; }
    el.className = 'od-note' + (cls ? ' ' + cls : '');
    el.textContent = text;
  }

  function odAction(box, act, row, btn) {
    if (act === 'copy') { odCopy(box, row, btn); return; }
    if (act === 'purchase') { odSavePurchase(box, row, btn); return; }
    if (act === 'tracking') { odSaveTracking(box, row, btn, false); return; }
    if (act === 'uploaded') { odSaveTracking(box, row, btn, true); return; }
  }

  function odCopy(box, row, btn) {
    var el = odPick(box, 'data-addr', row);
    var text = el ? el.textContent : '';
    var label = btn.textContent;
    var done = function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = label; }, 1500);
    };
    var manual = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Select the address and copy it manually.'); }
      document.body.removeChild(ta);
    };
    if (!text) { return; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, manual);
        return;
      }
    } catch (e) { /* falls through to the manual path */ }
    manual();
  }

  /** The target of every write: the account, the tab the list was opened on, the eBay order
   *  number AND the row. Multi-variant orders repeat the same order number on consecutive rows,
   *  so sending the row is what makes the right line get written. */
  function odTarget(o) {
    var p = { account: OD_ACCOUNT, order_number: odStr(o[OD_H.orderNo]), row: o._row };
    if (OD_REPLACEMENT) { p.tab = OD_REPLACEMENT_TAB; } else { p.date = odStr(OD_DATA && OD_DATA.date) || OD_DATE; }
    return p;
  }

  function odSavePurchase(box, row, btn) {
    var o = odFind(row);
    if (!o) { return; }
    var cost = odCurrent(box, row, 'cost', o, OD_H.cost);
    var ali = odCurrent(box, row, 'ali', o, OD_H.aliOrderNo);
    var email = odCurrent(box, row, 'email', o, OD_H.email);
    var link = odCurrent(box, row, 'link', o, OD_H.newAliLink);
    var p = odTarget(o), fields = [];

    /* Only what actually changed is sent — an unchanged field is left out so the server never
       rewrites a cell it did not need to touch. */
    if (cost.changed) {
      if (!/^£?\s*\d+(\.\d{1,2})?$/.test(cost.value.replace(/,/g, ''))) { toast(OD_H.cost + ' is an amount in pounds, like 6.49.'); return; }
      p.cost = cost.value; fields.push('cost');
    }
    if (ali.changed) {
      if (!/^\d{8,24}$/.test(ali.value.replace(/\s/g, ''))) { toast('An AliExpress order number is 8 to 24 digits.'); return; }
      p.ali_order_number = ali.value; fields.push('ali');
    }
    if (email.changed) { p.email = email.value; fields.push('email'); }
    if (link.changed) {
      if (!safeUrl(link.value)) { toast(OD_H.newAliLink + ' must start with http:// or https://'); return; }
      p.new_ali_link = link.value; fields.push('link');
    }
    if (!fields.length) { odMsg(box, 'p' + row, 'Nothing changed on this row.', ''); return; }
    if (!p.order_number) { odMsg(box, 'p' + row, 'This row carries no ' + OD_H.orderNo + ' — it cannot be written.', 'od-bad'); return; }

    odSend(box, btn, 'recordPurchase', p, row, 'p' + row, fields,
      { cost: OD_H.cost, ali: OD_H.aliOrderNo, email: OD_H.email, link: OD_H.newAliLink });
  }

  function odSaveTracking(box, row, btn, uploaded) {
    var o = odFind(row);
    if (!o) { return; }
    var tracking = odCurrent(box, row, 'tracking', o, OD_H.tracking);
    var status = odCurrent(box, row, 'status', o, OD_H.status);
    var p = odTarget(o), fields = [];

    if (tracking.changed) {
      if (tracking.value.length < 6) { toast('That ' + OD_H.tracking + ' looks too short.'); return; }
      p.tracking_number = tracking.value; fields.push('tracking');
    }
    if (status.changed && status.value) { p.delivery_status = status.value; fields.push('status'); }
    if (uploaded) {
      /* The tracking-upload step, owned by whoever CONFIG 'orders_tracking_uploader' names. The
         server stamps 'Tracking' itself when no status is chosen, and refuses the whole thing if
         the row has no tracking number to upload — so the check is here too, to say so before a
         round trip. */
      p.uploaded = true;
      if (!tracking.value && !odStr(o[OD_H.tracking])) {
        odMsg(box, 't' + row, 'Put the ' + OD_H.tracking + ' in first — there is nothing to upload yet.', 'od-bad');
        return;
      }
      if (!fields.length) { fields.push('status'); }
    }
    if (!fields.length) { odMsg(box, 't' + row, 'Nothing changed on this row.', ''); return; }
    if (!p.order_number) { odMsg(box, 't' + row, 'This row carries no ' + OD_H.orderNo + ' — it cannot be written.', 'od-bad'); return; }

    odSend(box, btn, 'recordTracking', p, row, 't' + row, fields, { tracking: OD_H.tracking, status: OD_H.status });
  }

  /** The live value of one field: what is on screen now, plus whether it differs from the sheet. */
  function odCurrent(box, row, field, o, sheetKey) {
    var el = null, els = box.querySelectorAll('[data-f="' + field + '"]'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute('data-row') === String(row)) { el = els[i]; } }
    var value = el ? odStr(el.value) : odFieldValue(o, field, sheetKey);
    return { el: el, value: value, changed: value !== '' && value !== odStr(o[sheetKey]) };
  }

  function odSend(box, btn, action, payload, row, slot, fields, keyed) {
    btn.disabled = true;
    odMsg(box, slot, 'Writing…', '');
    api(action, payload).then(function (res) {
      btn.disabled = false;
      if (!res || !res.ok) {
        odMsg(box, slot, odStr(res && res.reason) || 'The sheet did not take this.', 'od-bad');
        return;
      }
      var o = odFind(row);
      if (res.shadow) {
        /* SHADOW MODE: the intent was logged, the workbook was NOT changed. The typed values stay
           in the draft and stay marked unsaved — telling the processor it is done would be a lie. */
        odMsg(box, slot, 'Shadow mode — logged, not written to the sheet yet.', 'od-warn');
        toast('Shadow mode: recorded in the log, the workbook is unchanged.');
        return;
      }
      /* Written for real: the sheet is now the truth, so the record takes the new values and the
         drafts for THOSE fields clear. Every other field on the row keeps whatever is typed. */
      if (o) {
        fields.forEach(function (f) {
          var sheetKey = keyed[f];
          var sent = { cost: payload.cost, ali: payload.ali_order_number, email: payload.email,
            link: payload.new_ali_link, tracking: payload.tracking_number, status: payload.delivery_status };
          if (sheetKey && sent[f] !== undefined) { o[sheetKey] = sent[f]; }
          if (f === 'status' && sent.status === undefined && payload.uploaded) { o[OD_H.status] = 'Tracking'; }
          odDraftClear(row, f);
        });
      }
      var skipped = (res.skipped || []).length ? ' · not on this tab: ' + (res.skipped || []).join(', ') : '';
      var unchanged = (res.unchanged || []).length ? ' · already the same: ' + (res.unchanged || []).join(', ') : '';
      odMsg(box, slot, 'Saved to ' + odStr(res.tab) + ' row ' + odInt(res.row) +
        ((res.written || []).length ? ' · ' + (res.written || []).join(', ') : '') + unchanged + skipped, 'od-ok');
      odRepaint(box, row);
      if (OD_DATA && OD_DATA.orders) { odCount('orders', odOutstanding(OD_DATA.orders)); }
      odSummary(OD_DATA);
    }).catch(function (e) {
      btn.disabled = false;
      odMsg(box, slot, 'Not saved: ' + e.message, 'od-bad');
    });
  }

  /** Repaint one row's saved state without re-rendering the card: the inputs keep their DOM
   *  values (drafts included), the pill and the dirty marks catch up. */
  function odRepaint(box, row) {
    var o = odFind(row), card = odPick(box, 'data-card', String(row));
    if (!o || !card) { return; }
    var keyed = { cost: OD_H.cost, ali: OD_H.aliOrderNo, email: OD_H.email, link: OD_H.newAliLink, tracking: OD_H.tracking };
    var els = card.querySelectorAll('.od-in[data-f]'), i, f;
    for (i = 0; i < els.length; i++) {
      f = els[i].getAttribute('data-f');
      if (!keyed[f]) { continue; }
      if (odDraftGet(row, f) === null) { els[i].value = odStr(o[keyed[f]]); }
      odRedirty(els[i]);
    }
    var pill = odPick(card, 'data-pill', String(row)), status = odStr(o[OD_H.status]);
    if (pill) {
      pill.className = 'pill ' + odStatusPill(status) + (status ? '' : ' hidden');
      pill.textContent = status;
    }
  }

  // ============================================================================================
  //                             §10.2 — DISPATCH (the tiles that cost money)
  // ============================================================================================

  var OD_MONTH = '';
  var OD_DASH = null;

  VIEWS.dispatch = {
    label: 'Dispatch',
    icon: '<path d="M1 3h13v13H1z"/><path d="M14 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/>',
    roles: OD_DISPATCH_ROLES,
    order: 4,
    prefetch: function () {
      var payload = { month: odTodayPkt().slice(0, 7) };
      return api('dispatchDashboard', payload).then(function (d) { if (typeof cacheWrite === 'function') { cacheWrite('dispatchDashboard', payload, d); } });
    },
    badge: function () { return (STATE.counts && STATE.counts.dispatch) || 0; },
    render: function () {
      OD_MONTH = OD_MONTH || odTodayPkt().slice(0, 7);
      return '<div class="hgroup enter d1"><h1>Dispatch</h1>' +
          '<span class="sub">' + esc(OD_TILE_OVERDUE) + ' is the number that costs money — everything else on this screen is context</span>' +
          '<button class="minibtn" id="odDsRefresh" style="margin-left:auto">Recompute</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">Month and account ' +
          '<span class="hint">Counted from the real order rows, not the workbook\'s static Dashboard tab</span></div>' +
          '<div class="bd"><div class="od-bar">' +
            '<div class="field" style="margin-top:0"><label>Account</label>' +
              '<select class="od-sel" id="odDsAccount"><option value="">All my accounts</option></select></div>' +
            '<div class="field" style="margin-top:0"><label>Month</label>' +
              '<input class="od-in" id="odDsMonth" type="month" value="' + odAttr(OD_MONTH) + '"></div>' +
            '<button class="btn-gold" id="odDsLoad">Show</button>' +
            '<span class="od-note" id="odDsWhen" style="align-self:center"></span>' +
          '</div></div>' +
        '</div>' +
        '<div id="odDsLive" style="margin-top:16px"><div class="spinner"></div></div>' +
        '<div id="odDsAlarm" style="margin-top:16px"></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">All accounts ' +
          '<span class="hint">§10.2 tiles · dispatch status</span></div>' +
          '<div class="bd" id="odDsTop"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="odDsAccounts"></div>';
    },
    init: function () {
      $('odDsRefresh').onclick = function () { odDashLoad(true); odLivePaint(); };
      odLivePaint();
      $('odDsLoad').onclick = function () {
        OD_MONTH = odStr($('odDsMonth').value) || OD_MONTH;
        odDashLoad(false);
        odLivePaint();
      };
      $('odDsMonth').onchange = function () { OD_MONTH = odStr(this.value) || OD_MONTH; odDashLoad(false); };
      enhanceDate($('odDsMonth'), { kind: 'month' });
      odLoadAccounts(function () {
        var sel = $('odDsAccount');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All my accounts</option>' + OD_ACCOUNTS.map(function (a) {
          return '<option value="' + odAttr(a) + '">' + esc(a) + '</option>';
        }).join('');
        odDashLoad(false);
      });
    }
  };

  /* LATE NOW, straight from eBay. The board below this strip is built by scanning the day tabs,
     which cannot see a deadline eBay set per listing, resets its overdue count every 1st of the
     month, and counts each line of a multi-line order separately. This strip asks the orders
     table instead: one row per order, eBay's own ship-by, eBay's own fulfilment status. Where the
     two disagree, this one is the one to act on. */
  function odLiveRow(r) {
    var late = Number(r.hours_late) || 0;
    var days = Math.floor(late / 24);
    var when = days >= 1 ? days + (days === 1 ? ' day' : ' days') + ' late' : Math.max(1, Math.round(late)) + 'h late';
    return '<tr>' +
      '<td><b>' + esc(String(r.order_id)) + '</b><div style="font-size:10.5px;color:var(--text-3)">' + esc(String(r.account || '')) + '</div></td>' +
      '<td><div style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(String(r.title || r.item_id || '')) + '</div></td>' +
      '<td class="num">' + (Number(r.sold) ? '£' + Number(r.sold).toFixed(2) : '—') + '</td>' +
      '<td>' + esc(String(r.ship_by || '').slice(0, 10)) + '</td>' +
      '<td><span class="od-late">' + esc(when) + '</span></td>' +
      '<td>' + (r.has_tracking ? 'tracking on the sheet' : '<span style="color:var(--bad);font-weight:700">no tracking</span>') + '</td>' +
    '</tr>';
  }

  function odLivePaint() {
    var box = $('odDsLive');
    if (!box) { return; }
    var one = odStr($('odDsAccount') && $('odDsAccount').value);
    var payload = one ? { account: one } : {};
    api('dispatchLive', payload).then(function (d) {
      d = d || {};
      var late = Number(d.late_count) || 0;
      var tiles =
        '<div class="od-livetiles">' +
          '<div class="od-lt ' + (late ? 'bad' : 'good') + '"><b>' + late + '</b><span>late right now</span>' +
            (Number(d.late_value) ? '<i>£' + Number(d.late_value).toFixed(2) + ' of orders</i>' : '') + '</div>' +
          '<div class="od-lt"><b>' + (Number(d.due_soon_count) || 0) + '</b><span>due within 3 days</span></div>' +
          '<div class="od-lt"><b>' + (Number(d.awaiting_count) || 0) + '</b><span>awaiting dispatch</span></div>' +
          '<div class="od-lt"><b>' + (Number(d.orders_today) || 0) + '</b><span>came in today</span></div>' +
        '</div>';
      var rows = (d.late || []).map(odLiveRow).join('');
      var caveat = Number(d.no_deadline_count)
        ? '<div class="od-note" style="margin-top:8px">' + Number(d.no_deadline_count) +
          ' open order(s) carry no ship-by from eBay yet — they are not counted above rather than guessed at.</div>' : '';
      box.innerHTML = '<div class="card"><div class="hd">Late right now ' +
          '<span class="hint">eBay\u2019s own ship-by deadline · not bounded to a month</span></div>' +
          '<div class="bd">' + tiles +
          (rows ? '<div class="scroll" style="margin-top:12px"><table class="od-tbl"><thead><tr>' +
            '<th>Order</th><th>Item</th><th>Value</th><th>Ship by</th><th>How late</th><th>Tracking</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>'
            : '<div class="empty" style="margin-top:10px">Nothing is past its eBay deadline. That is the number that matters.</div>') +
          caveat +
        '</div></div>';
    }).catch(function (e) {
      box.innerHTML = '<div class="card"><div class="bd"><div class="empty">The live dispatch feed did not answer — ' +
        esc(e && e.message ? e.message : 'no answer') + '</div></div></div>';
    });
  }

  function odDashLoad(refresh) {
    var top = $('odDsTop'), cards = $('odDsAccounts'), alarm = $('odDsAlarm');
    if (!top) { return; }

    var one = odStr($('odDsAccount') && $('odDsAccount').value);
    var payload = { month: OD_MONTH || odTodayPkt().slice(0, 7) };
    if (one) { payload.account = one; }
    if (refresh) { payload.refresh = true; }

    var dc = cachedCall('dispatchDashboard', payload, function (d) {
      OD_DASH = d || null;
      var agg = (d && d.aggregate) || {};
      var overdue = Number(agg[OD_TILE_OVERDUE]) || 0;
      var when = $('odDsWhen');
      if (when) {
        when.textContent = 'Month ' + odStr(d && d.month) + ' · today in Pakistan is ' + odStr(d && d.today_pkt) +
          ' · ship-by is ' + odInt(d && d.sla_days) + ' days from the order\'s day tab';
      }
      if (alarm) { alarm.innerHTML = odAlarm(d, overdue); }
      top.innerHTML = odTiles(agg, false) + odDispatchTable(d && d.dispatch_status);
      if (cards) { cards.innerHTML = ((d && d.accounts) || []).map(odAccountCard).join(''); }
      odCount('dispatch', overdue);
    });
    if (!dc.painted) {
      top.innerHTML = '<div class="spinner"></div>';
      if (cards) { cards.innerHTML = ''; }
      if (alarm) { alarm.innerHTML = ''; }
    }
    dc.done.catch(function (e) {
      OD_DASH = null;
      top.innerHTML = odRetry('The dispatch figures could not be computed just now.', e.message, 'odDsRetry');
      var r = $('odDsRetry'); if (r) { r.onclick = function () { odDashLoad(false); }; }
    });
  }

  /** The four §10.2 tiles, in the workbook's own order. OVERDUE NOW is given twice the width and
   *  the biggest figure, and turns var(--bad) the moment it is not zero. */
  function odTiles(tiles, mini) {
    var overdue = Number(tiles[OD_TILE_OVERDUE]) || 0;
    var due = Number(tiles[OD_TILE_DUE]) || 0;
    return '<div class="' + (mini ? 'od-mini' : 'od-tiles') + '">' +
      odTile(OD_TILE_MONTH, tiles[OD_TILE_MONTH], 'od-t-gold', '') +
      odTile(OD_TILE_AWAITING, tiles[OD_TILE_AWAITING], 'od-t-live', 'not dispatched yet') +
      odTile(OD_TILE_DUE, tiles[OD_TILE_DUE], due ? 'od-t-warn' : '', 'ship within 3 days') +
      odTile(OD_TILE_OVERDUE, overdue, 'od-t-over ' + (overdue ? 'od-hot' : 'od-cool'),
        overdue ? 'past the ship-by date' : 'nothing past its ship-by date') +
    '</div>';
  }
  function odTile(label, value, cls, sub) {
    var n = Number(value);
    return '<div class="od-tile' + (cls ? ' ' + cls : '') + '">' +
      '<span class="k">' + esc(label) + '</span>' +
      '<b class="num">' + esc(isFinite(n) ? String(n) : odStr(value) || '0') + '</b>' +
      (sub ? '<span class="od-sub">' + esc(sub) + '</span>' : '') +
    '</div>';
  }

  /** When something is overdue it gets the top of the screen and the actual order numbers — a
   *  count nobody can act on is not worth the pixels. */
  function odAlarm(d, overdue) {
    if (!d) { return ''; }
    if (!overdue) {
      return '<div class="od-calm">Nothing overdue right now.' +
        '<span>Every order still awaiting dispatch is inside its ' + esc(odInt(d.sla_days)) + '-day ship-by window.</span></div>';
    }
    var rows = odOverdueRows(d);
    return '<div class="od-alarm enter d1">' +
        '<h2><span class="od-big num">' + esc(String(overdue)) + '</span> ' + esc(OD_TILE_OVERDUE) + '</h2>' +
        '<div class="od-said">' + esc(overdue === 1 ? 'One order is past its ship-by date' : String(overdue) + ' orders are past their ship-by date') +
          ' — every day one sits here is a late-delivery defect on the account. Buy it, track it, or cancel it.</div>' +
        (rows.length ? '<div class="scroll" style="margin-top:13px">' + odDueTable(rows, true) + '</div>' : '') +
      '</div>';
  }
  /** The server sends due-and-overdue rows together per account; a negative Days Left is overdue. */
  function odOverdueRows(d) {
    var out = [];
    ((d && d.accounts) || []).forEach(function (a) {
      if (!a || !a.ok) { return; }
      (a.due || []).forEach(function (r) {
        if (Number(r['Days Left']) < 0) { out.push({ account: a.account, r: r }); }
      });
    });
    out.sort(function (x, y) { return Number(x.r['Days Left']) - Number(y.r['Days Left']); });
    return out;
  }

  function odDueTable(rows, withAccount) {
    var head = (withAccount ? '<th>Account</th>' : '') +
      OD_DUE_COLS.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
    var body = rows.map(function (x) {
      var r = x.r || x, late = Number(r['Days Left']) < 0;
      return '<tr' + (late ? ' class="od-late"' : '') + '>' +
        (withAccount ? '<td>' + esc(odStr(x.account)) + '</td>' : '') +
        '<td>' + esc(odStr(r['Day Tab'])) + '</td>' +
        '<td class="mono">' + esc(odStr(r['Order No'])) + '</td>' +
        '<td>' + esc(odStr(r['Item'])) + '</td>' +
        '<td class="num">' + esc(odStr(r['Order Date'])) + '</td>' +
        '<td class="num">' + esc(odStr(r['Ship By'])) + '</td>' +
        '<td class="od-r num">' + esc(odDaysLeft(r['Days Left'])) + '</td>' +
        '<td>' + esc(odStr(r['Status']) || '—') + '</td>' +
      '</tr>';
    }).join('');
    return '<table class="od-tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }
  function odDaysLeft(v) {
    var n = Number(v);
    if (!isFinite(n)) { return odStr(v); }
    if (n < 0) { return String(-n) + ' late'; }
    return n === 0 ? 'today' : String(n);
  }

  function odDispatchTable(rows) {
    if (!rows || !rows.length) { return ''; }
    var body = rows.map(function (r) {
      var label = odStr(r['Dispatch status']), n = Number(r['Orders']) || 0;
      var late = label === OD_ROW_OVERDUE && n > 0;
      return '<tr' + (late ? ' class="od-late"' : '') + '><td>' + esc(label) + '</td>' +
        '<td class="od-v num">' + esc(String(n)) + '</td></tr>';
    }).join('');
    return '<div style="margin-top:16px"><span class="od-note" style="display:block;margin-bottom:4px">Dispatch status · Orders</span>' +
      '<table class="od-ds">' + body + '</table></div>';
  }

  function odAccountCard(a) {
    if (!a) { return ''; }
    var name = odStr(a.account);
    if (!a.ok) {
      return '<div class="card od-acct"><div class="hd">' + esc(name) + '</div><div class="bd">' +
        '<div class="od-empty">' + esc(odStr(a.reason) || 'not connected yet') +
        '<span>Management links this account\'s Order Processing workbook in the registry.</span></div></div></div>';
    }
    var overdue = Number((a.tiles || {})[OD_TILE_OVERDUE]) || 0;
    var due = (a.due || []).map(function (r) { return { account: name, r: r }; });
    return '<div class="card od-acct"><div class="hd">' + esc(name) +
        (overdue ? '<span class="pill od-p-bad">' + esc(String(overdue)) + ' overdue</span>' : '') +
        '<span class="hint">' + esc(odInt(a.tabs_read)) + ' day tabs read · ' + esc(odStr(a.month)) + '</span>' +
      '</div><div class="bd">' +
        odTiles(a.tiles || {}, true) +
        odDispatchTable(a.dispatch_status) +
        (due.length ? '<div style="margin-top:16px"><span class="od-note" style="display:block;margin-bottom:6px">Due and overdue</span>' +
          '<div class="scroll">' + odDueTable(due, false) + '</div></div>' : '') +
        odDaysTable(a.days) +
      '</div></div>';
  }

  /** The workbook's own Day/Orders table. Tab names rather than day numbers, because two real
   *  tabs cover two dates each ('5-6 JULY', '12-13 July') and a number would misname one of them. */
  function odDaysTable(days) {
    if (!days || !days.length) { return ''; }
    var body = days.map(function (r) {
      return '<tr><td>' + esc(odStr(r['Day'])) + '</td><td class="od-v num">' + esc(odInt(r['Orders'])) + '</td></tr>';
    }).join('');
    return '<div style="margin-top:16px"><span class="od-note" style="display:block;margin-bottom:4px">Day · Orders</span>' +
      '<div class="scroll"><table class="od-ds">' + body + '</table></div></div>';
  }

})();
