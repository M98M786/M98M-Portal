/* view-huntRevisions.js — the dedicated Revisions worklist (9 Sept, owner: "make a proper separate
 * page for this hunting"). Hunts Management sent back for revision, each showing the REASON to fix
 * and a one-click Revise that opens it straight in the hunting form. A Product Hunter sees their
 * own; Management / Ops Head / Team Lead see everyone's as an oversight worklist. Before this,
 * REVISION REQUIRED hunts had no home — only a button buried in "My hunts" — so a hunter with a
 * backlog (Irfan: 7 stuck) could not see at a glance what needed fixing. Read + hand-off only; the
 * revision itself is saved by reviseHunt from the hunting form. */
(function () {
  'use strict';

  var HRV_MGMT_ROLES = ['Management', 'Ops Head', 'Team Lead'];
  var HRV_ROLES = ['Product Hunter'].concat(HRV_MGMT_ROLES);
  var HRV_REVISION = 'REVISION REQUIRED';
  var HRV = { byId: {}, seq: 0 };

  VIEW_CSS.push(
    '.hrv-wrap{display:flex;flex-direction:column;gap:12px}' +
    '.hrv-card{border:1px solid var(--gold-line);border-radius:14px;background:var(--panel-2);padding:15px 16px;' +
      'display:flex;flex-direction:column;gap:11px;position:relative;overflow:hidden}' +
    '.hrv-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--gold-a)}' +
    '.hrv-top{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}' +
    '.hrv-ttl{font-weight:800;font-size:14.5px;color:var(--text);line-height:1.3;flex:1;min-width:200px}' +
    '.hrv-id{font-size:10.5px;color:var(--text-3);font-weight:700;display:block;margin-top:2px}' +
    '.hrv-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;' +
      'border-radius:7px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}' +
    '.hrv-reason{background:rgba(233,169,60,.09);border:1px solid var(--gold-line);border-radius:10px;padding:10px 12px}' +
    '.hrv-reason .lab{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gold-a);display:block;margin-bottom:3px}' +
    '.hrv-reason .txt{font-size:13px;color:var(--text);line-height:1.45}' +
    '.hrv-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--text-3);align-items:center}' +
    '.hrv-meta b{color:var(--text-2);font-weight:700}' +
    '.hrv-meta a{font-weight:700;font-size:11.5px}' +
    '.hrv-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.hrv-empty{text-align:center;padding:44px 16px;color:var(--text-2);display:flex;flex-direction:column;gap:6px}' +
    '.hrv-empty b{font-size:15px;color:var(--text)}' +
    '.hrv-empty span{font-size:12.5px;color:var(--text-3)}'
  );

  function hrvStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function hrvAttr(v) { return esc(hrvStr(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function hrvMgmt() { return !!(STATE.user && (HRV_MGMT_ROLES.indexOf(STATE.user.role) >= 0 || STATE.user.super)); }

  function hrvLink(u, label) {
    u = hrvStr(u);
    if (!/^https?:\/\//i.test(u)) { return ''; }
    return '<a href="' + hrvAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }

  /* The Comments column carries Management's revision note. It can accumulate history and the
     hunter's own "(revised …)" markers; show it whole so nothing about what-to-fix is hidden. */
  function hrvReason(rec) {
    var c = hrvStr(rec['Comments']);
    return c || 'Sent back for revision — open it and strengthen the case, then re-submit.';
  }

  function hrvCard(rec) {
    var id = hrvStr(rec.hunt_id);
    HRV.byId[id] = rec;
    var kind = hrvStr(rec['Seasonal']);
    var links = hrvLink(rec['Product Link 1 Main supplier'], 'Supplier 1') + ' ' +
      hrvLink(rec['Ebay Link'], 'eBay') + ' ' + hrvLink(rec['Main Keyword Terapeak link'], 'Terapeak');
    var who = hrvStr(rec.hunter_name) || hrvStr(rec.hunter_email);
    var when = fmtPkt(rec.ts, true) || hrvStr(rec['Date Added']) || '';
    return '<div class="hrv-card">' +
      '<div class="hrv-top">' +
        '<div class="hrv-ttl">' + esc(hrvStr(rec['Title']) || id) +
          '<span class="hrv-id mono">' + esc(id) + '</span></div>' +
        (kind ? '<span class="hrv-kind">' + esc(kind) + '</span>' : '') +
      '</div>' +
      '<div class="hrv-reason"><span class="lab">What to fix</span>' +
        '<div class="txt">' + esc(hrvReason(rec)) + '</div></div>' +
      '<div class="hrv-meta">' +
        (hrvMgmt() && who ? '<span>Hunter <b>' + esc(who) + '</b></span>' : '') +
        (when ? '<span>Sent back <b>' + esc(when) + '</b></span>' : '') +
        (links.replace(/\s/g, '') ? '<span class="hrv-links">' + links + '</span>' : '') +
      '</div>' +
      '<div class="hrv-foot">' +
        '<button class="btn-gold hrv-revbtn" data-hrvid="' + hrvAttr(id) + '">Revise this hunt</button>' +
        '<span class="hu-hint" style="margin:0">Opens in the hunting form with your entry pre-filled.</span>' +
      '</div>' +
    '</div>';
  }

  function hrvWire(box) {
    var btns = box.querySelectorAll('button[data-hrvid]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-hrvid');
          var rec = HRV.byId[id];
          if (!rec) { toast('That hunt is no longer on the list — refresh.'); return; }
          /* Hand the hunt to the hunting form: it reads this on init, drops the record into its
             revise map and opens revise mode straight away (no wait for its own list to load). */
          try { localStorage.setItem('m98m:reviseHunt', JSON.stringify({ id: id, rec: rec })); } catch (e) {}
          try { location.hash = 'hunting'; renderView('hunting'); } catch (e) {}
        };
      })(btns[i]);
    }
  }

  function hrvLoad() {
    var box = document.getElementById('hrvBody');
    if (!box) { return; }
    var seq = ++HRV.seq;
    var mgmt = hrvMgmt();
    /* Mgmt/lead: every revision across all hunters (huntQueue's 'revision' filter). A hunter: only
       their own — huntQueue is not hunter-scoped, so myHunts (own rows) filtered to the revision
       status, the same way the hunting page's "My hunts" does it. */
    var call = mgmt
      ? api('huntQueue', { status: 'revision' }).then(function (d) { return (d && d.hunts) || []; })
      : api('myHunts', { status: 'all' }).then(function (d) {
          return ((d && d.hunts) || []).filter(function (r) { return hrvStr(r.approval_status) === HRV_REVISION; });
        });
    box.innerHTML = '<div class="spinner"></div>';
    call.then(function (hunts) {
      if (seq !== HRV.seq) { return; }
      HRV.byId = {};
      if (STATE.counts) { STATE.counts.huntRevisions = hunts.length; }
      var cnt = document.getElementById('hrvCount');
      if (cnt) { cnt.textContent = hunts.length ? (hunts.length + (mgmt ? ' across the team' : ' waiting on you')) : 'none'; }
      if (!hunts.length) {
        box.innerHTML = '<div class="hrv-empty"><b>No revisions waiting.</b>' +
          '<span>' + (mgmt ? 'Nothing is currently sent back to any hunter.' : 'Nothing of yours needs changes right now — nice.') + '</span></div>';
        return;
      }
      box.innerHTML = '<div class="hrv-wrap">' + hunts.map(hrvCard).join('') + '</div>';
      hrvWire(box);
    }).catch(function (e) {
      if (seq !== HRV.seq) { return; }
      box.innerHTML = '<div class="hrv-empty"><b>Could not load revisions.</b><span>' + esc((e && e.message) || 'try again') + '</span>' +
        '<button class="minibtn" id="hrvRetry" style="margin-top:8px">Try again</button></div>';
      var r = document.getElementById('hrvRetry'); if (r) { r.onclick = hrvLoad; }
    });
  }

  VIEWS.huntRevisions = {
    label: 'Revisions',
    icon: '<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 9a8 8 0 0 0-14-3L4 8"/><path d="M4 15a8 8 0 0 0 14 3l2-2"/>',
    roles: HRV_ROLES,
    order: 15.5,
    badge: function () { return (STATE.counts && STATE.counts.huntRevisions) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Hunt <span class="goldtext">revisions</span></h1>' +
          '<span class="sub">hunts sent back for changes — the reason, and a one-click fix · <b id="hrvCount">…</b></span>' +
          '<button class="minibtn" id="hrvRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d1"><div class="bd" id="hrvBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      var r = document.getElementById('hrvRefresh'); if (r) { r.onclick = hrvLoad; }
      hrvLoad();
    }
  };

})();
