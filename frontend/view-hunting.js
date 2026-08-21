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
      { col: 'Seasonal', hint: 'A seasonal tag is enough on its own to enter the Seasonal campaign tier.' },
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
    '.hu-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.55}' +
    '.hu-link{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.hu-lg{display:grid;gap:10px 16px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:6px}' +
    '.hu-lr{font-size:12.5px;font-weight:600;min-width:0}' +
    '.hu-lr .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-bottom:3px}' +
    '.hu-none{color:var(--text-3);font-weight:600}' +
    '.pill.hu-ok{background:linear-gradient(135deg,rgba(233,169,60,.20),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.hu-no{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.hu-wait{background:var(--warn-soft);color:var(--warn)}' +
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
          '<div class="bd">' + HU_SECTIONS.map(huSection).join('') +
            '<div class="hu-btns"><button class="btn-gold" id="huSend">Submit hunt</button>' +
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
    huEl('huClear').onclick = function () { huResetForm(); huCalcIdle('Cleared. The projection follows your next price.'); };
    huEl('huSend').onclick = huSubmit;
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
    for (i = 0; i < HU_FLAT.length; i++) {
      col = HU_FLAT[i].col;
      v = huValue(col);
      if (v) { payload.columns[col] = v; }
    }
    ship = huStr(huEl('huShip') ? huEl('huShip').value : '');
    if (ship) { payload.shipping = ship; }

    btn.disabled = true;
    api('submitHunt', payload).then(function (res) {
      btn.disabled = false;
      huResetForm();
      /* the shell's draft keeper would refill the emptied form on the next render otherwise */
      if (typeof draftClear === 'function') { draftClear('hunting'); }
      huCalcIdle('Submitted. The projection follows your next hunt.');
      toast('Hunt submitted · ' + huStr(res.hunt_id) +
        ((res.criteria_flags && res.criteria_flags.length) ? ' · ' + res.criteria_flags.length + ' criteria flag(s)' : ''));
      huLoadMine();
    }).catch(function (e) { btn.disabled = false; toast('Not submitted: ' + e.message); });
  }

  // ---------- my hunts ----------
  function huLoadMine() {
    var box = huEl('huMineBody'), filter = huEl('huFilter');
    if (!box) { return; }
    var hc = cachedCall('myHunts', { status: filter ? filter.value : 'all' }, function (d) {
      var hunts = (d && d.hunts) || [];
      if (!hunts.length) {
        box.innerHTML = '<div class="hu-empty">Nothing here yet.<span>Every hunt you submit stays on this list with its decision and any comment.</span></div>';
        return;
      }
      box.innerHTML = hunts.map(huMineItem).join('');
    });
    if (!hc.painted) { box.innerHTML = '<div class="spinner"></div>'; }
    hc.done.catch(function (e) {
      box.innerHTML = '<div class="hu-empty">Your hunts could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="huMineRetry" style="margin-top:10px">Try again</button></div>';
      var r = huEl('huMineRetry'); if (r) { r.onclick = huLoadMine; }
    });
  }

  function huMineItem(rec) {
    var approved = huStr(rec.approval_status) === HU_APPROVED;
    var decided = huStr(rec.approval_status) !== '';
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
      (comment ? '<div class="hu-box ' + (approved ? 'hu-say' : 'hu-bad') + '"><div class="k">Management comment</div>' +
        '<div class="hu-txt">' + esc(comment) + '</div></div>' : '') +
      (!decided ? huFlags(rec.criteria_flags) : '') +
      (mine ? '<div class="hu-box"><div class="k">Your comment</div><div class="hu-txt">' + esc(mine) + '</div></div>' : '') +
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
          '<button class="minibtn" id="huQRefresh" style="margin-left:auto">Refresh</button>' +
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
        '<datalist id="huAccList"></datalist>' +
        '<datalist id="huListerList"></datalist>';
    },
    init: function () {
      huEl('huQRefresh').onclick = function () { huLoadQueue(); huLoadQueueStats(); };
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
      var per = {}, totals = { pending: 0, approved7: 0, rejected7: 0 };
      hunts.forEach(function (rec) {
        var who = huStr(rec.hunter_name) || huStr(rec.hunter_email) || '(unknown)';
        var p = per[who] = per[who] || { pending: 0, approved7: 0, rejected7: 0, oldest: '' };
        var st = huStr(rec.approval_status);
        var ts = Date.parse(huStr(rec.ts) || huStr(rec['Date Added']) || '') || 0;
        if (st === '') {
          p.pending++; totals.pending++;
          if (!p.oldest || (ts && ts < Date.parse(p.oldest))) { p.oldest = huStr(rec.ts); }
        } else if (ts >= week) {
          if (st === HU_APPROVED) { p.approved7++; totals.approved7++; }
          else { p.rejected7++; totals.rejected7++; }
        }
      });
      var names = Object.keys(per).sort(function (a, b) { return per[b].pending - per[a].pending; });
      var h = '<div class="hu-tiles" style="margin-bottom:12px">' +
        '<div class="hu-tile big"><span class="k">Pending review now</span><b class="num goldtext">' + totals.pending + '</b></div>' +
        '<div class="hu-tile"><span class="k">Approved · 7 days</span><b class="num" style="color:var(--ok)">' + totals.approved7 + '</b></div>' +
        '<div class="hu-tile"><span class="k">Rejected · 7 days</span><b class="num" style="color:var(--bad)">' + totals.rejected7 + '</b></div>' +
        '</div>';
      if (!names.length) {
        h += '<div class="hu-hint" style="margin-top:0">No hunts on record yet.</div>';
      } else {
        h += '<div class="scroll"><table class="ir-tbl" style="min-width:560px"><thead><tr>' +
          '<th style="text-align:left">Hunter</th><th>Pending now</th><th>Approved · 7d</th><th>Rejected · 7d</th><th style="text-align:left">Waiting longest since</th></tr></thead><tbody>' +
          names.map(function (n) {
            var p = per[n];
            return '<tr><td style="text-align:left">' + esc(n) + '</td>' +
              '<td class="num">' + (p.pending ? '<b style="color:var(--gold-a)">' + p.pending + '</b>' : '0') + '</td>' +
              '<td class="num" style="color:var(--ok)">' + p.approved7 + '</td>' +
              '<td class="num"' + (p.rejected7 ? ' style="color:var(--bad);font-weight:800"' : '') + '>' + p.rejected7 + '</td>' +
              '<td style="text-align:left;font-size:11.5px;color:var(--text-3)">' + (p.oldest ? esc(fmtPkt(p.oldest, true) || p.oldest) : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">The pulse could not load: ' + esc(e.message) + '</div>';
    });
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

  function huPaintQueue(box, d) {
    var hunts = (d && d.hunts) || [];
    var types = (d && d.advertising_types && d.advertising_types.length) ? d.advertising_types : HU_ADV_TYPES;
    var can = !!(d && d.can_decide);
    huCount('huntQueue', hunts.length);
    if (!hunts.length) {
      box.innerHTML = '<div class="hu-empty">No hunt is waiting on a decision.<span>The hunters are clear — new submissions land here straight away.</span></div>';
      return;
    }
    box.innerHTML = (can ? '' : '<div class="hu-hint" style="margin-top:0;margin-bottom:12px">' +
        'View only — hunted products are approved by Management and the Front Head of Operations.</div>') +
      hunts.map(function (rec) { return huQueueCard(rec, types, can); }).join('');
    if (can) { huWireQueue(box); }
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
        '<div class="field hu-wide"><label>Comment <span class="hu-req">required to reject</span></label>' +
          '<textarea class="hu-ta" data-cmt="' + huAttr(id) + '" placeholder="Why this item is not approved, or anything the lister should know"></textarea></div>' +
      '</div>' +
      '<div class="hu-btns"><button class="btn-gold" data-hd="approve" data-id="' + huAttr(id) + '">Approve</button>' +
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
  }

  function huDecide(box, act, id, btn) {
    var cmt = huPick(box, 'data-cmt', id);
    var comment = cmt ? huStr(cmt.value) : '';
    var payload = { hunt_id: id, comment: comment }, el;

    if (act === 'reject') {
      if (!comment) { toast('A comment is mandatory when a hunt is not approved.'); if (cmt) { cmt.focus(); } return; }
      payload.decision = HU_NOT_APPROVED;
      btn.disabled = true;
      api('decideHunt', payload).then(function () {
        toast('Recorded as NOT APPROVED — the hunter has your comment.');
        huLoadQueue();
      }).catch(function (e) { btn.disabled = false; toast('Not recorded: ' + e.message); });
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

    btn.disabled = true;
    api('decideHunt', payload).then(function (res) {
      toast('Approved · task ' + huStr(res.task_id) + ' for ' + huStr(res.assigned_to) +
        ((res.central_copy && res.central_copy.ok === false) ? ' · the sheet copy is still pending' : ''));
      huLoadQueue();
    }).catch(function (e) { btn.disabled = false; toast('Not approved: ' + e.message); });
  }

})();
