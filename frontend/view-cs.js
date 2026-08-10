/* view-cs.js — §8.6 the 19-column Returns/Refunds case · §10.3 the Returns & INAD feed · §8.7 the
 * live central data a case is costed against. Views: cs (Customer service) · returns (Returns & INAD).
 * Backend: csCases · createCase · updateCase · returnsFeed · csLiveData.
 *
 * REALITY WINS over the spec on every label on this screen:
 *  · §8.6 prints the columns as 'CASE ID · Who's Card · eBay Order Number …'. The live tab
 *    ('HUSNIAN - Return  Refunds ' — double space, trailing space) writes them ALL-CAPS and spells
 *    the third one 'E-BEY ORDER NUMBER'; its dropdowns carry 'ITEM NOT RECIEVED' and 'ACCPETED'.
 *    Those spellings are the vocabulary and are never corrected here.
 *  · Every dropdown on that tab repeats its own header as the first option (a Sheets export
 *    artifact — a prompt, not a value), so the header echo is dropped from each list below.
 *  · The 'EMAIL' column's own list is SIR HASIB / AMNA BABHI — the purchasing account that paid,
 *    not the buyer's email address. It is labelled as such and never presented as buyer contact.
 *  · The case tab spells the cost 'ALI EXPRESS COST'; the Central Main Sheet spells the same figure
 *    'Aliexpress Cost'. The live strip reads one spelling and the form writes the other.
 *  · §15 has CS read AND annotate the Returns & INAD feed, but that tab is written by the order
 *    automation (Orders.gs returnsInad answers read_only), so nothing here writes to it: an
 *    annotation lands on the CS case that owns the return, in NOTE BY TEAM MEMBER via updateCase.
 * §4.2 / RL-4: these two screens carry buyer PII and order-earning figures, which is why both are
 * CS, Management and Ops Head only — the server strips them for every other role, and both screens
 * say so in plain words where the person can see it. */
