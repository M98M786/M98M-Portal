/* Phase 6 — §4.1b staff lifecycle and §3/§6 accounts admin. The full version of VIEWS.staffAdmin:
 * the approval queue · add a colleague directly · edit anyone · Remove (which deactivates) with
 * the offboarding checklist and a one-click handover of their open work · the Removed staff
 * archive · and the eBay accounts with their four sheet links and 4/4 connection health.
 *
 * This file registers the key 'staffAdmin' a second time. The build splices frontend/view-*.js in
 * filename order (scripts/build.py), so view-staff.js lands after view-admin.js and this
 * registration is the one the shell uses. Renaming either file changes which version ships.
 *
 * One pass: every read this screen needs is fired in the same tick so the shell batches it into a
 * single request — Google's ~2.5s backend load is paid once, not five times. Every write then
 * repaints from its own response and never asks the server a second question. */

(function () {

  /* Nav visibility is Management + Ops Head. §4.4 keeps user-role management and account/sheet
     admin away from the Ops Head, and the backend gate (StaffAdmin.gs sadmIsManagement_) is
     Management or a super admin — narrower than the nav. This screen mirrors that gate exactly
     rather than drawing buttons the server would refuse. */
  var ST_SEES = ['Management', 'Ops Head'];

  /* §4.1 — granting a management-tier role is a super admin's call, so these two are offered in
     the role pickers only to a super admin (StaffAdmin.gs refuses them from anyone else). */
  var ST_MGMT_ROLES = ['Management', 'Ops Head'];

  /* §5 shift vocabulary. None of the actions this screen may call returns it, so it is repeated
     exactly as Schedules.gs declares it. The hours behind a label stay on the rota screen. */
  var ST_SHIFTS = ['Shift 1', 'Shift 2', 'Custom'];

  /* §6's own words for each connection, keyed by the sheet_kind the backend sends. The spec names
     the CS and Returns sheets after Husnain; the built page is public, so no staff name is on it
     (RL-2, RL-9). Anything the backend sends that is not listed here prints as its raw kind. */
  var ST_KIND = {
    central: 'Central Account Management',
    order_processing: 'Order Processing',
    sales_analysis: 'Sales Analysis',
    account_report: 'Daily Account Report',
    registry: 'Central Sheets registry',
    ppc: 'PPC Central (Advertising)',
    potential_cpc: 'Potential CPC Listings',
    hunting: 'Product Hunting',
    order_recheck: 'Order Rechecking',
    wrong_orders: 'Wrong Orders',
    cs: 'Customer Service',
    returns: 'Returns / Refunds',
    staff_perf: 'Staff Performance',
    staff_email: 'Staff Email List',
    account_learnings: 'Learnings report (Management only)'
  };

  /* §6 status vocabulary, verbatim — 'linked' · 'not connected yet' · 'archived'. */
  var ST_LINKED = 'linked';
  var ST_ARCHIVED = 'archived';

  VIEW_CSS.push([
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}',
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}',
    '.minibtn.on{border-color:var(--blue);color:var(--blue-2);background:var(--blue-soft)}',
    '.minibtn[disabled]{opacity:.45;cursor:default}',
    '.st-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:620px}',
    '.st-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}',
    '.st-tbl td{padding:11px 12px;border-bottom:1px solid var(--gold-line);vertical-align:middle}',
    '.st-tbl tr:last-child td{border-bottom:0}',
    '.st-tbl tbody tr.st-r:hover{background:var(--blue-soft)}',
    '.st-nm{font-weight:800}',
    '.st-sub{font-size:11.5px;color:var(--text-3);font-weight:600;margin-top:2px}',
    '.st-right{text-align:right;white-space:nowrap}',
    '.st-card{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;background:linear-gradient(180deg,var(--panel-2),var(--panel))}',
    '.st-card+.st-card{margin-top:12px}',
    '.st-card:hover{border-color:var(--gold-line-hi)}',
    '.st-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.st-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:12px}',
    '.st-fields.st-wide{grid-template-columns:1fr}',
    '.st-f label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);margin-bottom:5px}',
    '.st-f label .lock{color:var(--gold-a);letter-spacing:.04em;text-transform:none;font-size:10.5px;margin-left:6px}',
    '.st-in{width:100%;padding:9px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}',
    '.st-in:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}',
    '.st-in[disabled]{opacity:.55}',
    '.st-act{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}',
    '.st-note{font-size:12px;color:var(--text-3);font-weight:600;line-height:1.5}',
    '.st-note b{color:var(--text-2)}',
    '.st-empty{padding:24px;text-align:center;color:var(--text-3);font-weight:600}',
    '.st-empty span{display:block;margin-top:6px;font-size:12.5px;opacity:.85}',
    '.st-chips{display:flex;flex-wrap:wrap;gap:7px}',
    '.st-panel{border:1px solid var(--gold-line-hi);border-radius:12px;padding:16px;background:var(--panel);margin:2px 0 4px}',
    '.st-panel h4{font-size:14px;font-weight:800;margin-bottom:6px}',
    '.st-grave{border-color:rgba(240,96,90,.45);background:linear-gradient(180deg,rgba(240,96,90,.06),var(--panel))}',
    '.st-list{margin:10px 0 0;padding:0;list-style:none}',
    '.st-list li{position:relative;padding:6px 0 6px 20px;font-size:12.5px;font-weight:600;color:var(--text-2)}',
    '.st-list li::before{content:"";position:absolute;left:4px;top:13px;width:6px;height:6px;border-radius:50%;background:var(--gold-b)}',
    '.st-check{display:flex;align-items:flex-start;gap:9px;margin-top:14px;font-size:12.5px;font-weight:700;color:var(--text-2);cursor:pointer}',
    '.st-check input{margin-top:2px;width:16px;height:16px;accent-color:var(--blue);flex:none}',
    '.st-danger{padding:10px 18px;border:1px solid rgba(240,96,90,.55);border-radius:10px;font-weight:800;font-size:13.5px;color:var(--bad);transition:all .15s}',
    '.st-danger:hover{background:var(--bad-soft)}',
    '.st-danger[disabled]{opacity:.4;cursor:default}',
    '.st-danger[disabled]:hover{background:none}',
    '.st-ok{background:var(--ok-soft);color:var(--ok)}',
    '.st-warn{background:var(--warn-soft);color:var(--warn)}',
    '.st-bad{background:var(--bad-soft);color:var(--bad)}',
    '.st-dim{background:rgba(120,132,152,.16);color:var(--text-3)}',
    '.st-gold{background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 60%,var(--gold-c));color:var(--gold-ink);box-shadow:var(--glow-gold)}',
    '.st-acc{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel);overflow:hidden}',
    '.st-acc+.st-acc{margin-top:10px}',
    '.st-acc.open{border-color:var(--gold-line-hi)}',
    '.st-accq{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;font-weight:800;font-size:13.5px;color:var(--text)}',
    '.st-accq .chev{margin-left:auto;color:var(--text-3);transition:transform .15s;font-size:12px}',
    '.st-acc.open .st-accq .chev{transform:rotate(90deg)}',
    '.st-dots{display:flex;gap:5px}',
    '.st-dot{width:9px;height:9px;border-radius:50%;background:rgba(120,132,152,.3)}',
    '.st-dot.on{background:linear-gradient(135deg,var(--gold-a),var(--gold-c));box-shadow:0 0 8px rgba(233,169,60,.5)}',
    '.st-accb{padding:2px 14px 14px;border-top:1px solid var(--gold-line)}',
    '.st-kind{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:12.5px;flex-wrap:wrap}',
    '.st-kind+.st-kind{border-top:1px solid var(--gold-line)}',
    '.st-kind .kn{font-weight:700;min-width:170px}',
    '.st-kind .st-in{flex:1 1 220px;width:auto;min-width:0}',
    '.st-kpis{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}',
    '@media(max-width:880px){.st-fields{grid-template-columns:1fr}.st-kind .kn{min-width:0;flex-basis:100%}}'
  ].join('\n'));

  /* ---------- shared helpers ---------- */

  /* esc() leaves quotes alone, so anything going into an attribute goes through this (RL-3). */
  function attr(v) { return esc(v).replace(/"/g, '&quot;'); }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function put(id, html) { var el = $(id); if (el) { el.innerHTML = html; } return el; }
  function upTo(node, name, root) {
    while (node && node !== root) {
      if (node.getAttribute && node.getAttribute(name) !== null) { return node; }
      node = node.parentNode;
    }
    return null;
  }
  function isSuper() { return !!(STATE.user && STATE.user.isSuper); }
  /* Same test the server makes (StaffAdmin.gs sadmIsManagement_) — Ops Head is deliberately out. */
  function canManage() { return isSuper() || String(STATE.user && STATE.user.role) === 'Management'; }
  function kindName(k) { return ST_KIND[k] || str(k); }
  function pill(cls, text) { return '<span class="pill ' + cls + '">' + esc(text) + '</span>'; }
  function spinnerCard(msg) {
    return '<div class="st-empty"><div class="spinner"></div>' + esc(msg) + '</div>';
  }
  function optionsHtml(list, chosen) {
    var h = '';
    for (var i = 0; i < list.length; i++) {
      var v = str(list[i].value === undefined ? list[i] : list[i].value);
      var label = str(list[i].label === undefined ? list[i] : list[i].label);
      h += '<option value="' + attr(v) + '"' + (v === str(chosen) ? ' selected' : '') + '>' + esc(label) + '</option>';
    }
    return h;
  }
  /* Roles come from the backend's own list so this screen can never offer one the server rejects. */
  function roleOptions(chosen) {
    var all = (STATE.config && STATE.config.roles) || [];
    var list = [];
    for (var i = 0; i < all.length; i++) {
      if (ST_MGMT_ROLES.indexOf(all[i]) >= 0 && !isSuper()) { continue; }
      list.push(all[i]);
    }
    if (!list.length) { list = [str(chosen)]; }
    return optionsHtml(list, chosen);
  }
  function val(id) { var el = $(id); return el ? String(el.value).trim() : ''; }

  /* accounts_access is 'ALL', 'per-role' or a comma list of real account names. Chips instead of a
     text box: the names come from api('accountList'), so nothing is typed and nothing is guessed. */
  function chipsHtml(id, chosen) {
    var on = {}, i;
    String(chosen || '').split(',').forEach(function (x) { x = x.trim(); if (x) { on[x] = true; } });
    var opts = ['ALL', 'per-role'].concat(S.accountNames);
    var h = '<div class="st-chips" id="' + attr(id) + '">';
    for (i = 0; i < opts.length; i++) {
      h += '<button type="button" class="minibtn' + (on[opts[i]] ? ' on' : '') + '" data-act="chip" data-v="' +
        attr(opts[i]) + '">' + esc(opts[i]) + '</button>';
    }
    return h + '</div>';
  }
  function chipsValue(id) {
    var box = $(id);
    if (!box) { return ''; }
    var btns = box.getElementsByTagName('button'), out = [];
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].className.indexOf(' on') >= 0) { out.push(btns[i].getAttribute('data-v')); }
    }
    if (out.indexOf('ALL') >= 0) { return 'ALL'; }
    if (out.indexOf('per-role') >= 0 && out.length === 1) { return 'per-role'; }
    return out.join(',');
  }
  function chipClick(btn) {
    var box = btn.parentNode, v = btn.getAttribute('data-v');
    var was = btn.className.indexOf(' on') >= 0;
    var btns = box.getElementsByTagName('button'), i;
    if (v === 'ALL' || v === 'per-role') {
      for (i = 0; i < btns.length; i++) { btns[i].className = 'minibtn'; }
    } else {
      for (i = 0; i < btns.length; i++) {
        var iv = btns[i].getAttribute('data-v');
        if (iv === 'ALL' || iv === 'per-role') { btns[i].className = 'minibtn'; }
      }
    }
    btn.className = was ? 'minibtn' : 'minibtn on';
  }

  /* ---------- screen state ----------
     Every mutation updates these from its own response and repaints; nothing re-reads the server. */
  var S = {
    pending: [], staff: [], removed: [], accountNames: [],
    accounts: null, offboarding: [], canReactivate: false, archiveNote: '',
    editing: '', removing: '', handover: null, archHand: '', openAcc: {}, loaded: false
  };

  function sortStaff() {
    S.staff.sort(function (a, b) {
      var x = str(a.name).toLowerCase(), y = str(b.name).toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }

  /* ============================ LOAD ============================ */

  /* Resolves either way so one refused call (an Ops Head asking for the archive) cannot blank the
     screens that did answer. */
  function soft(p) {
    return p.then(function (d) { return { ok: true, d: d }; })
      .catch(function (e) { return { ok: false, e: e }; });
  }

  function loadAll() {
    var mgr = canManage();
    // The composed answer set is what gets cached — one shape, one instant repaint.
    var had = (typeof cacheRead === 'function') ? cacheRead('staffAll', { mgr: mgr }) : null;
    if (had) { try { applyAll(had, mgr); } catch (e) { had = null; } }

    /* Fired in one tick on purpose — the shell gathers them into a single round trip. */
    var calls = [soft(api('listPending')), soft(api('assignableStaff')), soft(api('accountList'))];
    if (mgr) { calls.push(soft(api('removedStaff'))); calls.push(soft(api('accountsAdmin'))); }

    Promise.all(calls).then(function (r) {
      var allOk = r.every(function (x) { return x.ok; });
      if (allOk && typeof cacheWrite === 'function') { cacheWrite('staffAll', { mgr: mgr }, r); }
      applyAll(r, mgr);
    });
  }

  function applyAll(r, mgr) {
    (function (r) {
      S.loaded = true;
      S.pending = (r[0].ok && r[0].d && r[0].d.pending) || [];
      STATE.counts.staffAdmin = S.pending.length;
      if (typeof refreshBadges === 'function') { refreshBadges(); }

      S.staff = (r[1].ok && r[1].d && r[1].d.staff) || [];
      sortStaff();

      var accs = (r[2].ok && r[2].d && r[2].d.accounts) || [];
      S.accountNames = accs.map(function (a) { return str(a.account); }).filter(function (a) { return a !== ''; });

      if (mgr && r[3]) {
        S.removed = (r[3].ok && r[3].d && r[3].d.removed) || [];
        S.canReactivate = !!(r[3].ok && r[3].d && r[3].d.can_reactivate);
        S.offboarding = (r[3].ok && r[3].d && r[3].d.offboarding) || [];
        S.archiveNote = (r[3].ok && r[3].d && r[3].d.note) || '';
      }
      if (mgr && r[4]) { S.accounts = r[4].ok ? r[4].d : null; }

      paintQueue(r[0].ok ? '' : 'The approval queue could not be loaded.');
      paintAdd();
      paintList(r[1].ok ? '' : 'The staff list could not be loaded.');
      paintRemoved(mgr && r[3] && !r[3].ok ? 'The archive could not be loaded.' : '');
      paintAccounts(mgr && r[4] && !r[4].ok ? 'The accounts could not be loaded.' : '');
    })(r);
  }

  /* ============================ APPROVAL QUEUE ============================ */

  function paintQueue(err) {
    var box = $('stQueue');
    if (!box) { return; }
    if (err) { box.innerHTML = '<div class="st-empty">' + esc(err) + '</div>'; return; }
    if (!S.pending.length) {
      box.innerHTML = '<div class="st-empty">Nobody is waiting for approval.' +
        '<span>When someone signs in for the first time, they appear here.</span></div>';
      return;
    }
    box.innerHTML = S.pending.map(function (u, i) {
      return '<div class="st-card">' +
        '<div class="st-top"><span class="st-nm">' + esc(u.name || u.email) + '</span>' +
          '<span class="st-sub">' + esc(u.email) + '</span>' +
          '<span style="margin-left:auto">' + pill('role', 'asked for ' + str(u.role || 'a role')) + '</span></div>' +
        '<div class="st-fields">' +
          '<div class="st-f"><label>Role</label><select class="st-in" id="stQr' + i + '">' + roleOptions(str(u.role)) + '</select></div>' +
          '<div class="st-f"><label>Shift</label><select class="st-in" id="stQs' + i + '">' +
            optionsHtml([{ value: '', label: 'Set later on the rota' }].concat(ST_SHIFTS), str(u.shift)) + '</select></div>' +
        '</div>' +
        '<div class="st-f" style="margin-top:12px"><label>Accounts they may see</label>' + chipsHtml('stQa' + i, 'per-role') +
          '<div class="st-note" style="margin-top:7px">' + accountsHint() + '</div></div>' +
        '<div class="st-act">' +
          '<button class="btn-gold" data-act="approve" data-i="' + i + '">Approve</button>' +
          '<span class="st-note">They can sign in the moment you approve. Their hours come from the Rota screen.</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function accountsHint() {
    return '<b>ALL</b> — every account · <b>per-role</b> — not scoped yet, which the account checks ' +
      'currently read as "may see every account". Pick account names to narrow it.';
  }

  function approve(i, btn) {
    var u = S.pending[i];
    if (!u) { return; }
    var role = val('stQr' + i), shift = val('stQs' + i), accounts = chipsValue('stQa' + i);
    if (btn) { btn.disabled = true; btn.textContent = 'Approving…'; }
    api('approveUser', { email: u.email, role: role, shift: shift, accounts: accounts })
      .then(function () {
        S.pending.splice(i, 1);
        STATE.counts.staffAdmin = S.pending.length;
        if (typeof refreshBadges === 'function') { refreshBadges(); }
        /* The approved row is built from what was just sent rather than re-read: the server has
           already accepted these exact values. */
        S.staff.push({ email: str(u.email), name: str(u.name || u.email), role: role, accounts: accounts });
        sortStaff();
        toast(str(u.name || u.email) + ' approved — they can sign in now.');
        paintQueue('');
        paintList('');
      })
      .catch(function (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Approve'; }
        toast('Could not approve: ' + e.message);
      });
  }

  /* ============================ ADD A STAFF MEMBER ============================ */

  function paintAdd() {
    var box = $('stAdd');
    if (!box) { return; }
    if (!canManage()) {
      box.innerHTML = '<div class="st-note">Adding, editing and removing colleagues is Management\'s ' +
        'to do (§4.4). You can approve the people waiting above.</div>';
      return;
    }
    box.innerHTML =
      '<div class="st-fields">' +
        '<div class="st-f"><label>Full name</label><input class="st-in" id="stAdName" placeholder="As it should appear to the team"></div>' +
        '<div class="st-f"><label>Company email</label><input class="st-in" id="stAdEmail" placeholder="their m98m Google account"></div>' +
        '<div class="st-f"><label>Role</label><select class="st-in" id="stAdRole">' + roleOptions('') + '</select></div>' +
        '<div class="st-f"><label>Shift</label><select class="st-in" id="stAdShift">' +
          optionsHtml([{ value: '', label: 'Set later on the rota' }].concat(ST_SHIFTS), '') + '</select></div>' +
      '</div>' +
      '<div class="st-f" style="margin-top:12px"><label>Accounts they may see</label>' + chipsHtml('stAdAcc', 'per-role') +
        '<div class="st-note" style="margin-top:7px">' + accountsHint() + '</div></div>' +
      '<div class="st-f" style="margin-top:12px"><label>Note (optional)</label>' +
        '<input class="st-in" id="stAdNote" placeholder="Anything the next manager should know"></div>' +
      '<div class="st-act">' +
        '<button class="btn-gold" data-act="add">Add them</button>' +
        '<span class="st-note">They go straight in as approved — no waiting for a registration. ' +
        'They get a welcome message with their timetable and their SOPs.</span>' +
      '</div>' +
      (isSuper() ? '' : '<div class="st-note" style="margin-top:10px">Management and Ops Head roles are granted by a super admin.</div>');
  }

  function addStaff(btn) {
    var name = val('stAdName'), email = val('stAdEmail');
    if (!name) { toast('A name is needed.'); return; }
    if (!email) { toast('A company email is needed.'); return; }
    btn.disabled = true;
    api('addStaff', {
      email: email, name: name, role: val('stAdRole'), shift: val('stAdShift'),
      accounts: chipsValue('stAdAcc'), notes: val('stAdNote')
    }).then(function (r) {
      S.staff.push({ email: str(r.email), name: str(r.name), role: str(r.role), accounts: str(r.accounts) });
      sortStaff();
      paintAdd();
      paintList('');
      toast(str(r.name) + ' added as ' + str(r.role) +
        (r.schedule_note ? ' — ' + str(r.schedule_note) : ' — they have been welcomed.'));
    }).catch(function (e) {
      btn.disabled = false;
      toast('Could not add them: ' + e.message);
    });
  }

  /* ============================ THE STAFF LIST ============================ */

  function paintList(err) {
    var box = $('stList');
    if (!box) { return; }
    if (err) { box.innerHTML = '<div class="st-empty">' + esc(err) + '</div>'; return; }
    if (!S.staff.length) {
      box.innerHTML = '<div class="st-empty">No approved staff yet.<span>Approve someone above, or add them directly.</span></div>';
      return;
    }
    var mgr = canManage();
    var h = '<div class="scroll"><table class="st-tbl"><thead><tr><th>Name</th><th>Role</th>' +
      '<th>Accounts</th><th>Email</th>' + (mgr ? '<th></th>' : '') + '</tr></thead><tbody>';
    S.staff.forEach(function (s, i) {
      h += '<tr class="st-r"><td><div class="st-nm">' + esc(s.name) + '</div></td>' +
        '<td>' + pill('role', str(s.role)) + '</td>' +
        /* assignableStaff maps u.accounts, but the USERS column is accounts_access, so this field
           arrives blank for everyone. Printing the seed placeholder 'per-role' here would be a
           guess about a permission, so a blank prints as a blank. */
        '<td>' + (s.accounts ? esc(s.accounts) : '<span class="st-note">—</span>') + '</td>' +
        '<td class="mono">' + esc(s.email) + '</td>' +
        (mgr ? '<td class="st-right"><button class="minibtn" data-act="edit" data-i="' + i + '">Edit</button></td>' : '') +
        '</tr>';
      if (mgr && S.editing === s.email) {
        h += '<tr><td colspan="5">' + editorHtml(s, i) + '</td></tr>';
      }
      if (mgr && S.removing === s.email) {
        h += '<tr><td colspan="5">' + removeHtml(s, i) + '</td></tr>';
      }
    });
    h += '</tbody></table></div>';
    if (S.handover) { h += handoverHtml(); }
    box.innerHTML = h;
  }

  function editorHtml(s, i) {
    var sup = isSuper();
    return '<div class="st-panel">' +
      '<h4>Editing ' + esc(s.name) + '</h4>' +
      '<div class="st-note">Every change is written to the activity log old→new, and ' + esc(s.name.split(' ')[0] || s.name) +
        ' is told what changed.</div>' +
      '<div class="st-fields">' +
        '<div class="st-f"><label>Name</label><input class="st-in" id="stEdName" value="' + attr(s.name) + '"></div>' +
        '<div class="st-f"><label>Role<span class="lock">super admin only</span></label>' +
          (sup ? '<select class="st-in" id="stEdRole">' + roleOptions(str(s.role)) + '</select>'
               : '<input class="st-in" value="' + attr(s.role) + '" disabled>') + '</div>' +
        '<div class="st-f"><label>Email<span class="lock">super admin only</span></label>' +
          '<input class="st-in" id="stEdEmail" value="' + attr(s.email) + '"' + (sup ? '' : ' disabled') + '></div>' +
        '<div class="st-f"><label>Shift</label><select class="st-in" id="stEdShift">' +
          optionsHtml([{ value: '', label: 'Leave unchanged' }].concat(ST_SHIFTS), '') + '</select></div>' +
      '</div>' +
      '<div class="st-f" style="margin-top:12px"><label>Accounts they may see</label>' + chipsHtml('stEdAcc', '') +
        '<div class="st-note" style="margin-top:7px">Nothing selected leaves their access exactly as it is. ' + accountsHint() + '</div></div>' +
      '<div class="st-f" style="margin-top:12px"><label>Note</label>' +
        '<input class="st-in" id="stEdNote" placeholder="Leave blank to keep the note already on their row">' +
        '<div class="st-note" style="margin-top:7px">Typing here replaces the note, including anything written there when they were added.</div></div>' +
      (sup ? '' : '<div class="st-note" style="margin-top:10px">Role and email are changed by a super admin (§4.1). Everything else here is yours.</div>') +
      '<div class="st-act">' +
        '<button class="btn-gold" data-act="save" data-i="' + i + '">Save changes</button>' +
        '<button class="minibtn" data-act="cancel">Cancel</button>' +
        '<span style="margin-left:auto"></span>' +
        '<button class="st-danger" data-act="remove-open" data-i="' + i + '">Remove ' + esc(s.name.split(' ')[0] || s.name) + '…</button>' +
      '</div>' +
    '</div>';
  }

  function saveStaff(i, btn) {
    var s = S.staff[i];
    if (!s) { return; }
    var sup = isSuper();
    /* Only the fields actually being changed are sent. updateStaff writes any key it receives, so
       posting a blank accounts or a blank note would quietly reset a permission or wipe the
       row's history line. */
    var p = { email: s.email };
    var name = val('stEdName');
    if (name && name !== s.name) { p.name = name; }
    if (sup) {
      var role = val('stEdRole');
      if (role && role !== s.role) { p.role = role; }
      var em = val('stEdEmail');
      if (em && em !== s.email) { p.new_email = em; }
    }
    var shift = val('stEdShift');
    if (shift) { p.shift = shift; }
    var acc = chipsValue('stEdAcc');
    if (acc) { p.accounts = acc; }
    var note = val('stEdNote');
    if (note) { p.notes = note; }
    if (Object.keys(p).length < 2) { toast('Nothing has been changed yet.'); return; }

    btn.disabled = true;
    api('updateStaff', p).then(function (r) {
      /* Repainted from the server's own old→new list, so the row shows what was actually written. */
      (r.changes || []).forEach(function (c) {
        if (c.field === 'name') { s.name = c['new']; }
        if (c.field === 'role') { s.role = c['new']; }
        if (c.field === 'email') { s.email = c['new']; }
        if (c.field === 'accounts_access') { s.accounts = c['new']; }
      });
      if (r.email) { s.email = str(r.email); }
      S.editing = '';
      sortStaff();
      paintList('');
      toast(((r.changes || []).length) + ' change(s) saved — ' +
        (str(r.schedule_note) || str(s.name) + ' has been notified.'));
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not saved: ' + e.message);
    });
  }

  /* ---------- Remove (which deactivates) ---------- */

  function removeHtml(s, i) {
    var first = s.name.split(' ')[0] || s.name;
    var checklist = S.offboarding.length
      ? '<div style="margin-top:14px"><label style="display:block;font-size:11px;font-weight:800;' +
          'text-transform:uppercase;letter-spacing:.08em;color:var(--text-3)">Offboarding checklist</label>' +
          '<ul class="st-list">' + S.offboarding.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>'
      : '';
    return '<div class="st-panel st-grave">' +
      '<h4>Removing ' + esc(s.name) + '</h4>' +
      '<div class="st-note">Take a moment with this one. <b>Remove does not delete anything</b> — this portal has ' +
        'no permanent delete, on purpose. What it does:</div>' +
      '<ul class="st-list">' +
        '<li>' + esc(first) + ' cannot sign in from their very next click, and anything they have open stops working.</li>' +
        '<li>They come off the rota, out of every assignment picker and out of the checkpoint grids.</li>' +
        '<li>Their reports, messages, tasks and history stay exactly as they are, read-only, for audit.</li>' +
        '<li>They move to the Removed staff archive below, where a super admin can bring them back.</li>' +
      '</ul>' +
      checklist +
      '<div class="st-f" style="margin-top:14px"><label>Reason (optional)</label>' +
        '<input class="st-in" id="stRmReason" placeholder="Goes into the activity log and into the message they receive">' +
      '</div>' +
      '<label class="st-check"><input type="checkbox" id="stRmAck" data-act="ack">' +
        '<span>I understand ' + esc(first) + ' loses access to everything immediately, and that their open tasks ' +
        'need handing to someone else.</span></label>' +
      '<div class="st-act">' +
        '<button class="st-danger" data-act="remove-do" data-i="' + i + '" disabled>Remove ' + esc(first) + '’s access</button>' +
        '<button class="minibtn" data-act="cancel">Keep ' + esc(first) + '</button>' +
      '</div>' +
    '</div>';
  }

  function removeStaff(i, btn) {
    var s = S.staff[i];
    if (!s) { return; }
    btn.disabled = true;
    btn.textContent = 'Removing…';
    api('deactivateStaff', { email: s.email, reason: val('stRmReason') }).then(function (r) {
      S.staff.splice(i, 1);
      S.editing = '';
      S.removing = '';
      if (r.offboarding && r.offboarding.length) { S.offboarding = r.offboarding; }
      /* The archive row is built from the same response, so the screen stays true without a
         second read of USERS. */
      S.removed.unshift({
        email: str(r.email), name: str(r.name), role: str(r.role), accounts: '',
        joined_at: '', deactivated_at: str(r.deactivated_at), status: str(r.status), notes: '',
        re_registered: false, open_tasks: r.open_task_count || 0, tasks_total: r.open_task_count || 0,
        reports_total: 0, can_reactivate: S.canReactivate
      });
      S.handover = {
        email: str(r.email), name: str(r.name), tasks: r.open_tasks || [],
        offboarding: r.offboarding || S.offboarding, note: str(r.note)
      };
      paintList('');
      paintRemoved('');
      toast(str(r.name) + '’s access has ended. Nothing was deleted.');
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Remove access';
      toast('Not removed: ' + e.message);
    });
  }

  /* ---------- the one-click Reassign screen ---------- */

  function staffOptions(exceptEmail, chosen) {
    var list = S.staff.filter(function (s) { return s.email !== exceptEmail; })
      .map(function (s) { return { value: s.email, label: s.name + ' · ' + s.role }; });
    if (!list.length) { return '<option value="">No one else is approved yet</option>'; }
    return optionsHtml(list, chosen);
  }

  function handoverHtml() {
    var h = S.handover;
    var checklist = (h.offboarding || []).length
      ? '<div style="margin-top:14px"><label style="display:block;font-size:11px;font-weight:800;' +
          'text-transform:uppercase;letter-spacing:.08em;color:var(--text-3)">Offboarding checklist</label>' +
          '<ul class="st-list">' + h.offboarding.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>'
      : '';
    var body;
    if (!h.tasks.length) {
      body = '<div class="st-note" style="margin-top:12px">' + esc(h.name) + ' had no open tasks — there is nothing to hand over.</div>';
    } else {
      body = '<div class="st-note" style="margin-top:12px"><b>' + h.tasks.length + ' open task(s)</b> are still in ' +
        esc(h.name) + '’s name. Nothing is lost — choose who takes them. Tick a few to split the work.</div>' +
        '<div class="scroll" style="margin-top:10px"><table class="st-tbl"><thead><tr><th></th><th>Task</th>' +
        '<th>Type</th><th>Account</th><th>Status</th><th>Deadline</th></tr></thead><tbody>' +
        h.tasks.map(function (t) {
          return '<tr><td><input type="checkbox" checked data-tid="' + attr(t.task_id) + '"></td>' +
            '<td><div class="st-nm">' + esc(t.title || t.task_id) + '</div>' +
              '<div class="st-sub mono">' + esc(t.task_id) + '</div></td>' +
            '<td>' + esc(t.type) + '</td><td>' + esc(t.account) + '</td>' +
            '<td>' + pill('st-dim', str(t.status)) + '</td>' +
            '<td class="num">' + esc(t.deadline_pkt ? fmtPkt(t.deadline_pkt, true) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="st-act">' +
          '<div class="st-f" style="flex:1 1 220px"><label>Give them to</label>' +
            '<select class="st-in" id="stHoWho">' + staffOptions(h.email, '') + '</select></div>' +
          '<button class="btn-gold" data-act="handover">Move the ticked tasks</button>' +
        '</div>';
    }
    return '<div class="st-panel" style="margin-top:14px">' +
      '<h4>' + esc(h.name) + '’s access has ended</h4>' +
      '<div class="st-note">' + esc(h.note || 'Their reports, messages, tasks and history are kept read-only for audit. Nothing is ever purged.') + '</div>' +
      checklist + body +
      '<div class="st-act"><button class="minibtn" data-act="handover-close">Done</button></div>' +
    '</div>';
  }

  function doHandover(btn) {
    var h = S.handover;
    if (!h) { return; }
    var to = val('stHoWho');
    if (!to) { toast('Pick who takes the work.'); return; }
    var host = $('stList');
    var boxes = host ? host.querySelectorAll('[data-tid]') : [], ids = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) { ids.push(boxes[i].getAttribute('data-tid')); }
    }
    if (!ids.length) { toast('Tick at least one task.'); return; }
    btn.disabled = true;
    /* Every open task ticked means "all of them" — sent without task_ids so the backend moves the
       whole set in its single write. */
    var p = { from_email: h.email, to_email: to };
    if (ids.length !== h.tasks.length) { p.task_ids = ids; }
    api('reassignTasks', p).then(function (r) {
      var moved = {};
      (r.moved || []).forEach(function (m) { moved[m.task_id] = true; });
      h.tasks = h.tasks.filter(function (t) { return !moved[t.task_id]; });
      var arch = null;
      S.removed.forEach(function (x) { if (x.email === h.email) { arch = x; } });
      if (arch) { arch.open_tasks = Math.max(0, (arch.open_tasks || 0) - (r.count || 0)); }
      paintList('');
      paintRemoved('');
      toast(r.count + ' task(s) moved — the new owner has been told.');
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not moved: ' + e.message);
    });
  }

  /* ============================ REMOVED STAFF ARCHIVE ============================ */

  function paintRemoved(err) {
    var box = $('stRemoved');
    if (!box) { return; }
    if (!canManage()) { box.innerHTML = '<div class="st-note">The archive is Management\'s (§4.4).</div>'; return; }
    if (err) { box.innerHTML = '<div class="st-empty">' + esc(err) + '</div>'; return; }
    if (!S.removed.length) {
      box.innerHTML = '<div class="st-empty">Nobody has been removed.' +
        '<span>Anyone removed keeps every report, message and task they ever filed — they simply appear here instead of in the team.</span></div>';
      return;
    }
    var h = '<div class="st-note" style="margin-bottom:12px">' +
      esc(S.archiveNote || 'Nothing is ever purged: every row below keeps its reports, messages, tasks and history read-only for audit.') +
      '</div><div class="scroll"><table class="st-tbl"><thead><tr><th>Name</th><th>Role</th><th>Removed</th>' +
      '<th>Open tasks</th><th>Tasks</th><th>Reports</th><th></th></tr></thead><tbody>';
    S.removed.forEach(function (r, i) {
      var open = r.open_tasks || 0;
      h += '<tr class="st-r"><td><div class="st-nm">' + esc(r.name || r.email) + '</div>' +
          '<div class="st-sub mono">' + esc(r.email) + '</div>' +
          (r.re_registered ? '<div style="margin-top:5px">' + pill('st-warn', 'signed in again — waiting in the queue above') + '</div>' : '') +
          '</td>' +
        '<td>' + pill('role', str(r.role)) + '</td>' +
        '<td class="num">' + esc(r.deactivated_at ? fmtPkt(r.deactivated_at, true) : '—') + '</td>' +
        '<td class="num">' + (open ? pill('st-warn', String(open)) : pill('st-ok', '0')) + '</td>' +
        '<td class="num">' + esc(String(r.tasks_total || 0)) + '</td>' +
        '<td class="num">' + esc(String(r.reports_total || 0)) + '</td>' +
        '<td class="st-right">' +
          (open ? '<button class="minibtn" data-act="arch-hand" data-i="' + i + '">Hand over ' + open + '</button> ' : '') +
          (r.can_reactivate || S.canReactivate
            ? '<button class="minibtn" data-act="reactivate" data-i="' + i + '">Reactivate</button>'
            : '<span class="st-note">super admin only</span>') +
        '</td></tr>';
      if (S.archHand === r.email) {
        h += '<tr><td colspan="7"><div class="st-panel">' +
          '<h4>Hand over ' + esc(r.name || r.email) + '’s open work</h4>' +
          '<div class="st-note">All ' + open + ' open task(s) move in one go. The person taking them gets one message listing the lot.</div>' +
          '<div class="st-act">' +
            '<div class="st-f" style="flex:1 1 220px"><label>Give them to</label>' +
              '<select class="st-in" id="stArWho">' + staffOptions(r.email, '') + '</select></div>' +
            '<button class="btn-gold" data-act="arch-move" data-i="' + i + '">Move all ' + open + '</button>' +
            '<button class="minibtn" data-act="arch-close">Cancel</button>' +
          '</div></div></td></tr>';
      }
    });
    box.innerHTML = h + '</tbody></table></div>';
  }

  function reactivate(i) {
    var r = S.removed[i];
    if (!r) { return; }
    if (!window.confirm('Bring ' + (r.name || r.email) + ' back as ' + r.role + '? They can sign in again straight away.')) { return; }
    api('reactivateStaff', { email: r.email }).then(function (res) {
      S.removed.splice(i, 1);
      S.staff.push({ email: str(res.email), name: str(res.name), role: str(res.role), accounts: '' });
      sortStaff();
      paintRemoved('');
      paintList('');
      toast(str(res.name) + ' is back — check their timetable on the Rota screen.');
    }).catch(function (e) { toast('Could not reactivate: ' + e.message); });
  }

  function archMove(i, btn) {
    var r = S.removed[i];
    if (!r) { return; }
    var to = val('stArWho');
    if (!to) { toast('Pick who takes the work.'); return; }
    btn.disabled = true;
    api('reassignTasks', { from_email: r.email, to_email: to }).then(function (res) {
      r.open_tasks = Math.max(0, (r.open_tasks || 0) - (res.count || 0));
      S.archHand = '';
      paintRemoved('');
      toast(res.count + ' task(s) moved — the new owner has been told.');
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not moved: ' + e.message);
    });
  }

  /* ============================ ACCOUNTS ADMIN (§3 · §6) ============================ */

  function statusPill(status) {
    var s = str(status);
    if (s === ST_LINKED) { return pill('st-ok', s); }
    if (s === ST_ARCHIVED) { return pill('st-warn', s); }
    return pill('st-dim', s || 'not connected yet');
  }

  function paintAccounts(err) {
    var box = $('stAccounts');
    if (!box) { return; }
    if (!canManage()) {
      box.innerHTML = '<div class="st-note">Account and sheet admin is a super admin\'s (§4.4).</div>';
      return;
    }
    if (err) { box.innerHTML = '<div class="st-empty">' + esc(err) + '</div>'; return; }
    var a = S.accounts;
    if (!a) { box.innerHTML = spinnerCard('Reading the connections…'); return; }

    var kinds = a.sheet_kinds || [];
    var accounts = a.accounts || [];
    var live = accounts.filter(function (x) { return !x.archived; });
    var complete = live.filter(function (x) { return x.complete; }).length;

    var h = '<div class="st-kpis">' +
      pill(a.complete ? 'st-gold' : 'st-warn', complete + '/' + live.length + ' accounts fully connected') +
      pill(a.globals_linked === a.globals_of ? 'st-gold' : 'st-dim', 'globals ' + a.globals_linked + '/' + a.globals_of) +
      (accounts.length - live.length ? pill('st-dim', (accounts.length - live.length) + ' archived') : '') +
      '</div>' +
      '<div class="st-note" style="margin-bottom:12px">A sheet the portal cannot open shows as ' +
      '<b>not connected yet</b> rather than an error — §6. Archiving an account keeps its four links so ' +
      'its history stays readable.</div>';

    if (!accounts.length) {
      h += '<div class="st-empty">No accounts are connected yet.<span>Add one below, or import the Central Sheets registry.</span></div>';
    }

    accounts.forEach(function (ac, i) {
      var open = !!S.openAcc[ac.account];
      h += '<div class="st-acc' + (open ? ' open' : '') + '">' +
        '<button class="st-accq" data-act="acc-toggle" data-i="' + i + '">' +
          '<span>' + esc(ac.account) + '</span>' +
          pill(ac.complete ? 'st-gold' : 'st-dim', ac.linked + '/' + ac.of) +
          (ac.archived ? pill('st-warn', ST_ARCHIVED) : '') +
          '<span class="st-dots">' + (ac.items || []).map(function (it) {
            return '<span class="st-dot' + (str(it.status) === ST_LINKED ? ' on' : '') + '"></span>';
          }).join('') + '</span>' +
          '<span class="chev">▸</span>' +
        '</button>';
      if (open) { h += '<div class="st-accb">' + accountBody(ac, i) + '</div>'; }
      h += '</div>';
    });

    if (a.can_edit) {
      h += '<div class="st-panel" style="margin-top:16px">' +
        '<h4>Add an account</h4>' +
        '<div class="st-note">The four links can be pasted now or later — a missing one is simply "not connected yet".</div>' +
        '<div class="st-f" style="margin-top:12px"><label>Account name</label>' +
          '<input class="st-in" id="stNewAcc" placeholder="Exactly as it is written in the registry"></div>' +
        kinds.map(function (k) {
          return '<div class="st-kind"><span class="kn">' + esc(kindName(k)) + '</span>' +
            '<input class="st-in" id="stNewL-' + attr(k) + '" placeholder="Google Sheets link (optional)"></div>';
        }).join('') +
        '<div class="st-act"><button class="btn-gold" data-act="acc-add">Add the account</button></div>' +
      '</div>';
    } else {
      h += '<div class="st-note" style="margin-top:14px">Adding, renaming and archiving accounts is a super admin\'s (§4.1). ' +
        'Full sheet links are not sent to this screen (RL-9) — the last six characters are shown so rows can be told apart.</div>';
    }

    h += '<div class="st-panel" style="margin-top:16px"><h4>Company-wide sheets</h4>' +
      /* The spec says globals 10/10 in one place and 11/11 in another; the backend's own
         GLOBAL_KINDS is the tie-breaker, so both numbers here come from the response. */
      '<div class="st-note">' + a.globals_linked + ' of ' + a.globals_of + ' connected. Setup is not complete until every ' +
      'active account shows ' + kinds.length + '/' + kinds.length +
      ' and these show ' + a.globals_of + '/' + a.globals_of + ' (§6).</div>' +
      (a.globals || []).map(function (g, gi) {
        return '<div class="st-kind"><span class="kn">' + esc(kindName(g.kind)) + '</span>' +
          statusPill(g.status) +
          (g.id_tail ? '<span class="mono st-note">…' + esc(g.id_tail) + '</span>' : '') +
          (a.can_edit ? '<input class="st-in" id="stG-' + gi + '" value="' + attr(g.spreadsheet_id) + '" placeholder="Google Sheets link">' +
            '<button class="minibtn" data-act="glob-save" data-i="' + gi + '">Save</button>' : '') +
          '</div>';
      }).join('') +
    '</div>';

    box.innerHTML = h;
  }

  function accountBody(ac, i) {
    var canEdit = S.accounts && S.accounts.can_edit;
    var h = (ac.items || []).map(function (it, k) {
      return '<div class="st-kind"><span class="kn">' + esc(kindName(it.kind)) + '</span>' +
        statusPill(it.status) +
        (it.id_tail ? '<span class="mono st-note">…' + esc(it.id_tail) + '</span>' : '') +
        (canEdit ? '<input class="st-in" id="stL-' + i + '-' + k + '" data-kind="' + attr(it.kind) + '" value="' +
          attr(it.spreadsheet_id) + '" placeholder="Paste the Google Sheets link">' : '') +
        '</div>';
    }).join('');
    if (!canEdit) { return h; }
    return h +
      '<div class="st-fields" style="margin-top:12px">' +
        '<div class="st-f"><label>Rename this account</label>' +
          '<input class="st-in" id="stRen-' + i + '" placeholder="Leave blank to keep ' + attr(ac.account) + '">' +
          '<div class="st-note" style="margin-top:7px">All four links move with the name.</div></div>' +
      '</div>' +
      '<div class="st-act">' +
        '<button class="btn-gold" data-act="acc-save" data-i="' + i + '">Save this account</button>' +
        (ac.archived
          ? '<button class="minibtn" data-act="acc-restore" data-i="' + i + '">Bring back into use</button>'
          : '<button class="minibtn" data-act="acc-archive" data-i="' + i + '">Archive</button>') +
        '<span class="st-note">Archiving stops new work on the account. Its sheets stay linked and readable.</span>' +
      '</div>';
  }

  /* One call carries the rename, the four links and the archive flag together, and answers with
     the whole accounts screen — so a save is one round trip and one repaint. */
  function saveAccount(payload, btn, okMsg) {
    if (btn) { btn.disabled = true; }
    api('saveAccount', payload).then(function (r) {
      S.accounts = r;
      paintAccounts('');
      if (r.unreadable && r.unreadable.length) {
        toast('Saved. The portal cannot open: ' + r.unreadable.map(kindName).join(', ') +
          ' — share those sheets with the portal’s Google account.');
      } else {
        toast(okMsg);
      }
    }).catch(function (e) {
      if (btn) { btn.disabled = false; }
      toast('Not saved: ' + e.message);
    });
  }

  function accSave(i, btn) {
    var ac = S.accounts.accounts[i];
    if (!ac) { return; }
    var links = {}, k;
    for (k = 0; k < (ac.items || []).length; k++) {
      var el = $('stL-' + i + '-' + k);
      if (!el) { continue; }
      var v = String(el.value).trim();
      /* Only a changed box is sent: an untouched one would re-post the id the screen was given,
         and a non-super admin is not given one at all (RL-9). */
      if (v !== str(ac.items[k].spreadsheet_id)) { links[el.getAttribute('data-kind')] = v; }
    }
    var p = { scope: 'account', account: ac.account, links: links };
    var ren = val('stRen-' + i);
    if (ren) { p.new_name = ren; }
    if (!ren && !Object.keys(links).length) { toast('Nothing has been changed yet.'); return; }
    saveAccount(p, btn, ren ? 'Renamed to ' + ren + ' — all its links moved with it.' : 'Connections saved.');
  }

  function accAdd(btn) {
    var name = val('stNewAcc');
    if (!name) { toast('An account name is needed.'); return; }
    var links = {};
    (S.accounts.sheet_kinds || []).forEach(function (k) {
      var v = val('stNewL-' + k);
      if (v) { links[k] = v; }
    });
    saveAccount({ scope: 'account', account: name, links: links }, btn, name + ' added.');
  }

  /* ============================ WIRING ============================ */

  /* Delegated per section rather than on #mainView: that element outlives the view, so a handler
     left on it would keep firing on other screens — several of which use data-act of their own. */
  function onClick(ev) {
    var root = ev.currentTarget;
    var t = upTo(ev.target, 'data-act', root);
    if (!t) { return; }
    var act = t.getAttribute('data-act');
    var i = parseInt(t.getAttribute('data-i'), 10);

    if (act === 'chip') { chipClick(t); return; }
    if (act === 'ack') {
      var go = root.querySelector('[data-act="remove-do"]');
      if (go) { go.disabled = !t.checked; }
      return;
    }
    if (act === 'approve') { approve(i, t); return; }
    if (act === 'add') { addStaff(t); return; }
    if (act === 'edit') {
      var s = S.staff[i];
      S.editing = (s && S.editing === s.email) ? '' : (s ? s.email : '');
      S.removing = '';
      paintList('');
      return;
    }
    if (act === 'cancel') { S.editing = ''; S.removing = ''; paintList(''); return; }
    if (act === 'save') { saveStaff(i, t); return; }
    if (act === 'remove-open') {
      var r = S.staff[i];
      S.removing = r ? r.email : '';
      S.editing = '';
      paintList('');
      return;
    }
    if (act === 'remove-do') { removeStaff(i, t); return; }
    if (act === 'handover') { doHandover(t); return; }
    if (act === 'handover-close') { S.handover = null; paintList(''); return; }
    if (act === 'reactivate') { reactivate(i); return; }
    if (act === 'arch-hand') { S.archHand = (S.removed[i] || {}).email || ''; paintRemoved(''); return; }
    if (act === 'arch-close') { S.archHand = ''; paintRemoved(''); return; }
    if (act === 'arch-move') { archMove(i, t); return; }
    if (!S.accounts) { return; }                       // every branch below reads the accounts screen
    if (act === 'acc-toggle') {
      var name = ((S.accounts.accounts || [])[i] || {}).account;
      if (name) { S.openAcc[name] = !S.openAcc[name]; paintAccounts(''); }
      return;
    }
    if (act === 'acc-save') { accSave(i, t); return; }
    if (act === 'acc-archive') {
      var av = S.accounts.accounts[i];
      if (!av || !window.confirm('Archive ' + av.account + '? It stops taking new work; its sheets stay linked and its history stays readable.')) { return; }
      saveAccount({ scope: 'account', account: av.account, archive: true }, t, av.account + ' archived — its history stays readable.');
      return;
    }
    if (act === 'acc-restore') {
      var rv = S.accounts.accounts[i];
      if (!rv) { return; }
      saveAccount({ scope: 'account', account: rv.account, archive: false }, t, rv.account + ' is back in use.');
      return;
    }
    if (act === 'acc-add') { accAdd(t); return; }
    if (act === 'glob-save') {
      var g = (S.accounts.globals || [])[i];
      if (!g) { return; }
      saveAccount({ scope: 'global', kind: g.kind, link: val('stG-' + i) }, t, kindName(g.kind) + ' saved.');
      return;
    }
  }

  /* ============================ THE VIEW ============================ */

  VIEWS.staffAdmin = {
    label: 'Staff & accounts',
    order: 62,
    roles: ST_SEES,
    icon: '<circle cx="9" cy="8" r="4"/><path d="M2 21c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5"/><path d="M17 8h5M19.5 5.5v5"/>',

    render: function () {
      var mgr = canManage();
      var h = '<div class="hgroup enter d1"><h1>Staff &amp; <span class="goldtext">accounts</span></h1>' +
        '<span class="sub">Who gets in, what they may see, and which sheets are connected</span>' +
        '<button class="btn-ghost" id="stRefresh" style="margin-left:auto">Refresh</button></div>' +

        '<div class="card enter d2"><div class="hd">Waiting for approval ' +
          '<span class="hint">nobody can sign in until you approve them</span></div>' +
          '<div class="bd" id="stQueue">' + spinnerCard('Reading the queue…') + '</div></div>';

      if (mgr) {
        h += '<div class="card enter d3" style="margin-top:16px"><div class="hd">Add a staff member ' +
          '<span class="hint">§4.1b — straight in, no registration needed</span></div>' +
          '<div class="bd" id="stAdd"></div></div>';
      } else {
        h += '<div class="card enter d3" style="margin-top:16px"><div class="bd" id="stAdd"></div></div>';
      }

      h += '<div class="card enter d3" style="margin-top:16px"><div class="hd">The team ' +
          '<span class="hint">timetables live on the Rota screen</span></div>' +
          '<div class="bd" id="stList">' + spinnerCard('Reading the staff list…') + '</div></div>';

      if (mgr) {
        h += '<div class="card enter d3" style="margin-top:16px"><div class="hd">Removed staff ' +
            '<span class="hint">nothing is ever purged</span></div>' +
            '<div class="bd" id="stRemoved">' + spinnerCard('Reading the archive…') + '</div></div>' +
          '<div class="card enter d3" style="margin-top:16px"><div class="hd">eBay accounts &amp; their sheets ' +
            '<span class="hint">§6 connection health</span></div>' +
            '<div class="bd" id="stAccounts">' + spinnerCard('Reading the connections…') + '</div></div>';
      }
      return h;
    },

    init: function () {
      S.editing = ''; S.removing = ''; S.handover = null; S.archHand = '';
      ['stQueue', 'stAdd', 'stList', 'stRemoved', 'stAccounts'].forEach(function (id) {
        var el = $(id);
        if (el) { el.onclick = onClick; }
      });
      var r = $('stRefresh');
      if (r) {
        r.onclick = function () {
          S.editing = ''; S.removing = ''; S.handover = null; S.archHand = '';
          loadAll();
        };
      }
      loadAll();
    }
  };
})();
