/* view-hunting.js — §8.1 the 33-column hunt · §4.2 the hunter's own calculator · §8/§4.3 the gate.
 * Views: hunting (Product hunting) · huntQueue (Hunt approvals).
 * Backend: submitHunt · myHunts · huntQueue · decideHunt · calcProjectedProfit. */
(function () {
  'use strict';

  /* Column names, statuses, advertising types and account selections are backend and workbook
     vocabulary — they must match Config.gs HUNTING_COLS and Hunting.gs character for character,
     the live sheet's own misspelling 'E-Bey Caluclator + £4' included. */
  var HU_APPROVED = 'APPROVED';
  var HU_NOT_APPROVED = 'NOT APPROVED';
  var HU_REVISION = 'REVISION REQUIRED';

  /* The backup workbook HuntBackup.gs mirrors every hunt into (pending · approved · not approved).
     Reviewers only: it holds every hunter's rows and their profit figures, which §4.2 keeps away
     from hunters — and Drive would refuse them anyway, so a link on the hunting screen would be
     both a leak of intent and a dead end. */
  var HU_BACKUP_URL = 'https://docs.google.com/spreadsheets/d/14TbZlKmBHkawydJXjHif8xKCnYzA7-Wm-3rZOW8fBzI/edit';

  /* R7-5 (Hasib): "add some auto selected reasons of disapproving the product" and "give the
     option… what more required" — chips that compose the comment; free text welcome around them. */
  var HU_REJECT_REASONS = ['Profit too thin after fees', 'Too many competitors',
    'Sell-through too low', 'Branded item — VeRO risk', 'Outside the £8–30 price window',
    'Supplier delivery too slow', 'Already listed / duplicate', 'Evidence links broken or missing',
    'Seasonal window already passed'];
  var HU_REVISE_NEEDS = ['Better images required', 'Need 3 working supplier links',
    'Re-check the source price', 'Selling price — margin too thin', 'Terapeak evidence missing',
    'Competitor analysis incomplete', 'Title needs rework', 'Description too weak',
    'Category breadcrumb missing', 'Confirm UK stock & delivery time'];

  /* Spec §4.3 names Product Hunter and Team Lead. REALITY WINS: the live 'Selected By' dropdown is
     Wahab · Noman · Fasieh · Irfan — two Order Processors and the Ops Head hunt too — and
     Hunting.gs HUNT_SUBMIT_ROLES accepts all five. Hiding the form from people the server accepts
     would break the real workflow, so the nav follows the server (which gates it anyway, RL-4). */
  var HU_SUBMIT_ROLES = ['Product Hunter', 'Team Lead', 'Ops Head', 'Management', 'Order Processor'];
  var HU_QUEUE_ROLES = ['Management', 'Ops Head', 'Team Lead'];   // §4.3 — Team Lead views, never decides

  /* Column X's dropdown, header-echo placeholder excluded (it is a prompt, not a decision).
     Only a fallback: huntQueue sends the server's own list and that wins. */
  var HU_ADV_TYPES = ['General Dynamic', '75% Low DYN', '80% Medium DYN', '85% Medium DYN',
    '90% High CPC LOW', '95% High  CPC PRO', '100 % Strong ', 'General 10%', 'General 5%'];

  /* Accounts and staff are BUSINESS DATA and are fetched from the signed-in backend, never listed
     here: this file is served from a public URL, so anything hardcoded would be readable by anyone
     (RL-2, RL-9). They also stay correct on their own — approve a lister or add an account in the
     registry and the pickers follow, with no code change. */
  var HU_ACCOUNTS = [];
  var HU_LISTERS = [];

  function huLoadPickers(afterFill) {
    api('accountList').then(function (d) {
      HU_ACCOUNTS = ((d && d.accounts) || []).map(function (a) { return a.account; });
      huFillDatalist('huAccList', HU_ACCOUNTS.map(function (a) { return { value: a, label: '' }; }));
    }).catch(function () {});
    api('assignableStaff', { roles: ['Item Lister', 'Listing Manager', 'Team Lead'] }).then(function (d) {
      HU_LISTERS = ((d && d.staff) || []).map(function (s) { return { email: s.email, name: s.name + ' — ' + s.role }; });
      huFillDatalist('huListerList', HU_LISTERS.map(function (l) { return { value: l.email, label: l.name }; }));
      if (typeof afterFill === 'function') afterFill();
    }).catch(function () {});
  }

  function huFillDatalist(id, items) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = items.map(function (i) {
      return '<option value="' + esc(i.value) + '">' + esc(i.label || '') + '</option>';
    }).join('');
  }

  /* The 24 columns a hunter fills. The other nine of the 33 are portal-owned (Selected By,
     Approval Status, Comments, Date Added, Account Selected, Listing Status, IMAGE, Our Profit,
     ROI) — submitHunt throws if the form sends any of them, so they are absent by design. */
  var HU_SECTIONS = [
    { title: 'Selection', hint: 'what this item is and how you would run it', fields: [
      { col: 'Main Keyword Terapeak link', req: true, wide: true,
        hint: 'The main keyword as plain text — on the live sheet this column holds no URLs; the Terapeak screenshot goes below.' },
      { col: 'Seasonal', label: 'Item type', type: 'select', req: true, opts: ['Consistent', 'Seasonal'],
        hint: 'Chosen at the start: Consistent = sells all year; Seasonal = holiday/weather-driven. Sorts it into the right approval queue.' },
      { col: 'CPC Selling Chance', type: 'select', opts: HU_ADV_TYPES,
        hint: 'Leave blank if unsure — Management sets it at approval.' }
    ] },
    { title: 'Evidence links', hint: 'the screenshots and sources someone else can check', fields: [
      { col: 'Image Link of avg sold price', hint: 'kommodo.ai screenshot' },
      { col: 'Image Link of Zik analytics', hint: 'kommodo.ai screenshot' },
      { col: 'Terapeak overview', hint: 'kommodo.ai screenshot' },
      { col: 'Temu Link' },
      { col: 'Product Link 1 Main supplier', req: true, hint: 'Also added in the supplier sheet.' },
      { col: 'Product Link 2' },
      { col: 'Product Link 3' },
      { col: 'Ebay Link', label: 'Prime Ebay Link' }
    ] },
    { title: 'Product', hint: 'what gets listed', fields: [
      { col: 'Title', req: true, wide: true },
      { col: 'Image Link', hint: 'The sheet builds its own preview from this link.' },
      { col: 'Category', hint: 'The eBay breadcrumb, one level per line.', type: 'area' },
      { col: 'DESCRIPTION', type: 'area', wide: true }
    ] },
    { title: 'Pricing', hint: 'the two figures the calculator below follows', fields: [
      { col: 'Source Price', req: true, hint: 'A range is fine — "3.02 - 3.30". The higher end is used.' },
      { col: 'E-Bey Caluclator + £4', label: 'Selling Price', req: true, hint: 'The intended eBay sell price — ranges like 8.99 - 11.99 are welcome for variation items.' }
    ] },
    { title: 'Analysis', hint: 'the numbers Management reads before deciding', fields: [
      { col: 'Sell Through' },
      { col: 'Competitors' },
      { col: 'TOP THREE SALES', hint: 'As on the sheet — "330 / 229 / 212".' },
      { col: 'Total Competitors on main keyword', hint: 'As on the sheet — "9,500+ results for milk frother".' },
      { col: 'Price Range ANALYSIS' },
      { col: 'Sold Unit ANALYSIS' },
      { col: 'Comment', type: 'area', wide: true, hint: 'Anything the reviewer should know — packaging, pack size, a screenshot link.' }
    ] }
  ];

  var HU_REQUIRED = ['Title', 'Main Keyword Terapeak link', 'Product Link 1 Main supplier',
    'Source Price', 'E-Bey Caluclator + £4'];
  var HU_PRICE_COLS = ['Source Price', 'E-Bey Caluclator + £4'];

  /* Evidence columns on a review card, in reading order. 'Main Keyword Terapeak link' is plain
     text in practice, so every one of these goes through the same link-or-text renderer. */
  var HU_EVIDENCE = ['Main Keyword Terapeak link', 'Image Link of avg sold price',
    'Image Link of Zik analytics', 'Terapeak overview', 'Temu Link', 'Product Link 1 Main supplier',
    'Product Link 2', 'Product Link 3', 'Ebay Link', 'Image Link'];
  var HU_NUMBERS = ['Source Price', 'E-Bey Caluclator + £4', 'Sell Through', 'Competitors',
    'TOP THREE SALES', 'Total Competitors on main keyword', 'Price Range ANALYSIS', 'Sold Unit ANALYSIS'];

  var HU_FLAT = [];
  (function () {
    var n = 0, s, f;
    for (s = 0; s < HU_SECTIONS.length; s++) {
      for (f = 0; f < HU_SECTIONS[s].fields.length; f++) {
        HU_SECTIONS[s].fields[f].id = 'huF' + (n++);
        HU_FLAT.push(HU_SECTIONS[s].fields[f]);
      }
    }
  })();

  VIEW_CSS.push(
    '.hu-imgwrap{display:inline-block;border:1px solid var(--gold-line);border-radius:10px;overflow:hidden;background:var(--panel-2);line-height:0}' +
    '.hu-imgwrap:hover{border-color:var(--gold-line-hi)}' +
    '.hu-img{max-width:220px;max-height:150px;object-fit:contain;display:block}' +
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.hu-sec{padding:16px 0}.hu-sec+.hu-sec{border-top:1px solid var(--gold-line)}' +
    '.hu-sec:first-child{padding-top:2px}' +
    '.hu-sec-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}' +
    '.hu-sec-h b{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.11em;color:var(--gold-a)}' +
    '.hu-sec-h span{font-size:11.5px;color:var(--text-3);font-weight:600}' +
    '.hu-grid{display:grid;gap:13px;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.hu-grid .hu-wide{grid-column:1/-1}' +
    '.hu-grid .field{margin-top:0;min-width:0}' +
    '.hu-in,.hu-ta,.hu-sel{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.hu-ta{resize:vertical;min-height:64px}' +
    '.hu-in:focus,.hu-ta:focus,.hu-sel:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.hu-hint{font-size:11px;color:var(--text-3);font-weight:600;margin-top:5px;line-height:1.45}' +
    '.hu-req{color:var(--gold-a);font-weight:800}' +
    '.hu-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px}' +
    '.hu-tiles{display:grid;gap:11px;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:13px}' +
    '.hu-tile{padding:12px 14px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);min-width:0}' +
    '.hu-tile .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800}' +
    '.hu-tile b{display:block;font-size:19px;font-weight:800;margin-top:5px;word-break:break-word}' +
    '.hu-tile.big b{font-size:23px}' +
    '.hu-calc-note{font-size:11.5px;color:var(--text-2);font-weight:600;line-height:1.5;margin-top:12px}' +
    '.hu-flag{background:var(--warn-soft);border:1px solid rgba(255,159,67,.35);border-radius:10px;padding:9px 12px;margin-top:8px;font-size:12.5px;font-weight:600;line-height:1.5}' +
    '.hu-flag b{color:var(--warn);display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;margin-bottom:3px}' +
    '.hu-item{padding:16px 0}.hu-item+.hu-item{border-top:1px solid var(--gold-line)}' +
    '.hu-item:first-child{padding-top:2px}' +
    '.hu-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}' +
    '.hu-t{font-weight:800;flex:1 1 220px;min-width:0;word-break:break-word}' +
    '.hu-meta{font-size:11.5px;color:var(--text-3);font-weight:700;letter-spacing:.03em}' +
    '.hu-box{margin-top:10px;padding:11px 13px;border-radius:10px;background:rgba(120,132,152,.10);border:1px solid var(--gold-line)}' +
    '.hu-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.hu-box.hu-say{background:var(--blue-soft);border-color:rgba(61,155,240,.30)}' +
    '.hu-box.hu-say .k{color:var(--blue-2)}' +
    '.hu-box.hu-bad{background:var(--bad-soft);border-color:rgba(240,96,90,.45)}' +
    '.hu-box.hu-bad .k{color:var(--bad)}' +
    '.hu-box.hu-warn{background:var(--warn-soft);border-color:rgba(255,159,67,.4)}' +
    '.hu-box.hu-warn .k{color:var(--warn)}' +
    '.hu-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.55}' +
    '.hu-link{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.hu-lg{display:grid;gap:10px 16px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:6px}' +
    '.hu-lr{font-size:12.5px;font-weight:600;min-width:0}' +
    '.hu-lr .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-bottom:3px}' +
    '.hu-none{color:var(--text-3);font-weight:600}' +
    '.pill.hu-ok{background:linear-gradient(135deg,rgba(233,169,60,.20),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.hu-no{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.hu-wait{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.hu-rev{background:var(--warn-soft);color:var(--warn);border:1px solid rgba(255,159,67,.45)}' +
    '.hu-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}' +
    '.hu-chipk{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:700;margin-top:10px}' +
    '.hu-chip{border:1px solid var(--gold-line);background:var(--panel-2);color:var(--text-2);border-radius:999px;' +
      'padding:5px 11px;font-size:12px;font-weight:600;cursor:pointer;user-select:none;transition:border-color .15s,color .15s}' +
    '.hu-chip:hover{border-color:var(--gold-line-hi)}' +
    '.hu-chip.on{border-color:var(--gold-a);color:var(--gold-a);background:rgba(212,175,55,.08)}' +
    '.hu-revbtn{border-color:rgba(255,159,67,.55)!important;color:var(--warn)!important}' +
    '.hu-revband{background:var(--warn-soft);border:1px solid rgba(255,159,67,.4);border-radius:12px;' +
      'padding:10px 14px;margin-bottom:14px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.pill.hu-view{background:rgba(120,132,152,.16);color:var(--text-2)}' +
    '.hu-dec{margin-top:14px;padding-top:14px;border-top:1px solid var(--gold-line)}' +
    '.hu-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.hu-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '@media (max-width:880px){' +
      '.hu-grid,.hu-lg{grid-template-columns:1fr}' +
      '.hu-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.hu-tile b{font-size:17px}.hu-tile.big b{font-size:20px}' +
    '}'
  );

  // ---------- safety + small helpers (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function huAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function huStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function huHas(arr, v) { return arr.indexOf(v) >= 0; }
  function huRole() { return (STATE.user && STATE.user.role) || ''; }
  function huEl(id) { return $(id); }
  function huPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) return els[i]; }
    return null;
  }
  function huCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  /** Mirrors the server's huntFirstNumber_ so the form asks for the same thing the server does. */
  function huFirstNumber(v) {
    var m = String(v == null ? '' : v).replace(/[£$,]/g, '').match(/\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  function huMoney(n) { return '£' + (Math.round(Number(n) * 100) / 100).toFixed(2); }

  /** A sheet cell is money only when it is a real number; 'x - y' ranges and '£53.08 - 47.54'
      strings stay exactly as typed rather than being flattened into a false figure. */
  function huCellMoney(v) {
    if (v === '' || v === null || v === undefined) return '<span class="hu-none">—</span>';
    if (typeof v === 'number' && isFinite(v)) return '<span class="num">' + esc(huMoney(v)) + '</span>';
    return '<span class="hu-txt">' + esc(huStr(v)) + '</span>';
  }
  /** The ROI column is number-formatted '0%', so a stored 0.39 means 39%. calcProjectedProfit
      returns roiPct on the other scale (39.2 means 39%) — the two never share a formatter. */
  function huCellRoi(v) {
    if (v === '' || v === null || v === undefined) return '<span class="hu-none">—</span>';
    if (typeof v === 'number' && isFinite(v)) return '<span class="num">' + esc(Math.round(v * 100) + '%') + '</span>';
    return '<span class="hu-txt">' + esc(huStr(v)) + '</span>';
  }
  function huCell(v) {
    var s = huStr(v);
    return s ? '<span class="hu-txt">' + esc(s) + '</span>' : '<span class="hu-none">—</span>';
  }
  /** RL-3: a cell becomes an anchor only when safeUrl() accepts it; anything else is inert text. */
  /** Today 23:59 in Pakistan time, in datetime-local format — the default listing deadline. */
  function huTodayEndPkt() {
    var pk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return pk.getFullYear() + '-' + p2(pk.getMonth() + 1) + '-' + p2(pk.getDate()) + 'T23:59';
  }

  function huLinkOrText(v) {
    var s = huStr(v), u = safeUrl(s);
    if (!s) return '<span class="hu-none">—</span>';
    if (!u) return '<span class="hu-txt">' + esc(s) + '</span>';
    /* R5 (Hasib): "if a product hunter adds an aliexpress image link or ebay link in image,
     * make it visible there on the time of approval" — a link that IS an image renders as the
     * image itself (lazy thumbnail, click opens the full file). AliExpress and eBay CDNs plus
     * anything ending in an image extension count; page links stay links. */
    if (huIsImageUrl(u)) {
      return '<a class="hu-imgwrap" href="' + huAttr(u) + '" target="_blank" rel="noopener noreferrer" title="' + huAttr(u) + '">' +
        '<img class="hu-img" loading="lazy" referrerpolicy="no-referrer" src="' + huAttr(u) + '" alt="evidence image"' +
        ' onerror="var p=this.parentNode;p.className=\'hu-link\';p.style.lineHeight=\'1.4\';p.textContent=p.title">' +
        '</a>';
    }
    return '<a class="hu-link" href="' + huAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>';
  }

  function huIsImageUrl(u) {
    var s = String(u).toLowerCase().split('?')[0];
    if (/\.(jpe?g|png|gif|webp|bmp|avif)$/.test(s)) return true;
    return /(^https:\/\/([a-z0-9-]+\.)*(alicdn\.com|ebayimg\.com|ibb\.co|imgur\.com|postimg\.cc|prnt\.sc|gyazo\.com))/.test(String(u).toLowerCase());
  }

  // ---------- §8.0 the UK listing clock, shown in Pakistan time ----------
  /** Europe/London wall time → the absolute instant, so 7:00 PM UK reads correctly in PKT in both
      BST and GMT. No offset is ever assumed; both are read from the runtime's own zone data. */
  function huZoneInstant(ms, tz) {
    var s = new Date(ms).toLocaleString('en-US', { timeZone: tz, hour12: false, year: 'numeric',
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var m = s.match(/(\d+)\/(\d+)\/(\d+)[^\d]+(\d+):(\d+):(\d+)/);
    if (!m) { return ms; }
    return Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), Number(m[4]) % 24, Number(m[5]), Number(m[6]));
  }
  function huUkTime(hh, mm) {
    var today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }).split('-');
    var guess = Date.UTC(Number(today[0]), Number(today[1]) - 1, Number(today[2]), hh, mm);
    var ms = guess - (huZoneInstant(guess, 'Europe/London') - guess);
    ms = guess - (huZoneInstant(ms, 'Europe/London') - ms);
    return fmtPkt(new Date(ms).toISOString(), false);
  }
  function huClockLine() {
    return 'Day 0 dummy goes live 7:00 PM UK (' + esc(huUkTime(19, 0)) + ' PKT) · the 72-hour revision ' +
      'window is 1:00–5:00 PM UK (' + esc(huUkTime(13, 0)) + '–' + esc(huUkTime(17, 0)) + ' PKT).';
  }

  // ---------- status ----------
  function huPill(rec) {
    var s = huStr(rec.approval_status);
    if (s === HU_APPROVED) return '<span class="pill hu-ok">Approved</span>';
    if (s === HU_NOT_APPROVED) return '<span class="pill hu-no">Not approved</span>';
    if (s === HU_REVISION) return '<span class="pill hu-rev">Revision required</span>';
    return '<span class="pill hu-wait">Awaiting review</span>';
  }
  /** The live column B holds seven spellings; the server folds them but keeps the raw text, so a
      row recorded as 'Already Tested ' says so instead of reading as a plain rejection. */
  function huRawNote(rec) {
    var raw = huStr(rec.approval_status_raw), canon = huStr(rec.approval_status);
    if (!raw) return '';
    if (raw.replace(/\s+/g, ' ').toUpperCase() === canon) return '';
    return '<span class="hu-meta">recorded as “' + esc(raw) + '”</span>';
  }
  function huFlags(flags) {
    if (!flags || !flags.length) return '';
    return flags.map(function (f) {
      var val = (f.value === '' || f.value === null || f.value === undefined) ? '' : huStr(f.value);
      return '<div class="hu-flag"><b>' + esc(huStr(f.criteria) || 'Criteria') + '</b>' +
        esc(huStr(f.rule)) + (val ? ' — <span class="num">' + esc(val) + '</span>' : '') + '</div>';
    }).join('');
  }

  // ============================== PRODUCT HUNTING ==============================
  VIEWS.hunting = {
    label: 'Product hunting',
    icon: '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/><path d="M16 16l4.5 4.5"/><path d="M11 8v6M8 11h6"/>',
    roles: HU_SUBMIT_ROLES,
    order: 15,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Product hunting</h1>' +
          '<span class="sub">Every hunt goes to Management — an account, a lister and a deadline come back with the decision</span>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">New hunt ' +
          '<span class="hint">Five fields are required · everything else strengthens the case</span></div>' +
          '<div class="bd"><div id="huRevBand" style="display:none"></div>' + HU_SECTIONS.map(huSection).join('') +
            '<div id="huDupBand" style="display:none;margin:10px 0"></div>' +
            '<div class="hu-btns"><button class="btn-gold" id="huSend">Submit hunt</button>' +
              '<button class="minibtn" id="huDupBtn">Check for duplicates</button>' +
              '<button class="minibtn" id="huClear">Clear form</button>' +
              '<span class="hu-hint" style="margin-top:0">Nothing is listed until Management approves it.</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="card ideas enter d2" style="margin-top:16px"><div class="hd">Projected profit ' +
          '<span class="hint">Your own projection, live as you type</span></div>' +
          '<div class="bd">' +
            '<div class="hu-grid"><div class="field"><label>Shipping to us (optional)</label>' +
              '<input class="hu-in" id="huShip" type="text" inputmode="decimal" autocomplete="off">' +
              '<div class="hu-hint">Added to the source price before profit and ROI.</div></div></div>' +
            '<div id="huCalcBody"></div>' +
            '<div class="hu-calc-note">This is the projected profit of the item you are hunting — the one profit ' +
              'figure hunting shows. Live account earnings stay with Management. No account is chosen yet, so the ' +
              'default eBay fee rates are used; the figure is re-priced against the real account at approval.</div>' +
          '</div>' +
        '</div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">My hunts ' +
          '<span class="hint">Newest first</span>' +
          '<select class="hu-sel" id="huFilter" style="width:auto;padding:7px 11px;font-size:12px">' +
            '<option value="all">All</option><option value="pending">Awaiting review</option>' +
            '<option value="REVISION REQUIRED">Revision required</option>' +
            '<option value="APPROVED">Approved</option><option value="NOT APPROVED">Not approved</option>' +
          '</select></div>' +
          '<div class="bd" id="huMineBody"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      huWireForm();
      huLoadMine();
      if (huHas(HU_QUEUE_ROLES, huRole())) {
        api('huntQueue').then(function (d) { huCount('huntQueue', ((d && d.hunts) || []).length); }).catch(function () {});
      }
    }
  };

  function huSection(sec) {
    return '<div class="hu-sec"><div class="hu-sec-h"><b>' + esc(sec.title) + '</b>' +
        (sec.hint ? '<span>' + esc(sec.hint) + '</span>' : '') + '</div>' +
      '<div class="hu-grid">' + sec.fields.map(huField).join('') + '</div></div>';
  }

  function huField(f) {
    var body;
    if (f.type === 'select') {
      body = '<select class="hu-sel" id="' + huAttr(f.id) + '"><option value=""></option>' +
        f.opts.map(function (o) { return '<option value="' + huAttr(o) + '">' + esc(o) + '</option>'; }).join('') +
        '</select>';
    } else if (f.type === 'area') {
      body = '<textarea class="hu-ta" id="' + huAttr(f.id) + '"></textarea>';
    } else {
      body = '<input class="hu-in" id="' + huAttr(f.id) + '" type="text" autocomplete="off">';
    }
    return '<div class="field' + (f.wide ? ' hu-wide' : '') + '">' +
      '<label>' + esc(f.label || f.col) + (f.req ? ' <span class="hu-req">required</span>' : '') + '</label>' + body +
      (f.hint ? '<div class="hu-hint">' + esc(f.hint) + '</div>' : '') + '</div>';
  }

  function huFieldFor(col) {
    var i;
    for (i = 0; i < HU_FLAT.length; i++) { if (HU_FLAT[i].col === col) return HU_FLAT[i]; }
    return null;
  }
  function huValue(col) {
    var f = huFieldFor(col), el = f ? huEl(f.id) : null;
    return el ? huStr(el.value) : '';
  }

  function huWireForm() {
    var i, el, price = {};
    for (i = 0; i < HU_PRICE_COLS.length; i++) { price[HU_PRICE_COLS[i]] = true; }
    for (i = 0; i < HU_FLAT.length; i++) {
      el = huEl(HU_FLAT[i].id);
      if (!el) { continue; }
      if (price[HU_FLAT[i].col] || HU_FLAT[i].col === 'Category' || HU_FLAT[i].col === 'CPC Selling Chance') {
        el.oninput = huCalcSoon;
        el.onchange = huCalcSoon;    /* CPC choice re-runs the projection — the £2 allowance rides it */
      }
    }
    el = huEl('huShip');
    if (el) { el.oninput = huCalcSoon; }
    huCalcIdle('Type a source price and an intended sell price — the projection appears here.');
    huEl('huClear').onclick = function () { huSetRevise(null); huResetForm(); huCalcIdle('Cleared. The projection follows your next price.'); };
    huEl('huSend').onclick = huSubmit;
    var dupBtn = huEl('huDupBtn'); if (dupBtn) { dupBtn.onclick = function () { huRunDupCheck(false); }; }
    /* auto-check when the hunter finishes the title or the main AliExpress link */
    ['Title', 'Product Link 1 Main supplier'].forEach(function (col) {
      var f = huFieldFor(col), el = f ? huEl(f.id) : null;
      if (el) { el.addEventListener('blur', function () { huRunDupCheck(true); }); }
    });
    huEl('huFilter').onchange = huLoadMine;
  }

  function huResetForm() {
    var i, el;
    for (i = 0; i < HU_FLAT.length; i++) { el = huEl(HU_FLAT[i].id); if (el) { el.value = ''; } }
    el = huEl('huShip'); if (el) { el.value = ''; }
  }

  // ---------- the live calculator (§4.2 allowed exception) ----------
  var huCalcTimer = null, huCalcSeq = 0;

  function huCalcIdle(msg) {
    var box = huEl('huCalcBody');
    if (box) { box.innerHTML = '<div class="hu-hint" style="margin-top:0">' + esc(msg) + '</div>'; }
  }
  function huCalcSoon() {
    clearTimeout(huCalcTimer);
    huCalcTimer = setTimeout(huCalcNow, 450);
  }
  function huCalcNow() {
    var box = huEl('huCalcBody');
    if (!box) { return; }
    var sell = huValue('E-Bey Caluclator + £4');
    if (huFirstNumber(sell) === null) { huCalcIdle('Type a source price and an intended sell price — the projection appears here.'); return; }
    var seq = ++huCalcSeq;
    api('calcProjectedProfit', {
      soldFor: sell,
      sourcePrice: huValue('Source Price'),
      shipping: huStr(huEl('huShip') ? huEl('huShip').value : ''),
      category: huValue('Category')
    }).then(function (r) {
      if (seq !== huCalcSeq) { return; }
      /* R6 (Hasib): "if he selects item for CPC, add those 2 pounds in calculation too" — a CPC
         advertising choice costs ~£2 in clicks per sale, so the projection carries it. Applied
         here, labeled, whenever the chosen type names CPC. */
      var advSel = huValue('CPC Selling Chance');
      if (/CPC/i.test(huStr(advSel))) {
        r = JSON.parse(JSON.stringify(r));
        r.profit = (Number(r.profit) || 0) - 2;
        r.cost = (Number(r.cost) || 0) + 2;
        if (r.roiPct !== null && r.roiPct !== undefined && Number(r.cost) > 0) {
          r.roiPct = (Number(r.profit) / Number(r.cost)) * 100;
        }
        r.notes = (r.notes || []).concat(['CPC allowance −£2.00 included (advertising type: ' + huStr(advSel) + ')']);
      }
      box.innerHTML = huCalcHtml(r);
    }).catch(function (e) {
      if (seq !== huCalcSeq) { return; }
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">That could not be calculated: ' + esc(e.message) + '</div>';
    });
  }

  function huCalcHtml(r) {
    var roi = (r.roiPct === null || r.roiPct === undefined) ? null : Number(r.roiPct);
    var notes = (r.notes || []).map(function (n) { return esc(huStr(n)); }).join(' ');
    /* R6b (Hasib): "give the product hunting version … no breakdown of all the costs, just
       profit and order earning — only management will get that version". Same maths, smaller
       window: hunters see the two numbers that matter and none of the fee anatomy. */
    var huMgmt = STATE.user && (['Management', 'Ops Head'].indexOf(STATE.user.role) >= 0 || STATE.user.super);
    if (!huMgmt) {
      return '<div class="hu-tiles">' +
        '<div class="hu-tile big"><span class="k">Order Earning</span><b class="num goldtext">' + esc(huMoney(r.orderEarning)) + '</b></div>' +
        '<div class="hu-tile big"><span class="k">Projected profit</span><b class="num goldtext">' + esc(huMoney(r.profit)) + '</b></div>' +
      '</div>';
    }
    return '<div class="hu-tiles">' +
        '<div class="hu-tile"><span class="k">Order Earning</span><b class="num">' + esc(huMoney(r.orderEarning)) + '</b></div>' +
        '<div class="hu-tile"><span class="k">Cost to us</span><b class="num">' + esc(huMoney(r.cost)) + '</b></div>' +
        '<div class="hu-tile big"><span class="k">Projected profit</span><b class="num goldtext">' + esc(huMoney(r.profit)) + '</b></div>' +
        '<div class="hu-tile big"><span class="k">ROI</span><b class="num goldtext">' +
          (roi === null ? '—' : esc(roi.toFixed(0) + '%')) + '</b></div>' +
      '</div>' +
      '<div class="hu-hint">eBay fees ' + esc(huMoney(r.fees)) + ' on a ' + esc(huMoney(r.soldFor)) + ' sale · ' +
        'category fee ' + esc((Number(r.fvf) * 100).toFixed(1)) + '%' +
        (r.perOrderTier ? ' · per-order fee ' + esc(huMoney(r.breakdown && r.breakdown.perOrderFee)) : '') +
        ' · VAT included' + (notes ? ' — ' + notes : '') + '</div>';
  }

  // ---------- submission ----------
  /* 26 Aug (owner): warn the hunter when the product was hunted or REJECTED before, so nobody
     wastes time re-finding a dead product. Soft block: the first Submit after a match shows the
     history and asks for a second, deliberate click. */
  var HU_DUP_ACK = '';   // the title+link signature the hunter has acknowledged
  function huDupSig() { return huNorm(huValue('Title')) + '|' + huNorm(huValue('Product Link 1 Main supplier')); }
  function huNorm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function huRunDupCheck(silent, done) {
    var band = huEl('huDupBand');
    var title = huValue('Title'), link = huValue('Product Link 1 Main supplier');
    if (!band || (!title && !link)) { if (done) { done(0); } return; }
    api('huntDuplicateCheck', { title: title, link: link }).then(function (d) {
      if (!huEl('huDupBand')) { if (done) { done(0); } return; }
      var m = (d && d.matches) || [];
      if (!d || !d.checked || !m.length) {
        band.style.display = silent ? 'none' : 'block';
        if (!silent) { band.innerHTML = '<div class="hu-hint" style="margin:0;border:1px solid var(--gold-line);border-radius:9px;padding:8px 11px">No earlier hunt matches this product — you are clear to submit.</div>'; }
        if (done) { done(0); }
        return;
      }
      var rej = d.rejected || 0;
      band.style.display = 'block';
      band.innerHTML = '<div style="border:1px solid ' + (rej ? 'var(--bad)' : 'var(--warn)') + ';border-radius:10px;padding:10px 13px;background:' + (rej ? 'var(--bad-soft,rgba(255,90,90,.08))' : 'var(--warn-soft)') + '">' +
        '<div style="font-weight:800;font-size:13px;color:' + (rej ? 'var(--bad)' : 'var(--warn)') + '">' +
          (rej ? '🚫 This product was REJECTED before' : '⚠️ This product has been hunted before') + ' · ' + m.length + ' record(s)</div>' +
        '<div style="margin-top:6px">' + m.map(function (x) {
          return '<div style="font-size:12px;padding:4px 0;border-top:1px solid var(--gold-line)"><b>' + esc(x.status_label) + '</b>' +
            ' · ' + esc(x.title) + ' · ' + esc(x.hunter).split('@')[0] + (x.date ? ' · ' + esc(String(x.date).slice(0,10)) : '') +
            ' · <span style="color:var(--text-3)">' + esc(x.match) + '</span>' +
            (x.reason ? '<div style="color:var(--text-2);font-size:11.5px">reason: ' + esc(x.reason) + '</div>' : '') + '</div>';
        }).join('') + '</div>' +
        '<div class="hu-hint" style="margin:8px 0 0">Read these before submitting. If it is genuinely different, Submit again to proceed.</div></div>';
      if (done) { done(m.length); }
    }).catch(function () { if (done) { done(0); } });
  }

  function huSubmit() {
    var btn = this, payload = { columns: {} }, i, col, v, ship;
    for (i = 0; i < HU_REQUIRED.length; i++) {
      if (!huValue(HU_REQUIRED[i])) {
        toast(HU_REQUIRED[i] + ' is required.');
        var miss = huFieldFor(HU_REQUIRED[i]);
        if (miss && huEl(miss.id)) { huEl(miss.id).focus(); }
        return;
      }
    }
    for (i = 0; i < HU_PRICE_COLS.length; i++) {
      if (huFirstNumber(huValue(HU_PRICE_COLS[i])) === null) {
        toast(HU_PRICE_COLS[i] + ' needs a number — a range like "3.02 - 3.30" is fine.');
        return;
      }
    }
    /* soft duplicate gate: warn once, proceed on the acknowledged second click */
    if (huDupSig() !== HU_DUP_ACK) {
      var self = this;
      huRunDupCheck(false, function (n) {
        HU_DUP_ACK = huDupSig();
        if (n > 0) { toast('This product has been hunted before — see the note, then Submit again if it is different.'); }
        else { huSubmit.call(self); }   // clear — go straight through
      });
      return;
    }
    for (i = 0; i < HU_FLAT.length; i++) {
      col = HU_FLAT[i].col;
      v = huValue(col);
      if (v) { payload.columns[col] = v; }
    }
    ship = huStr(huEl('huShip') ? huEl('huShip').value : '');
    if (ship) { payload.shipping = ship; }

    /* R7-1: optimistic submit — the form clears the instant the click lands (Hasib: "same with
       product hunter when he adds the data there"). The draft keeper holds every keystroke
       until the server CONFIRMS; a refusal refills the whole form exactly as typed — and, on a
       revision, puts the form back into revise mode for the same hunt. */
    var revId = HU_REVISING, revTitle = HU_REV_TITLE;
    if (revId) { payload.hunt_id = revId; huSetRevise(null); }
    huResetForm();
    huCalcIdle(revId ? 'Revision sent. The projection follows your next hunt.' : 'Submitted. The projection follows your next hunt.');
    toast(revId ? 'Revision sent — saving…' : 'Hunt submitted — saving…');
    api(revId ? 'reviseHunt' : 'submitHunt', payload).then(function (res) {
      if (typeof draftClear === 'function') { draftClear('hunting'); }
      toast(revId ? 'Revised · ' + huStr(res.hunt_id) + ' is back in the review queue'
        : 'Hunt saved · ' + huStr(res.hunt_id) +
          ((res.criteria_flags && res.criteria_flags.length) ? ' · ' + res.criteria_flags.length + ' criteria flag(s)' : ''));
      huLoadMine();
    }).catch(function (e) {
      /* Their typing first (the keeper only fills EMPTY fields), then the record tops up
         whatever they had not touched — edits win, nothing is blank. */
      if (typeof draftRestore === 'function') { draftRestore('hunting'); }
      if (revId) { huFillFromRec(HU_MINE[revId], true); huSetRevise(revId, revTitle); }
      toast('NOT saved — ' + e.message + ' · your typing is restored.');
    });
  }

  // ---------- the Revise flow (R7-5: fix a hunt while it is pending or sent back) ----------
  var HU_REVISING = '', HU_REV_TITLE = '';

  function huSetRevise(id, title) {
    HU_REVISING = id || '';
    HU_REV_TITLE = HU_REVISING ? huStr(title) : '';
    var band = huEl('huRevBand'), send = huEl('huSend');
    if (band) {
      band.className = HU_REVISING ? 'hu-revband' : '';
      band.style.display = HU_REVISING ? '' : 'none';
      band.innerHTML = HU_REVISING
        ? '<span>Revising <b class="mono">' + esc(HU_REVISING) + '</b>' +
            (HU_REV_TITLE ? ' — ' + esc(HU_REV_TITLE.slice(0, 60)) : '') + '</span>' +
          '<span style="font-weight:500;color:var(--text-2)">Fix what was asked, then press Save revision — it goes straight back into the review queue.</span>' +
          '<button class="minibtn" id="huRevCancel" style="margin-left:auto">Cancel revision</button>'
        : '';
      var c = huEl('huRevCancel');
      if (c) {
        c.onclick = function () {
          huSetRevise(null); huResetForm();
          huCalcIdle('Revision cancelled — the form is a fresh hunt again.');
        };
      }
    }
    if (send) { send.textContent = HU_REVISING ? 'Save revision' : 'Submit hunt'; }
  }

  function huFillFromRec(rec, onlyEmpty) {
    if (!rec) { return; }
    var i, f, el;
    for (i = 0; i < HU_FLAT.length; i++) {
      f = HU_FLAT[i]; el = huEl(f.id);
      if (!el) { continue; }
      if (onlyEmpty && huStr(el.value) !== '') { continue; }
      el.value = huStr(rec[f.col]);
    }
  }

  function huStartRevise(id) {
    var rec = HU_MINE[id];
    if (!rec) { toast('That hunt is not on this list any more — refresh and try again.'); return; }
    huFillFromRec(rec, false);
    var el = huEl('huShip'); if (el) { el.value = ''; }
    huSetRevise(id, huStr(rec['Title']));
    huCalcSoon();
    var band = huEl('huRevBand');
    if (band && band.scrollIntoView) { band.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  // ---------- my hunts ----------
  var HU_MINE = {};          // hunt_id → record, for the Revise flow

  function huLoadMine() {
    var box = huEl('huMineBody'), filter = huEl('huFilter');
    if (!box) { return; }
    /* The server's status filter predates the revision road, so 'REVISION REQUIRED' is filtered
       here from the 'all' answer instead of being sent — same rows, no new failure mode. */
    var want = filter ? filter.value : 'all';
    var ask = (want === HU_REVISION) ? 'all' : want;
    var hc = cachedCall('myHunts', { status: ask }, function (d) {
      var hunts = (d && d.hunts) || [];
      if (want === HU_REVISION) {
        hunts = hunts.filter(function (r) { return huStr(r.approval_status) === HU_REVISION; });
      }
      if (!hunts.length) {
        box.innerHTML = '<div class="hu-empty">Nothing here yet.<span>Every hunt you submit stays on this list with its decision and any comment.</span></div>';
        return;
      }
      HU_MINE = {};
      hunts.forEach(function (r) { HU_MINE[huStr(r.hunt_id)] = r; });
      box.innerHTML = hunts.map(huMineItem).join('');
      huWireMine(box);
    });
    if (!hc.painted) { box.innerHTML = '<div class="spinner"></div>'; }
    hc.done.catch(function (e) {
      box.innerHTML = '<div class="hu-empty">Your hunts could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="huMineRetry" style="margin-top:10px">Try again</button></div>';
      var r = huEl('huMineRetry'); if (r) { r.onclick = huLoadMine; }
    });
  }

  function huWireMine(box) {
    var btns = box.querySelectorAll('button[data-hurev]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) { b.onclick = function () { huStartRevise(b.getAttribute('data-hurev')); }; })(btns[i]);
    }
  }

  function huMineItem(rec) {
    var st = huStr(rec.approval_status);
    var approved = st === HU_APPROVED;
    var decided = st !== '';
    var revisable = st === '' || st === HU_REVISION;   // mirror of the server's own gate
    var comment = huStr(rec['Comments']);          // column C — where the live sheet keeps review notes
    var account = huStr(rec['Account Selected']);
    var adv = huStr(rec['CPC Selling Chance']);
    var status = huStr(rec['Listing Status']);
    var mine = huStr(rec['Comment']);              // column AG — the hunter's own note

    return '<div class="hu-item">' +
      '<div class="hu-h"><span class="hu-t">' + esc(huStr(rec['Title']) || huStr(rec.hunt_id)) + '</span>' +
        huPill(rec) + huRawNote(rec) + '</div>' +
      '<div class="hu-meta"><span class="mono">' + esc(huStr(rec.hunt_id)) + '</span> · submitted ' +
        esc(fmtPkt(rec.ts, true) || huStr(rec['Date Added'])) + '</div>' +
      '<div class="hu-lg">' +
        (approved ? '<div class="hu-lr"><span class="k">Account Selected</span>' + huCell(account) + '</div>' : '') +
        (approved ? '<div class="hu-lr"><span class="k">CPC Selling Chance</span>' + huCell(adv) + '</div>' : '') +
        (status ? '<div class="hu-lr"><span class="k">Listing Status</span>' + huCell(status) + '</div>' : '') +
        '<div class="hu-lr"><span class="k">Source Price</span>' + huCellMoney(rec['Source Price']) + '</div>' +
        '<div class="hu-lr"><span class="k">Selling Price</span>' + huCellMoney(rec['E-Bey Caluclator + £4']) + '</div>' +
        '<div class="hu-lr"><span class="k">Our Profit</span>' + huCellMoney(rec['Our Profit']) + '</div>' +
        '<div class="hu-lr"><span class="k">ROI</span>' + huCellRoi(rec['ROI']) + '</div>' +
      '</div>' +
      (comment ? '<div class="hu-box ' + (approved ? 'hu-say' : (st === HU_REVISION ? 'hu-warn' : 'hu-bad')) + '">' +
        '<div class="k">' + (st === HU_REVISION ? 'What more is required' : 'Management comment') + '</div>' +
        '<div class="hu-txt">' + esc(comment) + '</div></div>' : '') +
      (!decided ? huFlags(rec.criteria_flags) : '') +
      (mine ? '<div class="hu-box"><div class="k">Your comment</div><div class="hu-txt">' + esc(mine) + '</div></div>' : '') +
      /* R7-5 (Hasib): "the hunter can revise the information if he think there is something
         wrong, before the approval" — pending and sent-back rows carry the button. */
      (revisable ? '<div class="hu-btns" style="margin-top:10px"><button class="minibtn' +
        (st === HU_REVISION ? ' hu-revbtn' : '') + '" data-hurev="' + huAttr(huStr(rec.hunt_id)) + '">' +
        (st === HU_REVISION ? 'Revise & resubmit' : 'Revise this hunt') + '</button></div>' : '') +
    '</div>';
  }

  // ============================== HUNT APPROVALS ==============================
  VIEWS.huntQueue = {
    label: 'Hunt approvals',
    icon: '<path d="M4 5h16v14H4z"/><path d="M8 10h8M8 14h5"/><path d="m15.5 17.5 1.7 1.7 3.3-3.4"/>',
    roles: HU_QUEUE_ROLES,
    order: 16,
    prefetch: function () { return huFetchQueue(); },
    badge: function () { return (STATE.counts && STATE.counts.huntQueue) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Hunt approvals</h1>' +
          '<span class="sub">Oldest waits longest · nothing is listed until you decide</span>' +
          '<a class="minibtn" href="' + HU_BACKUP_URL + '" target="_blank" rel="noopener" ' +
            'title="Every hunt, mirrored as it happens: pending · approved · not approved" ' +
            'style="margin-left:auto">Backup sheet</a>' +
          '<button class="minibtn" id="huQRefresh" style="margin-left:8px">Refresh</button>' +
        '</div>' +
        /* R6 (Hasib): "dashboard that shows number of products pending for approval, how many got
           rejected in past 7 days, from every individual, and how much are still pending" */
        '<div class="card enter d2"><div class="hd">Hunting pulse — per hunter' +
          '<span class="hint">pending now · decided in the last 7 days</span></div>' +
          '<div class="bd" id="huQStats"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Waiting for a decision ' +
          '<span class="hint">Approve needs an account, a lister, an advertising type and a deadline</span></div>' +
          '<div class="bd" id="huQBody"><div class="spinner"></div></div>' +
        '</div>' +
        /* R7-5 (Hasib): "make the proper approval records" — every decided hunt, its decision,
           its comment and its account, searchable, newest first. */
        '<div class="card enter d3" style="margin-top:14px"><div class="hd">Decision records ' +
          '<span class="hint">every decision with its reason · newest first</span>' +
          '<input class="hu-in" id="huQRecFind" placeholder="Search title · hunter · reason · account" ' +
            'style="width:min(340px,50%);margin-left:auto;padding:7px 11px;font-size:12.5px"></div>' +
          '<div class="bd" id="huQRecords"><div class="spinner"></div></div>' +
        '</div>' +
        '<datalist id="huAccList"></datalist>' +
        '<datalist id="huListerList"></datalist>';
    },
    init: function () {
      huEl('huQRefresh').onclick = function () { huLoadQueue(); huLoadQueueStats(); };
      huEl('huQRecFind').oninput = function () { huPaintRecords(this.value); };
      huLoadPickers();
      huLoadQueue();
      huLoadQueueStats();
    }
  };

  /** The per-hunter pulse: one 'all' fetch, aggregated here — pending now, and the last 7 days'
      approved / rejected per person, newest business first. */
  function huLoadQueueStats() {
    var box = huEl('huQStats');
    if (!box) { return; }
    api('huntQueue', { status: 'all' }).then(function (d) {
      var hunts = (d && d.hunts) || [];
      var week = Date.now() - 7 * 86400000;
      var per = {}, totals = { pending: 0, approved7: 0, rejected7: 0, revision: 0 };
      hunts.forEach(function (rec) {
        var who = huStr(rec.hunter_name) || huStr(rec.hunter_email) || '(unknown)';
        var p = per[who] = per[who] || { pending: 0, approved7: 0, rejected7: 0, revision: 0, oldest: '' };
        var st = huStr(rec.approval_status);
        var ts = Date.parse(huStr(rec.ts) || huStr(rec['Date Added']) || '') || 0;
        if (st === '') {
          p.pending++; totals.pending++;
          if (!p.oldest || (ts && ts < Date.parse(p.oldest))) { p.oldest = huStr(rec.ts); }
        } else if (st === HU_REVISION) {
          /* an in-flight state, not a rejection — counted whole, not 7-day-windowed */
          p.revision++; totals.revision++;
        } else if (ts >= week) {
          if (st === HU_APPROVED) { p.approved7++; totals.approved7++; }
          else { p.rejected7++; totals.rejected7++; }
        }
      });
      HU_RECORDS = hunts.filter(function (r) { return huStr(r.approval_status) !== ''; });
      HU_RECORDS.sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
      huPaintRecords(huEl('huQRecFind') ? huEl('huQRecFind').value : '');
      /* R7 (Hasib): "numbering of today how many products submitted today, yesterday, weekly,
         monthly" — counted from every hunt's own submission stamp, decided or not. */
      var subs = { today: 0, yesterday: 0, week: 0, month: 0 };
      var pkDay = function (ms) { return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }); };
      var todayPk = pkDay(Date.now()), ydayPk = pkDay(Date.now() - 86400000);
      hunts.forEach(function (rec) {
        var ts = Date.parse(huStr(rec.ts) || '') || 0;
        if (!ts) { return; }
        var d = pkDay(ts);
        if (d === todayPk) { subs.today++; }
        if (d === ydayPk) { subs.yesterday++; }
        if (Date.now() - ts < 7 * 86400000) { subs.week++; }
        if (Date.now() - ts < 30 * 86400000) { subs.month++; }
      });
      var names = Object.keys(per).sort(function (a, b) { return per[b].pending - per[a].pending; });
      var h = '<div class="hu-tiles" style="margin-bottom:12px">' +
        '<div class="hu-tile big"><span class="k">Pending review now</span><b class="num goldtext">' + totals.pending + '</b></div>' +
        '<div class="hu-tile"><span class="k">In revision now</span><b class="num" style="color:var(--warn)">' + totals.revision + '</b></div>' +
        '<div class="hu-tile"><span class="k">Approved · 7 days</span><b class="num" style="color:var(--ok)">' + totals.approved7 + '</b></div>' +
        '<div class="hu-tile"><span class="k">Rejected · 7 days</span><b class="num" style="color:var(--bad)">' + totals.rejected7 + '</b></div>' +
        '<div class="hu-tile"><span class="k">Submitted today</span><b class="num">' + subs.today + '</b></div>' +
        '<div class="hu-tile"><span class="k">Yesterday</span><b class="num">' + subs.yesterday + '</b></div>' +
        '<div class="hu-tile"><span class="k">This week</span><b class="num">' + subs.week + '</b></div>' +
        '<div class="hu-tile"><span class="k">This month</span><b class="num">' + subs.month + '</b></div>' +
        '</div>';
      if (!names.length) {
        h += '<div class="hu-hint" style="margin-top:0">No hunts on record yet.</div>';
      } else {
        h += '<div class="scroll"><table class="ir-tbl" style="min-width:620px"><thead><tr>' +
          '<th style="text-align:left">Hunter</th><th>Pending now</th><th>In revision</th><th>Approved · 7d</th><th>Rejected · 7d</th><th style="text-align:left">Waiting longest since</th></tr></thead><tbody>' +
          names.map(function (n) {
            var p = per[n];
            return '<tr><td style="text-align:left">' + esc(n) + '</td>' +
              '<td class="num">' + (p.pending ? '<b style="color:var(--gold-a)">' + p.pending + '</b>' : '0') + '</td>' +
              '<td class="num"' + (p.revision ? ' style="color:var(--warn);font-weight:800"' : '') + '>' + p.revision + '</td>' +
              '<td class="num" style="color:var(--ok)">' + p.approved7 + '</td>' +
              '<td class="num"' + (p.rejected7 ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + p.rejected7 + '</td>' +
              '<td style="text-align:left;font-size:11.5px;color:var(--text-3)">' + (p.oldest ? esc(fmtPkt(p.oldest, true) || p.oldest) : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">The pulse could not load: ' + esc(e.message) + '</div>';
      var rb = huEl('huQRecords');
      if (rb) { rb.innerHTML = '<div class="hu-hint" style="margin-top:0">Records ride the same fetch — press Refresh to retry.</div>'; }
    });
  }

  /* R7-5: the decision records — every decided row from the same 'all' fetch the pulse uses. */
  var HU_RECORDS = [];

  function huPaintRecords(query) {
    var box = huEl('huQRecords');
    if (!box) { return; }
    var q = huStr(query).toLowerCase();
    var rows = HU_RECORDS.filter(function (r) {
      if (!q) { return true; }
      return (huStr(r['Title']) + ' ' + huStr(r.hunter_name) + ' ' + huStr(r.hunter_email) + ' ' +
        huStr(r['Comments']) + ' ' + huStr(r['Account Selected']) + ' ' + huStr(r.hunt_id))
        .toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">' +
        (q ? 'No decision matches that search.' : 'No hunt has been decided yet.') + '</div>';
      return;
    }
    var cap = 250, shown = rows.slice(0, cap);
    box.innerHTML = '<div class="scroll"><table class="ir-tbl" style="min-width:760px"><thead><tr>' +
      '<th style="text-align:left">Decision</th><th style="text-align:left">Product</th>' +
      '<th style="text-align:left">Hunter</th><th style="text-align:left">Account</th>' +
      '<th style="text-align:left">Reason / comment</th><th style="text-align:left">Submitted</th></tr></thead><tbody>' +
      shown.map(function (r) {
        var c = huStr(r['Comments']);
        return '<tr><td style="text-align:left;white-space:nowrap">' + huPill(r) + '</td>' +
          '<td style="text-align:left;max-width:230px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' +
            huAttr(huStr(r['Title'])) + '">' + esc(huStr(r['Title']) || huStr(r.hunt_id)) + '</div>' +
            '<span class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(huStr(r.hunt_id)) + '</span></td>' +
          '<td style="text-align:left">' + esc(huStr(r.hunter_name) || huStr(r.hunter_email)) + '</td>' +
          '<td style="text-align:left">' + esc(huStr(r['Account Selected']) || '—') + '</td>' +
          '<td style="text-align:left;max-width:280px;font-size:12px" title="' + huAttr(c) + '">' +
            esc(c ? (c.length > 140 ? c.slice(0, 140) + '…' : c) : '—') + '</td>' +
          '<td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' +
            esc(fmtPkt(r.ts, true) || huStr(r['Date Added']) || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (rows.length > cap ? '<div class="hu-hint">Showing the newest ' + cap + ' of ' + rows.length + ' — search to narrow.</div>' : '');
  }

  /** One fetch used by the screen, the sign-in warm-up and the badge alike, so the queue is
      already in hand when the screen opens. Painting a cached queue is safe on a DECISION screen
      only because every decision is re-validated by the server against the current row — acting
      on a card that has since been decided returns a readable error, never a second write — and
      the fresh answer replaces the cards within a few seconds anyway. */
  function huFetchQueue() {
    return api('huntQueue').then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('huntQueue', {}, d); }
      return d;
    });
  }

  /* Owner 26 Aug: hunt approvals split by item type. Two trays — Seasonal and Consistent — plus
     an All view, driven by the 'Seasonal' value the hunter chose at submit. The tab is remembered
     across refreshes so a reviewer working the Consistent tray is not thrown back to All every
     20 seconds. Anything with no type yet (older rows) shows under 'Unsorted' so it is never lost. */
  var HU_QK = 'all';
  function huKindOf(rec) {
    var v = huStr(rec['Seasonal']).toLowerCase();
    if (v.indexOf('season') >= 0) { return 'Seasonal'; }
    if (v.indexOf('consist') >= 0) { return 'Consistent'; }
    return 'Unsorted';
  }
  function huPaintQueue(box, d) {
    var all = (d && d.hunts) || [];
    var types = (d && d.advertising_types && d.advertising_types.length) ? d.advertising_types : HU_ADV_TYPES;
    var can = !!(d && d.can_decide);
    huCount('huntQueue', all.length);

    var counts = { all: all.length, Seasonal: 0, Consistent: 0, Unsorted: 0 };
    all.forEach(function (r) { counts[huKindOf(r)]++; });
    var tabDefs = [['all', 'All']];
    (d && d.hunt_kinds && d.hunt_kinds.length ? d.hunt_kinds : ['Seasonal', 'Consistent']).forEach(function (k) { tabDefs.push([k, k + ' items']); });
    if (counts.Unsorted) { tabDefs.push(['Unsorted', 'Unsorted']); }
    if (['all', 'Seasonal', 'Consistent', 'Unsorted'].indexOf(HU_QK) < 0) { HU_QK = 'all'; }

    var tabs = '<div class="hu-qtabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      tabDefs.map(function (t) {
        var n = counts[t[0]] || 0;
        return '<button class="hu-qtab' + (HU_QK === t[0] ? ' on' : '') + '" data-qk="' + huAttr(t[0]) + '"' +
          ' style="padding:7px 13px;border-radius:9px;border:1px solid var(--gold-line' + (HU_QK === t[0] ? '-hi' : '') +
          ');background:var(--panel' + (HU_QK === t[0] ? '-2' : '') + ');color:var(--text);font:inherit;font-weight:800;font-size:12.5px;cursor:pointer">' +
          esc(t[1]) + ' <b style="color:var(--gold-a)">' + n + '</b></button>';
      }).join('') + '</div>';

    var hunts = HU_QK === 'all' ? all : all.filter(function (r) { return huKindOf(r) === HU_QK; });

    var body;
    if (!all.length) {
      body = '<div class="hu-empty">No hunt is waiting on a decision.<span>The hunters are clear — new submissions land here straight away.</span></div>';
    } else if (!hunts.length) {
      body = '<div class="hu-hint" style="margin-top:0">Nothing in the ' + esc(HU_QK === 'all' ? 'queue' : HU_QK + ' tray') + ' right now.</div>';
    } else {
      body = (can ? '' : '<div class="hu-hint" style="margin-top:0;margin-bottom:12px">' +
          'View only — hunted products are approved by Management and the Front Head of Operations.</div>') +
        hunts.map(function (rec) { return huQueueCard(rec, types, can); }).join('');
    }
    box.innerHTML = (all.length ? tabs : '') + body;
    box.querySelectorAll('[data-qk]').forEach(function (b) {
      b.onclick = function () { HU_QK = this.getAttribute('data-qk'); huPaintQueue(box, d); };
    });
    if (can && hunts.length) { huWireQueue(box); }
  }

  function huLoadQueue() {
    var box = huEl('huQBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('huntQueue', {}) : null;
    if (had) { try { huPaintQueue(box, had); } catch (e) { had = null; } }
    huFetchQueue().then(function (d) {
      huPaintQueue(box, d);
    }).catch(function (e) {
      if (had) { toast('Showing the last queue — could not refresh just now.'); return; }
      box.innerHTML = '<div class="hu-empty">The queue could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="huQRetry" style="margin-top:10px">Try again</button></div>';
      var r = huEl('huQRetry'); if (r) { r.onclick = huLoadQueue; }
    });
  }

  function huQueueCard(rec, types, can) {
    var id = huStr(rec.hunt_id);
    var desc = huStr(rec['DESCRIPTION']);
    var note = huStr(rec['Comment']);
    var cat = huStr(rec['Category']);
    var seasonal = huStr(rec['Seasonal']);
    var adv = huStr(rec['CPC Selling Chance']);
    /* Our Profit / ROI are absent from this payload for any role the server strips (RL-4), so both
       rows render only when the fields actually arrived. */
    var hasProfit = Object.prototype.hasOwnProperty.call(rec, 'Our Profit');

    return '<div class="hu-item">' +
      '<div class="hu-h"><span class="hu-t">' + esc(huStr(rec['Title']) || id) + '</span>' +
        '<span class="pill hu-wait">Awaiting review</span></div>' +
      '<div class="hu-meta"><span class="mono">' + esc(id) + '</span> · ' +
        esc(huStr(rec.hunter_name) || huStr(rec.hunter_email)) + ' · submitted ' +
        esc(fmtPkt(rec.ts, true) || huStr(rec['Date Added'])) + '</div>' +

      huFlags(rec.criteria_flags) +

      '<div class="hu-box"><div class="k">Evidence</div><div class="hu-lg">' +
        HU_EVIDENCE.map(function (c) {
          return '<div class="hu-lr"><span class="k">' + esc(c) + '</span>' + huLinkOrText(rec[c]) + '</div>';
        }).join('') +
      '</div></div>' +

      '<div class="hu-lg">' +
        HU_NUMBERS.map(function (c) {
          var v = (c === 'Source Price' || c === 'E-Bey Caluclator + £4') ? huCellMoney(rec[c]) : huCell(rec[c]);
          return '<div class="hu-lr"><span class="k">' + esc(c) + '</span>' + v + '</div>';
        }).join('') +
        (hasProfit ? '<div class="hu-lr"><span class="k">Our Profit</span>' + huCellMoney(rec['Our Profit']) + '</div>' +
          '<div class="hu-lr"><span class="k">ROI</span>' + huCellRoi(rec['ROI']) + '</div>' : '') +
        (seasonal ? '<div class="hu-lr"><span class="k">Seasonal</span>' + huCell(seasonal) + '</div>' : '') +
        (adv ? '<div class="hu-lr"><span class="k">CPC Selling Chance</span>' + huCell(adv) + '</div>' : '') +
      '</div>' +

      (cat ? '<div class="hu-box"><div class="k">Category</div><div class="hu-txt">' + esc(cat) + '</div></div>' : '') +
      (desc ? '<div class="hu-box"><div class="k">DESCRIPTION</div><div class="hu-txt">' + esc(desc) + '</div></div>' : '') +
      (note ? '<div class="hu-box"><div class="k">Hunter\'s comment</div><div class="hu-txt">' + esc(note) + '</div></div>' : '') +

      (can ? huDecisionPanel(id, types, adv) : '') +
    '</div>';
  }

  function huDecisionPanel(id, types, adv) {
    return '<div class="hu-dec">' +
      '<div class="hu-grid">' +
        '<div class="field"><label>Account Selected</label>' +
          '<input class="hu-in" list="huAccList" autocomplete="off" data-acc="' + huAttr(id) + '">' +
          '<div class="hu-hint">The account this item is listed on.</div></div>' +
        '<div class="field"><label>Lister</label>' +
          '<input class="hu-in" type="email" list="huListerList" autocomplete="off" data-lister="' + huAttr(id) + '">' +
          '<div class="hu-hint">The listing_new task goes to this person.</div></div>' +
        '<div class="field"><label>CPC Selling Chance</label>' +
          '<select class="hu-sel" data-adv="' + huAttr(id) + '"><option value=""></option>' +
            types.map(function (t) {
              return '<option value="' + huAttr(t) + '"' + (t === adv ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select>' +
          '<div class="hu-hint">The advertising type this item runs on.</div></div>' +
        '<div class="field"><label>Deadline (PKT)</label>' +
          /* R6 (Hasib): "auto selected date … current day 11:59pm deadline" — prefilled, still editable */
          '<input class="hu-in" type="datetime-local" data-due="' + huAttr(id) + '" value="' + huTodayEndPkt() + '">' +
          '<div class="hu-hint">' + huClockLine() + ' · prefilled: today 11:59 PM</div></div>' +
        '<div class="field hu-wide"><label>Comment <span class="hu-req">required to reject or send back</span></label>' +
          /* R7-5: the chips below write straight into this box — tap to add, tap again to remove;
             anything typed by hand stays untouched. */
          '<div class="hu-chipk">Not approving? Tap the reasons</div>' +
          '<div class="hu-chips">' + HU_REJECT_REASONS.map(function (r) {
            return '<span class="hu-chip" data-rsn="' + huAttr(r) + '" data-for="' + huAttr(id) + '">' + esc(r) + '</span>';
          }).join('') + '</div>' +
          '<div class="hu-chipk">Sending back for revision? Tap what more is required</div>' +
          '<div class="hu-chips">' + HU_REVISE_NEEDS.map(function (r) {
            return '<span class="hu-chip" data-rsn="' + huAttr(r) + '" data-for="' + huAttr(id) + '">' + esc(r) + '</span>';
          }).join('') + '</div>' +
          '<textarea class="hu-ta" data-cmt="' + huAttr(id) + '" style="margin-top:8px" placeholder="Why this item is not approved, what more is required, or anything the lister should know"></textarea></div>' +
      '</div>' +
      '<div class="hu-btns"><button class="btn-gold" data-hd="approve" data-id="' + huAttr(id) + '">Approve</button>' +
        '<button class="minibtn hu-revbtn" data-hd="revise" data-id="' + huAttr(id) + '">Send for revision</button>' +
        '<button class="minibtn" data-hd="reject" data-id="' + huAttr(id) + '">Not approved</button></div>' +
    '</div>';
  }

  function huWireQueue(box) {
    var btns = box.querySelectorAll('button[data-hd]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { huDecide(box, b.getAttribute('data-hd'), b.getAttribute('data-id'), b); };
      })(btns[i]);
    }
    var chips = box.querySelectorAll('.hu-chip[data-rsn]');
    for (i = 0; i < chips.length; i++) {
      (function (c) { c.onclick = function () { huChipToggle(box, c); }; })(chips[i]);
    }
  }

  /** A chip toggles its phrase in the card's comment box — '; '-joined, hand-typed text kept. */
  function huChipToggle(box, chip) {
    var cmt = huPick(box, 'data-cmt', chip.getAttribute('data-for'));
    if (!cmt) { return; }
    var phrase = chip.getAttribute('data-rsn') || '';
    var parts = huStr(cmt.value) ? cmt.value.split(/;\s*/).map(huStr).filter(Boolean) : [];
    var at = parts.indexOf(phrase);
    if (at >= 0) { parts.splice(at, 1); chip.classList.remove('on'); }
    else { parts.push(phrase); chip.classList.add('on'); }
    cmt.value = parts.join('; ');
  }

  function huDecide(box, act, id, btn) {
    var cmt = huPick(box, 'data-cmt', id);
    var comment = cmt ? huStr(cmt.value) : '';
    var payload = { hunt_id: id, comment: comment }, el;

    /* R7-5: the revision road — the hunt leaves this queue and lands back with the hunter,
       carrying exactly what is missing. Same optimistic shape as the other two decisions. */
    if (act === 'revise') {
      if (!comment) { toast('Say what more is required — tap the chips or type it.'); if (cmt) { cmt.focus(); } return; }
      payload.decision = HU_REVISION;
      huCardGone(box, id, 'Sent back for revision ✓');
      api('decideHunt', payload).then(function () {
        huCount('huntQueue', Math.max(0, ((STATE.counts && STATE.counts.huntQueue) || 1) - 1));
        huLoadQueueStats();
      }).catch(function (e) { huCardBack(box, id); toast('Not sent back — ' + e.message); });
      return;
    }

    if (act === 'reject') {
      if (!comment) { toast('A comment is mandatory when a hunt is not approved.'); if (cmt) { cmt.focus(); } return; }
      payload.decision = HU_NOT_APPROVED;
      /* R7-1 (Hasib: "it feels like portal is sleeping… I need it on a micro second"):
         OPTIMISTIC — the card leaves the screen the moment the click lands; the server call
         runs behind it. A refusal brings the card back with the reason, nothing is lost. */
      huCardGone(box, id, 'Not approved ✓');
      api('decideHunt', payload).then(function () {
        huCount('huntQueue', Math.max(0, ((STATE.counts && STATE.counts.huntQueue) || 1) - 1));
        huLoadQueueStats();
      }).catch(function (e) { huCardBack(box, id); toast('Not recorded — ' + e.message); });
      return;
    }

    payload.decision = HU_APPROVED;
    el = huPick(box, 'data-acc', id);
    payload.account = el ? huStr(el.value) : '';
    if (!payload.account) { toast('Choose the account this item is listed on.'); if (el) { el.focus(); } return; }
    el = huPick(box, 'data-lister', id);
    payload.lister_email = el ? huStr(el.value) : '';
    if (!payload.lister_email) { toast('Choose the lister who will list it.'); if (el) { el.focus(); } return; }
    el = huPick(box, 'data-adv', id);
    payload.advertising_type = el ? huStr(el.value) : '';
    if (!payload.advertising_type) { toast('Choose the advertising type.'); if (el) { el.focus(); } return; }
    el = huPick(box, 'data-due', id);
    payload.deadline_pkt = el ? huStr(el.value) : '';
    if (!payload.deadline_pkt) { toast('Set the listing deadline (Pakistan time).'); if (el) { el.focus(); } return; }

    /* R7-1: optimistic approve — instant. The card collapses NOW; the task creation and sheet
       copy happen behind it, and the toast upgrades itself when the server answers. */
    huCardGone(box, id, 'Approved ✓ — assigning…');
    api('decideHunt', payload).then(function (res) {
      toast('Approved · task ' + huStr(res.task_id) + ' for ' + huStr(res.assigned_to) +
        ((res.central_copy && res.central_copy.ok === false) ? ' · the sheet copy is still pending' : ''));
      huCount('huntQueue', Math.max(0, ((STATE.counts && STATE.counts.huntQueue) || 1) - 1));
      huLoadQueueStats();
    }).catch(function (e) { huCardBack(box, id); toast('NOT approved — ' + e.message); });
  }

  /** The optimistic pair: collapse a decided card instantly; resurrect it if the server says no. */
  function huCardGone(box, id, note) {
    var b = box.querySelector('button[data-hd][data-id="' + String(id).replace(/"/g, '') + '"]');
    var card = b ? b.closest('.hu-item') : null;
    if (!card) { return; }
    card.dataset.huGone = '1';
    card.style.transition = 'opacity .25s, max-height .3s .1s, margin .3s .1s, padding .3s .1s';
    card.style.overflow = 'hidden';
    card.style.maxHeight = card.offsetHeight + 'px';
    requestAnimationFrame(function () {
      card.style.opacity = '0.25';
      card.style.maxHeight = '0px';
      card.style.marginBottom = '0px';
      card.style.paddingTop = '0px';
      card.style.paddingBottom = '0px';
    });
    toast(note);
  }
  function huCardBack(box, id) {
    var b = box.querySelector('button[data-hd][data-id="' + String(id).replace(/"/g, '') + '"]');
    var card = b ? b.closest('.hu-item') : null;
    if (!card) { huLoadQueue(); return; }                 // repainted meanwhile — refetch instead
    card.style.opacity = ''; card.style.maxHeight = ''; card.style.marginBottom = '';
    card.style.paddingTop = ''; card.style.paddingBottom = ''; delete card.dataset.huGone;
  }

})();
