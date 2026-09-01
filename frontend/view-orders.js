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
    '.od-stale{margin-top:14px;padding:12px 14px;border-radius:12px;border:1px solid var(--warn,#b8860b);background:var(--warn-soft,var(--panel-2))}' +
    '.od-stale b{display:block;font-size:13.5px;margin-bottom:4px}' +
    '.od-stale div{font-size:12px;color:var(--text-2);font-weight:600}' +
    '.od-stale ul{margin:8px 0 0 18px;font-size:12px;font-weight:600;color:var(--text-2)}' +
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
    '.od-chipbtn{background:var(--panel);font:inherit;font-weight:700}' +
    '.od-chipbtn.on{border-color:var(--gold-line-hi);background:var(--panel-2);box-shadow:var(--glow-gold)}' +
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
      /* A number clicked on the All-orders board hands its account here; today by default. */
      try {
        var jump = localStorage.getItem('m98m:orders:open');
        if (jump) {
          localStorage.removeItem('m98m:orders:open');
          var j = JSON.parse(jump);
          if (j && j.account !== undefined) { if (j.account) { OD_ACCOUNT = j.account; } OD_DATE = j.date || odTodayPkt(); OD_REPLACEMENT = false; }
        }
      } catch (e) {}
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
            /* Finding one order used to mean knowing which day tab it landed on. This asks the
               Engine, which holds every order across every account, and answers with the day —
               then opens it and jumps to the row. */
            '<div class="od-bar" style="margin-top:8px">' +
              '<div class="field" style="margin-top:0;flex:1"><label>Find an order</label>' +
                '<input class="od-in" id="odFind" type="search" autocomplete="off" ' +
                  'placeholder="Paste an eBay order number, buyer or item number…"></div>' +
              '<button class="minibtn" id="odFindGo">Find</button>' +
            '</div>' +
            '<div id="odFindOut"></div>' +
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
      var findGo = function () {
        var q = odStr($('odFind') && $('odFind').value);
        var out = $('odFindOut');
        if (!out) { return; }
        if (q.length < 3) { out.innerHTML = '<div class="od-note od-warn">Type at least three characters.</div>'; return; }
        out.innerHTML = '<div class="spinner"></div>';
        api('orderFind', { q: q }).then(function (d) {
          var rows = (d && d.rows) || [];
          if (!rows.length) {
            out.innerHTML = '<div class="od-note">Nothing matches “' + esc(q) + '” in any account you can see.</div>';
            return;
          }
          out.innerHTML = '<div class="scroll"><table class="od-tbl"><thead><tr>' +
              '<th>Order</th><th>Account</th><th>Day</th><th>Item</th><th>Value</th><th>eBay status</th><th></th>' +
            '</tr></thead><tbody>' +
            rows.map(function (r) {
              return '<tr><td class="mono">' + esc(odStr(r.order_id)) + '</td>' +
                '<td>' + esc(odStr(r.account)) + '</td>' +
                '<td>' + esc(odStr(r.day)) + '</td>' +
                '<td><div style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                  esc(odStr(r.title || r.item_id)) + '</div></td>' +
                '<td class="num">' + (Number(r.sold) ? '£' + Number(r.sold).toFixed(2) : '—') + '</td>' +
                '<td>' + esc(odStr(r.status)) + '</td>' +
                '<td><button class="minibtn" data-od-open-day="' + odAttr(odStr(r.day)) +
                  '" data-od-open-acc="' + odAttr(odStr(r.account)) + '">Open that day</button></td></tr>';
            }).join('') + '</tbody></table></div>';
          out.querySelectorAll('[data-od-open-day]').forEach(function (b) {
            b.onclick = function () {
              var day = this.getAttribute('data-od-open-day');
              var acc = this.getAttribute('data-od-open-acc');
              if (acc) { OD_ACCOUNT = acc; var sa = $('odAccount'); if (sa) { sa.value = acc; } }
              if (day) { OD_DATE = day; var sd = $('odDate'); if (sd) { sd.value = day; } }
              OD_REPLACEMENT = false; odMarkTabs(); odLoad();
            };
          });
        }).catch(function (e) {
          out.innerHTML = '<div class="od-note od-warn">Could not search just now — ' + esc(e && e.message ? e.message : 'no answer') + '</div>';
        });
      };
      if ($('odFindGo')) { $('odFindGo').onclick = findGo; }
      if ($('odFind')) { $('odFind').onkeydown = function (e) { if (e.key === 'Enter') { findGo(); } }; }

      $('odTabDay').onclick = function () { if (!OD_REPLACEMENT) { return; } OD_REPLACEMENT = false; odMarkTabs(); odLoad(); };
      $('odTabRep').onclick = function () { if (OD_REPLACEMENT) { return; } OD_REPLACEMENT = true; odMarkTabs(); odLoad(); };
      $('odDate').onchange = function () { OD_DATE = odStr(this.value); };
      odMarkTabs();
      if ($('odList')) { $('odList').addEventListener('click', odReplClick); }
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
      odApplyFilter();   // keep the active chip filter after a list repaint
      odWire(box);
      /* eBay's accepted-carrier list for this account, fetched once and shared by every card. */
      (function () {
        var acct = odStr(OD_ACCOUNT);
        if (!acct) { return; }
        box.querySelectorAll('[data-courier]').forEach(function (el) {
          odFillCouriers(box, el.getAttribute('data-courier'), acct);
        });
      })();
      /* req 16 capture — delegated, wired once (odLoad repaints must not stack listeners) */
      if (!box.dataset.aliWired) { box.dataset.aliWired = '1';
      box.addEventListener('click', function (ev) {
        /* R5: the one-tap Ali order number copy — same fallback ladder the address copy uses. */
        var c = ev.target && ev.target.closest ? ev.target.closest('[data-ali-copy]') : null;
        if (c) {
          var num = c.getAttribute('data-ali-copy') || '';
          var was = c.textContent;
          var ok = function () { c.textContent = '✓ Copied'; setTimeout(function () { c.textContent = was; }, 1400); };
          var fallback = function () {
            var ta = document.createElement('textarea');
            ta.value = num; ta.setAttribute('readonly', 'readonly');
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); ok(); } catch (e2) { window.prompt('Copy the number:', num); }
            document.body.removeChild(ta);
          };
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(num).then(ok, fallback); }
            else { fallback(); }
          } catch (e3) { fallback(); }
          return;
        }
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
    chips += odChip('Orders', esc(odInt(d.count)), '', 'all');
    chips += odChip('To purchase', esc(String(noCost)), noCost ? 'od-warn' : '', 'cost');
    chips += odChip('Awaiting tracking', esc(String(noTrack)), noTrack ? 'od-warn' : '', 'track');
    if (t) {
      /* The tab's own row-2 totals line, read back rather than re-added here — the sheet's
         arithmetic stays the sheet's. */
      if (odStr(t[OD_H.qty])) { chips += odChip('Row 2 total', esc(odStr(t[OD_H.qty]))); }
      if (odStr(t[OD_H.cost])) { chips += odChip('Cost total', '<span class="num">' + esc(odMoney(t[OD_H.cost])) + '</span>'); }
      if (odStr(t[OD_H.earning])) { chips += odChip('Order Earning total', '<span class="num">' + esc(odMoney(t[OD_H.earning])) + '</span>'); }
    }
    if (!d.can_write) { chips += odChip('Read only', 'your role does not write order rows'); }
    if (d.truncated) { chips += odChip('Long tab', 'the portal read the first rows only', 'od-bad'); }
    sum.innerHTML = chips + '<div id="odFilterNote" class="od-sub" style="display:none;margin-top:6px;font-size:11.5px;color:var(--text-3);font-weight:700"></div>';
    odWireChips();
    odApplyFilter();
  }
  function odChip(k, v, cls, filter) {
    /* Owner: "any numbering data will take you to that specific page." A chip with a filter key
       becomes a button that shows only the matching order cards and scrolls to them. */
    if (filter) {
      var on = (OD_FILTER === filter) || (filter === 'all' && OD_FILTER === 'all');
      return '<button class="od-chip od-chipbtn' + (cls ? ' ' + cls : '') + (on ? ' on' : '') +
        '" data-od-filter="' + filter + '" style="cursor:pointer"><span class="k">' + esc(k) + '</span>' + v + '</button>';
    }
    return '<span class="od-chip' + (cls ? ' ' + cls : '') + '"><span class="k">' + esc(k) + '</span>' + v + '</span>';
  }

  /* the live filter over today's order cards */
  var OD_FILTER = 'all';
  function odApplyFilter() {
    var list = $('odList');
    if (!list) { return; }
    var cards = list.querySelectorAll('[data-od-state]'), shown = 0, i;
    for (i = 0; i < cards.length; i++) {
      var st = cards[i].getAttribute('data-od-state');
      var vis = OD_FILTER === 'all' || st === OD_FILTER;
      cards[i].style.display = vis ? '' : 'none';
      if (vis) { shown++; }
    }
    var note = $('odFilterNote');
    if (note) {
      note.textContent = OD_FILTER === 'all' ? '' :
        'Showing ' + shown + ' ' + (OD_FILTER === 'cost' ? 'still to purchase' : 'awaiting tracking') + ' · tap Orders to show all';
      note.style.display = OD_FILTER === 'all' ? 'none' : 'block';
    }
  }
  function odWireChips() {
    var sum = $('odSummary');
    if (!sum) { return; }
    sum.querySelectorAll('[data-od-filter]').forEach(function (b) {
      b.onclick = function () {
        OD_FILTER = this.getAttribute('data-od-filter');
        sum.querySelectorAll('[data-od-filter]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-od-filter') === OD_FILTER); });
        odApplyFilter();
        var list = $('odList');
        if (list && OD_FILTER !== 'all' && list.scrollIntoView) { list.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      };
    });
  }

  // ---------- one order row ----------
  /* The button's payload is the ROW the person is looking at: account, order number, title,
     quantity, variation and the AliExpress link, handed to the Replacement orders desk via
     localStorage and opened there pre-filled. DELEGATED on the list container — the cards are
     repainted wholesale on every load, and per-button wiring after the wrong paint was exactly
     how the first version shipped dead buttons. */
  function odReplClick(ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-od-repl]') : null;
    if (!b) { return; }
    var row = b.getAttribute('data-od-repl');
    var o = null;
    ((OD_DATA && OD_DATA.orders) || []).forEach(function (x) { if (String(x._row) === row) { o = x; } });
    var pre = {
      account: OD_ACCOUNT,
      order_number: o ? odStr(o[OD_H.orderNo]) : '',
      item_title: o ? odStr(o[OD_H.title]) : '',
      quantity: o ? (odStr(o[OD_H.qty]) || '1') : '1',
      variation: o ? odStr(o[OD_H.variation]) : '',
      ali_link: o ? (odStr(o[OD_H.newAliLink]) || odStr(o[OD_H.aliLink])) : ''
    };
    try { localStorage.setItem('m98m:repl:prefill', JSON.stringify(pre)); } catch (e) {}
    location.hash = 'replacements';
  }

  function odCard(o) {
    var row = String(o._row);
    var title = odStr(o[OD_H.title]) || 'Order';
    var status = odStr(o[OD_H.status]);
    var cols = (OD_DATA && OD_DATA.columns) || [];
    /* work state, so the summary chips can filter the list: no cost yet = still to purchase;
       cost but no tracking = awaiting tracking; both = done. */
    var state = !odStr(o[OD_H.cost]) ? 'cost' : (!odStr(o[OD_H.tracking]) ? 'track' : 'done');

    /* The pill is always in the DOM, empty and hidden when the cell is blank, so recording a
       status on a row that had none can light it up without re-rendering the card. */
    return '<div class="card od-row" data-card="' + odAttr(row) + '" data-od-state="' + state + '"><div class="hd">' +
        '<span class="od-name">' + esc(title) + '</span>' +
        '<span class="pill ' + odStatusPill(status) + (status ? '' : ' hidden') + '" data-pill="' + odAttr(row) + '">' +
          esc(status) + '</span>' +
        /* proper links (owner): the order number opens eBay's own order-details page */
        '<a class="mono" style="color:var(--text-3);text-decoration:underline dotted" target="_blank" rel="noopener noreferrer" ' +
          'href="https://www.ebay.co.uk/sh/ord/details?orderid=' + encodeURIComponent(odStr(o[OD_H.orderNo])) + '">' + esc(odStr(o[OD_H.orderNo])) + '</a>' +
        /* 26 Aug (owner): "create a replacement for this order" on every order row. Carries the
           row's own facts to the Replacement orders desk, pre-filled. */
        '<button class="minibtn" data-od-repl="' + odAttr(row) + '" title="Raise a replacement for this order">Create a replacement</button>' +
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
    /* R5 (Hasib): "copying aliexpress order number for pulling out tracking should be very
     * easy" — one tap, no selecting 16 digits by hand. Shows for every role that sees the row. */
    var aliNow = odStr(o[OD_H.aliOrderNo]).replace(/[^0-9]/g, '');
    if (aliNow.length >= 8) {
      purchase += '<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<button class="minibtn" data-ali-copy="' + odAttr(aliNow) + '" title="Copy the AliExpress order number — paste it into AliExpress or the tracking site">📋 Copy Ali order number</button>' +
        '<span class="od-note mono">' + esc(aliNow) + '</span></div>';
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
      (track ? '<div class="' + (purchase ? 'od-sep' : '') + '"><span class="k">Tracking</span><div class="od-grid">' + track +
        /* The courier eBay will be told. The list is eBay's OWN accepted-carrier list for this
           account, so whatever is chosen here is a name eBay will accept; leaving it on "work it
           out" lets the tracking number's own format nominate one. */
        odField('Courier', 'eBay\u2019s own list', '<select class="od-sel" data-courier="' + odAttr(row) + '"' + dis + '>' +
          '<option value="">Work it out from the number</option></select>') +
        '</div>' +
        '<div class="od-btns">' +
          '<button class="btn-gold" data-act="tracking" data-row="' + odAttr(row) + '"' + dis + '>Record tracking</button>' +
          '<button class="btn-gold" data-act="pushebay" data-row="' + odAttr(row) + '"' + dis + '>Upload to eBay</button>' +
          '<button class="btn-ghost" data-act="uploaded" data-row="' + odAttr(row) + '"' + dis + '>Mark uploaded</button>' +
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
    if (act === 'pushebay') { odPushToEbay(box, row, btn); return; }
  }

  /* The courier list is eBay's own, per account, fetched once and reused. Filling it lazily keeps
     the order cards fast; until it lands the picker still works on "work it out from the number". */
  var OD_COURIERS = {};
  function odFillCouriers(box, row, account) {
    var sel = odPick(box, 'data-courier', row);
    if (!sel || sel.dataset.filled === '1') { return; }
    var apply = function (list) {
      if (!list || !list.length) { return; }
      sel.dataset.filled = '1';
      var keep = sel.value;
      sel.innerHTML = '<option value="">Work it out from the number</option>' +
        list.map(function (c) { return '<option' + (c === keep ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    };
    if (OD_COURIERS[account]) { apply(OD_COURIERS[account]); return; }
    api('courierList', { account: account }).then(function (d) {
      OD_COURIERS[account] = (d && d.carriers) || [];
      apply(OD_COURIERS[account]);
    }).catch(function () { /* picker stays on auto-detect — not worth an error here */ });
  }

  /* Hand the tracking number to eBay for real. This is a deliberate press on one order with a
     courier the operator picked, which is why it sends even though the automatic bulk push is
     still in shadow mode. eBay tells the buyer, so the confirm names the order and the courier. */
  function odPushToEbay(box, row, btn) {
    var o = odFind(row);
    if (!o) { return; }
    var tracking = odCurrent(box, row, 'tracking', o, OD_H.tracking);
    var number = odStr(tracking.value) || odStr(o[OD_H.tracking]);
    // col B, eBay's own order number — NOT the AliExpress 'Order Number' at col M
    var orderId = odStr(o[OD_H.orderNo]);
    var sel = odPick(box, 'data-courier', row);
    var courier = sel ? odStr(sel.value) : '';
    var account = odStr(OD_ACCOUNT || (o && o.account) || '');

    if (!number || number.length < 6) { odMsg(box, 't' + row, 'Paste the tracking number first.', 'od-warn'); return; }
    if (!orderId) { odMsg(box, 't' + row, 'This row has no eBay order number to upload against.', 'od-warn'); return; }
    if (!confirm('Upload tracking ' + number + ' to eBay for order ' + orderId + '?\n\nCourier: ' +
        (courier || 'worked out from the number') + '\n\neBay will mark the order dispatched and email the buyer.')) { return; }

    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Uploading…';
    odMsg(box, 't' + row, '', '');
    api('orderPushTracking', { account: account, order_id: orderId, tracking: number, courier: courier })
      .then(function (d) {
        btn.disabled = false; btn.textContent = label;
        var used = (d && d.carrier_auto) || courier || 'auto';
        odMsg(box, 't' + row, 'eBay accepted it — sent as ' + used + '.', 'od-ok');
        toast('Tracking ' + number + ' is on eBay (' + used + ').');
        /* The sheet record rides the PLAIN tracking path: the uploaded:true checkpoint belongs to
           the configured uploader alone and the server refuses it for anyone else — which would
           have thrown an error at the exact moment the eBay push had already succeeded. */
        odSaveTracking(box, row, btn, false);
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = label;
        odMsg(box, 't' + row, 'eBay refused it: ' + (e && e.message ? e.message : 'no answer'), 'od-warn');
      });
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
  /* TRUTH v2 WO-14: the old Dispatch section (~304 lines) was deleted — the register version
     in its own view file replaced it at the module flip (R9). */
})();
