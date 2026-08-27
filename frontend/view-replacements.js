/* view-replacements.js — the Replacement orders desk (26 Aug, owner). CS, Team Lead, Management
 * and Order Processors raise a replacement for any order: preset reasons plus a custom option
 * that REQUIRES an explanation. The backend appends the row to TODAY's day tab in that account's
 * live order book, headed REPLACEMENT ORDER with the reason — so the processor buys it like any
 * order — and archives every request here. Rows arrive pre-filled from the button on Today's
 * orders. Backend: replacementCreate · replacementList. */
(function () {
  'use strict';

  var RP_ROLES = ['CS', 'Team Lead', 'Management', 'Ops Head', 'Order Processor', 'Sales Operations'];

  VIEW_CSS.push(
    '.rp-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}' +
    '.rp-in,.rp-sel,.rp-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.rp-ta{min-height:74px;resize:vertical}' +
    '.rp-lab{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:6px}' +
    '.rp-req::after{content:" *";color:var(--bad)}' +
    '.rp-note{font-size:12px;font-weight:600;color:var(--text-3);margin-top:8px}' +
    '.rp-ok{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--ok-soft);border:1px solid rgba(63,207,142,.4);font-weight:700;font-size:13px;color:var(--ok)}' +
    '.rp-bad{margin-top:12px;padding:11px 14px;border-radius:10px;background:var(--warn-soft);border:1px solid rgba(255,159,67,.45);font-weight:700;font-size:13px;color:var(--warn)}' +
    '.rp-pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:7px;background:var(--panel);border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap}'
  );

  function rpS(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function rpAttr(v) { return esc(rpS(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  var RP = { reasons: [], canRaise: false, seq: 0 };
  var RP_PREFILL_KEY = 'm98m:repl:prefill';

  VIEWS.replacements = {
    label: 'Replacement orders',
    icon: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    roles: RP_ROLES,
    order: 3.6,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Replacement <span class="goldtext">orders</span></h1>' +
          '<span class="sub">raise one → it lands on today’s tab of that account’s order book, headed REPLACEMENT ORDER, Pending</span>' +
          '<button class="minibtn" id="rpRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d1" id="rpFormCard"><div class="hd">Raise a replacement' +
          '<span class="hint">the processor then purchases it like any order</span></div>' +
          '<div class="bd" id="rpForm"><div class="spinner"></div></div></div>' +
        '<div class="card enter d2" style="margin-top:14px"><div class="hd">Every replacement raised' +
          '<span class="hint">newest first · where each one landed</span></div>' +
          '<div class="bd" id="rpList"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('rpRefresh').onclick = rpLoad;
      rpLoad();
    }
  };

  function rpPrefill() {
    try {
      var raw = localStorage.getItem(RP_PREFILL_KEY);
      if (!raw) { return null; }
      localStorage.removeItem(RP_PREFILL_KEY);
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function rpLoad() {
    var seq = ++RP.seq;
    api('replacementList', {}).then(function (d) {
      if (seq !== RP.seq) { return; }
      RP.reasons = (d && d.reasons) || [];
      RP.canRaise = !!(d && d.can_raise);
      rpPaintForm();
      rpPaintList((d && d.rows) || []);
    }).catch(function (e) {
      if (seq !== RP.seq) { return; }
      setHTML('rpForm', '<div class="rp-bad">Could not load: ' + esc(e.message) + ' — press Refresh.</div>');
      setHTML('rpList', '');
    });
  }

  function rpPaintForm() {
    if (!$('rpForm')) { return; }
    if (!RP.canRaise) {
      setHTML('rpForm', '<div class="rp-note" style="margin-top:0">Your role can view this desk but not raise replacements — CS, Team Lead, Order Processor and Management raise them.</div>');
      return;
    }
    var pre = rpPrefill() || {};
    setHTML('rpForm',
      '<div class="rp-grid">' +
        '<div><label class="rp-lab rp-req">Account</label><select class="rp-sel" id="rpAcc"><option value="">Loading…</option></select></div>' +
        '<div><label class="rp-lab rp-req">Original eBay order number</label><input class="rp-in" id="rpOrder" placeholder="e.g. 18-15052-74974" value="' + rpAttr(pre.order_number || '') + '"></div>' +
        '<div><label class="rp-lab">Item title</label><input class="rp-in" id="rpTitle" placeholder="what the buyer ordered" value="' + rpAttr(pre.item_title || '') + '"></div>' +
        '<div><label class="rp-lab">Quantity</label><input class="rp-in" id="rpQty" value="' + rpAttr(pre.quantity || '1') + '"></div>' +
        '<div><label class="rp-lab">Variation</label><input class="rp-in" id="rpVar" placeholder="size / colour, if any" value="' + rpAttr(pre.variation || '') + '"></div>' +
        '<div><label class="rp-lab">AliExpress link</label><input class="rp-in" id="rpAli" placeholder="https://… (helps the processor)" value="' + rpAttr(pre.ali_link || '') + '"></div>' +
        '<div><label class="rp-lab rp-req">Reason</label><select class="rp-sel" id="rpReason">' +
          RP.reasons.map(function (r) { return '<option value="' + rpAttr(r.key) + '">' + esc(r.label) + '</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div style="margin-top:12px"><label class="rp-lab" id="rpExpLab">Explanation <span style="text-transform:none;letter-spacing:0">(required for a custom reason)</span></label>' +
        '<textarea class="rp-ta" id="rpExp" placeholder="what happened, in a sentence or two"></textarea></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn-gold" id="rpSend">Raise the replacement</button>' +
        '<span class="rp-note" style="margin-top:0">It is appended to today’s tab with the original order number — nothing on the original row is touched.</span>' +
      '</div>' +
      '<div id="rpOut"></div>');

    cachedCall('accountList', {}, function (d) {
      var sel = $('rpAcc');
      if (!sel) { return; }
      var accs = ((d && d.accounts) || []).map(function (a) { return rpS(a.account); }).filter(Boolean);
      sel.innerHTML = accs.length
        ? accs.map(function (a) { return '<option value="' + rpAttr(a) + '"' + (a === rpS(pre.account) ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('')
        : '<option value="">No account connected yet</option>';
    }).done.catch(function () {
      var sel = $('rpAcc');
      if (sel && /Loading/.test(sel.innerHTML)) { sel.innerHTML = '<option value="">Could not load accounts — press Refresh</option>'; }
    });

    var reasonSel = $('rpReason');
    var syncReq = function () {
      var lab = $('rpExpLab');
      if (lab) { lab.className = 'rp-lab' + (reasonSel.value === 'custom' ? ' rp-req' : ''); }
    };
    reasonSel.onchange = syncReq; syncReq();

    $('rpSend').onclick = function () {
      var out = $('rpOut');
      var payload = {
        account: rpS($('rpAcc').value), order_number: rpS($('rpOrder').value),
        item_title: rpS($('rpTitle').value), quantity: rpS($('rpQty').value) || '1',
        variation: rpS($('rpVar').value), ali_link: rpS($('rpAli').value),
        reason_key: rpS(reasonSel.value), explanation: rpS($('rpExp').value),
      };
      if (!payload.account) { out.innerHTML = '<div class="rp-bad">Choose the account.</div>'; return; }
      if (!payload.order_number) { out.innerHTML = '<div class="rp-bad">The original eBay order number is required.</div>'; return; }
      if (payload.reason_key === 'custom' && payload.explanation.length < 10) {
        out.innerHTML = '<div class="rp-bad">A custom reason needs an explanation — at least 10 characters.</div>'; return;
      }
      var btn = this; btn.disabled = true; btn.textContent = 'Raising…';
      out.innerHTML = '';
      api('replacementCreate', payload).then(function (r) {
        btn.disabled = false; btn.textContent = 'Raise the replacement';
        if (r && r.ok) {
          out.innerHTML = '<div class="rp-ok">Raised — ' + esc(r.repl_id) + '. ' +
            (r.sheet_tab ? 'On the <b>' + esc(r.sheet_tab) + '</b> tab' + (r.sheet_row && r.sheet_row !== 'shadow' ? ', row ' + esc(r.sheet_row) : '') + ', Pending.' : esc(r.sheet_note || '')) +
            (r.shadow ? ' (shadow mode — recorded, not written)' : '') + '</div>';
          var oi = $('rpOrder'); if (oi) { oi.value = ''; }
          var ti = $('rpTitle'); if (ti) { ti.value = ''; }
          var xi = $('rpExp'); if (xi) { xi.value = ''; }
          rpLoad();
        } else {
          out.innerHTML = '<div class="rp-bad">The sheet write did not land: ' + esc((r && r.sheet_note) || 'unknown') + '. The request is recorded on this desk either way.</div>';
          rpLoad();
        }
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Raise the replacement';
        out.innerHTML = '<div class="rp-bad">' + esc(e.message) + '</div>';
      });
    };
  }

  function rpPaintList(rows) {
    if (!$('rpList')) { return; }
    if (!rows.length) {
      setHTML('rpList', '<div class="rp-note" style="margin-top:0">No replacement has been raised yet.</div>');
      return;
    }
    setHTML('rpList', '<div class="scroll"><table class="ir-tbl" style="min-width:860px"><thead><tr>' +
      '<th style="text-align:left">When</th><th style="text-align:left">Account</th>' +
      '<th style="text-align:left">Order</th><th style="text-align:left">Item</th>' +
      '<th style="text-align:left">Reason</th><th style="text-align:left">Raised by</th>' +
      '<th style="text-align:left">Landed</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var landed = rpS(r.sheet_tab)
          ? '<span class="rp-pill">' + esc(rpS(r.sheet_tab)) + (rpS(r.sheet_row) && r.sheet_row !== 'shadow' ? ' · row ' + esc(rpS(r.sheet_row)) : '') + '</span>'
          : '<span class="rp-pill" style="color:var(--warn)">' + esc(rpS(r.sheet_note) || 'portal only') + '</span>';
        return '<tr><td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' + esc(fmtPkt(r.ts, true) || rpS(r.ts)) + '</td>' +
          '<td style="text-align:left">' + esc(rpS(r.account)) + '</td>' +
          '<td style="text-align:left" class="mono">' + esc(rpS(r.order_number)) + '</td>' +
          '<td style="text-align:left;max-width:220px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + rpAttr(r.item_title) + '">' + esc(rpS(r.item_title) || '—') + '</div></td>' +
          '<td style="text-align:left;max-width:240px;font-size:12px" title="' + rpAttr(r.reason_text) + '">' + esc(rpS(r.reason_text).slice(0, 90) || '—') + '</td>' +
          '<td style="text-align:left">' + esc(rpS(r.raised_by).split('@')[0]) + '</td>' +
          '<td style="text-align:left">' + landed + '</td></tr>';
      }).join('') + '</tbody></table></div>');
  }

})();