(function () {
  'use strict';

  var CS_ROLES = ['CS', 'Management', 'Ops Head'];

  /* The live tab names, as the workbooks hold them — shown so the person knows which sheet their
     typing lands in. The backend addresses them; nothing here opens a spreadsheet. */
  var CS_CASE_TAB = 'HUSNIAN - Return  Refunds ';
  var CS_RETURNS_TAB = 'Returns & INAD';

  // ---------- §8.6 the 19 live headers, in the tab's own column order ----------
  var CS_H = {
    caseId: 'CASE ID',
    card: 'Who\'s Card',
    ebayOrder: 'E-BEY ORDER NUMBER',
    issue: 'ISSUE',
    product: 'PRODUCT NAME',
    earning: 'PRODUCT ORDER EARNING',
    aliOrder: 'ALI EXPRESS ORDER NUMBER',
    aliCost: 'ALI EXPRESS COST',
    returnCost: 'ALI EXPRESS RETURN COST 1',
    replacement: 'REPLACEMENT COST OPTION 2',
    total: 'TOTAL COST',
    address: 'CUSTOMER ADDRESS DETAIL',
    tracking: 'TRACKING',
    email: 'EMAIL',
    qty: 'QTY',
    refundStatus: 'REFUND STATUS',
    appeal: 'ALIEXPRESS APPEAL',
    result: 'FINAL RESULT',
    note: 'NOTE BY TEAM MEMBER'
  };
  /* Header matching runs through a normalizer, so a curly apostrophe or a trailing space drifting
     onto the live headers still resolves to the same column. */
  var CS_COLUMNS = [CS_H.caseId, CS_H.card, CS_H.ebayOrder, CS_H.issue, CS_H.product, CS_H.earning,
    CS_H.aliOrder, CS_H.aliCost, CS_H.returnCost, CS_H.replacement, CS_H.total, CS_H.address,
    CS_H.tracking, CS_H.email, CS_H.qty, CS_H.refundStatus, CS_H.appeal, CS_H.result, CS_H.note];

  // ---------- the live data-validation lists, header echo removed ----------
  var CS_ISSUE = ['DAMAGE', 'ITEM NOT RECIEVED', 'PAYMENT DISPUTE', 'WRONG PRODUCT'];
  var CS_EMAIL = ['SIR HASIB', 'AMNA BABHI'];
  var CS_QTY = ['1', '2', '3', '4', '5 PLUS'];
  var CS_REFUND_STATUS = ['CUSTOMER REFUND', 'APPEAL ALI EXPRESS'];
  var CS_APPEAL = ['NO APPEAL', 'PENDING', 'ACCPETED', 'REJECTED'];
  var CS_RESULT = ['REFUNDED WITH RETURN', 'REFUNDED WITHOUT RETURN'];

  var CS_MONEY_COLS = [CS_H.earning, CS_H.aliCost, CS_H.returnCost, CS_H.replacement, CS_H.total];

  // ---------- §10.3 the Returns & INAD tab, verbatim ----------
  var CS_R_H = {
    added: 'Date Added', dayTab: 'Day Tab', order: 'Order No', title: 'Item Title', buyer: 'Buyer',
    type: 'Type', reason: 'Reason (eBay)', explanation: 'Explanation', status: 'Status',
    refund: 'Refund Amount', updated: 'Last Updated', notes: 'Notes'
  };
  var CS_R_COLUMNS = [CS_R_H.added, CS_R_H.dayTab, CS_R_H.order, CS_R_H.title, CS_R_H.buyer,
    CS_R_H.type, CS_R_H.reason, CS_R_H.explanation, CS_R_H.status, CS_R_H.refund, CS_R_H.updated,
    CS_R_H.notes];
  var CS_R_TYPES = ['INAD', 'Return'];
  var CS_R_STATUS = ['Opened', 'Sent by Buyer', 'Waiting for Refund', 'Refunded'];
  var CS_R_REFUNDED = 'Refunded';

  // ---------- §8.7 the Central Main Sheet headers this screen READS ----------
  var CS_L = {
    title: 'Listing Title', sold: 'Sold For', earning: 'Order Earning', cost: 'Aliexpress Cost',
    profit: 'Profit ', campaign: 'Current Campaign Selection', planned: 'Campaign Selection',
    item: 'eBay Item No'
  };

  var CS_LIST_MAX = 400;              // datalist entries — a full Main Sheet is ~150 rows per account
  var CS_TEXT_MAX = 4000;

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.cs-pii{display:flex;gap:11px;align-items:flex-start;padding:12px 14px;border-radius:12px;border:1px solid rgba(240,96,90,.42);background:var(--bad-soft);margin-bottom:16px}' +
    '.cs-pii svg{width:17px;height:17px;flex:none;margin-top:1px;stroke:var(--bad);fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
    '.cs-pii b{display:block;font-size:12.5px;font-weight:800;color:var(--bad)}' +
    '.cs-pii span{display:block;font-size:12px;font-weight:600;color:var(--text-2);margin-top:3px;line-height:1.55}' +
    '.cs-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}' +
    '.cs-bar .field{margin-top:0;min-width:190px;flex:1 1 190px}' +
    '.cs-bar .cs-btns{flex:none}' +
    '.cs-in,.cs-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.cs-ta{resize:vertical;min-height:66px}' +
    '.cs-in:focus,.cs-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.cs-in.mono{font-family:var(--mono);letter-spacing:.04em}' +
    '.cs-cur{position:relative}' +
    '.cs-cur>span{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:800;color:var(--text-3);pointer-events:none}' +
    '.cs-cur input{padding-left:25px}' +
    '.cs-grp{border:1px solid var(--gold-line);border-radius:12px;padding:13px 14px 15px;background:rgba(120,132,152,.06);margin-top:14px}' +
    '.cs-grp>.k{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--gold-a)}' +
    '.cs-grp>.k em{font-style:normal;text-transform:none;letter-spacing:0;font-size:11.5px;font-weight:700;color:var(--text-3)}' +
    '.cs-grp.cs-pii-grp{border-color:rgba(240,96,90,.35)}' +
    '.cs-grp.cs-pii-grp>.k{color:var(--bad)}' +
    '.cs-fields{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:11px}' +
    '.cs-f{margin-top:0}.cs-f.cs-wide{grid-column:1/-1}' +
    '.cs-f label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px;word-break:break-word}' +
    '.cs-f label i{font-style:normal;color:var(--bad);margin-left:3px}' +
    '.cs-f .cs-hint{font-size:11px;color:var(--text-3);font-weight:600;margin-top:5px;line-height:1.45}' +
    '.cs-maths{grid-column:1/-1;border:1px solid var(--gold-line-hi);border-radius:11px;padding:12px 13px;background:linear-gradient(135deg,rgba(233,169,60,.12),rgba(233,169,60,.02))}' +
    '.cs-maths .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.cs-m{display:flex;gap:10px;align-items:baseline;font-size:12.5px;font-weight:700;padding:6px 0;flex-wrap:wrap}' +
    '.cs-m+.cs-m{border-top:1px solid var(--gold-line)}' +
    '.cs-m .cs-lbl{flex:1 1 150px;min-width:0;color:var(--text-2);font-weight:700}' +
    '.cs-m b{font-size:13.5px;font-weight:800;white-space:nowrap}' +
    '.cs-m.cs-sum{border-top:1px solid var(--gold-line-hi)}' +
    '.cs-m.cs-sum .cs-lbl{color:var(--text);font-weight:800}' +
    '.cs-m .cs-leaves{flex:1 1 100%;font-size:11.5px;font-weight:700;color:var(--text-3)}' +
    '.cs-m .cs-leaves b{font-size:12.5px}' +
    '.cs-pos{color:var(--ok)}.cs-neg{color:var(--bad)}' +
    '.cs-note{font-size:11.5px;font-weight:600;color:var(--text-3);line-height:1.5;margin-top:9px}' +
    '.cs-note.cs-warn{color:var(--warn)}' +
    '.cs-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:13px}' +
    '.cs-sub{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.cs-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(158px,1fr))}' +
    '.cs-tile{border:1px solid var(--gold-line);border-radius:11px;padding:11px 13px;background:rgba(120,132,152,.06)}' +
    '.cs-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);display:block}' +
    '.cs-tile b{display:block;font-size:19px;font-weight:800;margin-top:4px}' +
    '.cs-tile.cs-gold{border-color:var(--gold-line-hi);background:linear-gradient(135deg,rgba(233,169,60,.13),rgba(233,169,60,.02))}' +
    '.cs-tile.cs-gold b{color:var(--gold-a)}' +
    '.cs-case{margin-top:14px}' +
    '.cs-case .hd{flex-wrap:wrap}' +
    '.cs-name{font-weight:800;word-break:break-word;flex:1 1 160px;min-width:0}' +
    '.cs-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}' +
    '.cs-chip{font-size:11.5px;font-weight:700;color:var(--text);border:1px solid var(--gold-line);border-radius:8px;padding:4px 10px;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.cs-chip .k{color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:800;margin-right:6px}' +
    '.cs-box{margin-top:12px;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.07)}' +
    '.cs-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.cs-box.cs-blue{background:var(--blue-soft);border-color:rgba(61,155,240,.30)}' +
    '.cs-box.cs-blue .k{color:var(--blue-2)}' +
    '.cs-box.cs-red{background:var(--bad-soft);border-color:rgba(240,96,90,.38)}' +
    '.cs-box.cs-red .k{color:var(--bad)}' +
    '.cs-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6}' +
    '.cs-txt a{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.cs-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:540px}' +
    '.cs-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.cs-tbl td{padding:9px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top;white-space:pre-wrap;word-break:break-word}' +
    '.cs-tbl td.cs-c1{color:var(--text-3);font-weight:700;width:38%}' +
    '.cs-live{margin-top:12px;border:1px solid rgba(61,155,240,.30);background:var(--blue-soft);border-radius:11px;padding:11px 13px}' +
    '.cs-live .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--blue-2)}' +
    '.cs-live-g{display:grid;gap:9px;grid-template-columns:repeat(auto-fit,minmax(122px,1fr));margin-top:9px}' +
    '.cs-live-i .k{display:block;color:var(--text-3)}' +
    '.cs-live-i b{display:block;font-size:13.5px;font-weight:800;margin-top:3px;word-break:break-word}' +
    '.cs-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.cs-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.cs-ret{margin-top:12px;border:1px solid var(--gold-line);border-radius:12px;padding:12px 13px;background:rgba(120,132,152,.06)}' +
    '.cs-ret-h{display:flex;gap:9px;align-items:center;flex-wrap:wrap}' +
    '.cs-ret-h .cs-amt{margin-left:auto;font-size:15px;font-weight:800}' +
    '.cs-ret .tl-row .k{min-width:132px;flex:none}' +
    '.cs-ret .tl-row{align-items:flex-start}' +
    '.cs-ret .tl-row>span:last-child{min-width:0;word-break:break-word;white-space:pre-wrap}' +
    '.pill.cs-p-open{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.cs-p-live{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.cs-p-done{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.cs-p-bad{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.cs-p-flat{background:rgba(120,132,152,.18);color:var(--text-2)}' +
    '.pill.cs-p-gold{background:linear-gradient(135deg,rgba(233,169,60,.20),rgba(233,169,60,.04));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '@media (max-width:880px){' +
      '.cs-fields{grid-template-columns:1fr}' +
      '.cs-bar .field{flex:1 1 100%}' +
      '.cs-ret .tl-row{flex-direction:column;gap:3px}.cs-ret .tl-row .k{min-width:0}' +
      '.cs-ret-h .cs-amt{margin-left:0;flex:1 1 100%}' +
    '}'
  );

  // ---------- safety (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function csAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function csStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function csRaw(v) { return String(v == null ? '' : v); }

  /** Text for the DOM: escaped, with http/https URLs (and nothing else) turned into links. */
  function csText(v) {
    var s = csRaw(v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a href="' + csAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }

  // ---------- values ----------
  function csNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, ''); }
  /** Rows are read through the normalized header, so a trailing space or a shouty spelling drifting
   *  on the live sheet can never blank a field on this screen. */
  function csIndex(row) {
    var idx = {}, keys, i, n;
    if (!row || typeof row !== 'object') { return idx; }
    keys = Object.keys(row);
    for (i = 0; i < keys.length; i++) {
      n = csNorm(keys[i]);
      if (n && idx[n] === undefined) { idx[n] = row[keys[i]]; }
    }
    return idx;
  }
  function csVal(idx, header) { var v = idx[csNorm(header)]; return v === undefined || v === null ? '' : v; }
  function csLabel(h) { return String(h == null ? '' : h).replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

  /** The first number in a cell. Sheet money arrives as a float or as typed text ('£4.20', '4.20'). */
  function csNum(v) {
    var m = String(v == null ? '' : v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  /** Pence, not binary fractions: 4.20 + 3.15 is 7.3500000000000005 in a browser, and an untouched
   *  sum like that would make a typed TOTAL COST of 7.35 look like it matched neither option. */
  function csRound(n) { return Math.round(Number(n) * 100) / 100; }
  function csMoney(n) {
    var v = csRound(n);
    return (v < 0 ? '-£' : '£') + Math.abs(v).toFixed(2);
  }
  /** A money cell for reading: £ with two decimals when it is a number, verbatim when it is not. */
  function csMoneyText(v) {
    var s = csStr(v);
    if (!s) { return ''; }
    var n = csNum(s);
    return n === null ? s : csMoney(n);
  }

  /** Sheet timestamps: an ISO instant is the portal's own and is shown in PKT; a bare sheet
   *  datetime carries no zone, and 'Day Tab' is genuinely mixed type ('5-6 JULY'), so both are
   *  shown exactly as the workbook holds them rather than relabelled. */
  function csWhen(v) {
    var s = csStr(v), out;
    if (!s) { return ''; }
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      out = fmtPkt(s, true);
      return out ? out + ' PKT' : s;
    }
    if (/^\d{4}-\d{2}-\d{2}[ T]00:00:00/.test(s)) { return s.slice(0, 10); }
    return s;
  }

  /** eBay and AliExpress order numbers are typed by hand in one sheet and pasted by the sync in
   *  another ('24-14928-97018' vs '2414928 97018'), so cases and returns are matched on digits. */
  function csOrderKey(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function csPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) { return els[i]; } }
    return null;
  }
  function csHas(arr, v) { return arr.indexOf(v) >= 0; }
  function csCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }
  /** Click the nav entry so the rail highlight follows; fall back to a plain render. */
  function csOpen(key) {
    var a = document.querySelector('.nav a[data-key="' + key.replace(/"/g, '') + '"]');
    if (a) { a.click(); return; }
    if (typeof renderView === 'function') { renderView(key); return; }
    toast('That screen is not part of your version.');
  }

  // ---------- module state ----------
  var CS_ACCOUNTS = [];        // from accountList — never hardcoded (RL-2, RL-9)
  var CS_ACCOUNT = '';         // shared by both screens
  var CS_CASES = [];           // last csCases rows
  var CS_CASE_COLS = [];       // the column order the server sent, for the full-fidelity table
  var CS_LISTS = {};           // dropdowns the server sends win over the constants above
  var CS_LIVE = [];            // last csLiveData rows (Central Main Sheet)
  var CS_LIVE_STATE = '';      // what to tell the person about the live sheet
  var CS_RETURNS = [];         // last returnsFeed rows
  var CS_R_FILTER = { type: '', status: '', q: '' };
  var CS_PREFILL = null;       // a case being opened from a return row
  var CS_FOCUS = '';           // a CASE ID to expand after the next load
  var CS_COMPOSER = false;

  // ---------- §8.6 the form, grouped so it is workable ----------
  var CS_GROUPS = [
    { key: 'order', title: 'Case & order', hint: 'who it is about and which order it came from', fields: [
      { col: CS_H.card, hint: 'Whose card paid for the order.' },
      { col: CS_H.ebayOrder, req: true, mono: true, hint: 'The buyer order exactly as eBay writes it — 24-14928-97018.' },
      { col: CS_H.issue, type: 'select', opts: CS_ISSUE, req: true, list: 'issue' },
      { col: CS_H.product, req: true, wide: true, datalist: 'csProdList',
        hint: 'Type to match a live listing on this account — the live figures appear underneath.' },
      { col: CS_H.aliOrder, mono: true },
      { col: CS_H.qty, type: 'select', opts: CS_QTY, list: 'qty' },
      { col: CS_H.email, type: 'select', opts: CS_EMAIL, list: 'email',
        hint: 'The purchasing account on the sheet’s own list — not the buyer’s email address.' }
    ] },
    { key: 'costs', title: 'Costs', hint: 'what this case costs before you choose the outcome', fields: [
      { col: CS_H.earning, money: true, hint: 'What the order earned — the Main Sheet’s Order Earning.' },
      { col: CS_H.aliCost, money: true, hint: 'What the item cost us on AliExpress.' },
      { col: CS_H.returnCost, money: true, hint: 'Option 1 — the buyer sends it back.' },
      { col: CS_H.replacement, money: true, hint: 'Option 2 — a replacement goes out instead.' },
      { col: CS_H.total, money: true, hint: 'Stored exactly as you type it.' }
    ] },
    { key: 'customer', title: 'Customer', hint: 'buyer detail — CS and Management only', pii: true, fields: [
      { col: CS_H.address, type: 'area', wide: true, hint: 'As the buyer gave it. Never paste this anywhere else.' },
      { col: CS_H.tracking, mono: true, hint: 'The return or replacement tracking.' }
    ] },
    { key: 'resolution', title: 'Resolution', hint: 'the outcome, and the note that explains it', fields: [
      { col: CS_H.refundStatus, type: 'select', opts: CS_REFUND_STATUS, list: 'refund_status' },
      { col: CS_H.appeal, type: 'select', opts: CS_APPEAL, list: 'appeal' },
      { col: CS_H.result, type: 'select', opts: CS_RESULT, list: 'result' },
      { col: CS_H.note, type: 'area', wide: true, hint: 'This is the whole cell — the note already on the case is here to edit.' }
    ] }
  ];
  var CS_REQUIRED = [CS_H.ebayOrder, CS_H.issue, CS_H.product];

  function csOptions(field) {
    var served = field.list && CS_LISTS[field.list];
    return (served && served.length ? served : field.opts) || [];
  }

  // ============================== CUSTOMER SERVICE ==============================
  VIEWS.cs = {
    label: 'Customer service',
    icon: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H6a2 2 0 0 1-2-2z"/>' +
      '<path d="M20 14h-3v6h1a2 2 0 0 0 2-2z"/><path d="M17 20a3 3 0 0 1-3 2h-2"/>',
    roles: CS_ROLES,
    order: 30,
    badge: function () { return (STATE.counts && STATE.counts.cs) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Customer service</h1>' +
          '<span class="sub">Returns, refunds and appeals · the 19-column case, on ' + esc(csLabel(CS_CASE_TAB)) + '</span>' +
          '<button class="minibtn" id="csNewBtn" style="margin-left:auto">New case</button>' +
          '<button class="minibtn" id="csRefresh">Refresh</button>' +
        '</div>' +
        csPiiBanner('Buyer addresses, order numbers and the order’s earning are on this screen.') +
        '<div class="card enter d1"><div class="hd">Account ' +
          '<span class="hint">the case tab lives with this account’s sheets</span></div>' +
          '<div class="bd"><div class="cs-bar" id="csBar">' + csAccountBar('csAcc') + '</div>' +
            '<div class="cs-note" id="csWhere">Choose an account to load its cases.</div></div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Open a case ' +
          '<span class="hint" id="csLiveHint">live listing figures load with the account</span></div>' +
          '<div class="bd" id="csComposer"></div>' +
        '</div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">Cases ' +
          '<span class="hint" id="csCasesHint">newest first</span></div>' +
          '<div class="bd"><div class="cs-tiles" id="csTiles"></div>' +
            '<div id="csList"><div class="spinner"></div></div></div>' +
        '</div>' +
        '<datalist id="csProdList"></datalist>';
    },
    init: function () {
      $('csRefresh').onclick = function () { csLoadCases(); csLoadLive(); };
      $('csNewBtn').onclick = function () { csToggleComposer(!CS_COMPOSER); };
      csWireAccount('csAcc', function () { csWhereRefresh(); csLoadCases(); csLoadLive(); });
      csToggleComposer(CS_COMPOSER || !!CS_PREFILL);
      csLoadAccounts(function () { csLoadCases(); csLoadLive(); });
    }
  };

  function csPiiBanner(what) {
    return '<div class="cs-pii enter d1"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="2"/>' +
        '<path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
      '<div><b>Customer data — Customer Service and Management only</b>' +
      '<span>' + esc(what) + ' The server sends none of it to any other role. Keep it on this screen: never paste it into a task, a message, a hunting form or any other sheet.</span></div></div>';
  }

  function csAccountBar(id) {
    return '<div class="field"><label>Account</label>' +
        '<select class="cs-in" id="' + esc(id) + '"><option value="">Loading accounts…</option></select></div>';
  }

  function csWireAccount(id, onChange) {
    var sel = $(id);
    if (!sel) { return; }
    csFillAccounts(sel);
    sel.onchange = function () {
      CS_ACCOUNT = csStr(sel.value);
      onChange();
    };
  }
  function csFillAccounts(sel) {
    if (!sel) { return; }
    if (!CS_ACCOUNTS.length) {
      sel.innerHTML = '<option value="">No connected account yet</option>';
      return;
    }
    sel.innerHTML = '<option value="">Choose an account…</option>' + CS_ACCOUNTS.map(function (a) {
      return '<option value="' + csAttr(a) + '">' + esc(a) + '</option>';
    }).join('');
    if (CS_ACCOUNT) { sel.value = CS_ACCOUNT; }
  }

  function csLoadAccounts(after) {
    api('accountList').then(function (d) {
      CS_ACCOUNTS = ((d && d.accounts) || []).map(function (a) { return csStr(a.account); })
        .filter(function (a) { return !!a; });
      if (!CS_ACCOUNT && CS_ACCOUNTS.length === 1) { CS_ACCOUNT = CS_ACCOUNTS[0]; }
      csFillAccounts($('csAcc'));
      csFillAccounts($('csRAcc'));
      if (typeof after === 'function') { after(); }
    }).catch(function () {
      csFillAccounts($('csAcc'));
      csFillAccounts($('csRAcc'));
      if (typeof after === 'function') { after(); }
    });
  }

  // ---------- the composer ----------
  function csToggleComposer(open) {
    var box = $('csComposer'), btn = $('csNewBtn');
    CS_COMPOSER = !!open;
    if (btn) { btn.textContent = CS_COMPOSER ? 'Close the form' : 'New case'; }
    if (!box) { return; }
    if (!CS_COMPOSER) {
      box.innerHTML = '<div class="cs-empty">No case is being written.<span>Press <b>New case</b>, or open one straight from a row on the Returns &amp; INAD screen.</span></div>';
      return;
    }
    box.innerHTML = csForm('new', {}, '', '',
      '<div class="cs-btns">' +
        '<button class="btn-gold" data-act="create">Open the case</button>' +
        '<button class="minibtn" data-act="clear">Clear the form</button>' +
        '<span class="cs-sub">' + esc(CS_H.caseId) + ' is assigned by the portal when the row is written.</span>' +
      '</div>',
      CS_PREFILL ? CS_PREFILL.columns : {});
    csWireForm(box);
    if (CS_PREFILL && CS_PREFILL.source) {
      var strip = box.querySelector('[data-source]');
      if (strip) { strip.innerHTML = csSourceStrip(CS_PREFILL.source); }
    }
    CS_PREFILL = null;
    csMaths(box);
    csLiveStrip(box);
  }

  /** One renderer for both jobs: the new-case form and the edit form on a case card. `values` are
   *  the cell values as the sheet holds them; nothing is reformatted on the way into an input.
   *  The footer lives INSIDE the form element so every button can find its own form. */
  function csForm(formId, row, caseId, rowRef, footer, prefill) {
    var idx = csIndex(row || {});
    var pre = csIndex(prefill || {});
    return '<div data-form="' + csAttr(formId) + '" data-case-id="' + csAttr(caseId || '') +
        '" data-case-row="' + csAttr(rowRef || '') + '">' +
      (caseId ? '' : '<div class="cs-box cs-blue"><div class="k">Where this goes</div>' +
        '<div class="cs-txt" data-where="">' + csWhereText() + '</div>' +
        '<div data-source=""></div></div>') +
      CS_GROUPS.map(function (g) {
        return '<div class="cs-grp' + (g.pii ? ' cs-pii-grp' : '') + '">' +
          '<div class="k">' + esc(g.title) + '<em>' + esc(g.hint) + '</em></div>' +
          '<div class="cs-fields">' +
            g.fields.map(function (f) {
              var v = csVal(idx, f.col);
              return csField(f, csStr(v) === '' ? csVal(pre, f.col) : v);
            }).join('') +
            (g.key === 'costs' ? '<div class="cs-maths" data-maths=""></div>' : '') +
            (g.key === 'order' ? '<div class="cs-live hidden" data-live=""></div>' : '') +
          '</div></div>';
      }).join('') +
      (footer || '') +
    '</div>';
  }

  /** Kept as its own line so switching account updates it without redrawing a half-typed form. */
  function csWhereText() {
    return 'The row is written on <b>' + esc(csLabel(CS_CASE_TAB)) + '</b>' +
      (CS_ACCOUNT ? ' for <b>' + esc(CS_ACCOUNT) + '</b>' : ' — choose the account above') + '. ' +
      esc(CS_H.caseId) + ' is assigned by the portal, not typed.';
  }
  function csWhereRefresh() {
    var el = document.querySelector('[data-where]');
    if (el) { el.innerHTML = csWhereText(); }
  }

  function csField(f, value) {
    var v = csRaw(value), inner, opts;
    if (f.type === 'select') {
      opts = csOptions(f);
      inner = '<select class="cs-in" data-f="' + csAttr(f.col) + '">' +
        '<option value="">— not set —</option>' +
        opts.map(function (o) {
          return '<option value="' + csAttr(o) + '"' + (csStr(v) === csStr(o) ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') +
        (csStr(v) && !csHas(opts.map(csStr), csStr(v)) ?
          '<option value="' + csAttr(v) + '" selected>' + esc(v) + '</option>' : '') +
        '</select>';
    } else if (f.type === 'area') {
      inner = '<textarea class="cs-ta" data-f="' + csAttr(f.col) + '">' + esc(v) + '</textarea>';
    } else if (f.money) {
      inner = '<div class="cs-cur"><span>£</span><input class="cs-in num" type="text" inputmode="decimal" ' +
        'autocomplete="off" data-f="' + csAttr(f.col) + '" data-money="1" value="' + csAttr(v) + '"></div>';
    } else {
      inner = '<input class="cs-in' + (f.mono ? ' mono' : '') + '" type="text" autocomplete="off" ' +
        (f.datalist ? 'list="' + csAttr(f.datalist) + '" ' : '') +
        'data-f="' + csAttr(f.col) + '" value="' + csAttr(v) + '">';
    }
    return '<div class="field cs-f' + (f.wide ? ' cs-wide' : '') + '">' +
      '<label>' + esc(csLabel(f.col)) + (f.req ? '<i>*</i>' : '') + '</label>' + inner +
      (f.hint ? '<div class="cs-hint">' + esc(f.hint) + '</div>' : '') + '</div>';
  }

  /** Where a case opened from a return row came from — the eBay reason is shown verbatim so the
   *  person picks the ISSUE themselves; the two vocabularies are not mapped onto each other. */
  function csSourceStrip(src) {
    return '<div class="cs-note">From the ' + esc(CS_RETURNS_TAB) + ' row — ' +
      '<b>' + esc(csStr(src.type) || '—') + '</b> · reason <b>' + esc(csStr(src.reason) || '—') + '</b>' +
      (csStr(src.refund) ? ' · refund <b class="num">' + esc(csMoneyText(src.refund)) + '</b>' : '') +
      '. Choose the ' + esc(CS_H.issue) + ' yourself — the eBay reason list and the sheet’s list are not the same words.</div>';
  }

  // ---------- the cost maths, in the open ----------
  function csFormValues(root) {
    var els = root.querySelectorAll('[data-f]'), out = {}, i, k;
    for (i = 0; i < els.length; i++) {
      k = els[i].getAttribute('data-f');
      out[k] = csRaw(els[i].value).slice(0, CS_TEXT_MAX);
    }
    return out;
  }
  function csFormRoot(el) {
    var n = el;
    while (n && n.getAttribute && !n.hasAttribute('data-form')) { n = n.parentNode; }
    return n && n.getAttribute ? n : null;
  }

  function csMaths(scope) {
    var roots = scope.querySelectorAll('[data-form]'), i;
    for (i = 0; i < roots.length; i++) { csMathsOne(roots[i]); }
  }
  function csMathsOne(root) {
    var box = root.querySelector('[data-maths]');
    if (!box) { return; }
    var v = csFormValues(root);
    var earn = csNum(v[CS_H.earning]), ali = csNum(v[CS_H.aliCost]);
    var ret = csNum(v[CS_H.returnCost]), rep = csNum(v[CS_H.replacement]), tot = csNum(v[CS_H.total]);
    var opt1 = (ali === null && ret === null) ? null : csRound((ali || 0) + (ret || 0));
    var opt2 = (ali === null && rep === null) ? null : csRound((ali || 0) + (rep || 0));
    var cheaper = (opt1 !== null && opt2 !== null && opt1 !== opt2) ? (opt1 < opt2 ? 1 : 2) : 0;

    var html = '<div class="k">What this case costs</div>' +
      csMathRow(csLabel(CS_H.earning), earn, '', '') +
      csMathRow(csLabel(CS_H.aliCost), ali, '', '') +
      csMathRow('+ ' + csLabel(CS_H.returnCost), ret, '', '') +
      csMathRow('+ ' + csLabel(CS_H.replacement), rep, '', '') +
      csOptionRow('Option 1 · refund with return', opt1, earn, cheaper === 1, '1') +
      csOptionRow('Option 2 · replacement sent', opt2, earn, cheaper === 2, '2') +
      csMathRow(csLabel(CS_H.total) + ' as typed', tot, ' cs-sum', '');

    if (tot !== null && opt1 !== null && opt2 !== null && tot !== opt1 && tot !== opt2) {
      html += '<div class="cs-note cs-warn">' + esc(csLabel(CS_H.total)) + ' matches neither option. That is allowed — the sheet stores exactly what you type — but check it before you save.</div>';
    } else if (opt1 === null && opt2 === null) {
      html += '<div class="cs-note">Fill the cost fields above and both outcomes are priced here, against what the order earned.</div>';
    }
    box.innerHTML = html;
    csWireButtons(box);
  }
  function csMathRow(label, n, extra, right) {
    return '<div class="cs-m' + extra + '"><span class="cs-lbl">' + esc(label) + '</span>' +
      '<b class="num">' + (n === null ? '—' : esc(csMoney(n))) + '</b>' + (right || '') + '</div>';
  }
  function csOptionRow(label, cost, earn, cheaper, which) {
    var leaves = '';
    if (cost !== null && earn !== null) {
      var net = csRound(earn - cost);
      leaves = '<div class="cs-leaves">Against the order’s earning it leaves ' +
        '<b class="num ' + (net < 0 ? 'cs-neg' : 'cs-pos') + '">' + esc(csMoney(net)) + '</b>' +
        (net < 0 ? ' — this case loses money.' : '.') + '</div>';
    }
    return '<div class="cs-m cs-sum"><span class="cs-lbl">' + esc(label) +
      (cheaper ? ' <span class="pill cs-p-gold">cheaper</span>' : '') + '</span>' +
      '<b class="num">' + (cost === null ? '—' : esc(csMoney(cost))) + '</b>' +
      (cost === null ? '' : '<button class="minibtn" data-act="useTotal" data-cost="' + csAttr(String(cost)) +
        '">Use as ' + esc(csLabel(CS_H.total)) + '</button>') +
      leaves + '</div>';
  }

  // ---------- §8.7 the live listing behind the case ----------
  function csLiveIndexRows() {
    var byTitle = {}, byItem = {}, i, idx, t, it;
    for (i = 0; i < CS_LIVE.length; i++) {
      idx = csIndex(CS_LIVE[i]);
      t = csNorm(csVal(idx, CS_L.title));
      it = csOrderKey(csVal(idx, CS_L.item));
      if (t && !byTitle[t]) { byTitle[t] = idx; }
      if (it && !byItem[it]) { byItem[it] = idx; }
    }
    return { byTitle: byTitle, byItem: byItem };
  }
  function csLiveMatch(name) {
    var maps = csLiveIndexRows(), key = csNorm(name), item = csOrderKey(name), k;
    if (key && maps.byTitle[key]) { return maps.byTitle[key]; }
    if (item && maps.byItem[item]) { return maps.byItem[item]; }
    if (key.length >= 8) {
      for (k in maps.byTitle) {
        if (Object.prototype.hasOwnProperty.call(maps.byTitle, k) && k.indexOf(key) === 0) { return maps.byTitle[k]; }
      }
    }
    return null;
  }
  function csLiveStrip(scope) {
    var roots = scope.querySelectorAll('[data-form]'), i;
    for (i = 0; i < roots.length; i++) { csLiveStripOne(roots[i]); }
  }
  function csLiveStripOne(root) {
    var box = root.querySelector('[data-live]');
    if (!box) { return; }
    var input = root.querySelector('[data-f="' + CS_H.product.replace(/"/g, '') + '"]');
    var row = input ? csLiveMatch(input.value) : null;
    if (!row) { box.className = 'cs-live hidden'; box.innerHTML = ''; return; }
    var cells = [
      { k: CS_L.sold, v: csMoneyText(csVal(row, CS_L.sold)) },
      { k: CS_L.earning, v: csMoneyText(csVal(row, CS_L.earning)) },
      { k: CS_L.cost, v: csMoneyText(csVal(row, CS_L.cost)) },
      { k: csLabel(CS_L.profit), v: csMoneyText(csVal(row, CS_L.profit)) },
      { k: CS_L.campaign, v: csStr(csVal(row, CS_L.campaign)) || csStr(csVal(row, CS_L.planned)) },
      { k: CS_L.item, v: csStr(csVal(row, CS_L.item)) }
    ];
    box.className = 'cs-live';
    box.innerHTML = '<div class="k">On the account’s Main Sheet right now</div>' +
      '<div class="cs-live-g">' + cells.map(function (c) {
        return '<div class="cs-live-i"><span class="k">' + esc(csLabel(c.k)) + '</span>' +
          '<b class="' + (c.k === CS_L.item ? 'mono' : 'num') + '">' + esc(c.v || '—') + '</b></div>';
      }).join('') + '</div>' +
      '<div class="cs-btns"><button class="minibtn" data-act="fillLive">Fill ' + esc(csLabel(CS_H.earning)) +
        ' and ' + esc(csLabel(CS_H.aliCost)) + '</button>' +
        '<span class="cs-sub">Read from the live sheet — nothing is written back to it here.</span></div>';
    csWireButtons(box);
  }

  // ---------- wiring ----------
  /** The maths panel and the live strip redraw themselves, so their buttons are wired where they
   *  are built, not once at render time. */
  function csWireButtons(scope) {
    var btns = scope.querySelectorAll('button[data-act]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) { b.onclick = function () { csAction(b); }; })(btns[i]);
    }
  }

  function csWireForm(scope) {
    var els = scope.querySelectorAll('[data-f]'), i;
    for (i = 0; i < els.length; i++) {
      (function (el) {
        var handler = function () {
          var root = csFormRoot(el);
          if (!root) { return; }
          if (el.getAttribute('data-money')) { csMathsOne(root); }
          if (el.getAttribute('data-f') === CS_H.product) { csLiveStripOne(root); }
        };
        el.oninput = handler;
        el.onchange = handler;
      })(els[i]);
    }
    csWireButtons(scope);
  }

  function csAction(btn) {
    var act = btn.getAttribute('data-act');
    var root = csFormRoot(btn), el;

    if (act === 'useTotal') {
      if (!root) { return; }
      el = root.querySelector('[data-f="' + CS_H.total.replace(/"/g, '') + '"]');
      if (el) { el.value = csRound(btn.getAttribute('data-cost')).toFixed(2); csMathsOne(root); }
      return;
    }
    if (act === 'fillLive') {
      if (!root) { return; }
      var input = root.querySelector('[data-f="' + CS_H.product.replace(/"/g, '') + '"]');
      var row = input ? csLiveMatch(input.value) : null;
      if (!row) { return; }
      csSet(root, CS_H.earning, csVal(row, CS_L.earning));
      csSet(root, CS_H.aliCost, csVal(row, CS_L.cost));
      csMathsOne(root);
      toast('Filled from the live sheet — check them against the order.');
      return;
    }
    if (act === 'clear') {
      if (!root) { return; }
      var all = root.querySelectorAll('[data-f]'), i;
      for (i = 0; i < all.length; i++) { all[i].value = ''; }
      csMathsOne(root);
      csLiveStripOne(root);
      return;
    }
    if (act === 'create') { csCreate(root, btn); return; }
    if (act === 'edit') { csToggleEdit(btn); return; }
    if (act === 'save') { csSave(root, btn); return; }
    if (act === 'all') {
      el = document.querySelector('[data-all="' + (btn.getAttribute('data-id') || '').replace(/"/g, '') + '"]');
      if (el) { el.classList.toggle('hidden'); }
      return;
    }
    if (act === 'openCase') { CS_FOCUS = btn.getAttribute('data-case') || ''; csOpen('cs'); return; }
    if (act === 'newFromReturn') { csNewFromReturn(btn); return; }
    if (act === 'noteSave') { csSaveReturnNote(btn); return; }
  }

  function csSet(root, col, value) {
    var el = root.querySelector('[data-f="' + col.replace(/"/g, '') + '"]');
    if (el) { el.value = csRaw(value); }
  }

  // ---------- create / update ----------
  function csRequire(values) {
    var i, col;
    for (i = 0; i < CS_REQUIRED.length; i++) {
      col = CS_REQUIRED[i];
      if (!csStr(values[col])) { toast(csLabel(col) + ' is needed before a case can be opened.'); return false; }
    }
    return true;
  }
  function csMoneySane(values) {
    var i, col, v;
    for (i = 0; i < CS_MONEY_COLS.length; i++) {
      col = CS_MONEY_COLS[i];
      v = csStr(values[col]);
      if (v && csNum(v) === null) { toast(csLabel(col) + ' needs a number, or leave it empty.'); return false; }
    }
    return true;
  }

  function csCreate(root, btn) {
    if (!root) { return; }
    if (!CS_ACCOUNT) { toast('Choose the account this case belongs to first.'); return; }
    var values = csFormValues(root), cols = {}, k;
    if (!csRequire(values) || !csMoneySane(values)) { return; }
    for (k in values) {
      if (Object.prototype.hasOwnProperty.call(values, k) && csStr(values[k]) !== '') { cols[k] = values[k]; }
    }
    btn.disabled = true;
    api('createCase', { account: CS_ACCOUNT, columns: cols }).then(function (res) {
      btn.disabled = false;
      toast(csShadow(res, 'Case opened' + (csStr(res && res.case_id) ? ' · ' + csStr(res.case_id) : '')));
      CS_FOCUS = csStr(res && res.case_id);
      csToggleComposer(false);
      csLoadCases();
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not opened: ' + e.message);
    });
  }

  function csSave(root, btn) {
    if (!root) { return; }
    var id = root.getAttribute('data-case-id') || '';
    var rowRef = root.getAttribute('data-case-row') || '';
    var before = csIndex(csCaseById(id) || {});
    var values = csFormValues(root), cols = {}, k, changed = 0;
    if (!csMoneySane(values)) { return; }
    for (k in values) {
      if (!Object.prototype.hasOwnProperty.call(values, k)) { continue; }
      if (csRaw(values[k]) === csRaw(csVal(before, k))) { continue; }
      cols[k] = values[k];
      changed++;
    }
    if (!changed) { toast('Nothing changed on this case.'); return; }
    btn.disabled = true;
    api('updateCase', csTarget(id, rowRef, cols)).then(function (res) {
      btn.disabled = false;
      toast(csShadow(res, changed + (changed === 1 ? ' column updated' : ' columns updated')));
      csLoadCases();
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not saved: ' + e.message);
    });
  }

  /** A case is addressed by its CASE ID; the sheet row it came back on is sent too, so the server
   *  can hold the row it locked rather than search for the id twice. */
  function csTarget(id, rowRef, cols) {
    var p = { account: CS_ACCOUNT, case_id: id, columns: cols };
    if (rowRef) { p.row = Number(rowRef); }
    return p;
  }

  /** SHADOW MODE: an intended write comes back logged, not applied — say so rather than claim it
   *  landed on the sheet. */
  function csShadow(res, done) {
    if (res && (res.shadow || res.shadow_mode || res.applied === false)) {
      return done + ' · shadow mode: logged, not written to the sheet yet.';
    }
    if (res && res.idempotent) { return 'Already recorded — nothing was duplicated.'; }
    return done + '.';
  }

  function csCaseById(id) {
    var i, idx;
    for (i = 0; i < CS_CASES.length; i++) {
      idx = csIndex(CS_CASES[i]);
      if (csStr(csVal(idx, CS_H.caseId)) === csStr(id)) { return CS_CASES[i]; }
    }
    return null;
  }

  // ---------- the case list ----------
  function csLoadCases() {
    var list = $('csList');
    if (!list) { return; }
    if (!CS_ACCOUNT) {
      list.innerHTML = '<div class="cs-empty">No account chosen.<span>Pick the account above and its cases load here.</span></div>';
      if ($('csTiles')) { $('csTiles').innerHTML = ''; }
      if ($('csWhere')) { $('csWhere').textContent = 'Choose an account to load its cases.'; }
      return;
    }
    list.innerHTML = '<div class="spinner"></div>';
    api('csCases', { account: CS_ACCOUNT }).then(function (d) {
      if (d && d.ok === false) {
        CS_CASES = [];
        list.innerHTML = '<div class="cs-empty">Not connected yet.<span>' +
          esc(csStr(d.reason) || 'This account has no case tab linked to the portal yet.') + '</span></div>';
        if ($('csTiles')) { $('csTiles').innerHTML = ''; }
        csCount('cs', 0);
        return;
      }
      CS_CASES = (d && (d.cases || d.rows)) || [];
      CS_CASE_COLS = (d && d.columns && d.columns.length) ? d.columns : CS_COLUMNS;
      CS_LISTS = (d && (d.dropdowns || d.lists)) || CS_LISTS;
      if ($('csWhere')) {
        $('csWhere').innerHTML = 'Cases on <b>' + esc(csLabel(csStr(d && d.tab) || CS_CASE_TAB)) + '</b>' +
          (CS_ACCOUNT ? ' · <b>' + esc(CS_ACCOUNT) + '</b>' : '') +
          (d && d.truncated ? ' · showing the newest rows only' : '');
      }
      csRenderCases(list);
    }).catch(function (e) {
      CS_CASES = [];
      list.innerHTML = '<div class="cs-empty">The cases could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="csRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('csRetry');
      if (r) { r.onclick = csLoadCases; }
    });
  }

  function csRenderCases(list) {
    var open = 0, appeals = 0, cost = 0, i, idx;
    for (i = 0; i < CS_CASES.length; i++) {
      idx = csIndex(CS_CASES[i]);
      if (!csStr(csVal(idx, CS_H.result))) { open++; }
      if (csStr(csVal(idx, CS_H.appeal)).toUpperCase() === 'PENDING') { appeals++; }
      cost += csNum(csVal(idx, CS_H.total)) || 0;
    }
    if ($('csTiles')) {
      $('csTiles').innerHTML =
        csTile('Cases shown', String(CS_CASES.length), false) +
        csTile('Awaiting a ' + csLabel(CS_H.result).toLowerCase(), String(open), false) +
        csTile('AliExpress appeals pending', String(appeals), false) +
        csTile(csLabel(CS_H.total) + ' · rows shown', csMoney(cost), true);
    }
    csCount('cs', open);
    if (!CS_CASES.length) {
      list.innerHTML = '<div class="cs-empty">No case on this account yet.<span>Open one above, or start from a row on the Returns &amp; INAD screen.</span></div>';
      return;
    }
    list.innerHTML = CS_CASES.map(csCaseCard).join('');
    csWireForm(list);
    csMaths(list);
    if (CS_FOCUS) {
      var card = csPick(list, 'data-card', CS_FOCUS);
      if (card) {
        card.scrollIntoView({ block: 'center' });
        var b = card.querySelector('button[data-act="edit"]');
        if (b) { csToggleEdit(b); }
      }
      CS_FOCUS = '';
    }
  }
  function csTile(k, v, gold) {
    return '<div class="cs-tile' + (gold ? ' cs-gold' : '') + '"><span class="k">' + esc(k) + '</span>' +
      '<b class="num">' + esc(v) + '</b></div>';
  }

  function csCaseCard(row) {
    var idx = csIndex(row);
    var id = csStr(csVal(idx, CS_H.caseId));
    var result = csStr(csVal(idx, CS_H.result));
    var earn = csNum(csVal(idx, CS_H.earning)), tot = csNum(csVal(idx, CS_H.total));
    var net = (earn !== null && tot !== null) ? csRound(earn - tot) : null;
    var rowRef = row._row === undefined ? '' : String(row._row);

    return '<div class="card cs-case" data-card="' + csAttr(id) + '"><div class="hd">' +
        '<span class="cs-name">' + esc(csStr(csVal(idx, CS_H.product)) || 'Case') + '</span>' +
        (csStr(csVal(idx, CS_H.issue)) ? '<span class="pill cs-p-flat">' + esc(csVal(idx, CS_H.issue)) + '</span>' : '') +
        (csStr(csVal(idx, CS_H.refundStatus)) ? '<span class="pill cs-p-live">' + esc(csVal(idx, CS_H.refundStatus)) + '</span>' : '') +
        csAppealPill(csStr(csVal(idx, CS_H.appeal))) +
        (result ? '<span class="pill cs-p-gold">' + esc(result) + '</span>' :
          '<span class="pill cs-p-open">Open</span>') +
      '</div><div class="bd">' +
        '<div class="cs-meta">' +
          csChip(CS_H.caseId, '<span class="mono">' + esc(id || '—') + '</span>') +
          csChip(CS_H.ebayOrder, '<span class="mono">' + esc(csStr(csVal(idx, CS_H.ebayOrder)) || '—') + '</span>') +
          csChip(CS_H.aliOrder, '<span class="mono">' + esc(csStr(csVal(idx, CS_H.aliOrder)) || '—') + '</span>') +
          csChip(CS_H.qty, esc(csStr(csVal(idx, CS_H.qty)) || '—')) +
          csChip(CS_H.email, esc(csStr(csVal(idx, CS_H.email)) || '—')) +
          csChip(CS_H.card, esc(csStr(csVal(idx, CS_H.card)) || '—')) +
        '</div>' +
        '<div class="cs-tiles">' +
          csTile(csLabel(CS_H.earning), csMoneyText(csVal(idx, CS_H.earning)) || '—', false) +
          csTile(csLabel(CS_H.aliCost), csMoneyText(csVal(idx, CS_H.aliCost)) || '—', false) +
          csTile(csLabel(CS_H.returnCost) + ' · option 1', csMoneyText(csVal(idx, CS_H.returnCost)) || '—', false) +
          csTile(csLabel(CS_H.replacement) + ' · option 2', csMoneyText(csVal(idx, CS_H.replacement)) || '—', false) +
          csTile(csLabel(CS_H.total), csMoneyText(csVal(idx, CS_H.total)) || '—', true) +
        '</div>' +
        (net === null ? '' : '<div class="cs-note">' + esc(csLabel(CS_H.earning)) + ' minus ' + esc(csLabel(CS_H.total)) +
          ' leaves <b class="num ' + (net < 0 ? 'cs-neg' : 'cs-pos') + '">' + esc(csMoney(net)) + '</b>' +
          (net < 0 ? ' — this case is a loss as it stands.' : '.') + '</div>') +
        (csStr(csVal(idx, CS_H.tracking)) ? '<div class="cs-box"><div class="k">' + esc(CS_H.tracking) + '</div>' +
          '<div class="cs-txt mono">' + csText(csVal(idx, CS_H.tracking)) + '</div></div>' : '') +
        (csStr(csVal(idx, CS_H.address)) ? '<div class="cs-box cs-red"><div class="k">' + esc(CS_H.address) +
          ' · CS and Management only</div><div class="cs-txt">' + csText(csVal(idx, CS_H.address)) + '</div></div>' : '') +
        (csStr(csVal(idx, CS_H.note)) ? '<div class="cs-box"><div class="k">' + esc(CS_H.note) + '</div>' +
          '<div class="cs-txt">' + csText(csVal(idx, CS_H.note)) + '</div></div>' : '') +
        '<div class="cs-btns">' +
          '<button class="minibtn" data-act="edit" data-id="' + csAttr(id) + '">Update this case</button>' +
          '<button class="minibtn" data-act="all" data-id="' + csAttr(id) + '">All 19 columns</button>' +
          '<span class="cs-sub">Whatever you save is written through the portal’s own writer — the tab keeps its shape.</span>' +
        '</div>' +
        '<div class="hidden scroll" data-all="' + csAttr(id) + '" style="margin-top:10px">' + csAllColumns(idx) + '</div>' +
        '<div class="hidden" data-edit="' + csAttr(id) + '" style="margin-top:4px">' +
          csEditForm(id, rowRef, row) +
        '</div>' +
      '</div></div>';
  }

  function csEditForm(id, rowRef, row) {
    return csForm('case:' + id, row, id, rowRef,
      '<div class="cs-btns"><button class="btn-gold" data-act="save">Save the changes</button>' +
        '<span class="cs-sub">Only the fields you actually change are sent.</span></div>', null);
  }

  function csToggleEdit(btn) {
    var id = btn.getAttribute('data-id') || '';
    var box = document.querySelector('[data-edit="' + id.replace(/"/g, '') + '"]');
    if (!box) { return; }
    var opening = box.classList.contains('hidden');
    box.classList.toggle('hidden');
    btn.textContent = opening ? 'Close' : 'Update this case';
    if (opening) { csMaths(box); csLiveStrip(box); }
  }

  /** Full fidelity (§13.5): the 19 columns in the tab's own order, values exactly as written. */
  function csAllColumns(idx) {
    var cols = CS_CASE_COLS.length ? CS_CASE_COLS : CS_COLUMNS;
    var rows = cols.map(function (h) {
      return '<tr><td class="cs-c1">' + esc(csLabel(h)) + '</td><td>' + csText(csVal(idx, h)) + '</td></tr>';
    }).join('');
    return '<table class="cs-tbl"><thead><tr><th>Column</th><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function csChip(k, v) {
    return '<span class="cs-chip"><span class="k">' + esc(csLabel(k)) + '</span>' + v + '</span>';
  }
  function csAppealPill(v) {
    if (!v) { return ''; }
    var u = v.toUpperCase(), cls = 'cs-p-flat';
    if (u === 'PENDING') { cls = 'cs-p-open'; }
    else if (u === 'ACCPETED') { cls = 'cs-p-done'; }        // the live list's own spelling
    else if (u === 'REJECTED') { cls = 'cs-p-bad'; }
    return '<span class="pill ' + cls + '">' + esc(v) + '</span>';
  }

  // ---------- §8.7 live data ----------
  function csLoadLive() {
    var hint = $('csLiveHint');
    if (!CS_ACCOUNT) {
      CS_LIVE = [];
      CS_LIVE_STATE = 'no account chosen';
      if (hint) { hint.textContent = 'live listing figures load with the account'; }
      csFillProducts();
      return;
    }
    if (hint) { hint.textContent = 'loading the live listings…'; }
    api('csLiveData', { account: CS_ACCOUNT }).then(function (d) {
      if (d && d.ok === false) {
        CS_LIVE = [];
        CS_LIVE_STATE = csStr(d.reason) || 'not connected yet';
      } else {
        CS_LIVE = (d && (d.rows || d.listings)) || [];
        CS_LIVE_STATE = CS_LIVE.length + ' live listing' + (CS_LIVE.length === 1 ? '' : 's') + ' loaded';
      }
      if (hint) { hint.textContent = CS_LIVE_STATE; }
      csFillProducts();
    }).catch(function (e) {
      CS_LIVE = [];
      CS_LIVE_STATE = 'live listings not loaded — ' + e.message;
      if (hint) { hint.textContent = 'live listings not loaded'; }
      csFillProducts();
    });
  }
  function csFillProducts() {
    var dl = $('csProdList');
    if (!dl) { return; }
    dl.innerHTML = CS_LIVE.slice(0, CS_LIST_MAX).map(function (r) {
      var idx = csIndex(r), t = csStr(csVal(idx, CS_L.title));
      if (!t) { return ''; }
      return '<option value="' + csAttr(t) + '">' + esc(csStr(csVal(idx, CS_L.item))) + '</option>';
    }).join('');
  }

  // ============================== RETURNS & INAD ==============================
  VIEWS.returns = {
    label: 'Returns & INAD',
    icon: '<path d="M3 8h13a5 5 0 0 1 0 10H8"/><path d="M7 4 3 8l4 4"/>',
    roles: CS_ROLES,
    order: 31,
    badge: function () { return (STATE.counts && STATE.counts.returns) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Returns &amp; INAD</h1>' +
          '<span class="sub">The account’s own ' + esc(CS_RETURNS_TAB) + ' feed · written by the order automation, read here</span>' +
          '<button class="minibtn" id="csRRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        csPiiBanner('Buyer names and the reason each buyer gave are on this screen.') +
        '<div class="card enter d1"><div class="hd">Account &amp; filters ' +
          '<span class="hint" id="csRWhere">choose an account</span></div>' +
          '<div class="bd"><div class="cs-bar">' +
            csAccountBar('csRAcc') +
            '<div class="field"><label>Type</label><select class="cs-in" id="csRType">' +
              '<option value="">All types</option>' +
              CS_R_TYPES.map(function (t) { return '<option value="' + csAttr(t) + '">' + esc(t) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label>Status</label><select class="cs-in" id="csRStatus">' +
              '<option value="">All statuses</option>' +
              CS_R_STATUS.map(function (s) { return '<option value="' + csAttr(s) + '">' + esc(s) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label>Find</label>' +
              '<input class="cs-in" id="csRFind" type="text" autocomplete="off" placeholder="order, item or buyer"></div>' +
          '</div>' +
          '<div class="cs-note">This tab is filled by the order automation, so nothing here writes to it. ' +
            'What you write goes on the case that owns the return — in ' + esc(CS_H.note) + '.</div>' +
        '</div></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">The feed ' +
          '<span class="hint" id="csRHint">newest first</span></div>' +
          '<div class="bd"><div class="cs-tiles" id="csRTiles"></div>' +
            '<div id="csRList"><div class="spinner"></div></div></div>' +
        '</div>';
    },
    init: function () {
      $('csRRefresh').onclick = csLoadReturns;
      csWireAccount('csRAcc', function () { csLoadReturns(); csLoadCasesQuiet(); });
      $('csRType').onchange = function () { CS_R_FILTER.type = csStr(this.value); csLoadReturns(); };
      $('csRStatus').onchange = function () { CS_R_FILTER.status = csStr(this.value); csLoadReturns(); };
      $('csRType').value = CS_R_FILTER.type;
      $('csRStatus').value = CS_R_FILTER.status;
      $('csRFind').value = CS_R_FILTER.q;
      $('csRFind').oninput = function () { CS_R_FILTER.q = csStr(this.value); csRenderReturns(); };
      csLoadAccounts(function () { csLoadReturns(); csLoadCasesQuiet(); });
    }
  };

  /** The returns screen needs the case list only to say which returns already have one. */
  function csLoadCasesQuiet() {
    if (!CS_ACCOUNT) { CS_CASES = []; return; }
    api('csCases', { account: CS_ACCOUNT }).then(function (d) {
      CS_CASES = (d && d.ok !== false && (d.cases || d.rows)) || [];
      CS_CASE_COLS = (d && d.columns && d.columns.length) ? d.columns : CS_CASE_COLS;
      if (CS_RETURNS.length) { csRenderReturns(); }        // the feed owns the list; this only labels it
    }).catch(function () { CS_CASES = []; });
  }

  function csLoadReturns() {
    var list = $('csRList');
    if (!list) { return; }
    if (!CS_ACCOUNT) {
      CS_RETURNS = [];
      list.innerHTML = '<div class="cs-empty">No account chosen.<span>Each account keeps its own ' +
        esc(CS_RETURNS_TAB) + ' tab in its order workbook.</span></div>';
      if ($('csRTiles')) { $('csRTiles').innerHTML = ''; }
      return;
    }
    list.innerHTML = '<div class="spinner"></div>';
    var payload = { account: CS_ACCOUNT };
    if (CS_R_FILTER.type) { payload.type = CS_R_FILTER.type; }
    if (CS_R_FILTER.status) { payload.status = CS_R_FILTER.status; }
    api('returnsFeed', payload).then(function (d) {
      if (d && d.ok === false) {
        CS_RETURNS = [];
        list.innerHTML = '<div class="cs-empty">Not connected yet.<span>' +
          esc(csStr(d.reason) || 'This account’s order workbook is not linked to the portal yet.') + '</span></div>';
        if ($('csRTiles')) { $('csRTiles').innerHTML = ''; }
        csCount('returns', 0);
        return;
      }
      CS_RETURNS = (d && (d.rows || d.returns)) || [];
      if ($('csRWhere')) {
        $('csRWhere').textContent = csLabel(csStr(d && d.tab) || CS_RETURNS_TAB) + ' · ' + CS_ACCOUNT +
          (d && d.truncated ? ' · newest rows only' : '');
      }
      csRenderReturns();
    }).catch(function (e) {
      CS_RETURNS = [];
      list.innerHTML = '<div class="cs-empty">The feed could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="csRRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('csRRetry');
      if (r) { r.onclick = csLoadReturns; }
    });
  }

  function csCaseByOrder() {
    var map = {}, i, idx, key;
    for (i = 0; i < CS_CASES.length; i++) {
      idx = csIndex(CS_CASES[i]);
      key = csOrderKey(csVal(idx, CS_H.ebayOrder));
      if (key && !map[key]) { map[key] = CS_CASES[i]; }
    }
    return map;
  }

  function csRenderReturns() {
    var list = $('csRList');
    if (!list) { return; }
    var q = CS_R_FILTER.q.toLowerCase();
    var byOrder = csCaseByOrder();
    var shown = [], open = 0, refunded = 0, money = 0, i, idx, hay;

    for (i = 0; i < CS_RETURNS.length; i++) {
      idx = csIndex(CS_RETURNS[i]);
      if (q) {
        hay = (csStr(csVal(idx, CS_R_H.order)) + ' ' + csStr(csVal(idx, CS_R_H.title)) + ' ' +
          csStr(csVal(idx, CS_R_H.buyer)) + ' ' + csStr(csVal(idx, CS_R_H.reason))).toLowerCase();
        if (hay.indexOf(q) < 0) { continue; }
      }
      shown.push(idx);
      if (csStr(csVal(idx, CS_R_H.status)) === CS_R_REFUNDED) { refunded++; } else { open++; }
      money += csNum(csVal(idx, CS_R_H.refund)) || 0;
    }

    if ($('csRTiles')) {
      $('csRTiles').innerHTML =
        csTile('Rows shown', String(shown.length), false) +
        csTile('Still open', String(open), false) +
        csTile(CS_R_REFUNDED, String(refunded), false) +
        csTile(CS_R_H.refund + ' · rows shown', csMoney(money), true);
    }
    csCount('returns', open);

    if (!shown.length) {
      list.innerHTML = '<div class="cs-empty">Nothing in this feed for those filters.' +
        '<span>The automation writes this tab as buyers open returns and INAD cases.</span></div>';
      return;
    }
    list.innerHTML = shown.map(function (idx, pos) { return csReturnCard(idx, byOrder, pos); }).join('');
    csWireForm(list);
  }

  function csReturnCard(idx, byOrder, pos) {
    var order = csStr(csVal(idx, CS_R_H.order));
    var key = csOrderKey(order);
    var kase = byOrder[key] ? csIndex(byOrder[key]) : null;
    var caseId = kase ? csStr(csVal(kase, CS_H.caseId)) : '';
    var type = csStr(csVal(idx, CS_R_H.type));
    var status = csStr(csVal(idx, CS_R_H.status));

    return '<div class="cs-ret">' +
      '<div class="cs-ret-h">' +
        '<span class="pill ' + (type === 'INAD' ? 'cs-p-bad' : 'cs-p-live') + '">' + esc(type || 'Return') + '</span>' +
        '<span class="pill ' + csReturnStatusClass(status) + '">' + esc(status || '—') + '</span>' +
        (caseId ? '<span class="pill cs-p-gold">Case ' + esc(caseId) + '</span>' : '') +
        '<b class="cs-amt num">' + esc(csMoneyText(csVal(idx, CS_R_H.refund)) || '—') + '</b>' +
      '</div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.order) + '</span><span class="mono">' + esc(order || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.title) + '</span><span>' + esc(csStr(csVal(idx, CS_R_H.title)) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.buyer) + '</span><span>' + esc(csStr(csVal(idx, CS_R_H.buyer)) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.reason) + '</span><span class="mono">' + esc(csStr(csVal(idx, CS_R_H.reason)) || '—') + '</span></div>' +
      (csStr(csVal(idx, CS_R_H.explanation)) ?
        '<div class="tl-row"><span class="k">' + esc(CS_R_H.explanation) + '</span><span>' + csText(csVal(idx, CS_R_H.explanation)) + '</span></div>' : '') +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.dayTab) + '</span><span>' + esc(csWhen(csVal(idx, CS_R_H.dayTab)) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.added) + '</span><span class="num">' + esc(csWhen(csVal(idx, CS_R_H.added)) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.updated) + '</span><span class="num">' + esc(csWhen(csVal(idx, CS_R_H.updated)) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">' + esc(CS_R_H.notes) + '</span><span>' + (csStr(csVal(idx, CS_R_H.notes)) ? csText(csVal(idx, CS_R_H.notes)) : '<span class="cs-sub">the sheet’s own note column — empty</span>') + '</span></div>' +
      csReturnActions(idx, order, caseId, kase, pos) +
    '</div>';
  }
  function csReturnStatusClass(status) {
    if (status === CS_R_REFUNDED) { return 'cs-p-done'; }
    if (status === 'Sent by Buyer') { return 'cs-p-live'; }
    if (status === 'Opened' || status === 'Waiting for Refund') { return 'cs-p-open'; }
    return 'cs-p-flat';
  }

  /** The annotation: the note lands in NOTE BY TEAM MEMBER on the case that owns this return, so
   *  the automation's own tab is never written by a person. */
  function csReturnActions(idx, order, caseId, kase, pos) {
    var payload = {
      order: order,
      title: csStr(csVal(idx, CS_R_H.title)),
      type: csStr(csVal(idx, CS_R_H.type)),
      reason: csStr(csVal(idx, CS_R_H.reason)),
      explanation: csStr(csVal(idx, CS_R_H.explanation)),
      refund: csStr(csVal(idx, CS_R_H.refund)),
      notes: csStr(csVal(idx, CS_R_H.notes))
    };
    var key = csOrderKey(order) || ('r' + pos);
    if (!caseId) {
      return '<div class="cs-btns">' +
        '<button class="minibtn" data-act="newFromReturn" data-src="' + csAttr(JSON.stringify(payload)) + '">Open a case from this return</button>' +
        '<span class="cs-sub">No case carries this order number yet.</span></div>';
    }
    return '<div class="cs-box cs-blue">' +
      '<div class="k">' + esc(CS_H.note) + ' · on case ' + esc(caseId) + '</div>' +
      '<textarea class="cs-ta" data-notebox="' + csAttr(key) + '">' + esc(csVal(kase, CS_H.note)) + '</textarea>' +
      '<div class="cs-btns"><button class="minibtn" data-act="noteSave" data-case="' + csAttr(caseId) + '" data-key="' + csAttr(key) + '">Save the note on the case</button>' +
        '<button class="minibtn" data-act="openCase" data-case="' + csAttr(caseId) + '">Open the case</button>' +
        '<span class="cs-sub">You are editing the whole cell — the note already there is above.</span></div></div>';
  }

  function csNewFromReturn(btn) {
    var src;
    try { src = JSON.parse(btn.getAttribute('data-src') || '{}'); } catch (e) { src = {}; }
    var cols = {};
    cols[CS_H.ebayOrder] = csStr(src.order);
    cols[CS_H.product] = csStr(src.title);
    // The eBay reason list and the sheet's ISSUE list are different vocabularies, so the reason is
    // carried into the note and ISSUE is left for the person to choose.
    cols[CS_H.note] = [csStr(src.type) + ' · ' + csStr(src.reason), csStr(src.explanation), csStr(src.notes)]
      .filter(function (s) { return csStr(s) !== '' && csStr(s) !== '·'; }).join('\n');
    CS_PREFILL = { columns: cols, source: src };
    CS_COMPOSER = true;
    csOpen('cs');
  }

  function csSaveReturnNote(btn) {
    var id = btn.getAttribute('data-case') || '';
    var key = btn.getAttribute('data-key') || '';
    var box = document.querySelector('[data-notebox="' + key.replace(/"/g, '') + '"]');
    if (!box) { return; }
    var kase = csCaseById(id);
    var cols = {};
    cols[CS_H.note] = csRaw(box.value).slice(0, CS_TEXT_MAX);
    if (kase && csRaw(csVal(csIndex(kase), CS_H.note)) === cols[CS_H.note]) { toast('The note has not changed.'); return; }
    btn.disabled = true;
    api('updateCase', csTarget(id, kase && kase._row !== undefined ? String(kase._row) : '', cols)).then(function (res) {
      btn.disabled = false;
      toast(csShadow(res, 'Note saved on case ' + id));
      csLoadCasesQuiet();
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not saved: ' + e.message);
    });
  }

})();
