/* Staff administration — the approval queue and the staff list (§4.1b).
 * Management does this from the portal itself: approving a colleague should never require
 * opening Apps Script. Backend: listPending · approveUser · assignableStaff · accountList. */
(function () {

  var AD_MGMT = ['Management', 'Ops Head'];
  var AD_SHIFTS = ['Shift 1', 'Shift 2', 'Custom'];

  VIEW_CSS.push(
    '.ad-card{border:1px solid var(--gold-line);border-radius:12px;padding:14px 16px;margin-bottom:12px;' +
      'background:linear-gradient(180deg,var(--panel-2),var(--panel))}' +
    '.ad-card:hover{border-color:var(--gold-line-hi)}' +
    '.ad-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}' +
    '.ad-name{font-weight:800;font-size:15px}' +
    '.ad-mail{color:var(--text-3);font-size:12.5px}' +
    '.ad-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px}' +
    '.ad-fields label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;' +
      'letter-spacing:.08em;color:var(--text-3);margin-bottom:5px}' +
    '.ad-in{width:100%;padding:9px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);' +
      'background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.ad-in:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.ad-act{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}' +
    '.ad-note{font-size:12px;color:var(--text-3);font-weight:600}' +
    '.ad-empty{padding:26px;text-align:center;color:var(--text-3);font-weight:600}' +
    '.ad-empty span{display:block;margin-top:6px;font-size:12.5px;color:var(--text-3);opacity:.8}' +
    '@media(max-width:880px){.ad-fields{grid-template-columns:1fr}}'
  );

  function adCanAdmin() { return AD_MGMT.indexOf(STATE.user.role) >= 0; }
  function adStr(v) { return v === null || v === undefined ? '' : String(v); }

  function adOptions(list, selected) {
    return list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  /* Roles come from the backend's own list so this screen can never drift from what the
     server will actually accept. */
  function adRoleOptions(selected) {
    var roles = (STATE.config && STATE.config.roles) || [];
    if (!roles.length) { return '<option value="' + esc(selected) + '">' + esc(selected || '—') + '</option>'; }
    return adOptions(roles, selected);
  }

  function adPendingCard(u) {
    var id = esc(u.email);
    return '<div class="ad-card" data-pending="' + id + '">' +
      '<div class="ad-top"><span class="ad-name">' + esc(u.name || u.email) + '</span>' +
        '<span class="ad-mail">' + esc(u.email) + '</span>' +
        '<span class="pill role" style="margin-left:auto">asked for ' + esc(u.role || 'a role') + '</span></div>' +
      '<div class="ad-fields">' +
        '<div><label>Role</label><select class="ad-in" data-f="role">' + adRoleOptions(adStr(u.role)) + '</select></div>' +
        '<div><label>Shift</label><select class="ad-in" data-f="shift">' +
          '<option value="">Set later in the rota</option>' + adOptions(AD_SHIFTS, adStr(u.shift)) + '</select></div>' +
        '<div><label>Accounts they may see</label><input class="ad-in" data-f="accounts" value="' +
          esc(adStr(u.accounts) || 'per-role') + '"></div>' +
      '</div>' +
      '<div class="ad-act">' +
        '<button class="btn-gold" data-approve="' + id + '">Approve</button>' +
        '<span class="ad-note">They can sign in the moment you approve. Their timetable comes from the Rota screen.</span>' +
      '</div>' +
    '</div>';
  }

  function adLoadPending() {
    var box = $('adPending');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('listPending').then(function (d) {
      var list = (d && d.pending) || [];
      STATE.counts.staffAdmin = list.length;
      if (typeof refreshBadges === 'function') { refreshBadges(); }
      if (!list.length) {
        box.innerHTML = '<div class="ad-empty">Nobody is waiting for approval.' +
          '<span>When someone signs in for the first time, they appear here.</span></div>';
        return;
      }
      box.innerHTML = list.map(adPendingCard).join('');
      var btns = box.querySelectorAll('[data-approve]');
      for (var i = 0; i < btns.length; i++) { btns[i].onclick = adApprove; }
    }).catch(function (e) {
      box.innerHTML = '<div class="ad-empty">Could not load the queue.<span>' + esc(e.message) + '</span></div>';
    });
  }

  function adApprove(ev) {
    var btn = ev.currentTarget;
    var email = btn.getAttribute('data-approve');
    var card = btn.closest('.ad-card');
    var get = function (f) {
      var el = card.querySelector('[data-f="' + f + '"]');
      return el ? el.value : '';
    };
    btn.disabled = true;
    btn.textContent = 'Approving…';
    api('approveUser', { email: email, role: get('role'), shift: get('shift'), accounts: get('accounts') })
      .then(function () {
        toast(email + ' approved — they can sign in now.');
        adLoadPending();
        adLoadStaff();
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'Approve';
        toast('Could not approve: ' + e.message);
      });
  }

  function adLoadStaff() {
    var box = $('adStaff');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('assignableStaff').then(function (d) {
      var staff = (d && d.staff) || [];
      if (!staff.length) {
        box.innerHTML = '<div class="ad-empty">No approved staff yet.</div>';
        return;
      }
      box.innerHTML = '<div class="scroll"><table><thead><tr><th>Name</th><th>Role</th>' +
        '<th>Accounts</th><th>Email</th></tr></thead><tbody>' +
        staff.map(function (s) {
          return '<tr><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.role) + '</td>' +
            '<td>' + esc(s.accounts || 'per-role') + '</td>' +
            '<td class="mono">' + esc(s.email) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }).catch(function () {
      box.innerHTML = '<div class="ad-empty">Could not load the staff list.</div>';
    });
  }

  VIEWS.staffAdmin = {
    label: 'Staff & approvals',
    order: 62,
    roles: AD_MGMT,
    icon: '<circle cx="9" cy="8" r="4"/><path d="M2 21c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5"/><path d="M17 8h5M19.5 5.5v5"/>',
    render: function () {
      if (!adCanAdmin()) {
        return '<div class="hgroup enter d1"><h1>Staff</h1><span class="sub">Management only</span></div>';
      }
      return '<div class="hgroup enter d1"><h1>Staff &amp; <span class="goldtext">approvals</span></h1>' +
          '<span class="sub">Approve who gets in, and what they may see</span>' +
          '<button class="btn-ghost" id="adRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="hd">Waiting for approval ' +
          '<span class="hint">nobody can sign in until you approve them</span></div>' +
          '<div class="bd" id="adPending"><div class="spinner"></div></div></div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">Approved staff ' +
          '<span class="hint">who can use the portal today</span></div>' +
          '<div class="bd" id="adStaff"><div class="spinner"></div></div></div>';
    },
    init: function () {
      if (!adCanAdmin()) { return; }
      var r = $('adRefresh');
      if (r) { r.onclick = function () { adLoadPending(); adLoadStaff(); }; }
      adLoadPending();
      adLoadStaff();
    }
  };
})();
