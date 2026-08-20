/* view-csDesk.js — V2 Phase D1: the CS LIVE desk, straight from eBay (Post-Order + Trading +
 * Analytics via the Engine). The sheet-driven CS screen keeps the human workflow; this one
 * answers "what does eBay say RIGHT NOW": every open case / return / item-not-received with
 * its respond-by clock, unanswered buyer messages, eBay's own seller-standards verdict, and
 * any listing violations verbatim. CS + Management/Ops, enforced server-side. */
(function () {

  VIEW_CSS.push(
    '.cd-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}' +
    '.cd-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800;white-space:nowrap}' +
    '.cd-tbl td{padding:8px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top}' +
    '.cd-kind{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:99px;white-space:nowrap}' +
    '.cd-kind.CASE{background:var(--bad-soft);color:var(--bad)}' +
    '.cd-kind.RETURN{background:var(--warn-soft);color:var(--warn)}' +
    '.cd-kind.INR{background:var(--blue-soft);color:var(--blue-2)}' +
    '.cd-due{font-weight:800;white-space:nowrap}' +
    '.cd-due.today{color:var(--bad)}' +
    '.cd-due.soon{color:var(--warn)}' +
    '.cd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:14px 0}' +
    '.cd-mini{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:10px 14px}' +
    '.cd-mini .t{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin-bottom:6px}' +
    '.cd-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--gold-line);font-size:12.5px}' +
    '.cd-row:last-child{border-bottom:0}' +
    '.cd-std{font-weight:800}' +
    '.cd-std.top{color:var(--ok)}.cd-std.above{color:var(--blue-2)}.cd-std.below{color:var(--bad)}' +
    '.cd-violbox{border:1px solid var(--bad);border-radius:12px;background:var(--bad-soft);padding:10px 14px;margin-bottom:14px;font-size:12.5px}'
  );

  function cdStr(v) { return String(v == null ? '' : v).trim(); }

  function cdDue(payload) {
    try {
      var p = JSON.parse(payload || '{}');
      return cdStr((p.respondByDate || {}).value || '').slice(0, 10);
    } catch (e) { return ''; }
  }
  function cdDueCls(d) {
    if (!d) { return ''; }
    var today = new Date().toISOString().slice(0, 10);
    var soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    return d <= today ? 'today' : d <= soon ? 'soon' : '';
  }

  function cdFetch() {
    return api('csDesk', {}).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('csDesk', {}, d); }
      return d;
    });
  }

  function cdPaint(d) {
    var box = $('cdBody');
    if (!box) { return; }
    var h = '';

    /* Review 3: the desk leads with its own dashboard — lifecycle, INAD, refund money, reasons */
    var dash = (d && d.dashboard) || null;
    if (dash) {
      var L = dash.life || {}, R = dash.refunds || {};
      function n0(v) { return Number(v) || 0; }
      function gbp(v) { return '£' + n0(v).toFixed(2); }
      function dTile(k, v, tone) {
        return '<div class="dr-kpi" style="min-width:120px"><div class="l">' + esc(k) + '</div><div class="v"' + (tone ? ' style="color:var(--' + tone + ')"' : '') + '>' + v + '</div></div>';
      }
      h += '<div class="dr-kpis" style="margin-bottom:6px">' +
        dTile('Live cases', n0(L.live_n), n0(L.live_n) ? 'warn' : 'ok') +
        dTile('Opened · 30d', n0(L.opened_30)) +
        dTile('Closed · 30d', n0(L.closed_30), 'ok') +
        dTile('Returns open', n0(L.returns_open)) +
        dTile('INAD open', n0(L.inad_open), n0(L.inad_open) ? 'bad' : 'ok') +
        dTile('Not received open', n0(L.inr_open)) +
        dTile('Refunds · today', gbp(R.today), n0(R.today) ? 'bad' : '') +
        dTile('Refunds · this month', gbp(R.this_month) + (n0(R.this_month_n) ? ' <span style="font-size:11px;color:var(--text-3)">· ' + n0(R.this_month_n) + '</span>' : ''), n0(R.this_month) ? 'bad' : '') +
        dTile('Refunds · last month', gbp(R.last_month)) +
        '</div>';
      var reasons = dash.reasons || [];
      if (reasons.length) {
        var totR = reasons.reduce(function (t, r) { return t + (Number(r.n) || 0); }, 0);
        h += '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800;margin:2px 0 4px">Why buyers return · last 60 days</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
          reasons.map(function (r) {
            var pc = totR ? Math.round(Number(r.n) / totR * 100) : 0;
            return '<span class="minibtn" style="cursor:default">' + esc(String(r.why)) + ' <b>' + r.n + '</b> · ' + pc + '%</span>';
          }).join('') + '</div>' +
          '<p style="font-size:10.5px;color:var(--text-3);font-weight:600;margin:0 0 12px">' + esc(String(dash.refund_note || '')) + '</p>';
      }
    }

    var viols = (d && d.violations) || [];
    if (viols.length) {
      h += '<div class="cd-violbox"><b style="color:var(--bad)">🔴 ' + viols.length + ' listing violation(s) — eBay\'s own words:</b>';
      viols.slice(0, 6).forEach(function (v) {
        h += '<div style="margin-top:5px">' + esc(cdStr(v.account)) + ' · <span class="mono">' + esc(cdStr(v.item_id)) + '</span> · ' + esc(cdStr(v.type)) +
          ' — “' + esc(cdStr(v.text).slice(0, 180)) + '”' +
          (cdStr(v.ack_by) ? ' <span style="color:var(--ok);font-weight:800">seen by ' + esc(cdStr(v.ack_by).split('@')[0]) + '</span>'
            : ' <a href="#" data-cd-ack="' + esc(cdStr(v.id)) + '" style="font-weight:800">mark seen</a>') +
          '</div>';
      });
      h += '</div>';
    }

    var open = (d && d.open) || [];
    /* Seller Hub's split, kept: OUR MOVE first (the real workload), then what is merely waiting
       on the buyer or the post. One undifferentiated pile read as "wrong data" to anyone with
       Seller Hub open beside it — 38 here against eBay's ~13, because 25 were returns in transit. */
    open.sort(function (a, b) {
      if ((b.our_move || 0) !== (a.our_move || 0)) { return (b.our_move || 0) - (a.our_move || 0); }
      var da = cdDue(a.payload_json) || '9999', db = cdDue(b.payload_json) || '9999';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    var oursN = 0;
    open.forEach(function (r) { if (r.our_move) { oursN++; } });
    h += '<h3 style="margin:0 0 6px;font-size:13px">Needs OUR reply — ' + oursN +
      ' <span style="color:var(--text-3);font-weight:600">· plus ' + (open.length - oursN) +
      ' waiting on the buyer or the post</span></h3>' +
      '<div class="scroll"><table class="cd-tbl"><thead><tr><th>Kind</th><th>Account</th><th>Item / buyer</th><th>What eBay records</th><th>Status</th><th>Respond by</th><th></th></tr></thead><tbody>';
    if (!open.length) { h += '<tr><td colspan="7" style="color:var(--ok);font-weight:800">✓ Nothing open — every case, return and inquiry is closed.</td></tr>'; }
    var cdLastMove = null;
    open.forEach(function (r) {
      var due = cdDue(r.payload_json);
      var kind = cdStr(r.kind);
      var writable = (kind === 'RETURN' || kind === 'INR') && !/REFUND_SENT/i.test(cdStr(r.status));
      var keyAttr = esc(cdStr(r.case_id)).replace(/"/g, '&quot;');
      if (cdLastMove === 1 && !r.our_move) {
        h += '<tr><td colspan="7" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;padding:10px 12px 4px">Waiting on the buyer or the post — nothing to do yet</td></tr>';
      }
      cdLastMove = r.our_move ? 1 : 0;
      h += '<tr' + (r.our_move ? '' : ' style="opacity:.55"') + '><td><span class="cd-kind ' + esc(kind) + '">' + esc(kind) + '</span></td>' +
        '<td>' + esc(cdStr(r.account)) + '</td>' +
        '<td><span class="mono">' + esc(cdStr(r.item_id)) + '</span><div style="font-size:11px;color:var(--text-3)">' + esc(cdStr(r.buyer)) + '</div></td>' +
        '<td style="max-width:340px">' + esc(cdStr(r.reason)) + '</td>' +
        '<td>' + esc(cdStr(r.status)) + '</td>' +
        '<td class="cd-due ' + cdDueCls(due) + '">' + (due ? esc(due) : '—') + '</td>' +
        '<td style="white-space:nowrap">' + (writable
          ? '<button class="minibtn" data-cd-reply="' + keyAttr + '">Reply</button> <button class="minibtn" data-cd-refund="' + keyAttr + '">Refund</button>'
          : '<span style="font-size:10.5px;color:var(--text-3)">on eBay</span>') + '</td></tr>';
    });
    h += '</tbody></table></div>';

    var msgs = (d && d.messages) || [];
    h += '<h3 style="margin:16px 0 6px;font-size:13px">Unread buyer messages — ' + msgs.length + ' <span style="font-size:10.5px;color:var(--text-3);font-weight:600">(eBay reports read state, not replies — read it and it leaves this list)</span></h3>';
    if (msgs.length) {
      h += '<div class="scroll"><table class="cd-tbl"><thead><tr><th>Account</th><th>Buyer</th><th>Subject</th><th>Received</th></tr></thead><tbody>';
      msgs.slice(0, 50).forEach(function (m) {
        h += '<tr><td>' + esc(cdStr(m.account)) + '</td><td>' + esc(cdStr(m.buyer)) + '</td>' +
          '<td style="max-width:420px">' + esc(cdStr(m.text)) + '</td>' +
          '<td style="white-space:nowrap">' + esc(cdStr(m.received_at).slice(0, 10)) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    } else {
      h += '<p style="color:var(--ok);font-weight:800;font-size:12.5px">✓ Inbox answered.</p>';
    }

    var stds = (d && d.standards) || [];
    h += '<div class="cd-grid">';
    stds.forEach(function (s) {
      var lvl = '', defect = '', prog = [];
      try { prog = JSON.parse(s.json || '[]'); } catch (e) { prog = []; }
      var p0 = prog[0] || {};
      lvl = cdStr(p0.standardsLevel);
      (p0.metrics || []).forEach(function (m) {
        if (cdStr(m.metricKey) === 'DEFECTIVE_TRANSACTION_RATE' && m.value) { defect = cdStr(m.value.value) + '%'; }
      });
      var cls = /TOP/i.test(lvl) ? 'top' : /ABOVE/i.test(lvl) ? 'above' : 'below';
      h += '<div class="cd-mini"><div class="t">' + esc(cdStr(s.account)) + '</div>' +
        '<div class="cd-row"><span>eBay verdict</span><span class="cd-std ' + cls + '">' + esc(lvl || '—') + '</span></div>' +
        (defect ? '<div class="cd-row"><span>Defect rate</span><span class="cd-std">' + esc(defect) + '</span></div>' : '') +
        '<div class="cd-row"><span>Checked</span><span style="color:var(--text-3)">' + esc(cdStr(s.synced_at).slice(0, 16)) + '</span></div></div>';
    });
    h += '</div>';

    box.innerHTML = h;
    cdAutoMsgs();
  }

  /* The auto-message switchboard (§9-D): CS owns it — per account, per trigger: on/off,
   * template, delay. SHADOW until Management arms AUTOMSG_LIVE; the banner says which. */
  var CD_AM = null;

  function cdAutoMsgs() {
    var host = $('cdAuto');
    if (!host) { return; }
    api('autoMsgConfig', {}).then(function (d) {
      CD_AM = d || {};
      cdAutoPaint();
    }).catch(function () { host.innerHTML = ''; });
  }

  function cdAutoPaint() {
    var host = $('cdAuto');
    if (!host || !CD_AM) { return; }
    var d = CD_AM;
    var accs = d.accounts || [];
    var sel = $('cdAmAcc');
    var acct = (sel && sel.value) || accs[0] || '';
    var byKind = {};
    (d.rows || []).forEach(function (r) { if (r.account === acct) { byKind[r.trigger_kind] = r; } });
    var labels = { shipped: 'Order shipped', arrived: 'Order arrived', return_opened: 'Return opened',
      neg_fb: 'Negative feedback', pos_fb: 'Positive feedback', buyer_query: 'Buyer query received' };
    var h = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' +
      '<b style="font-size:13px">Auto-messages</b>' +
      '<span class="pill ' + (d.live ? 'rc-p-warn' : '') + '" style="font-size:10px;font-weight:800">' + (d.live ? 'LIVE — enabled triggers SEND' : 'SHADOW — records, never sends') + '</span>' +
      '<select class="alx-sel" id="cdAmAcc" style="margin-left:auto">' + accs.map(function (a) {
        return '<option' + (a === acct ? ' selected' : '') + '>' + esc(a) + '</option>';
      }).join('') + '</select></div>';
    h += '<div class="scroll"><table class="cd-tbl" style="min-width:640px"><thead><tr><th>Trigger</th><th>On</th><th>Delay (min)</th><th>Template — {{buyer}} {{item}} {{order}}</th><th></th></tr></thead><tbody>';
    (d.triggers || []).forEach(function (k) {
      var r = byKind[k] || { enabled: 0, delay_min: 0, template: '' };
      h += '<tr data-cd-amrow="' + esc(k) + '">' +
        '<td style="font-weight:700;white-space:nowrap">' + esc(labels[k] || k) + (k === 'arrived' ? '<div style="font-size:10px;color:var(--text-3)">fires when eBay\'s delivery estimate passes</div>' : '') + '</td>' +
        '<td><input type="checkbox" data-am-on ' + (Number(r.enabled) ? 'checked' : '') + '></td>' +
        '<td><input type="number" data-am-delay value="' + (Number(r.delay_min) || 0) + '" min="0" max="1440" style="width:70px" class="rc-in"></td>' +
        '<td><input type="text" data-am-tpl value="' + esc(cdStr(r.template)).replace(/"/g, '&quot;') + '" placeholder="Hi {{buyer}}, …" style="width:100%" class="rc-in"></td>' +
        '<td><button class="minibtn" data-am-save>Save</button></td></tr>';
    });
    h += '</tbody></table></div>';

    var q = d.queue || [];
    if (q.length) {
      h += '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;font-weight:700">Last ' + q.length + ' queued message(s) — what the engine did or would do</summary><div style="margin-top:6px">';
      q.forEach(function (x) {
        h += '<div style="padding:4px 0;border-bottom:1px solid var(--gold-line);font-size:12px">' +
          '<b>' + esc(cdStr(x.status)) + '</b> · ' + esc(cdStr(x.account)) + ' · ' + esc(cdStr(x.trigger_kind)) + ' → ' + esc(cdStr(x.buyer)) +
          ' · “' + esc(cdStr(x.body).slice(0, 90)) + '”' + (cdStr(x.detail) ? ' · <span style="color:var(--text-3)">' + esc(cdStr(x.detail)) + '</span>' : '') + '</div>';
      });
      h += '</div></details>';
    }
    host.innerHTML = h;
    var s2 = $('cdAmAcc');
    if (s2) { s2.onchange = cdAutoPaint; }
  }

  function cdLoad() {
    var box = $('cdBody');
    if (!box) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('csDesk', {}) : null;
    if (had) { try { cdPaint(had); } catch (e) { had = null; } }
    if (!had) { box.innerHTML = '<div class="spinner"></div>'; }
    cdFetch().then(cdPaint).catch(function (e) {
      if (had) { toast('Showing the last picture — could not refresh just now.'); return; }
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:18px 0">Could not load the live desk.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:5px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.csDesk = {
    label: 'CS live desk',
    order: 12,
    roles: ['Management', 'Ops Head', 'CS'],
    icon: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3l-9 9"/><path d="M15 3h6v6"/>',
    prefetch: function () { return cdFetch(); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>CS <span class="goldtext">live desk</span></h1>' +
          '<span class="sub">Straight from eBay every hour · violations checked every 5 minutes · respond-by clocks first</span>' +
          '<button class="minibtn" id="cdRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="card enter d2"><div class="bd"><div id="cdBody"><div class="spinner"></div></div></div></div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="bd"><div id="cdAuto"></div></div></div>';
    },
    init: function () {
      var rf = $('cdRefresh');
      if (rf) { rf.onclick = cdLoad; }
      var body = $('cdBody');
      if (body) {
        body.onclick = function (ev) {
          var t = ev.target;
          var a = t && t.closest ? t.closest('[data-cd-ack]') : null;
          if (a) {
            ev.preventDefault();
            api('ackViolation', { id: a.getAttribute('data-cd-ack') }).then(function () {
              toast('Marked as seen under your name.');
              cdLoad();
            }).catch(function (e) { toast(e.message || 'Could not mark it.'); });
            return;
          }
          var rp = t && t.closest ? t.closest('[data-cd-reply]') : null;
          if (rp) {
            var msg = window.prompt('Message to the buyer (goes on the eBay thread under the account):');
            if (!msg || !msg.trim()) { return; }
            rp.disabled = true;
            api('csReply', { case_key: rp.getAttribute('data-cd-reply'), message: msg }).then(function (res) {
              rp.disabled = false;
              toast(res && res.shadow ? 'Shadow — recorded, nothing sent: ' + (res.would_do || '') : 'Reply sent on the eBay thread.');
            }).catch(function (e) { rp.disabled = false; toast(e.message || 'Could not send it.'); });
            return;
          }
          var rf = t && t.closest ? t.closest('[data-cd-refund]') : null;
          if (rf) {
            if (!window.confirm('Issue the FULL refund on ' + rf.getAttribute('data-cd-refund') + '? This moves money when live.')) { return; }
            rf.disabled = true;
            api('csRefund', { case_key: rf.getAttribute('data-cd-refund') }).then(function (res) {
              if (res && res.shadow) {
                rf.disabled = false;
                toast('Shadow — recorded, no money moved: ' + (res.would_do || ''));
                return;
              }
              // money moved: kill the row's buttons in place — never re-arm from a stale paint
              var cell = rf.parentElement;
              if (cell) { cell.innerHTML = '<span style="font-size:10.5px;color:var(--ok);font-weight:800">refund sent ✓</span>'; }
              toast('Refund issued.');
            }).catch(function (e) { rf.disabled = false; toast(e.message || 'Could not refund.'); });
          }
        };
      }
      var auto = $('cdAuto');
      if (auto) {
        auto.onclick = function (ev) {
          var b = ev.target && ev.target.closest ? ev.target.closest('[data-am-save]') : null;
          if (!b) { return; }
          var tr = b.closest('[data-cd-amrow]');
          var sel = $('cdAmAcc');
          if (!tr || !sel) { return; }
          b.textContent = '…';
          api('autoMsgSet', {
            account: sel.value,
            trigger_kind: tr.getAttribute('data-cd-amrow'),
            enabled: tr.querySelector('[data-am-on]').checked,
            delay_min: tr.querySelector('[data-am-delay]').value,
            template: tr.querySelector('[data-am-tpl]').value,
          }).then(function (res) {
            b.textContent = 'Save';
            toast('Saved — ' + (res.enabled ? 'ON' : 'OFF') + ' for ' + res.account + '.');
            cdAutoMsgs();
          }).catch(function (e) {
            b.textContent = 'Save';
            toast(e.message || 'Could not save.');
          });
        };
      }
      cdLoad();
    }
  };
})();
