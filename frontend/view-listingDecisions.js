/* view-listingDecisions.js — the 7-day zero-sale decision board (Hasib item 12), rebuilt 3 Sept
 * to the approved design: a summary strip, sortable rows with the product photo, age, stock and
 * ADVERTISED state (a zero-sale listing that was never advertised usually just needs ads, not
 * ending), and the End / Revise / Keep decision. Management decides; a listing manager sees only
 * their own revise jobs. Data: zeroSaleList (D1). */
(function () {

  var LD_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Listing Manager', 'Item Lister'];
  var LD = { listers: [], rows: [], sort: 'old', canDecide: false, note: '' };
  var LD_ICON = { case: '📱', phone: '📱', light: '💡', lamp: '💡', led: '💡', charger: '🔌', usb: '🔌',
    wallet: '👛', sock: '🧦', wipe: '🧻', towel: '🧻', watch: '⌚', torch: '🔦', cable: '🔌', def: '📦' };

  VIEW_CSS.push(
    '.ld-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}' +
    '.ld-st{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);position:relative;overflow:hidden}' +
    '.ld-st::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tone,var(--gold-a))}' +
    '.ld-st .l{font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}' +
    '.ld-st .v{font-size:22px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}' +
    '.ld-st .s{font-size:10.5px;color:var(--text-3);font-weight:600}' +
    '.ld-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}' +
    '.ld-chips{display:flex;gap:4px;background:var(--panel-2);border:1px solid var(--gold-line);border-radius:11px;padding:4px}' +
    '.ld-chip{border:0;background:transparent;color:var(--text-2);font:inherit;font-weight:700;font-size:12px;padding:6px 11px;border-radius:8px;cursor:pointer}' +
    '.ld-chip.on{background:var(--gold-b,var(--gold-a));color:#1a1205}' +
    '.ld-row{display:grid;grid-template-columns:56px 1fr auto;gap:14px;align-items:center;border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);margin-bottom:10px;border-left:3px solid var(--flag,transparent)}' +
    '.ld-thumb{width:56px;height:56px;border-radius:9px;background:var(--panel);border:1px solid var(--gold-line);display:grid;place-items:center;font-size:24px;overflow:hidden}' +
    '.ld-thumb img{width:100%;height:100%;object-fit:cover}' +
    '.ld-mid{min-width:0}' +
    '.ld-title{font-weight:700;font-size:13.5px;line-height:1.3}.ld-title a{color:inherit}' +
    '.ld-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
    '.ld-b{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--panel);color:var(--text-2);border:1px solid var(--gold-line);white-space:nowrap}' +
    '.ld-b.age{color:var(--gold-a)}.ld-b.age.hot{color:#f08d8f;border-color:rgba(229,89,92,.4)}' +
    '.ld-b.zero{color:#8dc6f2}.ld-b.ads{color:#78d3a6;border-color:rgba(79,192,141,.3)}' +
    '.ld-b.noads{color:#f0b46a;border-color:rgba(232,161,90,.45);background:rgba(232,161,90,.1)}' +
    '.ld-meta{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:5px}' +
    '.ld-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}' +
    '.ld-done{font-size:11px;font-weight:800}' +
    '.ld-done.END{color:var(--bad)}.ld-done.REVISE{color:var(--gold-a)}.ld-done.KEEP{color:var(--ok,#5fbf7a)}' +
    '@media(max-width:720px){.ld-row{grid-template-columns:48px 1fr}.ld-acts{grid-column:1/-1;justify-content:flex-start}}'
  );

  function ldNum(v) { return Number(v) || 0; }
  function ldDays(r) {
    var s = String(r.start_time || r.born || '').trim();
    var t = Date.parse(s.replace(' ', 'T'));
    if (!isFinite(t)) { return null; }
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }
  function ldIcon(title) {
    var t = String(title || '').toLowerCase();
    var k = Object.keys(LD_ICON).filter(function (x) { return x !== 'def' && t.indexOf(x) >= 0; })[0];
    return LD_ICON[k] || LD_ICON.def;
  }
  function ldAds(r) {
    if (ldNum(r.ad_n) <= 0) { return ['noads', 'No ads — never promoted']; }
    return ['ads', /COST_PER_CLICK/i.test(String(r.ad_model || '')) ? 'CPC advertised' : 'General campaign'];
  }

  function ldRender() {
    var box = $('ldBody');
    if (!box) { return; }
    var rows = LD.rows.slice();
    var pend = rows.filter(function (r) { return r.status === 'PENDING'; });
    /* summary */
    var oldest = 0, neverAd = 0, decidedToday = 0, today = (new Date()).toISOString().slice(0, 10);
    pend.forEach(function (r) { var dd = ldDays(r); if (dd != null && dd > oldest) { oldest = dd; } if (ldNum(r.ad_n) <= 0) { neverAd++; } });
    rows.forEach(function (r) { if (r.status !== 'PENDING' && String(r.decided_at || '').slice(0, 10) === today) { decidedToday++; } });
    var summary = '<div class="ld-summary">' +
      '<div class="ld-st" style="--tone:var(--gold-a)"><div class="l">Awaiting a decision</div><div class="v">' + pend.length + '</div><div class="s">7 days, no sale</div></div>' +
      '<div class="ld-st" style="--tone:var(--bad)"><div class="l">Oldest waiting</div><div class="v">' + (oldest || '—') + (oldest ? ' days' : '') + '</div><div class="s">every extra day costs fees</div></div>' +
      '<div class="ld-st" style="--tone:#e8a15a"><div class="l">Never advertised</div><div class="v">' + neverAd + '</div><div class="s">try ads before ending</div></div>' +
      '<div class="ld-st" style="--tone:var(--ok,#5fbf7a)"><div class="l">Decided today</div><div class="v">' + decidedToday + '</div><div class="s">end · revise · keep</div></div></div>';

    if (!pend.length && !rows.length) {
      box.innerHTML = summary + '<div style="color:var(--text-2);font-weight:700;padding:10px 0">Nothing waiting — no active listing has passed 7 days without a sale.' +
        '<span style="display:block;color:var(--text-3);font-weight:600;font-size:11.5px;margin-top:4px">' + esc(String(LD.note || '')) + '</span></div>';
      return;
    }

    /* sort */
    if (LD.sort === 'old') { rows.sort(function (a, b) { return (ldDays(b) || 0) - (ldDays(a) || 0); }); }
    else if (LD.sort === 'noads') { rows.sort(function (a, b) { return (ldNum(a.ad_n) > 0 ? 1 : 0) - (ldNum(b.ad_n) > 0 ? 1 : 0) || (ldDays(b) || 0) - (ldDays(a) || 0); }); }
    else if (LD.sort === 'acct') { rows.sort(function (a, b) { return String(a.account).localeCompare(String(b.account)); }); }
    /* pending always above decided */
    rows.sort(function (a, b) { return (a.status === 'PENDING' ? 0 : 1) - (b.status === 'PENDING' ? 0 : 1); });

    var selOpts = '<option value="">to which lister…</option>' + LD.listers.map(function (u) {
      return '<option value="' + esc(String(u.email)) + '">' + esc(String(u.name || u.email)) + '</option>';
    }).join('');

    var tools = '<div class="ld-tools"><div class="ld-chips" id="ldSort">' +
      '<button class="ld-chip' + (LD.sort === 'old' ? ' on' : '') + '" data-s="old">Oldest first</button>' +
      '<button class="ld-chip' + (LD.sort === 'noads' ? ' on' : '') + '" data-s="noads">Never advertised</button>' +
      '<button class="ld-chip' + (LD.sort === 'acct' ? ' on' : '') + '" data-s="acct">By account</button></div></div>';

    box.innerHTML = summary + tools + rows.map(function (r) {
      var isPend = r.status === 'PENDING';
      var dd = ldDays(r), hot = dd != null && dd >= 10, noads = ldNum(r.ad_n) <= 0;
      var flag = isPend ? (noads ? '#e8a15a' : (hot ? 'var(--bad)' : 'var(--gold-a)')) : 'transparent';
      var ad = ldAds(r);
      var thumb = r.image ? '<img src="' + esc(String(r.image)) + '" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + ldIcon(r.title) + '\'">' : ldIcon(r.title);
      var h = '<div class="ld-row" style="--flag:' + flag + '" data-ld="' + esc(String(r.item_id)) + '">' +
        '<div class="ld-thumb">' + thumb + '</div>' +
        '<div class="ld-mid"><div class="ld-title"><a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer">' + esc(String(r.title || r.item_id).slice(0, 90)) + '</a></div>' +
          '<div class="ld-badges">' +
            (dd != null ? '<span class="ld-b age' + (hot ? ' hot' : '') + '">' + dd + ' days live</span>' : '') +
            '<span class="ld-b zero">0 sold</span>' +
            '<span class="ld-b">£' + ldNum(r.price).toFixed(2) + '</span>' +
            (r.stock != null && r.stock !== '' ? '<span class="ld-b">' + ldNum(r.stock) + ' in stock</span>' : '') +
            '<span class="ld-b ' + ad[0] + '">' + ad[1] + '</span>' +
          '</div>' +
          '<div class="ld-meta">' + esc(String(r.account)) + ' · ' + esc(String(r.item_id)) + ' · listed ' + esc(String(r.born || r.start_time || '').slice(0, 10)) + ' (' + esc(String(r.clock || 'eBay')) + ')' +
            (r.hunter_email ? ' · hunted by ' + esc(String(r.hunter_email).split('@')[0]) : '') +
            (r.lister_email ? ' · listed by ' + esc(String(r.lister_email).split('@')[0]) : '') + '</div></div>';
      if (isPend && LD.canDecide) {
        h += '<div class="ld-acts">' +
          '<button class="minibtn" data-ld-v="END">End → Team Lead</button>' +
          '<button class="minibtn" data-ld-v="REVISE">Revise →</button>' +
          '<select class="alx-sel" data-ld-a>' + selOpts + '</select>' +
          '<button class="minibtn" data-ld-v="KEEP">Keep</button></div>';
      } else if (!isPend) {
        h += '<div class="ld-acts"><span class="ld-done ' + esc(String(r.status)) + '">' + esc(String(r.status)) + '</span>' +
          '<span class="ld-meta">by ' + esc(String(r.decided_by || '').split('@')[0]) + ' · ' + esc(String(r.decided_at || '').slice(0, 16)) +
          (r.assignee ? ' → ' + esc(String(r.assignee).split('@')[0]) : '') + '</span></div>';
      } else {
        h += '<div class="ld-acts"><span class="ld-meta">Waiting on Management</span></div>';
      }
      return h + '</div>';
    }).join('') + '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:10px">' + esc(String(LD.note || '')) + '</p>';

    var sc = $('ldSort');
    if (sc) { sc.addEventListener('click', function (e) { var b = e.target.closest('.ld-chip'); if (!b) { return; } LD.sort = b.getAttribute('data-s'); ldRender(); }); }

    box.querySelectorAll('[data-ld-v]').forEach(function (b) {
      b.onclick = function () {
        var card = this.closest('[data-ld]');
        var verdict = this.getAttribute('data-ld-v');
        var sel = card.querySelector('[data-ld-a]');
        var assignee = sel ? String(sel.value || '') : '';
        if (verdict === 'REVISE' && !assignee) { toast('Pick which lister gets the revise job'); return; }
        var itemId = card.getAttribute('data-ld');
        var row = null;
        LD.rows.forEach(function (x) { if (String(x.item_id) === itemId) { row = x; } });
        card.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        api('zeroSaleDecide', { item_id: itemId, verdict: verdict, assignee: assignee }).then(function () {
          if (verdict === 'KEEP') { toast('Kept.'); ldLoad(); return; }
          return api('decisionAct', {
            item_id: itemId, kind: verdict === 'END' ? 'end' : 'revise',
            account: row ? String(row.account || '') : '', title: row ? String(row.title || '') : '',
            assignee_email: assignee, note: '7 days live with no sale.',
          }).then(function (r2) {
            toast((verdict === 'END' ? 'End job sent to ' : 'Revision sent to ') + (String(r2 && r2.assigned_to || '').split('@')[0] || 'the team') + '.');
            ldLoad();
          }).catch(function (e2) { toast('Decision recorded, task retrying: ' + e2.message); ldLoad(); });
        }).catch(function (e) { toast(e.message); ldLoad(); });
      };
    });
  }

  function ldLoad() {
    var box = $('ldBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('zeroSaleList', {}).then(function (d) {
      d = d || {};
      LD.listers = d.listers || [];
      LD.rows = d.rows || [];
      LD.canDecide = (d.canDecide !== undefined) ? d.canDecide : d.mgmt;
      LD.note = d.note || '';
      ldRender();
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:10px 0">Could not load the board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  VIEWS.listingDecisions = {
    label: 'Listing decisions',
    order: 6.6,
    roles: LD_ROLES,
    icon: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h11"/>',
    prefetch: function () { return api('zeroSaleList', {}); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Listing <span class="goldtext">decisions</span></h1>' +
          '<span class="sub">every new listing that passed 7 days with no sale — a listing with no ads has usually never been seen, so try ads before ending</span>' +
          '<button class="minibtn" id="ldRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="ldBody" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () {
      var rf = $('ldRefresh');
      if (rf) { rf.onclick = ldLoad; }
      ldLoad();
    }
  };
})();
