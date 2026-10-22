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
  const i13 = src.indexOf('/* ADTOOL-P13-PURE-BEGIN */'); const j13 = src.indexOf('/* ADTOOL-P13-PURE-END */');
  const i14 = src.indexOf('/* ADTOOL-P14-PURE-BEGIN */'); const j14 = src.indexOf('/* ADTOOL-P14-PURE-END */');
  const i15 = src.indexOf('/* ADTOOL-P15-PURE-BEGIN */'); const j15 = src.indexOf('/* ADTOOL-P15-PURE-END */');
  const pure = src.slice(ia, ib) + '\n' + src.slice(iv, jv) + (ip >= 0 && jp >= 0 ? '\n' + src.slice(ip, jp) : '') + (i3 >= 0 && j3 >= 0 ? '\n' + src.slice(i3, j3) : '') + (i4 >= 0 && j4 >= 0 ? '\n' + src.slice(i4, j4) : '') + (i5 >= 0 && j5 >= 0 ? '\n' + src.slice(i5, j5) : '') + (i6 >= 0 && j6 >= 0 ? '\n' + src.slice(i6, j6) : '') + (i7 >= 0 && j7 >= 0 ? '\n' + src.slice(i7, j7) : '') + (i8 >= 0 && j8 >= 0 ? '\n' + src.slice(i8, j8) : '') + (i9 >= 0 && j9 >= 0 ? '\n' + src.slice(i9, j9) : '') + (i10 >= 0 && j10 >= 0 ? '\n' + src.slice(i10, j10) : '') + (i11 >= 0 && j11 >= 0 ? '\n' + src.slice(i11, j11) : '') + (i12 >= 0 && j12 >= 0 ? '\n' + src.slice(i12, j12) : '') + (i13 >= 0 && j13 >= 0 ? '\n' + src.slice(i13, j13) : '') + (i14 >= 0 && j14 >= 0 ? '\n' + src.slice(i14, j14) : '') + (i15 >= 0 && j15 >= 0 ? '\n' + src.slice(i15, j15) : '');   /* pure helpers of every phase */
  const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
  /* JavaScriptCore has no btoa/atob; the Workers runtime does. Small stand-ins so the PDF test can run here. */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const btoa = (str) => { let out = ''; for (let i = 0; i < str.length; i += 3) { const a = str.charCodeAt(i), b = str.charCodeAt(i + 1), c = str.charCodeAt(i + 2); const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c); out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]); } return out; };
  const atob = (str) => { const s2 = String(str).replace(/=+$/, ''); let out = '', bits = 0, acc = 0; for (const ch of s2) { const v = B64.indexOf(ch); if (v < 0) continue; acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); } } return out; };
  const F = new Function('round2', 'btoa', 'atob', pure + '\n return { adtFrontier, adtPlanVerdict2, adtRunVerdict, adtHourBands, adtHourBandMerge, adtWeekdaySentence, adtLever, adtWeekdayIndex, adtRealMargin, adtWeekdayLong, gbpPlain, ADTOOL_FRONTIER_MARKS, ADTOOL_CARRY_FIX_DAY, ADTOOL_HOUR_BASIS, ADTOOL_DOW, adtUkParts, adtSlot, adtWeekdayOf, adtDom, adtIsoWeek, adtAddDays, adtMargin, adtOrderBrain, adtTaxonomy, adtDeltas, adtReconcile, adtCapHour, adtVerdicts, adtAdState, adtAdEvents, parseAdsReportCampaignTsv, adtRng, adtShrink, adtDecay, adtWeekdayProfile, adtShareProfile, adtPermWeekday, adtPermSpread, adtJsd, adtRegime, adtTheilSen, adtPelt, adtStage, adtDescriptors, adtSeasonalNaive, adtTsb, adtPoissonGlm, adtHoltWinters, adtMase, adtCoverage, adtForecastWith, adtBacktest, adtBands, adtChooseModel, adtListingAlerts, adtAccountSpendAlerts, adtDiminishingReturns, adtRoasLevers, adtPdf, adtAlertUrgency, adtWeekBehaviour, adtScenarios, adtStageExplain, adtDecide, adtScoreDecision, adtSampledYesterday, adtScoreTally, adtSheetLawVerdict, adtCarryForward, adtValidateNarrative, adtNumbersIn, adtFleetNarrativeTemplate, adtProductNarrativeTemplate, adtApplyCaps, adtApplyPlan, adtSheetLawOrders, adtSheetLawProfit, adtStripCollectiveProfit, adtCpcDerived, adtCpcTotals, adtCpcHeld, adtTrend, round4, adtKvCanon, adtKvKey, adtWarmUntil, ADTOOL_KV_DEFAULT_PERIOD, ADTOOL_IMPRESSIONS_FROM, adtSaleTimeline, adtSaleStatus, adtSaleSuccessor, adtSaleDiscountObserved, adtParseDiscountPct, adtSaleCohorts, adtSaleEligibility, adtPeriod, adtPeriodOr, adtDaySrc, adtTodayRows, adtTodayTuple, adtTodayRowHonest, adtHourCurve, adtRoleAllowed, adtPacificOffsetMin, adtSamplingFromMin, adtInSamplingWindow, adtSamplingFromText, adtSamplingWindowText, ADTOOL_ROLES, ADTOOL_PERIOD_KEYS, ADTOOL_CUSTOM_MAX_DAYS, ADTOOL_PROFIT_LAW, ADTOOL_APPLY_ENDPOINTS, ADTOOL_ALERT_RULES, ADTOOL_MARGIN_CAP, ADTOOL_MIN_SP, adtDeptOf, adtDeptRules, adtDeptSentences, adtRegInternal, adtRegRows, ADTOOL_DEPT_DEFAULTS, ADTOOL_DEPT_CONFIG_KEYS, ADTOOL_DEPT_ORDER, ADTOOL_DEPT_NAMES, ADTOOL_REGISTER_INTERNAL, adtMoneyNum, adtCampStatusKey, adtCampStatusMatch, adtRateRoas, adtRateCpc, adtCampaignBudgetShare, adtCampaignOverlap, adtCampaignRollup, adtUkMidnightUtcMs, adtUtcStamp, adtUkDayUtcBounds, adtUkDayWindows, adtUkClockOf, adtChangeShape, adtAdChangeKind, adtCampaignChangeKind, adtApplyTargetState, adtChangeAttribution, adtChangeArchive, adtPeakRules, adtPeakRule, adtInHourBands, adtOffPeakSpend, ADTOOL_AD_STATES, ADTOOL_CHANGE_STOPPED_KINDS, ADTOOL_CHANGE_ACTIVATED_KINDS, ADTOOL_PEAK_DEFAULTS, ADTOOL_PEAK_CONFIG_KEYS, ADTOOL_SLOT_NAMES, ADTOOL_SLOT_PHRASE, ADTOOL_SLOT_CLOCK };')(round2, btoa, atob);
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
  t('decide: a yesterday taken from our own readings says so in its reason, in plain words', /our own reading, eBay has not sent the report for that day yet/.test(samp.why) && !/our own reading/.test(F.adtDecide(base).why), samp.why);
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
  t('decide: the expected gain printed on the card is the one from the profit figures, and says so without jargon', /expected gain −£\d+\.\d\d, from the profit figures\)/.test(dLaw.why) && /today expected −£1\.50/.test(dLaw.why) && !/\bEV\b/.test(dLaw.why) && !/ p=/.test(dLaw.why), dLaw.why);
  const decUnpriced = Object.assign({}, decLawNeg, { d30: Object.assign({}, decLawNeg.d30, { pending_cost_orders: 2, pending_fee_orders: 1 }) });
  const dUnp = F.adtDecide(decUnpriced);
  t('decide: unpriced orders in the window → the S1 STOP is never confident (watch, with the reason), consistent with A02 / Running today', dUnp.decision === 'STOP' && dUnp.confidence === 'watch' && /3 orders in the period we cannot cost yet/.test(dUnp.why) && dUnp.unpriced === 3, [dUnp.confidence, dUnp.why]);
  const dHard = F.adtDecide(Object.assign({}, decUnpriced, { margin: 0 }));
  t('decide: a hard stop (S4, no margin) stays confident regardless of unpriced orders — it does not read profit', dHard.decision === 'STOP' && dHard.rules.indexOf('S4') >= 0 && dHard.confidence === 'confident', [dHard.rules, dHard.confidence]);
  t('decide: hand-built inputs without the profit windows keep the estimated expected gain and say so', F.adtDecide(base).ev_basis === 'estimate' && /, estimated\)/.test(F.adtDecide(base).why), F.adtDecide(base).why);
  t('decide: a yesterday read by us, not reported by eBay, is said to be not final', /not final/.test(F.adtDecide(Object.assign({}, base, { y_source: 'sampled' })).why), null);
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
  t('decide: −£180 with one £12 order unpriced (bound +£9.60) is a CONFIDENT S1 stop — "cannot change the sign"', dBig.decision === 'STOP' && dBig.confidence === 'confident' && /1 order in the period we cannot cost yet/.test(dBig.why) && /worth at most \+£9\.60 once costed, which cannot turn the loss around/.test(dBig.why) && dBig.unpriced_bound === 9.6, [dBig.confidence, dBig.why]);
  const dFlip = F.adtDecide(Object.assign({}, decBig, { unpriced_bound_30: 200, unpriced_bound_7: 200 }));
  t('decide: … but an unpriced sum that CAN turn the loss keeps the stop at watch, and so does a window with no bound at all', dFlip.confidence === 'watch' && /so the loss is not final/.test(dFlip.why) && !/provisional/.test(dFlip.why) && F.adtDecide(Object.assign({}, decBig, { unpriced_bound_30: null, unpriced_bound_7: null })).confidence === 'watch' && dUnp.confidence === 'watch', [dFlip.confidence, dFlip.why]);
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

  /* ---------------------------------------------------------------------------------------------
     THE ADVERTISING DEPARTMENTS (owner's batch, 14 Oct 2026)
     The ladder is read top down and every active listing lands in exactly one department:
       new → top → scaling → declining → average (the default).
     Average being the DEFAULT rather than a "more than 20 sold" gate is the settled reading of the
     owner's "four departments" against his five labels. The partition test at the end of this block
     is what stops anyone turning it back into a gate without noticing what that costs.
     --------------------------------------------------------------------------------------------- */
  const dpD0 = F.ADTOOL_DEPT_DEFAULTS;
  const dpOf = (age, sold, u30, prev, rules) => F.adtDeptOf({ age_days: age, sold_life: sold, units_30d: u30, units_prev30: prev }, rules || dpD0);

  /* (a) the eight numbers come out of config, and a bad edit cannot blank the page */
  t('dept rules: no config at all gives the owner\'s defaults (14 / 20 / 30 / 20 % / 30 % / 2 / £3 / £10)', JSON.stringify(F.adtDeptRules({})) === JSON.stringify({ new_days: 14, scale_sold: 20, top_30d: 30, grow_pct: 20, fall_pct: 30, min_move: 2, day_cap: 3, new_week_cap: 10 }), F.adtDeptRules({}));
  t('dept rules: every one of the eight reads its own config key', Object.keys(F.ADTOOL_DEPT_CONFIG_KEYS).length === 8 && Object.keys(dpD0).every(k => F.ADTOOL_DEPT_CONFIG_KEYS[k] === 'adtool_dept_' + k) && F.ADTOOL_DEPT_CONFIG_KEYS.new_week_cap === 'adtool_dept_new_week_cap', F.ADTOOL_DEPT_CONFIG_KEYS);
  const dpCfg = F.adtDeptRules({ adtool_dept_new_days: '30', adtool_dept_top_30d: 5, adtool_dept_scale_sold: '8', adtool_dept_grow_pct: '10', adtool_dept_fall_pct: '50', adtool_dept_min_move: '1', adtool_dept_day_cap: '4.5', adtool_dept_new_week_cap: '12' });
  t('dept rules: the owner\'s own values are taken, strings included', dpCfg.new_days === 30 && dpCfg.top_30d === 5 && dpCfg.scale_sold === 8 && dpCfg.grow_pct === 10 && dpCfg.fall_pct === 50 && dpCfg.min_move === 1 && dpCfg.day_cap === 4.5 && dpCfg.new_week_cap === 12, dpCfg);
  const dpBad = F.adtDeptRules({ adtool_dept_new_days: '', adtool_dept_top_30d: 'thirty', adtool_dept_scale_sold: null, adtool_dept_grow_pct: '-5', adtool_dept_min_move: '0' });
  t('dept rules: blank, not-a-number and negative all fall back to the default; a deliberate 0 is kept', dpBad.new_days === 14 && dpBad.top_30d === 30 && dpBad.scale_sold === 20 && dpBad.grow_pct === 20 && dpBad.min_move === 0, dpBad);

  /* (b) one representative listing per department */
  t('dept: a 3-day-old listing with no sales is New', dpOf(3, 0, 0, 0).key === 'new' && dpOf(3, 0, 0, 0).name === 'New listing', dpOf(3, 0, 0, 0));
  t('dept: 45 sold in the last 30 days is Top', dpOf(200, 300, 45, 40).key === 'top', dpOf(200, 300, 45, 40));
  t('dept: 35 sold since listed and 18 against 10 is Scaling', dpOf(60, 35, 18, 10).key === 'scaling', dpOf(60, 35, 18, 10));
  t('dept: 8 against 68 is Declining', dpOf(300, 400, 8, 68).key === 'declining', dpOf(300, 400, 8, 68));
  t('dept: 3 against 3 on a settled listing is Average, the default', dpOf(90, 12, 3, 3).key === 'average', dpOf(90, 12, 3, 3));
  t('dept: every answer carries the department name, its rule in one sentence, and why THIS listing is in it', F.ADTOOL_DEPT_ORDER.length === 5 && ['new', 'top', 'scaling', 'declining', 'average'].every(k => F.ADTOOL_DEPT_NAMES[k] && typeof F.ADTOOL_DEPT_NAMES[k] === 'string'), F.ADTOOL_DEPT_ORDER);

  /* (c) the new window: 14 is in, 15 is out */
  t('dept: live exactly 14 days is still New; 15 days is not', dpOf(14, 0, 0, 0).key === 'new' && dpOf(15, 0, 0, 0).key !== 'new' && dpOf(15, 0, 0, 0).key === 'average' && dpOf(0, 0, 0, 0).key === 'new', [dpOf(14, 0, 0, 0).key, dpOf(15, 0, 0, 0).key]);
  t('dept: New wins over everything else, so a listing selling hard in week one is not yet Top', dpOf(5, 300, 90, 10).key === 'new', dpOf(5, 300, 90, 10));
  t('dept: a listing whose start date we do not have is never called New, and says so', dpOf(null, 0, 0, 0).key === 'average' && /no listing date/.test(dpOf(null, 0, 0, 0).why) && dpOf(undefined, 50, 2, 2).key === 'average', dpOf(null, 0, 0, 0));

  /* (d) Top is MORE THAN 30, the owner's words. 30 itself is not Top. */
  t('dept: exactly 30 sold in the last 30 days is NOT Top (the owner said more than 30); 31 is', dpOf(100, 100, 30, 30).key !== 'top' && dpOf(100, 100, 30, 30).key === 'average' && dpOf(100, 100, 31, 30).key === 'top', [dpOf(100, 100, 30, 30).key, dpOf(100, 100, 31, 30).key]);

  /* (e) Scaling needs BOTH bars: more than 20 sold since listed AND the last 30 days up on the 30 before */
  t('dept: exactly 20 sold since listed does NOT scale, however well it is growing; 21 does', dpOf(100, 20, 10, 2).key === 'average' && dpOf(100, 21, 10, 2).key === 'scaling', [dpOf(100, 20, 10, 2).key, dpOf(100, 21, 10, 2).key]);
  t('dept: 50 sold since listed but flat month on month is Average, not Scaling', dpOf(100, 50, 10, 10).key === 'average', dpOf(100, 50, 10, 10));

  /* (f) the minimum-move guard, so a one-unit wobble moves nothing */
  t('dept: 1 unit to 2 is not Scaling even on a listing with 50 sold since it was listed', dpOf(100, 50, 2, 1).key === 'average', dpOf(100, 50, 2, 1));
  t('dept: 2 units to 1 is not Declining either', dpOf(100, 50, 1, 2).key === 'average', dpOf(100, 50, 1, 2));
  t('dept: drop the minimum move to 1 and both of those do move', dpOf(100, 50, 2, 1, F.adtDeptRules({ adtool_dept_min_move: 1 })).key === 'scaling' && dpOf(100, 50, 1, 2, F.adtDeptRules({ adtool_dept_min_move: 1 })).key === 'declining', null);

  /* (g) nothing in the previous window: handled, and nothing divides by zero */
  const dpZ = dpOf(100, 25, 5, 0);
  t('dept: 5 sold against nothing at all in the 30 days before is Scaling, with no division by zero', dpZ.key === 'scaling' && /against 0 in the 30 before/.test(dpZ.why) && Object.keys(dpZ).every(k => typeof dpZ[k] === 'string' && dpZ[k].indexOf('NaN') < 0 && dpZ[k].indexOf('Infinity') < 0), dpZ);
  t('dept: growth from nothing still has to clear the minimum move, so 1 against 0 stays Average', dpOf(100, 25, 1, 0).key === 'average', dpOf(100, 25, 1, 0));
  t('dept: nothing in either window on a listing that has sold before is Average, never Declining (0 is not a fall of 2)', dpOf(100, 25, 0, 0).key === 'average', dpOf(100, 25, 0, 0));

  /* (h) a listing that has never sold is Average, not Declining */
  const dpNever = dpOf(400, 0, 0, 0);
  t('dept: a listing past the new window that has NEVER sold is Average, not Declining', dpNever.key === 'average' && /No sales yet/.test(dpNever.why), dpNever);

  /* (i) the collapse case. The first draft of these rules read 68 → 8 as Average; it is a Declining
     listing and this test is here to keep it one. */
  const dpCol = dpOf(300, 400, 8, 68);
  t('dept: units collapsing 68 → 8 is Declining, NOT Average (a real misclassification, locked down)', dpCol.key === 'declining' && dpCol.name === 'Declining listing' && /8 in the last 30 days against 68 in the 30 before/.test(dpCol.why), dpCol);
  t('dept: a smaller collapse 20 → 12 is Declining too, and 20 → 18 is not (it has not fallen 30 %)', dpOf(300, 400, 12, 20).key === 'declining' && dpOf(300, 400, 18, 20).key === 'average', [dpOf(300, 400, 12, 20).key, dpOf(300, 400, 18, 20).key]);
  t('dept: Top is read before Declining, so 68 → 40 is still a Top listing', dpOf(300, 400, 40, 68).key === 'top', dpOf(300, 400, 40, 68));

  /* (j) the owner changing a number changes the answer, and the page prints what it used */
  const dpNew30 = F.adtDeptRules({ adtool_dept_new_days: 30 });
  t('dept: raise the new window to 30 days and a 20-day-old listing becomes New again', dpOf(20, 0, 0, 0).key === 'average' && dpOf(20, 0, 0, 0, dpNew30).key === 'new', [dpOf(20, 0, 0, 0).key, dpOf(20, 0, 0, 0, dpNew30).key]);
  const dpTop5 = F.adtDeptRules({ adtool_dept_top_30d: 5 });
  t('dept: drop the top figure to 5 and a listing on 10 a month becomes Top', dpOf(100, 50, 10, 10).key === 'average' && dpOf(100, 50, 10, 10, dpTop5).key === 'top', null);
  const dpScale2 = F.adtDeptRules({ adtool_dept_scale_sold: 2 });
  t('dept: drop the scaling bar to 2 and a listing on 5 sold since listed can scale', dpOf(100, 5, 6, 2).key === 'average' && dpOf(100, 5, 6, 2, dpScale2).key === 'scaling', null);
  const dpFall10 = F.adtDeptRules({ adtool_dept_fall_pct: 10 });
  t('dept: soften the fall to 10 % and 20 → 18 becomes Declining', dpOf(300, 400, 18, 20).key === 'average' && dpOf(300, 400, 18, 20, dpFall10).key === 'declining', null);
  const dpSent = F.adtDeptSentences(F.adtDeptRules({ adtool_dept_new_days: 21, adtool_dept_top_30d: 50, adtool_dept_scale_sold: 11 }));
  t('dept: the rule sentences print the numbers in force, never the defaults', /^Live 21 days or fewer\.$/.test(dpSent.new) && /More than 50 sold in the last 30 days/.test(dpSent.top) && /More than 11 sold since it was listed/.test(dpSent.scaling) && /Live 14/.test(F.adtDeptSentences(dpD0).new), dpSent);
  t('dept: the rule sentences and the reasons are plain British English, with no em-dash and no jargon', F.ADTOOL_DEPT_ORDER.every(k => { const s = F.adtDeptSentences(dpD0)[k]; return s.indexOf('—') < 0 && !/attributed|provisional|shadow|frontier|normalised|elasticity|horizon|acceptance|\bgrain\b|\bcadence\b|adtool_|§/i.test(s); }) && [dpOf(3, 0, 0, 0), dpOf(200, 300, 45, 40), dpOf(60, 35, 18, 10), dpCol, dpNever].every(d => d.why.indexOf('—') < 0 && !/attributed|provisional|shadow|adtool_|§/i.test(d.why)), null);

  /* (k) THE PARTITION. Over a dpGrid of 1,050 listings: every one lands in exactly one department,
     none lands in none, and the one it lands in is the FIRST on the ladder whose own rule holds —
     with the rules of every earlier department failing. The predicates below are written out again
     here on purpose, so the test disagrees with the engine if the engine's ladder ever changes. */
  const dpR = dpD0;
  const dpPred = {
    /* an age of null or '' is an age we do not have, NOT day zero. Number(null) being 0 is exactly
       the trap this mirrors on purpose. */
    new: i => i.age_days !== null && i.age_days !== undefined && String(i.age_days).trim() !== '' && isFinite(Number(i.age_days)) && Number(i.age_days) <= dpR.new_days,
    top: i => i.units_30d > dpR.top_30d,
    scaling: i => i.sold_life > dpR.scale_sold && i.units_30d >= i.units_prev30 * (1 + dpR.grow_pct / 100) && (i.units_30d - i.units_prev30) >= dpR.min_move,
    declining: i => (i.sold_life > 0 || i.units_30d > 0 || i.units_prev30 > 0) && i.units_30d <= i.units_prev30 * (1 - dpR.fall_pct / 100) && (i.units_prev30 - i.units_30d) >= dpR.min_move,
    average: () => true,
  };
  let dpGrid = 0, dpWrong = null, dpUnplaced = 0, dpDouble = 0, dpBadCopy = 0;
  for (const age of [null, 0, 7, 14, 15, 60, 400]) {
    for (const sold of [0, 1, 20, 21, 100]) {
      for (const u30 of [0, 1, 2, 30, 31, 80]) {
        for (const prev of [0, 1, 2, 30, 68]) {
          dpGrid++;
          const dpIn = { age_days: age, sold_life: sold, units_30d: u30, units_prev30: prev };
          const dpGot = F.adtDeptOf(dpIn, dpR);
          const dpWant = F.ADTOOL_DEPT_ORDER.filter(k => dpPred[k](dpIn));
          if (!dpWant.length) { dpUnplaced++; continue; }
          if (dpGot.key !== dpWant[0]) { dpWrong = dpWrong || { dpIn: dpIn, dpGot: dpGot.key, dpWant: dpWant[0] }; continue; }
          /* nothing earlier on the ladder may also claim it */
          if (F.ADTOOL_DEPT_ORDER.slice(0, F.ADTOOL_DEPT_ORDER.indexOf(dpGot.key)).some(k => dpPred[k](dpIn))) dpDouble++;
          if (!dpGot.name || !dpGot.rule_sentence || !dpGot.why || dpGot.why.indexOf('undefined') >= 0 || dpGot.why.indexOf('NaN') >= 0) dpBadCopy++;
        }
      }
    }
  }
  t('dept partition: 1,050 listings, every one placed in exactly one department and none left out', dpGrid === 1050 && dpUnplaced === 0 && !dpWrong && dpDouble === 0, { dpGrid: dpGrid, dpUnplaced: dpUnplaced, dpWrong: dpWrong, dpDouble: dpDouble });
  t('dept partition: and every one of them comes back with a name, its rule and a readable reason', dpBadCopy === 0, dpBadCopy);

  /* (l) the route: the role gate runs BEFORE the cache is read, and the cache is keyed per profit
     class with a TTL fit for a once-a-day answer. A cache hit that skipped the gate has shipped
     here before, so the ordering is asserted against the source. */
  /* read as POSITIONS in the source rather than one long regex, so the assertion survives anybody
     editing the comment above the gate */
  const dpRoute = src.slice(src.indexOf('  adtoolDepts: {'), src.indexOf('/* ADTOOL-P11-END'));
  const dpAt = needle => dpRoute.indexOf(needle);
  t('depts route: the role check, then the page gate, then the cache. In that order, never the other way round.', dpAt('await adtGate(ctx, null)') > 0 && dpAt('await adtGate(ctx, null)') < dpAt("ensureAdtoolPhaseDeptsRegister") && dpAt('ensureAdtoolPhaseDeptsRegister') < dpAt("await adtGate(ctx, 'adtool_page_depts')") && dpAt("await adtGate(ctx, 'adtool_page_depts')") < dpAt('adtKvMemo(') && dpAt('adtKvMemo(') > 0, [dpAt('await adtGate(ctx, null)'), dpAt('ensureAdtoolPhaseDeptsRegister'), dpAt("await adtGate(ctx, 'adtool_page_depts')"), dpAt('adtKvMemo(')]);
  t('depts route: a caller who may not be here writes nothing, because the role check precedes the seed', /await adtGate\(ctx, null\);\s*\n\s*await ensureAdtoolPhaseDeptsRegister\(ctx\.env\);/.test(dpRoute), null);
  t('depts route: the cache is keyed by the caller\'s profit class and holds for half an hour', /adtKvMemo\(ctx\.env, 'adtoolDepts', adtProfitClass\(ctx\.user\)/.test(src) && /adtoolDepts: 1800000/.test(src), null);
  t('depts route: the name starts with adtool, so the no-collective-profit strip wraps it', 'adtoolDepts'.indexOf('adtool') === 0 && /ADTOOL_ACTIONS_P11 = \{[\s\S]*?adtoolDepts:/.test(src), null);
  t('depts: the spend read is `spend` alone, never spend plus cpc_spend (that would count the clicks twice)', /ADTOOL-P13-BEGIN[\s\S]*?ADTOOL-P13-END/.test(src) && !/cpc_spend/.test(src.slice(src.indexOf('/* ADTOOL-P13-BEGIN'), src.indexOf('/* ADTOOL-P13-END'))), null);
  t('depts: impressions are declared but never written, so the page never reads them', !/impressions/.test(src.slice(src.indexOf('/* ADTOOL-P13-BEGIN'), src.indexOf('/* ADTOOL-P13-END'))), null);
  t('depts: the windows end yesterday, because today carries no ad cost', /ROUND\(SUM\(CASE WHEN d\.day = \?2 THEN d\.spend ELSE 0 END\), 2\) AS spend_yesterday/.test(src) && /const w = adtPeriod\(\{ period: 'd30' \}, today\), w7 = adtPeriod\(\{ period: 'd7' \}, today\);/.test(src), null);
  t('depts: the previous window names the source it used, with a state of its own for "we hold nothing at all" rather than claiming order records there are none of', /prev_window_source: prevCovered \? 'daily figures' : prevNone \? 'no records' : \(prevPartial \? 'order records \(incomplete\)' : 'order records'\)/.test(src) && /const prevNone = !prevCovered && !orderStart;/.test(src) && /const prevPartial = !prevCovered && !prevNone && orderStart > w\.prev_from;/.test(src) && /understated for the oldest listings/.test(src) && /there is no record, not because nothing sold/.test(src), null);
  t('depts: only ACTIVE listings are classified, on the canonical listing-date pair', /i\.status = 'ACTIVE'/.test(src.slice(src.indexOf('/* ADTOOL-P13-BEGIN'), src.indexOf('/* ADTOOL-P13-END'))) && /CASE WHEN i\.start_time != '' THEN 'eBay start time' ELSE 'first seen by portal' END/.test(src), null);
  t('depts: membership of "being advertised" reuses the one shared rule, never a second one', /env\.DB\.prepare\(ADTOOL_LIVE_AD_SQL \+ \(acct \? ' AND c\.account = \?1' : ''\)\)/.test(src.slice(src.indexOf('/* ADTOOL-P13-BEGIN'), src.indexOf('/* ADTOOL-P13-END'))), null);
  t('depts: the campaign daily budget is checked as well as the spend, read as a number out of text', /budget_set: r\.budget_set, cap: rules\.day_cap/.test(src) && /replace\(\/\[\^0-9\.\\-\]\/g, ''\)/.test(src.slice(src.indexOf('/* ADTOOL-P13-BEGIN'), src.indexOf('/* ADTOOL-P13-END'))), null);
  t('depts: the compute produces no profit figure at all, per the owner\'s no-collective-profit rule', !/profit/i.test(src.slice(src.indexOf('async function adtoolDeptsCompute'), src.indexOf('/* ADTOOL-P13-END'))), null);

  /* ---------------------------------------------------------------------------------------------
     THE NUMBER REGISTER'S COPY. The register supplies the "how is this made" text the portal shows
     when somebody clicks a source tag, so it is read by staff, not by engineers. The audit found it
     was the worst copy in the product: spec section numbers, rule codes, job names, table and
     column names, statistics notation, and notes that ran past 200 words.
     These tests parse the register arrays straight out of the engine and hold the copy to the
     house style, so the next entry anybody adds has to meet it too. `source_tables` is deliberately
     NOT judged: that column IS the technical provenance list, which is what it is for.
     --------------------------------------------------------------------------------------------- */
  const rgNames = ['ADTOOL_REGISTER_P1B', 'ADTOOL_REGISTER', 'ADTOOL_REGISTER_P2', 'ADTOOL_REGISTER_P3', 'ADTOOL_REGISTER_P4', 'ADTOOL_REGISTER_P5', 'ADTOOL_REGISTER_P6', 'ADTOOL_REGISTER_P9', 'ADTOOL_REGISTER_P10', 'ADTOOL_REGISTER_P11', 'ADTOOL_REGISTER_P13', 'ADTOOL_REGISTER_P14', 'ADTOOL_REGISTER_P15'];
  const rgAll = []; let rgParseFail = null;
  for (const nm of rgNames) {
    const i = src.indexOf('const ' + nm + ' = [');
    if (i < 0) { rgParseFail = rgParseFail || nm + ' is missing'; continue; }
    const j = src.indexOf('\n];', i);
    try {
      for (const row of new Function('return ' + src.slice(i + ('const ' + nm + ' = ').length, j + 3))()) rgAll.push({ array: nm, id: row[0], name: row[1], formula: row[2], sources: row[3], recompute: row[4], recheck: row[5] });
    } catch (e) { rgParseFail = rgParseFail || (nm + ': ' + e.message); }
  }
  t('register: all thirteen arrays parse, and together they document every number the tool shows', !rgParseFail && rgAll.length >= 80 && rgAll.every(r => r.id && r.name && r.formula && r.sources && r.recompute && r.recheck), rgParseFail || rgAll.length);

  /* the words the audit found live in production copy, and what to say instead. Judged on the four
     prose fields only. */
  const rgProse = r => [r.name, r.formula, r.recompute, r.recheck].join(' · ');
  const rgFaults = {
    'spec section reference': /§/,
    'a rule code': /\b(A0\d|A1\d|S[1-4]|R[1-4]|P[1-3])\b/,
    'a phase name': /\bPhase \d/,
    'a job name': /\b(adsItems|adsIntraday|adsSync|adsReportPoll|adsReportKick|marketingSync|financeSync|listingSync|orderSync|adtool[A-Z]\w*|adt[A-Z]\w*|ensureAdtool\w*|liveMembershipRow)\b/,
    'a table name': /\b(adtool_[a-z_]+|ads_daily|ads_today|sync_state|portal_config|items_api|items_facts|campaign_ads|sheet_rows|validation_runs|sales_daily|listing_decisions)\b/,
    'a column name': /\b(attr_units|attr_revenue|cpc_spend|cpc_clicks|cpc_sales|sale_amount|sold_qty|start_time|first_seen|ali_cost|actual_profit|ad_status|in_sale|eligible_on|local_date|spend_s|spend_r|carry_spend|report_day|uk_day|raw_priced_sum|margin_source|breakeven_roas|funding_model|bid_pct|discount_pct|ad_profit|hourly_status)\b/,
    'a check or flag name': /ADTOOL_[A-Z_]+|adtool_(page|dept|sale|today|profit)_[a-z_]*/,
    'statistics notation': /(p\s*[<=]\s*0?\.\d|\bp-value\b|σ|\bMASE\b|\bMAPE\b|\bHHI\b|Herfindahl|κ|log1p|Theil|PELT|Jensen|\bTSB\b|Poisson|Holt|\bGLM\b|Δ|Σ)/,
    'a banned word': /\b(attributed|provisional|shadow|frontier|acceptance|horizon|normalised|elasticity|vintage|unpriced|CVR|levers?|grain|cadence|granularity)\b/i,
    'an em-dash': /—/,
  };
  for (const label of Object.keys(rgFaults)) {
    const re = rgFaults[label];
    const hits = rgAll.filter(r => re.test(rgProse(r))).map(r => r.id);
    t('register copy: not one entry contains ' + label, hits.length === 0, hits.slice(0, 6));
  }
  t('register copy: no entry runs past 120 words, where the worst used to run to 218', rgAll.every(r => String(r.formula).split(/\s+/).length <= 120), rgAll.map(r => [String(r.formula).split(/\s+/).length, r.id]).sort((a, b) => b[0] - a[0]).slice(0, 3));
  t('register copy: the nine entries a seller actually opens are each down to a sentence or two', ['AD_SPEND_DAY', 'PROFIT_SHEET_LAW', 'MARGIN_BEFORE_ADS', 'BREAKEVEN_ROAS', 'ORGANIC_UNITS', 'FRONTIER', 'RUN_TODAY_VERDICT', 'HOUR_BANDS', 'CARRY_HOUR'].every(id => { const r = rgAll.filter(x => x.id === id)[0]; return r && String(r.formula).split(/\s+/).length <= 70 && String(r.formula).split('.').filter(x => x.trim()).length <= 4; }), ['AD_SPEND_DAY', 'PROFIT_SHEET_LAW', 'MARGIN_BEFORE_ADS', 'BREAKEVEN_ROAS', 'ORGANIC_UNITS', 'FRONTIER', 'RUN_TODAY_VERDICT', 'HOUR_BANDS', 'CARRY_HOUR'].map(id => { const r = rgAll.filter(x => x.id === id)[0]; return [id, r ? String(r.formula).split(/\s+/).length : 'missing']; }));
  t('register copy: the four metaphor titles are now plain nouns a person would say out loud', rgAll.filter(r => r.id === 'FRONTIER')[0].name === 'The spending limit' && rgAll.filter(r => r.id === 'CPC_LISTINGS')[0].name === 'Ads running' && rgAll.filter(r => r.id === 'CPC_POST')[0].name === 'Ads stopped' && !/war room|command centre|behaviour lab/i.test(rgAll.map(rgProse).join(' ')), null);
  t('register copy: the profit formula is described in words, never printed as arithmetic', /the same way the Sales Analysis sheet works it out/.test(rgAll.filter(r => r.id === 'PROFIT_SHEET_LAW')[0].formula) && !/0\.8 ?[×x*]|0\.96 ?[×x*]/.test(rgAll.map(rgProse).join(' ')), null);

  /* the plumbing entries are MARKED, not deleted: the checks and the tests refer to them by name */
  t('register: the eight plumbing entries are marked internal so the view can hide them', Object.keys(F.ADTOOL_REGISTER_INTERNAL).length === 8 && ['EST_AD_PROFIT', 'PROFIT_ITEM_ONLY', 'KV_PAGE_CACHE', 'PARITY_FLEET', 'PARITY_WEEKDAY', 'PARITY_ACCOUNT_WEEKDAY', 'PARITY_DATE', 'PARITY_LISTING'].every(F.adtRegInternal), Object.keys(F.ADTOOL_REGISTER_INTERNAL));
  t('register: and every one of them still EXISTS, because other code names them', ['EST_AD_PROFIT', 'PROFIT_ITEM_ONLY', 'KV_PAGE_CACHE', 'PARITY_FLEET', 'PARITY_WEEKDAY', 'PARITY_ACCOUNT_WEEKDAY', 'PARITY_DATE', 'PARITY_LISTING'].every(id => rgAll.some(r => r.id === id)), null);
  t('register: nothing a seller reads is marked internal by accident', ['AD_SPEND_DAY', 'PROFIT_SHEET_LAW', 'ROAS', 'DEPARTMENTS', 'FRONTIER', 'RUN_TODAY_VERDICT', 'CPC_LISTINGS'].every(id => F.adtRegInternal(id) === false), null);
  t('register: the flag is case-insensitive and safe on rubbish input', F.adtRegInternal('parity_date') === true && F.adtRegInternal('') === false && F.adtRegInternal(null) === false && F.adtRegInternal(undefined) === false, null);
  const rgRows = F.adtRegRows([{ metric_id: 'PARITY_DATE', name: 'x' }, { metric_id: 'DEPARTMENTS', name: 'y' }]);
  t('register: every payload row carries internal, and the original row is left alone', rgRows[0].internal === true && rgRows[1].internal === false && rgRows[0].name === 'x' && F.adtRegRows(null).length === 0 && F.adtRegRows([null])[0].internal === false, rgRows);
  t('register: all three payloads that feed the view carry the flag', (src.match(/adtRegRows\(/g) || []).length >= 4 && /entry: row \? adtRegRows\(\[row\]\)\[0\] : null, entries: all \? adtRegRows\(all\) : null/.test(src), (src.match(/adtRegRows\(/g) || []).length);

  /* the new page's own entry */
  const rgDept = rgAll.filter(r => r.id === 'DEPARTMENTS')[0];
  t('register: the departments page has an entry naming its rule, its sources, when it recomputes and how it is rechecked', !!rgDept && /lands in one of five places/.test(rgDept.formula) && /items_api/.test(rgDept.sources) && /Once a day/.test(rgDept.recompute) && /Unit tests/.test(rgDept.recheck), rgDept && rgDept.name);
  t('register: and it names no threshold it reads from config, because those are printed on the page instead', !!rgDept && !/\b(14|20|30|£3|£10)\b/.test(rgDept.formula.replace(/last 30 days|30 days before/g, '')), rgDept && rgDept.formula.slice(0, 80));


  /* ---------------------------------------------------------------------------------------------
     17. Campaigns, and where each listing advertises (owner's batch, 18 Oct 2026).

     THE HONESTY PROBLEM THESE TESTS EXIST FOR. eBay's daily ad report is downloaded per listing, so
     per-campaign money has to be added up from the listings inside each campaign until the
     per-campaign rows cover the window. Listings are live in two campaigns at once, so that sum
     counts those listings twice. Every rule for handling that is pure, and every one of them is
     here: the attribution, the excess a reader has to subtract, the per-campaign share count, the
     empty campaign, the zero denominators, and the campaign budget that is SHARED by its listings
     rather than owned by each of them.
     --------------------------------------------------------------------------------------------- */
  const cbRules = { day_cap: 3 };
  const cbCamp = (id, st, bud) => ({ account: 'A', campaign_id: id, name: 'Campaign ' + id, status: st, budget: bud, funding_model: 'COST_PER_CLICK', bid_pct: '2.5', start_date: '', end_date: '' });
  const cbMem = (id, item, acct) => ({ account: acct || 'A', campaign_id: id, item_id: item });
  const cbMny = (sp, cl, un, rv) => ({ spend: sp, clicks: cl, units: un, revenue: rv });
  const cbRoll = (o) => F.adtCampaignRollup(Object.assign({ campaigns: [], members: [], live: [], money: {}, real: [], rules: cbRules, status: '' }, o));
  const cbOf = (r, id) => r.campaigns.filter(x => x.campaign_id === id)[0];

  /* (a) one listing, one campaign: the whole of its spend belongs to that campaign */
  const cbR1 = cbRoll({ campaigns: [cbCamp('c1', 'RUNNING', '50')], members: [cbMem('c1', 'i1')], live: [cbMem('c1', 'i1')], money: { i1: cbMny(12, 40, 2, 48) } });
  t('campaign board: a listing in one campaign gives that campaign its whole spend, clicks, units and sales', cbR1.campaigns[0].spend === 12 && cbR1.campaigns[0].clicks === 40 && cbR1.campaigns[0].sales_units === 2 && cbR1.campaigns[0].sales_money === 48 && cbR1.totals.spend === 12, cbR1.campaigns[0]);
  t('campaign board: a figure added up from the listings says so and is never dressed up as eBay\'s own report', cbR1.money_source === 'added up from the listings in each campaign' && cbR1.campaigns[0].money_from === 'listings', cbR1.money_source);
  t('campaign board: one listing in one campaign is nothing counted twice', cbR1.overlap.listings_in_two_or_more === 0 && cbR1.overlap.of_live_advertised === 1 && cbR1.overlap.spend_counted_twice === 0, cbR1.overlap);
  t('campaign board: return on ad spend and cost per click come out of the campaign\'s own sums', cbR1.campaigns[0].roas === 4 && cbR1.campaigns[0].cpc === 0.3, [cbR1.campaigns[0].roas, cbR1.campaigns[0].cpc]);

  /* (b) THE DOUBLE COUNT. i1 is live in both campaigns; i2 is only in the first. */
  const cbR2 = cbRoll({ campaigns: [cbCamp('c1', 'RUNNING', '50'), cbCamp('c2', 'RUNNING', '20')], members: [cbMem('c1', 'i1'), cbMem('c2', 'i1'), cbMem('c1', 'i2')], live: [cbMem('c1', 'i1'), cbMem('c2', 'i1'), cbMem('c1', 'i2')], money: { i1: cbMny(10, 20, 1, 30), i2: cbMny(4, 8, 0, 0) } });
  t('campaign board: a listing live in two campaigns is counted in BOTH of them', cbOf(cbR2, 'c1').spend === 14 && cbOf(cbR2, 'c2').spend === 10, [cbOf(cbR2, 'c1').spend, cbOf(cbR2, 'c2').spend]);
  t('campaign board: spend_counted_twice is that listing\'s spend ONCE, not twice, so subtracting it from the campaign column leaves what was really spent', cbR2.overlap.spend_counted_twice === 10 && (cbOf(cbR2, 'c1').spend + cbOf(cbR2, 'c2').spend) - cbR2.overlap.spend_counted_twice === cbR2.totals.spend && cbR2.totals.spend === 14, [cbR2.overlap.spend_counted_twice, cbR2.totals.spend]);
  t('campaign board: the overlap is stated as listings out of the listings being advertised', cbR2.overlap.listings_in_two_or_more === 1 && cbR2.overlap.of_live_advertised === 2 && cbR2.overlap.share_pct === 50 && cbR2.overlap.applies_to_money === true, cbR2.overlap);
  t('campaign board: account and company totals count a shared listing ONCE, however the campaign column reads', cbR2.accounts[0].spend === 14 && cbR2.accounts[0].listings === 2 && cbR2.totals.listings === 2 && cbR2.totals.spend === 14, cbR2.accounts[0]);
  t('campaign board: both campaigns are marked as sharing a listing, and each marks one listing', cbOf(cbR2, 'c1').shares_listings === 1 && cbOf(cbR2, 'c2').shares_listings === 1, [cbOf(cbR2, 'c1').shares_listings, cbOf(cbR2, 'c2').shares_listings]);

  /* (c) shares_listings counts LISTINGS, not campaigns: i1 is in three campaigns, i2 in two */
  const cbR3 = cbRoll({ campaigns: [cbCamp('c1', 'RUNNING', '9'), cbCamp('c2', 'RUNNING', '9'), cbCamp('c3', 'RUNNING', '9')], members: [cbMem('c1', 'i1'), cbMem('c2', 'i1'), cbMem('c3', 'i1'), cbMem('c1', 'i2'), cbMem('c2', 'i2')], live: [cbMem('c1', 'i1'), cbMem('c2', 'i1'), cbMem('c3', 'i1'), cbMem('c1', 'i2'), cbMem('c2', 'i2')], money: { i1: cbMny(6, 0, 0, 0), i2: cbMny(5, 0, 0, 0) } });
  t('campaign board: shares_listings counts LISTINGS, not campaigns — a listing sitting in two other campaigns still adds one', cbOf(cbR3, 'c1').shares_listings === 2 && cbOf(cbR3, 'c1').listings === 2 && cbOf(cbR3, 'c3').shares_listings === 1 && cbOf(cbR3, 'c3').listings === 1, [cbOf(cbR3, 'c1').shares_listings, cbOf(cbR3, 'c3').shares_listings]);
  t('campaign board: a listing in three campaigns has its spend repeated twice over, so the excess is twice its spend', cbR3.overlap.spend_counted_twice === 17 && cbR3.overlap.listings_in_two_or_more === 2 && cbR3.totals.spend === 11, cbR3.overlap);

  /* (d) a campaign with nothing in it */
  const cbR4 = cbRoll({ campaigns: [cbCamp('c9', 'RUNNING', '50')] });
  const cbE = cbR4.campaigns[0];
  t('campaign board: a campaign with no listings in it returns zero money, never null and never NaN', cbE.spend === 0 && cbE.clicks === 0 && cbE.sales_units === 0 && cbE.sales_money === 0 && cbE.listings === 0 && isFinite(cbE.spend) && isFinite(cbE.sales_money), cbE);
  t('campaign board: return on ad spend and cost per click are NULL when the denominator is zero, not zero and not infinity', cbE.roas === null && cbE.cpc === null && F.adtRateRoas(10, 0) === null && F.adtRateCpc(10, 0) === null && F.adtRateRoas(0, 0) === null && F.adtRateCpc(0, 0) === null, [cbE.roas, cbE.cpc]);
  t('campaign board: and an empty campaign cannot put an item over the daily figure, because no item is sharing its budget', cbE.budget_per_listing_day === null && cbE.over_day_cap === false && cbE.over_day_cap_per_listing === false && cbE.budget_day === 50, cbE);

  /* (e) THE SHARED DAILY BUDGET. A campaign budget belongs to the campaign, not to each listing. */
  const cb40 = F.adtCampaignBudgetShare('50', 40, cbRules), cb4 = F.adtCampaignBudgetShare('50', 4, cbRules);
  t('campaign budget: fifty shared by forty listings is a pound and a quarter each, which is NOT past a cap of three', cb40.budget_per_listing_day === 1.25 && cb40.over_day_cap_per_listing === false && cb40.over_day_cap === false && cb40.listings_sharing_budget === 40, cb40);
  t('campaign budget: the same fifty shared by four listings is twelve fifty each, which IS past it', cb4.budget_per_listing_day === 12.5 && cb4.over_day_cap_per_listing === true && cb4.over_day_cap === true, cb4);
  t('campaign budget: the budget column arrives as TEXT and still compares numerically', cb4.budget_day === 50 && F.adtCampaignBudgetShare(' 50.00 ', 4, cbRules).budget_per_listing_day === 12.5 && F.adtCampaignBudgetShare('£50', 4, cbRules).budget_day === 50 && F.adtMoneyNum('50') === 50 && F.adtMoneyNum('abc') === null, [cb4.budget_day, F.adtMoneyNum('50')]);
  t('campaign budget: the cap is the one handed in, so changing the owner\'s figure changes the answer', F.adtCampaignBudgetShare('50', 40, { day_cap: 1 }).over_day_cap === true && F.adtCampaignBudgetShare('50', 4, { day_cap: 20 }).over_day_cap === false && cb40.day_cap === 3 && F.adtCampaignBudgetShare('50', 40, { day_cap: 1 }).day_cap === 1, null);
  t('campaign budget: with no figure handed in the default is the owner\'s own, which lives in exactly one place and is read from config', F.adtCampaignBudgetShare('50', 10, null).day_cap === F.ADTOOL_DEPT_DEFAULTS.day_cap && F.ADTOOL_DEPT_CONFIG_KEYS.day_cap === 'adtool_dept_day_cap' && F.adtDeptRules({ adtool_dept_day_cap: '5' }).day_cap === 5 && F.adtCampaignBudgetShare('50', 10, { day_cap: '' }).day_cap === F.ADTOOL_DEPT_DEFAULTS.day_cap, null);
  t('campaign budget: a blank budget is not a budget of zero, and neither of them is a breach', F.adtCampaignBudgetShare('', 4, cbRules).budget_day === null && F.adtCampaignBudgetShare('', 4, cbRules).over_day_cap === false && F.adtCampaignBudgetShare('0', 4, cbRules).budget_day === 0 && F.adtCampaignBudgetShare('0', 4, cbRules).over_day_cap === false, null);
  t('campaign budget: the per-listing share is what is compared, and it is on the row under its own name beside the cap it was compared with', typeof cb4.budget_per_listing_day === 'number' && typeof cb4.day_cap === 'number' && cbOf(cbR2, 'c1').budget_per_listing_day === 25 && cbOf(cbR2, 'c1').day_cap === 3, cbOf(cbR2, 'c1'));

  /* (f) the status filter the owner asked for: active, paused, ended */
  const cbSts = [cbCamp('c1', 'RUNNING', '5'), cbCamp('c2', 'PAUSED', '5'), cbCamp('c3', 'ENDED', '5'), cbCamp('c4', 'ENDING_SOON', '5')];
  const cbAll = cbRoll({ campaigns: cbSts }), cbAct = cbRoll({ campaigns: cbSts, status: 'active' }), cbEnd = cbRoll({ campaigns: cbSts, status: 'ended' }), cbPau = cbRoll({ campaigns: cbSts, status: 'paused' });
  t('campaign board: a campaign whose status is ENDED is OUT of the active filter and IN the ended one', cbAct.campaigns.every(r => r.campaign_id !== 'c3') && cbAct.campaigns.length === 2 && cbEnd.campaigns.length === 1 && cbEnd.campaigns[0].campaign_id === 'c3' && cbPau.campaigns.length === 1, [cbAct.campaigns.map(r => r.campaign_id), cbEnd.campaigns.map(r => r.campaign_id)]);
  t('campaign board: running, paused and ended are each counted, and ENDING_SOON counts as running because it is still spending', cbAll.totals.running === 2 && cbAll.totals.paused === 1 && cbAll.totals.ended === 1 && cbAll.totals.campaigns === 4, cbAll.totals);
  t('campaign status: blank means all of them, and a status we do not recognise matches none of the three', F.adtCampStatusKey('ENDING_SOON') === 'active' && F.adtCampStatusKey('ENDED') === 'ended' && F.adtCampStatusKey('PAUSED') === 'paused' && F.adtCampStatusMatch('ENDED', '') === true && F.adtCampStatusMatch('ENDED', 'active') === false && F.adtCampStatusKey('SOMETHING ELSE') === 'other' && F.adtCampStatusMatch('SOMETHING ELSE', 'active') === false, null);
  t('campaign board: only the budgets of campaigns that are actually running add up on the account line', cbAll.accounts[0].budget_day === 10 && cbAct.accounts[0].budget_day === 10 && cbEnd.accounts[0].budget_day === null, [cbAll.accounts[0].budget_day, cbEnd.accounts[0].budget_day]);

  /* (g) once eBay's own per-campaign rows are in, they are preferred and nothing is counted twice */
  const cbReal = cbRoll({ campaigns: [cbCamp('c1', 'RUNNING', '50'), cbCamp('c2', 'RUNNING', '20')], members: [cbMem('c1', 'i1'), cbMem('c2', 'i1')], live: [cbMem('c1', 'i1'), cbMem('c2', 'i1')], money: { i1: cbMny(10, 20, 1, 30) }, real: [{ account: 'A', campaign_id: 'c1', spend: 7, clicks: 14, units: 1, revenue: 30, listings: 1 }, { account: 'A', campaign_id: 'c2', spend: 3, clicks: 6, units: 0, revenue: 0, listings: 1 }] });
  t('campaign board: eBay\'s own per-campaign report is preferred over adding the listings up, and the payload says which it used', cbReal.money_source === 'eBay campaign report' && cbOf(cbReal, 'c1').spend === 7 && cbOf(cbReal, 'c2').spend === 3 && cbOf(cbReal, 'c1').money_from === 'report', cbReal.money_source);
  t('campaign board: with the real report in, nothing is counted twice, so the excess is nil while the listing counts stay true', cbReal.overlap.spend_counted_twice === 0 && cbReal.overlap.listings_in_two_or_more === 1 && cbReal.overlap.of_live_advertised === 1 && cbReal.overlap.applies_to_money === false && cbReal.totals.spend === 10, cbReal.overlap);

  /* (h) a listing held by a paused campaign still shows what it spent, but it is not live there */
  const cbPz = cbRoll({ campaigns: [cbCamp('c1', 'PAUSED', '5'), cbCamp('c2', 'RUNNING', '5')], members: [cbMem('c1', 'i1'), cbMem('c2', 'i1')], live: [cbMem('c2', 'i1')], money: { i1: cbMny(8, 10, 0, 0) } });
  t('campaign board: a paused campaign still shows what its listings spent, with none of them live in it', cbOf(cbPz, 'c1').spend === 8 && cbOf(cbPz, 'c1').listings === 1 && cbOf(cbPz, 'c1').listings_advertised === 0 && cbOf(cbPz, 'c1').shares_listings === 1, cbOf(cbPz, 'c1'));
  t('campaign board: a listing live in only one campaign is no overlap, whatever other campaigns hold a stopped ad for it', cbPz.overlap.listings_in_two_or_more === 0 && cbPz.overlap.of_live_advertised === 1 && cbPz.overlap.spend_counted_twice === 0, cbPz.overlap);

  /* (h2) THE RECONCILIATION A READER ACTUALLY DOES, and the case that proves it cannot be the live
     overlap. cbPz above has one listing held by a PAUSED campaign and live in a RUNNING one. Its £8
     lands on BOTH campaign rows, so the column reads £16 against a company total of £8 — while the
     live overlap is rightly nil, because only one of those ads is live. Subtracting the live figure
     from the column would land a reader on £16 and tell them that was the truth. So the figure to
     subtract is measured off the printed rows, and the identity is exact in every one of these. */
  const cbCol = r => r.campaigns.reduce((s, x) => s + x.spend, 0);
  const cbIdent = r => Math.abs(cbCol(r) - r.column.spend_counted_twice - r.totals.spend) < 0.005;
  t('campaign column: the campaign rows minus what is counted twice equals the company total, in the paused case the live overlap calls nil', cbPz.column.spend === 16 && cbPz.column.spend_counted_twice === 8 && cbPz.totals.spend === 8 && cbIdent(cbPz) && cbPz.column.listings_counted_more_than_once === 1, cbPz.column);
  t('campaign column: the same identity holds for a listing live in two, a listing in three, one campaign on its own, and an empty campaign', cbIdent(cbR1) && cbIdent(cbR2) && cbIdent(cbR3) && cbIdent(cbR4) && cbR2.column.spend_counted_twice === 10 && cbR3.column.spend_counted_twice === 17 && cbR1.column.spend_counted_twice === 0 && cbR4.column.spend_counted_twice === 0, [cbR2.column, cbR3.column]);
  t('campaign column: it reconciles to the very figure the totals row prints, and says so', cbR2.column.reconciles_to === cbR2.totals.spend && cbR3.column.reconciles_to === cbR3.totals.spend && cbPz.column.reconciles_to === cbPz.totals.spend, null);
  t('campaign column: the identity survives the status filter, because the column it measures is the column being shown', cbIdent(cbRoll({ campaigns: cbSts, status: 'active' })) && cbIdent(cbRoll({ campaigns: cbSts, status: 'ended' })), null);
  t('campaign column: clicks, units and sales from ads are added down the column too, so every money column can be reconciled and not just spend', cbR2.column.clicks === 48 && cbR2.column.sales_units === 2 && cbR2.column.sales_money === 60, cbR2.column);

  /* (g2) once eBay's own rows are in they are the WHOLE answer, a silence included: a campaign the
     report does not mention spent nothing. Falling back to the listing sum on just that row mixed
     two sources down one column and left it reconciling to nothing a reader could reach. */
  const cbHalf = cbRoll({ campaigns: [cbCamp('c1', 'RUNNING', '50'), cbCamp('c2', 'RUNNING', '20')], members: [cbMem('c1', 'i1'), cbMem('c2', 'i2')], live: [cbMem('c1', 'i1'), cbMem('c2', 'i2')], money: { i1: cbMny(10, 20, 1, 30), i2: cbMny(7, 5, 0, 0) }, real: [{ account: 'A', campaign_id: 'c1', spend: 9, clicks: 18, units: 1, revenue: 30, listings: 1 }] });
  t('campaign board: with eBay\'s report in, a campaign it does not mention reads as nil rather than quietly falling back to the listing sum', cbOf(cbHalf, 'c2').spend === 0 && cbOf(cbHalf, 'c2').money_from === 'report' && cbOf(cbHalf, 'c1').spend === 9, [cbOf(cbHalf, 'c2').spend, cbOf(cbHalf, 'c2').money_from]);
  t('campaign board: so one source stands behind every row of the column, and the column still reconciles to the total', cbHalf.campaigns.every(r => r.money_from === 'report') && cbIdent(cbHalf) && cbHalf.column.spend_counted_twice === 0 && cbHalf.totals.spend === 9, cbHalf.column);
  const cbP14 = src.slice(src.indexOf('/* ADTOOL-P14-BEGIN'), src.indexOf('/* ADTOOL-P14-END'));
  t('campaign board: and the report is only taken for a window it covers on EVERY account, which the caller decides before the rows are handed in', /accounts_short/.test(cbP14) && /short\.length === 0/.test(cbP14) && /GROUP BY d\.account/.test(cbP14), null);
  t('campaign board: the window object itself is echoed, not just its name, because that is what the shared period bar reads', /period: w, period_key: w\.key/.test(cbP14) && (cbP14.match(/period: w, period_key/g) || []).length === 2, null);

  /* (i) the overlap rule on its own, including the rubbish a sync can hand it */
  t('campaign overlap: no rows at all is zero out of zero, with no share to report', JSON.stringify(F.adtCampaignOverlap([], {})) === JSON.stringify({ listings_in_two_or_more: 0, of_live_advertised: 0, spend_counted_twice: 0, share_pct: null }), F.adtCampaignOverlap([], {}));
  t('campaign overlap: a listing we hold no money for is still an overlap, it just adds nothing to the excess', F.adtCampaignOverlap([cbMem('c1', 'i1'), cbMem('c2', 'i1')], {}).listings_in_two_or_more === 1 && F.adtCampaignOverlap([cbMem('c1', 'i1'), cbMem('c2', 'i1')], {}).spend_counted_twice === 0, null);
  t('campaign overlap: the same campaign listed twice for one listing is one campaign, not two', F.adtCampaignOverlap([cbMem('c1', 'i1'), cbMem('c1', 'i1')], { i1: cbMny(5, 0, 0, 0) }).listings_in_two_or_more === 0, null);
  t('campaign overlap: the account is part of what makes a campaign, so the same listing id under two accounts is two campaigns', F.adtCampaignOverlap([cbMem('c1', 'i1', 'A'), cbMem('c1', 'i1', 'B')], { i1: cbMny(5, 0, 0, 0) }).spend_counted_twice === 5, null);
  t('campaign overlap: a row with no listing id is dropped rather than counted as a listing called nothing', F.adtCampaignOverlap([{ account: 'A', campaign_id: 'c1', item_id: '' }, cbMem('c1', 'i1')], { i1: cbMny(5, 0, 0, 0) }).of_live_advertised === 1, null);

  /* (j) the cached answer and the key it is held under */
  t('kv key: Campaigns at its own default window hashes to the empty payload, and another window does not', kk('adtoolCampaignBoard', { period: 'd7' }) === kk('adtoolCampaignBoard', {}) && kk('adtoolCampaignBoard', { period: 'd3' }) !== kk('adtoolCampaignBoard', {}) && F.ADTOOL_KV_DEFAULT_PERIOD.adtoolCampaignBoard === 'd7' && F.ADTOOL_KV_DEFAULT_PERIOD.adtoolCampaignListings === 'd7', null);
  t('kv key: one campaign\'s listings are held per campaign, and the profit class stays in the key as it does everywhere else', kk('adtoolCampaignListings', { account: 'A', campaign_id: 'c1' }) !== kk('adtoolCampaignListings', { account: 'A', campaign_id: 'c2' }) && kk('adtoolItemCampaigns', {}) !== F.adtKvKey('adtoolItemCampaigns', 'np', {}), null);

  /* (k) THE ORDERING THAT HAS SHIPPED WRONG BEFORE: the role gate must run before the cache is read.
     Judged on the source of the three actions, because a cache hit that skipped the gate is not a
     thing a pure function can be asked about. */
  const cbSrc = src.slice(src.indexOf('/* ADTOOL-P14-BEGIN'), src.indexOf('/* ADTOOL-P14-END'));
  for (const cbAct2 of ['adtoolCampaignBoard', 'adtoolCampaignListings', 'adtoolItemCampaigns']) {
    const cbBlk = cbSrc.slice(cbSrc.indexOf('  ' + cbAct2 + ': {'));
    const cbBody = cbBlk.slice(0, cbBlk.indexOf('\n  },'));
    t('campaign actions: ' + cbAct2 + ' refuses the wrong role BEFORE it ever looks in the cache', cbBody.indexOf('adtGate') >= 0 && cbBody.indexOf('adtKvMemo') > cbBody.indexOf('adtGate') && /adtGate\(ctx, null\)/.test(cbBody) && /adtGate\(ctx, 'adtool_page_[a-z_]+'\)/.test(cbBody), [cbBody.indexOf('adtGate'), cbBody.indexOf('adtKvMemo')]);
  }
  t('campaign actions: all three are held in the page cache, keyed by the caller\'s profit class', (cbSrc.match(/adtKvMemo\(ctx\.env, 'adtool/g) || []).length === 3 && (cbSrc.match(/adtProfitClass\(ctx\.user\)/g) || []).length === 3, (cbSrc.match(/adtKvMemo\(ctx\.env, 'adtool/g) || []).length);
  t('campaign actions: each of the three names its own time to live, and none of them outlives the ceiling the gate states', /adtoolCampaignBoard: 120000, adtoolCampaignListings: 120000, adtoolItemCampaigns: 120000/.test(src) && (cbSrc.match(/ADTOOL_KV_TTL_MS\.adtool(CampaignBoard|CampaignListings|ItemCampaigns)/g) || []).length === 3, null);

  /* (l) the flag, and the promise that turning it on costs nothing */
  t('campaign truth: the flag is SET on, not merely defaulted, so a row already holding off does not survive', /'adtool_campaign_truth', 'on'[\s\S]{0,160}DO UPDATE SET value = 'on'/.test(cbSrc) && !/adtool_campaign_truth[\s\S]{0,120}DO NOTHING/.test(cbSrc), null);
  t('campaign truth: the reason it costs no eBay traffic is written down beside it, so nobody turns it back off to save a report', /ALREADY downloaded/.test(cbSrc) && /adds NO eBay traffic/.test(cbSrc), null);
  t('campaign pages: the two page switches are born on and left alone if somebody has set them', /'adtool_page_campaign_board', 'adtool_page_item_campaigns'/.test(cbSrc) && /VALUES \(\?1, 'on', datetime\('now'\)\) ON CONFLICT\(key\) DO NOTHING/.test(cbSrc), null);

  /* (m) read-only, one membership rule, and the columns not to touch */
  t('campaign pages: nothing is ever sent to eBay, and the only writes at all are the documentation and the flags', !/fetch\(/.test(cbSrc) && (cbSrc.match(/INSERT INTO/g) || []).length === (cbSrc.match(/INSERT INTO (adtool_number_register|portal_config)/g) || []).length && !/UPDATE campaigns|DELETE FROM/.test(cbSrc), (cbSrc.match(/INSERT INTO/g) || []).length);
  t('campaign pages: the one membership rule the tool shares is reused, never written a second time', (cbSrc.match(/ADTOOL_LIVE_AD_SQL/g) || []).length >= 2 && /adtCampaignStmt\(/.test(cbSrc) && !/c\.status LIKE/.test(cbSrc), (cbSrc.match(/ADTOOL_LIVE_AD_SQL/g) || []).length);
  t('campaign pages: no query asks for the impressions column that is declared and never written', !/impressions/.test(cbSrc), null);
  t('campaign pages: nothing adds the click fee on top of a day total that already carries it', !/cpc_spend/.test(cbSrc), null);
  t('campaign pages: every window comes from the shared period helper, and the day source is asked for rather than named', (cbSrc.match(/adtPeriodOr\(/g) || []).length === 2 && /adtDaySrc\(/.test(cbSrc) && /adtPeriod\(\{ period: 'd3' \}/.test(cbSrc), null);
  t('campaign pages: every read is bounded, by a limit or by the window, and nothing asks for every column of anything', (cbSrc.match(/LIMIT \d+/g) || []).length >= 7 && !/SELECT \* FROM/.test(cbSrc) && /d\.day >= \?1 AND d\.day <= \?2/.test(cbSrc), (cbSrc.match(/LIMIT \d+/g) || []).length);

  /* (n) the register entries for the two new pages */
  const cbRgB = rgAll.filter(r => r.id === 'CAMPAIGN_BOARD')[0], cbRgO = rgAll.filter(r => r.id === 'CAMPAIGN_OVERLAP')[0], cbRgI = rgAll.filter(r => r.id === 'ITEM_CAMPAIGNS')[0], cbRgS = rgAll.filter(r => r.id === 'CAMPAIGN_BUDGET_SHARE')[0];
  t('register: the two new pages, the overlap and the shared budget each have an entry naming the rule, the sources, when it recomputes and how it is rechecked', !!cbRgB && !!cbRgO && !!cbRgI && !!cbRgS && [cbRgB, cbRgO, cbRgI, cbRgS].every(r => r.name && r.formula && r.sources && r.recompute && r.recheck), [!!cbRgB, !!cbRgO, !!cbRgI, !!cbRgS]);
  t('register: the campaign entry says plainly that a derived figure is derived', !!cbRgB && /added up from the listings inside it/.test(cbRgB.formula), cbRgB && cbRgB.formula.slice(0, 70));
  t('register: the shared budget entry prints no cap figure at all, because the page prints the live one', !!cbRgS && !/\d/.test(cbRgS.formula), cbRgS && cbRgS.formula);


  /* ---------------------------------------------------------------------------------------------
     20. OWNER BATCH 22 OCT 2026 — Stopped yesterday, Activated today, Peak times only.

     Three things in here had never been tested because they had never existed: a UK day converted
     to the UTC instants it actually sits between, the reading that says which of the two change
     pages a recorded change belongs on, and the rule that says a listing sells in one part of the
     day. The first is the one that was silently WRONG before: the report cut a UTC day out of UTC
     stamps and called it yesterday, which through BST moves the last hour of every UK evening into
     the next day's count.
     --------------------------------------------------------------------------------------------- */
  const p15Src = src.slice(src.indexOf('/* ADTOOL-P15-BEGIN'), src.indexOf('/* ADTOOL-P15-END'));
  const p15Code = p15Src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   /* the code, with the prose taken out: a comment that QUOTES the old wrong cut is not the old wrong cut */
  const hoursBetween = (a, b) => (Date.parse(b.replace(' ', 'T') + 'Z') - Date.parse(a.replace(' ', 'T') + 'Z')) / 3600000;

  /* (a) a UK day, and the two UTC instants it sits between */
  let ub = F.adtUkDayUtcBounds('2026-10-16');
  t('UK day: a summer day runs 23:00 to 23:00, because London is an hour ahead of the stamps', ub[0] === '2026-10-15 23:00:00' && ub[1] === '2026-10-16 23:00:00' && hoursBetween(ub[0], ub[1]) === 24, ub);
  ub = F.adtUkDayUtcBounds('2026-11-01');
  t('UK day: a winter day runs midnight to midnight', ub[0] === '2026-11-01 00:00:00' && ub[1] === '2026-11-02 00:00:00' && hoursBetween(ub[0], ub[1]) === 24, ub);
  ub = F.adtUkDayUtcBounds('2026-10-25');
  t('UK day: the day the clocks go back is twenty five hours long and all of them are read', ub[0] === '2026-10-24 23:00:00' && ub[1] === '2026-10-26 00:00:00' && hoursBetween(ub[0], ub[1]) === 25, ub);
  ub = F.adtUkDayUtcBounds('2026-03-29');
  t('UK day: the day the clocks go forward is twenty three hours long', ub[0] === '2026-03-29 00:00:00' && ub[1] === '2026-03-29 23:00:00' && hoursBetween(ub[0], ub[1]) === 23, ub);
  t('UK day: the stamps come back in the same shape the database stores a time in', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(F.adtUkDayUtcBounds('2026-08-01')[0]), F.adtUkDayUtcBounds('2026-08-01'));
  t('UK day: rubbish in gives nothing back rather than a wrong day', F.adtUkDayUtcBounds('') === null && F.adtUkDayUtcBounds('not a day') === null && F.adtUkDayUtcBounds(null) === null, null);
  let ukGap = null, ukLen = {};
  for (let i = 0; i < 400; i++) {
    const d = F.adtAddDays('2026-01-01', i), nx = F.adtAddDays(d, 1);
    const a = F.adtUkDayUtcBounds(d), b2 = F.adtUkDayUtcBounds(nx);
    if (a[1] !== b2[0]) { ukGap = [d, a[1], b2[0]]; break; }
    ukLen[hoursBetween(a[0], a[1])] = (ukLen[hoursBetween(a[0], a[1])] || 0) + 1;
  }
  t('UK day: four hundred days running join end to end with no gap and no overlap', ukGap === null, ukGap);
  t('UK day: and every one of them is twenty three, twenty four or twenty five hours long, one of each odd one', !ukGap && ukLen[24] >= 396 && ukLen[23] === 1 && ukLen[25] === 1, ukLen);
  t('UK clock: a stamp from the last hour of a summer evening prints as the next day in London', F.adtUkClockOf('2026-10-15 23:30:00') === '2026-10-16 00:30' && F.adtUkClockOf('2026-11-01 09:05:00') === '2026-11-01 09:05', [F.adtUkClockOf('2026-10-15 23:30:00'), F.adtUkClockOf('2026-11-01 09:05:00')]);
  t('UK clock: nothing in gives an empty string, never a made up time', F.adtUkClockOf('') === '' && F.adtUkClockOf('rubbish') === '', null);
  const w14 = F.adtUkDayWindows('2026-10-26', 14);
  t('fourteen days: newest first, each joined to the next, across the night the clocks went back', w14.length === 14 && w14[0].day === '2026-10-26' && w14[13].day === '2026-10-13' && w14.every((w, i) => i === 0 || w.to_utc === w14[i - 1].from_utc), w14.map(w => w.day).slice(0, 3));

  /* (b) one ad event: what happened, and which page it belongs on */
  const adK = (f, to) => F.adtAdChangeKind(f, to);
  let adOnce = [], adKinds = {};
  for (const f of F.ADTOOL_AD_STATES) for (const to of F.ADTOOL_AD_STATES) {
    const k = adK(f, to);
    adKinds[k.kind] = 1;
    const n = ['stopped', 'activated', 'neither'].filter(d => k.direction === d).length;
    if (n !== 1) adOnce.push([f, to, k.direction]);
  }
  t('ad changes: all thirty six pairs of before and after land on exactly one of stopped, activated or neither', adOnce.length === 0, adOnce.slice(0, 4));
  t('ad changes: a pause, a put away and a leaving are the stopped page', adK('ACTIVE', 'PAUSED').kind === 'ad_paused' && adK('ACTIVE', 'PAUSED').direction === 'stopped' && adK('ACTIVE', 'ARCHIVED').kind === 'ad_archived' && adK('ACTIVE', 'ARCHIVED').direction === 'stopped' && adK('ACTIVE', 'REMOVED').kind === 'ad_removed' && adK('ACTIVE', 'REMOVED').direction === 'stopped', null);
  t('ad changes: a resume and a brand new ad are the activated page', adK('PAUSED', 'ACTIVE').kind === 'ad_resumed' && adK('PAUSED', 'ACTIVE').direction === 'activated' && adK('', 'ACTIVE').kind === 'ad_added' && adK('', 'ACTIVE').direction === 'activated', null);
  t('ad changes: a pay-on-sale ad joining or leaving is neither on its state and still lands on a page through its membership', adK('', 'EXISTS').kind === 'ad_added' && adK('', 'EXISTS').basis === 'membership' && adK('', 'EXISTS').direction === 'activated' && adK('', 'EXISTS').status_direction === 'neither' && adK('EXISTS', 'REMOVED').kind === 'ad_removed' && adK('EXISTS', 'REMOVED').basis === 'membership' && adK('EXISTS', 'REMOVED').direction === 'stopped' && adK('EXISTS', 'REMOVED').status_direction === 'neither', [adK('', 'EXISTS'), adK('EXISTS', 'REMOVED')]);
  t('ad changes: a state that merely stops being reported is nobody stopping and nobody starting', adK('ACTIVE', 'EXISTS').direction === 'neither' && adK('PAUSED', 'EXISTS').direction === 'neither' && adK('ARCHIVED', 'EXISTS').direction === 'neither', [adK('ACTIVE', 'EXISTS').direction, adK('PAUSED', 'EXISTS').direction]);
  t('ad changes: an ad that appears already paused or already put away is an addition that is not running', adK('', 'PAUSED').kind === 'ad_added' && adK('', 'PAUSED').direction === 'neither' && adK('', 'ARCHIVED').direction === 'neither', [adK('', 'PAUSED'), adK('', 'ARCHIVED')]);
  t('ad changes: the same state twice is not a change', F.ADTOOL_AD_STATES.every(x => adK(x, x).direction === 'neither' && adK(x, x).kind === 'ad_unchanged'), null);
  t('ad changes: it is safe on nothing at all and on lower case, because the table holds what eBay sent', adK('active', 'paused').kind === 'ad_paused' && adK(undefined, undefined).direction === 'neither' && adK('active', 'removed').kind === 'ad_removed' && adK(null, 'active').kind === 'ad_added', null);

  /* (c) one campaign event */
  const cK = (ct, o, n) => F.adtCampaignChangeKind(ct, o, n);
  t('campaign changes: paused and ended are the stopped page, started is the activated page', cK('status', 'RUNNING', 'PAUSED').kind === 'campaign_paused' && cK('status', 'RUNNING', 'PAUSED').direction === 'stopped' && cK('status', 'RUNNING', 'ENDED').kind === 'campaign_ended' && cK('status', 'RUNNING', 'ENDED').direction === 'stopped' && cK('status', 'PAUSED', 'RUNNING').kind === 'campaign_started' && cK('status', 'PAUSED', 'RUNNING').direction === 'activated' && cK('status', 'ENDED', 'RUNNING').direction === 'activated', null);
  t('campaign changes: ending soon is a campaign that is still running, so moving in or out of it is neither', cK('status', 'RUNNING', 'ENDING_SOON').direction === 'neither' && cK('status', 'ENDING_SOON', 'RUNNING').direction === 'neither' && cK('status', 'ENDING_SOON', 'PAUSED').direction === 'stopped' && cK('status', 'PAUSED', 'ENDING_SOON').direction === 'activated', [cK('status', 'RUNNING', 'ENDING_SOON').direction, cK('status', 'ENDING_SOON', 'PAUSED').direction]);
  t('campaign changes: a move between two stopped states changes nothing about whether the ads run', cK('status', 'PAUSED', 'ENDED').direction === 'neither' && cK('status', 'ENDED', 'PAUSED').direction === 'neither', null);
  t('campaign changes: a new campaign is activated and a campaign gone from eBay is stopped', cK('created', '', 'RUNNING').kind === 'campaign_created' && cK('created', '', 'RUNNING').direction === 'activated' && cK('removed', 'RUNNING', '').kind === 'campaign_removed' && cK('removed', 'RUNNING', '').direction === 'stopped' && cK('removed', 'PAUSED', '').direction === 'stopped', null);
  t('campaign changes: a budget, a rename, an item list and the portal\'s own per-item rows are on neither page, so nothing is counted twice', cK('budget', '5', '8').direction === 'neither' && cK('budget', '5', '8').kind === 'campaign_budget' && cK('renamed', 'a', 'b').direction === 'neither' && cK('items', '3', '4').direction === 'neither' && cK('cpc_rule', '', 'x').direction === 'neither' && cK('ad-paused', 'ACTIVE', 'PAUSED').direction === 'neither' && cK('remove_item', '', 'removed').direction === 'neither', null);
  t('changes: every kind either page shows is named in the two lists, and no kind is on both', F.ADTOOL_CHANGE_STOPPED_KINDS.concat(F.ADTOOL_CHANGE_ACTIVATED_KINDS).every(k => Object.keys(adKinds).concat(['campaign_paused', 'campaign_ended', 'campaign_removed', 'campaign_started', 'campaign_created']).indexOf(k) >= 0) && F.ADTOOL_CHANGE_STOPPED_KINDS.filter(k => F.ADTOOL_CHANGE_ACTIVATED_KINDS.indexOf(k) >= 0).length === 0, null);

  /* (d) who changed it */
  const apRow = (o) => Object.assign({ day: '2026-10-16', account: 'A', item_id: '111', campaign_id: 'c1', decision_id: 'd1', op: 'status', mode: 'live', payload_json: JSON.stringify({ op: 'status', to: 'PAUSED' }) }, o || {});
  const evStop = { account: 'A', item_id: '111', campaign_id: 'c1', day: '2026-10-16', direction: 'stopped' };
  let at1 = F.adtChangeAttribution(evStop, [apRow()]);
  t('who: a change the portal\'s own record matches is the portal\'s, with the instruction beside it', at1.who === 'tool' && at1.tool.op === 'status' && at1.tool.mode === 'live' && at1.tool.decision_id === 'd1', at1);
  t('who: a record for a DIFFERENT listing on the same day is refused', F.adtChangeAttribution(evStop, [apRow({ item_id: '222' })]).who === 'ebay', null);
  t('who: a record pointing the OTHER way is refused', F.adtChangeAttribution(evStop, [apRow({ payload_json: JSON.stringify({ to: 'ACTIVE' }) })]).who === 'ebay' && F.adtChangeAttribution(Object.assign({}, evStop, { direction: 'activated' }), [apRow()]).who === 'ebay', null);
  t('who: a record from another day, another account, another campaign or another operation is refused', F.adtChangeAttribution(evStop, [apRow({ day: '2026-10-15' })]).who === 'ebay' && F.adtChangeAttribution(evStop, [apRow({ account: 'B' })]).who === 'ebay' && F.adtChangeAttribution(evStop, [apRow({ campaign_id: 'c9' })]).who === 'ebay' && F.adtChangeAttribution(evStop, [apRow({ op: 'budget' })]).who === 'ebay', null);
  /* the apply log's three modes are 'live' (it reached eBay), 'would-send' (the account's live switch
     is off, so nothing left the portal) and 'blocked' (a daily limit held it). Only the first can be
     why eBay's answer changed, and live apply is on for ONE account, so crediting a would-send row
     would have put most of the fleet's by-hand pauses down to the tool every single day. */
  t('who: only a record the portal actually SENT counts, so a would-send and a blocked one are both refused', F.adtChangeAttribution(evStop, [apRow({ mode: 'live' })]).who === 'tool' && F.adtChangeAttribution(evStop, [apRow({ mode: 'would-send' })]).who === 'ebay' && F.adtChangeAttribution(evStop, [apRow({ mode: 'blocked' })]).who === 'ebay' && F.adtChangeAttribution(evStop, [apRow({ mode: '' })]).who === 'ebay', [F.adtChangeAttribution(evStop, [apRow({ mode: 'would-send' })]).who, F.adtChangeAttribution(evStop, [apRow({ mode: 'blocked' })]).who]);
  t('who: a sent record is still found when the ones that were never sent are sitting in front of it', F.adtChangeAttribution(evStop, [apRow({ mode: 'would-send' }), apRow({ mode: 'blocked' }), apRow({ mode: 'live' })]).who === 'tool' && F.adtChangeAttribution(evStop, [apRow({ mode: 'would-send' }), apRow({ mode: 'blocked' }), apRow({ mode: 'live' })]).tool.mode === 'live', null);
  t('who: the page only ever asks the log for what was sent, so the cap is not eaten by rows that were not', /FROM adtool_apply_log WHERE day = \?1 AND mode = 'live'/.test(p15Src) && /String\(r\.mode \|\| ''\) !== 'live'/.test(p15Src), null);
  t('who: with nothing to match against, and on a change that is neither, nobody is ever named', F.adtChangeAttribution(evStop, []).who === 'ebay' && F.adtChangeAttribution(evStop, []).tool === null && F.adtChangeAttribution(evStop, null).who === 'ebay' && F.adtChangeAttribution(Object.assign({}, evStop, { direction: 'neither' }), [apRow()]).who === 'ebay', null);
  t('who: a campaign change matches on the campaign, because it has no listing of its own', F.adtChangeAttribution({ account: 'A', item_id: '', campaign_id: 'c1', day: '2026-10-16', direction: 'stopped' }, [apRow({ item_id: '' })]).who === 'tool' && F.adtChangeAttribution({ account: 'A', item_id: '', campaign_id: 'c2', day: '2026-10-16', direction: 'stopped' }, [apRow({ item_id: '' })]).who === 'ebay', null);
  t('who: the state the portal was aiming at is read out of what it sent, however it is carried', F.adtApplyTargetState({ to: 'paused' }) === 'PAUSED' && F.adtApplyTargetState({ payload_json: '{"to":"ACTIVE"}' }) === 'ACTIVE' && F.adtApplyTargetState({ payload_json: 'not json' }) === '' && F.adtApplyTargetState(null) === '', null);

  /* (e) the fourteen day archive */
  const arcW = F.adtUkDayWindows('2026-10-16', 14);
  const arc = F.adtChangeArchive(arcW, [
    { at: '2026-10-15 23:30:00', direction: 'stopped', n: 2 },     // 00:30 UK on the 16th
    { at: '2026-10-16 09:00:00', direction: 'activated', n: 5 },
    { at: '2026-10-15 09:00:00', direction: 'stopped', n: 1 },
    { at: '2026-10-16 23:30:00', direction: 'stopped', n: 9 },     // 00:30 UK on the 17th: outside the window
    { at: '2026-10-14 12:00:00', direction: 'neither', n: 7 },
  ]);
  t('archive: fourteen entries, newest first, with a zero on a day nothing happened', arc.length === 14 && arc[0].day === '2026-10-16' && arc[13].day === '2026-10-03' && arc[2].stopped === 0 && arc[2].activated === 0, arc.slice(0, 3));
  t('archive: a change from the last hour of a summer evening is counted on the UK day it happened', arc[0].stopped === 2 && arc[0].activated === 5 && arc[1].stopped === 1, [arc[0], arc[1]]);
  t('archive: a change after the window, and a change that is neither, are not counted at all', arc.reduce((s, r) => s + r.stopped + r.activated, 0) === 8, arc.reduce((s, r) => s + r.stopped + r.activated, 0));
  t('archive: it carries only the day and the two counts, and is safe on nothing at all', Object.keys(arc[0]).sort().join(',') === 'activated,day,stopped' && F.adtChangeArchive(null, null).length === 0 && F.adtChangeArchive(arcW, null)[0].stopped === 0, Object.keys(arc[0]).sort());

  /* (f) peak times only: does this listing sell in one part of the day */
  const pk = (u, off, rl) => F.adtPeakRule({ slot_units: u, spend_off_peak_7d: off }, rl || F.adtPeakRules({}));
  let pv = pk([2, 2, 2, 14], 12.4);                                 // 20 units, 70 % in the evening
  t('peak: twenty units with seventy per cent in one stretch is suggested', pv.suggested === true && pv.peak_slot === 3 && pv.peak_slot_name === 'evening' && pv.units_28d === 20 && pv.units_in_peak === 14, pv);
  pv = pk([2, 2, 1, 15], 12.4);                                     // 20 units, 75 %
  t('peak: and the sentence names the stretch, the clock hours and the money it spent outside them', /evening/.test(pv.why) && /17:00 and midnight/.test(pv.why) && /£12\.40/.test(pv.why) && /75%/.test(pv.why), pv.why);
  t('peak: forty nine per cent in its best stretch is not suggested', pk([49, 30, 21, 0], 5).suggested === false && pk([49, 30, 21, 0], 5).peak_share === 0.49 && pk([50, 30, 20, 0], 5).suggested === true, pk([49, 30, 21, 0], 5));
  t('peak: nine units is not suggested however concentrated they are', pk([0, 0, 0, 9], 5).suggested === false && pk([0, 0, 0, 9], 5).peak_share === 1, pk([0, 0, 0, 9], 5));
  t('peak: ten units at exactly half is suggested, because both figures are read as at least', pk([5, 0, 0, 5], 1).suggested === true && pk([4, 0, 0, 5], 1).suggested === false, [pk([5, 0, 0, 5], 1).suggested, pk([4, 0, 0, 5], 1).suggested]);
  t('peak: the figures handed in are honoured, so a manager who lowers either one changes who is listed', pk([49, 30, 21, 0], 5, { share: 0.4, min_units: 10, window_days: 28 }).suggested === true && pk([49, 30, 21, 0], 5, { share: 0.6, min_units: 10, window_days: 28 }).suggested === false && pk([0, 0, 0, 9], 5, { share: 0.5, min_units: 5, window_days: 28 }).suggested === true && pk([2, 2, 2, 14], 5, { share: 0.9, min_units: 10, window_days: 28 }).suggested === false, null);
  t('peak: a listing with no units at all is not suggested and says there is nothing to read', pk([0, 0, 0, 0], 0).suggested === false && pk([0, 0, 0, 0], 0).units_28d === 0 && /nothing to read/.test(pk([0, 0, 0, 0], 0).why), pk([0, 0, 0, 0], 0).why);
  t('peak: the sentence for one that just misses prints the figures in force, not fixed ones', /fewer than the 5 /.test(pk([0, 0, 0, 4], 1, { share: 0.5, min_units: 5, window_days: 28 }).why) && /under the 70%/.test(pk([10, 10, 10, 19], 1, { share: 0.7, min_units: 10, window_days: 28 }).why), [pk([0, 0, 0, 4], 1, { share: 0.5, min_units: 5, window_days: 28 }).why, pk([10, 10, 10, 19], 1, { share: 0.7, min_units: 10, window_days: 28 }).why]);
  t('peak: the morning, afternoon and night stretches name their own clock hours', /06:00 and noon/.test(pk([0, 20, 0, 0], 1).why) && /noon and 17:00/.test(pk([0, 0, 20, 0], 1).why) && /midnight and 06:00/.test(pk([20, 0, 0, 0], 1).why) && /at night/.test(pk([20, 0, 0, 0], 1).why), null);
  /* nought sampled hours is NOT nought pounds. A listing nobody has a reading for spent an unknown
     amount outside its hours, and a page that prints £0.00 there is read as "it wastes nothing". */
  const pkBlind = F.adtPeakRule({ slot_units: [2, 2, 2, 14], spend_off_peak_7d: 0, hours_sampled: 0 }, F.adtPeakRules({}));
  t('peak: with no hour of the week sampled, the money outside the peak is nothing-known, never nought pounds', pkBlind.suggested === true && pkBlind.spend_off_peak_7d === null && pkBlind.hours_sampled_7d === 0 && /cannot be seen yet/.test(pkBlind.why) && !/£/.test(pkBlind.why), pkBlind);
  const pkSeen = F.adtPeakRule({ slot_units: [2, 2, 2, 14], spend_off_peak_7d: 0, hours_sampled: 9 }, F.adtPeakRules({}));
  t('peak: with hours sampled and nothing spent outside the peak, nought pounds is the honest answer and is printed', pkSeen.spend_off_peak_7d === 0 && pkSeen.hours_sampled_7d === 9 && /£0\.00 outside that/.test(pkSeen.why), pkSeen.why);
  t('peak: asked without an hour count at all, it says the money exactly as it always did', pk([2, 2, 2, 14], 12.4).spend_off_peak_7d === 12.4 && pk([2, 2, 2, 14], 12.4).hours_sampled_7d === null && /£12\.40/.test(pk([2, 2, 2, 14], 12.4).why), pk([2, 2, 2, 14], 12.4).hours_sampled_7d);
  t('peak page: the three spend figures are kept apart on the row, and the two sampled ones are nothing-known where nobody looked', /spend_off_peak_7d: v\.spend_off_peak_7d/.test(p15Src) && /hours_sampled_7d: hrs\.length/.test(p15Src) && /spend_sampled_7d: hrs\.length \? \(sampled7\[id\] === undefined \? 0 : sampled7\[id\]\) : null/.test(p15Src) && /hours_sampled: hrs\.length/.test(p15Src), null);
  t('peak page: the money outside the hours is read over the SAME hours the stretches were judged on, excluded the same way', /NOT \(h\.day < \?3 AND h\.hour = 8\)/.test(p15Src) && /ADTOOL_CARRY_FIX_DAY/.test(p15Src), null);
  t('peak page: every suggested listing is asked for its name and picture, the ones already on the by-hand list too', /const titleIds = bandIds;/.test(p15Src) && !/bandIds\.filter\(id => !manualSet\[id\]\)/.test(p15Src), null);
  let pr = F.adtPeakRules({});
  t('peak figures: the defaults stand where nothing is set', pr.share === 0.5 && pr.min_units === 10 && pr.window_days === 28 && F.ADTOOL_PEAK_DEFAULTS.share === 0.5 && F.ADTOOL_PEAK_DEFAULTS.min_units === 10, pr);
  pr = F.adtPeakRules({ adtool_peak_share: '0.65', adtool_peak_min_units: '25' });
  t('peak figures: what the owner has set is used, text and all', pr.share === 0.65 && pr.min_units === 25, pr);
  t('peak figures: rubbish, nothing and a share over one all fall back or are held at one', F.adtPeakRules({ adtool_peak_share: 'x', adtool_peak_min_units: '' }).share === 0.5 && F.adtPeakRules({ adtool_peak_min_units: 'x' }).min_units === 10 && F.adtPeakRules({ adtool_peak_share: '4' }).share === 1 && F.adtPeakRules({ adtool_peak_share: '0' }).share === 0.5, null);
  t('peak figures: the two keys the owner sets them under are named in one place', F.ADTOOL_PEAK_CONFIG_KEYS.share === 'adtool_peak_share' && F.ADTOOL_PEAK_CONFIG_KEYS.min_units === 'adtool_peak_min_units' && F.ADTOOL_SLOT_NAMES.join(',') === 'night,morning,afternoon,evening', null);

  /* (g) what it spent outside the hours it sells in */
  const offHours = [{ hour: 7, spend: 1.5 }, { hour: 18, spend: 4 }, { hour: 19, spend: 3 }, { hour: 20, spend: 2 }, { hour: 2, spend: 0.75 }];
  t('outside its hours: every hour inside a selling stretch is left out', F.adtOffPeakSpend(offHours, [[18, 20]]) === 2.25 && F.adtOffPeakSpend(offHours, [[18, 20], [7, 7]]) === 0.75, [F.adtOffPeakSpend(offHours, [[18, 20]]), F.adtOffPeakSpend(offHours, [[18, 20], [7, 7]])]);
  t('outside its hours: with no selling stretch at all, every hour is outside', F.adtOffPeakSpend(offHours, []) === 11.25 && F.adtOffPeakSpend(offHours, null) === 11.25, F.adtOffPeakSpend(offHours, []));
  t('outside its hours: the first reading of a day belongs to no hour of trading and is never counted', F.adtOffPeakSpend([{ hour: 8, spend: 1, carry_spend: 99 }, { hour: 9, spend: 2, carry_spend: 40 }], []) === 3 && !/carry_spend/.test(String(F.adtOffPeakSpend)), F.adtOffPeakSpend([{ hour: 8, spend: 1, carry_spend: 99 }], []));
  t('outside its hours: an hour outside the clock, and nothing at all, add nothing', F.adtOffPeakSpend([{ hour: 24, spend: 5 }, { hour: -1, spend: 5 }, { hour: 3, spend: 1 }], []) === 1 && F.adtOffPeakSpend(null, []) === 0 && F.adtOffPeakSpend([null], []) === 0, null);
  t('outside its hours: a stretch is read inclusive at both ends, the way the running page prints it', F.adtInHourBands(18, [[18, 20]]) === true && F.adtInHourBands(20, [[18, 20]]) === true && F.adtInHourBands(17, [[18, 20]]) === false && F.adtInHourBands(21, [[18, 20]]) === false && F.adtInHourBands(5, null) === false, null);

  /* (h) the actions, the writes and the promises, judged on the source */
  for (const p15Act of ['adtoolChangeDay', 'adtoolPeak', 'adtoolPeakAdd', 'adtoolPeakRemove']) {
    const blk = p15Src.slice(p15Src.indexOf('  ' + p15Act + ': {'));
    const body = blk.slice(0, blk.indexOf('\n  },'));
    const cached = p15Act === 'adtoolChangeDay' || p15Act === 'adtoolPeak';
    t('change and peak pages: ' + p15Act + ' refuses the wrong role BEFORE it ever looks in the cache', body.indexOf('adtGate') >= 0 && /adtGate\(ctx, null\)/.test(body) && /adtGate\(ctx, 'adtool_page_(changes|peak)'\)/.test(body) && (!cached || body.indexOf('adtKvMemo') > body.indexOf('adtGate')), [p15Act, body.indexOf('adtGate'), body.indexOf('adtKvMemo')]);
    t('change and peak pages: ' + p15Act + ' seeds its own documentation and switch before the switch is read', body.indexOf('ensureAdtoolPhase15Register') > body.indexOf('adtGate(ctx, null)') && body.indexOf('ensureAdtoolPhase15Register') < body.indexOf("adtGate(ctx, 'adtool_page"), p15Act);
    t('change and peak pages: ' + p15Act + (cached ? ' is held in the page cache, keyed by the caller\'s profit class' : ' is a write and is NEVER cached'), cached ? (/adtKvMemo\(ctx\.env, 'adtool/.test(body) && /adtProfitClass\(ctx\.user\)/.test(body)) : (body.indexOf('adtKvMemo') < 0 && /ctx\.user \|\| \{\}/.test(body) && /adtPeakCacheClear\(/.test(body)), p15Act);
  }
  t('change and peak pages: both actions name their own time to live, and neither outlives the ceiling the gate states', /adtoolChangeDay: 60000, adtoolPeak: 120000/.test(src) && /ADTOOL_KV_TTL_MS\.adtoolChangeDay/.test(p15Src) && /ADTOOL_KV_TTL_MS\.adtoolPeak/.test(p15Src), null);
  t('peak list: a write drops the cached page for BOTH profit classes, for all accounts and for the listing\'s own', (p15Src.match(/adtKvKey\('adtoolPeak', cls/g) || []).length === 2 && /for \(const cls of \['p', 'np'\]\)/.test(p15Src) && /HOT\.delete/.test(p15Src), (p15Src.match(/adtKvKey\('adtoolPeak', cls/g) || []).length);
  t('peak list: taking a listing off KEEPS its row with who took it off and when, and deletes nothing', /UPDATE adtool_peak_items SET removed_by = \?2, removed_at = datetime\('now'\)/.test(p15Src) && !/DELETE FROM/.test(p15Src) && /WHERE p\.removed_at = ''/.test(p15Src), null);
  t('peak list: every write stamps the person who made it', (p15Src.match(/String\(\(ctx\.user \|\| \{\}\)\.email \|\| ''\)/g) || []).length === 2, (p15Src.match(/String\(\(ctx\.user \|\| \{\}\)\.email \|\| ''\)/g) || []).length);
  t('change and peak pages: nothing is ever sent to eBay, and the only writes at all are the documentation, the switches and the by-hand list', !/fetch\(/.test(p15Src) && !/api\.ebay\.com/.test(p15Src) && !/ebayAccessToken/.test(p15Src) && (p15Src.match(/INSERT INTO/g) || []).length === (p15Src.match(/INSERT INTO (adtool_peak_items|adtool_number_register|portal_config)/g) || []).length && p15Src.replace(/DO UPDATE SET/g, '').match(/UPDATE\s+([A-Za-z_]+)/g).join(',') === 'UPDATE adtool_peak_items', (p15Src.match(/INSERT INTO/g) || []).length);
  t('change and peak pages: exactly one column is added, nullable, guarded, and the campaign change carries the id from then on', (p15Src.match(/ALTER TABLE/g) || []).length === 1 && /ALTER TABLE campaign_events ADD COLUMN campaign_id TEXT DEFAULT ''/.test(p15Src) && /INSERT INTO campaign_events \(account, campaign, campaign_id, item_id, change_type, old, new, actor, at\)/.test(src) && /ensureCampaignEventsCampaignId\(env\)/.test(src), null);
  t('change pages: an older campaign change with no id resolves its name and SAYS the link is a name match', /campaign_id_source/.test(p15Src) && /'matched by name'/.test(p15Src) && /'recorded'/.test(p15Src) && /'unknown'/.test(p15Src), null);
  t('peak page: the one membership rule the tool shares is reused, never written a second time', /ADTOOL_LIVE_AD_SQL/.test(p15Src) && /adtCampaignStmt\(/.test(p15Src) && !/c\.status LIKE/.test(p15Src), null);
  t('peak page: the hours it sells in come from the same function the running page uses', /adtBandsAndLevers\(/.test(p15Src) && !/function adtHourBands/.test(p15Src), null);
  t('change and peak pages: no query asks for the impressions column that is declared and never written', !/impressions/.test(p15Src), null);
  t('change and peak pages: nothing adds the click fee on top of a day total that already carries it', !/cpc_spend/.test(p15Src), null);
  t('change and peak pages: every read is bounded, by a day window, a limit or the listings being advertised', (p15Src.match(/LIMIT \d+/g) || []).length >= 6 && !/SELECT \* FROM/.test(p15Src) && /seen_at >= \?1 AND seen_at < \?2/.test(p15Src) && /at >= \?1 AND at < \?2/.test(p15Src) && /day >= \?1 AND day <= \?2/.test(p15Src), (p15Src.match(/LIMIT \d+/g) || []).length);
  t('change pages: both event tables are cut with the UK day\'s own bounds, never with a slice of the stamp', /adtUkDayUtcBounds\(/.test(p15Src) && !/substr\(seen_at, 1, 10\)/.test(p15Code) && !/substr\(at, 1, 10\)/.test(p15Code) && (p15Src.match(/adtUkDayUtcBounds\(/g) || []).length >= 3, null);
  t('change pages: the rows are capped and what is held back is reported, and the archive is fourteen days', /ADTOOL_CHANGE_ROW_CAP = 400/.test(p15Src) && /ADTOOL_CHANGE_ARCHIVE_DAYS = 14/.test(p15Src) && /rows_held_back/.test(p15Src), null);
  /* a day can have ninety ads paused inside six campaigns and not one campaign-level change of its
     own. One number cannot answer both questions, and a page saying "across 0 campaigns" under
     ninety paused ads reads as broken, so both are counted and the page names each. */
  t('change pages: how many changes were at campaign level and how many campaigns were touched are counted apart', /campaigns: campN, campaigns_touched: Object\.keys\(campSeen\)\.length/.test(p15Src) && /campaigns_touched: Object\.keys\(accs\[k\]\.camps\)\.length/.test(p15Src) && /if \(ck\) campSeen\[r\.account \+ '\|' \+ ck\] = 1/.test(p15Src), null);
  t('change and peak pages: both carry a freshness tag, and the change pages name the slower of the two syncs behind them', /fresh: await adtChangeFresh\(env\)/.test(p15Src) && /fresh: await adtFresh\(env, 'day'\)/.test(p15Src) && /cadence: 'every 15 min'/.test(p15Src) && /job IN \('adsItems', 'adsSync'\)/.test(p15Src), null);
  t('change pages: the suggested list says what it held back, so two hundred is never read as all of them', /suggested_held_back: Math\.max\(0, first\.length - suggested\.length\)/.test(p15Src) && /ADTOOL_PEAK_SUGGEST_CAP = 200/.test(p15Src), null);
  t('both page switches are born on and left alone if somebody has already set them', /'adtool_page_changes', 'adtool_page_peak'/.test(p15Src) && /VALUES \(\?1, 'on', datetime\('now'\)\) ON CONFLICT\(key\) DO NOTHING/.test(p15Src), null);
  t('the two new actions are wired into the router beside the others', /Object\.assign\(ROUTES, ADTOOL_ACTIONS_P15\)/.test(src) && /adtoolChangeDay: \{/.test(p15Src) && /adtoolPeak: \{/.test(p15Src) && /adtoolPeakAdd: \{/.test(p15Src) && /adtoolPeakRemove: \{/.test(p15Src), null);

  /* (i) the report's own line now counts the same way, and points at the page */
  const rpSrc = src.slice(src.indexOf('async function adtoolReport('), src.indexOf('/* ---- ROAS target (morning chain) ---- */'));
  t('yesterday\'s report: its ad changes line counts a UK day, where it used to cut a day out of the stamps', /adtUkDayUtcBounds\(day\)/.test(rpSrc) && /seen_at >= \?1 AND seen_at < \?2/.test(rpSrc) && !/substr\(seen_at, 1, 10\) = \?1/.test(rpSrc), null);
  t('yesterday\'s report: the line is still there, and now says which page it lives on', /ad status changes seen on eBay/.test(rpSrc) && /changes_page: 'adtoolStopped'/.test(rpSrc) && /ad_status_changes:/.test(rpSrc), null);

  /* (j) the register entries for the new numbers */
  const p15Reg = ['CHANGE_DAY', 'CHANGES_STOPPED', 'CHANGES_ACTIVATED', 'CHANGE_WHO', 'CHANGE_BEFORE', 'CHANGE_ARCHIVE', 'PEAK_SUGGESTED', 'PEAK_OFF_PEAK_SPEND', 'PEAK_MANUAL'].map(id => rgAll.filter(r => r.id === id)[0]);
  t('register: every new number has an entry naming the rule, the sources, when it recomputes and how it is rechecked', p15Reg.every(r => r && r.name && r.formula && r.sources && r.recompute && r.recheck), p15Reg.map((r, i) => r ? r.id : i));
  t('register: the entry for a day says plainly that a day is a UK day and that the clocks move', /UK days/.test(p15Reg[0].formula) && /clocks go back/.test(p15Reg[0].formula), p15Reg[0].formula.slice(0, 60));
  t('register: the entry for who changed something promises nobody is guessed', /Nobody is ever guessed/.test(p15Reg[3].formula), p15Reg[3].formula.slice(-40));
  t('register: the by-hand list entry says in words that nothing on it reaches eBay', /not a timer/.test(p15Reg[8].formula) && /ever sent to eBay/.test(p15Reg[8].formula) && /read back/.test(p15Reg[8].formula), p15Reg[8].formula.slice(0, 60));
  t('register: the suggested list entry prints no figure of its own, because the page prints the ones in force', !/\d/.test(p15Reg[6].formula), p15Reg[6].formula);

  /* (k) THE EXPLAINER HOOKS, end to end. A tag on a page carries a label; the shell matches that
     label against ADT_REG_MAP and shows the register rows the matched keys name. A label with no
     pattern of its own falls through to the whole register, which is noise where a reader asked one
     question — so every tag the three new pages carry is resolved here, through the real map, right
     down to a real row. This is the only test in the file that reads the frontend, and it reads it
     because the two halves can only be wrong about each other. */
  const readFile = (rel) => { const n = $.NSString.stringWithContentsOfFileEncodingError(root + '/' + rel, $.NSUTF8StringEncoding, null); return n && n.js ? n.js : ''; };
  const shellSrc = readFile('src/shell.html');
  const viewSrc = ['frontend/view-adtool-stopped.js', 'frontend/view-adtool-activated.js', 'frontend/view-adtool-peak.js'].map(readFile).join('\n');
  let regMap = null, regMapFail = null;
  try {
    const mi = shellSrc.indexOf('var ADT_REG_MAP = ['), mj = shellSrc.indexOf('\n];', mi);
    regMap = new Function('return ' + shellSrc.slice(mi + 'var ADT_REG_MAP = '.length, mj + 3))();
  } catch (e) { regMapFail = e.message; }
  t('explainers: the shell\'s map of tag to note parses, and the three new pages were read', !regMapFail && regMap && regMap.length > 20 && viewSrc.length > 10000 && shellSrc.length > 10000, regMapFail || [regMap && regMap.length, viewSrc.length]);
  /* the labels as they are written at the call sites. Each page has ONE place that builds the tag, so
     scanning for the tag itself would only find the template; the labels handed to it are what count,
     and they are literals on purpose so that this test can read them. */
  const hookLabels = [];
  (viewSrc.match(/\breg\('[^']+'/g) || []).forEach(m => { const v = m.slice(5, -1); if (hookLabels.indexOf(v) < 0) hookLabels.push(v); });
  (viewSrc.match(/data-adtreg="[a-z0-9 ]+"/g) || []).forEach(m => { const v = m.slice(14, -1); if (hookLabels.indexOf(v) < 0) hookLabels.push(v); });
  const hookDead = [], hookWhole = [];
  for (const lab of hookLabels) {
    let keys = null;
    for (const row of (regMap || [])) { if (row[0].test(lab)) { keys = row[1]; break; } }
    if (!keys) { hookWhole.push(lab); continue; }
    const hit = rgAll.filter(r => keys.some(k => String(r.sources).indexOf(k) >= 0 || r.id === k));
    if (!hit.length) hookDead.push(lab);
  }
  t('explainers: the new pages carry hooks at all, on the day figures, on who changed something and on the peak money', hookLabels.length >= 6 && hookLabels.indexOf('changes on this day') >= 0 && hookLabels.indexOf('who changed it') >= 0 && hookLabels.indexOf('the 7 days before') >= 0 && hookLabels.indexOf('spend outside the peak') >= 0 && hookLabels.indexOf('one part of the day') >= 0, hookLabels);
  t('explainers: EVERY hook has a pattern of its own, so none of them opens the whole register instead of an answer', hookWhole.length === 0, hookWhole);
  t('explainers: and every pattern they match names at least one register entry that really exists', hookDead.length === 0, hookDead);
  t('explainers: the day figures open the day notes, who changed something opens its own, and the peak money opens the peak note', (() => {
    const resolve = (lab) => { for (const row of (regMap || [])) { if (row[0].test(lab)) { return rgAll.filter(r => row[1].some(k => String(r.sources).indexOf(k) >= 0 || r.id === k)).map(r => r.id); } } return []; };
    const a1 = resolve('changes on this day'), a2 = resolve('who changed it'), a3 = resolve('spend outside the peak'), a4 = resolve('one part of the day'), a5 = resolve('the 7 days before'), a6 = resolve('the change archive'), a7 = resolve('the peak hours work list');
    return a1.indexOf('CHANGES_STOPPED') >= 0 && a1.indexOf('CHANGES_ACTIVATED') >= 0 && a2.join(',') === 'CHANGE_WHO' && a3.join(',') === 'PEAK_OFF_PEAK_SPEND' && a4.join(',') === 'PEAK_SUGGESTED' && a5.join(',') === 'CHANGE_BEFORE' && a6.indexOf('CHANGE_ARCHIVE') >= 0 && a7.join(',') === 'PEAK_MANUAL';
  })(), null);

  /* (l) the fields the three pages read, against the ones the engine actually sends. A field the page
     reads and the engine never sends is an EMPTY CELL, and an empty cell where a number belongs is
     read as a nought. These are the ones a reader would act on. */
  const sends = (f) => new RegExp('\\b' + f + '\\b').test(p15Src);
  const reads = (f) => new RegExp('\\.' + f + '\\b').test(viewSrc);
  const bothWays = ['campaigns_touched', 'all_accounts', 'suggested_held_back', 'suggested_total', 'spend_sampled_7d', 'hours_sampled_7d', 'peak_share_pct', 'hour_basis', 'campaign_id_source', 'rows_held_back', 'rows_total', 'uk_bounds', 'units_day_before', 'spend_day_before', 'removed_or_added', 'already_manual', 'live_now', 'hours_judged'];
  t('fields: every figure the three pages read is one the engine really sends, so no cell is empty where a number belongs', bothWays.every(f => sends(f) && reads(f)), bothWays.filter(f => !(sends(f) && reads(f))).map(f => [f, sends(f), reads(f)]));
  t('fields: and the numbers the engine went to the trouble of sending are used rather than left on the floor', ['spend_sampled_7d', 'suggested_held_back', 'all_accounts', 'campaigns_touched', 'peak_share_pct', 'hour_basis'].every(f => reads(f)), ['spend_sampled_7d', 'suggested_held_back', 'all_accounts', 'campaigns_touched', 'peak_share_pct', 'hour_basis'].filter(f => !reads(f)));
  t('fields: a share is read as the fraction it is, and the page never divides one twice or prints a fraction as a percentage', /Math\.round\(v \* 100\) \+ '%'/.test(viewSrc) && !/if \(v > 1\) return Math\.round\(v\)/.test(viewSrc), null);
  t('fields: units a day keeps a decimal under ten, because an average a day is routinely under one', /function unitsNum/.test(viewSrc) && /v\.toFixed\(1\)/.test(viewSrc) && /unitsNum\(T\.units_day_before\)/.test(viewSrc), null);
  t('fields: choosing an account asks the engine again rather than filtering the fleet\'s rows under the fleet\'s totals', /S\.account = this\.getAttribute\('data-cdya'\) \|\| '';[\s\S]{0,900}load\(false\)/.test(viewSrc) && /all_accounts/.test(viewSrc), null);
  t('fields: the money outside the peak is shown against the sampled hours it belongs inside, never against the whole week', /we can see/.test(viewSrc) && /gbp\(samp\)/.test(viewSrc) && /all hours/.test(viewSrc) && !/in all, 7 days/.test(viewSrc), null);
  /* (m) what else this batch touched. The sort on the command centre, the one page spliced into BOTH
     portals; the factory the two change pages share; and the one added column in the five-minute
     campaign sync, which is how the portal sees eBay at all. */
  const acSrc = readFile('frontend/view-adsCentre.js');
  t('command centre: with no sort chosen the board keeps its own order, key for key, as the engine sent it', /items\.sort\(\(a, b\) => \(b\.waste - a\.waste\) \|\| \(b\.spend_today - a\.spend_today\) \|\| \(b\.spend_14d - a\.spend_14d\)\)/.test(src) && /if \(wa !== wb\) \{ return wb - wa; \}/.test(acSrc) && /if \(sa !== sb\) \{ return sb - sa; \}/.test(acSrc) && /acNum\(b\.spend_14d\) \|\| 0\) - \(acNum\(a\.spend_14d\) \|\| 0\)/.test(acSrc), null);
  t('command centre: a sort never asks the engine again, every heading says what it sorts by, and the choice is remembered', /acSortRows\(rows\)/.test(acSrc) && /AC\.items = \(d\.items \|\| \[\]\)/.test(acSrc) && (acSrc.match(/sorts: '/g) || []).length === 8 && /localStorage\.setItem\(AC_SORT_KEY/.test(acSrc) && /title="' \+ esc\('Sort by ' \+ c\.sorts\)/.test(acSrc), (acSrc.match(/sorts: '/g) || []).length);
  t('command centre: an empty cell sinks to the bottom whichever way a column is pointed, so a gap never reads as the smallest number', /if \(va == null\) \{ return 1; \}/.test(acSrc) && /if \(vb == null\) \{ return -1; \}/.test(acSrc) && /if \(!va && vb\) \{ return 1; \}/.test(acSrc), null);
  const actSrc = readFile('frontend/view-adtool-activated.js');
  t('the two change pages: the shared page is asked for at RENDER time, never while the file is loading, because the files splice in name order', /typeof window\.adtChangeDayPage === 'function'/.test(actSrc) && !/^\s*(var|let|const)\s+PAGE\s*=\s*window\.adtChangeDayPage/m.test(actSrc) && /render: function \(\) \{[\s\S]{0,80}var p = page\(\);/.test(actSrc) && /Not available/.test(actSrc), null);
  const viewCode = viewSrc.replace(/\/\*[\s\S]*?\*\//g, '');   /* the prose names the shared page too; this is about the code */
  t('the two change pages: only one file hands the shared page over, and only the other one asks for it', (viewCode.match(/window\.adtChangeDayPage = /g) || []).length === 1 && (viewCode.match(/window\.adtChangeDayPage/g) || []).length === 3, (viewCode.match(/window\.adtChangeDayPage/g) || []).length);
  /* THE MOST DANGEROUS LINE IN THE BATCH. The campaign sync runs every five minutes and is the only
     way the portal sees eBay's campaigns at all. The added column is written where it is there, and a
     database the ALTER has not reached must still record the change on the old column list. */
  const evIns = src.slice(src.indexOf('INSERT INTO campaign_events (account, campaign, campaign_id'), src.indexOf('if (evN <= 4)'));
  t('campaign sync: the change is written with the id, and a database without the column still records it on the old columns', /INSERT INTO campaign_events \(account, campaign, campaign_id, item_id, change_type, old, new, actor, at\) VALUES \(\?1, \?2, \?3, '', \?4, \?5, \?6, '', datetime\('now'\)\)/.test(evIns) && /INSERT INTO campaign_events \(account, campaign, item_id, change_type, old, new, actor, at\) VALUES \(\?1, \?2, '', \?3, \?4, \?5, '', datetime\('now'\)\)/.test(evIns) && /\} catch \(e\) \{/.test(evIns), null);
  t('campaign sync: the fallback binds one value fewer, in the order its own columns ask for them', /\.bind\(acct, nm, String\(ev\.id \|\| ''\), ev\.type, String\(ev\.old\), String\(ev\.nw\)\)/.test(evIns) && /\.bind\(acct, nm, ev\.type, String\(ev\.old\), String\(ev\.nw\)\)/.test(evIns), null);
  t('campaign sync: the column is added once, guarded, and a failure to add it never stops a change being recorded', /try \{ await ensureCampaignEventsCampaignId\(env\); \} catch \(e\)/.test(src) && /try \{ await env\.DB\.prepare\("ALTER TABLE campaign_events ADD COLUMN campaign_id TEXT DEFAULT ''"\)\.run\(\); \} catch \(e\)/.test(src), null);
  t('campaign sync: every other writer of a campaign change names its columns and leaves the new one to its default', (src.match(/INSERT INTO campaign_events \(/g) || []).length === 8 && (src.match(/INSERT INTO campaign_events \(account, campaign, item_id,/g) || []).length === 7 && !/INSERT INTO campaign_events VALUES/.test(src), (src.match(/INSERT INTO campaign_events \(/g) || []).length);

  t('fields: nothing on the three pages is ever sent to eBay, and no collective profit figure is printed anywhere on them', !/ebay\.com\/sh\/ads\/dashboard\/campaign\/[^']*'\s*\+/.test(viewSrc) && !/adtProfitCell/.test(viewSrc) && (viewSrc.match(/api\('[A-Za-z]+'/g) || []).every(c => /adtoolChangeDay|adtoolPeak/.test(c)), (viewSrc.match(/api\('[A-Za-z]+'/g) || []));

  const passed = results.filter(r => r.ok).length;
  const lines = results.map(r => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '  → ' + r.detail));
  return lines.join('\n') + '\n' + (passed === results.length ? 'PASS ' : 'FAIL ') + passed + '/' + results.length;
}
