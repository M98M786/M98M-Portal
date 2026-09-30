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
  const i9 = src.indexOf('/* ADTOOL-P9-PURE-BEGIN */'); const j9 = src.indexOf('/* ADTOOL-P9-PURE-END */');
  const i10 = src.indexOf('/* ADTOOL-P10-PURE-BEGIN */'); const j10 = src.indexOf('/* ADTOOL-P10-PURE-END */');
  const i11 = src.indexOf('/* ADTOOL-P11-PURE-BEGIN */'); const j11 = src.indexOf('/* ADTOOL-P11-PURE-END */');
  const i12 = src.indexOf('/* ADTOOL-P12-PURE-BEGIN */'); const j12 = src.indexOf('/* ADTOOL-P12-PURE-END */');
  const pure = src.slice(ia, ib) + '\n' + src.slice(iv, jv) + (ip >= 0 && jp >= 0 ? '\n' + src.slice(ip, jp) : '') + (i3 >= 0 && j3 >= 0 ? '\n' + src.slice(i3, j3) : '') + (i4 >= 0 && j4 >= 0 ? '\n' + src.slice(i4, j4) : '') + (i5 >= 0 && j5 >= 0 ? '\n' + src.slice(i5, j5) : '') + (i6 >= 0 && j6 >= 0 ? '\n' + src.slice(i6, j6) : '') + (i7 >= 0 && j7 >= 0 ? '\n' + src.slice(i7, j7) : '') + (i8 >= 0 && j8 >= 0 ? '\n' + src.slice(i8, j8) : '') + (i9 >= 0 && j9 >= 0 ? '\n' + src.slice(i9, j9) : '') + (i10 >= 0 && j10 >= 0 ? '\n' + src.slice(i10, j10) : '') + (i11 >= 0 && j11 >= 0 ? '\n' + src.slice(i11, j11) : '') + (i12 >= 0 && j12 >= 0 ? '\n' + src.slice(i12, j12) : '');   /* pure helpers of every phase */
  const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
  /* JavaScriptCore has no btoa/atob; the Workers runtime does. Small stand-ins so the PDF test can run here. */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const btoa = (str) => { let out = ''; for (let i = 0; i < str.length; i += 3) { const a = str.charCodeAt(i), b = str.charCodeAt(i + 1), c = str.charCodeAt(i + 2); const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c); out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]); } return out; };
  const atob = (str) => { const s2 = String(str).replace(/=+$/, ''); let out = '', bits = 0, acc = 0; for (const ch of s2) { const v = B64.indexOf(ch); if (v < 0) continue; acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); } } return out; };
  const F = new Function('round2', 'btoa', 'atob', pure + '\n return { adtFrontier, adtPlanVerdict2, adtRunVerdict, adtHourBands, adtHourBandMerge, adtWeekdaySentence, adtLever, adtWeekdayIndex, adtRealMargin, adtWeekdayLong, gbpPlain, ADTOOL_FRONTIER_MARKS, ADTOOL_CARRY_FIX_DAY, ADTOOL_HOUR_BASIS, ADTOOL_DOW, adtUkParts, adtSlot, adtWeekdayOf, adtDom, adtIsoWeek, adtAddDays, adtMargin, adtOrderBrain, adtTaxonomy, adtDeltas, adtReconcile, adtCapHour, adtVerdicts, adtAdState, adtAdEvents, parseAdsReportCampaignTsv, adtRng, adtShrink, adtDecay, adtWeekdayProfile, adtShareProfile, adtPermWeekday, adtPermSpread, adtJsd, adtRegime, adtTheilSen, adtPelt, adtStage, adtDescriptors, adtSeasonalNaive, adtTsb, adtPoissonGlm, adtHoltWinters, adtMase, adtCoverage, adtForecastWith, adtBacktest, adtBands, adtChooseModel, adtListingAlerts, adtAccountSpendAlerts, adtDiminishingReturns, adtRoasLevers, adtPdf, adtAlertUrgency, adtWeekBehaviour, adtScenarios, adtStageExplain, adtDecide, adtScoreDecision, adtSampledYesterday, adtScoreTally, adtSheetLawVerdict, adtCarryForward, adtValidateNarrative, adtNumbersIn, adtFleetNarrativeTemplate, adtProductNarrativeTemplate, adtApplyCaps, adtApplyPlan, adtSheetLawOrders, adtSheetLawProfit, adtStripCollectiveProfit, adtCpcDerived, adtCpcTotals, adtCpcHeld, adtTrend, round4, adtKvCanon, adtKvKey, adtWarmUntil, ADTOOL_KV_DEFAULT_PERIOD, ADTOOL_IMPRESSIONS_FROM, adtSaleTimeline, adtSaleStatus, adtSaleSuccessor, adtSaleDiscountObserved, adtParseDiscountPct, adtSaleCohorts, adtSaleEligibility, adtPeriod, adtPeriodOr, adtDaySrc, adtTodayRows, adtTodayTuple, adtTodayRowHonest, adtHourCurve, adtRoleAllowed, adtPacificOffsetMin, adtSamplingFromMin, adtInSamplingWindow, adtSamplingFromText, adtSamplingWindowText, ADTOOL_ROLES, ADTOOL_PERIOD_KEYS, ADTOOL_CUSTOM_MAX_DAYS, ADTOOL_PROFIT_LAW, ADTOOL_APPLY_ENDPOINTS, ADTOOL_ALERT_RULES, ADTOOL_MARGIN_CAP, ADTOOL_MIN_SP };')(round2, btoa, atob);
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
  /* Phase 1B: the first sample's spend is the CARRY of its hour (everything since 00:00 UTC), not the hour's own spend */
  t('deltas: first sample books its cumulative spend as carry_spend of its UK hour (09:10Z = 10 UK); the hour keeps only the increase', h10 && near(h10.carry_spend, 1.00) && near(h10.spend, 0.50) && h10.clicks === 8 && h10.units === 1, h10);
  t('deltas: later hours carry nothing', h11 && near(h11.carry_spend, 0) && h12 && near(h12.carry_spend, 0), [h11, h12]);
  t('deltas: second hour gets the increase only', h11 && near(h11.spend, 1.00) && h11.clicks === 4 && h11.units === 0, h11);
  t('deltas: a fall is a correction, not negative spend, and re-bases', d.corrections === 1 && h12 && near(h12.spend, 0.80) && h12.clicks === 3 && h12.units === 1, [d.corrections, h12]);
  t('deltas: sample count', d.samples === 5, d.samples);
  const rec = F.adtReconcile([{ hour: 10, spend: 4, clicks: 10, units: 2 }, { hour: 11, spend: 4, clicks: 10, units: 2 }], 10, 15, 3);
  t('reconcile: hours scale to the final report', near(rec[0].spend_r, 5) && rec[0].clicks_r === 8 && rec[1].clicks_r === 8 && near(rec[0].spend_r + rec[1].spend_r, 10), rec);
  t('reconcile: no sampled mass leaves zero', F.adtReconcile([{ hour: 9, spend: 0, clicks: 0, units: 0 }], 5, 5, 1)[0].spend_r === 0, F.adtReconcile([{ hour: 9, spend: 0, clicks: 0, units: 0 }], 5, 5, 1));
  const recC = F.adtReconcile([{ hour: 8, spend: 0.5, carry_spend: 1, clicks: 0, units: 0 }, { hour: 9, spend: 1, clicks: 0, units: 0 }], 5, 0, 0);
  t('reconcile: the carry is inside the day\'s factor (2.5 sampled → 5 final = ×2) but only within-hour spend is scaled out', near(recC[0].spend_r, 1) && near(recC[1].spend_r, 2), recC);
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
  const mkDays = (n, f) => { const out = []; for (let i = 0; i < n; i++) { const d = F.adtAddDays('2026-08-10', i); out.push(Object.assign({ day: d, weekday: F.adtWeekdayOf(d), spend: 0, attr_units: 0, attr_revenue: 0, actual_profit: 0, pending_cost_orders: 0, clicks: 0 }, f(i, d))); } return out; };
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
  const a02 = F.adtListingAlerts(mkDays(30, () => ({ spend: 3, actual_profit: -2, clicks: 8 })), { breakeven_roas: 2 }, null);
  t('alerts: A02 fires on item profit under the law when the 7-day loss is over £10 and the 30-day is negative', a02.some(x => x.rule === 'A02') && near(a02.find(x => x.rule === 'A02').payload.profit_7d, -14) && /Sales Analysis/.test(a02.find(x => x.rule === 'A02').payload.basis), a02.map(x => x.rule));
  const a02p = F.adtListingAlerts(mkDays(30, (i) => ({ spend: 3, actual_profit: -2, clicks: 8, pending_cost_orders: i === 20 ? 1 : 0 })), { breakeven_roas: 2 }, null);
  t('alerts: A02 is skipped while any order in the 30 days is unpriced (a missing cost reads as zero profit)', !a02p.some(x => x.rule === 'A02'), a02p.map(x => x.rule));
  const a02f = F.adtListingAlerts(mkDays(30, (i) => ({ spend: 3, actual_profit: -2, clicks: 8, pending_fee_orders: i === 20 ? 1 : 0 })), { breakeven_roas: 2 }, null);
  t('alerts: A02 is skipped while any order in the 30 days waits for its eBay fees (its sale is left out of the sum, its clicks are not)', !a02f.some(x => x.rule === 'A02'), a02f.map(x => x.rule));
  t('alerts: A02 carries the unpriced counts beside its profit figures', a02.find(x => x.rule === 'A02').payload.pending_cost_orders === 0 && a02.find(x => x.rule === 'A02').payload.pending_fee_orders === 0, a02.find(x => x.rule === 'A02').payload);
  t('alerts: A02 no longer judges on the old estimate', !F.adtListingAlerts(mkDays(30, () => ({ spend: 3, ad_profit: -2, clicks: 8 })), { breakeven_roas: 2 }, null).some(x => x.rule === 'A02') && /Sales Analysis/.test(F.ADTOOL_ALERT_RULES.A02.text), F.ADTOOL_ALERT_RULES.A02.text);
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
  /* Phase 4 big update: every one of the 19 rules carries a why_matters sentence, and no rule text says 'est. ad profit' */
  t('alerts: all 19 rules carry a why_matters sentence (a real sentence, not blank)', Object.keys(F.ADTOOL_ALERT_RULES).length === 19 && Object.keys(F.ADTOOL_ALERT_RULES).every(k => typeof F.ADTOOL_ALERT_RULES[k].why_matters === 'string' && F.ADTOOL_ALERT_RULES[k].why_matters.length >= 20), Object.keys(F.ADTOOL_ALERT_RULES).filter(k => !F.ADTOOL_ALERT_RULES[k].why_matters));
  t('alerts: no rule text says "est. ad profit" any more', Object.keys(F.ADTOOL_ALERT_RULES).every(k => !/est\. ad profit/i.test(F.ADTOOL_ALERT_RULES[k].text)), null);
  t('alerts: urgency is overdue for a high alert past 24 h, else severity-derived now/soon/watch', F.adtAlertUrgency('high', 30) === 'overdue' && F.adtAlertUrgency('high', 10) === 'now' && F.adtAlertUrgency('medium', 100) === 'soon' && F.adtAlertUrgency('low', 100) === 'watch' && F.adtAlertUrgency('high', 24) === 'now', [F.adtAlertUrgency('high', 30), F.adtAlertUrgency('high', 10), F.adtAlertUrgency('medium', 100), F.adtAlertUrgency('low', 100)]);
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
  /* Phase 4 big update: scoring is on REAL profit (actual_profit) by default; the ad-profit basis is kept for the side-by-side */
  t('score: a STOP is right when the day lost REAL money (law), wrong when it made real money', F.adtScoreDecision('STOP', { actual_profit: -4 }, 3) === 1 && F.adtScoreDecision('STOP', { actual_profit: 4 }, 3) === 0, null);
  t('score: a PUSH is right when realised ROAS ≥ 1.2 × break-even AND real profit is positive', F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40, actual_profit: 3 }, 3) === 1 && F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40, actual_profit: -3 }, 3) === 0 && F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 20, actual_profit: 3 }, 3) === 0, [F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40, actual_profit: 3 }, 3), F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40, actual_profit: -3 }, 3)]);
  t('score: a KEEP is right when the day was not a law loss', F.adtScoreDecision('KEEP', { actual_profit: 0 }, 3) === 1 && F.adtScoreDecision('KEEP', { actual_profit: -1 }, 3) === 0, null);
  t('score: with no law profit for the day the primary score is null (left unscored)', F.adtScoreDecision('STOP', { spend: 5, attr_revenue: 0 }, 3) === null, null);
  t('score: a SQL NULL actual_profit is left unscored, not read as £0 (guard on the raw value)', F.adtScoreDecision('KEEP', { spend: 5, attr_revenue: 0, actual_profit: null }, 3) === null && F.adtScoreDecision('STOP', { spend: 5, attr_revenue: 0, actual_profit: null }, 3) === null, [F.adtScoreDecision('KEEP', { actual_profit: null }, 3), F.adtScoreDecision('STOP', { actual_profit: null }, 3)]);
  t('score: the ad-profit basis still scores on the old estimate for the side-by-side', F.adtScoreDecision('STOP', { ad_profit: -4 }, 3, 'adprofit') === 1 && F.adtScoreDecision('PUSH', { spend: 10, attr_revenue: 40, ad_profit: -3 }, 3, 'adprofit') === 1, null);
  /* the decision agrees across the two bases when both profit figures point the same way, and can differ when they do not */
  const decAgree = { y: { spend: 3, attr_units: 0, attr_revenue: 0, ad_profit: -3, actual_profit: -3 }, d7: { spend: 21, attr_units: 1, attr_revenue: 9, ad_profit: -12, actual_profit: -12 }, d14: { spend: 42, ad_profit: -20 }, d30: { spend: 90, attr_units: 6, attr_revenue: 54, ad_profit: -30, actual_profit: -30 }, be: 3, halves: [-1, -1], halves_actual: [-1, -1], days_with_spend_30: 28, zero_streak: 3, roas_under_be_5d: false, stage: 'Plateau', age_days: 200, age_ads: 90, organic3: 0, capped7: 0, profile_today: -1, weekday_p: 0.4, weekday_name: 'Wed', margin: 3, ads_running: true };
  t('decide: the law basis and the ad-profit basis agree when both profit figures are negative', F.adtDecide(decAgree).decision === 'STOP' && F.adtDecide(decAgree, 'adprofit').decision === 'STOP', [F.adtDecide(decAgree).decision, F.adtDecide(decAgree, 'adprofit').decision]);
  const decSplit = Object.assign({}, decAgree, { d7: { spend: 21, attr_units: 1, attr_revenue: 9, ad_profit: -12, actual_profit: 5 }, d30: { spend: 90, attr_units: 6, attr_revenue: 54, ad_profit: -30, actual_profit: 20 }, halves_actual: [1, 1] });
  t('decide: the two bases can differ — real profit positive keeps, the old estimate would have stopped', F.adtDecide(decSplit).decision !== 'STOP' && F.adtDecide(decSplit, 'adprofit').decision === 'STOP', [F.adtDecide(decSplit).decision, F.adtDecide(decSplit, 'adprofit').decision]);
  const cf = F.adtCarryForward([{ selected: true, repeated: true, spend: 10 }, { selected: true, repeated: true, spend: 5 }, { selected: true, repeated: false, spend: 5 }, { selected: false, repeated: false, spend: 1 }, { selected: false, repeated: false, spend: 1 }, { selected: false, repeated: true, spend: 1 }]);
  t('carry-forward: hit rate, base rate and the trust test (rate ≥ base + 10 points)', cf.rate === 67 && cf.base_rate === 50 && cf.trusted === true && cf.selected === 3, cf);
  t('carry-forward: a rule no better than the base rate is not trusted', F.adtCarryForward([{ selected: true, repeated: true }, { selected: true, repeated: false }, { selected: false, repeated: true }, { selected: false, repeated: false }]).trusted === false, null);

  /* 14. Phase 4 big update: forecast scenarios, week-to-week behaviour, the stage explainer */
  const scn = F.adtScenarios({ base_units: 20, base_spend: 40, base_revenue: 300, margin: 6, spend_elasticity: 0.5, ad_dependence28: 0.6, elasticity_levels: 4 }, 0, 'Growth');
  t('scenarios: three scenarios A/B/C, each with modelled units/revenue/spend/profit, a limit and what_must_change', scn.length === 3 && scn.map(s => s.id).join('') === 'ABC' && scn.every(s => 'modelled_units' in s && 'modelled_revenue' in s && 'modelled_spend' in s && 'modelled_profit' in s && s.limit && s.what_must_change), scn.map(s => s.id));
  t('scenarios: +30% budget spends 30% more, and scaling an elastic listing lifts modelled units', scn[1].modelled_spend === 52 && scn[1].modelled_units > scn[0].modelled_units, [scn[1].modelled_spend, scn[0].modelled_units, scn[1].modelled_units]);
  t('scenarios: reduce/stop spends 30% less', scn[2].modelled_spend === 28 && scn[2].modelled_units < scn[0].modelled_units, [scn[2].modelled_spend, scn[2].modelled_units]);
  const scnCap = F.adtScenarios({ base_units: 20, base_spend: 40, base_revenue: 300, margin: 6, spend_elasticity: 0.5, ad_dependence28: 0.6, elasticity_levels: 4 }, 4, 'Growth');
  t('scenarios: a budget-capped listing names the budget as the binding limit on scaling', /budget-capped on 4/.test(scnCap[1].limit), scnCap[1].limit);
  const scnDec = F.adtScenarios({ base_units: 20, base_spend: 40, base_revenue: 300, margin: 6, spend_elasticity: 0.5, ad_dependence28: 0.6, elasticity_levels: 4 }, 0, 'Decline');
  t('scenarios: a declining listing names the stage as the binding limit', /Decline/.test(scnDec[1].limit), scnDec[1].limit);
  const wkb = F.adtWeekBehaviour([
    { iso_week: '2026-W36', descriptors: { weekday_ratio: 1.2, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.4, spend_elasticity: 0.5 } },
    { iso_week: '2026-W37', descriptors: { weekday_ratio: 1.2, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.7, spend_elasticity: 0.5 } },
  ]);
  t('behaviour: week-to-week returns a row per week with a sentence; the first week has nothing to compare', wkb.length === 2 && /nothing to compare/.test(wkb[0].sentence) && wkb[0].changed.length === 0, wkb[0].sentence);
  t('behaviour: a real move is flagged with descriptor, from, to, direction and a sentence naming why and the action', wkb[1].changed.some(c => c.descriptor === 'ad_dependence28' && c.direction === 'up' && c.from === 0.4 && c.to === 0.7) && /ad dependence/.test(wkb[1].sentence) && /without the ad/.test(wkb[1].sentence), wkb[1]);
  const wkbSteady = F.adtWeekBehaviour([{ iso_week: 'a', descriptors: { weekday_ratio: 1.2, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.4, spend_elasticity: 0.5 } }, { iso_week: 'b', descriptors: { weekday_ratio: 1.2, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.4, spend_elasticity: 0.5 } }]);
  t('behaviour: an unchanged week says so and lists no changes', wkbSteady[1].changed.length === 0 && /held steady/.test(wkbSteady[1].sentence), wkbSteady[1].sentence);
  const stx = F.adtStageExplain();
  t('stage explainer: all six stages, each with meaning, how it is calculated and an action', stx.length === 6 && stx.map(s => s.stage).join(',') === 'Launch,Growth,Plateau,Decline,Dormant,Dead' && stx.every(s => s.meaning && s.how_calculated && s.action), stx.map(s => s.stage));

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
  /* eBay gives no bid percentage for a cost-per-click ad. Such a step must never be dropped in silence, and
     must never be sendable: the apply job refuses anything carrying `blocked` before the caps are consulted. */
  const memNoBid = [{ campaign_id: 'c1', live: true, bid_pct: '', budget: '20', funding: 'COST_PER_CLICK' }];
  const planNoBidR = F.adtApplyPlan('REDUCE', { item_id: '123', rules: ['R2'] }, memNoBid);
  t('apply: a reduce on an ad with no bid percentage is blocked, not silently dropped',
    planNoBidR.length === 1 && planNoBidR[0].op === 'bid' && planNoBidR[0].to === null && /cost-per-click/.test(planNoBidR[0].blocked || ''), planNoBidR);
  const planNoBidP = F.adtApplyPlan('PUSH', { item_id: '123', rules: ['P2'] }, memNoBid);
  t('apply: a push on an ad with no bid percentage is blocked too', 
    planNoBidP.length === 1 && !!planNoBidP[0].blocked && planNoBidP[0].to === null, planNoBidP);
  t('apply: a blocked step carries no value to send', [planNoBidR[0], planNoBidP[0]].every(x => x && x.to === null && x.from === null), [planNoBidR[0], planNoBidP[0]]);
  t('apply: the night is quiet — no live action between 22:00 and 06:00 UK', F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 23).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 3).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 10).allowed === true, null);
  t('apply: 30 actions an account a day and 3 bid changes a listing a week are hard caps', F.adtApplyCaps({ account_actions_today: 30, listing_bid_changes_week: 0 }, 'status', 10).allowed === false && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 3 }, 'bid', 10).allowed === false, null);
  /* 16. The war room (Phase 2, 27 Sep 2026): the frontier, the verdict sentence, the Running today rules, the hour
     bands, the weekday sentence, the lever. All pure; every rule is the one the register row states. */
  const fr = [
    { item_id: 'a', title: 'A', account: 'X', spend: 30, attr_revenue: 300, actual_profit: 90, breakeven_roas: 2.5, margin_source: 'portal' },      /* 10× */
    { item_id: 'b', title: 'B', account: 'X', spend: 30, attr_revenue: 150, actual_profit: 30, breakeven_roas: 2.5, margin_source: 'orders' },      /* 5×  */
    { item_id: 'c', title: 'C', account: 'Y', spend: 30, attr_revenue: 60,  actual_profit: -6, breakeven_roas: 2.5, margin_source: 'estimate' },    /* 2×, losing, but the margin is a guess → judged against 1× */
    { item_id: 'd', title: 'D', account: 'Y', spend: 30, attr_revenue: 45,  actual_profit: -9, breakeven_roas: 2.5, margin_source: 'ali cost' },    /* 1.5×, losing, real break-even 2.5× → the mark */
    { item_id: 'e', title: 'E', account: 'Y', spend: 30, attr_revenue: 15,  actual_profit: -20, breakeven_roas: 2.5, margin_source: 'portal' },     /* 0.5× */
    { item_id: 'z', title: 'Z', account: 'Y', spend: 0,  attr_revenue: 0,   actual_profit: 0, breakeven_roas: 2.5, margin_source: 'portal' }        /* no spend: not on the frontier */
  ];
  const FR = F.adtFrontier(fr, 30);
  t('frontier: listings with spend are ranked by their own ROAS, best first; no-spend rows are absent', FR.points.map(p => p.item_id).join('') === 'abcde', FR.points.map(p => p.item_id));
  t('frontier: own ROAS and the cumulative ROAS both fall monotonically along the walk', FR.points.every((p, i) => i === 0 || (p.own_roas <= FR.points[i - 1].own_roas && p.cum_roas <= FR.points[i - 1].cum_roas)), FR.points.map(p => [p.own_roas, p.cum_roas]));
  t('frontier: points are per day (window totals ÷ days) and carry spend, revenue and ROAS only', near(FR.points[1].cum_spend_day, 2) && near(FR.points[1].cum_revenue_day, 15) && near(FR.points[1].cum_roas, 7.5), FR.points[1]);
  /* cumulative: 10 → 7.5 → 5.67 → 4.63 → 3.8: six-times holds at 2 (falls at 3), five at 3 (falls at 4), four at 4 (falls at 5), 3.5 never falls */
  const mk = {}; FR.marks.forEach(m => mk[String(m.roas)] = m);
  t('frontier: a mark is the last n that still holds the target and names the first n below it', mk['6'].n === 2 && mk['6'].falls_at === 3 && mk['5'].n === 3 && mk['5'].falls_at === 4 && mk['4'].n === 4 && mk['4'].falls_at === 5 && mk['3.5'].n === 5 && mk['3.5'].falls_at === null, FR.marks);
  t('frontier: the mark carries the cumulative spend and revenue per day at its n', near(mk['5'].cum_spend_day, 3) && near(mk['5'].cum_revenue_day, 17), mk['5']);
  t('frontier: break-even = the first losing listing under its own real break-even; an estimated margin is judged against 1× (c at 2× is passed over, d at 1.5× < 2.5× is the mark)', FR.breakeven.n === 4 && FR.breakeven.item_id === 'd' && FR.breakeven.threshold === 2.5 && /break-even/.test(FR.breakeven.threshold_source), FR.breakeven);
  const frEst = F.adtFrontier([{ item_id: 'c', spend: 30, attr_revenue: 24, actual_profit: -6, breakeven_roas: 2.5, margin_source: 'estimate' }], 30);
  t('frontier: an estimated margin listing under 1× is the mark on the 1× rule', frEst.breakeven.n === 1 && frEst.breakeven.threshold === 1, frEst.breakeven);
  t('frontier: nothing losing under break-even → no mark, rule still stated', F.adtFrontier(fr.slice(0, 2), 30).breakeven.n === null && /own ROAS/.test(F.adtFrontier(fr.slice(0, 2), 30).breakeven.rule), F.adtFrontier(fr.slice(0, 2), 30).breakeven);
  const keysDeep = (v, acc) => { if (Array.isArray(v)) v.forEach(x => keysDeep(x, acc)); else if (v && typeof v === 'object') Object.keys(v).forEach(k => { acc.push(k); keysDeep(v[k], acc); }); return acc; };
  t('frontier: no key anywhere on the frontier matches /profit/i — nothing collective is summed', !keysDeep(FR, []).some(k => /profit/i.test(k)), keysDeep(FR, []).filter(k => /profit/i.test(k)));
  t('frontier: a mark never reached is n = 0 at £0', F.adtFrontier([{ item_id: 'e', spend: 30, attr_revenue: 15, actual_profit: -20, breakeven_roas: 2.5, margin_source: 'portal' }], 30).marks[0].n === 0 && F.adtFrontier([{ item_id: 'e', spend: 30, attr_revenue: 15, actual_profit: -20, breakeven_roas: 2.5, margin_source: 'portal' }], 30).marks[0].falls_at === 1, null);
  const V2 = F.adtPlanVerdict2({ cut_n: 3, improving_n: 2, spend_freed_day: 12.345, withheld_unpriced: 1, from: '2026-08-28', to: '2026-09-26', label: 'Last 30 days (to yesterday)', days: 30, listings: 40 });
  t('verdict: names the count, the window and the spend freed per day; improving and withheld rows are said, not hidden', /^Switch off 3 listings$/.test(V2.headline) && /Last 30 days \(to yesterday\) \(2026-08-28 → 2026-09-26, 30 days\)/.test(V2.detail) && /£12\.35 of spend a day/.test(V2.detail) && /2 listings lost over the window but earned over the last 7 days/.test(V2.detail) && /1 losing row withheld/.test(V2.detail) && V2.cut_n === 3 && V2.improving_n === 2 && V2.withheld_unpriced === 1 && near(V2.spend_freed_day, 12.35), V2);
  t('verdict: keep everything when nothing lost; nothing to say when nothing spent', /^Keep everything running$/.test(F.adtPlanVerdict2({ cut_n: 0, listings: 5, from: 'a', to: 'b', label: 'Today', days: 1 }).headline) && /^Nothing to say yet$/.test(F.adtPlanVerdict2({ cut_n: 0, listings: 0, from: 'a', to: 'b', label: 'Today', days: 1 }).headline), null);
  /* Running today: the verdict rules */
  const wdh = (profits, spends, unp) => profits.map((p, i) => ({ day: 'd' + i, spend: spends ? spends[i] : 5, attr_units: p > 0 ? 1 : 0, actual_profit: p, unpriced: !!(unp && unp[i]) }));
  const RV = (h, d7, extra) => F.adtRunVerdict(Object.assign({ weekday: 'Sat', weekday_history: h, d7, breakeven_roas: 2.5, margin_source: 'portal', weekday_profile: { index: 1, p: 0.5, confident: false } }, extra || {}));
  t('run verdict: stop = negative on 3 of the last 4 Saturdays with ≥ £2 spend each AND a negative last 7 days', RV(wdh([-3, -2, 4, -1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }).verdict === 'stop', RV(wdh([-3, -2, 4, -1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }));
  t('run verdict: the same weekdays with a positive last 7 days are not a stop', RV(wdh([-3, -2, 4, -1]), { actual_profit: 2, spend: 20, attr_revenue: 20 }).verdict !== 'stop', RV(wdh([-3, -2, 4, -1]), { actual_profit: 2, spend: 20, attr_revenue: 20 }));
  t('run verdict: a losing Saturday under £2 of spend does not count toward the three', RV(wdh([-3, -2, 4, -1], [5, 5, 5, 1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }).verdict === 'watch', RV(wdh([-3, -2, 4, -1], [5, 5, 5, 1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }));
  t('run verdict: an unpriced Saturday is excluded — two priced losses are not three', RV(wdh([-3, -2, 4, -1], null, [0, 0, 0, 1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }).verdict === 'watch', RV(wdh([-3, -2, 4, -1], null, [0, 0, 0, 1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }));
  t('run verdict: fewer than 2 priced Saturdays → watch, and the sentence says why', /watch/.test(RV(wdh([-3, -2, 4, -1], null, [1, 1, 1, 0]), { actual_profit: -50, spend: 20, attr_revenue: 0 }).verdict) && /fully priced/.test(RV(wdh([-3, -2, 4, -1], null, [1, 1, 1, 0]), { actual_profit: -50, spend: 20, attr_revenue: 0 }).why), RV(wdh([-3, -2, 4, -1], null, [1, 1, 1, 0]), { actual_profit: -50, spend: 20, attr_revenue: 0 }));
  t('run verdict: run = positive on 3 of 4 with a confident weekday index ≥ 1.1', RV(wdh([3, 2, -1, 4]), { actual_profit: -1, spend: 20, attr_revenue: 10 }, { weekday_profile: { index: 1.3, p: 0.01, confident: true } }).verdict === 'run', RV(wdh([3, 2, -1, 4]), { actual_profit: -1, spend: 20, attr_revenue: 10 }, { weekday_profile: { index: 1.3, p: 0.01, confident: true } }));
  t('run verdict: the same 3 of 4 with p = 0.3 (not confident) or index 1.05 is not a run on that rule', RV(wdh([3, 2, -1, 4]), { actual_profit: -1, spend: 20, attr_revenue: 10 }, { weekday_profile: { index: 1.3, p: 0.3, confident: false } }).verdict === 'watch' && RV(wdh([3, 2, -1, 4]), { actual_profit: -1, spend: 20, attr_revenue: 10 }, { weekday_profile: { index: 1.05, p: 0.01, confident: true } }).verdict === 'watch', null);
  t('run verdict: run = last 7 days positive with own ROAS at or above break-even', RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 25 }).verdict === 'run' && RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 24 }).verdict === 'watch', [RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 25 }), RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 24 })]);
  t('run verdict: an estimated margin is judged against 1×, never against its guessed break-even', RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 12 }, { margin_source: 'estimate' }).verdict === 'run' && RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 12 }).verdict === 'watch', null);
  t('run verdict: every answer names its rule and a why', ['stop', 'run', 'watch'].every(v => { const r = { stop: RV(wdh([-3, -2, 4, -1]), { actual_profit: -5, spend: 20, attr_revenue: 20 }), run: RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 25 }), watch: RV(wdh([1, -1, 1, -1]), { actual_profit: 0, spend: 0, attr_revenue: 0 }) }[v]; return r.verdict === v && r.rule && r.why.length > 10; }), null);
  /* the 7-day leg while an order in it is unpriced: the figure is an unpriced sale, not a loss */
  const P7 = RV(wdh([-3, -2, 4, -1]), { actual_profit: -13.33, spend: 20, attr_revenue: 60, pending_cost_orders: 3, pending_fee_orders: 0 });
  t('run verdict: 3 losing Saturdays with a negative 7 days that still holds unpriced orders is watch, and says so', P7.verdict === 'watch' && /not fully priced/.test(P7.why) && /3 orders/.test(P7.why) && /unpriced sale, not a loss/.test(P7.why), P7);
  t('run verdict: the same 7 days with every order priced is the stop, and the why says every order is priced', RV(wdh([-3, -2, 4, -1]), { actual_profit: -13.33, spend: 20, attr_revenue: 60, pending_cost_orders: 0, pending_fee_orders: 0 }).verdict === 'stop' && /every order priced/.test(RV(wdh([-3, -2, 4, -1]), { actual_profit: -13.33, spend: 20, attr_revenue: 60 }).why), null);
  t('run verdict: a pending order in the 7 days never blocks a run on a positive 7 days (understated is still positive)', RV(wdh([0, 0, 0, 0]), { actual_profit: 4, spend: 10, attr_revenue: 25, pending_cost_orders: 2 }).verdict === 'run', null);
  /* a weekday with no row at all is not a priced weekday */
  const NR = wdh([0, 0, 0, 0]).map((h, i) => Object.assign(h, { has_row: i === 0, spend: i === 0 ? 5 : 0 }));
  t('run verdict: three Saturdays with no row leave one priced Saturday — watch, insufficient, and the why counts the rows missing', RV(NR, { actual_profit: -5, spend: 20, attr_revenue: 20 }).verdict === 'watch' && RV(NR, { actual_profit: -5, spend: 20, attr_revenue: 20 }).rule === 'insufficient' && /3 with no row/.test(RV(NR, { actual_profit: -5, spend: 20, attr_revenue: 20 }).why), RV(NR, { actual_profit: -5, spend: 20, attr_revenue: 20 }));
  const WS3 = F.adtWeekdaySentence({ weekday: 'Sat', weekday_history: [0, 1, 2, 3].map(i => ({ day: 'd' + i, has_row: false, spend: 0, attr_units: 0, actual_profit: 0, unpriced: false })), last_week_same_day: { has_row: false, spend: 0, actual_profit: 0, unpriced: false }, today: { spend: 1, attr_units: 0, orders: 0 } });
  t('weekday sentence: four Saturdays without a row read as no history, never as "spent £0.00 and made £0.00"', /^No Saturday history yet; last Saturday no ad or order row; today so far £1\.00 spend/.test(WS3) && !/£0\.00 and made/.test(WS3), WS3);
  /* hour bands */
  const hrs = [
    { hour: 8, spend: 4, units: 0 }, { hour: 9, spend: 2, units: 1 }, { hour: 10, spend: 2, units: 2 }, { hour: 11, spend: 1, units: 1 },
    { hour: 12, spend: 0.2, units: 0 },   /* under the £0.50 floor: not judged */
    { hour: 14, spend: 0.3, units: 0 }, { hour: 20, spend: 1, units: 0 }, { hour: 21, spend: 3, units: 0 }, { hour: 22, spend: 1, units: 2 }
  ];
  const HB = F.adtHourBands(hrs, {});
  /* judged hours: 8, 9, 10, 11, 20, 21, 22 → mean £2; units/£: 0, .5, 1, 1, 0, 0, 2 → median 0.5 */
  t('hour bands: hours under £0.50 are not judged; the mean and median are over the judged hours; per-hour detail does not travel on the row', HB.hours_judged === 7 && HB.hours === undefined && near(HB.mean_hour_spend, 2) && near(HB.median_units_per_pound, 0.5), HB);
  t('hour bands: avoid = no unit and spend ≥ 15 % of the mean hour (8, 20, 21 → bands [8,8] and [20,21])', JSON.stringify(HB.avoid) === '[[8,8],[20,21]]', HB.avoid);
  t('hour bands: run = units per £ at or above the median with at least one unit, merged (9–11 and 22)', JSON.stringify(HB.run) === '[[9,11],[22,22]]', HB.run);
  t('hour bands: the basis and the carry-hour exclusion are always printed', HB.basis === F.ADTOOL_HOUR_BASIS && /hour 8 excluded for days before 2026-09-27/.test(HB.excluded_note), [HB.basis, HB.excluded_note]);
  t('hour bands: a listing with nothing over £0.50 says so and has no bands', F.adtHourBands([{ hour: 9, spend: 0.4, units: 1 }], {}).run.length === 0 && /£0\.50/.test(F.adtHourBands([{ hour: 9, spend: 0.4, units: 1 }], {}).note), F.adtHourBands([{ hour: 9, spend: 0.4, units: 1 }], {}));
  t('hour bands: a zero-unit hour just under 15 % of the mean is neither avoided nor run', F.adtHourBands([{ hour: 9, spend: 10, units: 1 }, { hour: 15, spend: 0.8, units: 0 }], {}).avoid.length === 0, F.adtHourBands([{ hour: 9, spend: 10, units: 1 }, { hour: 15, spend: 0.8, units: 0 }], {}));
  t('hour bands: contiguous hours merge, a gap splits, order does not matter', JSON.stringify(F.adtHourBandMerge([22, 9, 10, 11, 23, 3])) === '[[3,3],[9,11],[22,23]]', F.adtHourBandMerge([22, 9, 10, 11, 23, 3]));
  /* the weekday sentence */
  const WS = F.adtWeekdaySentence({ weekday: 'Sat', weekday_history: [{ spend: 4, attr_units: 1, actual_profit: 2.5, unpriced: false }, { spend: 3, attr_units: 0, actual_profit: -3, unpriced: false }, { spend: 5, attr_units: 2, actual_profit: 6, unpriced: false }, { spend: 2, attr_units: 0, actual_profit: -2, unpriced: true }], last_week_same_day: { spend: 4, attr_units: 1, actual_profit: 2.5, unpriced: false }, today: { spend: 1.2, attr_units: 1, orders: 2 } });
  t('weekday sentence: last 4 Saturdays (priced ones summed, the unpriced one named), last Saturday, today so far', /On the last 3 priced Saturdays it spent £12\.00 and made £5\.50 real profit on 3 attributed units \(1 Saturday with an unpriced order excluded\)/.test(WS) && /last Saturday £4\.00 spend \/ £2\.50 profit, 1 unit/.test(WS) && /today so far £1\.20 spend, 1 attributed unit, 2 orders\./.test(WS), WS);
  const WS2 = F.adtWeekdaySentence({ weekday: 'Sat', weekday_history: [{ spend: 2, attr_units: 0, actual_profit: -2, unpriced: false }], last_week_same_day: { spend: 2, attr_units: 0, actual_profit: -2, unpriced: false }, today: { spend: null, attr_units: null, orders: 0 } });
  t('weekday sentence: a loss reads as −£, and no sample today says so instead of £0.00', /made −£2\.00 real profit/.test(WS2) && /today: no ad sample yet\./.test(WS2), WS2);
  /* the lever */
  const LV = F.adtLever([{ campaign_id: '1', name: 'CPC one', funding_model: 'COST_PER_CLICK', budget: '12.50', bid_pct: null, c_bid: null }, { campaign_id: '2', name: 'PLS', funding_model: 'COST_PER_SALE', budget: '', bid_pct: '7.5', c_bid: '5' }]);
  t('lever: a cost-per-click campaign gives the daily budget (TEXT → number) and says eBay returns no bid', LV.kind === 'budget' && LV.campaign_id === '1' && LV.budget === 12.5 && LV.bid_pct === null && /no bid/.test(LV.note), LV);
  const LV2 = F.adtLever([{ campaign_id: '2', name: 'PLS', funding_model: 'COST_PER_SALE', budget: '', bid_pct: '', c_bid: '5' }]);
  t('lever: cost-per-sale gives the ad rate (the ad\'s own, else the campaign\'s)', LV2.kind === 'ad_rate' && LV2.bid_pct === 5 && LV2.budget === null && F.adtLever([{ campaign_id: '2', funding_model: 'COST_PER_SALE', bid_pct: '7.5', c_bid: '5' }]).bid_pct === 7.5, LV2);
  t('lever: no running campaign → none, with a note', F.adtLever([]).kind === 'none' && F.adtLever([]).campaign_id === null && /no running campaign/.test(F.adtLever([]).note), F.adtLever([]));
  /* the weekday index */
  const WI = F.adtWeekdayIndex({ rates: [1, 1, 1, 1, 1, 2.2, 1].map((r, i) => ({ day: F.ADTOOL_DOW[i], rate: r })), spread: { p: 0.02 } }, 5);
  t('weekday index: today\'s rate ÷ the mean of the seven, confident under p < 0.05', near(WI.index, 2.2 / (8.2 / 7), 0.01) && WI.confident === true && WI.weekday === 'Sat' && F.adtWeekdayIndex({ rates: [1, 1, 1, 1, 1, 2.2, 1].map(r => ({ rate: r })), spread: { p: 0.3 } }, 5).confident === false && F.adtWeekdayIndex(null, 5).index === null, WI);
  t('weekday names: the short profile name reads long in every sentence', F.adtWeekdayLong('Sat') === 'Saturday' && F.adtWeekdayLong('Mon') === 'Monday' && F.adtWeekdayLong('') === 'weekday', null);
  t('real margin: portal, capped, orders and ali cost are real; estimate, none and blank are not', ['portal', 'portal (capped)', 'orders', 'ali cost'].every(F.adtRealMargin) && !['estimate', 'none', '', null].some(F.adtRealMargin), null);

  t('apply: every endpoint used is a Sell Marketing v1 ad_campaign URL', Object.keys(F.ADTOOL_APPLY_ENDPOINTS).every(k => /^https:\/\/api\.ebay\.com\/sell\/marketing\/v1\/ad_campaign\//.test(F.ADTOOL_APPLY_ENDPOINTS[k]('X'))), Object.keys(F.ADTOOL_APPLY_ENDPOINTS).map(k => F.ADTOOL_APPLY_ENDPOINTS[k]('X')));

  /* 16. eBay dates a report task in Pacific time — the reason no same-day task exists 00:00–07:00 UTC */
  const pacOf = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  t('report tasks: at 00:17 UTC the UTC day is still tomorrow in Pacific, so eBay refuses it', pacOf(Date.parse('2026-09-18T00:17:00Z')) === '2026-09-17', pacOf(Date.parse('2026-09-18T00:17:00Z')));
  t('report tasks: at 07:01 UTC Pacific has reached the same day and eBay can accept it', pacOf(Date.parse('2026-09-18T07:01:00Z')) === '2026-09-18', pacOf(Date.parse('2026-09-18T07:01:00Z')));
  t('report tasks: after the November clock change the gate moves to 08:00 UTC on its own', pacOf(Date.parse('2026-11-10T07:30:00Z')) === '2026-11-09' && pacOf(Date.parse('2026-11-10T08:30:00Z')) === '2026-11-10', [pacOf(Date.parse('2026-11-10T07:30:00Z')), pacOf(Date.parse('2026-11-10T08:30:00Z'))]);

  /* 17. Phase 1A: the Sales Analysis law — the ONE profit figure the ads portal shows — and the rule that no
     collective profit leaves the engine. The live fixture is Saif Bhai, 22 Sep 2026 (plan §0): the workbook's own
     Actual Profit for the day was £77.31. */
  const lawDay = F.adtSheetLawOrders([{ sold: 520.53, fees: 87.61, cost: 197.56, refunded: 0 }]);
  t('law: sold 520.53, fees 87.61, ali 197.56, cpc 115.61, no refunds → 77.30', near(F.adtSheetLawProfit({ raw_priced_sum: lawDay.raw_priced_sum, cpc_spend: 115.61, refunds: lawDay.refunds }), 77.30) && lawDay.pending_cost_orders === 0 && lawDay.pending_fee_orders === 0, F.adtSheetLawProfit({ raw_priced_sum: lawDay.raw_priced_sum, cpc_spend: 115.61, refunds: 0 }));
  t('law: 0.96 × CPC — the workbook charges Priority at 1.2× and takes 20 % VAT off the line', near(F.adtSheetLawProfit({ raw_priced_sum: 100, cpc_spend: 10, refunds: 0 }), 80 - 9.6), F.adtSheetLawProfit({ raw_priced_sum: 100, cpc_spend: 10, refunds: 0 }));
  t('law: a refund comes off after the 0.8', near(F.adtSheetLawProfit({ raw_priced_sum: 100, cpc_spend: 0, refunds: 12.5 }), 67.5), null);
  const lawPend = F.adtSheetLawOrders([{ sold: 20, fees: 3.4, cost: 8, refunded: 0 }, { sold: 15, fees: 2.5, cost: 0, refunded: 0 }]);
  t('law: an order whose Ali cost is not typed is excluded from the sum and counted', near(lawPend.raw_priced_sum, 20 - 3.4 - 8) && lawPend.pending_cost_orders === 1 && lawPend.pending_fee_orders === 0, lawPend);
  const lawFee = F.adtSheetLawOrders([{ sold: 20, fees: 3.4, cost: 8, refunded: 1.5 }, { sold: 15, fees: 0, cost: 6, refunded: 2 }]);
  t('law: an order whose eBay fees have not landed is excluded and counted as fee-pending; its refund is excluded with it', near(lawFee.raw_priced_sum, 8.6) && lawFee.pending_fee_orders === 1 && lawFee.pending_cost_orders === 0 && near(lawFee.refunds, 1.5), lawFee);
  const lawRefUnpriced = F.adtSheetLawOrders([{ sold: 20, fees: 3.4, cost: 0, refunded: 20 }]);
  t('law: a refunded order whose cost was never typed is not a loss — it contributes nothing and is counted', near(lawRefUnpriced.raw_priced_sum, 0) && near(lawRefUnpriced.refunds, 0) && lawRefUnpriced.pending_cost_orders === 1 && near(F.adtSheetLawProfit({ raw_priced_sum: 0, cpc_spend: 0, refunds: lawRefUnpriced.refunds }), 0), lawRefUnpriced);
  t('law: the marker the rollups rebuild history against is sheet-v1', F.ADTOOL_PROFIT_LAW === 'sheet-v1', F.ADTOOL_PROFIT_LAW);
  /* the strip: a fixture response shaped like the real actions — account, fleet and weekday rows with profit sums,
     item rows with their own profit and the old estimate */
  const mkResp = () => ({
    kpi: { spend: 100, actual_profit: 40, ad_profit: 30, pending: 2 },
    by_account: [{ account: 'A', spend: 50, actual_profit: 20, ad_profit: 10, roas: 4 }, { account: 'B', spend: 50, profit_day: 3 }],
    weekday: [{ weekday: 0, spend: 10, profit: 2 }],
    now: { keep: 12, profit_day: 9, spend_day: 30 },
    winners: [{ item_id: '1', account: 'A', title: 't', image: null, actual_profit: 12, ad_profit: 9, pending_cost_orders: 0 }],
    listing: { item_id: '2', kpis: { d7: { actual: 3, actual_profit: 3, profit_day: 1 } }, weekday: [{ day: 'Mon', actual_profit: 1, ad_profit_day: 2 }] },
    text: 'profit is a word, not a key',
    profit_label: 'Profit (Sales Analysis law)',
  });
  const stripped = F.adtStripCollectiveProfit(mkResp(), { keepCollective: false });
  t('strip: profit keys leave account, fleet and weekday rows', !('actual_profit' in stripped.kpi) && !('ad_profit' in stripped.kpi) && stripped.kpi.spend === 100 && stripped.kpi.pending === 2 && !('actual_profit' in stripped.by_account[0]) && !('profit_day' in stripped.by_account[1]) && stripped.by_account[0].roas === 4 && !('profit' in stripped.weekday[0]) && !('profit_day' in stripped.now) && stripped.now.keep === 12, stripped);
  t('strip: item rows keep their own profit and lose only the old estimate', stripped.winners[0].actual_profit === 12 && !('ad_profit' in stripped.winners[0]) && stripped.winners[0].pending_cost_orders === 0, stripped.winners[0]);
  t('strip: everything under an item-keyed object is that item\'s (a listing page)', stripped.listing.kpis.d7.actual_profit === 3 && stripped.listing.kpis.d7.profit_day === 1 && stripped.listing.weekday[0].actual_profit === 1 && !('ad_profit_day' in stripped.listing.weekday[0]) && stripped.text.indexOf('profit') >= 0, stripped.listing);
  const kept = F.adtStripCollectiveProfit(mkResp(), { keepCollective: true });
  t('strip: a profit role keeps collective figures, but never the old estimate', kept.kpi.actual_profit === 40 && !('ad_profit' in kept.kpi) && kept.by_account[0].actual_profit === 20 && !('ad_profit' in kept.by_account[0]) && !('ad_profit' in kept.winners[0]), kept.kpi);
  t('strip: null and scalar answers pass through', F.adtStripCollectiveProfit(null, {}) === null && F.adtStripCollectiveProfit('ok', {}) === 'ok', null);
  t('strip: a label under a profit key is text, not a figure, and reaches every role', stripped.profit_label === 'Profit (Sales Analysis law)' && kept.profit_label === 'Profit (Sales Analysis law)', stripped.profit_label);

  /* 18. Phase 1B: the period helper, the today grain, the carry hour and the splice. 27 Sep 2026 is a Sunday. */
  const T = '2026-09-27';
  const P = k => F.adtPeriod({ period: k }, T);
  const eq = (o, from, to, days, inc, pf, pt) => o.from === from && o.to === to && o.days === days && o.includes_today === inc && o.prev_from === pf && o.prev_to === pt;
  t('period: today', eq(P('today'), T, T, 1, true, '2026-09-26', '2026-09-26') && P('today').key === 'today', P('today'));
  t('period: yesterday', eq(P('yesterday'), '2026-09-26', '2026-09-26', 1, false, '2026-09-25', '2026-09-25'), P('yesterday'));
  t('period: d7 = the 7 full days to yesterday, previous = the 7 before', eq(P('d7'), '2026-09-20', '2026-09-26', 7, false, '2026-09-13', '2026-09-19'), P('d7'));
  t('period: d14 / d30 / d90 lengths', P('d14').days === 14 && P('d30').days === 30 && P('d30').from === '2026-08-28' && P('d90').days === 90 && P('d90').to === '2026-09-26', [P('d14'), P('d30'), P('d90')].map(x => x.from));
  t('period: this_week starts Monday (21 Sep) and includes today', eq(P('this_week'), '2026-09-21', T, 7, true, '2026-09-14', '2026-09-20'), P('this_week'));
  t('period: last_week is Mon → Sun', eq(P('last_week'), '2026-09-14', '2026-09-20', 7, false, '2026-09-07', '2026-09-13'), P('last_week'));
  t('period: this_month 1st → today, previous = last month whole', eq(P('this_month'), '2026-09-01', T, 27, true, '2026-08-01', '2026-08-31'), P('this_month'));
  t('period: last_month whole, previous = the month before', eq(P('last_month'), '2026-08-01', '2026-08-31', 31, false, '2026-07-01', '2026-07-31'), P('last_month'));
  const mon = F.adtPeriod({ period: 'this_week' }, '2026-09-28');
  t('period: on a Monday this_week is one day and last_week is the week just ended', mon.from === '2026-09-28' && mon.days === 1 && F.adtPeriod({ period: 'last_week' }, '2026-09-28').from === '2026-09-21' && F.adtPeriod({ period: 'last_week' }, '2026-09-28').to === '2026-09-27', mon);
  const oct1 = F.adtPeriod({ period: 'this_month' }, '2026-10-01'), sepLast = F.adtPeriod({ period: 'last_month' }, '2026-10-01');
  t('period: on the 1st this_month is one day; last_month is 1–30 Sep with August before it', oct1.days === 1 && oct1.from === '2026-10-01' && sepLast.from === '2026-09-01' && sepLast.to === '2026-09-30' && sepLast.prev_from === '2026-08-01' && sepLast.prev_to === '2026-08-31', [oct1, sepLast]);
  const cu = F.adtPeriod({ from: '2026-09-01', to: '2026-09-10' }, T);
  t('period: custom from / to (key inferred), previous = same length before it', cu.key === 'custom' && eq(cu, '2026-09-01', '2026-09-10', 10, false, '2026-08-22', '2026-08-31'), cu);
  const one = F.adtPeriod({ period: 'custom', from: '2026-09-25', to: '2026-09-25' }, T);
  t('period: a single custom day is day-to-day', one.days === 1 && one.label === '2026-09-25' && one.prev_from === '2026-09-24' && one.prev_to === '2026-09-24', one);
  const clamp = F.adtPeriod({ period: 'custom', from: '2026-09-20', to: '2026-10-05' }, T);
  t('period: a custom range past today is clamped to today and includes it', clamp.to === T && clamp.includes_today === true && clamp.days === 8, clamp);
  let err = ''; try { F.adtPeriod({ period: 'custom', from: '2026-01-01', to: '2026-09-01' }, T); } catch (e) { err = String(e.message); }
  t('period: a custom range over 120 days is refused with a SAY', /^SAY: .*120 days/.test(err), err);
  err = ''; try { F.adtPeriod({ period: 'custom', from: '2026-09-10', to: '2026-09-01' }, T); } catch (e) { err = String(e.message); }
  t('period: a custom range that ends before it starts is refused', /^SAY: /.test(err), err);
  err = ''; try { F.adtPeriod({ period: 'custom', from: 'yesterday' }, T); } catch (e) { err = String(e.message); }
  t('period: a custom range without dates is refused', /^SAY: /.test(err) && /YYYY-MM-DD/.test(err), err);
  err = ''; try { F.adtPeriod({ period: 'fortnight' }, T); } catch (e) { err = String(e.message); }
  t('period: an unknown key is refused', /^SAY: unknown period/.test(err), err);
  t('period: no period at all = d30 (the pages\' old window), and adtPeriodOr keeps a page\'s own default', F.adtPeriod({}, T).key === 'd30' && F.adtPeriodOr(null, T, 'd28').days === 28 && F.adtPeriodOr({ period: 'today' }, T, 'd28').key === 'today', F.adtPeriodOr(null, T, 'd28'));
  t('period: every listed key resolves and echoes itself', F.ADTOOL_PERIOD_KEYS.filter(k => k !== 'custom').every(k => P(k).key === k && P(k).label) && F.ADTOOL_PERIOD_KEYS.length === 11, F.ADTOOL_PERIOD_KEYS);
  /* the today grain */
  const latest = [
    { account: 'A', item_id: '1', family: 'cpc', report_day: T, sampled_at: '2026-09-27T10:00:00Z', cum_spend: 2.5, cum_clicks: 10, cum_units: 1, cum_revenue: 9.99, cum_impressions: 100 },
    { account: 'A', item_id: '1', family: 'std', report_day: T, sampled_at: '2026-09-27T10:02:00Z', cum_spend: 0.5, cum_clicks: 2, cum_units: 0, cum_revenue: 0, cum_impressions: 50 },
    { account: 'A', item_id: '2', family: 'cpc', report_day: '2026-09-26', sampled_at: '2026-09-26T22:00:00Z', cum_spend: 9, cum_clicks: 30, cum_units: 2, cum_revenue: 20, cum_impressions: 900 },
    { account: 'B', item_id: '3', family: 'cpc', report_day: T, sampled_at: '2026-09-27T10:00:00Z', cum_spend: 1, cum_clicks: 4, cum_units: 0, cum_revenue: 0, cum_impressions: 40 },
  ];
  const todOrders = [
    { account: 'A', item_id: '1', sold: 9.99, fees: 1.7, cost: 4, refunded: 0, qty: 1, status: '' },
    { account: 'A', item_id: '1', sold: 9.99, fees: 0, cost: 4, refunded: 0, qty: 1, status: '' },
    { account: 'A', item_id: '4', sold: 20, fees: 3, cost: 8, refunded: 0, qty: 2, status: 'DISPATCHED' },
    { account: 'B', item_id: '3', sold: 5, fees: 1, cost: 2, refunded: 0, qty: 1, status: 'CANCELLED' },
  ];
  const TR = F.adtTodayRows({ latest, orders: todOrders, todayUtc: T, ukDay: T });
  const tr1 = TR.find(r => r.account === 'A' && r.item_id === '1'), tr4 = TR.find(r => r.item_id === '4'), tr3 = TR.find(r => r.item_id === '3');
  t('today rows: ads summed over both families, cpc_spend from the cpc family only, orders merged on (account, item)', tr1 && near(tr1.spend, 3) && near(tr1.cpc_spend, 2.5) && tr1.clicks === 12 && tr1.impressions === 150 && tr1.attr_units === 1 && near(tr1.attr_revenue, 9.99) && tr1.orders === 2 && tr1.units === 2 && near(tr1.revenue, 19.98) && tr1.sampled_at === '2026-09-27T10:02:00Z', tr1);
  t('today rows: profit only over priced orders (one order waits for its fees) with today\'s cpc spend', tr1 && near(tr1.raw_priced_sum, 4.29) && tr1.pending_fee_orders === 1 && tr1.pending_cost_orders === 0 && near(tr1.actual_profit, round2(0.8 * 4.29 - 0.96 * 2.5)), tr1);
  t('today rows: an order-only listing has NULL ad columns (no same-day sample) and law profit over its orders', tr4 && tr4.spend === null && tr4.cpc_spend === null && tr4.clicks === null && tr4.orders === 1 && tr4.units === 2 && near(tr4.actual_profit, 7.2), tr4);
  t('today rows: an ads-only listing shows the cpc leg as its loss; a cancelled order is not an order', tr3 && near(tr3.spend, 1) && tr3.orders === 0 && near(tr3.actual_profit, -0.96), tr3);
  t('today rows: yesterday\'s report day is not today; rows with neither ads nor orders do not exist (so the writer deletes them)', !TR.some(r => r.item_id === '2') && TR.length === 3 && TR.map(r => r.account + r.item_id).join(',') === 'A1,A4,B3', TR.map(r => r.account + r.item_id));
  t('today rows: the change-only tuple is stable for equal numbers, moves with a number, and keeps NULL apart from 0', F.adtTodayTuple(tr1) === F.adtTodayTuple(Object.assign({}, tr1, { sampled_at: 'x', orders_at: 'y' })) && F.adtTodayTuple(tr1) !== F.adtTodayTuple(Object.assign({}, tr1, { spend: 3.01 })) && F.adtTodayTuple(tr4) !== F.adtTodayTuple(Object.assign({}, tr4, { spend: 0 })), F.adtTodayTuple(tr4));
  /* the carry hour on the curve */
  const HC = F.adtHourCurve([
    { hour_utc: '2026-09-27T07', spend: 0.4, attr_units: 0, carry_spend: 12.5, carry_units: 3, samples: 40 },
    { hour_utc: '2026-09-27T08', spend: 3.2, attr_units: 2, carry_spend: 0, carry_units: 0, samples: 55 },
    { hour_utc: '2026-09-27T09', spend: 1.1, attr_units: 1, carry_spend: 0.3, carry_units: 0, samples: 50 },
  ]);
  t('hour curve: UTC buckets land on UK hours (07Z = 08 UK in BST) and the carry is excluded from the hour\'s spend', HC.hour_curve.length === 3 && HC.hour_curve[0].hour_uk === 8 && near(HC.hour_curve[0].spend, 0.4) && HC.hour_curve[1].hour_uk === 9 && near(HC.hour_curve[1].spend, 3.2) && HC.hour_curve[1].attr_units === 2, HC.hour_curve);
  t('hour curve: the carry is reported apart, with its hour (a listing whose first sample came later adds to it)', near(HC.carry_spend, 12.8) && HC.carry_units === 3 && HC.carry_hour_uk === 8, [HC.carry_spend, HC.carry_hour_uk]);
  /* the splice: today from the today grain, never listing_day's own today row */
  const srcY = F.adtDaySrc(P('d7'), T), srcT = F.adtDaySrc(P('today'), T), srcW = F.adtDaySrc(P('this_week'), T);
  t('splice: a window ending yesterday reads adtool_listing_day alone', srcY === 'adtool_listing_day', srcY);
  t('splice: a window that includes today unions listing_day BEFORE today with the today grain for today', /adtool_listing_day WHERE day < '2026-09-27'/.test(srcT) && /UNION ALL/.test(srcT) && /adtool_listing_today WHERE uk_day = '2026-09-27'/.test(srcT) && srcW === srcT, srcT);
  t('splice: the today half carries today\'s weekday (Sun = 6) and day-of-month, and NULL ad columns read as 0 in sums', / 6 AS weekday, 27 AS dom/.test(srcT) && /COALESCE\(spend, 0\)/.test(srcT), srcT.slice(srcT.indexOf('UNION')));

  /* 19. Review fixes (27 Sep 2026): the gate before the cache, the sampling window from Pacific midnight, the
     23:00–07:05 UTC BST hole, the cut list under a window that includes today, the period caps, unpriced counts. */
  /* the route handler refuses a role outside ADTOOL_ROLES before the KV page cache is consulted: a CS session against
     a pre-warmed key gets 'auth', never the payload */
  t('gate: CS, Lister, Hunter and an empty role are refused before the cache; the three advertising roles and super pass', !F.adtRoleAllowed({ role: 'CS' }) && !F.adtRoleAllowed({ role: 'Lister' }) && !F.adtRoleAllowed({ role: 'Hunter' }) && !F.adtRoleAllowed({}) && !F.adtRoleAllowed(null) && F.ADTOOL_ROLES.every(r => F.adtRoleAllowed({ role: r })) && F.adtRoleAllowed({ role: 'CS', super: true }), F.ADTOOL_ROLES);
  /* the sampling window moves with the US clock: Pacific midnight is 07:00 UTC in PDT and 08:00 UTC in PST */
  const winSummer = new Date('2026-09-27T07:20:00Z'), winWinter = new Date('2026-11-02T07:20:00Z'), winWinterOk = new Date('2026-11-02T08:20:00Z');
  t('sampling window: 27 Sep (PDT) opens at 07:05 UTC and 07:20 is inside it', F.adtPacificOffsetMin(winSummer) === 420 && F.adtSamplingFromMin(winSummer) === 425 && F.adtInSamplingWindow(winSummer) && F.adtSamplingFromText(winSummer) === '07:05 UTC' && F.adtSamplingWindowText(winSummer) === '07:05–23:59 UTC', [F.adtPacificOffsetMin(winSummer), F.adtSamplingFromText(winSummer)]);
  t('sampling window: 2 Nov 07:20 UTC (PST) is OUTSIDE the window — the freshness row reads PASS, not FAIL — and 08:20 is inside', F.adtPacificOffsetMin(winWinter) === 480 && F.adtSamplingFromMin(winWinter) === 485 && !F.adtInSamplingWindow(winWinter) && F.adtInSamplingWindow(winWinterOk) && F.adtSamplingFromText(winWinter) === '08:05 UTC', [F.adtPacificOffsetMin(winWinter), F.adtSamplingFromText(winWinter)]);
  t('sampling window: 23:30 UTC is inside, 00:10 UTC is not', F.adtInSamplingWindow(new Date('2026-09-27T23:30:00Z')) && !F.adtInSamplingWindow(new Date('2026-09-28T00:10:00Z')), null);
  /* BST 23:00–07:05 UTC: the UK day has turned (28 Sep) while the newest samples still carry report_day 27 Sep */
  const holeLatest = [{ account: 'A', item_id: '1', family: 'cpc', report_day: '2026-09-27', sampled_at: '2026-09-27T23:55:00Z', cum_spend: 40, cum_clicks: 100, cum_units: 3, cum_revenue: 30, cum_impressions: 900 }];
  const holeOrders = [{ account: 'A', item_id: '1', sold: 9.99, fees: 1.7, cost: 4, refunded: 0, qty: 1, status: '' }];
  const split = F.adtTodayRows({ latest: [{ account: 'A', item_id: '1', report_day: '2026-09-26', family: 'cpc', cum_spend: 10, cum_clicks: 5, cum_units: 1, cum_revenue: 8, sampled_at: '2026-09-26T23:20:00Z' }],
    orders: [{ account: 'A', item_id: '1', status: '', qty: 1, sold: 9, ebay_fees: 1.2, cost: 3, refunded: 0 }], todayUtc: '2026-09-26', ukDay: '2026-09-27' });
  t('today grain: after UK midnight but before 00:00 UTC the ads are yesterday\'s eBay day and the orders today\'s — profit is not netted (null), ads and orders both kept', split.length === 1 && split[0].actual_profit === null && near(split[0].spend, 10) && split[0].orders === 1 && split[0].uk_day === '2026-09-27' && split[0].report_day === '2026-09-26', split[0]);
  const hole = F.adtTodayRows({ latest: holeLatest, orders: holeOrders, todayUtc: '2026-09-28', ukDay: '2026-09-28' });
  t('today rows at 01:30 UK: yesterday\'s report day is not a sample for today — ad columns NULL, profit over the priced order alone', hole.length === 1 && hole[0].spend === null && hole[0].cpc_spend === null && hole[0].report_day === '2026-09-28' && near(hole[0].actual_profit, 0.8 * 4.29), hole[0]);
  const staleRow = { report_day: '2026-09-27', spend: 40, cpc_spend: 40, clicks: 100, impressions: 900, attr_units: 3, attr_revenue: 30, raw_priced_sum: 4.29, refunds: 0, actual_profit: round2(0.8 * 4.29 - 0.96 * 40), sampled_at: '2026-09-27T23:55:00Z' };
  const honest = F.adtTodayRowHonest(Object.assign({}, staleRow), '2026-09-28');
  t('today reader: a stored row still on yesterday\'s report day reads as unsampled — no £38 of Sunday cpc as today\'s loss', honest.spend === null && honest.clicks === null && honest.sampled_at === null && near(honest.actual_profit, 0.8 * 4.29) && F.adtTodayRowHonest(Object.assign({}, staleRow), '2026-09-27').spend === 40, honest);
  const srcHole = F.adtDaySrc(F.adtPeriod({ period: 'today' }, '2026-09-28'), '2026-09-28', '2026-09-28');
  t('splice: the today half guards every ad column and the cpc leg of profit on report_day = the UTC day', (srcHole.match(/report_day = '2026-09-28'/g) || []).length >= 7 && /ELSE ROUND\(0\.8 \* COALESCE\(raw_priced_sum, 0\) - COALESCE\(refunds, 0\), 2\) END AS actual_profit/.test(srcHole) && /uk_day = '2026-09-28'/.test(srcHole), srcHole.slice(srcHole.indexOf('UNION')));
  /* period caps and the inverted custom window */
  err = ''; try { F.adtPeriod({ period: 'd999' }, T); } catch (e) { err = String(e.message); }
  t('period: dN past 120 days is refused (d999 would scan the table from 2023)', /^SAY: .*120 days/.test(err) && F.adtPeriod({ period: 'd120' }, T).days === 120, err);
  err = ''; try { F.adtPeriod({ period: 'custom', from: '2026-10-01', to: '2026-10-05' }, T); } catch (e) { err = String(e.message); }
  t('period: a custom range that starts after today is refused, never echoed as −3 days', /^SAY: .*starts after today/.test(err), err);
  const lone = F.adtPeriod({ from: '2026-09-25' }, T);
  t('period: a lone from is a one-day custom range, not a silent d30', lone.key === 'custom' && lone.days === 1 && lone.from === '2026-09-25' && lone.to === '2026-09-25', lone);
  /* unpriced orders are counted once, not once per missing field */
  const unp = F.adtSheetLawOrders([{ sold: 10, fees: 0, cost: 0 }, { sold: 10, fees: 0, cost: 0 }, { sold: 10, fees: 0, cost: 0 }]);
  t('law: three orders lacking both fees and cost are 3 unpriced (both buckets say 3 — the sum would say 6)', unp.unpriced_orders === 3 && unp.pending_cost_orders === 3 && unp.pending_fee_orders === 3, unp);
  const unp2 = F.adtSheetLawOrders([{ sold: 10, fees: 1, cost: 0 }, { sold: 10, fees: 0, cost: 3 }, { sold: 10, fees: 1, cost: 3 }]);
  t('law: one order without cost and one without fees are 2 unpriced; the priced one is in the sum', unp2.unpriced_orders === 2 && near(unp2.raw_priced_sum, 6) && tr1.unpriced_orders === 1 && tr4.unpriced_orders === 0, unp2);
  t('today rows: the change-only tuple moves when the unpriced count moves', F.adtTodayTuple(tr1) !== F.adtTodayTuple(Object.assign({}, tr1, { unpriced_orders: 2 })), null);

  /* ---- Phase 3 (big update): CPC ratios and the Overview trend ---- */
  /* acos = spend ÷ attr_revenue, avg_cpc = spend ÷ clicks, cvr = attr_units ÷ clicks, roas = attr_revenue ÷ spend */
  const cd = F.adtCpcDerived({ spend: 40, clicks: 100, attr_units: 4, attr_revenue: 120 });
  t('cpc: acos / avg_cpc / cvr / roas on a normal row', near(cd.acos, 40 / 120) && near(cd.avg_cpc, 0.4) && near(cd.cvr, 0.04) && near(cd.roas, 3), cd);
  const cdz = F.adtCpcDerived({ spend: 0, clicks: 0, attr_units: 0, attr_revenue: 0 });
  t('cpc: every ratio is null on a fully-zero row (no divide-by-zero anywhere)', cdz.acos === null && cdz.avg_cpc === null && cdz.cvr === null && cdz.roas === null, cdz);
  const cdNoClicks = F.adtCpcDerived({ spend: 8, clicks: 0, attr_units: 0, attr_revenue: 24 });
  t('cpc: spent money with 0 clicks — avg_cpc / cvr null, but roas is a real 3× and acos divides by revenue', cdNoClicks.avg_cpc === null && cdNoClicks.cvr === null && near(cdNoClicks.roas, 3) && near(cdNoClicks.acos, 8 / 24), cdNoClicks);
  const cdNoSpend = F.adtCpcDerived({ spend: 0, clicks: 0, attr_units: 2, attr_revenue: 30 });
  t('cpc: roas null when spend is 0 even though there is attributed revenue; acos still divides by revenue', cdNoSpend.roas === null && near(cdNoSpend.acos, 0) && cdNoSpend.avg_cpc === null, cdNoSpend);
  const ctot = F.adtCpcTotals([{ spend: 10, attr_revenue: 30, clicks: 20, attr_units: 2, orders: 3, units: 4, actual_profit: 5 }, { spend: 30, attr_revenue: 60, clicks: 40, attr_units: 4, orders: 1, units: 1, actual_profit: -2 }]);
  t('cpc totals: sums add up, ratios are on the sums, and NO profit key survives at the collective level', near(ctot.spend, 40) && near(ctot.attr_revenue, 90) && ctot.clicks === 60 && near(ctot.roas, 90 / 40) && near(ctot.avg_cpc, 40 / 60) && !('actual_profit' in ctot) && !Object.keys(ctot).some(k => /profit/i.test(k)), Object.keys(ctot));
  const tUp = F.adtTrend(120, 100), tDown = F.adtTrend(80, 100), tFlat = F.adtTrend(50, 50);
  t('trend: up / down / flat with delta and percent', tUp.direction === 'up' && near(tUp.delta, 20) && near(tUp.pct, 0.2) && tDown.direction === 'down' && near(tDown.delta, -20) && tFlat.direction === 'flat' && tFlat.delta === 0, [tUp, tDown, tFlat]);
  const tNew = F.adtTrend(30, 0), tZero = F.adtTrend(0, 0);
  t('trend: a rise from zero is direction up with pct null (an infinite rise the view shows as "new"); 0 → 0 is flat with pct 0', tNew.direction === 'up' && tNew.pct === null && tZero.direction === 'flat' && tZero.pct === 0, [tNew, tZero]);
  /* the Overview's profit_view counts must survive the collective-profit strip for a non-profit role (Advertising
     Manager) while a genuine fleet profit sum on the same object does NOT */
  const ov = { profit_view: { profitable_listings: 12, losing_listings: 5, weeks: [{ iso_week: '2026-W39', profitable: 10, losing: 6 }], top_movers: [{ item_id: '123', prev_profit: -4, cur_profit: 9, delta: 13 }] }, account_profit: 999, totals: { spend: 100, roas: 2 } };
  F.adtStripCollectiveProfit(ov, { keepCollective: false });
  t('overview strip: profit_view counts + week profitable/losing + item movers survive for a non-profit role; a collective account_profit sum is still stripped', ov.profit_view && ov.profit_view.profitable_listings === 12 && ov.profit_view.losing_listings === 5 && ov.profit_view.weeks[0].profitable === 10 && ov.profit_view.weeks[0].losing === 6 && ov.profit_view.top_movers[0].cur_profit === 9 && ov.profit_view.top_movers[0].prev_profit === -4 && !('account_profit' in ov), ov);
  const ovKeep = { profit_view: { profitable_listings: 3 }, account_profit: 42 };
  F.adtStripCollectiveProfit(ovKeep, { keepCollective: true });
  t('overview strip: a profit role keeps everything (account_profit too)', ovKeep.profit_view.profitable_listings === 3 && ovKeep.account_profit === 42, ovKeep);
  t('impressions floor constant is the 18 Sep campaign-truth start', F.ADTOOL_IMPRESSIONS_FROM === '2026-09-18', F.ADTOOL_IMPRESSIONS_FROM);

  /* ---- Phase 5 (big update): the observed sale-event lifecycle ---- */
  /* the discount buyers actually paid, from the day's orders vs the listed price (AZHAR ABRT 23 Sep proof: listed
     11.99, paid 11.39 → 5% off) */
  const dObs = F.adtSaleDiscountObserved([{ qty: 1, sale_price: 11.39, status: 'ACTIVE' }, { qty: 1, sale_price: 11.39, status: 'ACTIVE' }], 11.99);
  t('sale discount: buyers paid 11.39 on a listed 11.99 → observable 5% off, discounted true', dObs.observable && near(dObs.pct, 0.05) && dObs.discounted === true && dObs.units === 2, dObs);
  const dFull = F.adtSaleDiscountObserved([{ qty: 2, sale_price: 23.98, status: 'ACTIVE' }], 11.99);
  t('sale discount: buyers paid the full price → observable but not discounted (pct 0)', dFull.observable && near(dFull.pct, 0) && dFull.discounted === false, dFull);
  const dNone = F.adtSaleDiscountObserved([{ qty: 1, sale_price: 0, status: 'CANCELLED' }], 11.99);
  t('sale discount: no non-cancelled order → not observable, pct null (cannot observe today)', dNone.observable === false && dNone.pct === null, dNone);
  const dNoPrice = F.adtSaleDiscountObserved([{ qty: 1, sale_price: 10, status: 'ACTIVE' }], 0);
  t('sale discount: a zero listed price is not observable (no divide-by-zero)', dNoPrice.observable === false && dNoPrice.pct === null, dNoPrice);
  /* discount-text parser */
  t('sale discount text: "5% off" → 0.05, "£3 off" → null, "" → null', near(F.adtParseDiscountPct('5% off'), 0.05) && F.adtParseDiscountPct('£3 off') === null && F.adtParseDiscountPct('') === null, [F.adtParseDiscountPct('5% off'), F.adtParseDiscountPct('£3 off')]);

  /* the brief's worked example: a 1,1,0 sequence with removal observed 2026-09-10 → removed_on 10 Sep,
     restriction_end 24 Sep, eligible_on 24 Sep */
  const tlEx = F.adtSaleTimeline(
    [{ day: '2026-09-08', in_sale: 1, basis: 'list', promo_id: 'P1', discount_pct: 0.05 }, { day: '2026-09-09', in_sale: 1, basis: 'list', promo_id: 'P1', discount_pct: 0.05 }, { day: '2026-09-10', in_sale: 0, basis: 'none', promo_id: '', discount_pct: null }],
    [], '2026-09-12');
  t('sale timeline: 1,1,0 removed 10 Sep → removed_on 2026-09-10, restriction_end 2026-09-24, eligible_on 2026-09-24 (brief example)', tlEx.removed_on === '2026-09-10' && tlEx.restriction_end === '2026-09-24' && tlEx.eligible_on === '2026-09-24' && tlEx.added_on === '2026-09-08' && tlEx.status === 'waiting', tlEx);
  /* a whole-shop 'any' item that never flips to 0 → in_sale stays true, removal not observable (removed_on null) */
  const tlAny = F.adtSaleTimeline(
    [{ day: '2026-09-24', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-25', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }],
    [], '2026-09-26');
  t('sale timeline: a whole-shop item with an observed discount and no removal stays in-sale, removed_on null, status live', tlAny.removed_on === null && tlAny.in_sale === true && tlAny.status === 'live' && tlAny.eligible_on === null, tlAny);
  const tlAnyUnconf = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: null }], [], '2026-09-26');
  t('sale timeline: whole-shop event running, no order to observe the discount → added-unconfirmed', tlAnyUnconf.status === 'added-unconfirmed' && tlAnyUnconf.in_sale === true, tlAnyUnconf);
  /* the event text parses to 5% but no order confirms it → still added-unconfirmed, never a false "live" (finding: the parsed discount must not resolve to live) */
  const tlParsed = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'event' }], [], '2026-09-26');
  t('sale timeline: event text 5% but no order → added-unconfirmed (parsed discount never reads as live)', tlParsed.status === 'added-unconfirmed', tlParsed);
  const tlNotDisc = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0, disc_src: 'observed' }], [], '2026-09-26');
  t('sale timeline: an order shows buyers paid full price → not-discounted', tlNotDisc.status === 'not-discounted', tlNotDisc);
  /* the net-neutral ÷0.95 enrolment raise (AZHAR ABRT 23 Sep): a price move during a live event whose orders still
     show the discount is NOT a removal — status stays live, removed_on null, no eligible clock, no spurious task */
  const tlNeutralRaise = F.adtSaleTimeline(
    [{ day: '2026-09-22', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-23', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-24', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }],
    [{ day: '2026-09-20', price: 11.39 }, { day: '2026-09-23', price: 11.99 }], '2026-09-24');
  t('sale timeline: a ÷0.95 raise with buyers still observed at the discount → status live, removed_on null, eligible_on null (finding: net-neutral raise is not a removal)', tlNeutralRaise.status === 'live' && tlNeutralRaise.removed_on === null && tlNeutralRaise.eligible_on === null, tlNeutralRaise);
  /* but the SAME price move with no order to confirm the discount still reads as eBay's silent removal */
  const tlUnconfRaise = F.adtSaleTimeline(
    [{ day: '2026-09-22', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'event' }, { day: '2026-09-23', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'event' }],
    [{ day: '2026-09-20', price: 11.39 }, { day: '2026-09-23', price: 11.99 }], '2026-09-23');
  t('sale timeline: a price move with no order to confirm the discount still reads as removed', tlUnconfRaise.status === 'removed' && tlUnconfRaise.removed_by === 'price', tlUnconfRaise);
  /* a price change DURING a live event sets removed_on = the change day and eligible_on = change + 14 */
  const tlPrice = F.adtSaleTimeline(
    [{ day: '2026-09-01', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05 }, { day: '2026-09-02', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05 }, { day: '2026-09-03', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05 }],
    [{ day: '2026-08-20', price: 10.0 }, { day: '2026-09-02', price: 9.5 }], '2026-09-03');
  t('sale timeline: a price change during a live event → removed_on 2026-09-02, eligible_on 2026-09-16 (change + 14), status removed', tlPrice.removed_on === '2026-09-02' && tlPrice.removed_by === 'price' && tlPrice.eligible_on === '2026-09-16' && tlPrice.status === 'removed', tlPrice);
  /* an item never in any sale → no-event, no fabricated dates */
  const tlNone = F.adtSaleTimeline([], [], '2026-09-28');
  t('sale timeline: no membership at all → no-event, no dates', tlNone.status === 'no-event' && tlNone.added_on === null && tlNone.removed_on === null, tlNone);
  /* the status vocabulary is decided purely by adtSaleStatus */
  t('sale status: waiting inside the 14 days, eligible once the clock is over', F.adtSaleStatus({ today: '2026-09-20', in_sale: false, removed_on: '2026-09-10', eligible_on: '2026-09-24' }) === 'waiting' && F.adtSaleStatus({ today: '2026-09-25', in_sale: false, removed_on: '2026-09-10', eligible_on: '2026-09-24' }) === 'eligible', null);
  /* the timeline restarts eligibility once a later price change pushes it past the removal restriction */
  const tlLater = F.adtSaleTimeline(
    [{ day: '2026-09-08', in_sale: 1, basis: 'list', promo_id: 'P1', discount_pct: 0.05 }, { day: '2026-09-10', in_sale: 0, basis: 'none', promo_id: '', discount_pct: null }],
    [{ day: '2026-09-01', price: 10 }, { day: '2026-09-15', price: 9 }], '2026-09-20');
  t('sale timeline: a price change after removal (15 Sep) pushes eligible_on to 29 Sep = max(24 Sep restriction, 15 Sep + 14)', tlLater.eligible_on === '2026-09-29', tlLater);

  /* 16. 30 Sep audit fixes — the KV page-cache key, the warm horizon, the sale lifecycle, decisions on the law, the
     BST splice, the CPC post verdict, real-profit scenarios, week labels, CVR precision */
  /* (a) the pages' real default payloads (grep of each view's api() call) hash to the key the hourly warm writes */
  const kk = (a, p) => F.adtKvKey(a, 'p', p);
  t('kv key: War room {period:d30} (view-adtool-plan.js) = the warm\'s {}', kk('adtoolPlan', { period: 'd30' }) === kk('adtoolPlan', {}), [kk('adtoolPlan', { period: 'd30' }), kk('adtoolPlan', {})]);
  t('kv key: Accounts {account:"", period:d30} (view-adtool-analytics.js) = {} — the empty account is "all"', kk('adtoolAccounts', { account: '', period: 'd30' }) === kk('adtoolAccounts', {}) && kk('adtoolAccounts', { period: 'd30', account: '' }) === kk('adtoolAccounts', {}), null);
  t('kv key: Categories / Overview {period:d30} = {}', kk('adtoolCategories', { period: 'd30' }) === kk('adtoolCategories', {}) && kk('adtoolOverview', { period: 'd30' }) === kk('adtoolOverview', {}), null);
  t('kv key: CPC {period:d30, mode:active} (view-adtool-cpc.js, CP.mode default) = {} and {period:d30, mode:post} = {mode:post}', kk('adtoolCpcListings', { period: 'd30', mode: 'active' }) === kk('adtoolCpcListings', {}) && kk('adtoolCpcListings', { period: 'd30', mode: 'post' }) === kk('adtoolCpcListings', { mode: 'post' }) && kk('adtoolCpcListings', { mode: 'post' }) !== kk('adtoolCpcListings', {}), null);
  t('kv key: a non-default window is a different key; key order does not matter; null/undefined drop like ""', kk('adtoolPlan', { period: 'd7' }) !== kk('adtoolPlan', {}) && kk('adtoolPlan', { account: 'X', period: 'd7' }) === kk('adtoolPlan', { period: 'd7', account: 'X' }) && kk('adtoolRunToday', { account: null }) === kk('adtoolRunToday', {}) && kk('adtoolRunToday', { account: '' }) === kk('adtoolRunToday', {}), null);
  t('kv key: an action without a listed default keeps its period (adtoolListing answers a window differently from none)', kk('adtoolListing', { item_id: '1', period: 'd30' }) !== kk('adtoolListing', { item_id: '1' }) && JSON.stringify(F.adtKvCanon('adtoolListing', { period: 'd30', item_id: '1' })) === '{"item_id":"1","period":"d30"}', F.adtKvCanon('adtoolListing', { period: 'd30', item_id: '1' }));
  t('kv key: the profit class stays in the key', kk('adtoolPlan', {}) !== F.adtKvKey('adtoolPlan', 'np', {}), null);
  const wu1 = F.adtWarmUntil(Date.parse('2026-09-30T13:21:40Z')), wu2 = F.adtWarmUntil(Date.parse('2026-09-30T13:24:30Z')), wu3 = F.adtWarmUntil(Date.parse('2026-09-30T13:26:00Z'));
  t('warm horizon: a warm at 13:21 is honoured to 14:25 (the next :20 rollup + 5 min), one at 13:24 or 13:26 to 14:25 too — never a horizon under 5 min', wu1 === Date.parse('2026-09-30T14:25:00Z') && wu2 === Date.parse('2026-09-30T14:25:00Z') && wu3 === Date.parse('2026-09-30T14:25:00Z') && (wu1 - Date.parse('2026-09-30T13:21:40Z')) <= 65 * 60000, [new Date(wu1).toISOString(), new Date(wu2).toISOString()]);
  t('warm horizon: at 13:19 the next :25 is 13:25 — over 5 min ahead, so it is used', F.adtWarmUntil(Date.parse('2026-09-30T13:19:00Z')) === Date.parse('2026-09-30T13:25:00Z'), null);
  /* (b) the sale lifecycle */
  const tlExpire = F.adtSaleTimeline(
    [{ day: '2026-09-01', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05 }, { day: '2026-09-02', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05 }, { day: '2026-09-03', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05 }],
    [{ day: '2026-08-20', price: 10.0 }, { day: '2026-09-02', price: 9.5 }], '2026-09-20');
  t('sale timeline: a price removal under a whole-shop event EXPIRES — on 20 Sep (eligible_on 16 Sep passed) it reads eligible, not removed for ever', tlExpire.status === 'eligible' && tlExpire.eligible_on === '2026-09-16' && tlExpire.eligible_basis === 'price clock' && F.adtSaleStatus({ today: '2026-09-15', in_sale: true, removed_by: 'price', removed_on: '2026-09-02', eligible_on: '2026-09-16' }) === 'removed', tlExpire);
  const tlRaiseNoOrder = F.adtSaleTimeline(
    [{ day: '2026-09-22', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-23', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-25', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'event' }],
    [{ day: '2026-09-20', price: 11.39 }, { day: '2026-09-23', price: 11.99 }], '2026-09-25');
  t('sale timeline: a proven ÷0.95 raise followed by a NO-ORDER day stays live (removed_on null) — the proof since the change is not undone by an event-text day', tlRaiseNoOrder.status === 'live' && tlRaiseNoOrder.removed_on === null && tlRaiseNoOrder.eligible_on === null, tlRaiseNoOrder);
  const tlRaiseFull = F.adtSaleTimeline(
    [{ day: '2026-09-22', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-23', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-25', in_sale: 1, basis: 'any', promo_id: 'W1', discount_pct: 0, disc_src: 'observed' }],
    [{ day: '2026-09-20', price: 11.39 }, { day: '2026-09-23', price: 11.99 }], '2026-09-25');
  t('sale timeline: … but an OBSERVED full-price day after the raise reads as removed by the price change (eligible 7 Oct)', tlRaiseFull.status === 'removed' && tlRaiseFull.removed_by === 'price' && tlRaiseFull.eligible_on === '2026-10-07', tlRaiseFull);
  const tlNonMember = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 0, basis: 'none', promo_id: '', event_promo: 'L1', discount_pct: null }], [], '2026-09-26');
  t('sale timeline: a non-member of a listed-items (BY_VALUE) event reads eligible (event_running from the account\'s event_promo), not no-event', tlNonMember.status === 'eligible' && tlNonMember.event_running === true && F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 0, basis: 'none', promo_id: '', event_promo: '', discount_pct: null }], [], '2026-09-26').status === 'no-event', tlNonMember);
  const tlEnded = F.adtSaleTimeline(
    [{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-27', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05, disc_src: 'observed' }, { day: '2026-09-28', in_sale: 0, basis: 'none', promo_id: '', event_promo: '', discount_pct: null }],
    [], '2026-09-30');
  t('sale timeline: the in_sale=0 row written when the account\'s event ends starts the clock — removed 28 Sep, waiting until 12 Oct', tlEnded.status === 'waiting' && tlEnded.removed_on === '2026-09-28' && tlEnded.removed_by === 'flip' && tlEnded.eligible_on === '2026-10-12', tlEnded);
  const tlPreSnap = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05, disc_src: 'event' }], [{ day: '2026-09-19', price: 10 }, { day: '2026-09-24', price: 9 }], '2026-09-26');
  t('sale timeline: a price change BEFORE the first snapshot (24 Sep) still yields eligible_on = 8 Oct on the price clock for a whole-shop listing not yet observed at the discount', tlPreSnap.eligible_on === '2026-10-08' && tlPreSnap.eligible_basis === 'price clock' && tlPreSnap.status === 'added-unconfirmed', tlPreSnap);
  const tlPreSnapProven = F.adtSaleTimeline([{ day: '2026-09-26', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.05, disc_src: 'observed' }], [{ day: '2026-09-19', price: 10 }, { day: '2026-09-24', price: 9 }], '2026-09-26');
  t('sale timeline: … unless an order proves the discount, then it is live with no date', tlPreSnapProven.status === 'live' && tlPreSnapProven.eligible_on === null, tlPreSnapProven);
  const evEnding = { promo_id: 'A', ends: '2026-09-27', status: 'RUNNING' };
  t('sale successor: a SCHEDULED replacement starting the day after covers the account (no event-ending task); a running-only set misses it', F.adtSaleSuccessor([evEnding, { promo_id: 'B', starts: '2026-09-28', ends: '2026-10-08', status: 'SCHEDULED' }], evEnding) === true && F.adtSaleSuccessor([evEnding], evEnding) === false, null);
  t('sale successor: a replacement that starts later than the day after leaves a gap — the task still opens; one ending no later does not count', F.adtSaleSuccessor([evEnding, { promo_id: 'B', starts: '2026-10-01', ends: '2026-10-08' }], evEnding) === false && F.adtSaleSuccessor([evEnding, { promo_id: 'B', starts: '2026-09-20', ends: '2026-09-27' }], evEnding) === false, null);
  t('sale discount: a 1 % paid difference is observable but NOT discounted (rounding / a coupon), so the snapshot writes 0', F.adtSaleDiscountObserved([{ qty: 1, sale_price: 11.87, status: 'ACTIVE' }], 11.99).discounted === false && F.adtSaleDiscountObserved([{ qty: 1, sale_price: 11.87, status: 'ACTIVE' }], 11.99).observable === true, F.adtSaleDiscountObserved([{ qty: 1, sale_price: 11.87, status: 'ACTIVE' }], 11.99));
  /* (c) decisions on the law */
  const decLawNeg = Object.assign({}, decAgree, { y: { spend: 3, attr_units: 1, attr_revenue: 12, ad_profit: 4, actual_profit: -2 }, d7: { spend: 21, attr_units: 6, attr_revenue: 80, ad_profit: 10, actual_profit: -12, pending_cost_orders: 0, pending_fee_orders: 0 }, d30: { spend: 90, attr_units: 25, attr_revenue: 340, ad_profit: 35, actual_profit: -40, pending_cost_orders: 0, pending_fee_orders: 0 }, halves: [1, 1], halves_actual: [-1, -1], profile_today: 1, profile_today_actual: -1.5 });
  const dLaw = F.adtDecide(decLawNeg), dEst = F.adtDecide(decLawNeg, 'adprofit');
  t('decide: a listing losing REAL money for 30 days is STOP S1 on the law even though the old estimate reads positive (EV on the law, no estimate veto)', dLaw.decision === 'STOP' && dLaw.rules.indexOf('S1') >= 0 && dLaw.confidence === 'confident' && dLaw.ev < 0 && dLaw.ev_basis === 'law' && dEst.decision !== 'STOP', [dLaw.decision, dLaw.ev, dEst.decision]);
  t('decide: the EV printed on the card is the law EV and says so', /EV −£\d+\.\d\d, law\)/.test(dLaw.why) && /today expected −£1\.50/.test(dLaw.why), dLaw.why);
  const decUnpriced = Object.assign({}, decLawNeg, { d30: Object.assign({}, decLawNeg.d30, { pending_cost_orders: 2, pending_fee_orders: 1 }) });
  const dUnp = F.adtDecide(decUnpriced);
  t('decide: unpriced orders in the window → the S1 STOP is never confident (watch, with the reason), consistent with A02 / Running today', dUnp.decision === 'STOP' && dUnp.confidence === 'watch' && /3 orders unpriced in the window/.test(dUnp.why) && dUnp.unpriced === 3, [dUnp.confidence, dUnp.why]);
  const dHard = F.adtDecide(Object.assign({}, decUnpriced, { margin: 0 }));
  t('decide: a hard stop (S4, no margin) stays confident regardless of unpriced orders — it does not read profit', dHard.decision === 'STOP' && dHard.rules.indexOf('S4') >= 0 && dHard.confidence === 'confident', [dHard.rules, dHard.confidence]);
  t('decide: hand-built inputs without law windows keep the estimate EV and say so', F.adtDecide(base).ev_basis === 'estimate' && /, estimate\)/.test(F.adtDecide(base).why), F.adtDecide(base).why);
  t('decide: a sampled yesterday is labelled provisional', /provisional/.test(F.adtDecide(Object.assign({}, base, { y_source: 'sampled' })).why), null);
  /* (d) the BST hour: UK day rolled ahead of eBay's report day */
  const srcBst = F.adtDaySrc(F.adtPeriod({ period: 'today' }, '2026-09-28'), '2026-09-28', '2026-09-27');
  t('splice: at 00:30 UK BST (23:30 UTC) the live test needs uk_day = report_day too, so 27 Sep\'s whole ad day never lands on 28 Sep\'s row', (srcBst.match(/\(report_day = '2026-09-27' AND uk_day = report_day\)/g) || []).length >= 7, srcBst.slice(srcBst.indexOf('UNION')));
  const bstRow = F.adtTodayRowHonest({ report_day: '2026-09-27', uk_day: '2026-09-28', spend: 40, cpc_spend: 40, clicks: 100, impressions: 900, attr_units: 3, attr_revenue: 30, raw_priced_sum: 4.29, refunds: 0, actual_profit: null, sampled_at: '2026-09-27T23:55:00Z' }, '2026-09-27');
  t('today reader: a row whose UK day (28 Sep) has rolled ahead of its report day (27 Sep) reads order-only — ad columns null, profit without the cpc leg', bstRow.spend === null && bstRow.clicks === null && near(bstRow.actual_profit, 0.8 * 4.29) && F.adtTodayRowHonest({ report_day: '2026-09-27', uk_day: '2026-09-27', spend: 40 }, '2026-09-27').spend === 40 && F.adtTodayRowHonest({ report_day: '2026-09-27', spend: 40 }, '2026-09-27').spend === 40, bstRow);
  /* (f) CPC post: did sales hold? — per-day rates, too early under 7 after-days */
  const heldEarly = F.adtCpcHeld({ from: '2026-08-29', to: '2026-09-27', units: 30 }, { from: '2026-09-28', to: '2026-09-29', units: 2 });
  t('cpc post: an ad stopped 2 days ago is "too early", not "fell" — 2 units in 2 days is the same daily rate as 30 in 30', heldEarly.held === 'too early' && heldEarly.held_rule.length > 10, heldEarly);
  const bH = { from: '2026-08-01', to: '2026-08-30', units: 30 }, aH = { from: '2026-08-31', to: '2026-09-09', units: 7 };
  const heldOk = F.adtCpcHeld(bH, aH);
  t('cpc post: 30 units / 30 d before vs 7 units / 10 d after = 0.7 ≥ 0.6 × 1.0 → held; days and units_per_day are written onto both windows', heldOk.held === 'held' && bH.days === 30 && aH.days === 10 && near(bH.units_per_day, 1) && near(aH.units_per_day, 0.7), [heldOk, bH.days, aH.days]);
  t('cpc post: 30 → 3 units in 10 days fell; an after window that ends before it starts (stopped yesterday) has 0 days → too early', F.adtCpcHeld({ from: '2026-08-01', to: '2026-08-30', units: 30 }, { from: '2026-08-31', to: '2026-09-09', units: 3 }).held === 'fell' && F.adtCpcHeld({ from: '2026-08-31', to: '2026-09-29', units: 30 }, { from: '2026-09-30', to: '2026-09-29', units: 0 }).held === 'too early', null);
  /* (e) scenario A prints the real law profit; B / C are the real base plus the modelled delta */
  const scnReal = F.adtScenarios({ base_units: 20, base_spend: 40, base_revenue: 300, margin: 6, spend_elasticity: 0.5, ad_dependence28: 0.6, elasticity_levels: 4, base_actual_profit: 55.5, base_unpriced: 2 }, 0, 'Growth');
  t('scenarios: with the window\'s real law profit known, A prints it (real (law), unpriced count) and B = real base + modelled delta', scnReal[0].modelled_profit === 55.5 && scnReal[0].profit_basis === 'real (law)' && scnReal[0].unpriced === 2 && near(scnReal[1].modelled_profit, 55.5 + (scn[1].modelled_profit - scn[0].modelled_profit)) && /real base/.test(scnReal[1].profit_basis) && scn[0].profit_basis === 'modelled', [scnReal[0].modelled_profit, scnReal[1].modelled_profit, scn[1].modelled_profit - scn[0].modelled_profit]);
  /* (g) week-to-week label from the descriptor deltas */
  t('behaviour: ad dependence up → declining; elasticity up → improving; steady when nothing moved; a caller\'s label wins', wkb[1].label === 'declining' && wkbSteady[1].label === 'steady' && wkb[0].label === '' &&
    F.adtWeekBehaviour([{ iso_week: 'a', descriptors: { weekday_ratio: 1, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.4, spend_elasticity: 0.5 } }, { iso_week: 'b', descriptors: { weekday_ratio: 1, slot_hhi: 0.3, cv28: 0.5, ad_dependence28: 0.4, spend_elasticity: 0.9 } }])[1].label === 'improving' &&
    F.adtWeekBehaviour([{ iso_week: 'a', descriptors: { ad_dependence28: 0.4 } }, { iso_week: 'b', label: 'custom', descriptors: { ad_dependence28: 0.8 } }])[1].label === 'custom', [wkb[1].label, wkbSteady[1].label]);
  /* 17. 30 Sep review of the audit fixes — the price-removal observation bound, the magnitude-aware unpriced guard,
     yesterday's sample per account, provisional scores out of the headline, the sheet verdict's money under a
     stripped key, the sale snapshot's account enumeration */
  /* (a) whole-shop event: price 10.00 on D..D+9, raised to 12.50 on D+10 (÷0.8 net-neutral), an order on D+11 proves
     20 %, a second change to 15.00 on D+20 (the real removal), no orders since. The D+11 proof is OLDER than the
     standing price change, so it cannot certify the listing live: removed on D+24 AND on D+26 (no flap when the D+11
     row leaves the 14-day window), eligible D+34 */
  const tlTwoChanges = today => F.adtSaleTimeline(
    [{ day: '2026-09-01', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.2, disc_src: 'event' }, { day: '2026-09-12', in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.2, disc_src: 'observed' }, { day: today, in_sale: 1, basis: 'any', promo_id: 'W1', event_promo: 'W1', discount_pct: 0.2, disc_src: 'event' }],
    [{ day: '2026-08-20', price: 10 }, { day: '2026-09-11', price: 12.5 }, { day: '2026-09-21', price: 15 }], today);
  const tl24 = tlTwoChanges('2026-09-25'), tl26 = tlTwoChanges('2026-09-27');
  t('sale timeline: an order that proved the discount BEFORE a later price change does not keep the listing live — removed on D+24 and still on D+26, eligible D+34 (2026-10-05)', tl24.status === 'removed' && tl24.removed_by === 'price' && tl24.removed_on === '2026-09-21' && tl24.eligible_on === '2026-10-05' && tl26.status === 'removed' && tl26.eligible_on === '2026-10-05', [tl24.status, tl24.eligible_on, tl26.status]);
  t('sale timeline: … while a proof ON OR AFTER the latest change still reads live (the net-neutral raise case is unchanged)', tlNeutralRaise.status === 'live' && tlRaiseNoOrder.status === 'live', [tlNeutralRaise.status, tlRaiseNoOrder.status]);
  /* (b) the unpriced guard is magnitude-aware: −£180 over 30 days with one £12 order unpriced (at most +£9.60 once
     priced) stays a CONFIDENT S1 stop and says why; the same window with a bound that can turn the sign is watch;
     inputs without the bound (older engines, hand-built) stay watch */
  const decBig = Object.assign({}, decLawNeg, { d7: Object.assign({}, decLawNeg.d7, { actual_profit: -40, pending_fee_orders: 1 }), d30: Object.assign({}, decLawNeg.d30, { actual_profit: -180, pending_fee_orders: 1 }), unpriced_bound_30: 9.6, unpriced_bound_7: 9.6 });
  const dBig = F.adtDecide(decBig);
  t('decide: −£180 with one £12 order unpriced (bound +£9.60) is a CONFIDENT S1 stop — "cannot change the sign"', dBig.decision === 'STOP' && dBig.confidence === 'confident' && /1 order unpriced in the window/.test(dBig.why) && /at most \+£9\.60 once priced, cannot change the sign/.test(dBig.why) && dBig.unpriced_bound === 9.6, [dBig.confidence, dBig.why]);
  const dFlip = F.adtDecide(Object.assign({}, decBig, { unpriced_bound_30: 200, unpriced_bound_7: 200 }));
  t('decide: … but an unpriced sum that CAN turn the loss keeps the stop at watch, and so does a window with no bound at all', dFlip.confidence === 'watch' && /the loss is provisional/.test(dFlip.why) && F.adtDecide(Object.assign({}, decBig, { unpriced_bound_30: null, unpriced_bound_7: null })).confidence === 'watch' && dUnp.confidence === 'watch', [dFlip.confidence, dFlip.why]);
  const dFlip7 = F.adtDecide(Object.assign({}, decBig, { unpriced_bound_30: 9.6, unpriced_bound_7: 45 }));
  t('decide: the 7-day half can flip on its own (its bound is judged too) → watch', dFlip7.confidence === 'watch', dFlip7.why);
  /* (c) yesterday's sample stands in per ACCOUNT: law £24 on the row (cpc read 0) − 0.96 × £18 sampled cpc = £6.72,
     provisional; an account whose report is final keeps its row, and a row that already carries spend is the report */
  const smp = { spend: 20, cpc: 18, clicks: 40, attr_units: 2, attr_revenue: 30 };
  const syA = F.adtSampledYesterday({ spend: 0, actual_profit: 24 }, smp, 5, false), syB = F.adtSampledYesterday({ spend: 0, actual_profit: 24 }, smp, 5, true);
  t('decisions: an account WITHOUT a final report takes the closing sample for yesterday (£24 − 0.96 × £18 = £6.72, provisional, spend £20); an account whose report is in keeps its row; a row with spend is the report', syA && near(syA.actual_profit, 6.72) && syA.provisional === true && syA.spend === 20 && near(syA.ad_profit, 2 * 5 - 20) && syB === null && F.adtSampledYesterday({ spend: 12, actual_profit: 10 }, smp, 5, false) === null && F.adtSampledYesterday({ spend: 0, actual_profit: 24 }, null, 5, false) === null, syA);
  t('decisions: no row for yesterday but a sample → the sample with no law figure (null, never £0)', F.adtSampledYesterday(null, smp, 5, false).actual_profit === null && F.adtSampledYesterday(null, smp, 5, false).spend === 20, null);
  /* (d) the Stop today tally: provisional scores are named, never counted as final */
  const tally = F.adtScoreTally([{ day: '2026-09-29', provisional: 0, n: 10, scored: 8, right_n: 6 }, { day: '2026-09-29', provisional: 1, n: 30, scored: 30, right_n: 5 }, { day: '2026-09-28', provisional: 0, n: 12, scored: 12, right_n: 9 }]);
  t('score tally: 29 Sep = 40 decisions, 8 scored final, 6 right, 30 provisional — the 5 provisional "rights" never enter; 28 Sep untouched; day order kept', tally.length === 2 && tally[0].day === '2026-09-29' && tally[0].n === 40 && tally[0].scored === 8 && tally[0].right_n === 6 && tally[0].provisional === 30 && tally[1].scored === 12 && tally[1].right_n === 9 && tally[1].provisional === 0 && F.adtScoreTally([]).length === 0, tally);
  /* (e) the sheet-law verdict: the window's money sits under profit_window, which the route strip removes for a
     non-profit role — the verdict, within_window and the per-day count stay for every role */
  const slv = F.adtSheetLawVerdict([{ scope_key: 'all', status: 'PASS', ran_at: '2026-09-30 05:20' }, { scope_key: 'A', status: 'PASS', evidence: JSON.stringify({ days_pass: 5, days: 7, before_ads_delta: -12.4, before_ads_tolerance: 95, before_ads_sheet: 950 }) }]);
  t('sheet verdict: per account = status, within_window, days_pass and the money under profit_window (Δ −12.4, ±95, −1.31 %)', slv.status === 'PASS' && slv.per_account[0].within_window === true && slv.per_account[0].days_pass === 5 && slv.per_account[0].profit_window.window_delta === -12.4 && slv.per_account[0].profit_window.window_tolerance === 95 && near(slv.per_account[0].profit_window.before_ads_delta_pct, -1.31) && !('window_delta' in slv.per_account[0]), slv.per_account[0]);
  const slvNp = F.adtStripCollectiveProfit({ sheet_law_check: F.adtSheetLawVerdict([{ scope_key: 'all', status: 'PASS' }, { scope_key: 'A', status: 'PASS', evidence: JSON.stringify({ days_pass: 5, days: 7, before_ads_delta: 1, before_ads_tolerance: 25, before_ads_sheet: 50 }) }]) }, { keepCollective: false });
  const slvP = F.adtStripCollectiveProfit({ sheet_law_check: F.adtSheetLawVerdict([{ scope_key: 'all', status: 'PASS' }, { scope_key: 'A', status: 'PASS', evidence: JSON.stringify({ days_pass: 5, days: 7, before_ads_delta: 1, before_ads_tolerance: 25, before_ads_sheet: 50 }) }]) }, { keepCollective: true });
  const moneyKeys = o => Object.keys(o).filter(k => /window_delta|window_tolerance|before_ads_delta_pct|profit_window/.test(k));
  t('strip: a non-profit role gets the sheet verdict with NO money key (profit_window gone, within_window and days_pass kept); a profit role keeps it', moneyKeys(slvNp.sheet_law_check.per_account[0]).length === 0 && slvNp.sheet_law_check.per_account[0].within_window === true && slvNp.sheet_law_check.per_account[0].days_pass === 5 && slvP.sheet_law_check.per_account[0].profit_window.window_tolerance === 25, slvNp.sheet_law_check.per_account[0]);
  /* (f) the sale snapshot enumerates accounts on REAL membership days (in_sale = 1), so the in_sale = 0 rows it
     writes cannot keep an account in the loop for ever (source assertion: the query is not pure) */
  t('sale snapshot: accounts with membership in the last 30 days are read on in_sale = 1 rows only', /FROM adtool_sale_membership_day WHERE day >= \?1 AND in_sale = 1'\)\.bind\(adtAddDays\(today, -30\)\)/.test(src), null);
  t('stop today: the days tally splits by outcome_provisional and yesterday\'s tile reads the same rows', /COALESCE\(outcome_provisional, 0\) AS provisional, COUNT\(\*\) AS n, SUM\(CASE WHEN outcome_score IS NOT NULL THEN 1 ELSE 0 END\) AS scored, SUM\(outcome_score\) AS right_n FROM adtool_decisions WHERE day >= \?1 GROUP BY day, provisional/.test(src) && /const days = adtScoreTally\(B\[4\]\.results \|\| \[\]\);/.test(src), null);

  /* (h) CVR travels at 4 dp so 3.25 % is not printed as 3 % */
  t('cvr: 13 units on 400 clicks = 0.0325, not 0.03', F.adtCpcDerived({ spend: 10, clicks: 400, attr_units: 13, attr_revenue: 100 }).cvr === 0.0325 && F.round4(0.03249) === 0.0325 && F.adtCpcTotals([{ spend: 10, clicks: 400, attr_units: 13, attr_revenue: 100 }]).cvr === 0.0325, F.adtCpcDerived({ spend: 10, clicks: 400, attr_units: 13, attr_revenue: 100 }));

  const passed = results.filter(r => r.ok).length;
  const lines = results.map(r => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '  → ' + r.detail));
  return lines.join('\n') + '\n' + (passed === results.length ? 'PASS ' : 'FAIL ') + passed + '/' + results.length;
}
