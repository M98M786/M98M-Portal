/* view-adtool-pulse.js — Advertising · Price automation (owner, 22 Nov 2026).
 *
 * The peak-time penny pulse: the listings in the Dynamic and General (cost-per-sale) campaigns take
 * a 10p cut at the start of peak time, a quarter of them an evening on a four-day wheel; twenty
 * minutes after any price move the listing is put back into the campaign eBay dropped it from; next
 * morning the price goes back up and the re-add runs again. Only a listing whose own thirty days
 * say it can afford the cut takes it, and the reason is written on every refusal.
 *
 * SHADOW MODE, said at the top of the page and in every row: this build decides and stamps every
 * step and sends NOTHING to eBay. The engine refuses a live config row out loud; there is no live
 * switch on this page at all.
 *
 * Read-mostly: the two writes are the five settings (Management / Ops Head, clamped server-side)
 * and Run now, which deals the plan without waiting for the five-minute slot — both shadow-safe.
 * Galaxy tokens only, gold the accent, #e0563f the loss colour. Engine actions: adtoolPulse,
 * adtoolPulseSet, adtoolPulseRun. Own class prefix: .ppl-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';

  VIEW_CSS.push([
    '.ppl-wrap{max-width:1420px}',
    '.ppl-banner{background:var(--panel);border:1px solid var(--gold-b);border-radius:14px;padding:12px 16px;margin:0 0 12px;font-size:13px;color:var(--text);line-height:1.6}',
    '.ppl-banner b{color:var(--gold-a)}',
    '.ppl-law{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:12px 16px;margin:0 0 12px;font-size:12.5px;color:var(--text-2);line-height:1.65}',
    '.ppl-law b{color:var(--text)}',
    '.ppl-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px}',
    '.ppl-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.ppl-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.ppl-chip .n{opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}',
    '.ppl-btn{background:var(--panel);border:1px solid var(--gold-line);color:var(--text-2);border-radius:8px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer}',
    '.ppl-btn:hover{color:var(--gold-a)}',
    '.ppl-btn.go{background:var(--gold-b);border-color:var(--gold-b);color:var(--gold-ink);font-weight:800}',
    '.ppl-row input[type=date]{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:5px 8px}',
    '.ppl-wheel{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:0 0 12px}',
    '.ppl-cohort{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:12px 14px}',
    '.ppl-cohort.on{border-color:var(--gold-b)}',
    '.ppl-cohort .t{font-size:12px;color:var(--text-3);font-weight:700}',
    '.ppl-cohort .v{font-size:22px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;margin:2px 0}',
    '.ppl-cohort .w{font-size:11.5px;color:var(--text-2)}',
    '.ppl-cohort.on .w{color:var(--gold-a);font-weight:800}',
    '.ppl-set{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:12px 14px;margin:0 0 12px}',
    '.ppl-set .f{display:flex;flex-direction:column;gap:4px}',
    '.ppl-set label{font-size:11px;color:var(--text-3);font-weight:700}',
    '.ppl-set input{width:92px;background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12.5px;padding:5px 8px}',
    '.ppl-set .note{font-size:11.5px;color:var(--text-3);flex-basis:100%;line-height:1.5}',
    '.ppl-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.ppl-panel h3{margin:0 0 8px;font-size:14px;font-weight:800;color:var(--text)}',
    '.ppl-sub{font-size:12px;color:var(--text-3);margin:0 0 8px;line-height:1.5}',
    '.ppl-tblwrap{overflow-x:auto}',
    '.ppl-tbl{width:100%;border-collapse:collapse;font-size:12px}',
    '.ppl-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);text-align:left;padding:6px 10px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.ppl-tbl td{padding:6px 10px;border-bottom:1px solid var(--line);color:var(--text-2);vertical-align:top}',
    '.ppl-tbl td.num{font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.ppl-tbl .id{color:var(--gold-a);font-weight:700;white-space:nowrap}',
    '.ppl-skip{color:' + LOSS + ';font-weight:700}',
    '.ppl-ok{color:var(--gold-a);font-weight:700}',
    '.ppl-step{display:inline-block;background:var(--bg0);border:1px solid var(--gold-line);border-radius:99px;padding:1px 9px;font-size:11px;font-weight:700;color:var(--text-2);white-space:nowrap}',
    '.ppl-stamp{color:var(--text-3);font-size:11px;white-space:nowrap}',
    '.ppl-warn{background:var(--panel);border:1px solid var(--gold-line);border-left:3px solid ' + LOSS + ';border-radius:14px;padding:12px 16px;margin-bottom:12px;font-size:12.5px;color:var(--text-2);line-height:1.65}',
    '.ppl-empty{padding:28px;text-align:center;color:var(--text-3);font-size:13px}',
  ].join('\n'));

  var S = { day: '', account: '', D: null, busy: false, err: '' };

  function money(v) { return v == null ? '—' : '£' + Number(v).toFixed(2); }
  function ukClock(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
    } catch (e) { return String(iso).slice(11, 16); }
  }
  function cfgOf() { return (S.D && S.D.cfg) || {}; }

  VIEWS.adtoolPulse = {
    /* 26 Nov (owner): named for what it drives */
    label: 'Dynamic Listings Price automation',
    /* hidden here, carried by the /ads/ sidebar and the owner's pinned group — the same second-link
       road adtoolItemCampaigns and Product history already ride */
    hidden: true, order: 95, roles: ROLES,
    icon: '<path d="M12 3v18"/><path d="M8 7h5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/><path d="M4 12h2M18 12h2"/>',
    render: function () {
      return '<div class="ppl-wrap">' +
        adtHgroup('Dynamic Listings Price automation', 'The peak-time 10p pulse on the Dynamic and General listings', 'pplFresh') +
        '<div id="pplBanner"></div>' +
        '<div id="pplLaw"></div>' +
        '<div id="pplSet"></div>' +
        '<div id="pplWheel"></div>' +
        '<div id="pplBar" class="ppl-row"></div>' +
        '<div id="pplBody"><div class="ppl-empty">Loading…</div></div></div>';
    },
    init: function () {
      S.day = ''; S.account = ''; S.D = null; S.err = '';
      load(false);
      adtPoll('pplBody', 120000, function () { return load(true); });
    }
  };

  function load(quiet) {
    if (S.busy) return Promise.resolve();
    S.busy = true;
    var p = {};
    if (S.day) p.day = S.day;
    if (S.account) p.account = S.account;
    return api('adtoolPulse', p).then(function (D) {
      S.busy = false; S.D = D || {}; S.err = '';
      draw();
    }).catch(function (e) {
      S.busy = false; S.err = (e && e.message) || 'This page could not load.';
      if (!quiet) draw();
      throw e;
    });
  }

  function save(key, el) {
    var v = Number(el.value);
    api('adtoolPulseSet', { key: key, value: v }).then(function () { S.D = null; return load(false); })
      .catch(function (e) { alert((e && e.message) || 'The setting was not saved.'); });
  }

  function runNow(btn) {
    btn.disabled = true; btn.textContent = 'Running…';
    api('adtoolPulseRun', {}).then(function () { S.D = null; return load(false); })
      .catch(function (e) { alert((e && e.message) || 'The job did not run.'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Run now'; });
  }

  function draw() {
    var D = S.D;
    var fr = $('pplFresh'); if (fr && D) fr.textContent = 'updated ' + ukClock(D.computed_at) + ' · every 2 min · job every 5 min';
    var bn = $('pplBanner');
    if (bn) {
      /* 24 Nov (owner): "make dynamic listings automation live". The banner now says which it is,
         and when it is live it names the accounts actually sending — a page that still said shadow
         while prices moved would be the worst screen in the portal. */
      var liveFor = (D && D.accounts_live) || [];
      bn.innerHTML = D && D.shadow === false
        ? '<div class="ppl-banner"><b>Live.</b> The evening cut, the re-add, the morning restore and its re-add are <b>sent to eBay</b> for ' +
          '<b>' + esc(liveFor.join(', ')) + '</b>. Listings sitting in a sale event are left alone. A step is only marked done once eBay has accepted it; ' +
          'anything refused is tried again on the next five-minute tick, and a price that has been cut keeps trying until it is back.</div>'
        : '<div class="ppl-banner"><b>Shadow mode.</b> Every step below is decided on the clock and written down, ' +
          'and <b>nothing is sent to eBay</b> — no price changes, no campaign changes.' +
          (liveFor.length ? '' : ' No account has its switch on.') + '</div>';
    }
    var cfg = cfgOf();
    var lw = $('pplLaw');
    if (lw && D) {
      lw.innerHTML = '<div class="ppl-law"><b>The law of the page.</b> Each evening at <b>' + esc(String(cfg.start_hour)) + ':00 UK</b> a quarter of the Dynamic/General listings — ' +
        'tonight\'s turn of a four-day wheel — takes a <b>' + money(cfg.amount) + '</b> price cut, but only a listing whose last 30 days leave at least ' +
        '<b>' + money(cfg.min_unit_profit) + '</b> profit per unit <i>after</i> the cut. A price change drops the listing out of its Dynamic campaign, so ' +
        '<b>' + esc(String(cfg.readd_min)) + ' minutes</b> after any price move the listing is put back into the campaign it came from. Next morning at ' +
        '<b>' + esc(String(cfg.restore_hour)) + ':00 UK</b> the price goes back to what it was, and the re-add runs once more. A listing runs once in four days, never more often.</div>';
    }
    var st = $('pplSet');
    if (st && D) {
      st.innerHTML = '<div class="ppl-set">' +
        fld('amount', 'Cut (£)', cfg.amount) + fld('start_hour', 'Peak start (UK hour)', cfg.start_hour) +
        fld('restore_hour', 'Restore (UK hour)', cfg.restore_hour) + fld('readd_min', 'Re-add after (min)', cfg.readd_min) +
        fld('min_unit_profit', 'Profit floor (£/unit)', cfg.min_unit_profit) +
        '<button class="ppl-btn go" id="pplRun">Run now</button>' +
        '<div class="note">Settings are Management / Ops Head only and clamped to sane bands by the engine. Run now deals tonight\'s plan without waiting for the five-minute slot — still shadow, still nothing sent.</div>' +
        '</div>';
      var ks = st.querySelectorAll('[data-pplk]');
      for (var i = 0; i < ks.length; i++) ks[i].onchange = function () { save(this.getAttribute('data-pplk'), this); };
      var rb = $('pplRun'); if (rb) rb.onclick = function () { runNow(rb); };
    }
    var wh = $('pplWheel');
    if (wh && D && D.wheel) {
      wh.innerHTML = '<div class="ppl-wheel">' + D.wheel.map(function (c) {
        var on = c.days_away === 0;
        return '<div class="ppl-cohort' + (on ? ' on' : '') + '"><div class="t">Cohort ' + (c.cohort + 1) + ' of 4</div>' +
          '<div class="v">' + c.members + '</div>' +
          '<div class="w">' + (on ? 'runs TONIGHT' : 'runs ' + esc(c.runs_on) + ' (in ' + c.days_away + (c.days_away === 1 ? ' day' : ' days') + ')') + '</div></div>';
      }).join('') + '</div>';
    }
    drawBar();
    drawBody();
  }

  function fld(key, label, val) {
    return '<div class="f"><label>' + esc(label) + '</label><input type="number" step="any" data-pplk="' + key + '" value="' + esc(String(val == null ? '' : val)) + '"></div>';
  }

  function drawBar() {
    var el = $('pplBar'); if (!el) return;
    var D = S.D || {};
    var shown = (D.day || S.day || adtUkDay());
    var h = '<input type="date" id="pplDate" value="' + esc(shown) + '" max="' + esc(adtUkDay()) + '">' +
      '<button class="ppl-btn" id="pplToday">Today</button>';
    var accts = D.accounts || [];
    for (var i = 0; i < accts.length; i++) {
      var a = accts[i];
      h += '<button class="ppl-chip' + (S.account === a.account ? ' on' : '') + '" data-pplacct="' + esc(a.account) + '">' + esc(a.account) + '<span class="n">' + a.members + '</span></button>';
    }
    el.innerHTML = h;
    var d = $('pplDate'); if (d) d.onchange = function () { S.day = this.value || ''; S.D = null; load(false); };
    var t = $('pplToday'); if (t) t.onclick = function () { S.day = ''; S.D = null; load(false); };
    var cs = el.querySelectorAll('[data-pplacct]');
    for (var j = 0; j < cs.length; j++) cs[j].onclick = function () {
      var a = this.getAttribute('data-pplacct') || '';
      S.account = S.account === a ? '' : a; S.D = null; load(false);
    };
  }

  function drawBody() {
    var box = $('pplBody'); if (!box) return;
    if (S.err && !S.D) { box.innerHTML = '<div class="ppl-panel"><h3>Not available</h3><div class="ppl-sub">' + esc(S.err) + '</div></div>'; return; }
    var D = S.D; if (!D) { box.innerHTML = '<div class="ppl-empty">Loading…</div>'; return; }
    var h = '';

    var steps = D.steps || {};
    var stepNames = [['planned', 'waiting for the cut'], ['skipped', 'cannot afford it'], ['cut', 'price down, waiting to re-add'], ['readded', 'back in its campaign'], ['restored', 'price back up'], ['done', 'finished'], ['lapsed', 'evening passed, nothing stamped']];
    h += '<div class="ppl-panel"><h3>' + esc(D.day) + ' — cohort ' + (Number(D.day_index) + 1) + ' of 4</h3>' +
      '<div class="ppl-sub">' + (D.rows && D.rows.length ? D.rows.length + ' listings dealt on this day. The plan is dealt at the start hour; a day opened before then is empty, and that is the truth rather than a fault.' : 'No plan has been dealt for this day' + (D.day === D.today ? ' yet — it is dealt at ' + esc(String(cfgOf().start_hour)) + ':00 UK, or with Run now.' : '.')) + '</div>' +
      '<div class="ppl-row">' + stepNames.map(function (sn) {
        return steps[sn[0]] ? '<span class="ppl-chip">' + esc(sn[0]) + ' · ' + esc(sn[1]) + '<span class="n">' + steps[sn[0]] + '</span></span>' : '';
      }).join('') + '</div></div>';

    var reasons = D.reasons || [];
    if (reasons.length) {
      h += '<div class="ppl-panel"><h3>Why listings were refused the cut</h3><div class="ppl-tblwrap"><table class="ppl-tbl"><tr><th>Reason</th><th>Listings</th></tr>' +
        reasons.map(function (r) { return '<tr><td>' + esc(r.reason) + '</td><td class="num">' + r.listings + '</td></tr>'; }).join('') +
        '</table></div></div>';
    }

    var rows = D.rows || [];
    if (rows.length) {
      var shownRows = rows.slice(0, 400);
      h += '<div class="ppl-panel"><h3>The listings, one by one</h3><div class="ppl-tblwrap"><table class="ppl-tbl">' +
        '<tr><th>Item</th><th>Title</th><th>Account</th><th>Campaign</th><th>Price</th><th>Cut to</th><th>Profit/unit 30d</th><th>Units 30d</th><th>Plan</th><th>Steps (UK time)</th></tr>' +
        shownRows.map(function (r) {
          var stamps = [];
          if (r.cut_at) stamps.push('cut ' + ukClock(r.cut_at));
          if (r.readd_at) stamps.push('re-add ' + ukClock(r.readd_at));
          if (r.restored_at) stamps.push('restored ' + ukClock(r.restored_at));
          if (r.done_at) stamps.push('re-add ' + ukClock(r.done_at));
          return '<tr><td class="id">' + esc(r.item_id) + '</td><td>' + esc(r.title || '') + '</td><td>' + esc(r.account) + '</td><td>' + esc(r.campaign_name || r.campaign_id || '') + '</td>' +
            '<td class="num">' + money(r.price) + '</td><td class="num">' + (r.new_price == null ? '—' : money(r.new_price)) + '</td>' +
            '<td class="num">' + (r.unit_profit_30d == null ? '—' : money(r.unit_profit_30d)) + '</td><td class="num">' + (r.units_30d == null ? '—' : r.units_30d) + '</td>' +
            '<td>' + (Number(r.eligible) ? '<span class="ppl-ok">takes the cut</span>' : '<span class="ppl-skip">' + esc(r.reason || 'refused') + '</span>') + '</td>' +
            '<td><span class="ppl-step">' + esc(r.step) + '</span> <span class="ppl-stamp">' + esc(stamps.join(' · ')) + '</span></td></tr>';
        }).join('') +
        '</table></div>' + (rows.length > shownRows.length ? '<div class="ppl-sub">Showing 400 of ' + rows.length + '.</div>' : '') + '</div>';
    }

    var hist = D.hist || [];
    if (hist.length) {
      h += '<div class="ppl-panel"><h3>The last days</h3><div class="ppl-tblwrap"><table class="ppl-tbl">' +
        '<tr><th>Day</th><th>Dealt</th><th>Took the cut</th><th>Finished</th><th>Lapsed</th></tr>' +
        hist.map(function (r) {
          return '<tr><td>' + esc(r.day) + '</td><td class="num">' + (r.listings || 0) + '</td><td class="num">' + (r.eligible || 0) + '</td><td class="num">' + (r.done || 0) + '</td><td class="num">' + (r.lapsed || 0) + '</td></tr>';
        }).join('') + '</table></div></div>';
    }

    (D.warnings || []).forEach(function (w) { h += '<div class="ppl-warn">' + esc(w) + '</div>'; });
    box.innerHTML = h;
  }
})();
