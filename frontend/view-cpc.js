/* view-cpc.js — §8.3 CPC RESEARCH WORKSPACE + the §8 / §8.0b KEYWORD APPROVAL LOOP.
 * Views: cpc (CPC research, the lister's workspace) · keywordApprovals (Zain's queue).
 * Backend: cpcWorkspace · submitCpcResearch · approveKeywords · returnKeywords · competitorList
 * (plus myTasks / pendingApprovals from Tasks.gs, which are the only task lists that exist). */
(function () {

  /* Task vocabulary is backend vocabulary — Tasks.gs character for character, em dash included. */
  var CP_TYPE = 'cpc_research';
  var CP_PENDING = 'Pending';
  var CP_WORKING = 'Working';
  var CP_UPDATED = 'Updated';
  var CP_SUBMITTED = 'Submitted — awaiting approval';
  var CP_COMPLETED = 'Completed';
  var CP_OPEN = [CP_PENDING, CP_WORKING, CP_UPDATED];

  /* The REAL column set (REALITY-MAP `cpc_headers_row1_exact`, 23 columns A–W) beats §8.3:
     there is NO 'Sold Total 30d', ONE 'Main Image Link ' rather than 1–4, no 'User-manual Image',
     and 'Total Sold History 1d/7d' is two columns. The groups below therefore name only columns
     that exist; the field list itself is whatever cpcWorkspace sends, and any column not named
     here falls into "Other columns" so a per-account tab carrying extra headers loses nothing. */
  var CP_GROUPS = [
    { key: 'record', label: 'Listing record', hint: 'Status, dates and the eBay Item ID',
      keys: ['listing_status', 'date', 'revisit_72h', 'item_id'] },
    { key: 'keywords', label: 'Keywords', hint: 'One keyword per line — the counts and the rates line up 1:1 with it',
      keys: ['keywords_link_by_zain', 'keywords', 'positive_keywords', 'keywords_search_results', 'keywords_sell_through'] },
    { key: 'sales', label: 'Sales evidence', hint: 'Terapeak averages and the top keyword’s sold history',
      keys: ['avg_price_30d', 'avg_price_90d', 'sold_history_1d', 'sold_history_7d'] },
    { key: 'title', label: 'Title', hint: 'The competitor duplicate, then the title we will actually list',
      keys: ['duplicate_title', 'final_title', 'new_title_search_results'] },
    { key: 'images', label: 'Images', hint: 'The sheet draws the thumbnails itself from these links',
      keys: ['duplicate_image_link', 'main_image_link', 'duplicate_image', 'product_main_image'] },
    { key: 'desc', label: 'Description', hint: 'Description page, product idea and your recommendation',
      keys: ['final_description_page_link', 'product_idea_link', 'recommendation'] }
  ];

  var CP_TEXTAREA = ['keywords', 'positive_keywords', 'keywords_search_results', 'keywords_sell_through', 'recommendation'];
  var CP_WIDE = ['keywords', 'positive_keywords', 'keywords_search_results', 'keywords_sell_through',
    'recommendation', 'duplicate_title', 'final_title', 'keywords_link_by_zain'];
  var CP_KW_TRIO = ['keywords', 'keywords_search_results', 'keywords_sell_through'];

  var CP_APPROVE_ROLES = ['Advertising Manager', 'Management'];
  var CP_VIEW_ROLES = ['Item Lister', 'Listing Manager', 'Management'];

  var CP_CUR = null;      // the workspace payload currently on screen

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.cp-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:660px}' +
    '.cp-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.cp-tbl td{padding:10px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top}' +
    '.cp-tbl tbody tr:hover{background:var(--blue-soft)}' +
    '.cp-tbl tr.cp-hit{background:linear-gradient(135deg,rgba(233,169,60,.14),rgba(233,169,60,.03))}' +
    '.cp-tbl th.cp-blk{border-left:1px solid var(--gold-line-hi);color:var(--gold-a)}' +
    '.cp-tbl td.cp-blk{border-left:1px solid var(--gold-line)}' +
    '.cp-comp{min-width:1180px}' +
    '.cp-kw{min-width:520px}' +
    '.cp-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.cp-grid .cp-w{grid-column:1/-1}' +
    '.cp-in,.cp-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.cp-ta{resize:vertical;min-height:90px;font-family:var(--mono);font-size:12.5px;line-height:1.7}' +
    '.cp-in:focus,.cp-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.cp-in[disabled],.cp-ta[disabled]{opacity:.65;cursor:default}' +
    '.cp-sec{padding:16px 0}.cp-sec+.cp-sec{border-top:1px solid var(--gold-line)}' +
    '.cp-sec-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}' +
    '.cp-sec-h b{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold-a)}' +
    '.cp-sub{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.cp-req{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--warn);font-weight:800;margin-left:6px}' +
    '.cp-hdr{font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:5px;font-family:var(--mono)}' +
    '.cp-ro{padding:11px 13px;border-radius:10px;border:1px dashed var(--gold-line-hi);background:rgba(120,132,152,.08);font-size:12.5px;color:var(--text-2);font-weight:600}' +
    '.cp-box{margin-top:12px;padding:11px 13px;border-radius:10px}' +
    '.cp-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.cp-ret{background:var(--bad-soft);border:1px solid rgba(240,96,90,.45)}.cp-ret .k{color:var(--bad)}' +
    '.cp-note{background:var(--blue-soft);border:1px solid rgba(61,155,240,.30)}.cp-note .k{color:var(--blue-2)}' +
    '.cp-warn{background:var(--warn-soft);border:1px solid rgba(255,159,67,.40)}.cp-warn .k{color:var(--warn)}' +
    '.cp-det{background:rgba(120,132,152,.10);border:1px solid var(--gold-line)}' +
    '.cp-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6}' +
    '.cp-link{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.cp-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}' +
    '.cp-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.cp-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.cp-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}' +
    '.cp-tag{padding:3px 11px;border-radius:99px;font-size:11.5px;font-weight:800;background:var(--blue-soft);color:var(--blue-2)}' +
    '.cp-tag.gold{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.pending{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.working{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.updated{background:var(--blue-soft);color:var(--blue-2);outline:1px solid rgba(61,155,240,.35)}' +
    '.pill.awaiting{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.done{background:var(--ok-soft);color:var(--ok)}' +
    '.cp-lag{background:rgba(120,132,152,.16);color:var(--text-2)}' +
    '.cp-lag.w{background:var(--warn-soft);color:var(--warn)}.cp-lag.b{background:var(--bad-soft);color:var(--bad)}' +
    '.cp-ap{padding:16px 0}.cp-ap+.cp-ap{border-top:1px solid var(--gold-line)}' +
    '.cp-ap-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}' +
    '.cp-title{font-weight:800}' +
    '.cp-open{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}' +
    '.cp-open .field{flex:1 1 180px}' +
    '.cp-open .cp-in{max-width:220px}' +
    '@media (max-width:880px){' +
      '.cp-grid{grid-template-columns:1fr}' +
      '.cp-tbl.cp-list{min-width:0}.cp-tbl.cp-list thead{display:none}' +
      '.cp-tbl.cp-list tr{display:block;padding:8px 0;border-top:1px solid var(--gold-line)}' +
      '.cp-tbl.cp-list td{display:block;border-bottom:0;padding:4px 0}' +
      '.cp-tbl.cp-list td[data-k]:before{content:attr(data-k) " ";font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800;margin-right:7px}' +
      '.cp-open{flex-direction:column;align-items:stretch}.cp-open .cp-in{max-width:none}' +
    '}'
  );

  // ---------- safety + small helpers (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function cpAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function cpStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function cpHas(arr, v) { return arr.indexOf(v) >= 0; }
  function cpRole() { return (STATE.user && STATE.user.role) || ''; }
  function cpIsApprover() { return cpHas(CP_APPROVE_ROLES, cpRole()); }

  /** Escaped text with http/https URLs — and nothing else — turned into links. */
  function cpText(v) {
    var s = String(v == null ? '' : v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a class="cp-link" href="' + cpAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }
  /** A labelled link, or the raw cell text when it is not http/https ('-' is the sheet's n/a). */
  function cpLink(v, label) {
    var u = safeUrl(cpStr(v));
    if (!u) { return cpStr(v) ? esc(cpStr(v)) : '<span class="cp-sub">—</span>'; }
    return '<a class="cp-link" href="' + cpAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label || u) + '</a>';
  }
  function cpPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) return els[i]; }
    return null;
  }
  function cpCount(key, n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts[key] = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  function cpLines(v) { return String(v == null ? '' : v).replace(/\r\n/g, '\n').split('\n'); }
  function cpFilled(v) { return cpLines(v).filter(function (l) { return cpStr(l) !== ''; }); }
  function cpMoney(v) {
    var n = Number(String(v == null ? '' : v).replace(/[£,\s]/g, ''));
    if (cpStr(v) === '' || !isFinite(n)) { return cpStr(v) ? esc(cpStr(v)) : '—'; }
    return '£' + n.toFixed(2);
  }
  function cpNum(v) { return cpStr(v) === '' ? '—' : esc(cpStr(v)); }
  /** Sheet dates arrive as ISO anchored at 12:00 UTC, so the UTC day IS the intended day. */
  function cpDateValue(v) {
    var s = cpStr(v), d;
    if (!s) { return ''; }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { return s.slice(0, 10); }
    d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  function cpMins(min) {
    var n = Number(min) || 0, d, h;
    if (n < 60) { return n + 'm'; }
    if (n < 1440) { h = Math.floor(n / 60); return h + 'h ' + (n - h * 60) + 'm'; }
    d = Math.floor(n / 1440); h = Math.round((n - d * 1440) / 60);
    return d + 'd ' + h + 'h';
  }
  function cpPillClass(s) {
    if (s === CP_PENDING) return 'pending';
    if (s === CP_WORKING) return 'working';
    if (s === CP_UPDATED) return 'updated';
    if (s === CP_SUBMITTED) return 'awaiting';
    if (s === CP_COMPLETED) return 'done';
    return '';
  }
  /** The live header carries newlines ('Dates To \nRevisit\n72/Hrs'); it reads as one line here.
      The sheet keeps its own header untouched — this is display only (the Sheet Contract). */
  function cpLabel(col) {
    return cpStr(col.label) || String(col.header || '').replace(/\s*\n\s*/g, ' ').replace(/^\s+|\s+$/g, '');
  }
  /** returnKeywords appends "[stamp] Name returned the keywords: comment" — show the last one. */
  function cpReturned(comments) {
    var lines = cpLines(comments), re = /^\[([^\]]+)\]\s*(.*?)\s+returned the keywords:\s*([\s\S]*)$/, at = -1, i, m;
    for (i = 0; i < lines.length; i++) { if (re.test(lines[i])) { at = i; } }
    if (at < 0) { return null; }
    m = re.exec(lines.slice(at).join('\n'));
    return m ? { when: m[1], by: m[2], text: m[3] } : null;
  }

  // ============================== CPC RESEARCH ==============================
  VIEWS.cpc = {
    label: 'CPC research',
    icon: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.7-3.7"/><path d="M8.5 11h5M11 8.5v5"/>',
    roles: CP_VIEW_ROLES,
    order: 18,
    badge: function () { return (STATE.counts && STATE.counts.cpc) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>CPC research</h1>' +
          '<span class="sub">Hamza’s research columns · nothing completes itself — the keywords go to Zain</span>' +
          '<button class="minibtn" id="cpRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">CPC research tasks ' +
          '<span class="hint">Open one to fill the research and submit it for keyword approval</span></div>' +
          '<div class="bd" id="cpList"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Open a task directly ' +
          '<span class="hint">Task ID from a notification or the task list</span></div>' +
          '<div class="bd"><div class="cp-open">' +
            '<div class="field" style="margin-top:0"><label>Task ID</label>' +
              '<input class="cp-in mono" id="cpOpenId" type="text" autocomplete="off" placeholder="T1a2b3c4"></div>' +
            '<button class="minibtn" id="cpOpenGo">Open workspace</button>' +
          '</div></div>' +
        '</div>' +
        '<div id="cpWork" style="margin-top:16px"></div>';
    },
    init: function () {
      /* review 3: the tool lives IN this dashboard, like the calculator */
      (function () {
        var hg = document.querySelector('.hgroup');
        if (hg && !document.getElementById('cpcToolDockBtn')) {
          var b = document.createElement('button');
          b.className = 'minibtn'; b.id = 'cpcToolDockBtn'; b.textContent = 'Open CPC Keyword Decision Engine';
          b.style.marginLeft = 'auto';
          var host = document.createElement('div'); host.id = 'cpcToolDock';
          hg.appendChild(b);
          hg.parentNode.insertBefore(host, hg.nextSibling);
          b.onclick = function () { window.toolDock(host, 'tool_cpc_keyword', 'CPC Keyword Decision Engine'); };
        }
      })();

      $('cpRefresh').onclick = cpLoadTasks;
      $('cpOpenGo').onclick = function () {
        var id = cpStr($('cpOpenId').value);
        if (!id) { toast('Paste the task ID first.'); $('cpOpenId').focus(); return; }
        cpOpen(id);
      };
      cpLoadTasks();
    }
  };

  /** The lister's own cpc_research tasks. Approvers and the Listing Manager may also read a
      workspace (cpcMaySeeWorkspace_ on the backend), so their submitted queue is merged in. */
  function cpLoadTasks() {
    var box = $('cpList');
    if (!box) { return; }
    // Paint the combined list from the last visit at once; the two live calls repaint underneath.
    var had = (typeof cacheRead === 'function') ? cacheRead('cpCombined', {}) : null;
    if (had) { try { cpApplyTasks(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    var calls = [api('myTasks').catch(function () { return { tasks: [] }; })];
    calls.push(cpIsApprover() || cpRole() === 'Listing Manager'
      ? api('pendingApprovals').catch(function () { return { tasks: [] }; })
      : Promise.resolve({ tasks: [] }));

    Promise.all(calls).then(function (res) {
      if (typeof cacheWrite === 'function') { cacheWrite('cpCombined', {}, res); }
      cpApplyTasks(res);
    });
  }

  function cpApplyTasks(res) {
    var box = $('cpList');
    if (!box) { return; }
    (function (res) {
      var seen = {}, rows = [], open = 0;
      res.forEach(function (d) {
        ((d && d.tasks) || []).forEach(function (t) {
          if (cpStr(t.type) !== CP_TYPE) { return; }
          var id = cpStr(t.task_id);
          if (!id || seen[id]) { return; }
          seen[id] = 1;
          rows.push(t);
        });
      });
      rows.forEach(function (t) { if (cpHas(CP_OPEN, cpStr(t.status))) { open++; } });
      cpCount('cpc', open);
      if (!rows.length) {
        box.innerHTML = '<div class="cp-empty">No CPC research on you right now.' +
          '<span>A cpc_research task lands here when a hunt is routed to CPC, or when Management approves one of Zain’s Potential-CPC nominations.</span></div>';
        return;
      }
      box.innerHTML = '<div class="scroll"><table class="cp-tbl cp-list">' +
        '<thead><tr><th>Task</th><th>Account</th><th>Item ID</th><th>Deadline</th><th>Status</th><th></th></tr></thead>' +
        '<tbody>' + rows.map(cpTaskRow).join('') + '</tbody></table></div>';
      cpWireList(box);
    })(res);
  }

  function cpTaskRow(t) {
    var id = cpStr(t.task_id), status = cpStr(t.status);
    return '<tr>' +
      '<td data-k="Task"><div class="cp-title">' + esc(cpStr(t.title)) + '</div>' +
        '<div class="cp-sub mono">' + esc(id) + '</div></td>' +
      '<td data-k="Account">' + (cpStr(t.account) ? esc(cpStr(t.account)) : '<span class="cp-sub">—</span>') + '</td>' +
      '<td data-k="Item ID" class="mono">' + (cpStr(t.item_id) ? esc(cpStr(t.item_id)) : '—') + '</td>' +
      '<td data-k="Deadline"><span class="num">' + (t.deadline_pkt ? esc(fmtPkt(t.deadline_pkt, true)) : '—') + '</span>' +
        (t.overdue === true ? '<div class="cp-sub" style="color:var(--bad)">Overdue</div>' : '') + '</td>' +
      '<td data-k="Status"><span class="pill ' + cpPillClass(status) + '">' + esc(status) + '</span></td>' +
      '<td><button class="minibtn" data-open="' + cpAttr(id) + '">Open</button></td>' +
    '</tr>';
  }

  function cpWireList(box) {
    var btns = box.querySelectorAll('button[data-open]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) { b.onclick = function () { cpOpen(b.getAttribute('data-open')); }; })(btns[i]);
    }
  }

  // ---------- the workspace ----------
  function cpOpen(taskId, flash) {
    var host = $('cpWork');
    if (!host) { return; }
    host.innerHTML = '<div class="card enter d1"><div class="bd"><div class="spinner"></div></div></div>';
    api('cpcWorkspace', { task_id: taskId }).then(function (d) {
      CP_CUR = d;
      host.innerHTML = (flash || '') + cpWorkspaceHtml(d);
      cpWireWorkspace(host);
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (cpStr(d.task.account)) { cpLoadCompetitors(cpStr(d.task.account), cpStr(d.task.item_id)); }
    }).catch(function (e) {
      CP_CUR = null;
      host.innerHTML = '<div class="card enter d1"><div class="bd"><div class="cp-empty">This workspace could not be opened.' +
        '<span>' + esc(e.message) + '</span></div></div></div>';
    });
  }

  function cpWorkspaceHtml(d) {
    var t = d.task || {}, id = cpStr(t.task_id), status = cpStr(t.status);
    var ret = cpReturned(t.comments);
    var cols = (d.schema && d.schema.columns) || [];
    var prefill = d.prefill || {};
    var canEdit = d.can_edit === true;
    var approvers = (d.approvers && d.approvers.length)
      ? d.approvers.map(function (a) { return cpStr(a.name) + ' (' + cpStr(a.role) + ')'; }).join(', ')
      : 'Management';

    return '<div class="card enter d1">' +
      '<div class="hd">' + esc(cpStr(t.title) || 'CPC research') +
        '<span class="pill ' + cpPillClass(status) + '" style="margin-left:8px">' + esc(status) + '</span>' +
        '<span class="hint mono">' + esc(id) + '</span></div>' +
      '<div class="bd">' +
        '<div class="grid g-2">' +
          '<div>' +
            '<div class="tl-row"><span class="k">Account</span><b>' + (cpStr(t.account) ? esc(cpStr(t.account)) : '—') + '</b></div>' +
            '<div class="tl-row"><span class="k">Item ID</span><span class="mono">' + (cpStr(t.item_id) ? esc(cpStr(t.item_id)) : 'not listed yet') + '</span></div>' +
            '<div class="tl-row"><span class="k">Deadline</span><span class="num">' + (t.deadline_pkt ? esc(fmtPkt(t.deadline_pkt, true)) + ' PKT' : '—') + '</span></div>' +
            '<div class="tl-row"><span class="k">Assigned by</span><span>' + esc(cpStr(t.assigned_by) || '—') + '</span></div>' +
            '<div class="tl-row"><span class="k">Keywords go to</span><b>' + esc(approvers) + '</b></div>' +
          '</div>' +
          '<div>' + cpTimingHtml(d.timing || []) + '</div>' +
        '</div>' +
        (cpStr(t.details) ? '<div class="cp-box cp-det"><div class="k">Task details</div><div class="cp-txt">' + cpText(t.details) + '</div></div>' : '') +
        (ret ? '<div class="cp-box cp-ret"><div class="k">Returned by ' + esc(ret.by) + ' · ' + esc(ret.when) + '</div>' +
          '<div class="cp-txt">' + cpText(ret.text) + '</div></div>' : '') +
        (canEdit ? '' : '<div class="cp-box cp-note"><div class="k">Read only</div><div class="cp-txt">' +
          esc(cpStr(d.read_only_reason) || 'This workspace is not editable in its current status.') + '</div></div>') +
        cpSheetHtml(d.sheet) +
        (d.pipeline ? cpPipelineHtml(d.pipeline) : '') +
      '</div>' +
    '</div>' +

    '<div class="card enter d2" style="margin-top:16px">' +
      '<div class="hd">Research <span class="hint">Hamza’s live columns — the portal writes only these</span></div>' +
      '<div class="bd" id="cpForm">' + cpGroupsHtml(cols, prefill, canEdit) + '</div>' +
    '</div>' +

    (canEdit ? '<div class="card enter d3 ideas" style="margin-top:16px">' +
      '<div class="hd">Submit for keyword approval <span class="hint">Your part ends here — the clock stops on submission</span></div>' +
      '<div class="bd">' +
        '<div class="field" style="margin-top:0"><label>Submission note</label>' +
          '<textarea class="cp-ta" id="cpNote" style="min-height:70px;font-family:var(--font);font-size:14px" ' +
            'placeholder="Anything ' + cpAttr(approvers) + ' should check before approving the keywords"></textarea></div>' +
        '<div class="cp-btns"><button class="btn-gold" id="cpSubmit">Submit for keyword approval</button>' +
          '<span class="cp-sub">It moves to ' + esc(CP_SUBMITTED) + ' and goes to ' + esc(approvers) + '.</span></div>' +
      '</div></div>' : '') +

    '<div class="card enter d3" style="margin-top:16px">' +
      '<div class="hd">Competitor list ' +
        '<span class="hint">' + esc(cpStr(d.competitor_tab) || 'Hamza-  Competitior List') + '</span></div>' +
      '<div class="bd" id="cpComp"><div class="cp-sub">Open a task with an account to load its competitor list.</div></div>' +
    '</div>';
  }

  /** §8.0 windows are UK time; the backend already converted, so both clocks show side by side. */
  function cpTimingHtml(windows) {
    if (!windows.length) { return ''; }
    return '<div class="cp-sec" style="padding-top:0">' +
      '<div class="cp-sec-h"><b>Timing (§8.0)</b><span class="cp-sub">UK windows, your PKT clock beside them</span></div>' +
      windows.map(function (w) {
        var pkt = cpStr(w.start_pkt) ? fmtPkt(w.start_pkt, true) : '';
        var pktEnd = cpStr(w.end_pkt) && w.end_pkt !== w.start_pkt ? '–' + fmtPkt(w.end_pkt, false) : '';
        return '<div class="tl-row"><span class="k">' + esc(cpStr(w.label)) + '</span>' +
          '<span><b class="num">' + esc(pkt + pktEnd) + ' PKT</b>' +
          '<div class="cp-sub">' + esc(cpStr(w.who)) + '</div></span></div>';
      }).join('') +
    '</div>';
  }

  function cpSheetHtml(sheet) {
    if (!sheet) { return ''; }
    if (sheet.ok) {
      return '<div class="tl-row"><span class="k">Live tab</span><span class="mono">' + esc(cpStr(sheet.tab)) + '</span>' +
        (sheet.row ? '<span class="cp-sub">row ' + esc(cpStr(sheet.row)) + ' — your last saved research is loaded below</span>' : '<span class="cp-sub">a new row will be added on submission</span>') + '</div>';
    }
    return '<div class="cp-box cp-warn"><div class="k">Live sheet</div><div class="cp-txt">' +
      esc(cpStr(sheet.reason) || 'not connected yet') +
      ' — your submission still reaches the approver; the row is written when the sheet is connected.</div></div>';
  }

  /** §9 context: the Potential-CPC nomination Zain submitted for this item, when there is one. */
  function cpPipelineHtml(p) {
    return '<div class="cp-box cp-det"><div class="k">Potential CPC nomination (§9)</div>' +
      '<div class="tl-row"><span class="k">Reason</span><b>' + esc(cpStr(p.reason_for_selection) || '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Submitted by</span><span>' + esc(cpStr(p.submitted_by) || '—') + '</span></div>' +
      '<div class="tl-row"><span class="k">Our price</span><span class="num">' + cpMoney(p.our_price) + '</span></div>' +
      '<div class="tl-row"><span class="k">Avg sold price</span><span class="num">' + cpMoney(p.avg_sold_price) + '</span></div>' +
      '<div class="tl-row"><span class="k">Last 30 days</span>' + cpLink(p.last30_link, 'Terapeak 30d') + '</div>' +
      '<div class="tl-row"><span class="k">Last 90 days</span>' + cpLink(p.last90_link, 'Terapeak 90d') + '</div>' +
      '<div class="tl-row"><span class="k">Main competitor</span>' + cpLink(p.main_competitor, 'Competitor listing') + '</div>' +
      (cpStr(p.comments) ? '<div class="cp-txt" style="margin-top:8px">' + cpText(p.comments) + '</div>' : '') +
    '</div>';
  }

  // ---------- the grouped form ----------
  function cpGroupsHtml(cols, prefill, canEdit) {
    var byKey = {}, used = {}, html = '';
    cols.forEach(function (c) { byKey[c.key] = c; });

    CP_GROUPS.forEach(function (g) {
      var fields = [];
      g.keys.forEach(function (k) {
        if (!byKey[k]) { return; }                 // the column is not on this account's tab
        used[k] = 1;
        fields.push(cpFieldHtml(byKey[k], prefill[k], canEdit));
      });
      if (!fields.length) { return; }
      html += '<div class="cp-sec"><div class="cp-sec-h"><b>' + esc(g.label) + '</b>' +
        '<span class="cp-sub">' + esc(g.hint) + '</span>' +
        (g.key === 'keywords' ? '<span class="cp-sub" id="cpKwTally" style="margin-left:auto"></span>' : '') +
        '</div><div class="cp-grid">' + fields.join('') + '</div></div>';
    });

    var rest = cols.filter(function (c) { return !used[c.key]; });
    if (rest.length) {
      html += '<div class="cp-sec"><div class="cp-sec-h"><b>Other columns</b>' +
        '<span class="cp-sub">present on this account’s tab</span></div>' +
        '<div class="cp-grid">' + rest.map(function (c) { return cpFieldHtml(c, prefill[c.key], canEdit); }).join('') + '</div></div>';
    }
    return html;
  }

  function cpFieldHtml(col, value, canEdit) {
    var k = col.key, label = cpLabel(col), wide = cpHas(CP_WIDE, k) || !col.writable && k === 'product_main_image';
    var head = '<label>' + esc(label) + (col.required ? '<span class="cp-req">required</span>' : '') + '</label>';
    var hdr = '<div class="cp-hdr">' + esc(String(col.header || '').replace(/\s*\n\s*/g, ' ⏎ ')) + '</div>';
    var dis = canEdit ? '' : ' disabled';
    var v = cpStr(value), body;

    if (!col.writable) {
      // The sheet writes these itself (=image(...)); the portal never touches a formula cell.
      body = '<div class="cp-ro">' + (v ? cpText(v) : esc(cpStr(col.note) || 'drawn by the sheet from the link column')) + '</div>';
      return '<div class="field' + (wide ? ' cp-w' : '') + '" style="margin-top:0">' + head + body + hdr + '</div>';
    }

    if (col.type === 'enum') {
      body = '<select class="cp-in" data-f="' + cpAttr(k) + '"' + dis + '><option value=""></option>' +
        (col.options || []).map(function (o) {
          return '<option value="' + cpAttr(o) + '"' + (cpStr(o) === v ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    } else if (col.type === 'date') {
      body = '<input class="cp-in" type="date" data-f="' + cpAttr(k) + '" value="' + cpAttr(cpDateValue(value)) + '"' + dis + '>';
    } else if (col.type === 'item_id') {
      body = '<input class="cp-in mono" type="text" inputmode="numeric" autocomplete="off" data-f="' + cpAttr(k) + '" value="' + cpAttr(v) + '"' + dis + '>';
    } else if (col.type === 'number' || col.type === 'int') {
      body = '<input class="cp-in num" type="number" step="' + (col.type === 'int' ? '1' : '0.01') + '" inputmode="decimal" ' +
        'data-f="' + cpAttr(k) + '" value="' + cpAttr(v.replace(/[£,\s]/g, '')) + '"' + dis + '>';
    } else if (col.type === 'url') {
      body = '<input class="cp-in" type="url" autocomplete="off" placeholder="https://" data-f="' + cpAttr(k) + '" value="' + cpAttr(v) + '"' + dis + '>';
    } else if (col.type === 'url_or_status') {
      // Reality: U's data-validation is the CPC status list even though its header reads
      // 'Final description Page Link'. Both a link and one of those values are accepted.
      body = '<input class="cp-in" type="text" autocomplete="off" placeholder="https:// or a status" data-f="' + cpAttr(k) + '" value="' + cpAttr(v) + '"' + dis + '>' +
        '<select class="cp-in" id="cpUStatus" style="margin-top:8px"' + dis + '><option value="">— or pick the sheet’s status —</option>' +
        (col.options || []).map(function (o) { return '<option value="' + cpAttr(o) + '">' + esc(cpStr(o)) + '</option>'; }).join('') + '</select>';
    } else if (cpHas(CP_TEXTAREA, k)) {
      body = '<textarea class="cp-ta" data-f="' + cpAttr(k) + '"' + dis + ' placeholder="' + cpAttr(cpPlaceholder(k)) + '">' + esc(value == null ? '' : String(value)) + '</textarea>';
    } else {
      body = '<input class="cp-in" type="text" autocomplete="off" data-f="' + cpAttr(k) + '" value="' + cpAttr(v) + '"' + dis + '>';
    }

    return '<div class="field' + (wide ? ' cp-w' : '') + '" style="margin-top:0">' + head + body +
      (cpStr(col.note) ? '<div class="cp-sub" style="margin-top:5px">' + esc(col.note) + '</div>' : '') + hdr + '</div>';
  }

  /** The parenthesised conventions are the sheet's own — '(3,400)' counts, '(23.70%)' rates. */
  function cpPlaceholder(k) {
    if (k === 'keywords') { return 'one keyword per line'; }
    if (k === 'positive_keywords') { return 'one positive keyword per line'; }
    if (k === 'keywords_search_results') { return '(3,400)\n(293)\n(640)'; }
    if (k === 'keywords_sell_through') { return '(23.70%)\n(18.91%)'; }
    return '';
  }

  function cpWireWorkspace(host) {
    var sel = host.querySelector('#cpUStatus');
    if (sel) {
      sel.onchange = function () {
        var input = cpPick(host, 'data-f', 'final_description_page_link');
        if (input && sel.value) { input.value = sel.value; }
      };
    }
    CP_KW_TRIO.forEach(function (k) {
      var el = cpPick(host, 'data-f', k);
      if (el) { el.oninput = cpKwTally; }
    });
    cpKwTally();
    if ($('cpSubmit')) { $('cpSubmit').onclick = function () { cpSubmit(host, this); }; }
  }

  /** Reality: J and K carry one parenthesised value per keyword line, aligned 1:1 with H. */
  function cpKwTally() {
    var tally = $('cpKwTally');
    if (!tally) { return; }
    var host = $('cpWork');
    var kw = cpFilled(cpValueOf(host, 'keywords')).length;
    var res = cpFilled(cpValueOf(host, 'keywords_search_results')).length;
    var str = cpFilled(cpValueOf(host, 'keywords_sell_through')).length;
    var bad = (res && res !== kw) || (str && str !== kw);
    tally.innerHTML = '<span style="color:' + (bad ? 'var(--warn)' : 'var(--text-3)') + '">' +
      esc(kw + ' keywords · ' + res + ' search results · ' + str + ' sell-through') +
      (bad ? ' — these three lists must line up 1:1' : '') + '</span>';
  }

  function cpValueOf(host, key) {
    var el = host ? cpPick(host, 'data-f', key) : null;
    return el ? el.value : '';
  }

  function cpSubmit(host, btn) {
    var d = CP_CUR;
    if (!d) { return; }
    var cols = (d.schema && d.schema.columns) || [];
    var research = {}, missing = [], badItem = false;

    cols.forEach(function (c) {
      if (!c.writable) { return; }
      var el = cpPick(host, 'data-f', c.key);
      if (!el) { return; }
      var v = String(el.value == null ? '' : el.value);
      if (c.key === 'item_id') { v = cpStr(v); if (v && !/^\d{9,15}$/.test(v)) { badItem = true; } }
      if (c.required && cpStr(v) === '') { missing.push(cpLabel(c)); }
      // Empty optional fields are omitted so the backend's own defaults (Date, revisit) still apply.
      if (cpStr(v) !== '') { research[c.key] = v; }
    });

    if (badItem) { toast('An Item ID is 9 to 15 digits.'); return; }
    if (missing.length) { toast('Still needed: ' + missing.join(', ')); return; }

    var noteEl = $('cpNote');
    var payload = { task_id: cpStr(d.task.task_id), research: research, submission_note: noteEl ? cpStr(noteEl.value) : '' };

    btn.disabled = true;
    api('submitCpcResearch', payload).then(function (res) {
      var who = (res && res.awaiting && res.awaiting.length && typeof res.awaiting !== 'string')
        ? res.awaiting.map(function (a) { return cpStr(a.name); }).join(', ') : 'Management';
      toast('Sent for keyword approval — ' + who + ' decides.');
      var flash = '<div class="card enter d1 ideas" style="margin-bottom:16px"><div class="hd">Sent for keyword approval</div><div class="bd">' +
        '<div class="cp-txt">' + esc('Your research is with ' + who + '. The task is now "' + CP_SUBMITTED +
          '" — nothing counts toward your targets until they approve it, and a return comes back with a comment.') + '</div>' +
        (res && res.sheet && !res.sheet.ok ? '<div class="cp-box cp-warn"><div class="k">Live sheet</div><div class="cp-txt">' +
          esc(cpStr(res.sheet.reason) || 'not written') + ' — your submission still reached the approver.</div></div>' : '') +
        ((res && res.warnings && res.warnings.length) ? '<div class="cp-box cp-warn"><div class="k">Check these</div><div class="cp-txt">' +
          esc(res.warnings.join('\n')) + '</div></div>' : '') +
        '</div></div>';
      cpLoadTasks();
      cpOpen(payload.task_id, flash);
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not submitted: ' + e.message);
    });
  }

  // ---------- competitor list (§8.3, three blocks) ----------
  /** Reality: the live tab is one OWN listing block plus TWO competitor blocks (Main, Copy),
      separated by blank columns, with 'Ebay Store Link ' out at AB — not three competitor blocks.
      The repeated 'Edit Date' / 'Sale Price' / 'List date ' / ' sales history' headers cannot be
      addressed by name, so the backend returns them read-only and reports them as blocked. */
  function cpLoadCompetitors(account, itemId) {
    var box = $('cpComp');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('competitorList', { account: account }).then(function (d) {
      if (!d || d.ok === false) {
        box.innerHTML = '<div class="cp-empty">The competitor list is not connected for ' + esc(account) + ' yet.' +
          '<span>' + esc(cpStr(d && d.reason) || 'not connected yet') + '</span></div>';
        return;
      }
      var rows = (d.rows || []);
      if (!rows.length) {
        box.innerHTML = '<div class="cp-empty">No competitor rows on this account’s tab yet.' +
          '<span>' + esc(cpStr(d.tab)) + '</span></div>' + cpBlockedHtml(d.blocked);
        return;
      }
      box.innerHTML = '<div class="scroll"><table class="cp-tbl cp-comp">' +
        '<thead>' +
          '<tr><th colspan="6">Our listing</th>' +
            '<th class="cp-blk" colspan="6">Main competitor</th>' +
            '<th class="cp-blk" colspan="6">Copy competitor</th>' +
            '<th class="cp-blk">eBay store</th></tr>' +
          '<tr><th>Item Id</th><th>product name</th><th>List date</th><th>Edit Date</th><th>Sale Price</th><th>Sale History</th>' +
            '<th class="cp-blk">store link</th><th>product link</th><th>Start Date</th><th>Edit Date</th><th>Sale Price</th><th>sales history</th>' +
            '<th class="cp-blk">store link</th><th>product link</th><th>List date</th><th>Edit Date</th><th>Sale Price</th><th>sales history</th>' +
            '<th class="cp-blk">Ebay Store Link</th></tr>' +
        '</thead><tbody>' + rows.map(function (r) { return cpCompRow(r, itemId); }).join('') + '</tbody></table></div>' +
        '<div class="cp-sub" style="margin-top:10px">' + esc(cpStr(d.tab)) + ' · ' + esc(String(d.count || rows.length)) + ' rows</div>' +
        cpBlockedHtml(d.blocked);
    }).catch(function (e) {
      box.innerHTML = '<div class="cp-empty">The competitor list could not be loaded.<span>' + esc(e.message) + '</span></div>';
    });
  }

  function cpCompRow(r, itemId) {
    var own = r.own || {}, main = r.main_competitor || {}, copy = r.copy_competitor || {};
    var hit = itemId && cpStr(own.item_id) && cpStr(own.item_id).replace(/\D/g, '') === cpStr(itemId).replace(/\D/g, '');
    return '<tr' + (hit ? ' class="cp-hit"' : '') + '>' +
      '<td class="mono">' + cpNum(own.item_id) + '</td>' +
      '<td>' + esc(cpStr(own.product_name) || '—') + '</td>' +
      '<td>' + cpNum(own.list_date) + '</td>' +
      '<td>' + cpNum(own.edit_date) + '</td>' +
      '<td class="num">' + cpMoney(own.sale_price) + '</td>' +
      '<td class="num">' + cpNum(own.sale_history) + '</td>' +
      '<td class="cp-blk">' + cpLink(main.store_link, 'Store') + '</td>' +
      '<td>' + cpLink(main.product_link, 'Product') + '</td>' +
      '<td>' + cpNum(main.start_date) + '</td>' +
      '<td>' + cpNum(main.edit_date) + '</td>' +
      '<td class="num">' + cpMoney(main.sale_price) + '</td>' +
      '<td class="num">' + cpNum(main.sales_history) + '</td>' +
      '<td class="cp-blk">' + cpLink(copy.store_link, 'Store') + '</td>' +
      '<td>' + cpLink(copy.product_link, 'Product') + '</td>' +
      '<td>' + cpNum(copy.list_date) + '</td>' +
      '<td>' + cpNum(copy.edit_date) + '</td>' +
      '<td class="num">' + cpMoney(copy.sale_price) + '</td>' +
      '<td class="num">' + cpNum(copy.sales_history) + '</td>' +
      '<td class="cp-blk">' + cpLink(r.ebay_store_link, 'Store') + '</td>' +
    '</tr>';
  }

  function cpBlockedHtml(b) {
    if (!b || !b.headers || !b.headers.length) { return ''; }
    return '<div class="cp-box cp-det"><div class="k">Manual columns</div><div class="cp-txt">' +
      esc(b.headers.join(' · ')) + ' — ' + esc(cpStr(b.reason)) + '</div></div>';
  }

  // ============================== KEYWORD APPROVALS ==============================
  VIEWS.keywordApprovals = {
    label: 'Keyword approvals',
    icon: '<path d="M14.5 4.5a4.5 4.5 0 1 0-4.2 6.3L4 17.1V20h3v-2h2v-2h1.6"/><path d="M13.5 17.5 16 20l4.5-5"/>',
    roles: CP_APPROVE_ROLES,
    order: 19,
    badge: function () { return (STATE.counts && STATE.counts.keywordApprovals) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Keyword approvals</h1>' +
          '<span class="sub">CPC keywords and working wait on you · oldest first</span>' +
          '<button class="minibtn" id="kaRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="card enter d1"><div class="hd">Waiting on you ' +
          '<span class="hint">Approve completes the task · Return needs a comment</span></div>' +
          '<div class="bd" id="kaBody"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Open a submission by task ID ' +
          '<span class="hint">Use the ID from the notification when the task was raised by someone else</span></div>' +
          '<div class="bd"><div class="cp-open">' +
            '<div class="field" style="margin-top:0"><label>Task ID</label>' +
              '<input class="cp-in mono" id="kaOpenId" type="text" autocomplete="off" placeholder="T1a2b3c4"></div>' +
            '<button class="minibtn" id="kaOpenGo">Load submission</button>' +
          '</div><div id="kaOne" style="margin-top:14px"></div></div>' +
        '</div>';
    },
    init: function () {
      $('kaRefresh').onclick = kaLoad;
      $('kaOpenGo').onclick = function () {
        var id = cpStr($('kaOpenId').value);
        if (!id) { toast('Paste the task ID first.'); $('kaOpenId').focus(); return; }
        kaLoadOne(id);
      };
      kaLoad();
    }
  };

  /** pendingApprovals scopes a non-Management approver to the tasks they themselves assigned, so
      Zain reaches a submission raised by Hamza through the notification's task ID (the box above). */
  /** The queue is a composition (pendingApprovals + one workspace per task), so what gets cached
      is the finished card list — the only shape that can paint instantly without re-fetching. */
  function kaApply(items) {
    var box = $('kaBody');
    if (!box) { return; }
    cpCount('keywordApprovals', items.length);
    if (!items.length) {
      box.innerHTML = '<div class="cp-empty">No CPC keywords are waiting on you.' +
        '<span>The queue is clear — a lister’s submission lands here the moment it is sent.</span></div>';
      return;
    }
    box.innerHTML = items.map(function (it) { return kaCard(it.task, it.work); }).join('');
    kaWire(box);
  }

  function kaLoad() {
    var box = $('kaBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('kaItems', {}) : null;
    if (had) { try { kaApply(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    api('pendingApprovals').then(function (d) {
      var tasks = ((d && d.tasks) || []).filter(function (t) { return cpStr(t.type) === CP_TYPE; });
      if (!tasks.length) {
        if (typeof cacheWrite === 'function') { cacheWrite('kaItems', {}, []); }
        kaApply([]);
        return;
      }
      return Promise.all(tasks.map(function (t) {
        return api('cpcWorkspace', { task_id: cpStr(t.task_id) })
          .then(function (w) { return { task: t, work: w }; })
          .catch(function () { return { task: t, work: null }; });
      })).then(function (items) {
        if (typeof cacheWrite === 'function') { cacheWrite('kaItems', {}, items); }
        kaApply(items);
      });
    }).catch(function (e) {
      if (had) { toast('Showing the last queue — could not refresh just now.'); return; }
      box.innerHTML = '<div class="cp-empty">The queue could not be loaded just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="kaRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('kaRetry'); if (r) { r.onclick = kaLoad; }
    });
  }

  function kaLoadOne(taskId) {
    var box = $('kaOne');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('cpcWorkspace', { task_id: taskId }).then(function (w) {
      var t = (w && w.task) || {};
      if (cpStr(t.status) !== CP_SUBMITTED) {
        box.innerHTML = '<div class="cp-empty">That task is not awaiting keyword approval.' +
          '<span>' + esc(cpStr(t.title)) + ' · ' + esc(cpStr(t.status) || 'unknown status') + '</span></div>';
        return;
      }
      box.innerHTML = kaCard(t, w);
      kaWire(box);
    }).catch(function (e) {
      box.innerHTML = '<div class="cp-empty">That submission could not be loaded.<span>' + esc(e.message) + '</span></div>';
    });
  }

  function kaCard(t, w) {
    var id = cpStr(t.task_id);
    var lag = Number(t.approval_lag_min);
    var lagCls = 'pill cp-lag' + (lag >= 720 ? ' b' : (lag >= 120 ? ' w' : ''));   // 12h = the §8.0b escalation mark
    var f = (w && w.prefill) || {};

    return '<div class="cp-ap" data-card="' + cpAttr(id) + '">' +
      '<div class="cp-ap-h"><span class="cp-title">' + esc(cpStr(t.title)) + '</span>' +
        '<span class="cp-sub mono">' + esc(id) + '</span>' +
        (isNaN(lag) ? '' : '<span class="' + lagCls + '">Waiting ' + esc(cpMins(lag)) + '</span>') + '</div>' +
      '<div class="tl-row"><span class="k">From</span><b>' + esc(cpStr(t.assigned_to)) + '</b></div>' +
      '<div class="tl-row"><span class="k">Account</span><b>' + (cpStr(t.account) ? esc(cpStr(t.account)) : '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Item ID</span><span class="mono">' + (cpStr(t.item_id) ? esc(cpStr(t.item_id)) : 'not listed yet') + '</span></div>' +
      '<div class="tl-row"><span class="k">Submitted</span><span class="num">' + (t.submitted_at ? esc(fmtPkt(t.submitted_at, true)) + ' PKT' : '—') + '</span></div>' +
      (cpStr(t.submission_note) ? '<div class="cp-box cp-note"><div class="k">Submission note</div><div class="cp-txt">' + cpText(t.submission_note) + '</div></div>' : '') +
      (w ? kaEvidence(f) : '<div class="cp-box cp-warn"><div class="k">Research</div><div class="cp-txt">The research columns could not be read — decide from the submission note, or open the task workspace.</div></div>') +
      (w && w.pipeline ? cpPipelineHtml(w.pipeline) : '') +
      '<div class="field" style="margin-top:14px"><label>Comment (required to return)</label>' +
        '<textarea class="cp-ta" style="min-height:70px;font-family:var(--font);font-size:14px" data-cmt="' + cpAttr(id) + '" ' +
          'placeholder="What must be fixed before these keywords can go live"></textarea></div>' +
      '<div class="cp-btns"><button class="btn-gold" data-ka="approve" data-id="' + cpAttr(id) + '">Approve keywords</button>' +
        '<button class="minibtn" data-ka="return" data-id="' + cpAttr(id) + '">Return for rework</button></div>' +
    '</div>';
  }

  /** Keywords and their evidence: the counts and rates are aligned line-by-line with the keywords,
      which is exactly how they sit in the sheet — so they are read back that way. */
  function kaEvidence(f) {
    var kw = cpLines(f.keywords), res = cpLines(f.keywords_search_results), rate = cpLines(f.keywords_sell_through);
    var n = 0, i, rows = '';
    for (i = 0; i < kw.length; i++) { if (cpStr(kw[i]) !== '') { n = i + 1; } }
    for (i = 0; i < n; i++) {
      rows += '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(cpStr(kw[i])) + '</td>' +
        '<td class="num">' + esc(cpStr(res[i]) || '—') + '</td>' +
        '<td class="num">' + esc(cpStr(rate[i]) || '—') + '</td></tr>';
    }
    var pos = cpFilled(f.positive_keywords);

    return (rows ? '<div class="scroll" style="margin-top:12px"><table class="cp-tbl cp-kw">' +
        '<thead><tr><th>#</th><th>Keyword</th><th>Listing search results</th><th>Sell through rate</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' : '') +
      (pos.length ? '<div style="margin-top:12px"><div class="cp-sub">Positive keywords</div><div class="cp-tags">' +
        pos.map(function (p) { return '<span class="cp-tag gold">' + esc(cpStr(p)) + '</span>'; }).join('') + '</div></div>' : '') +
      '<div class="cp-box cp-det"><div class="k">Sales evidence</div>' +
        '<div class="tl-row"><span class="k">Avg price 30 days</span><span class="num">' + cpMoney(f.avg_price_30d) + '</span></div>' +
        '<div class="tl-row"><span class="k">Avg price 90 days</span><span class="num">' + cpMoney(f.avg_price_90d) + '</span></div>' +
        '<div class="tl-row"><span class="k">Sold 1 day (top kw)</span><span class="num">' + cpNum(f.sold_history_1d) + '</span></div>' +
        '<div class="tl-row"><span class="k">Sold 7 days (top kw)</span><span class="num">' + cpNum(f.sold_history_7d) + '</span></div>' +
      '</div>' +
      '<div class="cp-box cp-det"><div class="k">Title</div>' +
        '<div class="tl-row"><span class="k">Final Title</span><b>' + (cpStr(f.final_title) ? esc(cpStr(f.final_title)) : '—') + '</b></div>' +
        '<div class="tl-row"><span class="k">Search results</span><span class="num">' + cpNum(f.new_title_search_results) + '</span></div>' +
        (cpStr(f.duplicate_title) ? '<div class="tl-row"><span class="k">Duplicate title</span><span>' + esc(cpStr(f.duplicate_title)) + '</span></div>' : '') +
      '</div>' +
      '<div class="cp-box cp-det"><div class="k">Links</div>' +
        '<div class="tl-row"><span class="k">Keywords (Zain)</span>' + cpLink(f.keywords_link_by_zain, 'Keywords document') + '</div>' +
        '<div class="tl-row"><span class="k">Main image</span>' + cpLink(f.main_image_link, 'Main Image Link') + '</div>' +
        '<div class="tl-row"><span class="k">Duplicate image</span>' + cpLink(f.duplicate_image_link, 'Duplicate Image Link') + '</div>' +
        '<div class="tl-row"><span class="k">Description page</span>' + cpLink(f.final_description_page_link, 'Final description page') + '</div>' +
        '<div class="tl-row"><span class="k">Product idea</span>' + cpLink(f.product_idea_link, 'Product Idea Link') + '</div>' +
      '</div>' +
      (cpStr(f.recommendation) ? '<div class="cp-box cp-det"><div class="k">Recommendation</div><div class="cp-txt">' + cpText(f.recommendation) + '</div></div>' : '');
  }

  function kaWire(box) {
    var btns = box.querySelectorAll('button[data-ka]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { kaDecide(box, b.getAttribute('data-ka'), b.getAttribute('data-id'), b); };
      })(btns[i]);
    }
  }

  function kaDecide(box, act, id, btn) {
    if (act === 'approve') {
      btn.disabled = true;
      api('approveKeywords', { task_id: id }).then(function () {
        toast('Keywords approved — the campaign can go to CPC.');
        kaDone(box, id);
      }).catch(function (e) { btn.disabled = false; toast('Not approved: ' + e.message); });
      return;
    }
    var ta = cpPick(box, 'data-cmt', id);
    var comment = ta ? cpStr(ta.value) : '';
    if (!comment) { toast('A comment is mandatory when returning keywords.'); if (ta) { ta.focus(); } return; }
    btn.disabled = true;
    api('returnKeywords', { task_id: id, comment: comment }).then(function () {
      toast('Returned with your comment — the lister has it.');
      kaDone(box, id);
    }).catch(function (e) { btn.disabled = false; toast('Not returned: ' + e.message); });
  }

  function kaDone(box, id) {
    var card = cpPick(box, 'data-card', id);
    if (card && card.parentNode) { card.parentNode.removeChild(card); }
    kaLoad();
  }

})();
