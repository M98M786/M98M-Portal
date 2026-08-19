/* view-tasks.js — §7 TASKS + §8.0b UNIVERSAL APPROVAL GATE.
 * Views: tasks (My tasks) · approvals (Pending approvals).
 * Backend: myTasks · createTask · startTask · submitTask · pendingApprovals · approveTask · returnTask. */
(function () {

  /* Status strings, task types and creator rights are backend vocabulary — they must match
     Tasks.gs character for character (the em dash in TK_SUBMITTED included). */
  var TK_PENDING = 'Pending';
  var TK_WORKING = 'Working';
  var TK_UPDATED = 'Updated';
  var TK_SUBMITTED = 'Submitted — awaiting approval';
  var TK_COMPLETED = 'Completed';
  var TK_TYPES = ['general', 'listing_new', 'listing_revision', 'cpc_research', 'campaign_set', 'supplier_add', 'potential_cpc_review', 'query'];
  var TK_ITEM_TYPES = ['listing_new', 'listing_revision', 'cpc_research', 'campaign_set', 'supplier_add', 'potential_cpc_review'];
  var TK_CREATE_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];       // §4.3 + §4.4
  var TK_APPROVE_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'Listing Manager'];
  var TK_OPEN = [TK_PENDING, TK_WORKING, TK_UPDATED];

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.tk-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}' +
    '.tk-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 14px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.tk-tbl td{padding:12px 14px;border-bottom:1px solid var(--gold-line);vertical-align:middle}' +
    '.tk-tbl tbody tr{transition:background .12s}' +
    '.tk-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.tk-tbl tr.tk-x:hover{background:none}' +
    '.tk-tbl tr.tk-x>td{padding-top:0;border-bottom:1px solid var(--gold-line)}' +
    '.due{font-weight:800}.due.today{color:var(--warn)}.due.late{color:var(--bad)}' +
    '.pill.pending{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.working{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.updated{background:var(--blue-soft);color:var(--blue-2);outline:1px solid rgba(61,155,240,.35)}' +
    '.pill.awaiting{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.done{background:var(--ok-soft);color:var(--ok)}' +
    '.tk-title{font-weight:800}' +
    '.tk-meta{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:3px;letter-spacing:.03em}' +
    '.tk-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.tk-sub{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.tk-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.55}' +
    '.tk-link{color:var(--blue-2);font-weight:700}' +
    '.tk-box{margin-top:10px;padding:11px 13px;border-radius:10px}' +
    '.tk-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.tk-ret{background:var(--bad-soft);border:1px solid rgba(240,96,90,.45)}' +
    '.tk-ret .k{color:var(--bad)}' +
    '.tk-det{background:rgba(120,132,152,.10);border:1px solid var(--gold-line)}' +
    '.tk-note{background:var(--blue-soft);border:1px solid rgba(61,155,240,.30)}' +
    '.tk-note .k{color:var(--blue-2)}' +
    '.tk-form{margin-top:10px}' +
    '.tk-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.tk-ta,.tk-in{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.tk-ta{resize:vertical;min-height:66px}' +
    '.tk-ta:focus,.tk-in:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.tk-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}' +
    '.tk-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.tk-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.tk-ap{padding:15px 0}.tk-ap+.tk-ap{border-top:1px solid var(--gold-line)}' +
    '.tk-ap-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}' +
    '.tk-lag{background:rgba(120,132,152,.16);color:var(--text-2)}' +
    '.tk-lag.tk-w{background:var(--warn-soft);color:var(--warn)}' +
    '.tk-lag.tk-b{background:var(--bad-soft);color:var(--bad)}' +
    '.tk-dt-title{font-size:15px;font-weight:800;line-height:1.4}' +
    '.tk-dt-grid{display:grid;gap:0;margin-top:10px;border:1px solid var(--gold-line);border-radius:10px;overflow:hidden}' +
    '.tk-dt-row{display:flex;gap:14px;padding:8px 12px;font-size:12.5px}' +
    '.tk-dt-row:nth-child(even){background:rgba(120,132,152,.07)}' +
    '.tk-dt-row .k{flex:0 0 44%;color:var(--text-3);font-weight:700;font-size:11.5px;text-transform:none;letter-spacing:0}' +
    '.tk-dt-row .v{flex:1;font-weight:600;word-break:break-word}' +
    '.tk-dt-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
    '.tk-dt-lnk{padding:6px 12px;border:1px solid rgba(61,155,240,.4);border-radius:20px;font-size:11.5px;font-weight:800;color:var(--blue-2);background:var(--blue-soft)}' +
    '.tk-dt-desc{margin-top:12px;font-size:12.5px;line-height:1.6;white-space:pre-wrap}' +
    '.tk-dt-desc .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '@media (max-width:880px){' +
      '.tk-grid{grid-template-columns:1fr}' +
      '.tk-tbl{min-width:0}.tk-tbl thead{display:none}' +
      '.tk-tbl tr{display:block;padding:6px 0}' +
      '.tk-tbl td{display:block;border-bottom:0;padding:4px 0}' +
      '.tk-tbl tr.tk-r{border-top:1px solid var(--gold-line);padding-top:12px}' +
      '.tk-tbl tr.tk-x>td{border-bottom:0}' +
      '.tk-tbl td[data-k]:before{content:attr(data-k) " ";font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-right:7px}' +
    '}'
  );

  // ---------- safety helpers (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function tkAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  /** Text for the DOM: escaped, with http/https URLs (and nothing else) turned into links. */
  function tkText(v) {
    var s = String(v == null ? '' : v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a class="tk-link" href="' + tkAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }

  function tkPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) return els[i]; }
    return null;
  }
  function tkHas(arr, v) { return arr.indexOf(v) >= 0; }
  function tkRole() { return (STATE.user && STATE.user.role) || ''; }
  /* Hasib item 19: EVERY approved staff member can hand a task or lead to anyone. Roles outside
     TK_CREATE_ROLES get the open types only (general / query / supplier_add) — the server
     enforces the same line. */
  function tkCanCreate() { return true; }
  function tkPrivileged() { return tkHas(TK_CREATE_ROLES, tkRole()); }
  function tkStr(v) { return String(v == null ? '' : v).trim(); }

  function tkCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  // ---------- PKT time (the team's clock, whatever the device says) ----------
  var TK_TZ = 'Asia/Karachi';
  function tkMs(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? NaN : d.getTime(); }
  function tkDay(ms) {
    return new Date(ms).toLocaleDateString('en-CA', { timeZone: TK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  function tkClock(ms) {
    var s = new Date(ms).toLocaleTimeString('en-GB', { timeZone: TK_TZ, hour: 'numeric', minute: '2-digit', hour12: true });
    return s.replace(/\s*([ap])\.?m\.?$/i, function (all, ap) { return ' ' + ap.toUpperCase() + 'M'; });
  }
  function tkWhen(iso) {
    var ms = tkMs(iso);
    if (isNaN(ms)) { return tkStr(iso); }
    var today = tkDay(Date.now());
    if (tkDay(ms) === today) { return 'Today ' + tkClock(ms); }
    if (tkDay(ms) === tkDay(Date.now() + 86400000)) { return 'Tomorrow ' + tkClock(ms); }
    return new Date(ms).toLocaleDateString('en-GB', { timeZone: TK_TZ, day: 'numeric', month: 'short' }) + ' ' + tkClock(ms);
  }
  function tkMins(min) {
    var n = Number(min) || 0, d, h;
    if (n < 60) { return n + 'm'; }
    if (n < 1440) { h = Math.floor(n / 60); return h + 'h ' + (n - h * 60) + 'm'; }
    d = Math.floor(n / 1440); h = Math.round((n - d * 1440) / 60);
    return d + 'd ' + h + 'h';
  }

  // ---------- task shaping ----------
  function tkPillClass(status) {
    if (status === TK_PENDING) return 'pending';
    if (status === TK_WORKING) return 'working';
    if (status === TK_UPDATED) return 'updated';
    if (status === TK_SUBMITTED) return 'awaiting';
    if (status === TK_COMPLETED) return 'done';
    return '';
  }
  function tkDueCell(t) {
    var iso = t.deadline_pkt, ms = tkMs(iso), status = tkStr(t.status), cls = 'due num', late;
    if (!iso) { return '<span class="tk-sub">No deadline</span>'; }
    late = t.overdue === true || (!isNaN(ms) && ms < Date.now() && status !== TK_COMPLETED);
    if (late) { cls += ' late'; }
    else if (!isNaN(ms) && tkDay(ms) === tkDay(Date.now())) { cls += ' today'; }
    return '<span class="' + cls + '">' + esc(tkWhen(iso)) + '</span>' +
      (late ? '<div class="tk-sub" style="color:var(--bad)">Overdue</div>' : '');
  }
  /** Return() appends "[stamp] Name returned: comment" to comments — the employee must see the last one. */
  function tkReturned(comments) {
    var lines = String(comments == null ? '' : comments).split('\n'), re = /^\[([^\]]+)\]\s*(.*?)\s+returned:\s*([\s\S]*)$/, at = -1, i, m;
    for (i = 0; i < lines.length; i++) { if (re.test(lines[i])) { at = i; } }
    if (at < 0) { return null; }
    m = re.exec(lines.slice(at).join('\n'));
    return m ? { when: m[1], by: m[2], text: m[3] } : null;
  }
  function tkApprover(t) { return tkStr(t.assigned_by) || 'Management'; }

  // ============================== MY TASKS ==============================
  VIEWS.tasks = {
    label: 'My tasks',
    icon: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    roles: '*',
    order: 20,
    prefetch: function () { return tkFetchTasks(); },
    badge: function () { return (STATE.counts && STATE.counts.tasks) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>My tasks</h1>' +
          '<span class="sub">Sorted by deadline · Pakistan time</span>' +
          (tkCanCreate() ? '<button class="btn-gold" id="tkNewToggle" style="margin-left:auto">New task</button>' : '') +
        '</div>' +
        (tkCanCreate() ? tkComposer() : '') +
        '<div class="card enter d2"><div class="hd">Assigned to me ' +
          '<span class="hint">No task completes itself — every submission waits for approval</span></div>' +
          '<div class="bd" id="tkBody"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      if (tkCanCreate()) { tkWireComposer(); }
      tkLoadTasks();
      if (tkHas(TK_APPROVE_ROLES, tkRole())) {
        api('pendingApprovals').then(function (d) { tkCount('approvals', ((d && d.tasks) || []).length); }).catch(function () {});
      }
    }
  };

  function tkComposer() {
    var role = tkRole();
    var types = (role === 'Advertising Manager') ? ['listing_revision']               // §4.3: revisions only
      : tkPrivileged() ? TK_TYPES
      : ['general', 'query', 'supplier_add'];                                         // item 19: the open types
    var opts = types.map(function (t) { return '<option value="' + tkAttr(t) + '">' + esc(t) + '</option>'; }).join('');
    var accounts = tkStr(STATE.user && STATE.user.accounts);
    var accField;
    if (accounts && accounts !== 'ALL') {
      accField = '<select class="tk-in" id="tkNewAccount"><option value=""></option>' +
        accounts.split(',').map(function (a) {
          var v = a.replace(/^\s+|\s+$/g, '');
          return v ? '<option value="' + tkAttr(v) + '">' + esc(v) + '</option>' : '';
        }).join('') + '</select>';
    } else {
      accField = '<input class="tk-in" id="tkNewAccount" type="text" autocomplete="off">';
    }
    return '<div class="card enter d2 hidden" id="tkNewCard" style="margin-bottom:16px">' +
      '<div class="hd">New task <span class="hint">the person you assign it to submits it back to you for approval</span></div>' +
      '<div class="bd">' +
        '<div class="tk-grid">' +
          '<div class="field"><label>Type</label><select class="tk-in" id="tkNewType">' + opts + '</select></div>' +
          '<div class="field"><label>Assign to</label><input class="tk-in" id="tkNewTo" type="email" autocomplete="off" placeholder="company email"></div>' +
          '<div class="field"><label>Title</label><input class="tk-in" id="tkNewTitle" type="text" autocomplete="off"></div>' +
          '<div class="field"><label>Deadline (PKT)</label><input class="tk-in" id="tkNewDeadline" type="datetime-local"></div>' +
          '<div class="field"><label>Account</label>' + accField + '</div>' +
          '<div class="field"><label>Item ID</label><input class="tk-in" id="tkNewItem" type="text" inputmode="numeric" autocomplete="off"></div>' +
          '<div class="field"><label>Priority</label><input class="tk-in" id="tkNewPriority" type="text" autocomplete="off"></div>' +
        '</div>' +
        '<div class="field" style="margin-top:12px"><label>Details</label><textarea class="tk-ta" id="tkNewDetails"></textarea></div>' +
        '<div class="tk-btns"><button class="btn-gold" id="tkNewSend">Create task</button>' +
          '<button class="minibtn" id="tkNewCancel">Cancel</button></div>' +
      '</div></div>';
  }

  function tkWireComposer() {
    var card = $('tkNewCard');
    $('tkNewToggle').onclick = function () {
      card.classList.toggle('hidden');
      if (!card.classList.contains('hidden')) { $('tkNewTitle').focus(); }
    };
    $('tkNewCancel').onclick = function () { card.classList.add('hidden'); };
    $('tkNewSend').onclick = function () {
      var btn = this;
      var item = tkStr($('tkNewItem').value);
      var payload = {
        type: $('tkNewType').value,
        assigned_to: tkStr($('tkNewTo').value),
        title: tkStr($('tkNewTitle').value),
        deadline_pkt: tkStr($('tkNewDeadline').value),
        account: tkStr($('tkNewAccount').value),
        priority: tkStr($('tkNewPriority').value),
        details: tkStr($('tkNewDetails').value)
      };
      if (!payload.title) { toast('Give the task a title.'); return; }
      if (!payload.assigned_to) { toast('Choose who this task is for.'); return; }
      if (!payload.deadline_pkt) { toast('Set a deadline (Pakistan time).'); return; }
      if (item && !/^\d{9,15}$/.test(item)) { toast('An Item ID is 9 to 15 digits.'); return; }
      if (item) { payload.item_id = item; }
      btn.disabled = true;
      api('createTask', payload).then(function (res) {
        btn.disabled = false;
        card.classList.add('hidden');
        $('tkNewTitle').value = ''; $('tkNewItem').value = ''; $('tkNewDetails').value = ''; $('tkNewPriority').value = '';
        toast('Task created · ' + res.task_id);
        tkLoadTasks();
      }).catch(function (e) { btn.disabled = false; toast('Not created: ' + e.message); });
    };
  }

  /** Shared by the screen and the sign-in warm-up. Starting/submitting a cached row is safe for
      the same reason as the hunt queue: the server re-validates every action against the current
      task, so a stale row can only earn a readable error, never a wrong write. */
  function tkFetchTasks() {
    return api('myTasks').then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('myTasks', {}, d); }
      return d;
    });
  }

  function tkPaintTasks(box, d) {
    var tasks = (d && d.tasks) || [], open = 0, i;
    for (i = 0; i < tasks.length; i++) { if (tkHas(TK_OPEN, tkStr(tasks[i].status))) { open++; } }
    tkCount('tasks', open);
    if (!tasks.length) {
      box.innerHTML = '<div class="tk-empty">No tasks on you right now.<span>New work lands here the moment someone assigns it.</span></div>';
      return;
    }
    box.innerHTML = '<div class="scroll"><table class="tk-tbl">' +
      '<thead><tr><th>Task</th><th>Account</th><th>Item ID</th><th>Deadline</th><th>Status</th><th></th></tr></thead>' +
      '<tbody>' + tasks.map(tkRow).join('') + '</tbody></table></div>';
    tkWireRows(box);
  }

  function tkLoadTasks() {
    var box = $('tkBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('myTasks', {}) : null;
    if (had) { try { tkPaintTasks(box, had); } catch (e) { had = null; } }
    tkFetchTasks().then(function (d) {
      tkPaintTasks(box, d);
    }).catch(function (e) {
      if (had) { toast('Showing your last task list — could not refresh just now.'); return; }
      box.innerHTML = '<div class="tk-empty">Your tasks could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="tkRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('tkRetry'); if (r) { r.onclick = tkLoadTasks; }
    });
  }

  /* V2 req 27 — a listing task's details used to be the raw JSON shown as one paragraph, and
     nobody could read it. This renders the same payload as a grid: title first, links as
     buttons, the description as prose, every other filled field as label→value. Header names
     from the live sheet carry trailing spaces/newlines/typos, so matching is by normalized
     name, never byte-for-byte. Anything that is not the known payload falls back to plain text. */
  function tkNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  function tkDetailsHtml(details) {
    var obj = null;
    try { obj = JSON.parse(details); } catch (e) { return tkText(details); }
    if (!obj || typeof obj !== 'object') { return tkText(details); }
    // Chained-flow tasks (req 34): {note, chain} — the note as prose, the remaining steps listed.
    if (obj.note || obj.chain) {
      var ch = '';
      if (obj.note) { ch += '<div class="tk-dt-desc">' + tkText(String(obj.note)) + '</div>'; }
      if (obj.chain && obj.chain.length) {
        ch += '<div class="tk-dt-grid" style="margin-top:10px">' + obj.chain.map(function (st, i) {
          return '<div class="tk-dt-row"><span class="k">After this: step ' + (i + 1) + '</span><span class="v">' +
            esc(tkStr(st.title || st.type)) + '</span></div>';
        }).join('') + '</div>';
      }
      return ch || tkText(details);
    }
    var lim = obj.limited || obj.listing || obj;
    if (!lim || typeof lim !== 'object' || Array.isArray(lim)) { return tkText(details); }

    var title = '', desc = '', links = [], facts = [], huntId = tkStr(obj.hunt_id);
    Object.keys(lim).forEach(function (k) {
      var v = tkStr(lim[k]);
      if (!v) { return; }
      var n = tkNorm(k), label = String(k).replace(/\s+/g, ' ').trim();
      if (n === 'title') { title = v; return; }
      if (n === 'description') { desc = v; return; }
      if (/^https?:\/\//i.test(v)) { links.push({ label: label, url: v }); return; }
      facts.push({ label: label, value: v });
    });
    if (!title && !links.length && !facts.length) { return tkText(details); }

    var h = '';
    if (title) { h += '<div class="tk-dt-title">' + esc(title) + '</div>'; }
    if (huntId) { h += '<div class="tk-sub mono" style="margin-top:2px">' + esc(huntId) + '</div>'; }
    if (facts.length) {
      h += '<div class="tk-dt-grid">' + facts.map(function (f) {
        return '<div class="tk-dt-row"><span class="k">' + esc(f.label) + '</span><span class="v">' + esc(f.value) + '</span></div>';
      }).join('') + '</div>';
    }
    if (links.length) {
      h += '<div class="tk-dt-links">' + links.map(function (l) {
        var u = safeUrl(l.url);
        return u ? '<a class="tk-dt-lnk" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + ' ↗</a>' : '';
      }).join('') + '</div>';
    }
    if (desc) { h += '<div class="tk-dt-desc"><div class="k">Description</div>' + tkText(desc) + '</div>'; }
    return h;
  }

  function tkRow(t) {
    var id = tkStr(t.task_id), status = tkStr(t.status), type = tkStr(t.type);
    var ret = (status === TK_WORKING || status === TK_UPDATED) ? tkReturned(t.comments) : null;
    var details = tkStr(t.details);
    var priority = tkStr(t.priority);
    var act = '', extra = '';

    if (status === TK_PENDING) {
      act = '<button class="minibtn" data-act="start" data-id="' + tkAttr(id) + '">Start</button>';
    } else if (status === TK_WORKING || status === TK_UPDATED) {
      act = '<button class="minibtn" data-act="open" data-id="' + tkAttr(id) + '">Submit</button>';
    } else if (status === TK_SUBMITTED) {
      act = '<span class="pill awaiting">Awaiting approval</span><span class="tk-sub">with ' + esc(tkApprover(t)) + '</span>';
    } else if (status === TK_COMPLETED) {
      act = '<span class="tk-sub">Approved' + (t.decided_at ? ' · ' + esc(tkWhen(t.decided_at)) : '') + '</span>';
    }
    if (details) {
      act += '<button class="minibtn" data-act="details" data-id="' + tkAttr(id) + '">Details</button>';
    }

    if (ret) {
      extra += '<div class="tk-box tk-ret"><div class="k">Returned by ' + esc(ret.by) + ' · ' + esc(tkWhen(ret.when)) + '</div>' +
        '<div class="tk-txt">' + tkText(ret.text) + '</div></div>';
    }
    if (details) {
      extra += '<div class="tk-box tk-det hidden" data-details="' + tkAttr(id) + '"><div class="k">Details</div>' +
        '<div class="tk-txt">' + tkDetailsHtml(details) + '</div></div>';
    }
    if (status === TK_WORKING || status === TK_UPDATED) {
      extra += tkSubmitForm(t, id, type);
    }

    return '<tr class="tk-r">' +
        '<td data-k="Task"><div class="tk-title">' + esc(tkStr(t.title)) + '</div>' +
          '<div class="tk-meta">' + esc(type) + (priority ? ' · ' + esc(priority) : '') + '</div></td>' +
        '<td data-k="Account">' + (tkStr(t.account) ? esc(tkStr(t.account)) : '<span class="tk-sub">—</span>') + '</td>' +
        '<td data-k="Item ID" class="mono">' + (tkStr(t.item_id) ? esc(tkStr(t.item_id)) : '—') + '</td>' +
        '<td data-k="Deadline">' + tkDueCell(t) + '</td>' +
        '<td data-k="Status"><span class="pill ' + tkPillClass(status) + '">' + esc(status) + '</span></td>' +
        '<td class="tk-act">' + act + '</td>' +
      '</tr>' +
      (extra ? '<tr class="tk-x"><td colspan="6">' + extra + '</td></tr>' : '');
  }

  function tkSubmitForm(t, id, type) {
    var wantsItem = tkHas(TK_ITEM_TYPES, type);
    return '<div class="tk-form hidden" data-form="' + tkAttr(id) + '">' +
      '<div class="field"><label>Submission note</label>' +
        '<textarea class="tk-ta" data-note="' + tkAttr(id) + '" placeholder="What you did, and anything the approver should check"></textarea></div>' +
      (wantsItem ? '<div class="field" style="margin-top:10px"><label>Item ID' + (type === 'listing_new' ? ' (required)' : '') + '</label>' +
        '<input class="tk-in" type="text" inputmode="numeric" autocomplete="off" data-item="' + tkAttr(id) + '" value="' + tkAttr(tkStr(t.item_id)) + '"></div>' : '') +
      '<div class="tk-btns"><button class="minibtn" data-act="send" data-id="' + tkAttr(id) + '">Submit for approval</button>' +
        '<button class="minibtn" data-act="cancel" data-id="' + tkAttr(id) + '">Cancel</button>' +
        '<span class="tk-sub">It moves to ' + esc(TK_SUBMITTED) + '.</span></div>' +
    '</div>';
  }

  function tkWireRows(box) {
    var btns = box.querySelectorAll('button[data-act]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { tkRowAction(box, b.getAttribute('data-act'), b.getAttribute('data-id'), b); };
      })(btns[i]);
    }
  }

  function tkRowAction(box, act, id, btn) {
    var form, note, item, payload, block;
    if (act === 'details') {
      block = tkPick(box, 'data-details', id);
      if (block) { block.classList.toggle('hidden'); }
      return;
    }
    form = tkPick(box, 'data-form', id);
    if (act === 'open') {
      if (form) { form.classList.remove('hidden'); var ta = tkPick(box, 'data-note', id); if (ta) { ta.focus(); } }
      return;
    }
    if (act === 'cancel') { if (form) { form.classList.add('hidden'); } return; }
    if (act === 'start') {
      btn.disabled = true;
      api('startTask', { task_id: id }).then(function () { toast('Started — the clock is running.'); tkLoadTasks(); })
        .catch(function (e) { btn.disabled = false; toast('Could not start: ' + e.message); });
      return;
    }
    if (act === 'send') {
      note = tkPick(box, 'data-note', id);
      item = tkPick(box, 'data-item', id);
      payload = { task_id: id, submission_note: note ? tkStr(note.value) : '' };
      if (!payload.submission_note) { toast('Add a submission note — the approver needs it.'); if (note) { note.focus(); } return; }
      if (item) {
        var v = tkStr(item.value);
        if (v && !/^\d{9,15}$/.test(v)) { toast('An Item ID is 9 to 15 digits.'); item.focus(); return; }
        if (v) { payload.item_id = v; }
      }
      btn.disabled = true;
      api('submitTask', payload).then(function () { toast('Sent for approval.'); tkLoadTasks(); })
        .catch(function (e) { btn.disabled = false; toast('Not submitted: ' + e.message); });
    }
  }

  // ============================== PENDING APPROVALS ==============================
  VIEWS.approvals = {
    label: 'Pending approvals',
    icon: '<path d="M12 3 5 6.2v5c0 4.4 3 8.2 7 9.3 4-1.1 7-4.9 7-9.3v-5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    roles: TK_APPROVE_ROLES,
    order: 25,
    badge: function () { return (STATE.counts && STATE.counts.approvals) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Pending approvals</h1>' +
          '<span class="sub">Nothing counts for anyone until you decide · oldest first</span>' +
          '<button class="minibtn" id="apRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="card enter d2"><div class="hd">Waiting on you ' +
          '<span class="hint">Approve completes the task · Return needs a comment</span></div>' +
          '<div class="bd" id="apBody"><div class="spinner"></div></div>' +
        '</div>';
    },
    init: function () {
      $('apRefresh').onclick = tkLoadApprovals;
      tkLoadApprovals();
      api('myTasks').then(function (d) {
        var tasks = (d && d.tasks) || [], open = 0, i;
        for (i = 0; i < tasks.length; i++) { if (tkHas(TK_OPEN, tkStr(tasks[i].status))) { open++; } }
        tkCount('tasks', open);
      }).catch(function () {});
    }
  };

  function tkLoadApprovals() {
    var box = $('apBody');
    if (!box) { return; }
    api('pendingApprovals').then(function (d) {
      var tasks = (d && d.tasks) || [];
      tkCount('approvals', tasks.length);
      if (!tasks.length) {
        box.innerHTML = '<div class="tk-empty">Nothing is waiting on your approval.<span>The queue is clear — thank you for keeping it moving.</span></div>';
        return;
      }
      box.innerHTML = tasks.map(tkApprovalCard).join('');
      tkWireApprovals(box);
    }).catch(function (e) {
      box.innerHTML = '<div class="tk-empty">The approval queue could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="apRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('apRetry'); if (r) { r.onclick = tkLoadApprovals; }
    });
  }

  function tkApprovalCard(t) {
    var id = tkStr(t.task_id);
    var lag = Number(t.approval_lag_min);
    var lagCls = 'pill tk-lag' + (lag >= 720 ? ' tk-b' : (lag >= 120 ? ' tk-w' : ''));   // 12h = the escalation mark
    var note = tkStr(t.submission_note);
    var details = tkStr(t.details);
    var mins = Number(t.time_taken_min) || 0;

    return '<div class="tk-ap">' +
      '<div class="tk-ap-h"><span class="tk-title">' + esc(tkStr(t.title)) + '</span>' +
        '<span class="tk-meta">' + esc(tkStr(t.type)) + '</span>' +
        (isNaN(lag) ? '' : '<span class="' + lagCls + '">Waiting ' + esc(tkMins(lag)) + '</span>') + '</div>' +
      '<div class="tl-row"><span class="k">From</span><b>' + esc(tkStr(t.assigned_to)) + '</b></div>' +
      '<div class="tl-row"><span class="k">Account</span><b>' + (tkStr(t.account) ? esc(tkStr(t.account)) : '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Item ID</span><span class="mono">' + (tkStr(t.item_id) ? esc(tkStr(t.item_id)) : '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">Deadline</span>' + tkDueCell(t) + '</div>' +
      '<div class="tl-row"><span class="k">Submitted</span><span class="num">' + esc(tkWhen(t.submitted_at)) + '</span></div>' +
      (mins ? '<div class="tl-row"><span class="k">Time taken</span><span class="num">' + esc(tkMins(mins)) + '</span></div>' : '') +
      (details ? '<div class="tk-box tk-det"><div class="k">Task details</div><div class="tk-txt">' + tkDetailsHtml(details) + '</div></div>' : '') +
      '<div class="tk-box tk-note"><div class="k">Submission note</div><div class="tk-txt">' + tkText(note) + '</div></div>' +
      '<div class="field" style="margin-top:12px"><label>Comment (required to return)</label>' +
        '<textarea class="tk-ta" data-cmt="' + tkAttr(id) + '" placeholder="What must be fixed before this can be approved"></textarea></div>' +
      '<div class="tk-btns"><button class="btn-gold" data-ap="approve" data-id="' + tkAttr(id) + '">Approve</button>' +
        '<button class="minibtn" data-ap="return" data-id="' + tkAttr(id) + '">Return</button></div>' +
    '</div>';
  }

  function tkWireApprovals(box) {
    var btns = box.querySelectorAll('button[data-ap]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { tkDecide(box, b.getAttribute('data-ap'), b.getAttribute('data-id'), b); };
      })(btns[i]);
    }
  }

  function tkDecide(box, act, id, btn) {
    if (act === 'approve') {
      btn.disabled = true;
      api('approveTask', { task_id: id }).then(function () { toast('Approved — it counts now.'); tkLoadApprovals(); })
        .catch(function (e) { btn.disabled = false; toast('Not approved: ' + e.message); });
      return;
    }
    var ta = tkPick(box, 'data-cmt', id);
    var comment = ta ? tkStr(ta.value) : '';
    if (!comment) { toast('A comment is mandatory when returning a task.'); if (ta) { ta.focus(); } return; }
    btn.disabled = true;
    api('returnTask', { task_id: id, comment: comment })
      .then(function () { toast('Returned with your comment.'); tkLoadApprovals(); })
      .catch(function (e) { btn.disabled = false; toast('Not returned: ' + e.message); });
  }

})();
