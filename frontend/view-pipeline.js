/* view-pipeline.js — §8 THE PRODUCT PIPELINE as one board, and §8.0 as its clock.
 * View: pipeline (Hunted · Approved · Listing · CPC research · Live + campaign · Revision).
 * Backend (read-only): huntQueue · myListingWork · potentialCpcQueue · connectionHealth.
 * Nothing on this screen writes. A card is a door to the screen that owns the work. */
(function () {

  var PL_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Listing Manager'];

  /* The router answers every denial with the same generic message (RL-9), so the client cannot
     tell "not your version" from "backend broke" after the fact. These mirror the server's own
     gates only to decide WHAT TO ASK FOR; the server stays the sole authority on access. */
  var PL_HUNT_ROLES = ['Management', 'Ops Head', 'Team Lead'];          // Hunting.gs HUNT_QUEUE_ROLES
  var PL_POTCPC_ROLES = ['Management', 'Ops Head', 'Team Lead'];        // PotentialCpc.gs: mgmt decides, TL views

  /* Task vocabulary — must match Tasks.gs character for character (em dash included). */
  var PL_COMPLETED = 'Completed';
  var PL_SUBMITTED = 'Submitted — awaiting approval';

  /* Hunting.gs canonical outcomes. The live sheet spells them 'APRROVED' / 'NOT APRROVED' among
     seven variants; the backend folds them, so we read approval_status, never the raw cell. */
  var PL_HUNT_APPROVED = 'APPROVED';
  var PL_HUNT_NOT_APPROVED = 'NOT APPROVED';

  /* PotentialCpc.gs POTCPC_STATUSES. */
  var PL_POT_SUBMITTED = 'Submitted';
  var PL_POT_APPROVED = 'Approved';

  /* §8.0 — the binding windows are UK time (Organizational Structure doc v1.2 §5). They are
     printed as the business clock; everything else on this board is PKT. The dated conversion
     comes from the backend (listingChain_), never from arithmetic here. */
  var PL_WINDOWS = [
    { k: 'Day 0', t: 'New listings go live', uk: '7:00 PM UK' },
    { k: '+72 hours', t: 'Real revision of the dummy listing', uk: '1:00 PM – 5:00 PM UK' },
    { k: 'Same day', t: 'Campaign testing window', uk: '5:00 PM – 10:00 PM UK' }
  ];

  /* Sibling Phase-4 screens register their own keys; the first one that exists and is in this
     user's version wins, and My tasks is the floor that always exists. */
  var PL_GO_HUNT = ['hunting', 'hunts', 'huntqueue', 'hunt', 'tasks'];
  var PL_GO_LIST = ['listing', 'listings', 'mylisting', 'listingwork', 'tasks'];
  var PL_GO_CPC = ['cpc', 'cpcresearch', 'research', 'potentialcpc', 'tasks'];
  var PL_GO_POT = ['potentialcpc', 'potcpc', 'potential', 'cpc', 'tasks'];

  var PL_COLS = [
    { key: 'hunted', label: 'Hunted', hint: 'waiting on Management', go: PL_GO_HUNT },
    { key: 'approved', label: 'Approved', hint: 'account · lister · ad type set', go: PL_GO_HUNT },
    { key: 'listing', label: 'Listing', hint: 'dummy listing → Item ID', go: PL_GO_LIST },
    { key: 'cpc', label: 'CPC research', hint: 'keywords before any campaign', go: PL_GO_CPC },
    { key: 'live', label: 'Live + campaign', hint: 'Item ID in · campaign next', go: PL_GO_LIST, gold: true },
    { key: 'revision', label: 'Revision', hint: '+72 hours and ad-hoc', go: PL_GO_LIST }
  ];

  var PL_MAX_CARDS = 10;
  var PL_WARN_MIN = 4320;    // 3 days in a column
  var PL_BAD_MIN = 10080;    // 7 days in a column

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.pl-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(248px,1fr);gap:14px;align-items:start;padding-bottom:6px}' +
    '.pl-col{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--gold-line);border-radius:var(--radius);overflow:hidden;transition:border-color .2s}' +
    '.pl-col:hover{border-color:var(--gold-line-hi)}' +
    '.pl-bar{height:3px;background:linear-gradient(90deg,var(--blue-deep),var(--blue-2))}' +
    '.pl-gold .pl-bar{background:linear-gradient(90deg,var(--gold-c),var(--gold-a) 45%,var(--gold-b))}' +
    '.pl-ch{display:flex;align-items:center;gap:8px;padding:12px 14px 0}' +
    '.pl-ch b{font-size:13px;font-weight:800}' +
    '.pl-cn{margin-left:auto;font-size:11.5px;font-weight:800;color:var(--text-3);background:rgba(120,132,152,.16);border-radius:99px;padding:1px 9px}' +
    '.pl-gold .pl-cn{color:var(--gold-a);background:linear-gradient(135deg,rgba(233,169,60,.20),rgba(233,169,60,.04));border:1px solid var(--gold-line-hi)}' +
    '.pl-chint{padding:4px 14px 10px;font-size:11px;color:var(--text-3);font-weight:700;line-height:1.45}' +
    '.pl-body{padding:0 10px 12px;display:flex;flex-direction:column;gap:8px}' +
    '.pl-card{display:block;width:100%;text-align:left;padding:10px 11px;border:1px solid var(--gold-line);border-radius:10px;background:rgba(120,132,152,.06);font:inherit;color:var(--text);cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}' +
    '.pl-card:hover{border-color:var(--blue);box-shadow:var(--glow-blue);transform:translateY(-1px)}' +
    '.pl-card:focus-visible{outline:2px solid var(--blue-2);outline-offset:2px}' +
    '.pl-gold .pl-card:hover{border-color:var(--gold-line-hi);box-shadow:var(--glow-gold)}' +
    '.pl-t{font-weight:800;font-size:12.5px;line-height:1.4;word-break:break-word}' +
    '.pl-m{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:7px}' +
    '.pl-acc{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--blue-2);background:var(--blue-soft);border-radius:99px;padding:2px 8px}' +
    '.pl-id{color:var(--text-3)}' +
    '.pl-chip{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(120,132,152,.18);color:var(--text-2)}' +
    '.pl-chip.b{color:var(--blue-2);background:var(--blue-soft)}' +
    '.pl-chip.g{color:var(--gold-a);background:linear-gradient(135deg,rgba(233,169,60,.20),rgba(233,169,60,.04));border:1px solid var(--gold-line-hi)}' +
    '.pl-chip.w{color:var(--warn);background:var(--warn-soft)}' +
    '.pl-chip.r{color:var(--bad);background:var(--bad-soft)}' +
    '.pl-note{margin-top:7px;font-size:11.5px;color:var(--text-2);font-weight:600;line-height:1.45;word-break:break-word}' +
    '.pl-f{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;font-weight:700}' +
    /* min-width:0 lets a long staff email ellipsise instead of pushing the card past 390px. */
    '.pl-who{flex:1 1 auto;min-width:0;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pl-age{margin-left:auto;color:var(--text-3);white-space:nowrap}' +
    '.pl-age.warn{color:var(--warn)}.pl-age.bad{color:var(--bad)}' +
    '.pl-empty{padding:8px 4px 4px;font-size:11.5px;color:var(--text-3);font-weight:600;line-height:1.5}' +
    '.pl-more{padding:4px 4px 0;font-size:11px;font-weight:800;color:var(--blue-2)}' +
    '.pl-leg{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}' +
    '.pl-leg-i{border:1px solid var(--gold-line);border-radius:10px;padding:11px 12px;background:rgba(120,132,152,.06)}' +
    '.pl-leg-k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--gold-a)}' +
    '.pl-leg-t{font-size:12px;font-weight:700;color:var(--text-2);margin-top:4px;line-height:1.45}' +
    '.pl-leg-w{font-size:13px;font-weight:800;margin-top:7px}' +
    '.pl-leg-p{font-size:11px;font-weight:700;color:var(--text-3);margin-top:3px}' +
    '.pl-conn{display:flex;flex-wrap:wrap;gap:8px}' +
    '.pl-cc{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;color:var(--text-2);border:1px solid var(--gold-line);border-radius:99px;padding:5px 12px}' +
    '.pl-cd{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px rgba(63,207,142,.5)}' +
    '.pl-cc.off{color:var(--text-3)}.pl-cc.off .pl-cd{background:var(--warn);box-shadow:none}' +
    '@media (max-width:880px){' +
      '.pl-board{display:block}.pl-col{margin-bottom:12px}.pl-leg{grid-template-columns:1fr}' +
    '}'
  );

  // ---------- safety (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function plAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function plStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function plHas(arr, v) { return arr.indexOf(v) >= 0; }
  function plRole() { return (STATE.user && STATE.user.role) || ''; }

  /** Account names arrive exactly as the sheets hold them ('SAIF BAHI', 'ABRT', 'Sir Hasib ') —
      shouty, sometimes trailing-spaced. Trim for layout only; never re-case a business value. */
  function plAccount(v) { return plStr(v); }

  // ---------- elapsed time (timezone-free; PKT is only for the clock faces) ----------
  function plMs(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? NaN : d.getTime(); }
  function plMinsText(n) {
    var d, h;
    n = Math.max(0, Math.round(Number(n) || 0));
    if (n < 1) { return 'just now'; }
    if (n < 60) { return n + 'm'; }
    if (n < 1440) { return Math.floor(n / 60) + 'h'; }
    d = Math.floor(n / 1440); h = Math.round((n - d * 1440) / 60);
    return d + 'd' + (d < 7 && h ? ' ' + h + 'h' : '');
  }
  /** How long the card has sat in this column, plus how loudly to say it. */
  function plAge(iso, fallbackMins) {
    var ms = plMs(iso), mins;
    if (!isNaN(ms)) { mins = (Date.now() - ms) / 60000; }
    else if (fallbackMins !== undefined && fallbackMins !== '' && !isNaN(Number(fallbackMins))) { mins = Number(fallbackMins); }
    else { return null; }
    if (mins < 0) { mins = 0; }
    return { text: plMinsText(mins), cls: mins >= PL_BAD_MIN ? ' bad' : (mins >= PL_WARN_MIN ? ' warn' : '') };
  }

  // ---------- deep links ----------
  function plCanSee(v) {
    if (!v) { return false; }
    if (!v.roles || v.roles === '*') { return true; }
    return v.roles.indexOf(plRole()) >= 0;
  }
  function plTarget(cands) {
    var i, v;
    for (i = 0; i < cands.length; i++) {
      v = VIEWS[cands[i]];
      if (v && plCanSee(v)) { return { key: cands[i], label: v.label || cands[i] }; }
    }
    return null;
  }
  /** Click the nav entry so the rail highlight follows; fall back to a plain render. */
  function plOpen(key) {
    var a = document.querySelector('.nav a[data-key="' + key.replace(/"/g, '') + '"]');
    if (a) { a.click(); return; }
    if (typeof renderView === 'function') { renderView(key); return; }
    toast('That screen is not part of your version.');
  }

  // ============================== VIEW ==============================
  VIEWS.pipeline = {
    label: 'Pipeline',
    icon: '<path d="M4 4h5v16H4z"/><path d="M10 4h5v11h-5z"/><path d="M16 4h4v7h-4z"/>',
    roles: PL_ROLES,
    order: 22,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Pipeline</h1>' +
          '<span class="sub">The whole machine, one board · read only · a card opens the screen that owns it</span>' +
          '<button class="minibtn" id="plRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="card enter d1" style="margin-bottom:16px"><div class="hd">The listing clock ' +
          '<span class="hint">§8.0 · UK windows are the business clock</span></div>' +
          '<div class="bd"><div class="pl-leg" id="plLeg">' + plLegend(null) + '</div></div>' +
        '</div>' +
        '<div class="scroll enter d2"><div class="pl-board">' + PL_COLS.map(plColumnShell).join('') + '</div></div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">Sheets behind this board ' +
          '<span class="hint" id="plConnHint">checking…</span></div>' +
          '<div class="bd"><div class="pl-conn" id="plConn"><div class="spinner"></div></div></div>' +
        '</div>';
    },
    init: function () {
      var r = $('plRefresh');
      if (r) { r.onclick = plLoad; }
      plLoad();
    }
  };

  function plLegend(timing) {
    return PL_WINDOWS.map(function (w, i) {
      var extra = '';
      if (timing) {
        if (i === 0 && plStr(timing.go_live_uk)) { extra = plStr(timing.go_live_uk); }
        if (i === 1 && plStr(timing.revision_window_pkt)) { extra = plStr(timing.revision_window_pkt); }
        if (i === 2 && plStr(timing.campaign_window_uk)) { extra = plStr(timing.campaign_window_uk); }
      }
      return '<div class="pl-leg-i">' +
        '<div class="pl-leg-k">' + esc(w.k) + '</div>' +
        '<div class="pl-leg-t">' + esc(w.t) + '</div>' +
        '<div class="pl-leg-w num">' + esc(w.uk) + '</div>' +
        (extra && extra !== w.uk ? '<div class="pl-leg-p num">' + esc(extra) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function plColumnShell(c) {
    return '<section class="pl-col' + (c.gold ? ' pl-gold' : '') + '">' +
      '<div class="pl-bar"></div>' +
      '<div class="pl-ch"><b>' + esc(c.label) + '</b><span class="pl-cn num" id="plN-' + plAttr(c.key) + '">–</span></div>' +
      '<div class="pl-chint" id="plH-' + plAttr(c.key) + '">' + esc(c.hint) + '</div>' +
      '<div class="pl-body" id="plB-' + plAttr(c.key) + '"><div class="spinner"></div></div>' +
    '</section>';
  }

  // ---------- load ----------
  function plWrap(p) {
    return p.then(function (d) { return { ok: true, data: d || {} }; })
            .catch(function (e) { return { ok: false, msg: e && e.message ? e.message : 'request failed' }; });
  }
  function plSkip() { return Promise.resolve({ ok: false, skip: true }); }

  /** The board asks for four things at once and cannot draw a column until they all land, so on a
      slow answer every column sits spinning. If this board has been opened before, it draws the
      previous cards immediately and replaces them when the fresh answer arrives — the same
      paint-now-refresh-underneath idea used on the business overview. Read-only board, so a
      briefly stale card can mislead nobody into acting on it: the screen that owns the item
      re-checks before anything is decided. */
  function plCached() {
    return (typeof cacheRead === 'function') ? cacheRead('pipelineBoard', {}) : null;
  }

  function plLoad() {
    var role = plRole();
    var had = plCached();
    if (had) {
      try { plPaint(had[0], had[1], had[2]); plPaintConn(had[3]); } catch (e) { had = null; }
    }
    if (!had) {
      PL_COLS.forEach(function (c) {
        var b = $('plB-' + c.key);
        if (b) { b.innerHTML = '<div class="spinner"></div>'; }
      });
      var conn = $('plConn');
      if (conn) { conn.innerHTML = '<div class="spinner"></div>'; }
    }

    Promise.all([
      plHas(PL_HUNT_ROLES, role) ? plWrap(api('huntQueue', { status: 'all' })) : plSkip(),
      plWrap(api('myListingWork', { include_completed: 'true' })),
      plHas(PL_POTCPC_ROLES, role) ? plWrap(api('potentialCpcQueue', { status: 'ALL', limit: 200 })) : plSkip(),
      plWrap(api('connectionHealth'))
    ]).then(function (res) {
      plPaint(res[0], res[1], res[2]);
      plPaintConn(res[3]);
      if (typeof cacheWrite === 'function') { cacheWrite('pipelineBoard', {}, res); }
    });
  }

  // ---------- shaping ----------
  /** HUNTING_DB carries no lister and no decision timestamp — the Sheet Contract forbids adding
      either — so an approved hunt is joined to its listing task on the title the task was created
      with. The join keeps one item from standing in two columns at once. */
  function plTitleKey(v) {
    return plStr(v).replace(/^↳\s*/, '').replace(/\s+/g, ' ').toLowerCase();
  }

  function plPaint(huntRes, listRes, potRes) {
    var buckets = { hunted: [], approved: [], listing: [], cpc: [], live: [], revision: [] };
    var hints = {};
    var errs = {};
    var listedTitles = {};
    var notApproved = 0;

    // ---- listing work (mine): Listing · Live + campaign · Revision ----
    if (listRes.ok) {
      var listings = (listRes.data && listRes.data.listings) || [];
      var revisions = (listRes.data && listRes.data.revisions) || [];
      var timing = listRes.data && listRes.data.timing;
      var leg = $('plLeg');
      if (timing && leg) { leg.innerHTML = plLegend(timing); }
      listings.forEach(function (t) {
        var status = plStr(t.status);
        var title = plStr(t.title) || plStr(t.listing && t.listing.Title) || 'Untitled listing';
        listedTitles[plTitleKey(title)] = true;
        var itemId = plStr(t.item_id);
        if (status === PL_COMPLETED && itemId) {
          buckets.live.push({
            title: title, account: t.account, itemId: itemId,
            chips: [{ t: 'Item ID in', c: 'g' }],
            note: 'Campaign and supplier jobs fire from this Item ID.',
            who: 'with Advertising', age: plAge(t.submitted_at || t.created_at), go: PL_GO_LIST
          });
          return;
        }
        if (status === PL_COMPLETED) { return; }
        buckets.listing.push({
          title: title, account: t.account, itemId: itemId,
          chips: [{ t: status === PL_SUBMITTED ? 'Awaiting approval' : status, c: status === PL_SUBMITTED ? 'g' : 'b' }]
            .concat(plDueChip(t.deadline_pkt, status)),
          who: 'with you', age: plAge(t.created_at), go: PL_GO_LIST
        });
      });
      revisions.forEach(function (t) {
        var status = plStr(t.status);
        if (status === PL_COMPLETED) { return; }
        buckets.revision.push({
          title: plStr(t.title) || 'Listing revision',
          account: t.account, itemId: t.item_id,
          chips: (t.is_72h ? [{ t: '+72 hours', c: 'g' }] : [])
            .concat([{ t: status === PL_SUBMITTED ? 'Awaiting approval' : status, c: 'b' }])
            .concat(plDueChip(t.deadline_pkt, status)),
          note: t.is_72h ? 'Revision window 1:00 PM – 5:00 PM UK.' : '',
          who: 'with you', age: plAge(t.created_at), go: PL_GO_LIST
        });
      });
      hints.listing = 'dummy listing → Item ID · your desk';
      hints.revision = '+72 hours and ad-hoc · your desk';
    } else {
      errs.listing = errs.revision = plErr(listRes);
    }

    // ---- hunts: Hunted · Approved ----
    if (huntRes.ok) {
      var hunts = (huntRes.data && huntRes.data.hunts) || [];
      hunts.forEach(function (h) {
        var status = plStr(h.approval_status);
        var title = plStr(h.Title) || plStr(h['Main Keyword Terapeak link']) || 'Untitled hunt';
        if (status === PL_HUNT_NOT_APPROVED) { notApproved++; return; }
        if (status === PL_HUNT_APPROVED) {
          if (listedTitles[plTitleKey(title)]) { return; }
          buckets.approved.push({
            title: title, account: plAccount(h['Account Selected']), id: h.hunt_id,
            chips: plStr(h['CPC Selling Chance']) ? [{ t: plStr(h['CPC Selling Chance']), c: 'b' }] : [],
            who: 'with the lister', age: plAge(h.ts), go: PL_GO_HUNT
          });
          return;
        }
        buckets.hunted.push({
          title: title, account: plAccount(h['Account Selected']), id: h.hunt_id,
          note: plStr(h.hunter_name) ? 'Hunted by ' + plStr(h.hunter_name) : '',
          who: 'with Management', age: plAge(h.ts || h['Date Added']), go: PL_GO_HUNT
        });
      });
      hints.hunted = 'waiting on Management' + (notApproved ? ' · ' + notApproved + ' not approved' : '');
      hints.approved = 'with the lister · age counts from the hunt';
    } else {
      errs.hunted = errs.approved = plErr(huntRes);
    }

    // ---- potential CPC (§9): CPC research · Live + campaign ----
    if (potRes.ok) {
      var queue = (potRes.data && potRes.data.queue) || [];
      queue.forEach(function (p) {
        var status = plStr(p.status);
        var itemId = plStr(p.listing_item_id);
        var title = itemId ? 'eBay item ' + itemId : 'Potential CPC listing';
        var reason = plStr(p.reason_for_selection);
        if (status === PL_POT_SUBMITTED) {
          buckets.cpc.push({
            title: title, account: plAccount(p.account), itemId: itemId,
            chips: [{ t: 'Nominated', c: 'b' }], note: reason,
            who: 'with Management', age: plAge(p.ts, p.waiting_min), go: PL_GO_POT
          });
          return;
        }
        if (status !== PL_POT_APPROVED) { return; }
        if (plStr(p.campaign_switched_at)) {
          buckets.live.push({
            title: title, account: plAccount(p.account), itemId: itemId,
            chips: [{ t: 'Campaign CPC', c: 'g' }],
            note: 'Switched to CPC ' + fmtPkt(p.campaign_switched_at, true),
            who: 'with Advertising', age: plAge(p.campaign_switched_at), go: PL_GO_POT
          });
          return;
        }
        var rt = p.research_task;
        if (rt && plStr(rt.status) === PL_COMPLETED) {
          buckets.cpc.push({
            title: title, account: plAccount(p.account), itemId: itemId,
            chips: [{ t: 'Research approved', c: 'g' }], note: 'Waiting for the campaign switch.',
            who: 'with Advertising', age: plAge(p.ts, p.waiting_min), go: PL_GO_POT
          });
          return;
        }
        buckets.cpc.push({
          title: title, account: plAccount(p.account), itemId: itemId,
          chips: [{ t: rt ? 'cpc_research · ' + plStr(rt.status) : 'Approved', c: 'b' }]
            .concat(rt ? plDueChip(rt.deadline_pkt, plStr(rt.status)) : []),
          note: reason,
          who: rt && plStr(rt.assigned_to) ? 'with ' + plStr(rt.assigned_to) : 'with the lister',
          age: plAge(p.ts, p.waiting_min), go: PL_GO_POT
        });
      });
      hints.cpc = 'keywords before any campaign';
    } else {
      errs.cpc = plErr(potRes);
    }

    PL_COLS.forEach(function (c) {
      plFill(c, buckets[c.key], hints[c.key], errs[c.key]);
    });
  }

  /** Deadlines are PKT (§2). Only the last day before one shouts — a board that alarms on every
      card stops meaning anything. */
  function plDueChip(iso, status) {
    var ms = plMs(iso), left;
    if (isNaN(ms) || status === PL_COMPLETED) { return []; }
    left = ms - Date.now();
    if (left < 0) { return [{ t: 'Overdue', c: 'r' }]; }
    return [{ t: 'Due ' + fmtPkt(iso, true), c: left < 86400000 ? 'w' : '' }];
  }

  function plErr(res) {
    if (res.skip) { return { calm: true, text: 'This column is not part of your version.' }; }
    return { calm: false, text: 'Could not be read just now.' };
  }

  function plFill(col, cards, hint, err) {
    var body = $('plB-' + col.key), count = $('plN-' + col.key), hintEl = $('plH-' + col.key);
    if (!body) { return; }
    if (hintEl && hint) { hintEl.textContent = hint; }
    if (err) {
      if (count) { count.textContent = '–'; }
      body.innerHTML = '<div class="pl-empty">' + esc(err.text) + '</div>';
      return;
    }
    cards = cards || [];
    if (count) { count.textContent = String(cards.length); }
    if (!cards.length) {
      body.innerHTML = '<div class="pl-empty">Nothing sitting here.</div>';
      return;
    }
    var shown = cards.slice(0, PL_MAX_CARDS);
    var target = plTarget(col.go);
    body.innerHTML = shown.map(function (c) { return plCard(c, col); }).join('') +
      (cards.length > shown.length
        ? '<div class="pl-more">+ ' + esc(String(cards.length - shown.length)) + ' more' +
          (target ? ' in ' + esc(target.label) : '') + '</div>'
        : '');
    plWire(body);
  }

  function plCard(c, col) {
    var target = plTarget(c.go || col.go);
    var meta = '';
    if (plStr(c.account)) { meta += '<span class="pl-acc">' + esc(plStr(c.account)) + '</span>'; }
    if (plStr(c.itemId)) { meta += '<span class="mono pl-id">' + esc(plStr(c.itemId)) + '</span>'; }
    if (!plStr(c.itemId) && plStr(c.id)) { meta += '<span class="mono pl-id">' + esc(plStr(c.id)) + '</span>'; }
    (c.chips || []).forEach(function (ch) {
      if (!ch || !plStr(ch.t)) { return; }
      meta += '<span class="pl-chip ' + esc(ch.c || '') + '">' + esc(plStr(ch.t)) + '</span>';
    });

    return '<button type="button" class="pl-card"' +
        (target ? ' data-go="' + plAttr(target.key) + '" title="Open ' + plAttr(target.label) + '"' : '') + '>' +
      '<div class="pl-t">' + esc(plStr(c.title) || 'Untitled') + '</div>' +
      (meta ? '<div class="pl-m">' + meta + '</div>' : '') +
      (plStr(c.note) ? '<div class="pl-note">' + esc(plStr(c.note)) + '</div>' : '') +
      '<div class="pl-f"><span class="pl-who">' + esc(plStr(c.who)) + '</span>' +
        (c.age ? '<span class="pl-age num' + c.age.cls + '">' + esc(c.age.text) + '</span>' : '') +
      '</div>' +
    '</button>';
  }

  function plWire(body) {
    var btns = body.querySelectorAll('button.pl-card'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          var key = b.getAttribute('data-go');
          if (!key) { toast('The screen for this stage is not part of your version.'); return; }
          plOpen(key);
        };
      })(btns[i]);
    }
  }

  // ---------- §6 connection health ----------
  var PL_CONN_LABELS = {
    hunting: 'Product Hunting',
    potential_cpc: 'Potential CPC Listings',
    ppc: 'PPC Central (Advertising)'
  };

  function plPaintConn(res) {
    var box = $('plConn'), hint = $('plConnHint');
    if (!box) { return; }
    if (!res.ok) {
      box.innerHTML = '<div class="pl-empty">Connection health could not be read just now.</div>';
      if (hint) { hint.textContent = ''; }
      return;
    }
    var h = res.data || {};
    var globals = h.globals || [], perAccount = h.perAccount || [];
    var byKind = {}, i, j;
    for (i = 0; i < globals.length; i++) { byKind[globals[i].kind] = plStr(globals[i].status); }

    var linkedCentral = 0;
    for (i = 0; i < perAccount.length; i++) {
      var items = perAccount[i].items || [];
      for (j = 0; j < items.length; j++) {
        if (items[j].kind === 'central' && plStr(items[j].status) === 'linked') { linkedCentral++; }
      }
    }

    var chips = ['hunting', 'potential_cpc', 'ppc'].map(function (k) {
      var on = byKind[k] === 'linked';
      return plConnChip(PL_CONN_LABELS[k], on, on ? '' : 'not connected yet');
    });
    chips.push(plConnChip('Central account sheets', linkedCentral > 0 && linkedCentral === perAccount.length,
      linkedCentral + ' of ' + perAccount.length));
    box.innerHTML = chips.join('');
    if (hint) {
      hint.textContent = (Number(h.globalsLinked) || 0) + ' of ' + (Number(h.globalsOf) || 0) + ' global sheets linked';
    }
  }

  function plConnChip(label, on, note) {
    return '<span class="pl-cc' + (on ? '' : ' off') + '"><span class="pl-cd"></span>' + esc(label) +
      (note ? ' <span class="num">' + esc(note) + '</span>' : '') + '</span>';
  }

})();
