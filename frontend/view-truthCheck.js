/* view-truthCheck.js — TRUTH v2 §6.5: the independent verifier's page. Management only.
 * Path A (what pages show) vs Path B (separately written recompute) for every registered
 * metric, the penny audit, and sync health — evidence, not claims. */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.tc-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px}' +
    '.tc-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.tc-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.tc-tile b{display:block;font-size:24px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.tc-pass b{color:var(--ok)}.tc-fail b{color:var(--bad)}.tc-stale b{color:var(--warn)}' +
    '.tc-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}' +
    '.tc-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.tc-tbl td{padding:7px 10px;border-bottom:1px solid var(--gold-line);font-variant-numeric:tabular-nums}' +
    '.tc-st{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px}' +
    '.tc-st.PASS{background:var(--ok-soft,rgba(63,207,142,.12));color:var(--ok)}' +
    '.tc-st.FAIL{background:var(--bad-soft,rgba(240,96,90,.12));color:var(--bad)}' +
    '.tc-st.STALE{background:rgba(233,196,106,.12);color:var(--warn)}' +
    '.tc-st.UNVERIFIED{background:var(--panel);color:var(--text-3)}'
  );

  function tcS(v) { return String(v == null ? '' : v); }

  function tcPaint(d) {
    var box = $('tcBody');
    if (!box) { return; }
    var c = d.counts || {};
    var h = '<div class="tc-tiles">' +
      '<div class="tc-tile tc-pass"><span class="k">Verified · PASS</span><b>' + (c.PASS || 0) + '</b></div>' +
      '<div class="tc-tile tc-fail"><span class="k">Failing</span><b>' + (c.FAIL || 0) + '</b></div>' +
      '<div class="tc-tile tc-stale"><span class="k">Stale (source lag)</span><b>' + (c.STALE || 0) + '</b></div>' +
      '<div class="tc-tile"><span class="k">Unverified (Phase 1)</span><b>' + (c.UNVERIFIED || 0) + '</b></div>' +
      '</div>';

    if ((d.fails || []).length) {
      h += '<div class="card"><div class="hd" style="color:var(--bad)">Failures — Path A vs Path B disagree</div><div class="bd"><div class="scroll"><table class="tc-tbl"><thead><tr>' +
        '<th>Metric</th><th>Scope</th><th>Shown</th><th>Recomputed</th><th>Delta</th><th>Method</th><th>When</th><th>Evidence</th></tr></thead><tbody>' +
        d.fails.map(function (r) {
          return '<tr><td><b>' + esc(tcS(r.metric_id)) + '</b></td><td>' + esc(tcS(r.scope_key)) + '</td>' +
            '<td>' + esc(tcS(r.shown)) + '</td><td>' + esc(tcS(r.recomputed)) + '</td>' +
            '<td style="color:var(--bad);font-weight:800">' + esc(tcS(r.delta)) + '</td>' +
            '<td>' + esc(tcS(r.method)) + '</td><td>' + esc(tcS(r.ran_at).slice(11, 16)) + '</td>' +
            '<td style="max-width:260px;font-size:11px;color:var(--text-3)">' + esc(tcS(r.evidence)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div></div>';
    } else {
      h += '<div class="card"><div class="bd" style="color:var(--ok);font-weight:700;padding:16px">No failures — every verified number agrees with its independent recompute.</div></div>';
    }

    h += '<div class="card" style="margin-top:14px"><div class="hd">Latest verification per metric <span class="hint">Path B runs every 15 min (tier 1) · nightly penny audit at 03:00 PKT</span></div><div class="bd"><div class="scroll"><table class="tc-tbl"><thead><tr>' +
      '<th>Metric</th><th>Scope</th><th>Shown</th><th>Recomputed</th><th>Status</th><th>Method</th><th>Checked</th><th>Next</th></tr></thead><tbody>' +
      (d.latest || []).slice(0, 120).map(function (r) {
        return '<tr><td><b>' + esc(tcS(r.metric_id)) + '</b></td><td>' + esc(tcS(r.scope_key)) + '</td>' +
          '<td>' + esc(tcS(r.shown)) + '</td><td>' + esc(tcS(r.recomputed)) + '</td>' +
          '<td><span class="tc-st ' + esc(tcS(r.status)) + '">' + esc(tcS(r.status)) + '</span></td>' +
          '<td>' + esc(tcS(r.method)) + '</td><td>' + esc(tcS(r.ran_at).slice(5, 16).replace('T', ' ')) + '</td>' +
          '<td style="color:var(--text-3)">' + esc(tcS(r.next_run_at).slice(11, 16)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';

    h += '<div class="card" style="margin-top:14px"><div class="hd">Sheet mirror — money rows in D1 <span class="hint">the pages read these, never Google live (R8)</span></div><div class="bd"><div class="scroll"><table class="tc-tbl" style="min-width:420px"><thead><tr><th>Account</th><th>Pakistan day</th><th>Rows</th></tr></thead><tbody>' +
      (d.sheet_days || []).map(function (r) {
        return '<tr><td>' + esc(tcS(r.account)) + '</td><td>' + esc(tcS(r.day_pk)) + '</td><td>' + esc(tcS(r.rows)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';

    h += '<div class="card" style="margin-top:14px"><div class="hd">Sync health <span class="hint">every job, every account — a failing account never blanks another</span></div><div class="bd"><div class="scroll"><table class="tc-tbl"><thead><tr><th>Job</th><th>Account</th><th>Last OK</th><th>Error</th></tr></thead><tbody>' +
      (d.sync || []).filter(function (r) { return tcS(r.account).indexOf('@lock') < 0; }).map(function (r) {
        var err = tcS(r.last_error);
        return '<tr' + (err ? ' style="color:var(--bad)"' : '') + '><td>' + esc(tcS(r.job)) + '</td><td>' + esc(tcS(r.account) || 'all') + '</td>' +
          '<td>' + esc(tcS(r.last_ok).slice(5, 16)) + '</td><td style="max-width:280px;font-size:11px">' + esc(err || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';

    box.innerHTML = h;
    var st = $('tcStamp');
    if (st) { st.textContent = 'as of ' + (fmtPkt(d.as_of, true) || d.as_of); }
  }

  VIEWS.truthCheck = {
    label: 'Truth Check',
    icon: '<path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7z"/><path d="m9 12 2 2 4-4"/>',
    roles: ['Management', 'Ops Head'],
    order: 10.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Truth <span class="goldtext">Check</span></h1>' +
        '<span class="sub" id="tcStamp">two independent paths to every number — this page is where they meet</span>' +
        '<button class="minibtn" id="tcRun" style="margin-left:auto">Recheck now</button>' +
        '<button class="minibtn" id="tcRefresh">Refresh</button></div>' +
        '<div id="tcBody"><div class="spinner"></div></div>';
    },
    init: function () {
      var load = function () {
        api('truthBoard', {}).then(tcPaint).catch(function (e) {
          var b = $('tcBody');
          if (b) { b.innerHTML = '<div class="alx-empty">The board did not answer — ' + esc(e.message) + '</div>'; }
        });
      };
      var run = $('tcRun');
      if (run) {
        run.onclick = function () {
          run.disabled = true; run.textContent = 'Rechecking…';
          api('runJobNow', { job: 'truthTier1' }).then(function () { run.disabled = false; run.textContent = 'Recheck now'; load(); })
            .catch(function (e) { run.disabled = false; run.textContent = 'Recheck now'; toast('Could not run — ' + e.message); });
        };
      }
      var rf = $('tcRefresh');
      if (rf) { rf.onclick = load; }
      load();
    }
  };
})();
