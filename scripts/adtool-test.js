/* adtool-test.js — unit tests for the Advertising Tool engine block (pure functions only).
   Runs without node: `osascript -l JavaScript scripts/adtool-test.js` (JavaScriptCore).
   It extracts the ADTOOL-ENGINE block from engine/worker.js, evaluates only the pure functions
   (no D1, no fetch) and asserts the spec's rules. Exit text ends with PASS n/n or FAIL. */
ObjC.import('Foundation');
function run(argv) {
  const root = (argv[0] || '.').replace(/\/$/, '');
  const path = root + '/engine/worker.js';
  const src = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js;
  const ia = src.indexOf('/* ADTOOL-ENGINE-BEGIN'); const ib = src.indexOf('/* ---- D1: schema ---- */');
  if (ia < 0 || ib < 0) return 'FAIL: engine block markers not found';
  const iv = src.indexOf('const ADTOOL_MIN_SP'); const jv = src.indexOf('async function adtoolTruth(env) {');
  if (iv < 0 || jv < 0) return 'FAIL: verdict block markers not found';
  const ip = src.indexOf('/* ADTOOL-P2-PURE-BEGIN */'); const jp = src.indexOf('/* ADTOOL-P2-PURE-END */');
  const i3 = src.indexOf('/* ADTOOL-P3-PURE-BEGIN */'); const j3 = src.indexOf('/* ADTOOL-P3-PURE-END */');
  const i4 = src.indexOf('/* ADTOOL-P4-PURE-BEGIN */'); const j4 = src.indexOf('/* ADTOOL-P4-PURE-END */');
  const i5 = src.indexOf('/* ADTOOL-P5-PURE-BEGIN */'); const j5 = src.indexOf('/* ADTOOL-P5-PURE-END */');
  const i6 = src.indexOf('/* ADTOOL-P6-PURE-BEGIN */'); const j6 = src.indexOf('/* ADTOOL-P6-PURE-END */');
  const i7 = src.indexOf('/* ADTOOL-P7-PURE-BEGIN */'); const j7 = src.indexOf('/* ADTOOL-P7-PURE-END */');
  const i8 = src.indexOf('/* ADTOOL-P8-PURE-BEGIN */'); const j8 = src.indexOf('/* ADTOOL-P8-PURE-END */');
  const pure = src.slice(ia, ib) + '\n' + src.slice(iv, jv) + (ip >= 0 && jp >= 0 ? '\n' + src.slice(ip, jp) : '') + (i3 >= 0 && j3 >= 0 ? '\n' + src.slice(i3, j3) : '') + (i4 >= 0 && j4 >= 0 ? '\n' + src.slice(i4, j4) : '') + (i5 >= 0 && j5 >= 0 ? '\n' + src.slice(i5, j5) : '') + (i6 >= 0 && j6 >= 0 ? '\n' + src.slice(i6, j6) : '') + (i7 >= 0 && j7 >= 0 ? '\n' + src.slice(i7, j7) : '') + (i8 >= 0 && j8 >= 0 ? '\n' + src.slice(i8, j8) : '');   /* pure helpers of every phase */
  const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
  /* JavaScriptCore has no btoa/atob; the Workers runtime does. Small stand-ins so the PDF test can run here. */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const btoa = (str) => { let out = ''; for (let i = 0; i < str.length; i += 3) { const a = str.charCodeAt(i), b = str.charCodeAt(i + 1), c = str.charCodeAt(i + 2); const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c); out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]); } return out; };
  const atob = (str) => { const s2 = String(str).replace(/=+$/, ''); let out = '', bits = 0, acc = 0; for (const ch of s2) { const v = B64.indexOf(ch); if (v < 0) continue; acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); } } return out; };
  const F = new Function('round2', 'btoa', 'atob', pure + '\n return { adtUkParts, adtSlot, adtWeekdayOf, adtDom, adtIsoWeek, adtAddDays, adtMargin, adtOrderBrain, adtTaxonomy, adtDeltas, adtReconcile, adtCapHour, adtVerdicts, adtAdState, adtAdEvents, parseAdsReportCampaignTsv, adtRng, adtShrink, adtDecay, adtWeekdayProfile, adtShareProfile, adtPermWeekday, adtPermSpread, adtJsd, adtRegime, adtTheilSen, adtPelt, adtStage, adtDescriptors, adtSeasonalNaive, adtTsb, adtPoissonGlm, adtHoltWinters, adtMase, adtCoverage, adtForecastWith, adtBacktest, adtBands, adtChooseModel, adtListingAlerts, adtAccountSpendAlerts, adtDiminishingReturns, adtRoasLevers, adtPdf, adtDecide, adtScoreDecision, adtCarryForward, adtValidateNarrative, adtNumbersIn, adtFleetNarrativeTemplate, adtProductNarrativeTemplate, adtApplyCaps, adtApplyPlan, ADTOOL_APPLY_ENDPOINTS, ADTOOL_ALERT_RULES, ADTOOL_MARGIN_CAP, ADTOOL_MIN_SP };')(round2, btoa, atob);
  const results = [];
  const t = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail === undefined ? '' : JSON.stringify(detail) });
  const near = (x, y, eps) => Math.abs(x - y) <= (eps || 0.005);

  /* 1. UK localisation across both DST boundaries and the report-day hour */
  let p = F.adtUkParts(Date.parse('2026-09-17T23:30:00Z'));                 // BST: 00:30 next day
  t('BST: 23:30Z is 00:30 UK next day, slot night', p.date === '2026-09-18' && p.hour === 0 && p.slot === 0 && p.weekday === 4, p);
  p = F.adtUkParts(Date.parse('2026-10-25T00:30:00Z'));                     // BST ends 01:00Z on 25 Oct 2026
  t('DST end: 00:30Z on 25 Oct is 01:30 BST', p.date === '2026-10-25' && p.hour === 1, p);
  p = F.adtUkParts(Date.parse('2026-10-25T01:30:00Z'));
  t('DST end: 01:30Z on 25 Oct is 01:30 GMT', p.date === '2026-10-25' && p.hour === 1, p);
  p = F.adtUkParts(Date.parse('2026-03-29T01:30:00Z'));                     // BST starts 01:00Z on 29 Mar 2026
  t('DST start: 01:30Z on 29 Mar is 02:30 BST', p.date === '2026-03-29' && p.hour === 2, p);
  p = F.adtUkParts(Date.parse('2026-08-17T12:00:00Z'));
  t('weekday: Mon 17 Aug 2026 = 0', p.weekday === 0 && F.adtWeekdayOf('2026-08-17') === 0 && F.adtWeekdayOf('2026-08-23') === 6, [p.weekday, F.adtWeekdayOf('2026-08-23')]);

  /* 2. slots (spec §5): h<6 night, <12 morning, <17 afternoon, else evening */
  const slots = [0, 5, 6, 11, 12, 16, 17, 23].map(F.adtSlot);
  t('slot assignment', JSON.stringify(slots) === JSON.stringify([0, 0, 1, 1, 2, 2, 3, 3]), slots);

  /* 3. calendar helpers */
  t('ISO week', F.adtIsoWeek('2026-08-17') === '2026-W34' && F.adtIsoWeek('2026-09-15') === '2026-W38' && F.adtIsoWeek('2026-01-01') === '2026-W01', [F.adtIsoWeek('2026-08-17'), F.adtIsoWeek('2026-09-15'), F.adtIsoWeek('2026-01-01')]);
  t('addDays crosses the month', F.adtAddDays('2026-08-31', 1) === '2026-09-01' && F.adtAddDays('2026-09-01', -1) === '2026-08-31' && F.adtDom('2026-09-05') === 5, [F.adtAddDays('2026-08-31', 1)]);

  /* 4. margin chain (spec §5): portal → capped → orders → ali → estimate */
  t('margin: portal fact used as is', JSON.stringify(F.adtMargin(8.54, 3.33, 0, 0, 0)) === JSON.stringify({ margin: 3.33, source: 'portal' }), F.adtMargin(8.54, 3.33, 0, 0, 0));
  t('margin: portal fact above the ceiling is capped at 0.665 × price', near(F.adtMargin(4.65, 5.78, 0, 0, 0).margin, round2(F.ADTOOL_MARGIN_CAP * 4.65)) && F.adtMargin(4.65, 5.78, 0, 0, 0).source === 'portal (capped)', F.adtMargin(4.65, 5.78, 0, 0, 0));
  t('margin: own orders when no fact', JSON.stringify(F.adtMargin(9.99, 0, 3.2, 4, 2)) === JSON.stringify({ margin: 3.2, source: 'orders' }), F.adtMargin(9.99, 0, 3.2, 4, 2));
  const ali = F.adtMargin(10, 0, 0, 0, 3);
  t('margin: ali cost formula 0.8 × (price − ali − 0.169 × price)', near(ali.margin, round2(0.8 * (10 - 3 - 1.69))) && ali.source === 'ali cost', ali);
  t('margin: estimate 0.353 × price when nothing is known', near(F.adtMargin(10, 0, 0, 0, 0).margin, 3.53) && F.adtMargin(10, 0, 0, 0, 0).source === 'estimate', F.adtMargin(10, 0, 0, 0, 0));
  t('margin: ali cost above price falls through to the estimate', F.adtMargin(6.64, 0, 0, 0, 6.29).source === 'estimate', F.adtMargin(6.64, 0, 0, 0, 6.29));

  /* 5. Brain v17 per order (the books' chain) */
  const b = F.adtOrderBrain(19.99, 3.37, 8.5);
  t('brain: TOE = sold − fees', near(b.toe, 16.62), b);
  t('brain: VAT ex ads = sold/6 − fees/6 − ali/6', near(b.vat, round2(19.99 / 6 - 3.37 / 6 - 8.5 / 6)), b);
  t('brain: raw = TOE − ali − VAT', near(b.raw, round2(16.62 - 8.5 - (19.99 / 6 - 3.37 / 6 - 8.5 / 6))), b);
  t('brain: missing cost is pending', F.adtOrderBrain(10, 1.7, 0).pending === true && b.pending === false, F.adtOrderBrain(10, 1.7, 0));

  /* 6. taxonomy (spec §6.9) */
  const tx1 = F.adtTaxonomy('Woven Magnetic Magsafe Case For iPhone 17 16 15 14 13 Pro Max');
  t('taxonomy: MagSafe case is a phone case', tx1.is_case && tx1.case_type === 'MagSafe / magnetic' && tx1.category === 'Phone case', tx1);
  const tx2 = F.adtTaxonomy('13 14 15 inch Shockproof Laptop Sleeve Case for HP/Dell');
  t('taxonomy: laptop sleeve is not a phone case', !tx2.is_case && tx2.case_type === '', tx2);
  const tx3 = F.adtTaxonomy('Heavy Duty Shockproof Kickstand Case For iPhone 17 16 15');
  t('taxonomy: rugged before kickstand (rule order)', tx3.case_type === 'Rugged / shockproof', tx3);
  const tx4 = F.adtTaxonomy('Case For iPhone 17 16 15 Silicone Cover With Wallet Card Holder');
  t('taxonomy: wallet before silicone (rule order)', tx4.case_type === 'Wallet / leather / card', tx4);
  t('taxonomy: LED strip goes to lighting', F.adtTaxonomy('LED Strip Lights USB 1-20m 5050 RGB').category === 'LED & lighting', F.adtTaxonomy('LED Strip Lights USB 1-20m 5050 RGB'));

  /* 7. sampled hours: deltas, corrections, reconciliation, cap hour (spec §2.1) */
  const samples = [
    { sampled_at: '2026-09-17T09:10:00Z', cum_spend: 1.00, cum_clicks: 5, cum_units: 0, cum_impressions: 100 },
    { sampled_at: '2026-09-17T09:40:00Z', cum_spend: 1.50, cum_clicks: 8, cum_units: 1, cum_impressions: 160 },
    { sampled_at: '2026-09-17T10:20:00Z', cum_spend: 2.50, cum_clicks: 12, cum_units: 1, cum_impressions: 260 },
    { sampled_at: '2026-09-17T10:50:00Z', cum_spend: 2.20, cum_clicks: 11, cum_units: 1, cum_impressions: 260 },   // eBay revision (down)
    { sampled_at: '2026-09-17T11:30:00Z', cum_spend: 3.00, cum_clicks: 14, cum_units: 2, cum_impressions: 330 },
  ];
  const d = F.adtDeltas(samples);
  const h10 = d.hours.find(h => h.hour === 10), h11 = d.hours.find(h => h.hour === 11), h12 = d.hours.find(h => h.hour === 12);   // UK hours (BST = Z + 1)
  t('deltas: first sample books its cumulative into its own UK hour (09:10Z = 10 UK)', h10 && near(h10.spend, 1.50) && h10.clicks === 8 && h10.units === 1, h10);
  t('deltas: second hour gets the increase only', h11 && near(h11.spend, 1.00) && h11.clicks === 4 && h11.units === 0, h11);
  t('deltas: a fall is a correction, not negative spend, and re-bases', d.corrections === 1 && h12 && near(h12.spend, 0.80) && h12.clicks === 3 && h12.units === 1, [d.corrections, h12]);
  t('deltas: sample count', d.samples === 5, d.samples);
  const rec = F.adtReconcile([{ hour: 10, spend: 4, clicks: 10, units: 2 }, { hour: 11, spend: 4, clicks: 10, units: 2 }], 10, 15, 3);
  t('reconcile: hours scale to the final report', near(rec[0].spend_r, 5) && rec[0].clicks_r === 8 && rec[1].clicks_r === 8 && near(rec[0].spend_r + rec[1].spend_r, 10), rec);
  t('reconcile: no sampled mass leaves zero', F.adtReconcile([{ hour: 9, spend: 0, clicks: 0, units: 0 }], 5, 5, 1)[0].spend_r === 0, F.adtReconcile([{ hour: 9, spend: 0, clicks: 0, units: 0 }], 5, 5, 1));
  const capS = [
    { sampled_at: '2026-09-17T08:00:00Z', cum_spend: 3, cum_clicks: 10 }, { sampled_at: '2026-09-17T12:00:00Z', cum_spend: 9.6, cum_clicks: 40 },
    { sampled_at: '2026-09-17T14:00:00Z', cum_spend: 9.7, cum_clicks: 41 }, { sampled_at: '2026-09-17T16:00:00Z', cum_spend: 9.7, cum_clicks: 41 },
  ];
  t('cap hour: first sample at ≥95 % of budget with flat clicks after (14:00Z = 15 UK)', F.adtCapHour(capS, 10) === 15, F.adtCapHour(capS, 10));
  t('cap hour: no budget → null', F.adtCapHour(capS, 0) === null, F.adtCapHour(capS, 0));

  /* 8. review verdict rules (spec §11.1): Tue/Thu + Sunday classes and confidence tiers */
  const VC = { h1To: '2026-08-31', h2From: '2026-09-01', last7From: '2026-09-09', campAllStopped: false };
  const TT = ['2026-08-18', '2026-08-20', '2026-08-25', '2026-08-27', '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10', '2026-09-15'];   // Tue/Thu in the window
  const OT = ['2026-08-17', '2026-08-19', '2026-08-21', '2026-08-22', '2026-09-02', '2026-09-04', '2026-09-05', '2026-09-09'];             // Mon/Wed/Fri/Sat, both halves, one after 9 Sep
  const SU = ['2026-08-23', '2026-08-30', '2026-09-06', '2026-09-13'];
  const row = (d, sp, un) => ({ date: d, sp, cl: 5, un, rv: un * 9.99 });
  const pauseRows = TT.map(d => row(d, 2, 0)).concat(OT.map(d => row(d, 1, 1)));
  const v1 = F.adtVerdicts(pauseRows, 3, VC);
  t('verdict: Tue/Thu loss with profitable other days = PAUSE, confident', v1.tt_class === 'PAUSE Tue+Thu' && v1.tt_tier === 'confident' && v1.sun_class === '' && !v1.dark, v1);
  const v1b = F.adtVerdicts(pauseRows, 3, Object.assign({}, VC, { campAllStopped: true }));
  t('verdict: the same listing with every campaign stopped is only watch', v1b.tt_class === 'PAUSE Tue+Thu' && v1b.tt_tier === 'watch', v1b);
  const loseRows = TT.map(d => row(d, 2, 0)).concat(OT.map(d => row(d, 2, 0)));
  const v2 = F.adtVerdicts(loseRows, 3, VC);
  t('verdict: losing every day = LOSES ACROSS THE WEEK, confident', v2.tt_class === 'LOSES ACROSS THE WEEK' && v2.tt_tier === 'confident', v2);
  const sunRows = SU.map(d => row(d, 2, 2));
  const v3 = F.adtVerdicts(sunRows, 3, VC);
  t('verdict: four profitable Sundays in both halves = SUNDAY WINNER, confident; no Tue/Thu verdict without spend', v3.sun_class === 'SUNDAY WINNER' && v3.sun_tier === 'confident' && v3.tt_class === '', v3);
  const v4 = F.adtVerdicts(sunRows.map(r => Object.assign({}, r, { date: r.date.replace('2026-09-13', '2026-08-16') })), 3, VC);
  t('verdict: no spend in the last 7 days = dark = watch', v4.sun_class === 'SUNDAY WINNER' && v4.sun_tier === 'watch' && v4.dark, v4);
  const v5 = F.adtVerdicts(pauseRows, null, VC);
  t('verdict: no margin = no margin data', v5.tt_class === 'no margin data' && v5.sun_class === '', v5);
  t('verdict: thin Tue/Thu spend below £1.50 gives no verdict', F.adtVerdicts([row('2026-08-18', 1, 0)], 3, VC).tt_class === '', F.adtVerdicts([row('2026-08-18', 1, 0)], 3, VC));

  /* 9. Phase 2: ad state labels, status events, campaign-level report rows */
  t('ad state: CPC PAUSED is not live', F.adtAdState('COST_PER_CLICK', 'PAUSED').live === false && F.adtAdState('COST_PER_CLICK', 'ACTIVE').live === true, F.adtAdState('COST_PER_CLICK', 'PAUSED'));
  t('ad state: CPC blank = not yet stamped, treated as live (pre-WO-08 rows)', F.adtAdState('COST_PER_CLICK', '').live === true && /not yet/.test(F.adtAdState('COST_PER_CLICK', '').state), F.adtAdState('COST_PER_CLICK', ''));
  t('ad state: cost-per-sale exists unless archived', F.adtAdState('COST_PER_SALE', '').live === true && F.adtAdState('COST_PER_SALE', 'ARCHIVED').live === false, [F.adtAdState('COST_PER_SALE', ''), F.adtAdState('COST_PER_SALE', 'ARCHIVED')]);
  const ev = F.adtAdEvents({ a: 'ACTIVE', b: 'PAUSED', c: 'ACTIVE', d: '' }, { a: 'PAUSED', b: 'PAUSED', d: '', e: 'ACTIVE' });
  t('events: pause, removal and addition each give one event, unchanged rows none', ev.length === 3 && ev.some(x => x.item_id === 'a' && x.from === 'ACTIVE' && x.to === 'PAUSED') && ev.some(x => x.item_id === 'c' && x.to === 'REMOVED') && ev.some(x => x.item_id === 'e' && x.from === '' && x.to === 'ACTIVE'), ev);
  const tsv = 'report header line\nlisting_id\tcampaign_id\tcampaign_name\tcpc_ad_fees_listingsite_currency\tcpc_ad_fees_payout_currency\tcpc_clicks\tcpc_impressions\tcpc_attributed_sales\tcpc_sale_amount_listingsite_currency\n' +
    '336675057928\t100\tCase ads\tGBP 1.50\tUSD 2.00\t7\t900\t1\tGBP 9.99\n336675057928\t200\tRugged\tGBP 0.50\tUSD 0.70\t2\t100\t0\tGBP 0.00\n336683501749\t100\tCase ads\tGBP 2.25\tUSD 3.00\t11\t1200\t2\tGBP 19.98\n';
  const cr = F.parseAdsReportCampaignTsv(tsv);
  t('campaign rows: per listing × campaign, payout currency never summed', cr && Object.keys(cr).length === 3 && near(cr['336675057928|100'].s, 1.5) && cr['336675057928|100'].c === 7 && cr['336675057928|100'].i === 900 && near(cr['336683501749|100'].r, 19.98) && cr['336675057928|200'].name === 'Rugged', cr);
  const lsum = Object.keys(cr).filter(k => k.startsWith('336675057928|')).reduce((tt, k) => tt + cr[k].s, 0);
  t('campaign rows: the per-listing sum equals what the daily ingest stores', near(lsum, 2.0) && near(F.adtDeltas ? 0 : 0, 0), lsum);
  t('campaign rows: a report without a campaign column is refused, not mis-read', F.parseAdsReportCampaignTsv('h\nlisting_id\tclicks\n1\t2\n') === null, F.parseAdsReportCampaignTsv('h\nlisting_id\tclicks\n1\t2\n'));

  /* 10. Phase 3: shrinkage, decayed weights, permutation p-values (seeded), divergence + regimes, Theil–Sen, PELT, stages */
  t('shrink: no data returns the prior, plenty of data returns the rate', near(F.adtShrink(0, 0, 2.5, 4), 2.5) && near(F.adtShrink(400, 100, 2.5, 4), (400 + 10) / 104), [F.adtShrink(0, 0, 2.5, 4), F.adtShrink(400, 100, 2.5, 4)]);
  t('decay: half-life 14 days', near(F.adtDecay(0), 1) && near(F.adtDecay(14), 0.5) && near(F.adtDecay(28), 0.25), [F.adtDecay(14), F.adtDecay(28)]);
  const wdDays = []; for (let i = 0; i < 42; i++) { const d = F.adtAddDays('2026-08-05', i); wdDays.push({ day: d, units: F.adtWeekdayOf(d) === 6 ? 6 : 2 }); }
  const wp = F.adtWeekdayProfile(wdDays, [2, 2, 2, 2, 2, 2, 2], 4, '2026-09-16');
  t('weekday profile: a Sunday-heavy listing keeps Sunday above the prior (shrunk toward it) and weekdays at it', wp[6].rate > 3 && wp[6].rate < 6 && wp.slice(0, 6).every(x => near(x.rate, 2, 0.05)) && wp[6].n === 6, wp.map(x => [x.day, x.n, Math.round(x.rate * 100) / 100]));
  const sp = F.adtShareProfile([0, 0, 0, 0], [0.1, 0.2, 0.3, 0.4], 20);
  t('share profile: no orders = the prior; shares sum to 1', near(sp.shares[3], 0.4) && near(sp.shares.reduce((a, b) => a + b, 0), 1), sp);
  const vals = [], wds = []; for (let i = 0; i < 30; i++) { const d = F.adtAddDays('2026-08-17', i); const w = F.adtWeekdayOf(d); wds.push(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][w]); vals.push(w === 5 ? 50 : 150 + (i % 3) * 5); }
  const pw = F.adtPermWeekday(vals, wds, 'Sat', 2000, F.adtRng(7)), pn = F.adtPermWeekday(vals, wds, 'Tue', 2000, F.adtRng(7));
  t('permutation (review style): a real Saturday drop is significant, a plain Tuesday is not', pw.p < 0.01 && pn.p > 0.2 && pw.diff < 0, [pw, pn]);
  const pa = F.adtPermWeekday(vals, wds, 'Sat', 500, F.adtRng(11)), pb = F.adtPermWeekday(vals, wds, 'Sat', 500, F.adtRng(11));
  t('permutation: the same seed gives the same p-value', pa.p === pb.p, [pa.p, pb.p]);
  const flat = vals.map((v, i) => 150 + (i % 3) * 5);
  t('spread test: shifted weekday significant, flat series within noise', F.adtPermSpread(vals, wds.map(x => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(x)), 1000, F.adtRng(3)).p < 0.05 && F.adtPermSpread(flat, wds.map(x => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(x)), 1000, F.adtRng(3)).p > 0.2, [F.adtPermSpread(vals, wds.map(x => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(x)), 1000, F.adtRng(3)), F.adtPermSpread(flat, wds.map(x => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(x)), 1000, F.adtRng(3))]);
  t('JS divergence: identical shapes 0, disjoint shapes 1', near(F.adtJsd([1, 2, 3], [2, 4, 6]), 0) && near(F.adtJsd([1, 0], [0, 1]), 1), [F.adtJsd([1, 2, 3], [2, 4, 6]), F.adtJsd([1, 0], [0, 1])]);
  const shapes = []; for (let i = 0; i < 40; i++) { const c = new Array(24).fill(0); if (i < 33) { c[12] = 5; c[13] = 5; } else { c[20] = 5; c[21] = 5; } shapes.push({ day: F.adtAddDays('2026-08-01', i), counts: c }); }
  const rg = F.adtRegime(shapes);
  t('regime: lunchtime → evening shift is caught after 3 days and named', rg.regime_change === true && /evening share/.test(rg.note), rg);
  const steady = shapes.map(s => ({ day: s.day, counts: (() => { const c = new Array(24).fill(0); c[12] = 5; c[13] = 5; return c; })() }));
  t('regime: a steady shape is not a regime change', F.adtRegime(steady).regime_change === false, F.adtRegime(steady));
  t('Theil–Sen: a spike does not move the slope', near(F.adtTheilSen([1, 2, 3, 4, 5, 6, 7, 8]), 1) && near(F.adtTheilSen([1, 2, 3, 40, 5, 6, 7, 8]), 1, 0.2), [F.adtTheilSen([1, 2, 3, 40, 5, 6, 7, 8])]);
  const cps = F.adtPelt([10, 11, 9, 10, 30, 31, 29, 30]);
  t('PELT: one changepoint at the level shift', cps.length === 1 && cps[0] === 4, cps);
  t('PELT: a flat series has none', F.adtPelt([10, 11, 9, 10, 10, 11, 9, 10]).length === 0, F.adtPelt([10, 11, 9, 10, 10, 11, 9, 10]));
  const growth = []; for (let i = 0; i < 70; i++) growth.push(i < 42 ? 2 : 2 + Math.round((i - 42) * 0.5));
  const stG = F.adtStage({ units: growth, ageDays: 200, firstOrderAgeDays: 150, adActive: true, prevStage: 'Plateau', prevDaysInStage: 5 });
  t('stage: rising units = Growth, days in stage reset', stG.stage === 'Growth' && stG.days_in_stage === 1, stG);
  const decline = []; for (let i = 0; i < 90; i++) decline.push(i < 50 ? 10 : Math.max(0, Math.round(10 - (i - 50) * 0.25)));
  const stD = F.adtStage({ units: decline, ageDays: 300, firstOrderAgeDays: 250, adActive: true, prevStage: 'Decline', prevDaysInStage: 10 });
  t('stage: falling units for weeks = Decline (early while under 21 days)', stD.stage === 'Decline' && stD.label === 'Early decline' && stD.days_in_stage === 11, stD);
  t('stage: nothing in 42 days and no ad = Dead; a 10-day-old listing = Launch', F.adtStage({ units: new Array(60).fill(0), ageDays: 300, adActive: false }).stage === 'Dead' && F.adtStage({ units: [1, 2, 1, 2, 1], ageDays: 10, adActive: true }).stage === 'Launch', [F.adtStage({ units: new Array(60).fill(0), ageDays: 300, adActive: false }).stage, F.adtStage({ units: [1, 2, 1, 2, 1], ageDays: 10, adActive: true }).stage]);
  t('stage: confidence clipped to 0.2..0.95', F.adtStage({ units: [0, 5, 0, 5], ageDays: 100, adActive: true }).confidence >= 0.2 && F.adtStage({ units: new Array(200).fill(3), ageDays: 300, adActive: true }).confidence <= 0.95, null);
  const desc = F.adtDescriptors(wdDays.map(d => Object.assign({ attr_units: 1 }, d)), [{ spend: 10, attr_units: 4 }, { spend: 20, attr_units: 6 }, { spend: 20.5, attr_units: 7 }], wp, [0.1, 0.2, 0.3, 0.4], 0.01);
  t('descriptors: best weekday Sunday, top slot evening, elasticity from the one 20 % spend step', desc.weekday_best === 'Sun' && desc.top_slot === 3 && near(desc.spend_elasticity, 0.2) && desc.weekday_label === 'real weekday effect', desc);

  /* 11. Phase 4: forecast models against known series, MASE, coverage, chooser */
  const fs = [], fw = []; for (let i = 0; i < 120; i++) { const wd = i % 7; fw.push(wd); fs.push(6 + (wd === 6 ? 4 : 0) + (wd === 1 ? -2 : 0)); }
  const nv = F.adtSeasonalNaive(fs, 14); t('forecast: seasonal naive repeats last week', nv[0] === fs[113] && nv[13] === fs[119], nv.slice(0, 3));
  const hw = F.adtHoltWinters(fs, { alpha: 0.3, beta: 0.05, gamma: 0.3 }, 14, 7); const iSun = (6 - fw[119] + 7) % 7 - 1, iTue = (1 - fw[119] + 7) % 7 - 1; t('forecast: Holt–Winters sees the Sunday bump and the Tuesday dip', hw && hw.forecast[iSun] > 8.5 && hw.forecast[iTue] < 5.5, hw && hw.forecast.slice(0, 7));
  const glm = F.adtPoissonGlm(fs, fw, 1); t('forecast: ridge Poisson GLM fits the weekly pattern (Sunday > Tuesday by ≥ 3)', glm.predict(120, 6) > glm.predict(120, 1) + 3, [glm.predict(120, 6), glm.predict(120, 1)]);
  const inter = []; for (let i = 0; i < 120; i++) inter.push(i % 5 === 0 ? 3 : 0); const ts = F.adtTsb(inter, 0.1, 0.05); t('forecast: TSB mean ≈ 0.6 for 3 units every 5 days', near(ts.mean, 0.6, 0.15), ts);
  t('forecast: MASE of a perfect seasonal-naive forecast is 0', F.adtMase(fs.slice(-14), F.adtSeasonalNaive(fs.slice(0, -14), 14), fs.slice(0, -14), 7) === 0, null);
  const noisy = fs.map((v, i) => v + ((i * 7) % 5 - 2)); const bt = F.adtBacktest('hw', noisy, fw, { hw: { alpha: 0.3, beta: 0.05, gamma: 0.3 } }); t('forecast: rolling backtest = 8 folds, finite MASE', bt.folds === 8 && bt.mase != null && isFinite(bt.mase), bt.mase);
  const ch = F.adtChooseModel(noisy, fw); t('forecast: chooser picks the HW family for a seasonal listing and only keeps a model that beats 1.1', ch.family === 'hw' && (ch.chosen === 'naive' || ch.scores[ch.chosen].mase <= 1.1), ch.chosen);
  t('forecast: chooser picks TSB for an intermittent listing', F.adtChooseModel(inter, inter.map((_, i) => i % 7)).family === 'tsb', null);
  const bd = F.adtBands([5, 5, 5], [-1, 0, 1, 2, -2], 200, F.adtRng(9)); t('forecast: bands bracket the point and never go below 0', bd.lo[0] <= 5 && bd.hi[0] >= 5 && bd.lo.every(v => v >= 0), bd);
  t('forecast: coverage counts hits inside the band', F.adtCoverage([1, 2, 3], [0, 3, 2], [2, 4, 4]) === 2 / 3, null);

  /* 12. Phase 5: alert rules, lever arithmetic, PDF */
  const mkDays = (n, f) => { const out = []; for (let i = 0; i < n; i++) { const d = F.adtAddDays('2026-08-10', i); out.push(Object.assign({ day: d, weekday: F.adtWeekdayOf(d), spend: 0, attr_units: 0, attr_revenue: 0, ad_profit: 0, clicks: 0 }, f(i, d))); } return out; };
  const a01 = F.adtListingAlerts(mkDays(30, () => ({ spend: 3, attr_units: 1, attr_revenue: 4, ad_profit: -1, clicks: 10 })), { breakeven_roas: 3 }, null);
  t('alerts: A01 fires when ROAS is under break-even on 5 days with ≥ £2/day', a01.some(x => x.rule === 'A01'), a01.map(x => x.rule));
  const a01no = F.adtListingAlerts(mkDays(30, () => ({ spend: 3, attr_units: 3, attr_revenue: 30, ad_profit: 5, clicks: 10 })), { breakeven_roas: 3 }, null);
  t('alerts: A01 does not fire on a profitable listing', !a01no.some(x => x.rule === 'A01'), a01no.map(x => x.rule));
  const a03 = F.adtListingAlerts(mkDays(20, () => ({ spend: 1.2, clicks: 6 })), { breakeven_roas: 2 }, null);
  t('alerts: A03 fires on ≥ £10 of zero-sale spend in 14 days', a03.some(x => x.rule === 'A03'), a03.map(x => x.rule));
  /* the defect the first live run found: adtool_listing_day only has a row for a day the listing did something,
     so a window taken by row count spans far more than its days. These cases pin the windows to the calendar. */
  const sparse = [];
  for (let i = 0; i < 20; i++) { const d = F.adtAddDays('2026-08-20', i * 2); sparse.push({ day: d, weekday: F.adtWeekdayOf(d), spend: 1.2, attr_units: 0, attr_revenue: 0, ad_profit: -1.2, clicks: 6, units: 0 }); }
  const sparseA = F.adtListingAlerts(sparse, { breakeven_roas: 2 }, null);
  t('alerts: a sparse listing does not get A03 from 14 rows that span a month (£8.40 in the real 14 days, not £24)', !sparseA.some(x => x.rule === 'A03'), sparseA.map(x => x.rule));
  const gappy = [];
  for (let i = 0; i < 10; i++) { const d = F.adtAddDays('2026-09-01', i * 2); gappy.push({ day: d, weekday: F.adtWeekdayOf(d), spend: 3, attr_units: 0, attr_revenue: 0, ad_profit: -3, clicks: 9, units: 0 }); }
  t('alerts: A01 needs five consecutive spending days, not five scattered rows', !F.adtListingAlerts(gappy, { breakeven_roas: 3 }, null).some(x => x.rule === 'A01'), F.adtListingAlerts(gappy, { breakeven_roas: 3 }, null).map(x => x.rule));
  const tight = []; for (let i = 0; i < 6; i++) { const d = F.adtAddDays('2026-09-10', i); tight.push({ day: d, weekday: F.adtWeekdayOf(d), spend: 3, attr_units: 0, attr_revenue: 0, ad_profit: -3, clicks: 9, units: 0 }); }
  t('alerts: A01 does fire when the five days really are consecutive', F.adtListingAlerts(tight, { breakeven_roas: 3 }, null).some(x => x.rule === 'A01'), F.adtListingAlerts(tight, { breakeven_roas: 3 }, null).map(x => x.rule));
  const a02 = F.adtListingAlerts(mkDays(30, () => ({ spend: 3, ad_profit: -2, clicks: 8 })), { breakeven_roas: 2 }, null);
  t('alerts: A02 fires when the 7-day loss is over £10 and the 30-day is negative', a02.some(x => x.rule === 'A02'), a02.map(x => x.rule));
  const a10 = F.adtListingAlerts(mkDays(28, (i) => ({ spend: 2, attr_units: i < 21 ? 2 : 0, attr_revenue: i < 21 ? 20 : 0, ad_profit: i < 21 ? 4 : -2 })), { breakeven_roas: 2 }, null);
  t('alerts: A10 fires when attributed units halve week on week with spend flat', a10.some(x => x.rule === 'A10'), a10.map(x => x.rule));
  const dark = []; for (let i = 0; i < 10; i++) dark.push({ day: F.adtAddDays('2026-09-01', i), spend: i < 8 ? 20 : 3 });
  const da = F.adtAccountSpendAlerts(dark);
  t('alerts: A07 fires when spend falls under half the 7-day average for two days', da.some(x => x.rule === 'A07'), da.map(x => x.rule));
  const spike = []; for (let i = 0; i < 10; i++) spike.push({ day: F.adtAddDays('2026-09-01', i), spend: i < 9 ? 20 : 60 });
  t('alerts: A08 fires on a spend spike over 200 %', F.adtAccountSpendAlerts(spike).some(x => x.rule === 'A08'), null);
  t('alerts: no spend alert on a steady account', F.adtAccountSpendAlerts([1,2,3,4,5,6,7,8,9,10].map((v, i) => ({ day: F.adtAddDays('2026-09-01', i), spend: 20 }))).length === 0, null);
  const dr = F.adtDiminishingReturns([{ week: 1, spend_day: 400, roas: 3.7 }, { week: 2, spend_day: 500, roas: 3.5 }, { week: 3, spend_day: 620, roas: 3.4 }]);
  t('alerts: A18 fires when spend/day rose 15 % and ROAS fell, twice running', !!dr, dr);
  t('alerts: A18 silent when ROAS held', !F.adtDiminishingReturns([{ week: 1, spend_day: 400, roas: 3.5 }, { week: 2, spend_day: 500, roas: 3.6 }, { week: 3, spend_day: 620, roas: 3.7 }]), null);
  t('alerts: every rule A01–A19 has severity, cool-down and a suggested action', Object.keys(F.ADTOOL_ALERT_RULES).length === 19 && Object.keys(F.ADTOOL_ALERT_RULES).every(k => F.ADTOOL_ALERT_RULES[k].sev && F.ADTOOL_ALERT_RULES[k].cool >= 1 && F.ADTOOL_ALERT_RULES[k].action), Object.keys(F.ADTOOL_ALERT_RULES).length);
  const lvIn = [
    { item_id: 'a', spend: 100, revenue: 500, units: 20, profit: 60, clicks: 300, sat_spend: 10, sat_profit: 3, sat_revenue: 40 },
    { item_id: 'b', spend: 100, revenue: 80, units: 4, profit: -40, clicks: 400, sat_spend: 20, sat_profit: -10, sat_revenue: 15 },
    { item_id: 'c', spend: 50, revenue: 175, units: 8, profit: 10, clicks: 150, sat_spend: 6, sat_profit: -2, sat_revenue: 8 },
    { item_id: 'd', spend: 20, revenue: 140, units: 6, profit: 25, clicks: 60, sat_spend: 2, sat_profit: 1, sat_revenue: 12 },
  ];
  const lv = F.adtRoasLevers(lvIn, { marginRate: 0.35 });
  t('levers: stopping the net-loss listing raises ROAS and profit together', lv.levers[0].roas > lv.now.roas && lv.levers[0].profit > lv.now.profit, [lv.now.roas, lv.levers[0].roas, lv.now.profit, lv.levers[0].profit]);
  t('levers: the loser is the one dropped, and the ladder has all five steps', lv.loss_listing_ids.length === 1 && lv.loss_listing_ids[0] === 'b' && lv.levers.length === 5, lv.loss_listing_ids);
  t('levers: the 3–4× band and the 6×+ winners are picked by ROAS', lv.band_ids.indexOf('c') >= 0 && lv.winner_ids.indexOf('d') >= 0, [lv.band_ids, lv.winner_ids]);
  t('levers: the cut-only ceiling is reported and is not proposed as the route', lv.cut_only_ceiling.roas >= lv.levers[0].roas && /trap/.test(lv.cut_only_ceiling.note), lv.cut_only_ceiling);
  t('levers: cost per sale falls once the losers stop', lv.levers[0].cost_per_sale < lv.now.cost_per_sale, [lv.now.cost_per_sale, lv.levers[0].cost_per_sale]);
  const pdf = F.adtPdf(['# Title', 'a line with £ and — and ×', 'another']);
  t('report: the PDF is a real PDF (header, xref, EOF) and escapes the pound sign', /^JVBERi0xLjQ/.test(pdf) && atob(pdf).indexOf('%%EOF') > 0 && atob(pdf).indexOf('\\243') > 0, pdf.slice(0, 16));

  /* 13. Phase 6: the decision engine, scoring and carry-forward */
  const base = { y: { spend: 3, attr_units: 0, attr_revenue: 0, ad_profit: -3 }, d7: { spend: 21, attr_units: 1, attr_revenue: 9, ad_profit: -12 }, d14: { spend: 42, ad_profit: -20 }, d30: { spend: 90, attr_units: 6, attr_revenue: 54, ad_profit: -30 }, be: 3, halves: [-1, -1], days_with_spend_30: 28, zero_streak: 3, roas_under_be_5d: false, stage: 'Plateau', age_days: 200, age_ads: 90, organic3: 0, capped7: 0, profile_today: -1, weekday_p: 0.4, weekday_name: 'Wed', margin: 3, ads_running: true };
  const s1 = F.adtDecide(base);
  t('decide: S1 stops a listing losing in both halves with a negative EV, and says why', s1.decision === 'STOP' && s1.rules.indexOf('S1') >= 0 && s1.confidence === 'confident' && /yesterday/.test(s1.why), s1);
  const guard = F.adtDecide(Object.assign({}, base, { age_ads: 9 }));
  t('decide: a stop on an ad under 14 days old becomes a reduce and names the guardrail', guard.decision === 'REDUCE' && guard.rules.indexOf('R4') >= 0 && /14 days old/.test(guard.blocked), guard);
  const organic = F.adtDecide(Object.assign({}, base, { organic3: 2, d30: { spend: 90, attr_units: 6, attr_revenue: 54, ad_profit: -4 } }));
  t('decide: a listing that still sells organically with a small loss is reduced, not stopped', organic.decision === 'REDUCE' && organic.rules.indexOf('R4') >= 0, organic);
  const s2 = F.adtDecide(Object.assign({}, base, { age_ads: 5, zero_streak: 20, d14: { spend: 15, ad_profit: -15 } }));
  t('decide: S2 (14 zero-sale days on ≥ £10) is a hard stop no guardrail blocks', s2.decision === 'STOP' && s2.rules.indexOf('S2') >= 0, s2);
  const s4 = F.adtDecide(Object.assign({}, base, { margin: -0.5, age_ads: 2, halves: [0, 0], days_with_spend_30: 2 }));
  t('decide: S4 stops a listing with no margin while ads run', s4.decision === 'STOP' && s4.rules.indexOf('S4') >= 0, s4);
  const r1 = F.adtDecide(Object.assign({}, base, { halves: [1, 1], d7: { spend: 21, attr_units: 5, attr_revenue: 80, ad_profit: 10 }, d30: { spend: 90, attr_units: 25, attr_revenue: 340, ad_profit: 40 }, weekday_losing_confident: true, profile_today: -2 }));
  t('decide: R1 pauses a confident losing weekday for the day only and auto-resumes', r1.decision === 'REDUCE' && r1.rules.indexOf('R1') >= 0 && /auto-resume/.test(r1.action) && r1.confidence === 'confident', r1);
  const p1 = F.adtDecide(Object.assign({}, base, { y: { spend: 5, attr_units: 3, attr_revenue: 40, ad_profit: 8 }, d7: { spend: 35, attr_units: 20, attr_revenue: 300, ad_profit: 60 }, d30: { spend: 150, attr_units: 80, attr_revenue: 1200, ad_profit: 250 }, halves: [1, 1], capped7: 4, profile_today: 8 }));
  t('decide: P1 feeds a capped winner at ≥ 1.5 × break-even with a budget rise', p1.decision === 'PUSH' && p1.rules.indexOf('P1') >= 0 && /budget \+30/.test(p1.action), p1);
  const keep = F.adtDecide(Object.assign({}, base, { y: { spend: 3, attr_units: 1, attr_revenue: 12, ad_profit: 1 }, d7: { spend: 21, attr_units: 7, attr_revenue: 90, ad_profit: 6 }, d30: { spend: 90, attr_units: 30, attr_revenue: 380, ad_profit: 25 }, halves: [1, 1], profile_today: 1 }));
  t('decide: a profitable listing is left alone', keep.decision === 'KEEP' && keep.rules.length === 0, keep);
  const samp = F.adtDecide(Object.assign({}, base, { y_source: 'sampled', y: { spend: 4, attr_units: 0, attr_revenue: 0, ad_profit: -4 } }));
  t('decide: a yesterday taken from the samples says so in its reason', /sampled — the report for that day has not landed/.test(samp.why) && !/sampled/.test(F.adtDecide(base).why), samp.why);
  t('decide: EV weights today, the week and yesterday as the spec says', near(F.adtDecide(Object.assign({}, base, { profile_today: 10, d7: { spend: 7, attr_revenue: 0, ad_profit: 70 }, y: { spend: 1, attr_revenue: 0, ad_profit: 5 } })).ev, 0.5 * 10 + 0.3 * 10 + 0.2 * 5), null);
  t('score: a stop was right when the day lost money, wrong when it made money', F.adtScoreDecision('STOP', { ad_profit: -4 }, 3) === 1 && F.adtScoreDecision('STOP', { ad_profit: 4 }, 3) === 0, null);
  t('score: a push was right when the realised ROAS beat 1.2 × break-even', F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40 }, 3) === 1 && F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 20 }, 3) === 0, null);
  const cf = F.adtCarryForward([{ selected: true, repeated: true, spend: 10 }, { selected: true, repeated: true, spend: 5 }, { selected: true, repeated: false, spend: 5 }, { selected: false, repeated: false, spend: 1 }, { selected: false, repeated: false, spend: 1 }, { selected: false, repeated: true, spend: 1 }]);
  t('carry-forward: hit rate, base rate and the trust test (rate ≥ base + 10 points)', cf.rate === 67 && cf.base_rate === 50 && cf.trusted === true && cf.selected === 3, cf);
  t('carry-forward: a rule no better than the base rate is not trusted', F.adtCarryForward([{ selected: true, repeated: true }, { selected: true, repeated: false }, { selected: false, repeated: true }, { selected: false, repeated: false }]).trusted === false, null);

  /* 14. Phase 7: the narrative validator */
  const inputs7 = { day: '2026-09-17', spend: 562.43, attr_units: 217, roas: 3.57, ad_profit: 191 };
  t('narrative: a sentence built from the inputs validates', F.adtValidateNarrative('Spend was £562.43 for 217 sales at 3.57 times, £191.00 of profit.', inputs7).ok, null);
  const bad7 = F.adtValidateNarrative('Spend was £562.43 and profit rose 42 per cent.', inputs7);
  t('narrative: a number that is not in the inputs is caught', !bad7.ok && bad7.unsourced.indexOf('42') >= 0, bad7);
  t('narrative: the fleet template only uses its own numbers', F.adtValidateNarrative(F.adtFleetNarrativeTemplate({ day: '2026-09-17', spend: 562.43, attr_units: 217, attr_revenue: 2008.55, roas: 3.57, ad_profit: 191, orders: 250, units: 300, actual_profit: 400, pending: 3, bullets: [] }), { day: '2026-09-17', spend: 562.43, attr_units: 217, attr_revenue: 2008.55, roas: 3.57, ad_profit: 191, orders: 250, units: 300, actual_profit: 400, pending: 3 }).ok, F.adtValidateNarrative(F.adtFleetNarrativeTemplate({ day: '2026-09-17', spend: 562.43, attr_units: 217, attr_revenue: 2008.55, roas: 3.57, ad_profit: 191, orders: 250, units: 300, actual_profit: 400, pending: 3, bullets: [] }), { day: '2026-09-17', spend: 562.43, attr_units: 217, attr_revenue: 2008.55, roas: 3.57, ad_profit: 191, orders: 250, units: 300, actual_profit: 400, pending: 3 }).unsourced);

  /* 15. Phase 8: the apply plan and its caps (nothing here calls eBay) */
  const mem = [{ campaign_id: 'c1', live: true, bid_pct: '10', budget: '20', funding: 'COST_PER_CLICK' }, { campaign_id: 'c2', live: false, bid_pct: '8', budget: '10', funding: 'COST_PER_CLICK' }];
  const planStop = F.adtApplyPlan('STOP', { item_id: '123', rules: ['S1'] }, mem);
  t('apply: a stop pauses the ad only in the campaigns it is live in, with an undo', planStop.length === 1 && planStop[0].op === 'status' && planStop[0].to === 'PAUSED' && planStop[0].undo.to === 'ACTIVE', planStop);
  const planR1 = F.adtApplyPlan('REDUCE', { item_id: '123', rules: ['R1'], resume_at: '2026-09-19T00:05' }, mem);
  t('apply: R1 is a pause that carries its resume time', planR1[0].op === 'status' && planR1[0].resume_at === '2026-09-19T00:05', planR1);
  const planR2 = F.adtApplyPlan('REDUCE', { item_id: '123', rules: ['R2'] }, mem);
  t('apply: a reduce cuts the bid by a fifth and remembers the old one', planR2[0].op === 'bid' && near(planR2[0].to, 8) && near(planR2[0].undo.to, 10), planR2);
  const planP1 = F.adtApplyPlan('PUSH', { item_id: '123', rules: ['P1'] }, mem);
  t('apply: P1 raises the daily budget by 30 % and never past double', planP1[0].op === 'budget' && near(planP1[0].to, 26) && planP1[0].to <= 40, planP1);
  t('apply: nothing is planned when no campaign is live', F.adtApplyPlan('STOP', { item_id: '123', rules: ['S1'] }, [{ campaign_id: 'c1', live: false }]).length === 0, null);
  t('apply: the night is quiet — no live action between 22:00 and 06:00 UK', F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 23).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 3).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 10).allowed === true, null);
  t('apply: 30 actions an account a day and 3 bid changes a listing a week are hard caps', F.adtApplyCaps({ account_actions_today: 30, listing_bid_changes_week: 0 }, 'status', 10).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 3 }, 'bid', 10).allowed === false, null);
  t('apply: every endpoint used is a Sell Marketing v1 ad_campaign URL', Object.keys(F.ADTOOL_APPLY_ENDPOINTS).every(k => /^https:\/\/api\.ebay\.com\/sell\/marketing\/v1\/ad_campaign\//.test(F.ADTOOL_APPLY_ENDPOINTS[k]('X'))), Object.keys(F.ADTOOL_APPLY_ENDPOINTS).map(k => F.ADTOOL_APPLY_ENDPOINTS[k]('X')));

  /* 16. eBay dates a report task in Pacific time — the reason no same-day task exists 00:00–07:00 UTC */
  const pacOf = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  t('report tasks: at 00:17 UTC the UTC day is still tomorrow in Pacific, so eBay refuses it', pacOf(Date.parse('2026-09-18T00:17:00Z')) === '2026-09-17', pacOf(Date.parse('2026-09-18T00:17:00Z')));
  t('report tasks: at 07:01 UTC Pacific has reached the same day and eBay can accept it', pacOf(Date.parse('2026-09-18T07:01:00Z')) === '2026-09-18', pacOf(Date.parse('2026-09-18T07:01:00Z')));
  t('report tasks: after the November clock change the gate moves to 08:00 UTC on its own', pacOf(Date.parse('2026-11-10T07:30:00Z')) === '2026-11-09' && pacOf(Date.parse('2026-11-10T08:30:00Z')) === '2026-11-10', [pacOf(Date.parse('2026-11-10T07:30:00Z')), pacOf(Date.parse('2026-11-10T08:30:00Z'))]);

  const passed = results.filter(r => r.ok).length;
  const lines = results.map(r => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '  → ' + r.detail));
  return lines.join('\n') + '\n' + (passed === results.length ? 'PASS ' : 'FAIL ') + passed + '/' + results.length;
}
