/* view-advertising.js — §8.5 the per-account PPC decision table and the read-only "Instructions
 * Given By The Management" feed · §8.7 the Central Main Sheet campaign columns and the "Wrong
 * Advertising" ALARM tab · §14 the two-way campaign notification.
 * Views: advertising (Advertising) · wrongAds (Wrong advertising).
 * Backend: ppcTable · setCampaign · wrongAdvertising · instructionsFeed · accountList.
 *
 * REALITY WINS over §8.5 / §8.7, and this screen draws the reality rather than the spec:
 *  · every column label is the tab's OWN header, handed over in ppcTable.layout — 'Past
 *    behaviour(7 days)' on three tabs and plain 'Past behaviour' on the other three; column A
 *    holds the listing title with NO header on four of the six tabs, where a new row therefore
 *    cannot carry a title at all;
 *  · one tab heads Campaign BEFORE Item ID, so the table draws its columns in that tab's order;
 *  · PPC campaign names are FREE TEXT. The seven SOP v2.0 tiers are offered as suggestions only
 *    and an existing name is never rewritten — reusing a name already on the tab is how a listing
 *    moves tier without losing its selling history. Only the Main Sheet's own three-value dropdown
 *    is a closed vocabulary, and that is the one the campaign change writes;
 *  · 'Manager wants' is empty in every live ALARM row, so the manager's side is read from the Main
 *    Sheet campaign column instead and each card says which side its value came from.
 * No campaign name, decision word, account or staff name is hardcoded in this file: the built page
 * is PUBLIC (RL-2, RL-9), so every vocabulary list and every account arrives from the signed-in
 * backend and nothing here is a map to the data. */
