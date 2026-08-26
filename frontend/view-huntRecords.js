/* view-huntRecords.js — the hunting archive (26 Aug, owner). "Hunting gets three pages:
 * Products not approved · Approved · Pending approval, each with archive access." Three tabs over
 * the whole HUNTING_DB, by outcome, newest first — so a hunter can see what was approved, read
 * every rejection reason before hunting the next product, and check what is still in the pipeline.
 * Read-only: this page decides nothing (reviewers still decide on Hunt approvals). Backend:
 * huntRecords (status = pending | approved | not approved). Profit/PII stripped per role server-side. */
(function () {
  'use strict';

  var HR_ROLES = ['Product Hunter', 'Team Lead', 'Ops Head', 'Management', 'Order Processor',
    'Advertising Manager', 'Listing Manager', 'Sales Operations'];

  /* The three pages, in the owner's spoken order: what's waiting, what got in, what got turned away. */
  var HR_TABS = [
    { key: 'pending', label: 'Pending approval', status: 'pending', cls: 'hr-pend', count: 'pending' },
    { key: 'approved', label: 'Approved', status: 'approved', cls: 'hr-ok', count: 'approved' },
    { key: 'rejected', label: 'Not approved', status: 'not approved', cls: 'hr-no', count: 'not_approved' }
  ];

  VIEW_CSS.push(
    '.hr-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
    '.hr-tab{padding:9px 15px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel-2);' +
      'color:var(--text-2);font-weight:800;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .15s}' +
    '.hr-tab:hover{border-color:var(--gold-line-hi);color:var(--text)}' +
    '.hr-tab.on{background:var(--gold-a);color:#1a1204;border-color:var(--gold-a)}' +
    '.hr-tab .n{font-variant-numeric:tabular-nums;font-size:11px;padding:1px 7px;border-radius:999px;' +
      'background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2)}' +
    '.hr-tab.on .n{background:rgba(0,0,0,.16);border-color:transparent;color:#1a1204}' +
    '.hr-links a{margin-right:8px;font-size:11px;font-weight:700;white-space:nowrap}' +
    '.hr-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;' +
      'border-radius:7px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text-3)}'
  );

  function hrStr(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function hrAttr(v) { return esc(hrStr(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  function hrPill(rec) {
    var s = hrStr(rec.approval_status);
    if (s === 'APPROVED') { return '<span class="pill hu-ok">Approved</span>'; }
    if (s === 'NOT APPROVED') { return '<span class="pill hu-no">Not approved</span>'; }
    if (s === 'REVISION REQUIRED') { return '<span class="pill hu-rev">Revision</span>'; }
    return '<span class="pill">Pending</span>';
  }

  /* a bare link cell — the supplier / eBay URLs, shown as small labelled links, never as raw text */
  function hrLink(url, label) {
    var u = hrStr(url);
    if (!/^https?:\/\//i.test(u)) { return ''; }
    return '<a href="' + hrAttr(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }

  var HR = { tab: 'pending', cache: {}, counts: null, query: '' };

  VIEWS.huntRecords = {
    label: 'Hunt records',
    icon: '<path d="M4 4h13l3 3v13H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    roles: HR_ROLES,
    order: 16.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Hunt <span class="goldtext">records</span></h1>' +
          '<span class="sub">every hunt by outcome, newest first — the full archive, read-only</span>' +
          '<button class="minibtn" id="hrRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="hr-tabs enter d1" id="hrTabs"></div>' +
        '<div class="card enter d2"><div class="hd" id="hrHd">Records' +
          '<input class="hu-in" id="hrFind" placeholder="Search title · hunter · reason · account · id" ' +
            'style="width:min(340px,55%);margin-left:auto;padding:7px 11px;font-size:12.5px"></div>' +
          '<div class="bd" id="hrBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('hrRefresh').onclick = function () { HR.cache = {}; HR.counts = null; hrLoad(HR.tab, true); };
      var find = $('hrFind');
      if (find) { find.value = HR.query; find.oninput = function () { HR.query = this.value; hrPaint(HR.tab); }; }
      hrRenderTabs();
      hrLoad(HR.tab, false);
    }
  };

  function hrRenderTabs() {
    var box = $('hrTabs');
    if (!box) { return; }
    box.innerHTML = HR_TABS.map(function (t) {
      var n = HR.counts ? HR.counts[t.count] : null;
      return '<div class="hr-tab' + (t.key === HR.tab ? ' on' : '') + '" data-hrtab="' + t.key + '">' +
        esc(t.label) + '<span class="n" data-hrn="' + t.key + '">' + (n == null ? '·' : n) + '</span></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('[data-hrtab]'), function (el) {
      el.onclick = function () {
        HR.tab = this.getAttribute('data-hrtab');
        hrRenderTabs();
        hrLoad(HR.tab, false);
      };
    });
  }

  function hrLoad(tabKey, force) {
    var body = $('hrBody');
    if (!body) { return; }
    if (!force && HR.cache[tabKey]) { hrPaint(tabKey); return; }
    body.innerHTML = '<div class="spinner"></div>';
    var tab = HR_TABS.filter(function (t) { return t.key === tabKey; })[0];
    api('huntRecords', { status: tab.status }).then(function (d) {
      if (HR.tab !== tabKey) { HR.cache[tabKey] = d || {}; return; }   // user switched away mid-flight
      HR.cache[tabKey] = d || {};
      if (d && d.counts) { HR.counts = d.counts; hrRenderTabs(); }
      hrPaint(tabKey);
    }).catch(function (e) {
      if ($('hrBody') && HR.tab === tabKey) {
        $('hrBody').innerHTML = '<div class="hu-hint" style="margin-top:0">Could not load: ' + esc(e.message) + '</div>';
      }
    });
  }

  function hrPaint(tabKey) {
    var body = $('hrBody');
    if (!body) { return; }
    var d = HR.cache[tabKey] || {};
    var rows = (d.hunts || []).slice();
    var q = hrStr(HR.query).toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return (hrStr(r['Title']) + ' ' + hrStr(r.hunter_name) + ' ' + hrStr(r.hunter_email) + ' ' +
          hrStr(r['Comments']) + ' ' + hrStr(r['Account Selected']) + ' ' + hrStr(r.hunt_id)).toLowerCase().indexOf(q) >= 0;
      });
    }
    var tab = HR_TABS.filter(function (t) { return t.key === tabKey; })[0];
    var hd = $('hrHd');
    if (hd) { hd.firstChild.nodeValue = tab.label + ' '; }

    if (!rows.length) {
      body.innerHTML = '<div class="hu-hint" style="margin-top:0">' +
        (q ? 'Nothing matches that search in ' + esc(tab.label.toLowerCase()) + '.'
           : 'No hunts are ' + esc(tab.label.toLowerCase()) + ' yet.') + '</div>';
      return;
    }

    var showAcct = tabKey === 'approved';
    var html = '<div class="scroll"><table class="ir-tbl" style="min-width:840px"><thead><tr>' +
      '<th style="text-align:left">Status</th><th style="text-align:left">Product</th>' +
      '<th style="text-align:left">Type</th><th style="text-align:left">Hunter</th>' +
      (showAcct ? '<th style="text-align:left">Account</th>' : '') +
      '<th style="text-align:left">' + (tabKey === 'rejected' ? 'Why it was turned away' : 'Comment') + '</th>' +
      '<th style="text-align:left">Links</th><th style="text-align:left">Submitted</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var c = hrStr(r['Comments']);
        var kind = hrStr(r['Seasonal']);
        var links = hrLink(r['Product Link 1 Main supplier'], 'Supplier') + hrLink(r['Ebay Link'], 'eBay');
        return '<tr>' +
          '<td style="text-align:left;white-space:nowrap">' + hrPill(r) + '</td>' +
          '<td style="text-align:left;max-width:250px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' +
            hrAttr(r['Title']) + '">' + esc(hrStr(r['Title']) || hrStr(r.hunt_id)) + '</div>' +
            '<span class="mono" style="font-size:10.5px;color:var(--text-3)">' + esc(hrStr(r.hunt_id)) + '</span></td>' +
          '<td style="text-align:left">' + (kind ? '<span class="hr-kind">' + esc(kind) + '</span>' : '<span style="color:var(--text-3)">—</span>') + '</td>' +
          '<td style="text-align:left">' + esc(hrStr(r.hunter_name) || hrStr(r.hunter_email) || '—') + '</td>' +
          (showAcct ? '<td style="text-align:left">' + esc(hrStr(r['Account Selected']) || '—') + '</td>' : '') +
          '<td style="text-align:left;max-width:300px;font-size:12px" title="' + hrAttr(c) + '">' +
            esc(c ? (c.length > 150 ? c.slice(0, 150) + '…' : c) : '—') + '</td>' +
          '<td style="text-align:left" class="hr-links">' + (links || '<span style="color:var(--text-3)">—</span>') + '</td>' +
          '<td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' +
            esc(fmtPkt(r.ts, true) || hrStr(r['Date Added']) || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    if (d.capped) {
      html += '<div class="hu-hint">Showing the newest ' + (d.shown || rows.length) + ' of ' + d.total +
        ' ' + esc(tab.label.toLowerCase()) + ' hunts — search to reach older ones.</div>';
    } else if (q) {
      html += '<div class="hu-hint">' + rows.length + ' of ' + (d.total || rows.length) + ' match.</div>';
    }
    body.innerHTML = html;
  }

})();
