/* view-potential-cpc.js — §9 POTENTIAL CPC LISTINGS (Advertising nominates → Management decides).
 * View: potentialCpc.
 * Backend: myPotentialCpc · submitPotentialCpc · potentialCpcQueue · decidePotentialCpc · switchPotentialCpcCampaign. */
(function () {

  /* Backend vocabulary — PotentialCpc.gs spells these exactly this way; a mismatch is a rejected
     write, not a cosmetic difference. */
  var PC_SUBMITTED = 'Submitted';
  var PC_APPROVED = 'Approved';
  var PC_REJECTED = 'Rejected';
  var PC_STATUSES = [PC_SUBMITTED, PC_APPROVED, PC_REJECTED];
  var PC_TASK_DONE = 'Completed';                 // §8.0b: only an approval reaches Completed
  var PC_CAMPAIGN_CPC = 'Campaign CPC';           // the Main Sheet dropdown's own wording

  var PC_SUBMIT_ROLES = ['Advertising Manager', 'Management', 'Ops Head'];
  var PC_REVIEW_ROLES = ['Management', 'Ops Head', 'Team Lead'];   // §4.3 — Team Lead views, does not decide
  var PC_VIEW_ROLES = ['Advertising Manager', 'Management', 'Ops Head', 'Team Lead'];

  /* 'Reason for Selection' data validation, D2:D258 on every tab of the live workbook — the
     sheet's own spelling, its trailing spaces and its 'Previosuly' typo included. The fifth
     option exists ONLY on the 'Sir Hasib ' tab, so it is offered only for that account. */
  var PC_REASONS = [
    'Sold More than 25 units ',
    'Potential Listing with good images',
    'Previosuly good Sales History',
    'New Listings But Not Working '
  ];
  var PC_REASON_HASIB_ONLY = 'Better SEO Can Increase Sales ';
  var PC_HASIB_ACCOUNT = 'Sir Hasib ';

  /* REALITY: the workbook's headers read '... graph Link', not the spec's '(link)'; the values
     are raw Terapeak research URLs. The labels below follow the sheet. */
  var PC_L30 = 'Last 30 days sold and avg price graph Link';
  var PC_L90 = 'Last 90 days sold and avg price graph Link';

  /* §8.0 step 3 — the campaign testing window is a UK clock time (5:00–10:00 PM), shown to the
     team in PKT. */
  var PC_TEST_FROM = 17, PC_TEST_TO = 22;
  var PC_UK = 'Europe/London';

  var PC_QUEUE_LIMIT = 200;                       // the backend's own ceiling
  var PC = { accounts: [], reasons: PC_REASONS.slice(), queue: [], mine: [] };

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.pc-bar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:13px}' +
    '.pc-in,.pc-sel,.pc-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.pc-ta{resize:vertical;min-height:64px}' +
    '.pc-bar .pc-sel{width:auto;max-width:100%;padding:8px 11px;font-size:12.5px;font-weight:700}' +
    '.pc-in:focus,.pc-sel:focus,.pc-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.pc-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.pc-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:13px}' +
    '.pc-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:780px}' +
    '.pc-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 14px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.pc-tbl td{padding:12px 14px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.pc-tbl tbody tr{transition:background .12s}' +
    '.pc-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.pc-tbl tr.pc-x:hover{background:none}' +
    '.pc-tbl tr.pc-x>td{padding-top:0;border-bottom:1px solid var(--gold-line)}' +
    '.pill.pc-p-sub{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.pc-p-ok{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.pc-p-no{background:var(--bad-soft);color:var(--bad)}' +
    '.pill.pc-p-live{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.pc-wait{background:rgba(120,132,152,.16);color:var(--text-2)}' +
    '.pill.pc-wait.pc-w{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.pc-wait.pc-b{background:var(--bad-soft);color:var(--bad)}' +
    '.pc-card{padding:16px 0}.pc-card+.pc-card{border-top:1px solid var(--gold-line)}' +
    '.pc-h{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}' +
    '.pc-id{font-weight:800;font-size:14.5px;letter-spacing:.02em}' +
    '.pc-box{margin-top:11px;padding:12px 13px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.10)}' +
    '.pc-k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:6px}' +
    '.pc-k span{float:right;text-transform:none;letter-spacing:.02em;color:var(--text-3);font-weight:600}' +
    '.pc-gold{background:linear-gradient(135deg,rgba(233,169,60,.14),rgba(233,169,60,.03));border:1px solid var(--gold-line-hi)}' +
    '.pc-gold .pc-k{color:var(--gold-a)}' +
    '.pc-blue{background:var(--blue-soft);border:1px solid rgba(61,155,240,.30)}' +
    '.pc-blue .pc-k{color:var(--blue-2)}' +
    '.pc-warn{background:var(--warn-soft);border:1px solid rgba(255,159,67,.40)}.pc-warn .pc-k{color:var(--warn)}' +
    '.pc-bad{background:var(--bad-soft);border:1px solid rgba(240,96,90,.45)}.pc-bad .pc-k{color:var(--bad)}' +
    '.pc-txt{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12.5px;line-height:1.55}' +
    '.pc-a{color:var(--blue-2);font-weight:700;overflow-wrap:anywhere}' +
    '.pc-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.pc-links .minibtn{display:inline-block;text-decoration:none}' +
    '.pc-dim{color:var(--text-3);font-weight:700}' +
    '.pc-sub2{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.pc-profit{color:var(--gold-a);font-weight:800}' +
    '.pc-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.pc-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.pc-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.pc-steps{margin:0;padding-left:17px;font-size:12.5px;line-height:1.7;font-weight:600;color:var(--text-2)}' +
    '@media (max-width:880px){' +
      '.pc-grid{grid-template-columns:1fr}' +
      '.pc-tbl{min-width:0}.pc-tbl thead{display:none}' +
      '.pc-tbl tr{display:block;padding:6px 0}' +
      '.pc-tbl td{display:block;border-bottom:0;padding:4px 0}' +
      '.pc-tbl tr.pc-r{border-top:1px solid var(--gold-line);padding-top:12px}' +
      '.pc-tbl tr.pc-x>td{border-bottom:0}' +
      '.pc-tbl td[data-k]:before{content:attr(data-k) " ";font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-right:7px}' +
    '}'
  );

  // ---------- safety helpers (RL-3) ----------
  function pcStr(v) { return String(v == null ? '' : v).trim(); }
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function pcAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  /** Sheet text for the DOM: escaped, with http/https URLs (and nothing else) turned into links. */
  function pcText(v) {
    var s = String(v == null ? '' : v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a class="pc-a" href="' + pcAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }

  function pcChip(url, label) {
    var u = safeUrl(url);
    if (!u) { return ''; }
    return '<a class="minibtn pc-a" href="' + pcAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' &#8599;</a>';
  }

  function pcPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) { return els[i]; } }
    return null;
  }
  function pcHas(arr, v) { return arr.indexOf(v) >= 0; }
  function pcRole() { return (STATE.user && STATE.user.role) || ''; }
  function pcMaySubmit() { return pcHas(PC_SUBMIT_ROLES, pcRole()); }
  function pcMayReview() { return pcHas(PC_REVIEW_ROLES, pcRole()); }
  /** potcpcNorm_ in PotentialCpc.gs — tab and account names carry trailing spaces and casing drift. */
  function pcNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  function pcCount(n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts.potentialCpc = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  function pcMins(min) {
    var n = Number(min) || 0, d, h;
    if (n < 60) { return n + 'm'; }
    if (n < 1440) { h = Math.floor(n / 60); return h + 'h ' + (n - h * 60) + 'm'; }
    d = Math.floor(n / 1440); h = Math.round((n - d * 1440) / 60);
    return d + 'd ' + h + 'h';
  }

  /** Money: £ and two decimals when the cell holds a number. 'Our price' really does hold
      '8.87-12.97' on a live row, so text is shown as the text it is, never coerced. */
  function pcMoney(v) {
    var s = pcStr(v);
    if (!s) { return '<span class="pc-dim">—</span>'; }
    if (/^-?\d+(\.\d+)?$/.test(s)) { return '<span class="num">£' + Number(s).toFixed(2) + '</span>'; }
    return '<span class="num">' + esc(s) + '</span>';
  }

  // ---------- §8.0 UK windows → the team's PKT clock ----------
  /** Offset of a named zone at an instant, from the zone's own wall clock. */
  function pcZoneOffset(tz, ms) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var parts = f.formatToParts(new Date(ms)), p = {}, i;
    for (i = 0; i < parts.length; i++) { p[parts[i].type] = parts[i].value; }
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second)) - Math.floor(ms / 1000) * 1000;
  }
  /** A UK wall-clock hour today as an absolute instant — resolved twice so a BST/GMT switch
      inside the window cannot skew it. Stored/compared as ISO, displayed in PKT. */
  function pcUkInstant(hour) {
    var d = new Intl.DateTimeFormat('en-CA', { timeZone: PC_UK, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
    var guess = Date.UTC(Number(d[0]), Number(d[1]) - 1, Number(d[2]), hour, 0, 0);
    var once = guess - pcZoneOffset(PC_UK, guess);
    return guess - pcZoneOffset(PC_UK, once);
  }
  function pcTestWindow() {
    try {
      return fmtPkt(new Date(pcUkInstant(PC_TEST_FROM)).toISOString()) + ' – ' + fmtPkt(new Date(pcUkInstant(PC_TEST_TO)).toISOString()) + ' PKT';
    } catch (e) { return ''; }
  }

  // ---------- record shaping ----------
  function pcPillClass(status) {
    if (status === PC_SUBMITTED) { return 'pc-p-sub'; }
    if (status === PC_APPROVED) { return 'pc-p-ok'; }
    if (status === PC_REJECTED) { return 'pc-p-no'; }
    return '';
  }
  function pcTask(r) { return r && r.research_task ? r.research_task : null; }
  /** myPotentialCpc computes may_switch server-side; the review queue hands back the same three
      facts, so the queue derives it rather than guessing. */
  function pcMaySwitch(r) {
    var t = pcTask(r);
    if (r.may_switch === true) { return true; }
    if (r.may_switch === false) { return false; }
    return pcStr(r.status) === PC_APPROVED && !pcStr(r.campaign_switched_at) && !!t && pcStr(t.status) === PC_TASK_DONE;
  }
  function pcSwitchRoleOk() { return pcHas(['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'], pcRole()); }

  function pcResearchLine(r) {
    var t = pcTask(r), sw = pcStr(r.campaign_switched_at), bits;
    if (sw) {
      return '<span class="pill pc-p-live">' + esc(PC_CAMPAIGN_CPC) + '</span> <span class="pc-sub2">switched ' + esc(fmtPkt(sw, true)) + '</span>';
    }
    if (!t) { return '<span class="pc-sub2">No cpc_research task on this item yet.</span>'; }
    bits = 'cpc_research · ' + pcStr(t.status);
    if (pcStr(t.assigned_to)) { bits += ' · with ' + pcStr(t.assigned_to); }
    if (pcStr(t.deadline_pkt)) { bits += ' · due ' + fmtPkt(t.deadline_pkt, true); }
    return '<span class="pc-sub2">' + esc(bits) + '</span>';
  }

  // ============================== THE VIEW ==============================
  VIEWS.potentialCpc = {
    label: 'Potential CPC',
    icon: '<path d="M3 17l5.5-5.5 3.5 3.5L21 6"/><path d="M15 6h6v6"/>',
    roles: PC_VIEW_ROLES,
    order: 21,
    badge: function () { return (STATE.counts && STATE.counts.potentialCpc) || 0; },
    render: function () {
      var mine = pcMaySubmit(), review = pcMayReview();
      return '<div class="hgroup enter d1"><h1>Potential CPC</h1>' +
          '<span class="sub">Items already live on an account, proven, and put forward for a CPC campaign</span>' +
          (mine ? '<button class="btn-gold" id="pcNewToggle" style="margin-left:auto">Nominate a listing</button>' : '') +
        '</div>' +
        (mine ? pcComposer() : '') +
        (review ? pcQueueCard() : '') +
        (mine ? pcMineCard() : '');
    },
    init: function () {
      if (pcMaySubmit()) { pcWireComposer(); pcWireMineBar(); pcLoadMine(); }
      if (pcMayReview()) { pcWireQueueBar(); pcLoadQueue(); }
    }
  };

  // ============================== NOMINATION FORM (§9, Advertising) ==============================
  function pcComposer() {
    return '<div class="card enter d2 hidden" id="pcNewCard" style="margin-bottom:16px">' +
      '<div class="hd">Nominate a listing for CPC ' +
        '<span class="hint">Management decides — nothing reaches the workbook before they approve</span></div>' +
      '<div class="bd">' +
        '<div class="pc-grid">' +
          '<div class="field"><label>Account</label><div id="pcAccWrap">' +
            '<select class="pc-sel" id="pcAccount"><option value="">Loading accounts…</option></select></div></div>' +
          '<div class="field"><label>Listing Item id</label>' +
            '<input class="pc-in" id="pcItemId" type="text" inputmode="numeric" autocomplete="off" placeholder="eBay item number"></div>' +
          '<div class="field"><label>Item Link</label>' +
            '<input class="pc-in" id="pcItemLink" type="url" autocomplete="off" placeholder="leave blank to use the eBay item link"></div>' +
          '<div class="field"><label>Date Listing Started</label><input class="pc-in" id="pcStarted" type="date"></div>' +
          '<div class="field"><label>Reason for Selection</label><select class="pc-sel" id="pcReason"></select></div>' +
          '<div class="field"><label>Our price</label>' +
            '<input class="pc-in" id="pcOurPrice" type="text" inputmode="decimal" autocomplete="off" placeholder="7.49 — a range like 8.87-12.97 is kept as written"></div>' +
          '<div class="field"><label>Avg Sold Price</label>' +
            '<input class="pc-in" id="pcAvgSold" type="text" inputmode="decimal" autocomplete="off"></div>' +
          '<div class="field"><label>' + esc(PC_L30) + '</label>' +
            '<input class="pc-in" id="pcL30" type="url" autocomplete="off" placeholder="Terapeak research link, 30 days"></div>' +
          '<div class="field"><label>' + esc(PC_L90) + '</label>' +
            '<input class="pc-in" id="pcL90" type="url" autocomplete="off" placeholder="Terapeak research link, 90 days"></div>' +
        '</div>' +
        '<div class="field" style="margin-top:12px"><label>Main Competitor</label>' +
          '<textarea class="pc-ta" id="pcCompetitor" placeholder="One competitor link per line"></textarea></div>' +
        '<div class="field" style="margin-top:12px"><label>Comments</label>' +
          '<textarea class="pc-ta" id="pcComments" placeholder="Why this one is worth the ad spend"></textarea></div>' +
        '<div class="pc-box pc-blue"><div class="pc-k">Where this goes</div>' +
          '<div class="pc-txt">Every field is kept in full in the portal. On approval the record is mirrored into this ' +
          'account&#39;s tab of the Potential CPC workbook — into the columns that tab actually carries, and the ' +
          'decider is told which ones it does not. No column is ever added to the sheet.</div></div>' +
        '<div class="pc-btns"><button class="btn-gold" id="pcNewSend">Submit for Management review</button>' +
          '<button class="minibtn" id="pcNewCancel">Cancel</button>' +
          '<span class="pc-sub2">Status becomes ' + esc(PC_SUBMITTED) + '.</span></div>' +
      '</div></div>';
  }

  /** The fifth 'Reason for Selection' option is on the 'Sir Hasib ' tab only — offering it on any
      other account would be a value that tab's own validation does not carry. */
  function pcFillReasons() {
    var sel = $('pcReason'), acc = $('pcAccount'), list = PC.reasons.slice(), keep;
    if (!sel) { return; }
    keep = sel.value;
    if (acc && pcNorm(acc.value) === pcNorm(PC_HASIB_ACCOUNT) && !pcHas(list, PC_REASON_HASIB_ONLY)) {
      list.push(PC_REASON_HASIB_ONLY);
    }
    sel.innerHTML = '<option value=""></option>' + list.map(function (r) {
      return '<option value="' + pcAttr(r) + '">' + esc(pcStr(r)) + '</option>';
    }).join('');
    if (keep && pcHas(list, keep)) { sel.value = keep; }
  }

  /** Filled once: a later refresh must not wipe an account the nominator has already picked. */
  function pcFillAccounts() {
    var wrap = $('pcAccWrap');
    if (!wrap || PC.accountsFilled) { return; }
    PC.accountsFilled = true;
    if (PC.accounts.length) {
      wrap.innerHTML = '<select class="pc-sel" id="pcAccount"><option value=""></option>' +
        PC.accounts.map(function (a) { return '<option value="' + pcAttr(a) + '">' + esc(pcStr(a)) + '</option>'; }).join('') +
        '</select>';
    } else {
      // §6: a portal whose registry has not been imported yet still works — the backend validates.
      wrap.innerHTML = '<input class="pc-in" id="pcAccount" type="text" autocomplete="off" placeholder="account name">';
    }
    $('pcAccount').onchange = pcFillReasons;
    $('pcAccount').oninput = pcFillReasons;
    pcFillReasons();
  }

  function pcWireMineBar() {
    $('pcMineStatus').onchange = pcLoadMine;
    $('pcMineRefresh').onclick = pcLoadMine;
  }

  function pcWireComposer() {
    var card = $('pcNewCard');
    pcFillReasons();
    $('pcNewToggle').onclick = function () {
      card.classList.toggle('hidden');
      if (!card.classList.contains('hidden')) { $('pcItemId').focus(); }
    };
    $('pcNewCancel').onclick = function () { card.classList.add('hidden'); };
    $('pcNewSend').onclick = pcSubmit;
  }

  function pcSubmit() {
    var btn = $('pcNewSend');
    var item = pcStr($('pcItemId').value);
    var payload = {
      account: pcStr($('pcAccount').value),
      listing_item_id: item,
      item_link: pcStr($('pcItemLink').value),
      date_listing_started: pcStr($('pcStarted').value),
      reason_for_selection: $('pcReason').value,
      comments: pcStr($('pcComments').value),
      our_price: pcStr($('pcOurPrice').value),
      avg_sold_price: pcStr($('pcAvgSold').value),
      last30_link: pcStr($('pcL30').value),
      last90_link: pcStr($('pcL90').value),
      main_competitor: pcStr($('pcCompetitor').value)
    };
    if (!payload.account) { toast('Choose the account this listing is live on.'); return; }
    if (!/^\d{9,15}$/.test(item)) { toast('A Listing Item id is 9 to 15 digits.'); $('pcItemId').focus(); return; }
    if (!payload.reason_for_selection) { toast('Pick a Reason for Selection.'); $('pcReason').focus(); return; }
    if (payload.item_link && !safeUrl(payload.item_link)) { toast('Item Link must start with http or https.'); return; }
    if (payload.last30_link && !safeUrl(payload.last30_link)) { toast('The 30-day link must start with http or https.'); return; }
    if (payload.last90_link && !safeUrl(payload.last90_link)) { toast('The 90-day link must start with http or https.'); return; }
    btn.disabled = true;
    api('submitPotentialCpc', payload).then(function (res) {
      btn.disabled = false;
      $('pcNewCard').classList.add('hidden');
      $('pcItemId').value = ''; $('pcItemLink').value = ''; $('pcComments').value = '';
      $('pcOurPrice').value = ''; $('pcAvgSold').value = '';
      $('pcL30').value = ''; $('pcL90').value = ''; $('pcCompetitor').value = '';
      toast('Sent to Management · ' + pcStr(res.row_id));
      pcLoadMine();
    }).catch(function (e) { btn.disabled = false; toast('Not submitted: ' + e.message); });
  }

  // ============================== MY NOMINATIONS (§15 Advertising) ==============================
  function pcMineCard() {
    return '<div class="card enter d3" style="margin-top:16px"><div class="hd">My nominations ' +
        '<span class="hint">newest first · the decision comes back here and as a notification</span></div>' +
      '<div class="bd">' +
        '<div class="pc-bar">' +
          '<select class="pc-sel" id="pcMineStatus">' + pcStatusOptions('') + '</select>' +
          '<button class="minibtn" id="pcMineRefresh">Refresh</button>' +
        '</div>' +
        '<div id="pcMineBody"><div class="spinner"></div></div>' +
      '</div></div>';
  }

  function pcStatusOptions(sel) {
    var all = [['', 'All statuses']];
    PC_STATUSES.forEach(function (s) { all.push([s, s]); });
    return all.map(function (o) {
      return '<option value="' + pcAttr(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }

  function pcLoadMine() {
    var box = $('pcMineBody'), sel = $('pcMineStatus');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('myPotentialCpc', { status: sel ? sel.value : '' }).then(function (d) {
      var rows = (d && d.nominations) || [], ready = 0, i;
      if (d && d.accounts && d.accounts.length) { PC.accounts = d.accounts; }
      if (d && d.reasons && d.reasons.length) { PC.reasons = d.reasons; }
      pcFillAccounts();
      PC.mine = rows;
      for (i = 0; i < rows.length; i++) { if (pcMaySwitch(rows[i])) { ready++; } }
      if (!pcMayReview()) { pcCount(ready); }        // Zain's action-needed number is the CPC switch
      if (!rows.length) {
        box.innerHTML = '<div class="pc-empty">No nominations yet.<span>Pick a proven listing on one of your accounts and put it forward.</span></div>';
        return;
      }
      box.innerHTML = '<div class="scroll"><table class="pc-tbl">' +
        '<thead><tr><th>Item</th><th>Account</th><th>Reason for Selection</th><th>Our price</th><th>Avg Sold Price</th><th>Status</th><th></th></tr></thead>' +
        '<tbody>' + rows.map(pcMineRow).join('') + '</tbody></table></div>';
      pcWireMine(box);
    }).catch(function (e) {
      pcFillAccounts();                       // the form still works — the backend validates the account
      box.innerHTML = '<div class="pc-empty">Your nominations could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="pcMineRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('pcMineRetry'); if (r) { r.onclick = pcLoadMine; }
    });
  }

  function pcMineRow(r) {
    var id = pcStr(r.row_id), status = pcStr(r.status), item = pcStr(r.listing_item_id);
    var note = pcStr(r.last_decision_note);
    var act = '<button class="minibtn" data-act="detail" data-id="' + pcAttr(id) + '">Detail</button>';
    if (pcMaySwitch(r) && pcSwitchRoleOk()) {
      act = '<button class="btn-gold" data-act="switch" data-id="' + pcAttr(id) + '">Switch to CPC</button>' + act;
    }
    return '<tr class="pc-r">' +
        '<td data-k="Item"><span class="mono">' + esc(item) + '</span>' +
          '<div class="pc-sub2">' + esc(fmtPkt(r.ts, true)) + '</div></td>' +
        '<td data-k="Account">' + (pcStr(r.account) ? esc(pcStr(r.account)) : '<span class="pc-dim">—</span>') + '</td>' +
        '<td data-k="Reason">' + esc(pcStr(r.reason_for_selection)) + '</td>' +
        '<td data-k="Our price">' + pcMoney(r.our_price) + '</td>' +
        '<td data-k="Avg Sold Price">' + pcMoney(r.avg_sold_price) + '</td>' +
        '<td data-k="Status"><span class="pill ' + pcPillClass(status) + '">' + esc(status) + '</span></td>' +
        '<td class="pc-act">' + act + '</td>' +
      '</tr>' +
      '<tr class="pc-x"><td colspan="7">' +
        '<div class="hidden" data-detail="' + pcAttr(id) + '">' +
          pcFacts(r) +
          (note ? '<div class="pc-box ' + (status === PC_REJECTED ? 'pc-bad' : 'pc-gold') + '"><div class="pc-k">Management</div>' +
            '<div class="pc-txt">' + pcText(note) + '</div></div>' : '') +
          '<div class="pc-box"><div class="pc-k">Pipeline</div>' + pcResearchLine(r) + '</div>' +
        '</div>' +
        '<div data-res="' + pcAttr(id) + '"></div>' +
      '</td></tr>';
  }

  function pcWireMine(box) {
    var btns = box.querySelectorAll('button[data-act]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-id'), act = b.getAttribute('data-act'), block;
          if (act === 'detail') {
            block = pcPick(box, 'data-detail', id);
            if (block) { block.classList.toggle('hidden'); }
            return;
          }
          pcSwitch(box, id, b);
        };
      })(btns[i]);
    }
  }

  // ============================== THE §9 FACT BLOCK ==============================
  function pcFacts(r) {
    var comp = pcStr(r.main_competitor);
    var chips = pcChip(r.item_link, 'Item') + pcChip(r.last30_link, 'Last 30 days') + pcChip(r.last90_link, 'Last 90 days');
    return '<div class="pc-box"><div class="pc-k">The nomination</div>' +
      '<div class="tl-row"><span class="k">Date Listing Started</span><b>' +
        (pcStr(r.date_listing_started) ? esc(pcStr(r.date_listing_started)) : '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Our price</span>' + pcMoney(r.our_price) + '</div>' +
      '<div class="tl-row"><span class="k">Avg Sold Price</span>' + pcMoney(r.avg_sold_price) + '</div>' +
      '<div class="tl-row"><span class="k">Main Competitor</span><span class="pc-txt">' +
        (comp ? pcText(comp) : '<span class="pc-dim">—</span>') + '</span></div>' +
      (pcStr(r.comments) ? '<div class="tl-row"><span class="k">Comments</span><span class="pc-txt">' + pcText(r.comments) + '</span></div>' : '') +
      (chips ? '<div class="pc-links">' + chips + '</div>' : '<div class="pc-sub2" style="margin-top:6px">No Terapeak links on this row.</div>') +
      '</div>';
  }

  // ============================== REVIEW QUEUE (§9, Management) ==============================
  function pcQueueCard() {
    return '<div class="card enter d2"><div class="hd">Review queue ' +
        '<span class="hint">oldest first · approve creates the research task, reject needs a comment</span></div>' +
      '<div class="bd">' +
        '<div class="pc-bar">' +
          '<select class="pc-sel" id="pcQStatus">' +
            PC_STATUSES.map(function (s) {
              return '<option value="' + pcAttr(s) + '"' + (s === PC_SUBMITTED ? ' selected' : '') + '>' + esc(s) + '</option>';
            }).join('') + '<option value="ALL">All statuses</option></select>' +
          '<select class="pc-sel" id="pcQAccount"><option value="">All accounts</option></select>' +
          '<button class="minibtn" id="pcQRefresh">Refresh</button>' +
        '</div>' +
        '<div id="pcQBody"><div class="spinner"></div></div>' +
      '</div></div>';
  }

  function pcWireQueueBar() {
    $('pcQStatus').onchange = pcLoadQueue;
    $('pcQRefresh').onclick = pcLoadQueue;
    $('pcQAccount').onchange = pcPaintQueue;
  }

  function pcLoadQueue() {
    var box = $('pcQBody'), sel = $('pcQStatus');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('potentialCpcQueue', { status: sel ? sel.value : PC_SUBMITTED, limit: PC_QUEUE_LIMIT }).then(function (d) {
      PC.queue = (d && d.queue) || [];
      PC.mayDecide = !!(d && d.may_decide);
      pcFillQueueAccounts();
      if ((sel ? sel.value : PC_SUBMITTED) === PC_SUBMITTED) { pcCount(PC.queue.length); }
      pcPaintQueue();
    }).catch(function (e) {
      box.innerHTML = '<div class="pc-empty">The review queue could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="pcQRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('pcQRetry'); if (r) { r.onclick = pcLoadQueue; }
    });
  }

  /** Account options come from the rows actually loaded, so the filter can never offer an
      account the queue does not hold; the filtering itself is on what is already on screen. */
  function pcFillQueueAccounts() {
    var sel = $('pcQAccount'), seen = {}, list = [], keep;
    if (!sel) { return; }
    keep = sel.value;
    PC.queue.forEach(function (r) {
      var a = pcStr(r.account), n = pcNorm(a);
      if (!n || seen[n]) { return; }
      seen[n] = true; list.push(a);
    });
    sel.innerHTML = '<option value="">All accounts</option>' + list.map(function (a) {
      return '<option value="' + pcAttr(a) + '">' + esc(a) + '</option>';
    }).join('');
    if (keep && seen[pcNorm(keep)]) { sel.value = keep; }
  }

  function pcPaintQueue() {
    var box = $('pcQBody'), sel = $('pcQAccount'), want = sel ? pcNorm(sel.value) : '';
    if (!box) { return; }
    var rows = PC.queue.filter(function (r) { return !want || pcNorm(r.account) === want; });
    if (!rows.length) {
      box.innerHTML = '<div class="pc-empty">Nothing here right now.' +
        '<span>' + (PC.mayDecide ? 'The queue is clear — Advertising is not waiting on a decision.' : 'Team Lead sees this queue; Management decides (§4.3).') + '</span></div>';
      return;
    }
    box.innerHTML = rows.map(pcQueueCardRow).join('');
    pcWireQueue(box);
  }

  function pcQueueCardRow(r) {
    var id = pcStr(r.row_id), status = pcStr(r.status);
    // waiting_min comes back empty when the submitted timestamp will not parse — no false "0m".
    var wait = pcStr(r.waiting_min) === '' ? NaN : Number(r.waiting_min);
    var waitCls = 'pill pc-wait' + (wait >= 720 ? ' pc-b' : (wait >= 120 ? ' pc-w' : ''));   // 12h = the §8.0b escalation mark
    var decide = PC.mayDecide && status === PC_SUBMITTED;
    var canSwitch = pcMaySwitch(r) && pcSwitchRoleOk();

    return '<div class="pc-card">' +
      '<div class="pc-h">' +
        '<span class="pc-id mono">' + esc(pcStr(r.listing_item_id)) + '</span>' +
        '<span class="pill role">' + esc(pcStr(r.account) || '—') + '</span>' +
        '<span class="pill ' + pcPillClass(status) + '">' + esc(status) + '</span>' +
        (status === PC_SUBMITTED && !isNaN(wait) ? '<span class="' + waitCls + '">Waiting ' + esc(pcMins(wait)) + '</span>' : '') +
      '</div>' +
      '<div class="tl-row"><span class="k">Reason</span><b>' + esc(pcStr(r.reason_for_selection)) + '</b></div>' +
      '<div class="tl-row"><span class="k">Nominated by</span><b>' + esc(pcStr(r.submitted_by)) + '</b>' +
        '<span class="pc-sub2">' + esc(fmtPkt(r.ts, true)) + '</span></div>' +
      (pcStr(r.reviewed_by) ? '<div class="tl-row"><span class="k">Decided by</span><b>' + esc(pcStr(r.reviewed_by)) + '</b></div>' : '') +
      pcFacts(r) +
      pcCentralBox(r) +
      (status === PC_APPROVED ? '<div class="pc-box"><div class="pc-k">Pipeline</div>' + pcResearchLine(r) +
        (canSwitch ? '<div class="pc-btns"><button class="btn-gold" data-q="switch" data-id="' + pcAttr(id) + '">Switch campaign to ' + esc(PC_CAMPAIGN_CPC) + '</button>' +
          '<span class="pc-sub2">Writes Campaign Selection on the Main Sheet, logs CAMPAIGN_LOG and notifies both ways.</span></div>' : '') +
        '</div>' : '') +
      (decide ? pcDecideForm(id) : '') +
      '<div data-res="' + pcAttr(id) + '"></div>' +
    '</div>';
  }

  /** §4.2 / RL-4: the live profit context is attached for Management only — for every other role
      it is simply absent from the payload, so there is nothing to hide here. */
  function pcCentralBox(r) {
    var c = r.central;
    if (!c) { return ''; }
    if (!c.ok) {
      return '<div class="pc-box pc-warn"><div class="pc-k">Live profit context</div>' +
        '<div class="pc-txt">Not available: ' + esc(pcStr(c.reason)) + '. Decide on the nomination as it stands.</div></div>';
    }
    var earning = pcStr(c['Order Earning']) ? pcMoney(c['Order Earning']) : (pcStr(c.order_earning) ? pcMoney(c.order_earning) : '<span class="pc-dim">—</span>');
    var campaign = pcStr(c['Campaign Selection']);
    return '<div class="pc-box pc-gold"><div class="pc-k">Central Main Sheet <span>figures as the sheet holds them</span></div>' +
      '<div class="tl-row"><span class="k">Listing Title</span><span class="pc-txt">' + esc(pcStr(c['Listing Title'])) + '</span></div>' +
      '<div class="tl-row"><span class="k">Sold For</span>' + pcMoney(c['Sold For']) + '</div>' +
      '<div class="tl-row"><span class="k">Order Earning</span>' + earning +
        (pcStr(c.order_earning_source) ? '<span class="pc-sub2">' + esc(pcStr(c.order_earning_source)) + '</span>' : '') + '</div>' +
      '<div class="tl-row"><span class="k">AliExpress Cost</span>' + pcMoney(c['AliExpress Cost']) + '</div>' +
      '<div class="tl-row"><span class="k">Profit</span><span class="pc-profit">' + pcMoney(c.Profit) + '</span></div>' +
      '<div class="tl-row"><span class="k">Campaign Selection</span><b>' + (campaign ? esc(campaign) : '—') + '</b>' +
        (c.already_cpc ? '<span class="pill pc-p-live">already ' + esc(PC_CAMPAIGN_CPC) + '</span>' : '') + '</div>' +
      '<div class="tl-row"><span class="k">Current Campaign</span><b>' +
        (pcStr(c['Current Campaign Selection']) ? esc(pcStr(c['Current Campaign Selection'])) : '—') + '</b>' +
        '<span class="pc-sub2">what eBay is actually running</span></div>' +
    '</div>';
  }

  function pcDecideForm(id) {
    var win = pcTestWindow();
    return '<div class="pc-box pc-blue"><div class="pc-k">What approving does</div>' +
        '<ol class="pc-steps">' +
          '<li>A <b>cpc_research</b> task (§8.3) is created for the Item Lister you name, with the deadline you set.</li>' +
          '<li>The lister works it and submits — §8.0b: nothing is Completed until the keywords and working are approved.</li>' +
          '<li>Only then does <b>Zain switch the campaign to ' + esc(PC_CAMPAIGN_CPC) + '</b>; CAMPAIGN_LOG records it and both sides are notified.</li>' +
          '<li>The nomination is mirrored into this account&#39;s tab of the Potential CPC workbook — you will be told which columns that tab does not carry.</li>' +
        '</ol>' +
        (win ? '<div class="pc-sub2" style="margin-top:8px">Campaign testing window (§8.0): 5:00–10:00 PM UK = ' + esc(win) + ' today.</div>' : '') +
      '</div>' +
      '<div class="pc-grid" style="margin-top:12px">' +
        '<div class="field"><label>CPC research goes to (Item Lister)</label>' +
          '<input class="pc-in" type="email" autocomplete="off" placeholder="company email" data-lister="' + pcAttr(id) + '"></div>' +
        '<div class="field"><label>Deadline (PKT)</label>' +
          '<input class="pc-in" type="datetime-local" data-deadline="' + pcAttr(id) + '"></div>' +
        '<div class="field"><label>Priority (optional)</label>' +
          '<input class="pc-in" type="text" autocomplete="off" data-priority="' + pcAttr(id) + '"></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label>Comment (required to reject)</label>' +
        '<textarea class="pc-ta" data-cmt="' + pcAttr(id) + '" placeholder="Zain gets this comment with the decision"></textarea></div>' +
      '<div class="pc-btns">' +
        '<button class="btn-gold" data-q="approve" data-id="' + pcAttr(id) + '">Approve</button>' +
        '<button class="minibtn" data-q="reject" data-id="' + pcAttr(id) + '">Reject</button>' +
      '</div>';
  }

  function pcWireQueue(box) {
    var btns = box.querySelectorAll('button[data-q]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          var act = b.getAttribute('data-q'), id = b.getAttribute('data-id');
          if (act === 'switch') { pcSwitch(box, id, b); return; }
          pcDecide(box, act, id, b);
        };
      })(btns[i]);
    }
  }

  function pcDecide(box, act, id, btn) {
    var cmt = pcPick(box, 'data-cmt', id);
    var comment = cmt ? pcStr(cmt.value) : '';
    var payload = { row_id: id, decision: act, comment: comment };
    var lister, deadline, priority;

    if (act === 'reject') {
      if (!comment) { toast('A comment is mandatory when rejecting.'); if (cmt) { cmt.focus(); } return; }
    } else {
      lister = pcPick(box, 'data-lister', id);
      deadline = pcPick(box, 'data-deadline', id);
      priority = pcPick(box, 'data-priority', id);
      payload.lister_email = lister ? pcStr(lister.value) : '';
      payload.deadline_pkt = deadline ? pcStr(deadline.value) : '';
      payload.priority = priority ? pcStr(priority.value) : '';
      if (!payload.lister_email) { toast('Name the Item Lister who does the CPC research.'); if (lister) { lister.focus(); } return; }
      if (!payload.deadline_pkt) { toast('Set the research deadline (Pakistan time).'); if (deadline) { deadline.focus(); } return; }
    }

    btn.disabled = true;
    api('decidePotentialCpc', payload).then(function (res) {
      toast(act === 'approve' ? 'Approved — the research task is on its way.' : 'Rejected — Zain has your comment.');
      pcShowResult(box, id, act === 'approve' ? pcApproveResult(res) : pcRejectResult(res));
      if (STATE.counts && STATE.counts.potentialCpc) { pcCount(Math.max(0, STATE.counts.potentialCpc - 1)); }
    }).catch(function (e) { btn.disabled = false; toast('Not decided: ' + e.message); });
  }

  /** The row's action area is replaced by the outcome, so the honest notes stay on screen until
      the next refresh; every control that acted on this row is retired with it. */
  function pcShowResult(box, id, html) {
    var slot = pcPick(box, 'data-res', id);
    var btns = box.querySelectorAll('button[data-q],button[data-act]'), i, f;
    for (i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-id') === id && btns[i].getAttribute('data-act') !== 'detail') { btns[i].disabled = true; }
    }
    ['data-cmt', 'data-lister', 'data-deadline', 'data-priority'].forEach(function (a) {
      f = pcPick(box, a, id);
      if (f) { f.disabled = true; }
    });
    if (slot) { slot.innerHTML = html; }
  }

  function pcRejectResult(res) {
    return '<div class="pc-box pc-bad"><div class="pc-k">Rejected</div>' +
      '<div class="pc-txt">Nothing was written to the Potential CPC workbook. Zain has been notified with your comment' +
      (pcStr(res && res.decided_at) ? ' at ' + esc(fmtPkt(res.decided_at, true)) : '') + '.</div></div>';
  }

  function pcApproveResult(res) {
    var t = res && res.task, out;
    out = '<div class="pc-box pc-gold"><div class="pc-k">Approved</div><ol class="pc-steps">';
    if (t && pcStr(t.task_id)) {
      out += '<li>cpc_research task <span class="mono">' + esc(pcStr(t.task_id)) + '</span> created for ' +
        esc(pcStr(t.assigned_to)) + (pcStr(t.deadline_pkt) ? ', due ' + esc(fmtPkt(t.deadline_pkt, true)) : '') + '.</li>';
    } else {
      out += '<li><b>' + esc(pcStr(res && res.task_error) || 'the cpc_research task was not created') +
        '</b> — Management has been notified; create it by hand from My tasks.</li>';
    }
    out += '<li>Zain is notified, and switches the campaign to ' + esc(PC_CAMPAIGN_CPC) + ' once that research is approved.</li>' +
      '</ol></div>' + pcMirrorNote(res && res.mirror);
    return out;
  }

  /** The mirror is reported exactly as the bridge reports it — a tab that does not carry a column
      has it skipped and named, never created (Sheet Contract). Sheet IDs are never shown (RL-9). */
  function pcMirrorNote(m) {
    var w, written, missing, head, txt;
    if (!m) {
      return '<div class="pc-box pc-warn"><div class="pc-k">Workbook mirror</div>' +
        '<div class="pc-txt">No mirror result came back. The nomination is safe in the portal.</div></div>';
    }
    if (!m.ok) {
      return '<div class="pc-box pc-warn"><div class="pc-k">Workbook mirror</div>' +
        '<div class="pc-txt">Not written to the Potential CPC workbook: ' + esc(pcStr(m.reason) || 'unknown reason') +
        '. The nomination is safe in the portal and can be mirrored once that is fixed.</div></div>';
    }
    w = (m.shadow && m.wouldWrite) ? m.wouldWrite : m;
    written = w.written || [];
    missing = w.skippedMissing || [];
    head = m.shadow
      ? 'Held by the pilot gate — nothing was written to the live workbook yet.'
      : 'Written to the Potential CPC workbook.';
    txt = head + ' Tab: ' + (pcStr(w.tab) || '—') + '. Columns ' + (m.shadow ? 'it would fill' : 'filled') + ': ' +
      (written.length ? written.join(' · ') : 'none');
    if (missing.length) {
      txt += '. That tab does not carry ' + missing.join(' · ') + ' — those stay in the portal only; no column was added to the sheet.';
    } else {
      txt += '.';
    }
    return '<div class="pc-box ' + (missing.length || m.shadow ? 'pc-warn' : 'pc-blue') + '">' +
      '<div class="pc-k">Workbook mirror</div><div class="pc-txt">' + esc(txt) + '</div></div>';
  }

  // ============================== THE CPC SWITCH (§9 → CAMPAIGN_LOG) ==============================
  function pcSwitch(box, id, btn) {
    btn.disabled = true;
    api('switchPotentialCpcCampaign', { row_id: id }).then(function (res) {
      var html;
      if (res && res.already_switched) {
        html = '<div class="pc-box pc-blue"><div class="pc-k">Campaign</div><div class="pc-txt">Already on ' +
          esc(PC_CAMPAIGN_CPC) + ' — nothing to do.</div></div>';
      } else if (res && res.switched) {
        toast('Campaign switched to ' + PC_CAMPAIGN_CPC + '.');
        html = '<div class="pc-box pc-gold"><div class="pc-k">Campaign switched</div><div class="pc-txt">' +
          esc((pcStr(res.previous_campaign) || 'No campaign') + ' → ' + PC_CAMPAIGN_CPC + '.') +
          (res.shadow ? ' Recorded in the portal — the pilot gate is holding the live sheet write.' : '') +
          ' CAMPAIGN_LOG updated' + (res.notified_to && res.notified_to.length ? ' · notified ' + esc(res.notified_to.join(', ')) : '') + '.</div></div>';
      } else {
        html = '<div class="pc-box pc-warn"><div class="pc-k">Campaign not changed</div><div class="pc-txt">The Main Sheet was not updated: ' +
          esc(pcStr(res && res.sheet && res.sheet.reason) || 'unknown reason') + '. Nothing was logged.</div></div>';
      }
      pcShowResult(box, id, html);
    }).catch(function (e) { btn.disabled = false; toast('Not switched: ' + e.message); });
  }

})();
