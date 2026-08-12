/* §26 — Rules & SOPs (the living company law) and §5 — the rota.
 * Registers VIEWS.rules (everyone) and VIEWS.rota (Management / Ops Head). */

(function () {

/* §26.1 — the only departments a rule or an instruction may target. */
var RULE_DEPTS = ['Hunting', 'Listing', 'Advertising', 'CS', 'Order Processing', 'ALL'];
/* §26.1 types, shown under the workbook's own headings (§26.2 "exactly in the familiar layout"). */
var RULE_TYPES = ['Do', "Don't", 'Criteria'];
var TYPE_LABEL = { 'Do': "Do's", "Don't": "Don'ts", 'Criteria': 'Criteria' };

/* .scroll and .minibtn belong to the Royal preview but are not in the shell's stylesheet yet;
 * the values below are the preview's own, so a later shell definition is identical. */
VIEW_CSS.push([
  '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
  '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}',
  '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}',
  '.rl-tbl,.rt-tbl{width:100%;border-collapse:collapse;font-size:13px}',
  '.rl-tbl th,.rt-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}',
  '.rl-tbl td,.rt-tbl td{padding:11px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top}',
  '.rl-tbl tr:last-child td,.rt-tbl tr:last-child td{border-bottom:0}',
  '.rl-tbl{min-width:560px}.rt-tbl{min-width:820px}',
  '.rl-tbl tbody tr,.rt-tbl tbody tr{transition:background .12s;cursor:pointer}',
  '.rl-tbl tbody tr:hover,.rt-tbl tbody tr:hover{background:var(--blue-soft)}',
  '.rl-row{align-items:flex-start;flex-wrap:wrap;gap:12px}',
  '.rl-txt{flex:1 1 220px;min-width:0}',
  '.rl-txt .t{font-weight:600;white-space:pre-wrap;word-break:break-word}',
  '.rl-meta{font-size:11.5px;color:var(--text-3);font-weight:600;margin-top:3px}',
  '.rl-act{display:flex;align-items:center;gap:8px;flex:none;padding-top:1px}',
  '.rl-new{background:var(--blue-soft);color:var(--blue-2);outline:1px solid rgba(61,155,240,.35)}',
  '.rl-ok{font-size:11.5px;font-weight:800;color:var(--ok);white-space:nowrap}',
  '.rl-dept{background:rgba(120,132,152,.16);color:var(--text-2)}',
  '.rl-ret{background:var(--warn-soft);color:var(--warn)}',
  '.rl-empty{color:var(--text-3);font-weight:600;font-size:12.5px;padding:4px 0}',
  '.rl-sop+.rl-sop{border-top:1px solid var(--gold-line)}',
  '.rl-sopq{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 0;font-weight:700;font-size:13px;color:var(--text)}',
  '.rl-sopq .ord{min-width:20px;color:var(--gold-a);font-weight:800}',
  '.rl-sopq .chev{margin-left:auto;color:var(--text-3);transition:transform .15s}',
  '.rl-sopq.open .chev{transform:rotate(90deg)}',
  '.rl-sopc{white-space:pre-wrap;word-break:break-word;font-size:12.5px;color:var(--text-2);font-weight:600;padding:2px 0 12px 12px;margin:0 0 4px 8px;border-left:2px solid var(--gold-line)}',
  '.rl-seg{display:inline-flex;background:var(--panel);border:1px solid var(--gold-line);border-radius:11px;padding:3px;gap:2px}',
  '.rl-seg button{padding:6px 15px;border-radius:8px;font-weight:800;font-size:12.5px;color:var(--text-3);transition:all .18s}',
  '.rl-seg button.on{background:linear-gradient(135deg,var(--gold-a),var(--gold-b) 60%,var(--gold-c));color:var(--gold-ink);box-shadow:var(--glow-gold)}',
  '.rl-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;resize:vertical;min-height:80px}',
  '.rl-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}',
  '.rl-cell{max-width:340px;white-space:pre-wrap;word-break:break-word}',
  '.rt-name{font-weight:800}',
  '.rt-meta{font-size:11px;color:var(--text-3);font-weight:600;margin-top:2px}',
  '.rt-day{text-align:center;width:46px}',
  '.rt-today{background:rgba(61,155,240,.07)}',
  '.rt-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:rgba(120,132,152,.3)}',
  '.rt-dot.on{background:linear-gradient(135deg,var(--blue-2),var(--blue-deep));box-shadow:var(--glow-blue)}',
  '.rt-none{color:var(--text-3);font-weight:800}',
  '.rt-req{background:var(--warn-soft);color:var(--warn)}',
  '.rt-due{background:var(--warn-soft);color:var(--warn)}',
  '.rt-up{background:rgba(120,132,152,.16);color:var(--text-3)}',
  '.rt-cps{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}',
  '.rt-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:12px}',
  '.rt-legend span{display:flex;align-items:center;gap:6px}',
  '.rt-fields{display:grid;gap:0 14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}',
  '.rt-days{display:flex;gap:6px;flex-wrap:wrap}',
  '.rt-days button.on{border-color:var(--blue);color:var(--blue-2);background:var(--blue-soft)}'
].join('\n'));

/* ---------- shared helpers ---------- */

/* esc() does not escape quotes, so attribute values go through this instead (RL-3). */
function attr(v) { return esc(v).replace(/"/g, '&quot;'); }
function pkt(iso) { return iso ? fmtPkt(iso, true) : ''; }
function isMgmt() { return ['Management', 'Ops Head'].indexOf(String(STATE.user && STATE.user.role)) >= 0; }
function loadingCard(msg) {
  return '<div class="card enter d2"><div class="bd" style="text-align:center"><div class="spinner"></div>' +
    '<div style="color:var(--text-3);font-weight:600;font-size:12.5px">' + esc(msg) + '</div></div></div>';
}
function noteCard(msg) {
  return '<div class="card enter d2"><div class="bd" style="color:var(--text-3);font-weight:600;font-size:12.5px">' + esc(msg) + '</div></div>';
}
/* A view can be swapped out while its request is in flight, so every write is null-safe. */
function put(id, html) {
  var el = $(id);
  if (el) { el.innerHTML = html; }
  return el;
}
/* Walks up from the click target to the nearest element carrying the named attribute. */
function upTo(node, name, root) {
  while (node && node !== root) {
    if (node.getAttribute && node.getAttribute(name) !== null) return node;
    node = node.parentNode;
  }
  return null;
}
function selectHtml(id, options, chosen) {
  var h = '<select id="' + attr(id) + '">';
  for (var i = 0; i < options.length; i++) {
    h += '<option value="' + attr(options[i]) + '"' + (String(options[i]) === String(chosen) ? ' selected' : '') + '>' +
      esc(options[i]) + '</option>';
  }
  return h + '</select>';
}

/* ============================ §26 — RULES & SOPs ============================ */

var law = null, ackGrid = null, composerKind = 'rule';

VIEWS.rules = {
  label: 'Rules & SOPs',
  order: 50,
  roles: '*',
  icon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M8 7.5h8M8 11h8M8 14.5h5"/>',
  render: function () {
    return '<div class="hgroup enter d1"><h1>Rules &amp; <span class="goldtext">SOPs</span></h1>' +
      '<span class="sub" id="rlScope">Company law · published by Management, delivered the moment it lands</span></div>' +
      '<div id="rlPinned"></div>' +
      '<div id="rlLaw">' + loadingCard('Loading your rules…') + '</div>' +
      '<div id="rlSops" style="margin-top:16px">' + loadingCard('Loading your SOPs…') + '</div>' +
      '<div id="rlAdmin" style="margin-top:16px"></div>';
  },
  init: function () {
    loadLaw();
    var sc = cachedCall('mySops', {}, renderSops);
    sc.done.catch(function () {
      if (sc.painted) { return; }
      put('rlSops', noteCard('SOPs could not be loaded right now.'));
    });
    if (isMgmt()) { renderAdmin(); loadAckGrid(); }
  }
};

function loadLaw() {
  var lc = cachedCall('myRules', {}, function (d) {
    law = d;
    var scope = $('rlScope');
    if (scope) {
      scope.textContent = 'Company law · ' + (d.dept === '*' ? 'all departments' : d.dept) +
        ' · published by Management, delivered the moment it lands';
    }
    renderPinned(d);
    renderLaw(d);
    STATE.counts.rules = Number(d.unacknowledged) || 0;
    if (typeof refreshBadges === 'function') refreshBadges();
  });
  return lc.done.catch(function () {
    if (lc.painted) { return; }
    put('rlLaw', noteCard('Your rules could not be loaded. Nothing has changed — try again shortly.'));
  });
}

/* §26.2 — the Advertising master list is pinned as a card on the Advertising Manager's screen. */
function renderPinned(d) {
  var box = $('rlPinned'), list = d.pinned || [];
  if (!box) { return; }
  if (!list.length) { box.innerHTML = ''; return; }
  var h = '<div class="card ideas enter d1" style="margin-bottom:16px"><div class="hd">' +
    esc(d.pinnedDepartment) + ' — master list <span class="hint">pin this on the wall</span></div><div class="bd">';
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    h += '<div class="tl-row rl-row"><div class="rl-txt"><div class="t">' + esc(r.rule_text) + '</div>' +
      '<div class="rl-meta"><span class="pill rl-dept">' + esc(TYPE_LABEL[r.type] || r.type) + '</span> ' +
      esc('issued by ' + r.added_by) + ' · ' + esc(pkt(r.added_at)) + ' PKT</div></div>' +
      (r.isNew ? '<div class="rl-act"><span class="pill rl-new">New</span></div>' : '') + '</div>';
  }
  box.innerHTML = h + '</div></div>';
}

function ackBits(kind, id, acknowledged, at) {
  if (acknowledged) { return '<span class="rl-ok">Understood ✓ ' + esc(pkt(at)) + '</span>'; }
  return '<span class="pill rl-new">New</span>' +
    '<button class="minibtn" data-ack-kind="' + attr(kind) + '" data-ack-id="' + attr(id) + '">Understood</button>';
}

function lawRow(text, deptPill, meta, actions) {
  return '<div class="tl-row rl-row"><div class="rl-txt"><div class="t">' + esc(text) + '</div>' +
    '<div class="rl-meta">' + deptPill + esc(meta) + '</div></div>' +
    '<div class="rl-act">' + actions + '</div></div>';
}

function deptPill(department, myDept) {
  if (String(department) === String(myDept)) { return ''; }
  return '<span class="pill rl-dept">' + esc(department) + '</span> ';
}

function renderLaw(d) {
  var types = (d.types && d.types.length) ? d.types : RULE_TYPES;
  var groups = d.groups || {};
  var h = '<div class="grid">';
  for (var t = 0; t < types.length; t++) {
    var type = types[t], rows = groups[type] || [], fresh = 0, body = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.isNew) { fresh++; }
      body += lawRow(r.rule_text, deptPill(r.department, d.dept),
        'issued by ' + r.added_by + ' · ' + pkt(r.added_at) + ' PKT',
        ackBits('rule', r.rule_id, r.acknowledged, r.acknowledged_at));
    }
    if (!rows.length) { body = '<div class="rl-empty">Nothing here yet.</div>'; }
    h += '<div class="card enter d2"><div class="hd">' + esc(TYPE_LABEL[type] || type) +
      ' <span class="hint">' + rows.length + (rows.length === 1 ? ' rule' : ' rules') +
      (fresh ? ' · ' + fresh + ' new' : '') + '</span></div><div class="bd">' + body + '</div></div>';
  }

  var instructions = d.instructions || [], ibody = '';
  for (var j = 0; j < instructions.length; j++) {
    var n = instructions[j];
    ibody += lawRow(n.instruction_text, deptPill(n.department, d.dept),
      'effective from ' + n.date + ' · given by ' + n.given_by,
      ackBits('instruction', n.instr_id, n.acknowledged, n.acknowledged_at));
  }
  h += '<div class="card enter d3"><div class="hd">Instructions Given By The Management ' +
    '<span class="hint">' + instructions.length + ' active</span></div><div class="bd">' +
    (ibody || '<div class="rl-empty">No standing instructions right now.</div>') + '</div></div>';

  var retired = d.retired || [];
  if (retired.length) {
    var rbody = '';
    for (var k = 0; k < retired.length; k++) {
      var q = retired[k];
      rbody += lawRow(q.rule_text, deptPill(q.department, d.dept),
        (TYPE_LABEL[q.type] || q.type) + ' · retired by ' + q.retired_by + ' · ' + pkt(q.retired_at),
        '<span class="pill rl-ret">Retired</span>');
    }
    h += '<div class="card enter d3"><div class="hd">Retired rules <span class="hint">history · nothing is ever deleted</span></div>' +
      '<div class="bd">' + rbody + '</div></div>';
  }

  var box = put('rlLaw', h + '</div>');
  if (box) { box.onclick = onAckClick; }
}

/* §26.3 — one tap and the acknowledgment is recorded; the row answers on the spot. */
function onAckClick(ev) {
  var btn = upTo(ev.target, 'data-ack-id', this);
  if (!btn) { return; }
  var kind = btn.getAttribute('data-ack-kind'), id = btn.getAttribute('data-ack-id');
  var slot = btn.parentNode;
  btn.disabled = true;
  var action = kind === 'instruction' ? 'acknowledgeInstruction' : 'acknowledgeRule';
  var payload = kind === 'instruction' ? { instr_id: id } : { rule_id: id };
  api(action, payload).then(function (res) {
    slot.innerHTML = '<span class="rl-ok">Understood ✓ ' + esc(pkt(res.acknowledged_at)) + '</span>';
    STATE.counts.rules = Math.max(0, (Number(STATE.counts.rules) || 0) - 1);
    if (typeof refreshBadges === 'function') { refreshBadges(); }
    toast('Understood — Management can see you have read it.');
    if (isMgmt()) { loadAckGrid(); }
  }).catch(function (e) {
    btn.disabled = false;
    toast('Could not record that — ' + e.message);
  });
}

function renderSops(d) {
  var sops = d.sops || [], h = '';
  for (var i = 0; i < sops.length; i++) {
    var s = sops[i];
    h += '<div class="rl-sop">' +
      '<button class="rl-sopq" data-sop="' + i + '"><span class="ord num">' + esc(s.order || (i + 1)) + '</span>' +
      '<b>' + esc(s.title) + '</b><span class="chev">▸</span></button>' +
      '<div class="rl-sopc hidden" data-sopc="' + i + '">' + esc(s.content) +
      '\n\n' + esc('— updated by ' + s.updated_by + ' · ' + pkt(s.updated_at)) + '</div></div>';
  }
  var box = put('rlSops', '<div class="card enter d3"><div class="hd">SOPs <span class="hint">' +
    (d.dept === '*' ? 'every department' : esc(d.dept)) + ' · in order</span></div><div class="bd">' +
    (h || '<div class="rl-empty">No SOPs for your department yet.</div>') + '</div></div>');
  if (!box) { return; }
  box.onclick = function (ev) {
    var q = upTo(ev.target, 'data-sop', this);
    if (!q) { return; }
    var idx = q.getAttribute('data-sop'), panels = box.querySelectorAll('[data-sopc]');
    for (var j = 0; j < panels.length; j++) {
      if (panels[j].getAttribute('data-sopc') === idx) {
        panels[j].classList.toggle('hidden');
        q.className = 'rl-sopq' + (panels[j].classList.contains('hidden') ? '' : ' open');
      }
    }
  };
}

/* ---------- management: the composer (§26.1, §26.4) and the acknowledgment grid (§26.3) ---------- */

function renderAdmin() {
  composerKind = 'rule';                       // the freshly drawn switch always starts on Rule
  var types = (law && law.types && law.types.length) ? law.types : RULE_TYPES;
  var h = '<div class="grid">' +
    '<div class="card enter d3"><div class="hd">Publish company law <span class="hint">delivered to that department instantly</span></div>' +
    '<div class="bd">' +
      '<div class="rl-seg" id="rlKind"><button class="on" data-kind="rule">Rule</button><button data-kind="instruction">Instruction</button></div>' +
      '<div class="rt-fields">' +
        '<div class="field"><label>Department</label>' + selectHtml('rlDept', RULE_DEPTS, 'ALL') + '</div>' +
        '<div class="field" id="rlTypeField"><label>Type</label>' + selectHtml('rlType', types, types[0]) + '</div>' +
        '<div class="field hidden" id="rlDateField"><label>Effective from</label><input type="date" id="rlDate"></div>' +
      '</div>' +
      '<div class="field"><label id="rlTextLabel">Rule text</label><textarea class="rl-ta" id="rlText" placeholder="Write it exactly as staff should read it…"></textarea></div>' +
      '<button class="btn-gold" id="rlPublish" style="margin-top:14px">Publish rule</button>' +
      '<div class="rl-meta">Every staff member in that department is notified with the date, time and your name.</div>' +
    '</div></div>' +
    '<div class="card enter d3"><div class="hd">Acknowledgment grid <span class="hint">who has read it, who has not</span></div>' +
      '<div class="bd" id="rlGrid">' + loadingCard('Loading acknowledgments…') + '</div></div>' +
    '<div id="rlDetail"></div>' +
  '</div>';
  if (!put('rlAdmin', h)) { return; }

  $('rlKind').onclick = function (ev) {
    var b = upTo(ev.target, 'data-kind', this);
    if (!b) { return; }
    composerKind = b.getAttribute('data-kind');
    var all = this.getElementsByTagName('button');
    for (var i = 0; i < all.length; i++) { all[i].className = all[i] === b ? 'on' : ''; }
    var rule = composerKind === 'rule';
    $('rlTypeField').classList.toggle('hidden', !rule);
    $('rlDateField').classList.toggle('hidden', rule);
    $('rlTextLabel').textContent = rule ? 'Rule text' : 'Instruction';
    $('rlPublish').textContent = rule ? 'Publish rule' : 'Publish instruction';
  };
  $('rlPublish').onclick = publish;
}

function publish() {
  var text = $('rlText').value.replace(/^\s+|\s+$/g, '');
  if (!text) { toast('Write the text first.'); return; }
  var btn = $('rlPublish');
  btn.disabled = true;
  var rule = composerKind === 'rule';
  var action = rule ? 'addRule' : 'addInstruction';
  var payload = rule
    ? { department: $('rlDept').value, type: $('rlType').value, rule_text: text }
    : { department: $('rlDept').value, instruction_text: text, date: $('rlDate').value };
  api(action, payload).then(function (res) {
    btn.disabled = false;
    $('rlText').value = '';
    var n = Number(res.delivered) || 0;
    toast((rule ? 'Rule' : 'Instruction') + ' published — delivered to ' + n + (n === 1 ? ' person.' : ' people.'));
    loadLaw();
    loadAckGrid();
  }).catch(function (e) {
    btn.disabled = false;
    toast('Could not publish — ' + e.message);
  });
}

function loadAckGrid() {
  if (!isMgmt() || !$('rlGrid')) { return; }
  api('ruleAckGrid', {}).then(function (d) {
    ackGrid = d.rules || [];
    renderAckGrid();
  }).catch(function () {
    put('rlGrid', '<div class="rl-empty">The acknowledgment grid could not be loaded.</div>');
  });
}

function renderAckGrid() {
  if (!ackGrid.length) {
    put('rlGrid', '<div class="rl-empty">No active rules yet.</div>');
    return;
  }
  var h = '<div class="scroll"><table class="rl-tbl"><thead><tr><th>Rule</th><th>Department</th><th>Type</th><th>Read</th></tr></thead><tbody>';
  for (var i = 0; i < ackGrid.length; i++) {
    var r = ackGrid[i], done = Number(r.acknowledged) || 0, of = Number(r.of) || 0;
    h += '<tr data-rule="' + attr(r.rule_id) + '">' +
      '<td><div class="rl-cell">' + esc(r.rule_text) + '</div>' +
        '<div class="rl-meta mono">' + esc(r.rule_id) + '</div></td>' +
      '<td>' + esc(r.department) + '</td>' +
      '<td>' + esc(TYPE_LABEL[r.type] || r.type) + '</td>' +
      '<td><span class="num" style="font-weight:800;color:' + (done >= of && of ? 'var(--ok)' : 'var(--warn)') + '">' +
        done + ' / ' + of + '</span></td></tr>';
  }
  var box = put('rlGrid', h + '</tbody></table></div><div class="rl-meta">Tap a rule to see exactly who has read it.</div>');
  if (!box) { return; }
  box.onclick = function (ev) {
    var tr = upTo(ev.target, 'data-rule', this);
    if (tr) { loadAckDetail(tr.getAttribute('data-rule')); }
  };
}

function loadAckDetail(ruleId) {
  put('rlDetail', loadingCard('Loading who has read it…'));
  api('ruleAckGrid', { rule_id: ruleId }).then(renderAckDetail).catch(function () {
    put('rlDetail', noteCard('That acknowledgment grid could not be loaded.'));
  });
}

function renderAckDetail(d) {
  var grid = d.grid || [], counts = d.counts || {}, rows = '';
  for (var i = 0; i < grid.length; i++) {
    var p = grid[i];
    rows += '<div class="tl-row"><span class="k">' + esc(p.name || p.email) + '</span>' +
      '<span class="pill rl-dept">' + esc(p.role || '—') + '</span>' +
      '<span style="margin-left:auto">' + (p.acknowledged
        ? '<span class="rl-ok">Read ✓ ' + esc(pkt(p.acknowledged_at)) + '</span>'
        : '<span class="pill rt-req">Not yet</span>') + '</span></div>';
  }
  var retire = d.status === 'active'
    ? '<button class="minibtn" id="rlRetire" data-rule="' + attr(d.rule_id) + '" style="margin-top:14px">Retire this rule</button>'
    : '<div class="rl-meta">Retired by ' + esc(d.retired_by) + ' · ' + esc(pkt(d.retired_at)) + '</div>';

  put('rlDetail', '<div class="card enter d2"><div class="hd">Who has read it ' +
    '<span class="hint">' + (Number(counts.acknowledged) || 0) + ' read · ' + (Number(counts.pending) || 0) + ' not yet</span></div>' +
    '<div class="bd"><div class="rl-txt"><div class="t">' + esc(d.rule_text) + '</div>' +
      '<div class="rl-meta">' + esc(d.department + ' · ' + (TYPE_LABEL[d.type] || d.type) +
        ' · issued by ' + d.added_by + ' · ' + pkt(d.added_at)) + ' PKT</div></div>' +
    '<div style="margin-top:8px">' + (rows || '<div class="rl-empty">Nobody is targeted by this rule yet.</div>') + '</div>' +
    retire + '</div></div>');

  var btn = $('rlRetire');
  if (btn) {
    btn.onclick = function () {
      if (!window.confirm('Retire this rule? It stays visible in history with your name and the time.')) { return; }
      btn.disabled = true;
      api('retireRule', { rule_id: btn.getAttribute('data-rule') }).then(function () {
        toast('Rule retired — it stays in history.');
        put('rlDetail', '');
        loadLaw();
        loadAckGrid();
      }).catch(function (e) {
        btn.disabled = false;
        toast('Could not retire — ' + e.message);
      });
    };
  }
}

/* ============================ §5 — THE ROTA ============================ */

var rota = null, editing = null;

VIEWS.rota = {
  label: 'Rota',
  order: 60,
  roles: ['Management', 'Ops Head'],
  icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h2M14.5 14h2M7.5 17.5h2M14.5 17.5h2"/>',
  render: function () {
    return '<div class="hgroup enter d1"><h1>Staff <span class="goldtext">rota</span></h1>' +
      '<span class="sub">Management sets every timetable — staff only request a shift</span></div>' +
      '<div id="rtMine">' + loadingCard('Loading your timetable…') + '</div>' +
      '<div id="rtEditor"></div>' +
      '<div id="rtGrid" style="margin-top:16px">' + loadingCard('Loading the rota…') + '</div>';
  },
  init: function () {
    var tc = cachedCall('myTimetable', {}, renderMine);
    tc.done.catch(function () {
      if (tc.painted) { return; }
      put('rtMine', noteCard('Your timetable could not be loaded right now.'));
    });
    loadRota();
  }
};

function renderMine(d) {
  var s = d.schedule, cps = d.checkpoints || [], pills = '';
  for (var i = 0; i < cps.length; i++) {
    var c = cps[i];
    var cls = c.status === 'done' ? 'pill role' : (c.status === 'due' ? 'pill rt-due' : 'pill rt-up');
    pills += '<span class="' + cls + '"><span class="num">' + esc(c.time) + '</span></span>';
  }
  var source = !s ? 'Not set yet'
    : (s.source === 'assigned'
      ? 'set by ' + s.assigned_by + ' · from ' + s.effective_from
      : 'from your requested shift — Management has not assigned a timetable yet');

  put('rtMine', '<div class="card enter d2"><div class="hd">My timetable <span class="hint">set by Management</span></div>' +
    '<div class="bd">' +
      '<div class="tl-row"><span class="k">Shift</span><b>' + esc(s ? s.shift_label : (d.shift || 'Not set yet')) + '</b></div>' +
      '<div class="tl-row"><span class="k">Work</span><b class="num">' + esc(s && s.work_start ? s.work_start + '–' + s.work_end : '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Break</span><b class="num">' + esc(s && s.break_start ? s.break_start + '–' + s.break_end : '—') + '</b></div>' +
      '<div class="tl-row"><span class="k">Working days</span><b>' + esc(s && s.working_days ? s.working_days : 'Not set yet') + '</b></div>' +
      '<div class="tl-row"><span class="k">Checkpoints</span><span class="rt-cps">' + (pills || '<span class="rt-none">—</span>') + '</span></div>' +
      '<div class="rl-meta">' + esc(source) + '</div>' +
    '</div></div>');
}

function loadRota() {
  var rc = cachedCall('rotaGrid', {}, function (d) {
    rota = d;
    renderRota(d);
  });
  return rc.done.catch(function () {
    if (rc.painted) { return; }
    put('rtGrid', noteCard('The rota could not be loaded. Nothing has changed — try again shortly.'));
  });
}

function renderRota(d) {
  var week = d.week || [], staff = d.staff || [];
  var h = '<div class="card enter d2"><div class="hd">Staff × days ' +
    '<span class="hint">tap any cell to set that person’s schedule</span></div><div class="bd">' +
    '<div class="scroll"><table class="rt-tbl"><thead><tr>' +
    '<th>Staff</th><th>Shift</th><th>Work</th><th>Break</th>';
  for (var w = 0; w < week.length; w++) {
    h += '<th class="rt-day' + (week[w].date === d.today ? ' rt-today' : '') + '">' + esc(week[w].day) +
      '<div class="rt-meta num">' + esc(Number(String(week[w].date).slice(8, 10))) + '</div></th>';
  }
  h += '<th>Checkpoints</th></tr></thead><tbody>';

  for (var i = 0; i < staff.length; i++) {
    var s = staff[i];
    h += '<tr data-i="' + i + '">' +
      '<td><div class="rt-name">' + esc(s.name || s.email) + '</div>' +
        '<div class="rt-meta">' + esc(s.role) + '</div></td>' +
      '<td><b>' + esc(s.shift_label || '—') + '</b>' +
        (s.assigned ? '' : ' <span class="pill rt-req">Requested</span>') +
        '<div class="rt-meta">' + esc(s.assigned ? 'from ' + s.effective_from : 'not set by Management yet') + '</div></td>' +
      '<td class="num">' + esc(s.work_start ? s.work_start + '–' + s.work_end : '—') + '</td>' +
      '<td class="num">' + esc(s.break_start ? s.break_start + '–' + s.break_end : '—') + '</td>';
    var days = s.week || [];
    for (var j = 0; j < days.length; j++) {
      var cell = days[j].working === null || days[j].working === undefined
        ? '<span class="rt-none">—</span>'
        : '<i class="rt-dot' + (days[j].working ? ' on' : '') + '"></i>';
      h += '<td class="rt-day' + (days[j].date === d.today ? ' rt-today' : '') + '">' + cell + '</td>';
    }
    h += '<td class="rt-meta num">' + esc((s.checkpoints || []).join(' · ') || '—') + '</td></tr>';
  }
  if (!staff.length) {
    h += '<tr><td colspan="' + (5 + week.length) + '"><div class="rl-empty">No approved staff yet.</div></td></tr>';
  }

  h += '</tbody></table></div>' +
    '<div class="rt-legend"><span><i class="rt-dot on"></i> Working day</span>' +
      '<span><i class="rt-dot"></i> Off</span>' +
      '<span><b class="rt-none">—</b> Working days not set yet</span>' +
      '<span>Staff request a shift; Management assigns the timetable.</span></div>' +
    '</div></div>';

  var box = put('rtGrid', h);
  if (!box) { return; }
  box.onclick = function (ev) {
    var tr = upTo(ev.target, 'data-i', this);
    if (!tr) { return; }
    var rec = (rota.staff || [])[Number(tr.getAttribute('data-i'))];
    if (rec) { openEditor(rec); }
  };
}

/* §5 — Management (and Ops Head) set the working, break and shift schedule; saving notifies the staff member. */
function openEditor(rec) {
  editing = rec;
  var labels = (rota && rota.shift_labels) || [], dayCodes = (rota && rota.days) || [];
  var picked = rec.working_days ? rec.working_days.split(',') : [];
  var dayBtns = '';
  for (var i = 0; i < dayCodes.length; i++) {
    dayBtns += '<button class="minibtn' + (picked.indexOf(dayCodes[i]) >= 0 ? ' on' : '') +
      '" data-day="' + attr(dayCodes[i]) + '">' + esc(dayCodes[i]) + '</button>';
  }
  var stamp = rec.assigned
    ? 'Current timetable set by ' + rec.assigned_by + ' · ' + pkt(rec.assigned_at)
    : 'No timetable assigned yet · ' + (rec.name || rec.email) + ' requested ' + (rec.requested_shift || 'no shift');

  if (!put('rtEditor', '<div class="card enter d2" style="margin-top:16px">' +
    '<div class="hd">Set ' + esc(rec.name || rec.email) + '’s timetable <span class="hint">saving notifies them</span></div>' +
    '<div class="bd">' +
      '<div class="rt-fields">' +
        '<div class="field"><label>Shift</label>' + selectHtml('rtShift', labels, rec.shift_label) + '</div>' +
        '<div class="field"><label>Effective from</label><input type="date" id="rtEff" value="' + attr(rota.today) + '"></div>' +
        '<div class="field"><label>Work start</label><input type="time" id="rtWs" value="' + attr(rec.work_start) + '"></div>' +
        '<div class="field"><label>Work end</label><input type="time" id="rtWe" value="' + attr(rec.work_end) + '"></div>' +
        '<div class="field"><label>Break start</label><input type="time" id="rtBs" value="' + attr(rec.break_start) + '"></div>' +
        '<div class="field"><label>Break end</label><input type="time" id="rtBe" value="' + attr(rec.break_end) + '"></div>' +
      '</div>' +
      '<div class="field"><label>Working days</label><div class="rt-days" id="rtDays">' + dayBtns + '</div></div>' +
      '<div class="rl-meta" style="margin-top:12px">' + esc(stamp) + '</div>' +
      '<div class="rl-meta">Checkpoints follow automatically: every 2 hours from work start, skipping the break, final report at work end.</div>' +
      '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn-gold" id="rtSave">Save timetable</button>' +
        '<button class="btn-ghost" id="rtCancel">Cancel</button>' +
      '</div>' +
    '</div></div>')) { return; }

  $('rtDays').onclick = function (ev) {
    var b = upTo(ev.target, 'data-day', this);
    if (!b) { return; }
    b.className = b.className.indexOf(' on') >= 0 ? 'minibtn' : 'minibtn on';
  };
  /* Switching to a named shift blanks the times so the backend fills that shift's CONFIG preset (§5). */
  $('rtShift').onchange = function () {
    if (this.value === rec.shift_label || this.value === 'Custom') { return; }
    $('rtWs').value = ''; $('rtWe').value = ''; $('rtBs').value = ''; $('rtBe').value = '';
  };
  $('rtCancel').onclick = function () { editing = null; put('rtEditor', ''); };
  $('rtSave').onclick = saveSchedule;
  try { $('rtEditor').scrollIntoView(); } catch (e) {}
}

function saveSchedule() {
  if (!editing) { return; }
  var label = $('rtShift').value, ws = $('rtWs').value, we = $('rtWe').value;
  var bs = $('rtBs').value, be = $('rtBe').value;
  if (label === 'Custom' && (!ws || !we)) { toast('A custom shift needs a work start and a work end.'); return; }
  if ((bs && !be) || (!bs && be)) { toast('A break needs both a start and an end.'); return; }

  var days = [], btns = $('rtDays').getElementsByTagName('button');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].className.indexOf(' on') >= 0) { days.push(btns[i].getAttribute('data-day')); }
  }
  var who = editing.name || editing.email;
  var btn = $('rtSave');
  btn.disabled = true;
  api('setSchedule', {
    email: editing.email, shift_label: label, effective_from: $('rtEff').value,
    work_start: ws, work_end: we, break_start: bs, break_end: be, working_days: days.join(',')
  }).then(function (res) {
    editing = null;
    put('rtEditor', '');
    toast('Timetable saved — ' + who + ' has been notified · checkpoints ' + (res.checkpoints || []).join(', '));
    loadRota();
  }).catch(function (e) {
    btn.disabled = false;
    toast('Could not save — ' + e.message);
  });
}

})();