(function () {
  'use strict';

  /* §4.3 — the roles this phase puts the two screens in front of. */
  var AD_VIEW_ROLES = ['Advertising Manager', 'Management', 'Ops Head', 'Team Lead'];
  /* §8.7 sends the ALARM tab to Management and Advertising, exactly those two, and
     advMaySeeAlarms_ enforces it. The Team Lead is on the nav for this phase but the server will
     refuse the read, so the screen says so instead of firing a request that throws. */
  var AD_ALARM_ROLES = ['Advertising Manager', 'Management', 'Ops Head'];
  /* advMayChangeCampaign_ — the payload's may_write is the authority; this only decides which
     sentence the notification banner shows. */
  var AD_MGMT_ROLES = ['Management', 'Ops Head'];

  /* Backend vocabulary — Advertising.gs spells these exactly this way. */
  var AD_OPEN = 'OPEN';
  var AD_RESOLVED = 'RESOLVED';
  var AD_ALL = 'ALL';
  var AD_KIND_DAY = 'day';
  var AD_KIND_MARKER = 'marker';
  var AD_KIND_WATCH = 'watchlist';

  var AD_PPC_LIMIT = 200;                 // the backend default
  var AD_PPC_MAX = 1000;                  // the backend ceiling

  /* Module state. Vocabulary lists start EMPTY and are filled from the server — see the header
     note: a hardcoded campaign or decision list would put business vocabulary on a public URL. */
  var AD = {
    accounts: [], health: {}, account: '', accountsFilled: false,
    ppc: null, suggest: null, mayWrite: false, rows: {}, ppcLimit: AD_PPC_LIMIT,
    alarms: [], alarmAccount: '', alarmStatus: AD_OPEN, alarmStatuses: [AD_OPEN, AD_RESOLVED]
  };

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.ad-bar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:13px}' +
    '.ad-in,.ad-sel,.ad-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.ad-ta{resize:vertical;min-height:62px}' +
    '.ad-in:focus,.ad-sel:focus,.ad-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.ad-bar .ad-sel,.ad-bar .ad-in{width:auto;max-width:100%;padding:8px 11px;font-size:12.5px;font-weight:700}' +
    '.ad-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.ad-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:13px}' +
    '.ad-k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px;display:block}' +
    '.ad-sub2{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.ad-dim{color:var(--text-3);font-weight:700}' +
    '.ad-txt{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12.5px;line-height:1.6}' +
    '.ad-a{color:var(--blue-2);font-weight:700;overflow-wrap:anywhere}' +
    '.ad-box{margin-top:12px;padding:12px 13px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.09)}' +
    '.ad-box.ad-blue{background:var(--blue-soft);border-color:rgba(61,155,240,.30)}.ad-box.ad-blue .ad-k{color:var(--blue-2)}' +
    '.ad-box.ad-gold{background:linear-gradient(135deg,rgba(233,169,60,.14),rgba(233,169,60,.03));border-color:var(--gold-line-hi)}.ad-box.ad-gold .ad-k{color:var(--gold-a)}' +
    '.ad-box.ad-warnb{background:var(--warn-soft);border-color:rgba(255,159,67,.40)}.ad-box.ad-warnb .ad-k{color:var(--warn)}' +
    '.ad-box.ad-badb{background:var(--bad-soft);border-color:rgba(240,96,90,.45)}.ad-box.ad-badb .ad-k{color:var(--bad)}' +
    '.ad-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.ad-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    /* ---- §8.5 decision table ---- */
    '.ad-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:920px}' +
    '.ad-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.ad-tbl td{padding:10px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top;word-break:break-word}' +
    '.ad-tbl tbody tr.ad-r:hover{background:var(--blue-soft)}' +
    '.ad-tbl td.ad-c-title{min-width:230px;font-weight:700}' +
    '.ad-tbl tr.ad-r-day td{background:linear-gradient(90deg,rgba(233,169,60,.14),transparent);border-bottom:1px solid var(--gold-line-hi)}' +
    '.ad-tbl tr.ad-r-day b{font-weight:800;color:var(--gold-a);margin-left:8px}' +
    '.ad-tbl tr.ad-r-mark td{background:var(--ok-soft)}' +
    '.ad-tbl tr.ad-r-mark b{font-weight:800;color:var(--ok)}' +
    '.ad-tbl tr.ad-r-watch td{background:rgba(120,132,152,.07)}' +
    '.ad-tbl .ad-k{display:inline;margin:0}' +
    '.ad-dec{font-weight:800}' +
    '.ad-dec.ad-stop{color:var(--bad)}.ad-dec.ad-go{color:var(--ok)}.ad-dec.ad-move{color:var(--warn)}' +
    '.pill.ad-p-open{background:var(--bad-soft);color:var(--bad);border:1px solid rgba(240,96,90,.45)}' +
    '.pill.ad-p-res{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.ad-p-watch{background:rgba(120,132,152,.18);color:var(--text-2)}' +
    '.pill.ad-p-new{background:linear-gradient(135deg,var(--gold-a),var(--gold-c));color:var(--gold-ink)}' +
    '.pill.ad-p-src{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.ad-p-pin{background:var(--warn-soft);color:var(--warn)}' +
    /* ---- SOP tier suggestions ---- */
    '.ad-tiers{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}' +
    '.ad-tier{border:1px solid rgba(120,132,152,.35);border-radius:9px;padding:7px 11px;font-size:11.5px;font-weight:800;color:var(--text-2);text-align:left;transition:all .15s}' +
    '.ad-tier:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.ad-tier span{display:block;font-weight:600;color:var(--text-3);font-size:10.5px;margin-top:2px}' +
    /* ---- instructions, pinned ---- */
    '.ad-ins{padding:12px 0}.ad-ins+.ad-ins{border-top:1px solid var(--gold-line)}' +
    '.ad-ins-m{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:7px}' +
    /* ---- §8.7 the ALARM cards ---- */
    '.ad-alarm{position:relative;border:1px solid rgba(240,96,90,.55);border-radius:14px;padding:16px 18px 16px 24px;background:linear-gradient(135deg,var(--bad-soft),rgba(240,96,90,.02));box-shadow:0 10px 30px rgba(240,96,90,.13)}' +
    '.ad-alarm+.ad-alarm{margin-top:15px}' +
    '.ad-alarm:before{content:"";position:absolute;left:8px;top:16px;bottom:16px;width:4px;border-radius:4px;background:linear-gradient(180deg,var(--bad),rgba(240,96,90,.35))}' +
    '.ad-alarm.ad-done{border-color:var(--gold-line);background:rgba(120,132,152,.07);box-shadow:none}' +
    '.ad-alarm.ad-done:before{background:linear-gradient(180deg,var(--ok),rgba(63,207,142,.30))}' +
    '.ad-alarm-h{display:flex;flex-wrap:wrap;gap:9px;align-items:center}' +
    '.ad-tag{padding:4px 11px;border-radius:8px;font-size:11px;font-weight:800;letter-spacing:.14em;background:var(--bad);color:var(--panel)}' +
    '.ad-alarm.ad-done .ad-tag{background:var(--ok)}' +
    '.ad-name{font-weight:800;font-size:14.5px;word-break:break-word;flex:1 1 220px}' +
    '.ad-vs{display:grid;grid-template-columns:1fr 40px 1fr;gap:10px;margin-top:13px}' +
    '.ad-side{border:1px solid var(--gold-line);border-radius:12px;padding:11px 13px;background:rgba(120,132,152,.09)}' +
    '.ad-side b{display:block;font-size:15.5px;font-weight:800;margin-top:4px;word-break:break-word}' +
    '.ad-side.ad-live{border-color:rgba(240,96,90,.5);background:var(--bad-soft)}.ad-side.ad-live b{color:var(--bad)}' +
    '.ad-side.ad-want b{color:var(--gold-a)}' +
    '.ad-ne{display:grid;place-items:center;font-size:19px;font-weight:800;color:var(--bad)}' +
    '.ad-figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:11px;margin-top:14px}' +
    '.ad-fig{border:1px solid var(--gold-line);border-radius:12px;padding:11px 13px;background:var(--panel)}' +
    '.ad-fig b{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:3px}' +
    '.ad-fig.ad-bad{border-color:rgba(240,96,90,.5);background:var(--bad-soft)}.ad-fig.ad-bad b{color:var(--bad)}' +
    '.ad-fig.ad-warnf{border-color:rgba(255,159,67,.45);background:var(--warn-soft)}.ad-fig.ad-warnf b{color:var(--warn)}' +
    '.ad-fig.ad-okf b{color:var(--ok)}' +
    '.ad-fig .ad-note{display:block;font-size:11px;font-weight:700;color:var(--text-3);margin-top:5px;line-height:1.45}' +
    '.ad-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}' +
    '.ad-chip{font-size:11.5px;font-weight:700;color:var(--text);border:1px solid var(--gold-line);border-radius:8px;padding:4px 10px;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.ad-chip .k{color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:800;margin-right:6px}' +
    '.ad-res{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:13px}' +
    '.ad-res .ad-in{flex:1 1 220px;width:auto;padding:9px 12px;font-size:12.5px}' +
    '.ad-tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px}' +
    '.ad-tot .ad-fig b{font-size:27px}' +
    '@media (max-width:880px){' +
      '.ad-grid{grid-template-columns:1fr}' +
      '.ad-vs{grid-template-columns:1fr}.ad-ne{padding:1px 0}' +
      '.ad-tbl{min-width:0}.ad-tbl thead{display:none}' +
      '.ad-tbl tr{display:block;padding:4px 0}' +
      '.ad-tbl td{display:block;border-bottom:0;padding:4px 0}' +
      '.ad-tbl tr.ad-r,.ad-tbl tr.ad-r-watch{border-top:1px solid var(--gold-line);padding-top:11px}' +
      '.ad-tbl tr.ad-r-day td,.ad-tbl tr.ad-r-mark td{padding:9px 10px;border-radius:8px;margin:8px 0}' +
      '.ad-tbl td[data-k]:before{content:attr(data-k) " ";font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-right:7px}' +
      '.ad-fig b{font-size:21px}.ad-tot .ad-fig b{font-size:23px}' +
    '}'
  );

  // ---------- safety (RL-3) ----------
  function adStr(v) { return String(v == null ? '' : v).trim(); }
  function adRaw(v) { return String(v == null ? '' : v); }
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function adAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  /** Sheet text for the DOM: escaped, with http/https URLs (and nothing else) turned into links.
      These cells are typed by staff and can hold anything at all. */
  function adText(v) {
    var s = adRaw(v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a class="ad-a" href="' + adAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }

  function adPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) { return els[i]; } }
    return null;
  }
  function adHas(arr, v) { return arr.indexOf(v) >= 0; }
  function adRole() { return (STATE.user && STATE.user.role) || ''; }
  function adIsMgmt() { return adHas(AD_MGMT_ROLES, adRole()); }
  function adMaySeeAlarms() { return adHas(AD_ALARM_ROLES, adRole()); }
  /** advNorm_ in Advertising.gs — account and tab names carry trailing spaces and casing drift. */
  function adNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function adCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }
  function adWhen(v) {
    var s = adStr(v);
    if (!s) { return ''; }
    var out = fmtPkt(s, true);
    return out ? out + ' PKT' : s;
  }
  /** A sheet date cell is shown as the sheet writes it — the ALARM tab keeps 'm/d/yyyy h:mm:ss'
      and the Resolved column 'mm-dd-yy'; re-formatting them would misreport the source. */
  function adSheetDate(v) { return adStr(v) || '—'; }

  // ---------- money (RL-4: these keys are simply absent for a role that may not see them) ----------
  function adNum(v) {
    var s = adStr(v).replace(/[£,]/g, '').replace(/\s/g, '');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  function adGbp(v) {
    var n = adNum(v), s = adStr(v);
    if (!isNaN(n)) { return '£' + n.toFixed(2); }
    return s;
  }
  /** A £ figure for a .num element: two decimals when the cell holds a number, and the cell's own
      text when it does not — a sheet figure is never coerced into something it is not. */
  function adMoneyText(v) { return adStr(v) ? esc(adGbp(v)) : '—'; }
  /** PROFIT_FIELDS keeps this key with its space, so it is read by name and never assumed. */
  function adRawProfit(a) { return a && a['Raw Profit'] !== undefined ? a['Raw Profit'] : ''; }

  /* A raw transport string ("Failed to fetch") tells a manager nothing and makes a screen look
     broken when the real answer is that a workbook was never registered. The known causes are
     named in plain words, with whose job it is to fix them. */
  function adWhy(err) {
    var e = String(err || '').toLowerCase();
    if (e.indexOf('not connected') >= 0 || e.indexOf('no such sheet') >= 0 || e.indexOf('sheet id') >= 0) {
      return 'The PPC Central workbook is not registered in CONNECTIONS yet, so there is nothing for this screen to read. ' +
        'Sir Hasib registers it once and every account on this screen fills in.';
    }
    if (e.indexOf('failed to fetch') >= 0 || e.indexOf('networkerror') >= 0 || e.indexOf('load failed') >= 0) {
      return 'The portal server did not answer. This is the connection, not your data — the figures are safe.';
    }
    if (e.indexOf('auth') >= 0 || e.indexOf('role') >= 0) {
      return 'Your role is not cleared for this screen. Management grants it on the Access desk.';
    }
    if (e.indexOf('timed out') >= 0 || e.indexOf('timeout') >= 0) {
      return 'The workbook took too long to answer. It is usually free again within a minute.';
    }
    return '';
  }

  function adRetry(msg, err, id) {
    var why = adWhy(err);
    return '<div class="ad-empty">' + esc(msg) +
      (why ? '<span style="font-weight:700;color:var(--text-2)">' + esc(why) + '</span>' : '') +
      '<span style="opacity:.75">' + esc(err) + '</span>' +
      '<button class="minibtn" id="' + id + '" style="margin-top:10px">Try again</button></div>';
  }

  // ---------- accounts (§3 — from the registry, never a list in this file) ----------
  function adApplyAccounts(d) {
    var list = (d && d.accounts) || [], i, a;
    AD.accounts = [];
    AD.health = {};
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (!adStr(a.account)) { continue; }
      AD.accounts.push(adStr(a.account));
      AD.health[adNorm(a.account)] = { linked: Number(a.linked) || 0, of: Number(a.of) || 0 };
    }
  }

  function adLoadAccounts(then) {
    // The account strip changes about never — paint it from the last answer at once ("Loading
    // accounts…" was the first thing Zain saw every single visit), refresh underneath.
    var had = (typeof cacheRead === 'function') ? cacheRead('accountList', {}) : null;
    if (had) { adApplyAccounts(had); if (typeof then === 'function') { then(); then = null; } }
    return api('accountList').then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('accountList', {}, d); }
      adApplyAccounts(d);
      if (typeof then === 'function') { then(); }
    }).catch(function () { if (typeof then === 'function') { then(); } });
  }

  /** The signed-in user's own accounts_access decides which account opens first; it is free text
      on USERS ('ALL', or names), so a match is by containment of the normalized name. */
  function adDefaultAccount() {
    var mine = adNorm((STATE.user && STATE.user.accounts) || ''), i, n;
    if (mine && mine !== 'all') {
      for (i = 0; i < AD.accounts.length; i++) {
        n = adNorm(AD.accounts[i]);
        if (n && mine.indexOf(n) >= 0) { return AD.accounts[i]; }
      }
    }
    return AD.accounts.length ? AD.accounts[0] : '';
  }

  function adAccountOptions(selected, allLabel) {
    var out = allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '', i, a, h;
    for (i = 0; i < AD.accounts.length; i++) {
      a = AD.accounts[i];
      h = AD.health[adNorm(a)] || {};
      out += '<option value="' + adAttr(a) + '"' + (adNorm(a) === adNorm(selected) ? ' selected' : '') + '>' +
        esc(a) + (h.of && h.linked < h.of ? ' · ' + h.linked + '/' + h.of + ' linked' : '') + '</option>';
    }
    return out;
  }

  // ============================== VIEW: ADVERTISING (§8.5) ==============================
  VIEWS.advertising = {
    label: 'Advertising',
    icon: '<path d="M4 10v4a1 1 0 0 0 1 1h2.5l4.5 4V5L7.5 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.8 6a8 8 0 0 1 0 12"/>',
    roles: AD_VIEW_ROLES,
    order: 23,
    /* Warm the account strip and the Management instructions; the PPC table itself waits for an
       account to be picked, and is then cached per account. */
    prefetch: function () {
      return Promise.all([
        api('accountList').then(function (d) { if (typeof cacheWrite === 'function') { cacheWrite('accountList', {}, d); } }),
        adFetchInstructions()
      ]);
    },
    badge: function () { return (STATE.counts && STATE.counts.advertising) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Advertising</h1>' +
          '<span class="sub">PPC decisions per account · campaigns · what Management has asked for</span>' +
          '<select class="ad-sel" id="adAcc" style="margin-left:auto"><option value="">Loading accounts…</option></select>' +
          '<button class="minibtn" id="adRefresh">Refresh</button>' +
        '</div>' +
        '<div class="card ideas enter d1" style="margin-bottom:16px"><div class="hd">Instructions Given By The Management ' +
          '<span class="hint" id="adInsHint">read-only · pin this on the wall</span></div>' +
          '<div class="bd" id="adIns"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="card enter d2"><div class="hd">Change a campaign ' +
          '<span class="hint">Campaign Selection on the account&#39;s Central Main Sheet</span></div>' +
          '<div class="bd" id="adEditor"><div class="spinner"></div></div>' +
        '</div>' +
        '<div id="adReceipt"></div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">PPC decisions ' +
          '<span class="hint" id="adTblHint">the account&#39;s own tab of PPC Central</span></div>' +
          '<div class="bd" id="adTable"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      $('adRefresh').onclick = function () { adLoadPpc(); adLoadInstructions(); };
      adLoadAccounts(function () {
        AD.account = AD.account || adDefaultAccount();
        adFillAccounts();
        adLoadPpc();
      });
      adLoadInstructions();
    }
  };

  function adFillAccounts() {
    var sel = $('adAcc');
    if (!sel) { return; }
    if (!AD.accounts.length) {
      // §6: a portal whose registry has not been imported yet still works — the backend validates
      // the account name it is handed and answers 'not connected yet' rather than failing.
      sel.innerHTML = '<option value="">No account in the registry yet</option>';
      return;
    }
    sel.innerHTML = adAccountOptions(AD.account, '');
    sel.onchange = function () {
      AD.account = adStr(sel.value);
      AD.ppcLimit = AD_PPC_LIMIT;
      adLoadPpc();
    };
  }

  // ---------- §8.5 the read-only instructions feed, pinned ----------
  function adFetchInstructions() {
    return api('instructionsFeed', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('instructionsFeed', {}, d); }
      return d;
    });
  }

  function adPaintInstructions(box, d) {
      var list = (d && d.instructions) || [], i, h = '';
      adCount('advertising', Number(d && d.unacknowledged) || 0);
      if ($('adInsHint')) {
        $('adInsHint').textContent = list.length + (list.length === 1 ? ' instruction' : ' instructions') +
          (d && d.unacknowledged ? ' · ' + d.unacknowledged + ' new' : '') + ' · read-only';
      }
      if (!list.length) {
        box.innerHTML = '<div class="ad-empty">No standing instruction from Management right now.' +
          '<span>Anything Management issues to Advertising lands here and on the PPC Central instructions tab at the same time.</span></div>';
        return;
      }
      for (i = 0; i < list.length; i++) { h += adInstructionRow(list[i]); }
      h += '<div class="ad-box ad-blue"><span class="ad-k">Where these come from</span>' +
        '<div class="ad-txt">Management writes these from their own version. This card only reads them — it never writes to the ' +
        'instructions tab. Mark one as understood in <b>Rules &amp; instructions</b>, where the acknowledgement is recorded against your name.' +
        (d && !d.connected ? ' The PPC Central instructions tab is <b>' + esc(adStr(d.reason) || 'not connected yet') + '</b>, so only the portal&#39;s own instructions are listed.' : '') +
        '</div></div>';
      box.innerHTML = h;
  }

  function adLoadInstructions() {
    var box = $('adIns');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('instructionsFeed', {}) : null;
    if (had) { try { adPaintInstructions(box, had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    adFetchInstructions().then(function (d) {
      adPaintInstructions(box, d);
    }).catch(function (e) {
      if (had) { return; }
      box.innerHTML = adRetry('The instructions feed could not be loaded just now.', e.message, 'adInsRetry');
      var r = $('adInsRetry');
      if (r) { r.onclick = adLoadInstructions; }
    });
  }

  function adInstructionRow(n) {
    var given = adStr(n.given_by), src = adStr(n.source), date = adStr(n.date);
    return '<div class="ad-ins"><div class="ad-txt"><b>' + adText(n.instruction) + '</b></div>' +
      '<div class="ad-ins-m">' +
        (n.isNew ? '<span class="pill ad-p-new">New</span>' : '') +
        (n.acknowledged ? '<span class="ad-sub2">Understood ✓ ' + esc(adWhen(n.acknowledged_at)) + '</span>' : '') +
        (date ? '<span class="ad-chip"><span class="k">Date</span>' + esc(date) + '</span>' : '') +
        (given ? '<span class="ad-chip"><span class="k">Given by</span>' + esc(given) + '</span>' : '') +
        (src ? '<span class="pill ad-p-src">' + esc(src) + '</span>' : '') +
        (adStr(n.department) ? '<span class="ad-chip"><span class="k">Dept</span>' + esc(adStr(n.department)) + '</span>' : '') +
      '</div></div>';
  }

  // ---------- §8.5 the per-account decision table ----------
  function adLoadPpc() {
    var box = $('adTable'), ed = $('adEditor');
    if (!box) { return; }
    if (!adStr(AD.account)) {
      box.innerHTML = '<div class="ad-empty">Pick an account.<span>Each account has its own tab in PPC Central.</span></div>';
      if (ed) { ed.innerHTML = '<div class="ad-empty">Pick an account to change a campaign.</div>'; }
      return;
    }
    // Cached per account+limit, so switching between accounts repaints each one's table at once.
    var pk = { account: AD.account, limit: AD.ppcLimit };
    var had = (typeof cacheRead === 'function') ? cacheRead('ppcTable', pk) : null;
    var applyPpc = function (d) {
      AD.ppc = d || null;
      AD.suggest = (d && d.suggestions) || null;
      AD.mayWrite = !!(d && d.may_write);
      adRenderEditor();
      adRenderPpc(d);
    };
    if (had) { try { applyPpc(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    api('ppcTable', pk).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('ppcTable', pk, d); }
      applyPpc(d);
    }).catch(function (e) {
      if (had) { toast('Showing the last table for this account — could not refresh just now.'); return; }
      box.innerHTML = adRetry('That account&#39;s PPC tab could not be read just now.', e.message, 'adPpcRetry');
      var r = $('adPpcRetry');
      if (r) { r.onclick = adLoadPpc; }
      if (ed) { ed.innerHTML = '<div class="ad-empty">The campaign editor needs the account&#39;s tab first.<span>' + esc(adWhy(e.message) || e.message) + '</span></div>'; }
    });
  }

  /** The table draws the tab's OWN headers in the tab's OWN order — one tab carries Campaign
      before Item ID, and four carry no header over the title column at all. */
  function adColumns(layout) {
    layout = layout || {};
    var title = { key: 'listing_title', label: adStr(layout.title_header) || 'Listing Title', cls: 'ad-c-title' };
    var item = { key: 'item_id', label: adStr(layout.item_header) || 'Item ID', mono: true };
    var camp = { key: 'campaign', label: adStr(layout.campaign_header) || 'Campaign' };
    var dec = { key: 'decision', label: adStr(layout.decision_header) || 'Decision' };
    var reason = { key: 'reason_to_stop', label: adStr(layout.reason_header) || 'Reason to stop' };
    var added = { key: 'added_in_another_campaign', label: adStr(layout.added_header) || 'Added in another campaign' };
    var past = { key: 'past_behaviour', label: adStr(layout.past_header) || 'Past behaviour (7 days)' };
    var comment = { key: 'comment', label: adStr(layout.comment_header) || 'Comment' };
    return layout.campaign_before_item
      ? [title, camp, item, dec, reason, added, past, comment]
      : [title, item, camp, dec, reason, added, past, comment];
  }

  /** Decision text is free lowercase text on these tabs (typos included). The words are never
      rewritten — only tinted, so a paused item reads as a paused item at a glance. */
  function adDecisionClass(v) {
    var n = adNorm(v);
    if (!n) { return ''; }
    if (n.indexOf('resum') >= 0 || n.indexOf('active') >= 0) { return ' ad-go'; }
    if (n.indexOf('shift') >= 0 || n.indexOf('move') >= 0) { return ' ad-move'; }
    return ' ad-stop';
  }

  function adRenderPpc(d) {
    var box = $('adTable'), hint = $('adTblHint');
    if (!box) { return; }
    AD.rows = {};
    if (!d || !d.ok) {
      if (hint) { hint.textContent = adStr(d && d.tab) || 'not connected yet'; }
      box.innerHTML = '<div class="ad-empty">' + esc(adStr(AD.account)) + ' — ' + esc(adStr(d && d.reason) || 'not connected yet') + '.' +
        '<span>Nothing was changed. A tab that exists but is empty reads as empty here too: one account&#39;s listings are tracked on another account&#39;s tab under its own duplicate campaigns.</span></div>';
      return;
    }

    var layout = d.layout || {}, cols = adColumns(layout), rows = d.rows || [];
    var span = cols.length + (AD.mayWrite ? 1 : 0);
    var decisions = 0, i, r, body = '';
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (adStr(r.kind) !== AD_KIND_DAY && adStr(r.kind) !== AD_KIND_MARKER) { decisions++; }
      if (adStr(r.item_id)) { AD.rows[adStr(r._row)] = r; }
      body += adPpcRow(r, cols, span);
    }
    if (hint) {
      hint.textContent = adStr(d.tab) + ' · ' + decisions + (decisions === 1 ? ' row' : ' rows') +
        (d.truncated ? ' · newest ' + rows.length + ' shown' : '');
    }

    var head = '<tr>';
    for (i = 0; i < cols.length; i++) { head += '<th>' + esc(cols[i].label) + '</th>'; }
    if (AD.mayWrite) { head += '<th></th>'; }
    head += '</tr>';

    box.innerHTML =
      (rows.length
        ? '<div class="scroll"><table class="ad-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
        : '<div class="ad-empty">This tab is empty.<span>Header row only — the truth for an account whose listings are tracked on another tab.</span></div>') +
      adLayoutNote(layout, d) +
      (d.truncated ? '<div class="ad-btns"><button class="minibtn" id="adMore">Load the full tab</button>' +
        '<span class="ad-sub2">Showing the newest ' + rows.length + ' rows.</span></div>' : '');

    var more = $('adMore');
    if (more) {
      more.onclick = function () { AD.ppcLimit = AD_PPC_MAX; adLoadPpc(); };
    }
    adWireRowButtons(box);
  }

  function adPpcRow(r, cols, span) {
    var kind = adStr(r.kind), i, c, v, cell, tds = '';
    if (kind === AD_KIND_DAY) {
      return '<tr class="ad-r-day"><td colspan="' + span + '"><span class="ad-k">Day</span><b>' + esc(adStr(r.day) || '—') + '</b></td></tr>';
    }
    if (kind === AD_KIND_MARKER) {
      return '<tr class="ad-r-mark"><td colspan="' + span + '"><span class="ad-k">Day status</span><b>' + esc(adStr(r.marker)) + '</b> ' +
        '<span class="ad-sub2">— the tab&#39;s own line for a day with nothing paused, written exactly as the sheet holds it</span></td></tr>';
    }
    for (i = 0; i < cols.length; i++) {
      c = cols[i];
      v = adStr(r[c.key]);
      if (c.key === 'decision' && !v && kind === AD_KIND_WATCH) {
        cell = '<span class="pill ad-p-watch">' + esc(AD_KIND_WATCH) + '</span>';
      } else if (c.key === 'decision' && v) {
        cell = '<span class="ad-dec' + adDecisionClass(v) + '">' + esc(v) + '</span>';
      } else if (c.key === 'item_id' && v) {
        cell = '<span class="mono">' + esc(v) + '</span>';
      } else if (c.key === 'comment') {
        cell = (v ? adText(v) : '<span class="ad-dim">—</span>') +
          // Four live rows really do spill a second comment into the unheaded column I.
          (adStr(r.comment_overflow) ? '<div class="ad-sub2" style="margin-top:5px">also in column I: ' + adText(r.comment_overflow) + '</div>' : '');
      } else {
        cell = v ? adText(v) : '<span class="ad-dim">—</span>';
      }
      tds += '<td data-k="' + adAttr(c.label) + '"' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + cell + '</td>';
    }
    if (AD.mayWrite) {
      tds += '<td>' + (adStr(r.item_id)
        ? '<button class="minibtn" data-load="' + adAttr(adStr(r._row)) + '">Load into editor</button>'
        : '') + '</td>';
    }
    return '<tr class="' + (kind === AD_KIND_WATCH ? 'ad-r-watch' : 'ad-r') + '">' + tds + '</tr>';
  }

  /** What this particular tab can and cannot carry — said plainly, because it changes what a
      recorded decision row will contain. */
  function adLayoutNote(layout, d) {
    var bits = [];
    if (!adStr(layout.title_header)) {
      bits.push('This tab has <b>no header over the title column</b>. The titles above are read from column A; a decision row the portal appends here cannot carry a title, because no column is ever created on a business sheet.');
    }
    if (layout.campaign_before_item) {
      bits.push('This tab heads <b>Campaign before Item ID</b> — the table follows the tab, not the other five.');
    }
    if (adStr(layout.past_header)) {
      bits.push('Past-behaviour column on this tab: <b>' + esc(adStr(layout.past_header)) + '</b>.');
    }
    bits.push('A day opens with its date repeated across the first five columns; those separator rows and the day-status line are shown as they are, never as decisions.');
    return '<div class="ad-box"><span class="ad-k">This tab, exactly as it is</span><div class="ad-txt">' +
      bits.join('<br>') + '</div>' +
      (adStr(d.tab) ? '<div class="ad-sub2" style="margin-top:7px">Tab: ' + esc(adStr(d.tab)) + '</div>' : '') + '</div>';
  }

  function adWireRowButtons(box) {
    var btns = box.querySelectorAll('button[data-load]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { adLoadRowIntoEditor(AD.rows[b.getAttribute('data-load')]); };
      })(btns[i]);
    }
  }

  function adLoadRowIntoEditor(r) {
    if (!r) { return; }
    var set = function (id, v) { var el = $(id); if (el) { el.value = adRaw(v); } };
    set('adItem', r.item_id);
    set('adPpcTitle', r.listing_title);
    set('adPpcCampaign', r.campaign);
    set('adPpcPast', r.past_behaviour);
    var chk = $('adPpcOn');
    if (chk && !chk.checked) { chk.checked = true; adTogglePpcFields(); }
    var el = $('adItem');
    if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    toast('Loaded item ' + adStr(r.item_id) + ' into the editor.');
  }

  // ---------- §8.7 + §14 the campaign editor ----------
  function adRenderEditor() {
    var box = $('adEditor');
    if (!box) { return; }
    var s = AD.suggest || {}, camps = s.main_sheet_campaigns || [], added = s.added_in_another_campaign || [];
    var decisions = s.decisions || [], inUse = s.campaigns_in_use || [], tiers = s.sop_tiers || [];
    var layout = (AD.ppc && AD.ppc.layout) || {};

    if (!AD.mayWrite) {
      box.innerHTML = '<div class="ad-empty">Campaigns are changed by Management, the Team Lead, the Advertising Manager and Customer Service.' +
        '<span>Everything above is yours to read.</span></div>';
      return;
    }

    box.innerHTML =
      adNotifyBanner() +
      '<div class="ad-grid" style="margin-top:13px">' +
        '<div class="field" style="margin-top:0"><label>Account</label>' +
          '<input class="ad-in" id="adEdAcc" type="text" value="' + adAttr(AD.account) + '" readonly></div>' +
        '<div class="field" style="margin-top:0"><label>eBay Item No</label>' +
          '<input class="ad-in mono" id="adItem" type="text" inputmode="numeric" autocomplete="off" placeholder="123456789012"></div>' +
        '<div class="field" style="margin-top:0"><label>Campaign Selection</label>' +
          '<select class="ad-sel" id="adCampaign">' +
            (camps.length
              ? '<option value=""></option>' + camps.map(function (c) {
                return '<option value="' + adAttr(c) + '">' + esc(adStr(c)) + '</option>';
              }).join('')
              : '<option value="">Loading…</option>') +
          '</select></div>' +
        '<div class="field" style="margin-top:0"><label>Note for the other side (optional)</label>' +
          '<input class="ad-in" id="adNote" type="text" autocomplete="off" placeholder="why this campaign, in one line"></div>' +
      '</div>' +
      '<div class="ad-box ad-blue"><span class="ad-k">The two campaign vocabularies</span>' +
        '<div class="ad-txt">The three values above are the Main Sheet&#39;s own dropdown and the only ones this change may write. ' +
        'The <b>campaign name on the PPC tab</b> below is free text — the seven SOP tiers are suggestions, and a name already on ' +
        'this tab is never rewritten. Reusing a name the tab already carries is how a listing moves tier without losing its selling history.</div></div>' +

      '<div class="ad-btns" style="margin-top:14px">' +
        '<label class="ad-sub2" style="display:flex;gap:8px;align-items:center;cursor:pointer">' +
          '<input type="checkbox" id="adPpcOn"> Also record the decision row on ' + esc(adStr(AD.account)) + '&#39;s PPC tab</label>' +
      '</div>' +

      '<div class="hidden" id="adPpcFields">' +
        '<div class="ad-grid" style="margin-top:12px">' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.title_header) || 'Listing Title') + '</label>' +
            '<input class="ad-in" id="adPpcTitle" type="text" autocomplete="off"' +
            (adStr(layout.title_header) ? '' : ' disabled placeholder="this tab heads no title column — nothing is written here"') + '></div>' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.campaign_header) || 'Campaign') + ' <span class="ad-sub2">free text</span></label>' +
            '<input class="ad-in" id="adPpcCampaign" type="text" autocomplete="off" list="adCampList" placeholder="a name this tab already uses, or a new one">' +
            '<datalist id="adCampList">' + inUse.map(function (c) {
              return '<option value="' + adAttr(c) + '"></option>';
            }).join('') + '</datalist></div>' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.decision_header) || 'Decision') + '</label>' +
            '<input class="ad-in" id="adPpcDecision" type="text" autocomplete="off" list="adDecList" placeholder="free text on this tab">' +
            '<datalist id="adDecList">' + decisions.map(function (c) {
              return '<option value="' + adAttr(c) + '"></option>';
            }).join('') + '</datalist></div>' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.reason_header) || 'Reason to stop') + '</label>' +
            '<input class="ad-in" id="adPpcReason" type="text" autocomplete="off"></div>' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.added_header) || 'Added in another campaign') + '</label>' +
            '<select class="ad-sel" id="adPpcAdded"><option value=""></option>' + added.map(function (c) {
              return '<option value="' + adAttr(c) + '">' + esc(adStr(c)) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field" style="margin-top:0"><label>' + esc(adStr(layout.past_header) || 'Past behaviour (7 days)') + '</label>' +
            '<input class="ad-in" id="adPpcPast" type="text" autocomplete="off"></div>' +
        '</div>' +
        '<div class="field" style="margin-top:12px"><label>' + esc(adStr(layout.comment_header) || 'Comment') + '</label>' +
          '<textarea class="ad-ta" id="adPpcComment"></textarea></div>' +
        (tiers.length ? adTierCard(tiers) : '') +
        '<div class="ad-box"><span class="ad-k">How this row lands</span><div class="ad-txt">The portal <b>appends</b> a row — it never edits one. ' +
        'That is this tab&#39;s own daily-batch convention: each day&#39;s block restates the items it touched. A column the tab does not head is skipped, ' +
        'never created.</div></div>' +
      '</div>' +

      '<div class="ad-btns"><button class="btn-gold" id="adSend">Change the campaign</button>' +
        '<span class="ad-sub2">You confirm on the next step — nothing is sent yet.</span></div>' +
      '<div class="ad-box ad-gold hidden" id="adConfirm"><span class="ad-k">Confirm</span>' +
        '<div class="ad-txt" id="adConfirmTxt"></div>' +
        '<div class="ad-btns"><button class="btn-gold" id="adConfirmYes">Yes — change it and tell the other side</button>' +
          '<button class="minibtn" id="adConfirmNo">Cancel</button></div></div>';

    $('adPpcOn').onchange = adTogglePpcFields;
    $('adSend').onclick = adAskConfirm;
    $('adConfirmNo').onclick = function () {
      $('adConfirm').classList.add('hidden');
      $('adSend').parentNode.classList.remove('hidden');
    };
    $('adConfirmYes').onclick = adSendCampaign;
    adWireTiers(box);
  }

  /** §14, both directions. The server decides who is told from the signed-in role (RL-1) and the
      receipt names them — this banner only sets the expectation. */
  function adNotifyBanner() {
    var role = adRole(), who;
    if (adIsMgmt()) { who = 'the <b>Advertising Manager</b> is notified the moment it lands'; }
    else if (role === 'Advertising Manager') { who = '<b>Management</b> is notified the moment it lands'; }
    else { who = 'both <b>Advertising</b> and <b>Management</b> are notified the moment it lands'; }
    return '<div class="ad-box ad-warnb" style="margin-top:0"><span class="ad-k">Changing a campaign notifies the other side</span>' +
      '<div class="ad-txt">This is not a private edit. When you change a campaign, ' + who + ', the old and new values are written to the ' +
      'campaign log with your name against them, and the item&#39;s open campaign task is shown to you. Who is told is decided by the server from ' +
      'your signed-in role, not by this screen.</div></div>';
  }

  function adTierCard(tiers) {
    var i, t, chips = '';
    for (i = 0; i < tiers.length; i++) {
      t = tiers[i];
      chips += '<button class="ad-tier" data-tier="' + adAttr(adStr(t.name)) + '">' +
        esc('Tier ' + adStr(t.tier) + ' · ' + adStr(t.name)) +
        '<span>' + esc(adStr(t.model) + ' · ' + adStr(t.budget)) + '</span>' +
        '<span>' + esc(adStr(t.entry)) + '</span></button>';
    }
    return '<div class="ad-box ad-gold"><span class="ad-k">Advertising SOP v2.0 — the seven tiers</span>' +
      '<div class="ad-txt">Suggestions for naming, nothing more: these names do not appear on the live PPC tabs, so tapping one fills the free-text ' +
      'campaign name and leaves every existing name alone.</div><div class="ad-tiers">' + chips + '</div></div>';
  }

  function adWireTiers(box) {
    var btns = box.querySelectorAll('button[data-tier]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          var el = $('adPpcCampaign');
          if (el) { el.value = b.getAttribute('data-tier'); el.focus(); }
        };
      })(btns[i]);
    }
  }

  function adTogglePpcFields() {
    var on = $('adPpcOn') && $('adPpcOn').checked;
    var box = $('adPpcFields');
    if (box) { box.classList.toggle('hidden', !on); }
  }

  function adCampaignPayload() {
    var item = adStr($('adItem').value), campaign = adStr($('adCampaign').value);
    var payload = { account: AD.account, item_id: item, campaign: campaign, comment: adStr($('adNote').value) };
    if ($('adPpcOn') && $('adPpcOn').checked) {
      var title = $('adPpcTitle');
      var ppc = {
        listing_title: title && !title.disabled ? adStr(title.value) : '',
        campaign: adStr($('adPpcCampaign').value),
        decision: adStr($('adPpcDecision').value),
        reason_to_stop: adStr($('adPpcReason').value),
        added_in_another_campaign: adStr($('adPpcAdded').value),
        past_behaviour: adStr($('adPpcPast').value),
        comment: adStr($('adPpcComment').value)
      };
      // An all-blank row is not sent: the server would read the tab, find nothing worth writing
      // beyond the item number and append nothing. Saying nothing is cheaper and honest.
      var filled = false, k;
      for (k in ppc) { if (Object.prototype.hasOwnProperty.call(ppc, k) && ppc[k]) { filled = true; } }
      if (filled) { payload.ppc = ppc; }
    }
    return payload;
  }

  function adAskConfirm() {
    var p = adCampaignPayload();
    if (!/^\d{9,15}$/.test(p.item_id)) { toast('An eBay Item No is 9 to 15 digits.'); $('adItem').focus(); return; }
    if (!p.campaign) { toast('Pick the campaign from the Main Sheet&#39;s own list.'); $('adCampaign').focus(); return; }
    $('adConfirmTxt').innerHTML = 'Item <b class="mono">' + esc(p.item_id) + '</b> on <b>' + esc(p.account) + '</b> becomes <b>' + esc(p.campaign) + '</b>' +
      (p.ppc ? ', and a decision row is appended to this account&#39;s PPC tab' : '') + '. The other side is told.';
    $('adConfirm').classList.remove('hidden');
    $('adSend').parentNode.classList.add('hidden');
  }

  function adSendCampaign() {
    var btn = $('adConfirmYes'), p = adCampaignPayload();
    btn.disabled = true;
    api('setCampaign', p).then(function (res) {
      btn.disabled = false;
      $('adConfirm').classList.add('hidden');
      $('adSend').parentNode.classList.remove('hidden');
      adShowReceipt(res);
      if (res && res.changed) {
        toast('Campaign changed · ' + ((res.notified_to || []).join(' and ') || 'logged') + ' notified.');
        $('adItem').value = '';
        adLoadPpc();
      } else if (res && res.already_set) {
        toast('Already on that campaign — nothing was written and nobody was notified.');
      } else {
        toast('Not changed — see the receipt.');
      }
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not changed: ' + e.message);
    });
  }

  /** One change, told honestly: what moved, who was told, whether the live sheet was actually
      written (SHADOW MODE holds the write and says so), and the open campaign task for the item. */
  function adShowReceipt(res) {
    var box = $('adReceipt');
    if (!box || !res) { return; }
    var rows = '';
    rows += adRow('Item', '<span class="mono">' + esc(adStr(res.item_id)) + '</span> · ' + esc(adStr(res.account)));
    if (adStr(res.listing_title)) { rows += adRow('Listing', esc(adStr(res.listing_title))); }

    if (res.changed) {
      rows += adRow('Campaign Selection', '<span class="ad-dim">' + esc(adStr(res.previous_campaign) || 'no campaign') + '</span> → <b>' + esc(adStr(res.campaign)) + '</b>');
      // 'Current Campaign Selection' mirrors what eBay actually runs and is the sync's column, not
      // the portal's — it is empty on every live row, so an empty value is reported as unknown.
      rows += adRow('Live on eBay', adStr(res.current_campaign)
        ? esc(adStr(res.current_campaign))
        : '<span class="ad-sub2">not reported by the sync yet — this is the column the ALARM feed compares against</span>');
      rows += adRow('Notified', esc((res.notified_to || []).join(' · ')) || '<span class="ad-sub2">logged</span>');
      rows += adRow('Main Sheet', adSheetLine(res.sheet, 'row ' + esc(adStr(res.row))));
      if (res.ppc) { rows += adRow('PPC tab', adSheetLine(res.ppc, '')); }
      if (res.campaign_set_task) {
        rows += adRow('Campaign task', '<span class="mono">' + esc(adStr(res.campaign_set_task.task_id)) + '</span> · ' +
          esc(adStr(res.campaign_set_task.status)) + ' · with ' + esc(adStr(res.campaign_set_task.assigned_to)) +
          ' <span class="ad-sub2">approval is the only path to completed</span>');
      }
    } else if (res.already_set) {
      rows += adRow('Nothing to do', 'Already on <b>' + esc(adStr(res.campaign)) + '</b>. No write, no log line, no notification.');
    } else {
      rows += adRow('Not changed', '<span class="ad-sub2">' + esc(adStr(res.sheet && res.sheet.reason) || 'not connected yet') + '</span>');
    }

    box.innerHTML = '<div class="card enter d1" style="margin-top:16px"><div class="hd">' +
      (res.changed ? 'Campaign changed — here is what happened' : 'Nothing was changed') +
      (res.shadow ? ' <span class="pill ad-p-pin">pilot gate</span>' : '') + '</div>' +
      '<div class="bd">' + rows +
      (res.shadow ? '<div class="ad-box ad-warnb"><span class="ad-k">Pilot gate</span><div class="ad-txt">The portal recorded this change and told the ' +
        'other side, but the live workbook was <b>not</b> written — external writes are held. Nothing on the business sheet moved.</div></div>' : '') +
      '<div class="ad-btns"><button class="minibtn" id="adRcClose">Close</button></div></div></div>';
    var c = $('adRcClose');
    if (c) { c.onclick = function () { box.innerHTML = ''; }; }
  }

  function adRow(k, v) {
    return '<div class="tl-row"><span class="k">' + esc(k) + '</span><span>' + v + '</span></div>';
  }

  /** A SheetBridge result in one line — the tab and the columns it touched. The spreadsheet id it
      also returns is deliberately never rendered: the built page carries no map to the data (RL-9). */
  function adSheetLine(r, tail) {
    if (!r) { return '<span class="ad-sub2">nothing to write</span>'; }
    if (!r.ok) { return '<span class="ad-sub2">' + esc(adStr(r.reason) || 'not written') + '</span>'; }
    var w = r.shadow && r.wouldWrite ? r.wouldWrite : r;
    var written = (w.written || []).join(' · ');
    var missing = (w.skippedMissing || []).join(' · ');
    return (r.shadow ? '<span class="pill ad-p-pin">held by the pilot gate</span> ' : '') +
      esc(adStr(w.tab)) + (tail ? ' · ' + tail : '') +
      (written ? ' · <span class="ad-sub2">' + esc(written) + '</span>' : '') +
      (missing ? ' · <span class="ad-sub2">not on this tab: ' + esc(missing) + '</span>' : '');
  }

  // ============================== VIEW: WRONG ADVERTISING (§8.7) ==============================
  VIEWS.wrongAds = {
    label: 'Wrong advertising',
    icon: '<path d="M12 3 2.6 20h18.8L12 3z"/><path d="M12 9.5v5"/><path d="M12 17.6h.01"/>',
    roles: AD_VIEW_ROLES,
    order: 24,
    badge: function () { return (STATE.counts && STATE.counts.wrongAds) || 0; },
    render: function () {
      if (!adMaySeeAlarms()) {
        // The server refuses this read for any other role, so the screen says why instead of
        // showing an error that looks like a fault.
        return '<div class="hgroup enter d1"><h1>Wrong advertising</h1>' +
            '<span class="sub">The ALARM feed of every account</span></div>' +
          '<div class="card enter d2"><div class="bd"><div class="ad-empty">This alarm feed goes to Management and Advertising.' +
            '<span>Your version carries the PPC decision tables and the campaign editor instead.</span></div></div></div>';
      }
      return '<div class="hgroup enter d1"><h1>Wrong advertising</h1>' +
          '<span class="sub">The campaign Management wants against the campaign live on eBay — every row costs money</span>' +
          '<select class="ad-sel" id="adAlAcc" style="margin-left:auto"><option value="">All accounts</option></select>' +
          '<select class="ad-sel" id="adAlStatus"></select>' +
          '<button class="minibtn" id="adAlRefresh">Refresh</button>' +
        '</div>' +
        '<div id="adAlTotals"></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">ALARM rows ' +
          '<span class="hint" id="adAlHint">read-only from each account&#39;s Wrong Advertising tab</span></div>' +
          '<div class="bd" id="adAlList"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      if (!adMaySeeAlarms()) { return; }
      adFillStatus();
      $('adAlStatus').onchange = function () { AD.alarmStatus = adStr(this.value); adLoadAlarms(); };
      $('adAlRefresh').onclick = adLoadAlarms;
      adFillAlarmAccounts();
      adLoadAccounts(function () { adFillAlarmAccounts(); });
      adLoadAlarms();
    }
  };

  function adFillStatus() {
    var sel = $('adAlStatus');
    if (!sel) { return; }
    sel.innerHTML = AD.alarmStatuses.map(function (s) {
      return '<option value="' + adAttr(s) + '"' + (s === AD.alarmStatus ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('') + '<option value="' + AD_ALL + '"' + (AD.alarmStatus === AD_ALL ? ' selected' : '') + '>' + esc(AD_ALL) + '</option>';
  }

  function adFillAlarmAccounts() {
    var sel = $('adAlAcc');
    if (!sel) { return; }
    sel.innerHTML = adAccountOptions(AD.alarmAccount, 'All accounts');
    sel.onchange = function () { AD.alarmAccount = adStr(sel.value); adLoadAlarms(); };
  }

  function adLoadAlarms() {
    var list = $('adAlList');
    if (!list) { return; }
    list.innerHTML = '<div class="spinner"></div>';
    var payload = { status: AD.alarmStatus };
    if (adStr(AD.alarmAccount)) { payload.account = AD.alarmAccount; }
    api('wrongAdvertising', payload).then(function (d) {
      AD.alarms = (d && d.alarms) || [];
      // The statuses the sheet actually uses come back with the payload; the two constants above
      // are only what the picker is built with before the first answer arrives.
      if (d && d.statuses && d.statuses.length && d.statuses.join('|') !== AD.alarmStatuses.join('|')) {
        AD.alarmStatuses = d.statuses;
        adFillStatus();
      }
      adCount('wrongAds', Number(d && d.open) || 0);
      adRenderTotals(d);
      adRenderAlarms(d);
    }).catch(function (e) {
      list.innerHTML = adRetry('The alarm feed could not be read just now.', e.message, 'adAlRetry');
      var r = $('adAlRetry');
      if (r) { r.onclick = adLoadAlarms; }
    });
  }

  /** The money, summed from the sheet's own two columns and from nothing else — no figure here is
      recomputed, and a role whose payload carries no profit fields simply gets no strip (RL-4). */
  function adRenderTotals(d) {
    var box = $('adAlTotals');
    if (!box) { return; }
    var open = 0, raw = 0, net = 0, money = 0, negatives = 0, i, a, rv, nv;
    for (i = 0; i < AD.alarms.length; i++) {
      a = AD.alarms[i];
      if (adStr(a.status_effective) !== AD_OPEN) { continue; }
      open++;
      rv = adNum(adRawProfit(a));
      nv = adNum(a.net_after_cpc);
      if (!isNaN(rv)) { raw += rv; money++; }
      if (!isNaN(nv)) { net += nv; if (nv < 0) { negatives++; } }
    }
    var figs =
      '<div class="ad-fig' + (open ? ' ad-bad' : ' ad-okf') + '"><span class="ad-k">Open alarms</span><b class="num">' + open + '</b>' +
        '<span class="ad-note">' + esc(((d && d.count) || 0) + ' row' + (((d && d.count) || 0) === 1 ? '' : 's') + ' in this filter · ' +
        ((d && d.accounts && d.accounts.length) || 0) + ' account(s) scanned') + '</span></div>';
    if (money) {
      figs += '<div class="ad-fig"><span class="ad-k">Raw profit, open rows</span><b class="num">' + esc('£' + raw.toFixed(2)) + '</b>' +
          '<span class="ad-note">what these listings make before the ad spend</span></div>' +
        '<div class="ad-fig' + (net <= 0 ? ' ad-bad' : ' ad-warnf') + '"><span class="ad-k">Net after CPC, open rows</span><b class="num">' + esc('£' + net.toFixed(2)) + '</b>' +
          '<span class="ad-note">the sheet&#39;s own figure, summed — never recomputed here</span></div>' +
        '<div class="ad-fig ad-warnf"><span class="ad-k">Taken by ads</span><b class="num">' + esc('£' + (raw - net).toFixed(2)) + '</b>' +
          '<span class="ad-note">' + esc('the gap between the two columns above' + (negatives ? ' · ' + negatives + ' row(s) already below zero' : '')) + '</span></div>';
    }
    box.innerHTML = '<div class="card enter d1"><div class="hd">Money on these alarms ' +
      '<span class="hint">open rows only</span></div><div class="bd"><div class="ad-tot">' + figs + '</div>' +
      '<div class="ad-box ad-badb"><span class="ad-k">Why this feed exists</span><div class="ad-txt">Every row is a listing running a campaign ' +
      'Management did not ask for. Until it is put back, the ad spend is coming out of the margin on every sale.</div></div></div></div>';
  }

  function adRenderAlarms(d) {
    var list = $('adAlList'), i, h = '';
    if (!list) { return; }
    if ($('adAlHint')) {
      $('adAlHint').textContent = ((d && d.count) || 0) + ' row(s) · ' + ((d && d.open) || 0) + ' open · read-only from the sheet';
    }
    if (!AD.alarms.length) {
      list.innerHTML = '<div class="ad-empty">No ' + esc(AD.alarmStatus === AD_ALL ? '' : AD.alarmStatus + ' ') + 'alarm in this filter.' +
        '<span>The scan also runs on its own — Management and Advertising are told the moment a new one appears.</span></div>' +
        adNotConnected(d);
      return;
    }
    for (i = 0; i < AD.alarms.length; i++) { h += adAlarmCard(AD.alarms[i]); }
    list.innerHTML = h + adNotConnected(d) + adResolveNote();
    adWireAlarms(list);
  }

  function adNotConnected(d) {
    var nc = (d && d.not_connected) || [], i, bits = [];
    if (!nc.length) { return ''; }
    for (i = 0; i < nc.length; i++) {
      bits.push(esc(adStr(nc[i].account)) + ' — ' + esc(adStr(nc[i].reason) || 'not connected yet'));
    }
    return '<div class="ad-box"><span class="ad-k">Not scanned</span><div class="ad-txt">' + bits.join('<br>') + '</div></div>';
  }

  function adResolveNote() {
    return '<div class="ad-box ad-blue"><span class="ad-k">How clearing one works</span><div class="ad-txt">' +
      'The Status and Resolved cells on the Wrong Advertising tab belong to the business — this screen never writes them. ' +
      'Clearing an alarm here records <b>who cleared it, when, and the note</b> in the portal&#39;s own signal ledger, appended so the whole trail is kept, ' +
      'and tells Management and Advertising. A row the sheet already marks resolved is closed and carries no button.</div></div>';
  }

  function adAlarmCard(a) {
    var open = adStr(a.status_effective) === AD_OPEN;
    var key = adStr(a.signal_key);
    var wants = adStr(a.manager_wants), live = adStr(a.live_on_ebay);
    var rawV = adRawProfit(a), netV = a.net_after_cpc;
    var rawN = adNum(rawV), netN = adNum(netV);
    var eaten = (!isNaN(rawN) && !isNaN(netN)) ? rawN - netN : NaN;
    var share = (!isNaN(eaten) && !isNaN(rawN) && rawN > 0) ? Math.round((eaten / rawN) * 100) : NaN;

    var figs = '';
    if (adStr(rawV) || adStr(netV)) {
      figs = '<div class="ad-figs">' +
        '<div class="ad-fig"><span class="ad-k">Raw profit £</span><b class="num">' + adMoneyText(rawV) + '</b>' +
          '<span class="ad-note">before the ad spend</span></div>' +
        '<div class="ad-fig ' + (!isNaN(netN) && netN <= 0 ? 'ad-bad' : 'ad-warnf') + '"><span class="ad-k">Net after CPC £</span><b class="num">' + adMoneyText(netV) + '</b>' +
          '<span class="ad-note">' + (!isNaN(netN) && netN <= 0 ? 'every sale on this listing loses money' : 'what is actually left per sale') + '</span></div>' +
        (isNaN(eaten) ? '' :
          '<div class="ad-fig ad-warnf"><span class="ad-k">Taken by ads</span><b class="num">' + esc('£' + eaten.toFixed(2)) + '</b>' +
            '<span class="ad-note">' + esc('the gap between the two figures on the sheet' + (isNaN(share) ? '' : ' · ' + share + '% of the raw profit')) + '</span></div>') +
      '</div>';
    }

    return '<div class="ad-alarm' + (open ? '' : ' ad-done') + '">' +
      '<div class="ad-alarm-h">' +
        '<span class="ad-tag">' + esc(adStr(a.type) || 'ALARM') + '</span>' +
        '<span class="ad-name">' + esc(adStr(a.listing_title) || 'Listing') + '</span>' +
        '<span class="pill ' + (open ? 'ad-p-open' : 'ad-p-res') + '">' + esc(adStr(a.status_effective)) + '</span>' +
        (a.pinned ? '<span class="pill ad-p-pin">Pinned until cleared</span>' : '') +
      '</div>' +
      '<div class="ad-vs">' +
        '<div class="ad-side ad-want"><span class="ad-k">Manager wants</span><b>' + esc(wants || 'not stated') + '</b>' +
          '<span class="ad-sub2">' + esc(adStr(a.manager_wants_source) || 'this column is empty on the tab') + '</span></div>' +
        '<div class="ad-ne">≠</div>' +
        '<div class="ad-side ad-live"><span class="ad-k">Live on eBay</span><b>' + esc(live || 'unknown') + '</b>' +
          '<span class="ad-sub2">what the campaign sync last saw running</span></div>' +
      '</div>' +
      figs +
      '<div class="ad-meta">' +
        '<span class="ad-chip"><span class="k">Item No</span><span class="mono">' + esc(adStr(a.item_id) || '—') + '</span></span>' +
        '<span class="ad-chip"><span class="k">Account</span>' + esc(adStr(a.account)) + '</span>' +
        '<span class="ad-chip"><span class="k">Raised</span>' + esc(adSheetDate(a.date)) + '</span>' +
        (adStr(a.status) ? '<span class="ad-chip"><span class="k">Sheet status</span>' + esc(adStr(a.status)) + '</span>' : '') +
        (adStr(a.resolved_at) ? '<span class="ad-chip"><span class="k">Resolved</span>' + esc(adStr(a.resolved_at)) + '</span>' : '') +
        (adStr(a.signalled_at) ? '<span class="ad-chip"><span class="k">Signalled</span>' + esc(adStr(a.signalled_at)) + '</span>' : '') +
      '</div>' +
      (adStr(a.acknowledged_by)
        ? '<div class="ad-box"><span class="ad-k">Cleared by</span><div class="ad-txt">' + adText(a.acknowledged_by) + '</div></div>'
        : '') +
      (a.resolved_on_sheet
        ? '<div class="ad-btns"><span class="ad-sub2">Closed on the sheet itself — the portal adds nothing to a row the business has already resolved.</span></div>'
        : '<div class="ad-res">' +
            '<input class="ad-in" type="text" autocomplete="off" data-note="' + adAttr(key) + '" placeholder="what you did about it (optional)">' +
            '<button class="minibtn" data-ack="' + adAttr(key) + '">' + (a.acknowledged ? 'Add to the trail' : 'Mark cleared') + '</button>' +
          '</div>') +
    '</div>';
  }

  function adWireAlarms(box) {
    var btns = box.querySelectorAll('button[data-ack]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { adAcknowledge(box, b.getAttribute('data-ack'), b); };
      })(btns[i]);
    }
  }

  function adAcknowledge(box, key, btn) {
    var a = null, i, note;
    for (i = 0; i < AD.alarms.length; i++) { if (adStr(AD.alarms[i].signal_key) === key) { a = AD.alarms[i]; } }
    if (!a) { return; }
    note = adPick(box, 'data-note', key);
    btn.disabled = true;
    // The alarm is keyed by account + item + its own timestamp, so the date is sent back exactly as
    // it arrived: a second alarm on the same item later the same day is a different alarm.
    api('wrongAdvertising', {
      acknowledge: true,
      account: adStr(a.account),
      item_id: adStr(a.item_id),
      date: adStr(a.date),
      note: note ? adStr(note.value) : ''
    }).then(function () {
      toast('Cleared — Management and Advertising were told.');
      adLoadAlarms();
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not cleared: ' + e.message);
    });
  }

})();
