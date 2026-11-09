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
  const i16 = src.indexOf('/* ADTOOL-P16-PURE-BEGIN */'); const j16 = src.indexOf('/* ADTOOL-P16-PURE-END */');
  /* 1 Nov: the hourly roll-up's own budget, its step order, its hour cursor and the print that
     decides whether a settled hour has moved. Pure on purpose, so "today first, and nothing begun
     that cannot finish" is a test and not a hope. */
  const i17 = src.indexOf('/* ADTOOL-P17-PURE-BEGIN */'); const j17 = src.indexOf('/* ADTOOL-P17-PURE-END */');
  if (i17 < 0 || j17 < 0) return 'FAIL: roll-up budget block markers not found';
  /* 24 Oct: the duplicate-safe ad merge, the truncation guard, the money-beats-status repair and the
     money-first rotation. Pure on purpose, so "an archived record must never win" is a test and not
     a hope. */
  const iAS = src.indexOf('/* ADSTATUS-PURE-BEGIN */'); const jAS = src.indexOf('/* ADSTATUS-PURE-END */');
  if (iAS < 0 || jAS < 0) return 'FAIL: ad-status block markers not found';
  /* 2 Nov: the traffic sampler's own rules — the quota-to-cadence arithmetic, the stagger across the
     ticks of a cycle, the backoff ladder and the baseline rule. Pure on purpose, because "may I call
     eBay now" is the question that decides whether the owner's hour clock holds anything at all. */
  const iTR = src.indexOf('/* TRAFFIC-SAMPLER-PURE-BEGIN */'); const jTR = src.indexOf('/* TRAFFIC-SAMPLER-PURE-END */');
  if (iTR < 0 || jTR < 0) return 'FAIL: traffic sampler block markers not found';
  /* 2 Nov: adtWindowSums, THE window rule. Product history's By period table is built from it and so
     is the Peak page's, which asks the database for the sums and mirrors this arithmetic. It is in
     here so the mirror can be held against it field by field: if the two pages could ever disagree
     about one listing, that test fails. */
  const iWS = src.indexOf('/* ADTOOL-WINDOWSUMS-PURE-BEGIN */'); const jWS = src.indexOf('/* ADTOOL-WINDOWSUMS-PURE-END */');
  if (iWS < 0 || jWS < 0) return 'FAIL: window-sums block markers not found';
  /* 9 Nov: the four pattern blocks over a window the reader chooses. The window arithmetic, the
     month and week boundaries and the four sums are pure on purpose: a window summed over one range
     and printed as another is the fault the shape exists to make impossible, and the only way to
     hold that is to work the window out here as well and compare. */
  const iPT = src.indexOf('/* ADTOOL-PATTERN-PURE-BEGIN */'); const jPT = src.indexOf('/* ADTOOL-PATTERN-PURE-END */');
  if (iPT < 0 || jPT < 0) return 'FAIL: pattern-window block markers not found';
  const pure = src.slice(ia, ib) + '\n' + src.slice(iv, jv) + (ip >= 0 && jp >= 0 ? '\n' + src.slice(ip, jp) : '') + (i3 >= 0 && j3 >= 0 ? '\n' + src.slice(i3, j3) : '') + (i4 >= 0 && j4 >= 0 ? '\n' + src.slice(i4, j4) : '') + (i5 >= 0 && j5 >= 0 ? '\n' + src.slice(i5, j5) : '') + (i6 >= 0 && j6 >= 0 ? '\n' + src.slice(i6, j6) : '') + (i7 >= 0 && j7 >= 0 ? '\n' + src.slice(i7, j7) : '') + (i8 >= 0 && j8 >= 0 ? '\n' + src.slice(i8, j8) : '') + (i9 >= 0 && j9 >= 0 ? '\n' + src.slice(i9, j9) : '') + (i10 >= 0 && j10 >= 0 ? '\n' + src.slice(i10, j10) : '') + (i11 >= 0 && j11 >= 0 ? '\n' + src.slice(i11, j11) : '') + (i12 >= 0 && j12 >= 0 ? '\n' + src.slice(i12, j12) : '') + (i13 >= 0 && j13 >= 0 ? '\n' + src.slice(i13, j13) : '') + (i14 >= 0 && j14 >= 0 ? '\n' + src.slice(i14, j14) : '') + (i15 >= 0 && j15 >= 0 ? '\n' + src.slice(i15, j15) : '') + (i16 >= 0 && j16 >= 0 ? '\n' + src.slice(i16, j16) : '') + '\n' + src.slice(i17, j17) + '\n' + src.slice(iAS, jAS) + '\n' + src.slice(iTR, jTR) + '\n' + src.slice(iWS, jWS) + '\n' + src.slice(iPT, jPT);   /* pure helpers of every phase */
  const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
  /* JavaScriptCore has no btoa/atob; the Workers runtime does. Small stand-ins so the PDF test can run here. */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const btoa = (str) => { let out = ''; for (let i = 0; i < str.length; i += 3) { const a = str.charCodeAt(i), b = str.charCodeAt(i + 1), c = str.charCodeAt(i + 2); const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c); out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]); } return out; };
  const atob = (str) => { const s2 = String(str).replace(/=+$/, ''); let out = '', bits = 0, acc = 0; for (const ch of s2) { const v = B64.indexOf(ch); if (v < 0) continue; acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); } } return out; };
  const F = new Function('round2', 'btoa', 'atob', pure + '\n return { adtFrontier, adtPlanVerdict2, adtRunVerdict, adtHourBands, adtHourBandMerge, adtWeekdaySentence, adtLever, adtWeekdayIndex, adtRealMargin, adtWeekdayLong, gbpPlain, ADTOOL_FRONTIER_MARKS, ADTOOL_CARRY_FIX_DAY, ADTOOL_HOUR_BASIS, ADTOOL_DOW, adtUkParts, adtSlot, adtWeekdayOf, adtDom, adtIsoWeek, adtAddDays, adtMargin, adtOrderBrain, adtTaxonomy, adtDeltas, adtReconcile, adtCapHour, adtVerdicts, adtAdState, adtAdEvents, parseAdsReportCampaignTsv, adtRng, adtShrink, adtDecay, adtWeekdayProfile, adtShareProfile, adtPermWeekday, adtPermSpread, adtJsd, adtRegime, adtTheilSen, adtPelt, adtStage, adtDescriptors, adtSeasonalNaive, adtTsb, adtPoissonGlm, adtHoltWinters, adtMase, adtCoverage, adtForecastWith, adtBacktest, adtBands, adtChooseModel, adtListingAlerts, adtAccountSpendAlerts, adtDiminishingReturns, adtRoasLevers, adtPdf, adtAlertUrgency, adtWeekBehaviour, adtScenarios, adtStageExplain, adtDecide, adtScoreDecision, adtSampledYesterday, adtScoreTally, adtSheetLawVerdict, adtCarryForward, adtValidateNarrative, adtNumbersIn, adtFleetNarrativeTemplate, adtProductNarrativeTemplate, adtApplyCaps, adtApplyPlan, adtSheetLawOrders, adtSheetLawProfit, adtStripCollectiveProfit, adtCpcDerived, adtCpcTotals, adtCpcHeld, adtTrend, round4, adtKvCanon, adtKvKey, adtWarmUntil, ADTOOL_KV_DEFAULT_PERIOD, ADTOOL_IMPRESSIONS_FROM, adtSaleTimeline, adtSaleStatus, adtSaleSuccessor, adtSaleDiscountObserved, adtParseDiscountPct, adtSaleCohorts, adtSaleEligibility, adSaleDiscountFraction, adSalePctText, adSaleRules, adSaleProfitAfter, adSaleVerdict, adSaleBatchDay, adSaleCalendar, adSaleNextEligible, adSaleBatches, adSaleBatchKey, adSaleBatchKeyParse, adSaleDayGap, adSaleNearPrice, adSaleLedgerRead, adSalePaidPerUnit, adSalePromoSaleFromXml, adSaleEventNamed, adSaleMembership, adSaleSkipReason, adSaleCountMembership, adSaleReasonText, adSaleMorningAfter, adSalePriceSteps, adSalePriceClocks, adSaleCohorts2, adTradeRequestXml, adTradeAckOf, ADTOOL_SALE_PENNY, ADTOOL_SALE_SKIP_REASONS, ADTOOL_SALE_SKIP_WORDS, ADTOOL_SALE_SKIP_SHORT, ADTOOL_TRADE_XML_FIELDS, ADTOOL_SALE_DEFAULTS, ADTOOL_SALE_CONFIG_KEYS, ADTOOL_SALE_VERDICTS, ADTOOL_SALE_WEEKDAYS, ADTOOL_SALE_RESTRICTION_DAYS, ADTOOL_SALE_MAX_DAYS, ADTOOL_SALE_COHORT_CAP, ADTOOL_SALE_BATCHES_AHEAD, ADTOOL_FEE_RATE, adtPeriod, adtPeriodOr, adtDaySrc, adtTodayRows, adtTodayTuple, adtTodayRowHonest, adtHourCurve, adtRoleAllowed, adtPacificOffsetMin, adtSamplingFromMin, adtInSamplingWindow, adtSamplingFromText, adtSamplingWindowText, ADTOOL_ROLES, ADTOOL_PERIOD_KEYS, ADTOOL_CUSTOM_MAX_DAYS, ADTOOL_PROFIT_LAW, ADTOOL_APPLY_ENDPOINTS, ADTOOL_ALERT_RULES, ADTOOL_MARGIN_CAP, ADTOOL_MIN_SP, adtDeptOf, adtDeptRules, adtDeptSentences, adtRegInternal, adtRegRows, ADTOOL_DEPT_DEFAULTS, ADTOOL_DEPT_CONFIG_KEYS, ADTOOL_DEPT_ORDER, ADTOOL_DEPT_NAMES, ADTOOL_REGISTER_INTERNAL, adtMoneyNum, adtCampStatusKey, adtCampStatusMatch, adtRateRoas, adtRateCpc, adtCampaignBudgetShare, adtCampaignOverlap, adtCampaignRollup, adtUkMidnightUtcMs, adtUtcStamp, adtUkDayUtcBounds, adtUkDayWindows, adtUkClockOf, adtChangeShape, adtAdChangeKind, adtCampaignChangeKind, adtApplyTargetState, adtChangeAttribution, adtChangeArchive, adtPeakRules, adtPeakRule, adtInHourBands, adtOffPeakSpend, ADTOOL_AD_STATES, ADTOOL_CHANGE_STOPPED_KINDS, ADTOOL_CHANGE_ACTIVATED_KINDS, ADTOOL_PEAK_DEFAULTS, ADTOOL_PEAK_CONFIG_KEYS, ADTOOL_SLOT_NAMES, ADTOOL_SLOT_PHRASE, ADTOOL_SLOT_CLOCK, adStatusRank, adIdNewer, adPickLiveAd, adGroupAdsByListing, adMergeAds, adsFetchTruncated, adRepairTargets, adsRotationOrder, adsRotationPick, adsAgeWords, adsOldestStamp, adDynamicRate, adLiveSplitClass, adLiveSplitClassify, ADTOOL_LIVE_SPLIT_CLASSES, ADTOOL_LIVE_SPLIT_NAMES, adPotentialRules, adPotentialCpc, adPotentialBucket, ADTOOL_POTENTIAL_BUCKETS, ADTOOL_POTENTIAL_DEFAULTS, ADTOOL_POTENTIAL_CONFIG_KEYS, adPeakHoursParse, adPeakHoursText, adInPeakRanges, adPeakNextChange, adPeakApplyCaps, adPeakSwitchDecide, adPeakCampaignPick, adPeakCampaignsNow, adPeakCampaignFill, ADTOOL_PEAK_SWITCH_CAP, ADTOOL_PEAK_HOURS_HELP, adtPeakBelieved, adtReportSentLive, adPeakStampMs, adPeakBoundaryMs, adPeakMissedSends, adPeakReadingDisagree, ADTOOL_PEAK_GRACE_MIN, ADTOOL_PEAK_SETTLE_MIN, adPeakUkDayOf, adPeakUkClock, adPeakCohortEntry, adPeakCohortEntries, adPeakInCohort, adPeakCohortOn, adPeakCohortIds, adPeakCohortSql, adPeakCohortJoin, adPeakCohortBeforeJoin, adPeakHoursToday, adPeakSalesSplit, adPeakAvoided, adPeakReconcile, ADTOOL_PEAK_COHORT_CAP, ADTOOL_FRESH_DEFAULTS, ADTOOL_FRESH_CONFIG_KEYS, adtFreshRules, adtFreshAgeMin, adtFreshVerdict, adtFreshStamp, adtSamplerRuns, ADTOOL_SAMPLER_EVERY_MIN, ADTOOL_SAMPLER_RUN_SPLIT_S, ADTOOL_SAMPLER_RUNS_SHOWN, ADTOOL_SAMPLER_ALERT_GRACE_MIN, ADTOOL_REGIME_JSD, ADTOOL_REGIME_CONSEC, ADTOOL_REGIME_MIN_ORDERS, ADTOOL_PEAK_PLAN_DEFAULTS, ADTOOL_PEAK_PLAN_CONFIG_KEYS, ADTOOL_PEAK_PLAN_BOUNDARY_HOURS, ADTOOL_PEAK_HOLDS, ADTOOL_PEAK_SCHEDULE_STATES, adPeakPad, adPeakPlanRules, adPeakProfile, adPeakDeadHours, adPeakSchedule, adPeakWantFor, adPeakTracking, adPeakPlanTick, adPeakNextSwitch, adPeakOffWhenProductive, adChangeBy, ADTOOL_CHANGE_AUTOMATIC_MIN, adPeakListingProfile, adVideoIdsFromXml, adVideoThumbDate, adVideoExpiryDate, adVideoMediaDate, adVideoBeforeAfter, adVideoCohortEntry, adVideoCohortEntries, adVideoCohortCounts, adVideoVsNoVideo, ADTOOL_COHORTS, ADTOOL_COHORT_WORDS, ADTOOL_VIDEO_WINDOW_CAP, ADTOOL_VIDEO_WINDOWS, ADTOOL_VIDEO_DATA_START, ADTOOL_VIDEO_API_TRUTH, ADTOOL_VIDEO_DATE_SOURCES, ADTOOL_VIDEO_DATE_AGREE_S, ADTOOL_VIDEO_DATE_BOTH, ADTOOL_VIDEO_DATE_THUMB, ADTOOL_VIDEO_DATE_EXPIRY, ADTOOL_VIDEO_DATE_REFUSED, ADTOOL_VIDEO_SWEEP_PER_ACCOUNT, ADTOOL_VIDEO_SWEEP_FETCH_CAP, ADTOOL_VIDEO_SWEEP_DATES, ADTOOL_VIDEO_RECHECK_DAYS, ADTOOL_VIDEO_SWEEP_MS, ADTOOL_VIDEO_SWEEP_PARALLEL, ADTOOL_VIDEO_SWEEP_DATE_PARALLEL, adtFetchSlices, adtKvPrefix, adtRollupPlan, adtRollupStepNote, adtRollupStepBlend, adtRollupStepCosts, adtRollupCostMs, adtRollupHourCursor, adtRollupOwed, adtHourPrint, adtRollupFreshRules, adtRollupAgeWords, ADTOOL_ROLLUP_BUDGET_MS, ADTOOL_ROLLUP_RESERVE_MS, ADTOOL_ROLLUP_ROWS_PER_S, ADTOOL_ROLLUP_COST_MARGIN, ADTOOL_ROLLUP_COST_DECAY, ADTOOL_ROLLUP_DEAD_MIN, ADTOOL_ROLLUP_STEP_MS, ADTOOL_ROLLUP_ORDER, ADTOOL_ROLLUP_DAY_ROWS, ADTOOL_ROLLUP_WHOLE_DAY_MS, trfParseUtc, trfReserveCalls, trfSampleIntervalMin, trfCadenceMin, trfCycleTicks, trfTickIndex, trfAccountTick, trfBackoffNextMin, trfBackoffUntil, trfBackoffLeftMin, trfSampleDecision, trfClockCredit, trfQuotaFromRateLimits, trfQuotaNote, trfQuotaResourcesSeen, trfSpreadCredit, trfPtDate, trfPtDayStartMs, trfPtShift, TRAFFIC_DOC_LIMIT_PER_DAY, TRAFFIC_LISTING_CALLS_PER_DAY, TRAFFIC_QUOTA_RESERVE_PCT, TRAFFIC_QUOTA_RESERVE_KEY, TRAFFIC_BACKOFF_KEY, TRAFFIC_BACKOFF_MIN_KEY, TRAFFIC_BACKOFF_FIRST_MIN, TRAFFIC_BACKOFF_MAX_MIN, TRAFFIC_TICK_MIN, TRAFFIC_QUOTA_PATH, TRAFFIC_QUOTA_API, TRAFFIC_QUOTA_RESOURCE, adtWindowSums, ADTOOL_PEAK_PERIOD_KEYS, ADTOOL_PEAK_PERIOD_FIELDS, ADTOOL_PEAK_PERIOD_MONEY, adPeakPeriodZero, adPeakPeriodAdd, adPeakPeriodFinish, adPeakPeriodSums, adPeakPeriodFromAgg, adPeakPeriodSelect, adPeakItemsSql, adPeakPeriodRow, adPeakPeriodOrNull, adPeakPeriodToday, adPeakPeriodSpliceToday, adPeakPeriodsEmpty, adtRollupForced, adtRollupSkipsAfter, adtRollupMine, adtRollupClaimVerdict, adtRollupTailNext, adtRollupBehind, adtRollupOwedDays, adtRollupOwedNext, ADTOOL_ROLLUP_HOURLY_STEPS, ADTOOL_ROLLUP_CATCHUP_STEPS, ADTOOL_ROLLUP_CATCHUP_BUDGET_MS, ADTOOL_ROLLUP_PASS_CALLS, ADTOOL_OWED_FIELDS, ADTOOL_OWED_CAP, ADTOOL_OWED_SCAN_DAYS, ADTOOL_PROFILES_DAY_SQL, ADTOOL_FORECAST_DAY_SQL, ADTOOL_ROLLUP_LOCK_JOB, ADTOOL_ROLLUP_LEASE_MARGIN_MS, ADTOOL_PATTERN_KINDS, ADTOOL_PATTERN_MONTHS, ADTOOL_PATTERN_DATES_CAP, adListingDayWords, adListingMonthWords, adListingMonthEnd, adListingPattern, adListingPatternKey, adListingPatternWindow, adListingSlots, adListingWeekday, adListingHourWeekday, adListingDates, ADTOOL_PERIODS_NOTE, adPeakPeriodChunks };')(round2, btoa, atob);
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
  t('alerts: every rule A01–A23 has severity, cool-down and a suggested action', Object.keys(F.ADTOOL_ALERT_RULES).length === 23 && Object.keys(F.ADTOOL_ALERT_RULES).every(k => F.ADTOOL_ALERT_RULES[k].sev && F.ADTOOL_ALERT_RULES[k].cool >= 1 && F.ADTOOL_ALERT_RULES[k].action), Object.keys(F.ADTOOL_ALERT_RULES).length);
  /* Phase 4 big update: every one of the 19 rules carries a why_matters sentence, and no rule text says 'est. ad profit' */
  t('alerts: all 23 rules carry a why_matters sentence (a real sentence, not blank)', Object.keys(F.ADTOOL_ALERT_RULES).length === 23 && Object.keys(F.ADTOOL_ALERT_RULES).every(k => typeof F.ADTOOL_ALERT_RULES[k].why_matters === 'string' && F.ADTOOL_ALERT_RULES[k].why_matters.length >= 20), Object.keys(F.ADTOOL_ALERT_RULES).filter(k => !F.ADTOOL_ALERT_RULES[k].why_matters));
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
  t('depts route: the cache is keyed by the caller\'s profit class and holds for five minutes (10 Nov: every advertising figure within five minutes)', /adtKvMemo\(ctx\.env, 'adtoolDepts', adtProfitClass\(ctx\.user\)/.test(src) && /adtoolDepts: 300000/.test(src), null);
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
  const rgNames = ['ADTOOL_REGISTER_P1B', 'ADTOOL_REGISTER', 'ADTOOL_REGISTER_P2', 'ADTOOL_REGISTER_P3', 'ADTOOL_REGISTER_P4', 'ADTOOL_REGISTER_P5', 'ADTOOL_REGISTER_P6', 'ADTOOL_REGISTER_P9', 'ADTOOL_REGISTER_P10', 'ADTOOL_REGISTER_P11', 'ADTOOL_REGISTER_P13', 'ADTOOL_REGISTER_P14', 'ADTOOL_REGISTER_P15', 'ADTOOL_REGISTER_P16'];
  const rgAll = []; let rgParseFail = null;
  for (const nm of rgNames) {
    const i = src.indexOf('const ' + nm + ' = [');
    if (i < 0) { rgParseFail = rgParseFail || nm + ' is missing'; continue; }
    const j = src.indexOf('\n];', i);
    try {
      /* 31 Oct, §4: an entry may be written FROM a setting rather than repeating its value in words
         (the house rule: no config value typed into copy), so the settings an entry may name are in
         scope here exactly as they are in the engine. A register row is prose and never arithmetic,
         so only plain numbers are ever handed in. */
      const rgConsts = ['ADTOOL_VIDEO_RECHECK_DAYS', 'ADTOOL_VIDEO_SWEEP_PER_ACCOUNT', 'ADTOOL_VIDEO_SWEEP_DATES', 'ADTOOL_VIDEO_WINDOW_CAP', 'ADTOOL_VIDEO_WINDOWS', 'ADTOOL_SAMPLER_EVERY_MIN'];
      const rgVals = rgConsts.map(k => F[k]);
      for (const row of new Function(...rgConsts, 'return ' + src.slice(i + ('const ' + nm + ' = ').length, j + 3))(...rgVals)) rgAll.push({ array: nm, id: row[0], name: row[1], formula: row[2], sources: row[3], recompute: row[4], recheck: row[5] });
    } catch (e) { rgParseFail = rgParseFail || (nm + ': ' + e.message); }
  }
  t('register: all fourteen arrays parse, and together they document every number the tool shows', !rgParseFail && rgAll.length >= 80 && rgAll.every(r => r.id && r.name && r.formula && r.sources && r.recompute && r.recheck), rgParseFail || rgAll.length);

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
  /* three writes now: adding a listing, taking one off, and holding one on or off by hand (31 Oct, §3) */
  t('peak list: every write stamps the person who made it', (p15Src.match(/String\(\(ctx\.user \|\| \{\}\)\.email \|\| ''\)/g) || []).length === 3, (p15Src.match(/String\(\(ctx\.user \|\| \{\}\)\.email \|\| ''\)/g) || []).length);
  t('change and peak pages: the pages themselves send nothing to eBay (the job does, elsewhere); their only writes are the documentation, the switches, the by-hand list and the audit trail of who armed what', !/fetch\(/.test(p15Src) && !/api\.ebay\.com/.test(p15Src) && !/ebayAccessToken/.test(p15Src) && (p15Src.match(/INSERT INTO/g) || []).length === (p15Src.match(/INSERT INTO (adtool_peak_items|adtool_number_register|portal_config|audit)/g) || []).length && p15Src.replace(/DO UPDATE SET/g, '').match(/UPDATE\s+([A-Za-z_]+)/g).every(x => x === 'UPDATE adtool_peak_items'), [(p15Src.match(/INSERT INTO/g) || []).length, p15Src.replace(/DO UPDATE SET/g, '').match(/UPDATE\s+([A-Za-z_]+)/g)]);
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
  /* 1 Nov: the peak page's half of this moved to the roll-up's own stamp. It read the roll-up's last
     SUCCESSFUL finish, so through thirty hours of killed runs it read "updated 07:26 UK" all day with
     the figures beside it standing still, and the one thing it must never be is reassuring. */
  t('change and peak pages: both carry a freshness tag, and the change pages name the slower of the two syncs behind them', /fresh: await adtChangeFresh\(env\)/.test(p15Src) && /fresh: await adtRollupFresh\(env\)/.test(p15Src) && /cadence: 'every 15 min'/.test(p15Src) && /job IN \('adsItems', 'adsSync'\)/.test(p15Src), null);
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
  /* 28 Oct: this entry USED to promise that nothing on the peak page ever reaches eBay, and the test
     held it to that wording. The owner's Change Spec made the system switch the list itself, so the
     promise would now be a lie and the test has to hold the entry to the new truth instead: the hours
     are an instruction, it is sent only for an account whose own switch is on, and it is written down
     either way. A test that keeps asserting a promise the code has stopped keeping is worse than no
     test, because it reads as proof the promise still stands. */
  t('register: the by-hand list entry says the hours are an instruction, sent only where an account is switched on', /not a timer/.test(p15Reg[8].formula) && /own live switch is on/.test(p15Reg[8].formula) && /would-send/.test(p15Reg[8].formula) && /read back/.test(p15Reg[8].formula) && !/ever sent to eBay/.test(p15Reg[8].formula), p15Reg[8].formula.slice(0, 60));
  t('register: the suggested list entry prints no figure of its own, because the page prints the ones in force', !/\d/.test(p15Reg[6].formula), p15Reg[6].formula);

  /* (k) THE EXPLAINER HOOKS, end to end. A tag on a page carries a label; the shell matches that
     label against ADT_REG_MAP and shows the register rows the matched keys name. A label with no
     pattern of its own falls through to the whole register, which is noise where a reader asked one
     question — so every tag the three new pages carry is resolved here, through the real map, right
     down to a real row. This is the only test in the file that reads the frontend, and it reads it
     because the two halves can only be wrong about each other. */
  const readFile = (rel) => { const n = $.NSString.stringWithContentsOfFileEncodingError(root + '/' + rel, $.NSUTF8StringEncoding, null); return n && n.js ? n.js : ''; };
  const shellSrc = readFile('src/shell.html');
  /* 28 Oct: there are two of these pages now, not three. view-adtool-activated.js was deleted when
     the merge landed, and readFile answers '' for a file that is not there, so leaving it in the list
     would have read as a page carrying no hooks at all rather than as a page that is gone. */
  const viewSrc = ['frontend/view-adtool-stopped.js', 'frontend/view-adtool-peak.js'].map(readFile).join('\n');
  let regMap = null, regMapFail = null;
  try {
    const mi = shellSrc.indexOf('var ADT_REG_MAP = ['), mj = shellSrc.indexOf('\n];', mi);
    regMap = new Function('return ' + shellSrc.slice(mi + 'var ADT_REG_MAP = '.length, mj + 3))();
  } catch (e) { regMapFail = e.message; }
  t('explainers: the shell\'s map of tag to note parses, and both change-and-peak pages were read', !regMapFail && regMap && regMap.length > 20 && viewSrc.length > 10000 && shellSrc.length > 10000, regMapFail || [regMap && regMap.length, viewSrc.length]);
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


  /* ---------------------------------------------------------------------------------------------
     THE FRIDAY BATCH (the owner's request, 6 Nov 2026)
     "Every Friday, every week, we will run a new sale event for 14 days. Every listing that is
      eligible is entered by hand into that event. The portal should give us the data: each item's
      current profit, and what its profit will be if we run it in a sale at 5%."
     What is held here: the four settings and their fallbacks; the money at the sale price, derived
     from the books' own rule rather than asserted beside it; the verdict at its own boundary; the
     batch day for every day of a week; the grouping; and that a reader who may not see collective
     money still gets every figure this page needs, because not one of them is a profit total.
     --------------------------------------------------------------------------------------------- */
  const slR0 = F.adSaleRules({});
  t('sale batch: with nothing set, the four figures in force are the owner\'s own (a twentieth off, fourteen days, Friday, a pound a unit) and the day is named from the number',
    slR0.discount_pct === 0.05 && slR0.days === 14 && slR0.batch_weekday === 5 && slR0.batch_weekday_name === 'Friday' && slR0.floor === 1 &&
    slR0.fee_rate === F.ADTOOL_FEE_RATE && slR0.restriction_days === 14 && slR0.discount_text === '5%' && F.ADTOOL_SALE_WEEKDAYS.length === 7, slR0);
  t('sale batch: each of the four reads its own stored key, and a blank, an unreadable or a negative edit falls back to the figure in force instead of blanking the page',
    Object.keys(F.ADTOOL_SALE_CONFIG_KEYS).length === 4 && Object.keys(F.ADTOOL_SALE_CONFIG_KEYS).every(k => F.ADTOOL_SALE_CONFIG_KEYS[k] === 'adtool_sale_' + (k === 'min_profit' ? 'min_profit' : k)) &&
    (() => { const r = F.adSaleRules({ adtool_sale_discount_pct: '', adtool_sale_days: 'ten', adtool_sale_batch_weekday: '9', adtool_sale_min_profit: '-2' }); return r.discount_pct === 0.05 && r.days === 14 && r.batch_weekday === 5 && r.floor === 0; })(), F.ADTOOL_SALE_CONFIG_KEYS);
  const slR1 = F.adSaleRules({ adtool_sale_discount_pct: '10', adtool_sale_days: '7', adtool_sale_batch_weekday: '1', adtool_sale_min_profit: '0.50' });
  t('sale batch: Management\'s own figures are taken, strings included, and 1 is Monday', slR1.discount_pct === 0.1 && slR1.discount_text === '10%' && slR1.days === 7 && slR1.batch_weekday === 1 && slR1.batch_weekday_name === 'Monday' && slR1.floor === 0.5, slR1);
  t('sale batch: a length past the longest event eBay allows is cut back to it, and a length of nothing becomes one day', F.adSaleRules({ adtool_sale_days: '90' }).days === F.ADTOOL_SALE_MAX_DAYS && F.adSaleRules({ adtool_sale_days: '0' }).days === 1, [F.adSaleRules({ adtool_sale_days: '90' }).days, F.ADTOOL_SALE_MAX_DAYS]);
  t('sale batch: a discount reads the same whether it is stored the way a person types it or as a fraction, and a whole price off or an unreadable one is nothing at all rather than no discount',
    F.adSaleDiscountFraction(5) === 0.05 && F.adSaleDiscountFraction(0.05) === 0.05 && F.adSaleDiscountFraction(0) === 0 &&
    F.adSaleDiscountFraction(1) === null && F.adSaleDiscountFraction(100) === null && F.adSaleDiscountFraction('') === null && F.adSaleDiscountFraction(-1) === null &&
    F.adSalePctText(0.05) === '5%' && F.adSalePctText(null) === 'not known', null);

  /* (a) THE MONEY. The shortcut the page prints is held against the books' own rule applied to the
     discounted price: the cost the margin implies is backed out, the price and its percentage fees
     are discounted, and the law is run again. If the two could ever disagree, this fails. */
  const slPA = F.adSaleProfitAfter(20, 4, 0.05, F.ADTOOL_FEE_RATE);
  const slCost = 20 - F.ADTOOL_FEE_RATE * 20 - 4 / 0.8;                       /* the cost £4 a unit at £20 implies */
  const slLaw = round2(0.8 * (0.95 * 20 - F.ADTOOL_FEE_RATE * 0.95 * 20 - slCost));
  t('sale profit: £20 at a twentieth off with £4 a unit now leaves £3.34, and the books\' own rule run again on the discounted price gives the same answer, so the shortcut IS the law and not a second opinion about it',
    slPA.profit_after === 3.34 && slPA.drop === 0.66 && near(slLaw, slPA.profit_after, 0.005) && near(slCost, 11.62, 0.005), [slPA, slLaw, slCost]);
  t('sale profit: no discount at all gives the margin back exactly as it went in, and the money taken off is nothing',
    F.adSaleProfitAfter(20, 4, 0, F.ADTOOL_FEE_RATE).profit_after === 4 && F.adSaleProfitAfter(20, 4, 0, F.ADTOOL_FEE_RATE).drop === 0 &&
    F.adSaleProfitAfter(31.5, 7.25, 0, F.ADTOOL_FEE_RATE).profit_after === 7.25, null);
  t('sale profit: a margin we do not have stays not known all the way out, never nought, and so does a listing with no price or no readable discount',
    F.adSaleProfitAfter(20, null, 0.05).profit_after === null && F.adSaleProfitAfter(20, null, 0.05).drop === null && /do not know/.test(F.adSaleProfitAfter(20, null, 0.05).why) &&
    F.adSaleProfitAfter(20, '', 0.05).profit_after === null && F.adSaleProfitAfter(null, 4, 0.05).profit_after === null && F.adSaleProfitAfter(0, 4, 0.05).profit_after === null &&
    F.adSaleProfitAfter(20, 4, null).profit_after === null && F.adSaleProfitAfter(20, 4, 100).profit_after === null, [F.adSaleProfitAfter(20, null, 0.05), F.adSaleProfitAfter(20, 4, null)]);
  t('sale profit: a margin of exactly nought is a real figure and not a missing one, so the discount turns it into a loss rather than into not known',
    F.adSaleProfitAfter(20, 0, 0.05).profit_after === -0.66 && F.adSaleVerdict(F.adSaleProfitAfter(20, 0, 0.05).profit_after, 1) === 'loses', F.adSaleProfitAfter(20, 0, 0.05));
  t('sale profit: the fee share is the caller\'s to hand in, so a listing judged at a different fee moves with it and nothing is wired to one number',
    F.adSaleProfitAfter(20, 4, 0.05, 0).drop === 0.8 && F.adSaleProfitAfter(20, 4, 0.05, 0.5).drop === 0.4, [F.adSaleProfitAfter(20, 4, 0.05, 0).drop, F.adSaleProfitAfter(20, 4, 0.05, 0.5).drop]);

  /* (b) THE VERDICT, at its own boundary. The figure on screen has to mean what it says: exactly the
     floor passes, a penny under does not, and nought is a loss and not a thin pass. */
  t('sale verdict: exactly the floor is worth it, a penny under it is thin, a penny over nothing is still thin, nought and below lose, and no margin is not known',
    F.adSaleVerdict(1, 1) === 'worth it' && F.adSaleVerdict(1.01, 1) === 'worth it' && F.adSaleVerdict(0.99, 1) === 'thin' && F.adSaleVerdict(0.01, 1) === 'thin' &&
    F.adSaleVerdict(0, 1) === 'loses' && F.adSaleVerdict(-0.5, 1) === 'loses' && F.adSaleVerdict(null, 1) === 'unknown' && F.adSaleVerdict('', 1) === 'unknown', null);
  t('sale verdict: a floor of nothing makes every listing that earns anything worth it, and the floor is never read as negative', F.adSaleVerdict(0.01, 0) === 'worth it' && F.adSaleVerdict(0.01, -5) === 'worth it' && F.adSaleVerdict(0, 0) === 'loses', null);
  t('sale verdict: the order the batch is sorted by puts a losing listing above everything else, and a listing we cannot judge above the ones that pay',
    JSON.stringify(F.ADTOOL_SALE_VERDICTS) === JSON.stringify(['loses', 'thin', 'unknown', 'worth it']), F.ADTOOL_SALE_VERDICTS);

  /* (c) THE BATCH DAY, every day of a week. 6 Nov 2026 is a Friday. */
  const slWeek = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map(d => F.adSaleBatchDay(d, 5));
  t('sale batch day: Monday to Friday all land on Friday 6 Nov, and the Saturday and the Sunday wait for the 13th, so a listing eligible ON the batch day goes in that day instead of waiting a week',
    JSON.stringify(slWeek) === JSON.stringify(['2026-11-06', '2026-11-06', '2026-11-06', '2026-11-06', '2026-11-06', '2026-11-13', '2026-11-13']), slWeek);
  t('sale batch day: the setting\'s numbering is converted in one place, so a batch day of Monday moves every answer with it, and a day that is not a date has no answer at all',
    F.adSaleBatchDay('2026-11-06', 1) === '2026-11-09' && F.adSaleBatchDay('2026-11-09', 1) === '2026-11-09' && F.adSaleBatchDay('2026-11-08', 7) === '2026-11-08' &&
    F.adSaleBatchDay('friday', 5) === null && F.adSaleBatchDay('', 5) === null && F.adSaleBatchDay('2026-11-07', 99) === '2026-11-13', null);
  const slCal = F.adSaleCalendar('2026-11-06', slR0), slCalSat = F.adSaleCalendar('2026-11-07', slR0);
  t('sale calendar: on the Friday itself the batch coming IS today, the three after it are a week apart, and a fourteen-day event opened on the 6th runs to the 19th',
    slCal.f0 === '2026-11-06' && slCal.batches[0].is_today === true && slCal.batches[0].label === 'today' && slCal.batches[0].ends_on === '2026-11-19' &&
    slCal.f1 === '2026-11-13' && slCal.f2 === '2026-11-20' && slCal.f3 === '2026-11-27' && slCal.batches.length === F.ADTOOL_SALE_BATCHES_AHEAD, slCal);
  t('sale calendar: on the Saturday the batch coming is the next Friday and is not called today', slCalSat.f0 === '2026-11-13' && slCalSat.batches[0].is_today === false && slCalSat.batches[0].label === 'this Friday' && slCalSat.batches[1].label === 'next Friday', slCalSat);

  /* (d) WHEN A LISTING COMES ROUND. A listing in a sale waits out eBay's restriction from the day its
     event ends, and the page then puts it on the first batch day on or after that. A listing with no
     readable clock gets NO date and keeps its own reason, because a made-up date here is a listing
     somebody enters and eBay silently drops. */
  const slNe1 = F.adSaleNextEligible({ in_sale: true, ends: '2026-11-20' }, '2026-11-06', slR0);
  const slNe2 = F.adSaleNextEligible({ in_sale: true, ends: '2026-11-18' }, '2026-11-06', slR0);
  t('sale next eligible: a listing in a sale ending 20 Nov comes round on 4 Dec (the event ends, then the fourteen days), which is itself a Friday; one ending 18 Nov comes round on the Wednesday and waits for the Friday',
    slNe1.on === '2026-12-04' && /waits 14 days/.test(slNe1.why) && F.adSaleBatchDay(slNe1.on, 5) === '2026-12-04' &&
    slNe2.on === '2026-12-02' && F.adSaleBatchDay(slNe2.on, 5) === '2026-12-04', [slNe1, slNe2]);
  t('sale next eligible: a date already gone reads as today, a listing whose clock is over with no date reads as today, and a listing with no clock at all has no date and says why in its own words',
    F.adSaleNextEligible({ eligible_on: '2026-10-30' }, '2026-11-06', slR0).on === '2026-11-06' &&
    F.adSaleNextEligible({ eligible_on: '2026-11-20' }, '2026-11-06', slR0).on === '2026-11-20' &&
    F.adSaleNextEligible({ status: 'eligible' }, '2026-11-06', slR0).on === '2026-11-06' &&
    F.adSaleNextEligible({ status: 'no-event', why: 'listed 3 days ago, needs 14' }, '2026-11-06', slR0).on === null &&
    F.adSaleNextEligible({ status: 'no-event', why: 'listed 3 days ago, needs 14' }, '2026-11-06', slR0).why === 'listed 3 days ago, needs 14' &&
    F.adSaleNextEligible({ in_sale: true, ends: '' }, '2026-11-06', slR0).on === null, null);

  /* (e) THE GROUPING, over one worked set. Eight listings across two accounts, every group reached. */
  const slRows = [
    { item_id: '100000000001', account: 'A', price: 20, margin_before_ads: 4, margin_source: 'orders', status: 'eligible', eligible_on: '2026-11-01', units_7d: 2, units_30d: 10, actual_profit_7d: 3, actual_profit_30d: 12, ad_spend_7d: 1.5 },
    { item_id: '100000000002', account: 'A', price: 20, margin_before_ads: 1.2, margin_source: 'estimate', status: 'eligible', eligible_on: '2026-11-06', units_30d: 5 },
    { item_id: '100000000003', account: 'A', price: 20, margin_before_ads: 0.3, margin_source: 'ali cost', status: 'eligible', eligible_on: '2026-11-05', units_30d: 2 },
    { item_id: '100000000004', account: 'A', price: 20, margin_before_ads: null, margin_source: 'none', status: 'eligible', eligible_on: '2026-11-06', units_30d: 7 },
    { item_id: '100000000005', account: 'B', price: 20, margin_before_ads: 0.9, status: 'waiting', eligible_on: '2026-11-10', units_30d: 3 },
    { item_id: '100000000006', account: 'B', price: 20, margin_before_ads: 2, status: 'waiting', eligible_on: '2026-11-25', units_30d: 4 },
    { item_id: '100000000007', account: 'B', price: 20, margin_before_ads: 4, in_sale: true, ends: '2026-11-20', status: 'live' },
    { item_id: '100000000008', account: 'B', price: 20, margin_before_ads: 4, status: 'no-event', why: 'listed 3 days ago, needs 14' },
  ];
  const slB = F.adSaleBatches(slRows, '2026-11-06', Object.assign({}, slR0, { events: { B: { name: 'Autumn', discount_text: '5%', starts: '2026-11-07', ends: '2026-11-20', days_left: 14, covers: 'whole shop' } } }));
  t('sale grouping: four of the eight go in on the Friday, one on the next, one on a later batch day, one is already in a sale and one has no date, and every count agrees with its group',
    slB.counts.this_friday === 4 && slB.counts.next_friday === 1 && slB.counts.later === 1 && slB.counts.batch_days_later === 1 && slB.counts.in_sale_now === 1 && slB.counts.no_date === 1 &&
    slB.groups.this_friday.length === 4 && slB.groups.next_friday.length === 1 && slB.groups.later.length === 1 && slB.groups.later[0].batch_on === '2026-11-27' && slB.groups.in_sale_now.length === 1 && slB.groups.no_date.length === 1, slB.counts);
  t('sale grouping: the Friday block is sorted WORST FIRST, so the listing that loses money is read before anybody enters it and the one that pays is last',
    slB.groups.this_friday.map(r => r.verdict).join('|') === 'loses|thin|unknown|worth it' &&
    slB.groups.this_friday[0].item_id === '100000000003' && slB.groups.this_friday[3].item_id === '100000000001' &&
    slB.counts.loses === 1 && slB.counts.thin === 1 && slB.counts.unknown === 1 && slB.counts.worth_it === 1, slB.groups.this_friday.map(r => [r.item_id, r.verdict, r.profit_after]));
  t('sale grouping: every row carries the sale price, the money off a unit, the profit at the sale price and the day it goes in, and the one with no margin carries not known rather than nought',
    slB.groups.this_friday[3].sale_price === 19 && slB.groups.this_friday[3].profit_after === 3.34 && slB.groups.this_friday[3].drop === 0.66 &&
    slB.groups.this_friday[3].batch_on === '2026-11-06' && slB.groups.this_friday[3].batch_ends_on === '2026-11-19' &&
    slB.groups.this_friday[2].profit_after === null && slB.groups.this_friday[2].drop === null && slB.groups.this_friday[2].drop_month_estimate === null &&
    slB.groups.this_friday[3].drop_month_estimate === 6.6 && slB.groups.this_friday[3].units_30d === 10 && slB.groups.this_friday[3].actual_profit_30d === 12, [slB.groups.this_friday[2], slB.groups.this_friday[3]]);
  t('sale grouping: the listing already in a sale comes round fourteen days after its event ends and is placed on that Friday, and the listing with no clock keeps its own reason',
    slB.groups.in_sale_now[0].next_eligible_on === '2026-12-04' && slB.groups.in_sale_now[0].batch_on === '2026-12-04' &&
    slB.groups.no_date[0].batch_on === null && slB.groups.no_date[0].next_eligible_why === 'listed 3 days ago, needs 14', [slB.groups.in_sale_now[0].next_eligible_on, slB.groups.no_date[0].next_eligible_why]);
  t('sale grouping: a listing ALREADY in a sale is judged at its own event\'s discount and not at the batch setting, and the row says which of the two it was',
    (() => {
      const live = F.adSaleBatches([{ item_id: '100000000009', account: 'C', price: 20, margin_before_ads: 4, in_sale: true, ends: '2026-11-20', discount_pct: 0.2 }], '2026-11-06', slR0).groups.in_sale_now[0];
      const set = slB.groups.in_sale_now[0];
      return live.discount_pct === 0.2 && live.sale_price === 16 && live.drop === 2.66 && live.profit_after === 1.34 && live.discount_source === 'the event it is in' &&
        set.discount_pct === 0.05 && set.sale_price === 19 && set.discount_source === 'the batch setting' && slB.groups.this_friday[3].discount_source === 'the batch setting';
    })(),
    F.adSaleBatches([{ item_id: '100000000009', account: 'C', price: 20, margin_before_ads: 4, in_sale: true, ends: '2026-11-20', discount_pct: 0.2 }], '2026-11-06', slR0).groups.in_sale_now[0]);
  const slA = slB.accounts.filter(a => a.account === 'A')[0], slBa = slB.accounts.filter(a => a.account === 'B')[0];
  t('sale grouping: the account line counts its own groups and names the event it is sitting in, and an account with nothing in the batch has nothing to sum rather than a nought',
    slB.accounts.length === 2 && slA.this_batch.n === 4 && slA.this_batch.worth_it === 1 && slA.this_batch.thin === 1 && slA.this_batch.loses === 1 && slA.this_batch.unknown === 1 &&
    slBa.next_batch.n === 1 && slBa.later.n === 1 && slBa.in_sale.n === 1 && slBa.no_date.n === 1 && slBa.this_batch.n === 0 &&
    slBa.month_drop_estimate === null && slBa.month_drop_items === 0 && slBa.event.name === 'Autumn', [slA.this_batch, slBa]);
  t('sale grouping: the month figure is each listing\'s OWN money off times its OWN units, added up over the batch, counted only where both are known, and said to be exactly that',
    slA.month_drop_estimate === 11.22 && slA.month_drop_items === 3 && /sum of per-listing estimates/.test(slB.month_drop_label) && !/profit/i.test(slB.month_drop_label.split('.')[0]), [slA.month_drop_estimate, slA.month_drop_items, slB.month_drop_label]);
  t('sale grouping: a raw settings map is accepted and read through the same rules, so the batch cannot be worked out against figures nobody set',
    (() => { const m = F.adSaleBatches(slRows, '2026-11-06', { adtool_sale_batch_weekday: '1', adtool_sale_days: '7' });
      return m.calendar.f0 === '2026-11-09' && m.calendar.weekday_name === 'Monday' && m.calendar.batches[0].ends_on === '2026-11-15' && m.calendar.f1 === '2026-11-16' &&
        m.counts.this_friday === 4 && m.counts.next_friday === 1 && m.groups.later[0].batch_on === '2026-11-30' && m.groups.this_friday[3].batch_ends_on === '2026-11-15'; })(),
    JSON.stringify(F.adSaleBatches(slRows, '2026-11-06', { adtool_sale_batch_weekday: '1', adtool_sale_days: '7' }).counts));
  t('sale grouping: no listing is placed anywhere when the batch day cannot be worked out, which is what the no-date group is for',
    (() => { const bad = F.adSaleBatches(slRows, 'not-a-day', slR0); return bad.counts.no_date === 7 && bad.counts.this_friday === 0 && bad.counts.in_sale_now === 1; })(), null);

  /* (f) THE RULE A READER MAY NOT SEE COLLECTIVE MONEY. Profit leaves the engine on item-keyed rows
     only, so the floor, the month estimate and the per-listing figures are all named so that the
     strip keeps them: not one of them is a profit total, and the page would be unreadable without
     them. This is the test that stops somebody renaming the floor back to a profit key. */
  const slStrip = F.adtStripCollectiveProfit(JSON.parse(JSON.stringify({
    settings: { rules: slR0 }, batches: { groups: slB.groups, counts: slB.counts, verdict_rule: slB.verdict_rule, profit_after_rule: slB.profit_after_rule, month_drop_label: slB.month_drop_label, settings_used: slB.settings_used },
    by_account: slB.accounts, calendar: slB.calendar,
  })), { keepCollective: false });
  t('sale strip: a reader outside the profit roles still gets the floor, the month estimate, the counts and every listing\'s own profit at the sale price, because none of them is a collective total',
    slStrip.settings.rules.floor === 1 && slStrip.batches.settings_used.floor === 1 && slStrip.by_account.filter(a => a.account === 'A')[0].month_drop_estimate === 11.22 &&
    slStrip.batches.groups.this_friday[3].profit_after === 3.34 && slStrip.batches.groups.this_friday[3].actual_profit_30d === 12 &&
    typeof slStrip.batches.profit_after_rule === 'string' && slStrip.batches.counts.worth_it === 1, [slStrip.settings.rules, slStrip.by_account[0]]);

  /* (g) THE RECORD OF WHO ENTERED A BATCH. One spelling for the key, read back by the same rule, and
     the batch-DAY setting shares the prefix and must never be read as one of these records. */
  t('sale record: the key a batch is kept under is one spelling, read back by the same rule, and the batch-day setting can never be read as a batch record',
    F.adSaleBatchKey('AZHAR ABRT', '2026-11-06') === 'adtool_sale_batch_azhar_abrt_2026-11-06' &&
    JSON.stringify(F.adSaleBatchKeyParse(F.adSaleBatchKey('AZHAR ABRT', '2026-11-06'))) === JSON.stringify({ slug: 'azhar_abrt', batch_on: '2026-11-06' }) &&
    F.adSaleBatchKeyParse('adtool_sale_batch_weekday') === null && F.adSaleBatchKeyParse('adtool_sale_discount_pct') === null &&
    F.adSaleBatchKey('', '2026-11-06') === null && F.adSaleBatchKey('A', 'friday') === null && F.adSaleBatchKey('!!!', '2026-11-06') === null, F.adSaleBatchKey('AZHAR ABRT', '2026-11-06'));

  /* (h) THE ENGINE'S OWN HALF (source assertions: these are not pure functions). */
  const slSrc = src.slice(src.indexOf('async function adtoolSalesCompute(env, acct) {'), src.indexOf('/* ADTOOL-P10-END'));
  const slSnap = src.slice(src.indexOf('async function adtSaleSnapshot(env) {'), src.indexOf('const ADTOOL_ACTIONS_P10 = {'));
  t('sale engine: the derivation is written down where the arithmetic lives, so the one line the page prints can be checked against the books\' rule without leaving the file',
    /profit after = margin_before_ads − 0\.8 × d × \(1 − feeRate\) × price/.test(src) && /after − before/.test(src) && /the Ali cost does not move at all/.test(src), null);
  t('sale engine: the per-listing eligible task is gone from the snapshot, the page asks only for the event-ending kind, and the ending task itself is untouched',
    !/'eligible',\?4,'open'/.test(slSnap) && !/const tid = 'elig:'/.test(slSnap) && /NO PER-LISTING "ELIGIBLE" TASK ANY MORE/.test(slSnap) &&
    /'event-ending',\?3,'open'/.test(slSnap) && /WHERE status = 'open' AND kind = 'event-ending'/.test(slSrc), null);
  t('sale engine: the windowed figures come from ONE grouped read per chunk of listings, and the before-and-after of a running event from one joined read apiece, never a query per listing',
    /FROM adtool_listing_day WHERE day >= \?1 AND day <= \?3 AND item_id IN ' \+ adtInList\(ch, 3\) \+ ' GROUP BY item_id/.test(src) &&
    /adPeakCohortJoin\(sql, 'd\.item_id', 'd\.day'\)/.test(src) && /const SINCE = await adtSaleEventSums\(env, sinceEntries\), BEFORE = await adtSaleEventSums\(env, beforeEntries\);/.test(slSrc), null);
  t('sale engine: a window whose days carry no profit figure comes back as not known and never as nought, which is why the profit sums have no else branch',
    /SUM\(CASE WHEN day >= \?2 AND actual_profit IS NOT NULL THEN actual_profit END\)/.test(src) && /SUM\(CASE WHEN actual_profit IS NOT NULL THEN actual_profit END\)/.test(src) &&
    !/SUM\(CASE WHEN day >= \?2 THEN actual_profit ELSE 0 END\)/.test(src), null);
  const slOp = slSrc.slice(slSrc.indexOf("if (p.op === 'batch_entered')"), slSrc.indexOf('return adtoolSalesCompute(env, String('));
  t('sale engine: marking a batch entered validates the item numbers against the batch itself, writes one record and one audit line, clears the page memo, and reaches no eBay endpoint at all',
    /const D = await adtoolSalesCompute\(env, account\);/.test(slOp) && /const ids = asked\.filter\(id => due\[id\]\), refused = asked\.filter\(id => !due\[id\]\);/.test(slOp) &&
    /'ADTOOL_SALE_BATCH_ENTERED'/.test(slOp) && /INSERT INTO portal_config \(key, value, updated_at\)/.test(slOp) && /await adtSalesCacheClear\(env\);/.test(slOp) &&
    /sent_to_ebay: false/.test(slOp) && !/fetch\(/.test(slOp) && !/ebay(Call|Trade|Fetch|Token)/i.test(slOp), null);
  t('sale engine: the four settings are seeded before they are read and never written over a figure somebody has already set',
    /for \(const k of Object\.keys\(ADTOOL_SALE_CONFIG_KEYS\)\) \{/.test(src) && /ON CONFLICT\(key\) DO NOTHING"\)\.bind\(ADTOOL_SALE_CONFIG_KEYS\[k\], String\(ADTOOL_SALE_DEFAULTS\[k\]\)\)/.test(src), null);
  const slProbe = src.slice(src.indexOf('  adsSaleProbe: {'), src.indexOf('  /* THE VIDEO EVIDENCE ROUTE'));
  t('sale probe: the batch has an evidence route of its own, by key like the backup dump, read-only, printing the settings in force, the calendar, the counts and the first rows with the money now and at the sale price',
    /adsSaleProbe: \{/.test(slProbe) && /auth: 'sync'/.test(slProbe) && /settings: D\.settings/.test(slProbe) && /calendar: D\.calendar/.test(slProbe) &&
    /first_rows: first/.test(slProbe) && /profit_after: r\.profit_after/.test(slProbe) && /margin_before_ads: r\.margin_before_ads/.test(slProbe) &&
    /sent_to_ebay: false/.test(slProbe) && /read_errors: readErrors/.test(slProbe) && !/fetch\(/.test(slProbe) && slProbe.indexOf('adtool') !== 0, null);

  /* (i) THE PAGE. Its blocks, its two controls, and the promises it keeps about a figure it has not
     got. Read from the file, because the two halves can only be wrong about each other. */
  const svSrc = readFile('frontend/view-adtool-sales.js');
  const svCode = svSrc.replace(/\/\*[\s\S]*?\*\//g, '');                    /* the notes name the old page too; this is about the code */
  t('sale page: the page was read, keeps its key, its prefix and its action, and still carries the two task ops beside the new one',
    svSrc.length > 8000 && /VIEWS\.adtoolSales = \{/.test(svSrc) && (svCode.match(/api\('[A-Za-z]+'/g) || []).every(c => c === "api('adtoolSales'") &&
    /op: 'batch_entered'/.test(svCode) && /op: pending/.test(svCode) && /task_done/.test(svCode) && /task_dismiss/.test(svCode) && /\.sv-panel\{/.test(svSrc), [svSrc.length, (svCode.match(/api\('[A-Za-z]+'/g) || [])]);
  t('sale page: all six blocks the owner asked for are built, each by its own function, and the settings strip prints the stored figures rather than any number typed into the page',
    ['settingsStrip', 'accountTable', 'thisBatch', 'inSaleNow', 'upcoming', 'noDate', 'endingTasks'].every(f => new RegExp('function ' + f + '\\(').test(svCode) && new RegExp('h \\+= ' + f + '\\(\\)').test(svCode)) &&
    /d\.settings\.rows/.test(svCode) && /r\.discount_text/.test(svCode) && /c\.weekday_name/.test(svCode) &&
    !/'\d+ ?%'|>\d+ ?% off/.test(svCode) && !/'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)'/.test(svCode) && !/'£\d/.test(svCode), null);
  t('sale page: the whole-shop warning is there, because a sale covering the whole shop brings back the very problem the batch exists to avoid',
    /function wholeShopWarning\(\)/.test(svCode) && /whole_shop_running/.test(svCode) && /brings the problem back/.test(svSrc), null);
  t('sale page: the copy control takes the worth-it and thin rows, leaves the losing ones out until somebody ticks them in, and puts them in a box as well for copying by hand',
    /function copyIds\(b\)/.test(svCode) && /SV\.loses\[b\.account\] \? \{ 'worth it': 1, thin: 1, loses: 1 \} : \{ 'worth it': 1, thin: 1 \}/.test(svCode) &&
    /data-copy="/.test(svCode) && /data-loses="/.test(svCode) && /class="sv-ta" readonly data-ta=/.test(svCode) && /navigator\.clipboard/.test(svCode), null);
  t('sale page: marking a block entered sends the account, the batch day and the item numbers, and says in plain words that nothing goes to eBay',
    /data-enter="/.test(svCode) && /account: acct, batch_on: tb\.batch_on, item_ids: ids/.test(svCode) && /Nothing is sent to eBay/.test(svSrc) &&
    /Entered by <b>/.test(svCode) && /entered_check/.test(svCode), null);
  t('sale page: a listing in a sale prints the discount it is actually getting and where that came from, so the batch setting is never shown over a live event\'s own discount',
    /function pctOf\(v\)/.test(svCode) && /pctOf\(r\.discount_pct\)/.test(svCode) && /r\.discount_source/.test(svCode), null);
  t('sale page: no task for a listing becoming eligible is drawn any more, and the page says so where that list used to be; the event-ending prompt is kept',
    !/Eligible for a sale event/.test(svSrc) && !/already added/.test(svSrc) && /An event ending with nothing to follow it/.test(svSrc) && /the batch above is that list/.test(svSrc), null);
  t('sale page: every listing row goes through the shared product cell, so every one of them carries the link into its own history',
    (svCode.match(/adtProductCell\(r\)/g) || []).length >= 4 && !/adt-pc/.test(svCode), (svCode.match(/adtProductCell\(/g) || []).length);
  t('sale page: a figure the engine has not got prints as not known and never as nought or as a bare dash, and a loss is in the loss colour',
    /function nk\(\) \{ return '<span class="sv-nk">not known<\/span>'; \}/.test(svCode) &&
    /function money\(v\) \{[\s\S]{0,120}if \(n == null\) return nk\(\);/.test(svCode) && /function units\(v\)[\s\S]{0,120}n == null \? nk\(\)/.test(svCode) &&
    /var LOSS = '#e0563f'/.test(svCode) && /'\.sv-m\.neg\{color:' \+ LOSS/.test(svCode), null);
  t('sale page: not one em-dash in anything a reader sees, and the money is British',
    (svSrc.split('\n').filter((l, i) => i > 25 && l.indexOf('—') >= 0).length === 0) && /£/.test(svSrc) && !/\$\d|USD|\bdollars?\b/.test(svCode), svSrc.split('\n').filter((l, i) => i > 25 && l.indexOf('—') >= 0).slice(0, 3));
  /* the page's three new tags, resolved through the REAL map down to real register rows, the way the
     change-and-peak pages' tags are. A tag with no pattern of its own opens the whole register, which
     is noise where a reader asked one question. */
  const svHooks = (svSrc.match(/\breg\('[^']+'/g) || []).map(m => m.slice(5, -1)).filter((v, i, a) => a.indexOf(v) === i);
  const svResolve = (lab) => { for (const row of (regMap || [])) { if (row[0].test(lab)) { return rgAll.filter(r => row[1].some(k => String(r.sources).indexOf(k) >= 0 || r.id === k)).map(r => r.id); } } return []; };
  t('sale page: every tag on it has a pattern of its own and reaches a real note, and the three new ones reach the three rows written for them',
    svHooks.length >= 4 && svHooks.indexOf('sale batch') >= 0 && svHooks.indexOf('profit after sale') >= 0 && svHooks.indexOf('next eligible') >= 0 &&
    svHooks.every(l => svResolve(l).length > 0) && svResolve('sale batch').join(',') === 'SALE_BATCH' &&
    svResolve('profit after sale').indexOf('SALE_PROFIT_AFTER') >= 0 && svResolve('next eligible').indexOf('SALE_NEXT_ELIGIBLE') >= 0,
    svHooks.map(l => [l, svResolve(l)]));
  t('sale register: the three new notes exist exactly once each, say what they are worked out from and how they are rechecked, and name no setting\'s value in their words',
    ['SALE_BATCH', 'SALE_PROFIT_AFTER', 'SALE_NEXT_ELIGIBLE'].every(id => {
      const r = rgAll.filter(x => x.id === id);
      return r.length === 1 && r[0].name && r[0].formula && r[0].sources && r[0].recompute && r[0].recheck && !/\b5 ?%|\bFriday\b|£1\b/.test(r[0].formula);
    }), ['SALE_BATCH', 'SALE_PROFIT_AFTER', 'SALE_NEXT_ELIGIBLE'].map(id => rgAll.filter(x => x.id === id).length));

  /* ══ THE SALE PAGE REBUILT ON EVIDENCE (the owner's brief, 10 November 2026) ════════════════
     Sir Hasib has two events both called "Sale event ending 16 Nov 2026", created on 3 November
     with the SAME 150 listings in each. eBay enrolled 11 under one and 1 under the other and
     marked the rest "Skipped: in recent sale". The page said 150 in sale on each. Everything below
     holds the five rules that replaced that: what being in a sale means, clocks that ignore the
     sale's own price moves, the two cohorts, the morning-after check, and the request shape behind
     eBay's own word. */
  const smEv = { promo_id: 'H1', discount_pct: 0.05, starts: '2026-11-03', ends: '2026-11-16', added: true };
  const smDay = '2026-11-09';
  const smLedger = (before, after) => {
    const out = [];
    for (const d of ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']) out.push({ day: d, price: before });
    for (const d of ['2026-11-03', '2026-11-05', '2026-11-07', smDay]) out.push({ day: d, price: after });
    return out;
  };
  const smClear = { item_id: '1', listed_on: '2026-01-01', exited_on: '', last_change_on: '' };
  const smLedgerOn = F.adSaleMembership(smClear, smEv, smLedger(9.99, 9.49), [], smDay);
  t('sale truth: the price record settles it — today 9.49 against the 9.99 the record held before the event began is the 5 % discount to the penny, so the listing is in the sale on the ledger',
    smLedgerOn.added === true && smLedgerOn.on_sale === true && smLedgerOn.basis === 'ledger' &&
    smLedgerOn.pre_sale_price === 9.99 && smLedgerOn.price_today === 9.49 && smLedgerOn.expected_sale_price === 9.49 && smLedgerOn.readable === true, smLedgerOn);
  const smLooks = F.adSaleMembership(smClear, smEv, smLedger(9.49, 9.49), [], smDay);
  t('sale truth: a listing whose EVERYDAY price merely looks sale-shaped is not in a sale — 9.49 before the event and 9.49 now is 9.49, not 9.99 less the discount, which is the whole reason the pre-sale price comes out of the record',
    smLooks.added === true && smLooks.on_sale === false && smLooks.basis === 'event-text' && smLooks.expected_sale_price === 9.02 && smLooks.skip_reason === 'eligible_but_skipped', smLooks);
  const smPenny = [9.48, 9.49, 9.50].map(p => F.adSaleMembership(smClear, smEv, smLedger(9.99, p), [], smDay).on_sale);
  t('sale truth: "within a penny" means within a penny — 9.48, 9.49 and 9.50 all read as the discount, 9.40 does not',
    smPenny.join(',') === 'true,true,true' && F.adSaleMembership(smClear, smEv, smLedger(9.99, 9.4), [], smDay).on_sale === false, smPenny);
  const smOrder = F.adSaleMembership(smClear, smEv, smLedger(9.99, 9.99), [{ qty: 2, sale_price: 18.98, status: 'ACTIVE' }], smDay);
  t('sale truth: a buyer settles it where the listed price never dipped — two units at 18.98 is 9.49 each against a 9.99 listing, which is the discount, so the basis is the order',
    smOrder.on_sale === true && smOrder.basis === 'order' && smOrder.paid_per_unit === 9.49 && smOrder.orders === 1, smOrder);
  const smOrderFull = F.adSaleMembership(smClear, smEv, smLedger(9.99, 9.99), [{ qty: 1, sale_price: 9.99, status: 'ACTIVE' }], smDay);
  t('sale truth: a buyer who paid the FULL price proves the opposite, and the listing reads as left out rather than as in the sale',
    smOrderFull.on_sale === false && smOrderFull.paid_per_unit === 9.99 && smOrderFull.readable === true, smOrderFull);
  const smCancel = F.adSaleMembership(smClear, smEv, smLedger(9.99, 9.99), [{ qty: 2, sale_price: 18.98, status: 'CANCELLED' }], smDay);
  t('sale truth: a cancelled order proves nothing, so it is left out of the paid price altogether',
    smCancel.paid_per_unit === null && smCancel.orders === 0 && smCancel.on_sale === false, smCancel);
  const smEbayYes = F.adSaleMembership(Object.assign({}, smClear, { ebay_promo: { readable: true, in_sale: true, original_price: 9.99, starts: '2026-11-03', ends: '2026-11-16' } }), smEv, smLedger(9.49, 9.49), [], smDay);
  t('sale truth: eBay\'s own word on the listing outranks ours — PromotionalSaleDetails naming this event puts the listing in the sale even where our own price record shows nothing',
    smEbayYes.on_sale === true && smEbayYes.basis === 'ebay' && smEbayYes.ebay.original_price === 9.99, smEbayYes);
  const smEbayNo = F.adSaleMembership(Object.assign({}, smClear, { ebay_promo: { readable: true, in_sale: false, original_price: null, starts: null, ends: null } }), smEv, smLedger(9.99, 9.49), [], smDay);
  t('sale truth: and it outranks ours the OTHER way — eBay answering that it is discounting nothing leaves the listing out, whatever a sale-shaped price record says',
    smEbayNo.on_sale === false && smEbayNo.basis === 'event-text' && /not in a sale/.test(smEbayNo.why), smEbayNo);
  const smEbayOther = F.adSaleMembership(Object.assign({}, smClear, { ebay_promo: { readable: true, in_sale: true, original_price: 9.99, starts: '2026-12-01', ends: '2026-12-14' } }), smEv, smLedger(9.99, 9.49), [], smDay);
  t('sale truth: a listing eBay has in SOME OTHER sale is not in this event, and says so rather than being counted under it',
    smEbayOther.on_sale === false && /different sale/.test(smEbayOther.why), smEbayOther);
  t('sale truth: eBay\'s answer is matched to the event on its own start and end, a day either side, because eBay sends timestamps in its zone and we keep days',
    F.adSaleEventNamed({ starts: '2026-11-03', ends: '2026-11-16' }, smEv) === true &&
    F.adSaleEventNamed({ starts: '2026-11-04', ends: '2026-11-17' }, smEv) === true &&
    F.adSaleEventNamed({ starts: '2026-11-20', ends: '2026-12-04' }, smEv) === false &&
    F.adSaleEventNamed({ starts: null, ends: '2026-11-16' }, smEv) === true, null);
  const smNotAdded = F.adSaleMembership(smClear, Object.assign({}, smEv, { added: false }), smLedger(9.99, 9.49), [], smDay);
  t('sale truth: a listing the event does not name is not judged at all, and carries no proof and no reason',
    smNotAdded.added === false && smNotAdded.on_sale === false && smNotAdded.basis === '' && smNotAdded.skip_reason === '', smNotAdded);
  const smBlind = F.adSaleMembership({ item_id: '1', listed_on: '2026-01-01' }, smEv, [{ day: smDay, price: 9.49 }], [], smDay);
  t('sale truth: with no price from before the event and no order since, the discount cannot be looked for, and the row says that rather than claiming eBay left it out for a reason',
    smBlind.readable === false && smBlind.on_sale === false && /cannot be looked for/.test(smBlind.why) && smBlind.skip_reason === 'eligible_but_skipped', smBlind);
  const smCool = F.adSaleMembership({ item_id: '1', listed_on: '2026-01-01', exited_on: '2026-10-25', last_change_on: '2026-10-28' }, smEv, smLedger(9.99, 9.99), [], smDay);
  const smRev = F.adSaleMembership({ item_id: '1', listed_on: '2026-01-01', exited_on: '', last_change_on: '2026-10-28' }, smEv, smLedger(9.99, 9.99), [], smDay);
  const smNew = F.adSaleMembership({ item_id: '1', listed_on: '2026-10-30', exited_on: '', last_change_on: '' }, smEv, smLedger(9.99, 9.99), [], smDay);
  t('sale truth: the four reasons, in the order they are reported — a cooldown beats a revision, a revision beats a listing that is too new, and every clock clear says eBay\'s reason is not known',
    smCool.skip_reason === 'cooldown' && smRev.skip_reason === 'revised' && smNew.skip_reason === 'too_new' && smLooks.skip_reason === 'eligible_but_skipped' &&
    smCool.skip_word === F.ADTOOL_SALE_SKIP_WORDS.cooldown, [smCool.skip_reason, smRev.skip_reason, smNew.skip_reason]);
  t('sale truth: the clocks are read on the day EBAY judged, which is the day the event began and not today, because that is the day it decided',
    smCool.judged_on === '2026-11-03' && smCool.days_since_exit === 9 && smRev.days_since_change === 6 && smNew.days_listed === 4, [smCool.judged_on, smCool.days_since_exit]);
  t('sale truth: a clock we cannot read never passes as 0 days, which would read as today and clear every rule',
    F.adSaleDayGap('', '2026-11-03') === null && F.adSaleDayGap('not a date', '2026-11-03') === null &&
    F.adSaleMembership({ item_id: '1', listed_on: '', exited_on: '', last_change_on: '' }, smEv, smLedger(9.99, 9.99), [], smDay).skip_reason === 'eligible_but_skipped', null);
  /* THE 150 OF 3 NOVEMBER, counted. The other session's reading of Sir Hasib's pair: 11 enrolled,
     49 in the cooldown, 46 revised inside the fortnight, 8 too new, 36 eligible and skipped. */
  const smHasib = [];
  for (let i = 0; i < 11; i++) smHasib.push({ added: true, on_sale: true, basis: 'ledger', skip_reason: '', readable: true });
  for (const pair of [['cooldown', 49], ['revised', 46], ['too_new', 8], ['eligible_but_skipped', 36]]) {
    for (let i = 0; i < pair[1]; i++) smHasib.push({ added: true, on_sale: false, basis: 'event-text', skip_reason: pair[0], readable: true });
  }
  const smCount = F.adSaleCountMembership(smHasib);
  t('sale truth: the 150 listings of Sir Hasib\'s event count out as 11 on sale and 139 left out, with the reasons adding to the 139 and not one of them attributed to eBay',
    smHasib.length === 150 && smCount.added_n === 150 && smCount.on_sale_n === 11 && smCount.skipped_n === 139 &&
    smCount.reasons.cooldown === 49 && smCount.reasons.revised === 46 && smCount.reasons.too_new === 8 && smCount.reasons.eligible_but_skipped === 36 &&
    smCount.basis_counts.ledger === 11 && smCount.unreadable_n === 0, smCount);
  t('sale truth: the reasons print in that order, only where they happened, and an empty set says nothing to say why rather than showing an empty bracket',
    F.adSaleReasonText(smCount.reasons) === 'cooldown 49, revised 46, too new 8, reason not known 36' &&
    F.adSaleReasonText({ cooldown: 20, revised: 9, too_new: 4, eligible_but_skipped: 0 }) === 'cooldown 20, revised 9, too new 4' &&
    F.adSaleReasonText({}) === 'nothing to say why' && F.adSaleReasonText(null) === 'nothing to say why', F.adSaleReasonText(smCount.reasons));
  t('sale truth: eBay\'s reply is read for what it says and for what it does not — the block present is a sale, the block absent on an answered reply is NOT a sale, and an unanswered reply is neither',
    (() => {
      const yes = F.adSalePromoSaleFromXml('<GetItemResponse><Ack>Success</Ack><Item><SellingStatus><PromotionalSaleDetails><OriginalPrice currencyID="GBP">9.99</OriginalPrice><StartTime>2026-11-03T13:03:34.000Z</StartTime><EndTime>2026-11-16T23:59:00.000Z</EndTime></PromotionalSaleDetails></SellingStatus></Item></GetItemResponse>');
      const no = F.adSalePromoSaleFromXml('<GetItemResponse><Ack>Success</Ack><Item><SellingStatus></SellingStatus></Item></GetItemResponse>');
      const bad = F.adSalePromoSaleFromXml('<GetItemResponse><Ack>Failure</Ack><Errors><ErrorCode>21359</ErrorCode></Errors></GetItemResponse>');
      return yes.readable === true && yes.in_sale === true && yes.original_price === 9.99 && yes.starts === '2026-11-03' && yes.ends === '2026-11-16' &&
        no.readable === true && no.in_sale === false && bad.readable === false && bad.in_sale === false;
    })(), null);
  /* ---- §2: the sale's own price moves are not price changes ---- */
  const psDisc = [0.05];
  const psOne = (a, b) => F.adSalePriceSteps([{ day: '2026-10-20', price: a }, { day: '2026-10-21', price: b }], psDisc)[0];
  t('sale clocks: eBay\'s own moves are labelled joining and leaving, a real move is a change, and a price that holds is no step at all',
    psOne(10, 9.5).kind === 'enrol' && psOne(9.5, 10).kind === 'exit' && psOne(10, 8.99).kind === 'change' && psOne(10, 10).kind === 'same' &&
    psOne(10, 9.5).discount_pct === 0.05, [psOne(10, 9.5).kind, psOne(9.5, 10).kind, psOne(10, 8.99).kind, psOne(10, 10).kind]);
  t('sale clocks: a one-penny repricing is still a change, because "no change" is judged to the exact penny while eBay\'s own rounding is allowed a penny either way',
    psOne(10, 9.99).kind === 'change' && psOne(10, 9.51).kind === 'enrol' && psOne(10, 9.49).kind === 'enrol' && psOne(10, 9.4).kind === 'change', [psOne(10, 9.99).kind, psOne(10, 9.51).kind]);
  t('sale clocks: with no readable discount to compare against, every move is a change — the cautious reading, and the one the clocks had before this existed',
    F.adSalePriceSteps([{ day: '2026-10-20', price: 10 }, { day: '2026-10-21', price: 9.5 }], [])[0].kind === 'change' &&
    F.adSalePriceSteps([{ day: '2026-10-20', price: 10 }, { day: '2026-10-21', price: 9.5 }], [null, 'nonsense'])[0].kind === 'change', null);
  const psRun = F.adSalePriceSteps([{ day: '2026-10-18', price: 10 }, { day: '2026-10-21', price: 9.5 }, { day: '2026-10-25', price: 8.99 }, { day: '2026-11-04', price: 9.46 }], psDisc);
  const psClk = F.adSalePriceClocks(psRun);
  t('sale clocks: over a whole run the labels come out in order, and the clocks keep the last real change, the last leaving and the days the sale itself moved the price',
    psRun.map(s => s.kind).join(',') === 'enrol,change,exit' && psClk.last_change === '2026-10-25' && psClk.last_exit === '2026-11-04' &&
    psClk.last_enrol === '2026-10-21' && psClk.move_days.join(',') === '2026-10-21,2026-11-04' && psClk.steps_read === 3, [psRun.map(s => s.kind), psClk]);
  t('sale clocks: the first day on record is not a step, so a listing with one price day has no change to restart anything',
    F.adSalePriceSteps([{ day: '2026-10-20', price: 10 }], psDisc).length === 0 && F.adSalePriceClocks([]).last_change === null, null);
  /* THE ABRT SHAPE OF 21 OCTOBER: a whole account's price moved by the event itself on one day. */
  const tlEnrolOnly = F.adtSaleTimeline([{ day: '2026-10-28', in_sale: 0, basis: 'none', promo_id: '', event_promo: '' }],
    [{ day: '2026-10-20', price: 10 }, { day: '2026-10-21', price: 9.5 }, { day: '2026-10-28', price: 9.5 }], '2026-10-28', { discounts: [0.05] });
  const tlEnrolBlind = F.adtSaleTimeline([{ day: '2026-10-28', in_sale: 0, basis: 'none', promo_id: '', event_promo: '' }],
    [{ day: '2026-10-20', price: 10 }, { day: '2026-10-21', price: 9.5 }, { day: '2026-10-28', price: 9.5 }], '2026-10-28');
  t('sale clocks: the 21 October shape — told the discount, the timeline reads that day as joining a sale and no price clock runs; told nothing, it reads it as a price change and makes the listing wait, which is what it used to do',
    tlEnrolOnly.last_price_change === null && tlEnrolOnly.price_clock === null && tlEnrolOnly.last_enrol === '2026-10-21' &&
    tlEnrolBlind.last_price_change === '2026-10-21' && tlEnrolBlind.eligible_on === '2026-11-04', [tlEnrolOnly.last_price_change, tlEnrolBlind.eligible_on]);
  const tlMidChange = F.adtSaleTimeline([{ day: '2026-10-28', in_sale: 0, basis: 'none', promo_id: '', event_promo: '' }],
    [{ day: '2026-10-20', price: 10 }, { day: '2026-10-21', price: 9.5 }, { day: '2026-10-25', price: 8.99 }], '2026-10-28', { discounts: [0.05] });
  t('sale clocks: a TRUE change made during a live event still restarts the price clock, because that one really is somebody repricing the listing',
    tlMidChange.last_price_change === '2026-10-25' && tlMidChange.eligible_on === '2026-11-08' && tlMidChange.eligible_basis === 'price clock', tlMidChange);
  const tlListed = F.adtSaleTimeline([], [], '2026-11-09', { listed_on: '2026-11-05' });
  t('sale clocks: the listing clock is the third of them — a listing that went up inside the restriction cannot join a sale, and the date says which clock set it',
    tlListed.eligible_on === '2026-11-19' && tlListed.eligible_basis === 'listing clock' && tlListed.listed_clock === '2026-11-19', tlListed);
  const tlExitClock = F.adtSaleTimeline([{ day: '2026-11-09', in_sale: 0, basis: 'none', promo_id: '', event_promo: '' }],
    [{ day: '2026-11-01', price: 9.5 }, { day: '2026-11-02', price: 10 }], '2026-11-09', { discounts: [0.05] });
  t('sale clocks: the day the sale put the price back is a leaving we can see, so it starts the restriction even where the membership days never flipped',
    tlExitClock.last_exit === '2026-11-02' && tlExitClock.exit_clock === '2026-11-16' && tlExitClock.eligible_on === '2026-11-16', tlExitClock);
  t('sale clocks: eligible_on is the LATEST of the three clocks, never the first one that answers',
    F.adtSaleTimeline([], [{ day: '2026-11-01', price: 10 }, { day: '2026-11-03', price: 8.99 }], '2026-11-09', { discounts: [0.05], listed_on: '2026-10-01' }).eligible_on === '2026-11-17' &&
    F.adtSaleTimeline([], [{ day: '2026-11-01', price: 10 }, { day: '2026-11-03', price: 8.99 }], '2026-11-09', { discounts: [0.05], listed_on: '2026-11-08' }).eligible_on === '2026-11-22', null);
  const elBump = F.adtSaleEligibility({ last_revised: '2026-10-21', start_time: '2026-01-01', sale_move_days: ['2026-10-21'] }, '2026-10-28', (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000));
  const elReal = F.adtSaleEligibility({ last_revised: '2026-10-21', start_time: '2026-01-01' }, '2026-10-28', (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000));
  t('sale clocks: a revision stamp eBay moved on the day it enrolled the listing is NOT counted as a revision, and the row says it was set aside; the same stamp on an ordinary day still counts',
    elBump.eligible === true && elBump.revision_ignored === true && /the sale itself moved the price/.test(elBump.revision_note) &&
    elReal.eligible === false && elReal.revision_ignored === false && /revised 7 days ago/.test(elReal.why), [elBump, elReal]);
  /* ---- §4: the two cohorts ---- */
  const cohCal = { f0: '2026-11-13', f1: '2026-11-20', days: 14, weekday: 5, restriction_days: 14 };
  const cohRows = [
    { item_id: '101', batch_on: '2026-11-13', units_30d: 2 },
    { item_id: '102', batch_on: '2026-11-13', units_30d: 10 },
    { item_id: '103', batch_on: '2026-11-13', units_30d: 6 },
    { item_id: '104', batch_on: '2026-11-13', units_30d: null },
    { item_id: '105', batch_on: '2026-11-13', units_30d: 8 },
    { item_id: '206', batch_on: '2026-11-20', units_30d: 99 },
    { item_id: '307', batch_on: '2026-12-04', units_30d: 50 },
    { item_id: '408', batch_on: '', units_30d: 1 }
  ];
  const COH = F.adSaleCohorts2(cohRows, cohCal);
  t('sale cohorts: the better-selling half of what can go in on the nearer batch day is cohort A, best seller first, and the rest are cohort B a batch later',
    COH.A.item_ids.join(',') === '102,105,103' && COH.B.item_ids.indexOf('101') >= 0 && COH.B.item_ids.indexOf('104') >= 0 &&
    COH.A.n === 3 && COH.split === 5, [COH.A.item_ids, COH.B.item_ids]);
  t('sale cohorts: units we do not know sort LAST rather than as nought, so a listing nobody has counted never displaces a seller from the nearer batch day',
    COH.A.item_ids.indexOf('104') < 0 && COH.B.item_ids.indexOf('104') > COH.B.item_ids.indexOf('101'), COH.B.item_ids);
  t('sale cohorts: a listing whose own clock already dates it to the later batch day is HELD there and never pulled forward of its clock, and the ones further out are in no cohort at all',
    COH.B.item_ids.indexOf('206') >= 0 && COH.held === 1 && COH.later === 1 && COH.no_date === 1 &&
    COH.by_item['307'] === undefined && COH.by_item['408'] === undefined, [COH.held, COH.later, COH.no_date]);
  t('sale cohorts: the dates are worked out from the rules and not typed — in for the event\'s length, out for the restriction, and back on the first batch day after that',
    COH.A.batch_on === '2026-11-13' && COH.A.ends_on === '2026-11-26' && COH.A.free_on === '2026-12-11' && COH.A.returns_on === '2026-12-11' &&
    COH.A.freeze_from === '2026-10-30' && COH.B.batch_on === '2026-11-20' && COH.B.returns_on === '2026-12-18' &&
    COH.in_days === 14 && COH.out_days === 14 && COH.cycle_days === 28, [COH.A.returns_on, COH.B.returns_on]);
  t('sale cohorts: the freeze rule and the cycle are sentences built from the rules in force, with no figure typed into either, and every cohort listing is in the lookup',
    /no price change and no listing change in the 14 days before/.test(COH.freeze_rule) && /while it is in the sale/.test(COH.freeze_rule) &&
    COH.cycle_text === 'in for 14 days, then out for 14, so at most 14 days of every 28' &&
    COH.by_item['102'] === 'A' && COH.by_item['101'] === 'B' && COH.by_item['206'] === 'B', [COH.cycle_text, COH.freeze_rule]);
  t('sale cohorts: the same listing lands in the same cohort every run, because the item number breaks every tie',
    (() => {
      const tied = [{ item_id: '900', batch_on: '2026-11-13', units_30d: 5 }, { item_id: '800', batch_on: '2026-11-13', units_30d: 5 }];
      const a = F.adSaleCohorts2(tied, cohCal), b = F.adSaleCohorts2(tied.slice().reverse(), cohCal);
      return a.A.item_ids.join(',') === '800' && b.A.item_ids.join(',') === '800';
    })(), null);
  t('sale cohorts: nothing eligible is an empty pair of cohorts and not a crash, and a calendar with no batch day gives no dates rather than invented ones',
    F.adSaleCohorts2([], cohCal).eligible === 0 && F.adSaleCohorts2(null, cohCal).cohorts.length === 2 &&
    F.adSaleCohorts2(cohRows, {}).A.batch_on === null && F.adSaleCohorts2(cohRows, {}).A.returns_on === null, null);
  /* ---- §5: the morning after ---- */
  const maIds = [], maMap = {};
  for (let i = 0; i < 61; i++) { const id = 'on' + i; maIds.push(id); maMap[id] = { on_sale: true, basis: 'ledger', skip_reason: '', readable: true }; }
  for (const pair of [['cooldown', 20], ['revised', 9], ['too_new', 4]]) {
    for (let i = 0; i < pair[1]; i++) { const id = pair[0] + i; maIds.push(id); maMap[id] = { on_sale: false, basis: 'event-text', skip_reason: pair[0], readable: true }; }
  }
  const MA = F.adSaleMorningAfter({ n: 94, ids: maIds, at: '2026-11-13T09:00:00.000Z' }, maMap, '2026-11-14');
  t('sale morning after: the owner\'s own sentence, word for word — entered 94, on sale 61, skipped 33 (cooldown 20, revised 9, too new 4)',
    maIds.length === 94 && MA.line === 'entered 94, on sale 61, skipped 33 (cooldown 20, revised 9, too new 4)' &&
    MA.entered === 94 && MA.on_sale === 61 && MA.skipped === 33 && MA.checked === true && MA.recorded_on === '2026-11-13', MA);
  t('sale morning after: a listing nothing has checked yet is counted APART from the ones eBay left out, because "eBay left it out" and "we have not looked" are different statements',
    (() => {
      const MB = F.adSaleMorningAfter({ n: 3, ids: ['a', 'b', 'c'], at: '2026-11-13T09:00:00.000Z' }, { a: { on_sale: true, basis: 'order', readable: true } }, '2026-11-14');
      return MB.entered === 3 && MB.on_sale === 1 && MB.skipped === 0 && MB.not_looked_at === 2 && /2 not looked at yet/.test(MB.line);
    })(), null);
  t('sale morning after: a record written today is not yet checked and says so, and a batch every listing of which went in says that instead of naming a difference',
    (() => {
      const today = F.adSaleMorningAfter({ n: 1, ids: ['a'], at: '2026-11-14T09:00:00.000Z' }, { a: { on_sale: true, basis: 'ledger', readable: true } }, '2026-11-14');
      const allIn = F.adSaleMorningAfter({ n: 2, ids: ['a', 'b'], at: '2026-11-13T09:00:00.000Z' }, { a: { on_sale: true, basis: 'ledger', readable: true }, b: { on_sale: true, basis: 'ledger', readable: true } }, '2026-11-14');
      return today.checked === false && /will confirm this record or disagree/.test(today.note) &&
        allIn.checked === true && allIn.line === 'entered 2, on sale 2, skipped 0' && /every listing entered is in the sale/.test(allIn.note);
    })(), null);
  /* ---- the snapshot writes in_sale from the rule, and from nothing else ---- */
  const snapFn = src.slice(src.indexOf('async function adtSaleSnapshot(env) {'), src.indexOf('/* ---- the Friday batch\'s own reads'));
  t('sale snapshot: not one listed id is marked as being in a sale from the event\'s list alone any more — `added` is the list, `in_sale` is the rule\'s answer, and the rule is the only thing that sets it',
    snapFn.length > 2000 && !/\{ inSale = 1; basis = 'list'/.test(snapFn) && !/\{ inSale = 1; basis = 'any'/.test(snapFn) &&
    /let added = 0, basis = 'none', promo = '', ev = null;/.test(snapFn) &&
    /if \(s && s\.listMap\[id\]\) \{ added = 1; basis = 'list';/.test(snapFn) &&
    /const M = adSaleMembership\(/.test(snapFn) && /const inSale = M\.on_sale \? 1 : 0;/.test(snapFn), [snapFn.length, /const inSale = M\.on_sale \? 1 : 0;/.test(snapFn)]);
  t('sale snapshot: the proof and the reason are written down beside the answer, so the page and the probe read the same row rather than each deciding again',
    /proof_basis: added \? String\(M\.basis \|\| ''\) : ''/.test(snapFn) && /skip_reason: \(added && !inSale\) \? String\(M\.skip_reason \|\| ''\) : ''/.test(snapFn) &&
    /ALTER TABLE adtool_sale_membership_day ADD COLUMN proof_basis/.test(src) && /ALTER TABLE adtool_sale_membership_day ADD COLUMN skip_reason/.test(src) &&
    /ALTER TABLE adtool_sale_membership_day ADD COLUMN added/.test(src), null);
  t('sale snapshot: the price record is read for the listings an event names and over a bounded window, and the orders window is widened to yesterday so a buyer\'s price can be looked for at all',
    /const ledgerFrom = adtAddDays\(firstStart && firstStart < today \? firstStart : today, -\(ADTOOL_SALE_RESTRICTION_DAYS \+ 2\)\);/.test(snapFn) &&
    /SELECT item_id, day, price FROM adtool_price_day WHERE day >= \?1 AND item_id IN/.test(snapFn) &&
    /WHERE local_date >= \?1 AND local_date <= \?2 AND item_id IN/.test(snapFn) && /const yday = adtAddDays\(today, -1\);/.test(snapFn), null);
  t('sale snapshot: both clocks are cut off at the day eBay judged, so the account-wide repricing of 7 November is not put beside a listing eBay had already left out of an event filled on the 3rd',
    /const judge = \(ev && \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(String\(ev\.starts \|\| ''\)\) && String\(ev\.starts\) <= today\) \? String\(ev\.starts\) : today;/.test(snapFn) &&
    /const changeDays = steps\.filter\(st => st\.kind === 'change' && st\.day <= judge\)\.map\(st => st\.day\);/.test(snapFn) &&
    /revDay <= judge\) \? revDay : ''/.test(snapFn) && /\.filter\(d => d && d <= judge\)/.test(snapFn), null);
  t('sale truth: eBay rounds the discounted price itself, so 9.90 under a 5 % markdown reads as the 9.41 eBay actually charges rather than being refused for the half penny',
    (() => {
      const on = F.adSaleMembership(smClear, smEv, smLedger(9.9, 9.41), [], smDay);
      const alsoOn = F.adSaleMembership(smClear, smEv, smLedger(5.95, 5.65), [], smDay);
      return on.on_sale === true && on.basis === 'ledger' && on.pre_sale_price === 9.9 &&
        alsoOn.on_sale === true && alsoOn.pre_sale_price === 5.95 && alsoOn.expected_sale_price === 5.65;
    })(), null);
  t('sale snapshot: its own note carries BOTH figures, so the fault of 6 November would have been visible in the job list from the first run',
    /· named ' \+ C\.added_n \+ ' · on sale ' \+ C\.on_sale_n \+ ' · skipped ' \+ C\.skipped_n/.test(snapFn) && /adSaleReasonText\(C\.reasons\)/.test(snapFn), null);
  /* ---- the GetItem fix: the request shape ---- */
  t('GetItem fix: a request with no XML at all is refused HERE, with a message that says an empty body is what makes eBay answer 21359, rather than being posted as a zero-length body for eBay to time out on',
    (() => {
      const empty = F.adTradeRequestXml({}), nul = F.adTradeRequestXml(null), blank = F.adTradeRequestXml({ xml: '   ' });
      return empty.ok === false && empty.bytes === 0 && /21359/.test(empty.error) && /^SAY: /.test(empty.error) &&
        nul.ok === false && blank.ok === false;
    })(), null);
  t('GetItem fix: the body is taken from any of the names a caller uses, and which one it came from travels back so a mis-named field can be seen rather than guessed at',
    (() => {
      const decl = '<?xml version="1.0" encoding="utf-8"?><GetItemRequest><ItemID>1</ItemID></GetItemRequest>';
      const byXml = F.adTradeRequestXml({ xml: decl }), byBody = F.adTradeRequestXml({ body: decl }), byReq = F.adTradeRequestXml({ request_xml: decl });
      return byXml.ok === true && byXml.named === 'xml' && byBody.ok === true && byBody.named === 'body' && byReq.named === 'request_xml' &&
        byXml.bytes === decl.length && F.ADTOOL_TRADE_XML_FIELDS.indexOf('xml') === 0;
    })(), null);
  t('GetItem fix: a byte-order mark and the whitespace a copied heredoc leaves are trimmed off, and a body with no declaration is refused with eBay\'s own reason named',
    (() => {
      const decl = '<?xml version="1.0" encoding="utf-8"?><GetItemRequest><ItemID>1</ItemID></GetItemRequest>';
      const messy = F.adTradeRequestXml({ xml: '﻿\n  ' + decl + '\n' });
      const noDecl = F.adTradeRequestXml({ xml: '<GetItemRequest><ItemID>1</ItemID></GetItemRequest>' });
      return messy.ok === true && messy.xml === decl && noDecl.ok === false && /XML Parse error/.test(noDecl.error);
    })(), null);
  t('GetItem fix: what eBay said comes back named, so a refusal that arrives as HTTP 200 with Ack Failure can never read as a success again',
    (() => {
      const fail = F.adTradeAckOf('<GetItemResponse><Ack>Failure</Ack><Errors><ShortMessage>Input transfer has been terminated because your request timed out.</ShortMessage><ErrorCode>21359</ErrorCode></Errors></GetItemResponse>');
      const good = F.adTradeAckOf('<GetItemResponse><Ack>Success</Ack></GetItemResponse>');
      return fail.ack === 'Failure' && fail.ok === false && fail.error_codes.join(',') === '21359' && /Input transfer/.test(fail.first_message) &&
        good.ack === 'Success' && good.ok === true && good.error_codes.length === 0;
    })(), null);
  t('GetItem fix: the key route itself no longer posts whatever arrived under one name, and it carries the ack and the bytes it sent back out with the reply',
    (() => {
      const route = src.slice(src.indexOf('  ebayTradeCall: {'), src.indexOf('  ebayConsentLinkKey: {'));
      return route.length > 500 && route.indexOf("body: String(p.xml || '')") < 0 && /const REQ = adTradeRequestXml\(p\);/.test(route) &&
        /if \(!REQ\.ok\) throw new Error\(REQ\.error\);/.test(route) && /body: REQ\.xml,/.test(route) &&
        /sent_bytes: REQ\.bytes, sent_as: REQ\.named \}, adTradeAckOf\(xml\)\)/.test(route) &&
        /zero-length POST/.test(src) && /21359/.test(src);
    })(), null);
  /* ---- §3 and §6: the page's account strip and its new blocks, and the probe ---- */
  t('sale page: the account buttons are the same control as the one on Where each listing advertises, pressing one asks the engine again for that account, and the counts on them are the whole fleet\'s',
    /\.sv-filters\{/.test(svSrc) && /function accountStrip\(\)/.test(svCode) && /h \+= accountStrip\(\)/.test(svCode) &&
    /account_strip/.test(svCode) && /SV\.account = want;/.test(svCode) && /if \(SV\.account\) \{ p\.account = SV\.account; \}/.test(svCode) &&
    /All accounts/.test(svSrc), null);
  t('sale page: the running-events block prints what each event really did, one line per event, with the reason counts beside the ones eBay left out',
    /function runningEvents\(\)/.test(svCode) && /h \+= runningEvents\(\)/.test(svCode) &&
    /e\.named_n/.test(svCode) && /e\.on_sale_n/.test(svCode) && /e\.skipped_n/.test(svCode) && /function reasonsCell\(/.test(svCode) &&
    /An event naming a listing is not a listing in a sale/.test(svSrc), null);
  t('sale page: the morning-after check and the two cohorts each have a block of their own, and the freeze rule is printed where the cohorts are',
    /function morningAfter\(\)/.test(svCode) && /h \+= morningAfter\(\)/.test(svCode) && /entered_check/.test(svCode) &&
    /function cohortView\(\)/.test(svCode) && /h \+= cohortView\(\)/.test(svCode) && /C\.freeze_rule/.test(svCode) && /The freeze rule/.test(svSrc), null);
  t('sale page: every row carries its cohort and, where an event already names it and eBay left it out, says so on the row itself',
    /function cohortTag\(id\)/.test(svCode) && /function cohortOf\(id\)/.test(svCode) && /cohort_reason|by_item/.test(svCode) &&
    /function skipNote\(r\)/.test(svCode) && /r\.skip_word/.test(svCode) && /eBay left it out/.test(svSrc), null);
  t('sale page: it re-reads itself inside five minutes through the shared poller, which waits on a hidden tab and stops for good on a lapsed session',
    /adtPoll\('svBody', 300000, function \(\) \{ return load\(true\); \}\);/.test(svCode) && /function load\(quiet\)/.test(svCode) &&
    /if \(!quiet && \$\('svBody'\)\)/.test(svCode), null);
  t('sale page: the proof behind every listing in a sale is printed, and the event\'s list alone is shown as the weak answer it is rather than as a proof',
    /function proofWords\(b\)/.test(svCode) && /PROOF_WORDS/.test(svCode) && /r\.membership_basis/.test(svCode) &&
    /the event’s list alone/.test(svSrc), null);
  t('sale pair: the second of two events naming the SAME listings counts the ones the first event got as in another event rather than under one of the four reasons, so the figures on its line add up',
    (() => {
      const comp = src.slice(src.indexOf('  const eventCounts = {};'), src.indexOf('  const B = adSaleBatches(items, today,'));
      const page = svCode;
      return /if \(it\.in_sale && !mine\) \{ another\+\+;/.test(comp) &&
        /in_another_event: another,/.test(comp) &&
        /reasons_text: adSaleReasonText\(C\.reasons\) \+ \(another > 0 \? ', ' \+ another \+ ' in another event' : ''\)/.test(comp) &&
        /e\.in_another_event/.test(page) && /are in another event/.test(svSrc);
    })(), null);
  t('sale probe: it carries a line for every running event and the count of what each proof actually proved, which is how Sir Hasib\'s pair can be read by key',
    (() => {
      const pr = src.slice(src.indexOf('  adsSaleProbe: {'), src.indexOf('  adsVideoProbe: {'));
      return /events: \(D\.running_events \|\| \[\]\)\.map/.test(pr) && /named_n: e\.named_n, added_n: e\.added_n, on_sale_n: e\.on_sale_n, skipped_n: e\.skipped_n/.test(pr) &&
        /membership_basis_counts: \(\(\) => \{/.test(pr) && /cohorts: D\.cohorts \?/.test(pr) && /morning_after:/.test(pr) &&
        /account_strip: D\.account_strip/.test(pr) && !/fetch\(/.test(pr) && /ebay_word: \{/.test(pr);
    })(), null);
  t('sale payload: the engine sends a line per running event, the cohorts, the account strip and the morning-after check, and every one of them is read by the page',
    (() => {
      const sends = f => new RegExp('\\b' + f + '\\b').test(src);
      const reads = f => new RegExp('\\b' + f + '\\b').test(svCode);
      return ['running_events', 'cohorts', 'account_strip', 'entered_check', 'membership_basis', 'skip_word', 'reasons_text'].every(f => sends(f) && reads(f));
    })(), null);
  t('sale payload: the honest limits now say that an event naming a listing is not a listing in a sale, and that the reason beside a skipped one is our reading and not eBay\'s word',
    /An event naming a listing is not on its own a listing in a sale/.test(src) && /OUR OWN clock reading and not eBay’s word/.test(src), null);

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
  /* 28 Oct: there are no longer TWO change pages. The owner's Change Spec merged activated and
     stopped into one, so the second file and the shared page one handed to the other are both gone,
     and these two tests now hold the merge to its own promise instead of the hand-off's. A page that
     is deleted cannot be tested for how carefully it asked for something. */
  const actSrc = readFile('frontend/view-adtool-activated.js');
  const viewCode = viewSrc.replace(/\/\*[\s\S]*?\*\//g, '');   /* the prose names the old hand-off too; this is about the code */
  t('changes: activated and stopped are ONE page now, so the second file and the page it was handed are gone', actSrc === '' && !/adtChangeDayPage/.test(viewCode) && !/adtChangeDayPage/.test(readFile('src/shell.html').replace(/\/\*[\s\S]*?\*\//g, '')), [actSrc.length, (viewCode.match(/adtChangeDayPage/g) || []).length]);
  t('changes: the merged page asks the engine for each direction itself, which is what the engine was told to expect', (() => { const st = readFile('frontend/view-adtool-stopped.js'); return (st.match(/adtoolChangeDay/g) || []).length >= 2 && /direction: 'activated'|direction: dir/.test(st) && /var p = \{ direction: dir \}/.test(st); })(), (readFile('frontend/view-adtool-stopped.js').match(/adtoolChangeDay/g) || []).length);
  /* 2 Nov: the Peak page now prints profit, and that is allowed, because what it prints is ONE
     LISTING'S own — the By period table inside that listing's details block, through the shared
     per-item cell, handed a figure the engine built for that item alone. The rule it is held to is
     therefore no longer "no profit cell anywhere on either page": the Changes page still prints
     none at all, and the Peak page may print it only that one way and nowhere else. */
  const chgOnly = readFile('frontend/view-adtool-stopped.js'), peakOnly = readFile('frontend/view-adtool-peak.js');
  t('fields: nothing on either page is ever sent to eBay, and the only profit either prints is one listing\'s own, through the shared per-item cell', !/ebay\.com\/sh\/ads\/dashboard\/campaign\/[^']*'\s*\+/.test(viewSrc) && !/adtProfitCell/.test(chgOnly) && (peakOnly.match(/adtProfitCell\(/g) || []).length === 1 && /adtProfitCell\(p\.actual_profit, 0, 0\)/.test(peakOnly) && (viewSrc.match(/api\('[A-Za-z]+'/g) || []).every(c => /adtoolChangeDay|adtoolPeak|adtoolPlan|adtoolCommand/.test(c)), [(peakOnly.match(/adtProfitCell\(/g) || []).length, (viewSrc.match(/api\('[A-Za-z]+'/g) || [])]);
  /* 31 Oct section 2: the Peak-time overview at the top of the Peak page reads the Overview's own
     two actions with cohort:'peak'. Both are reads: neither writes a row and neither reaches eBay,
     and the cohort answer says so itself (sent_to_ebay false on the probe that prints it). */

  /* ================= "live on eBay, ARCHIVED in the portal" (owner, 24 Oct) =================
     One listing can hold more than one ad record in the SAME campaign, and the membership loop used
     to keep whichever record eBay returned LAST, so a dead ARCHIVED record could overwrite the
     serving one. Every rule of the cure is held here. */
  const AD = (adId, adStatus, bidPercentage, listingId, adGroupId) => ({ adId: adId, adStatus: adStatus, bidPercentage: bidPercentage || '', listingId: listingId || 'L1', adGroupId: adGroupId || '' });

  /* (a) one record of each status returns itself */
  t('ad merge: a single ACTIVE record returns itself', (() => { const r = F.adPickLiveAd([AD('100', 'ACTIVE', '7.5')]); return r && r.ad_id === '100' && r.st === 'ACTIVE' && r.bid === '7.5' && r.records === 1; })(), F.adPickLiveAd([AD('100', 'ACTIVE', '7.5')]));
  t('ad merge: a single PAUSED record returns itself', (() => { const r = F.adPickLiveAd([AD('101', 'PAUSED')]); return r && r.ad_id === '101' && r.st === 'PAUSED' && r.records === 1; })(), F.adPickLiveAd([AD('101', 'PAUSED')]));
  t('ad merge: a single ARCHIVED record returns itself, because that is all eBay gave', (() => { const r = F.adPickLiveAd([AD('102', 'ARCHIVED')]); return r && r.ad_id === '102' && r.st === 'ARCHIVED' && r.records === 1; })(), F.adPickLiveAd([AD('102', 'ARCHIVED')]));
  t('ad merge: a cost-per-sale record carries no status and still returns itself', (() => { const r = F.adPickLiveAd([AD('103', '')]); return r && r.ad_id === '103' && r.st === '' && r.records === 1; })(), F.adPickLiveAd([AD('103', '')]));

  /* (b) THE BUG. ACTIVE must beat ARCHIVED whichever order eBay returns them in. */
  t('ad merge: ACTIVE beats ARCHIVED when the archived record arrives LAST (the exact bug)', (() => { const r = F.adPickLiveAd([AD('500', 'ACTIVE'), AD('100', 'ARCHIVED')]); return r && r.st === 'ACTIVE' && r.ad_id === '500' && r.records === 2; })(), F.adPickLiveAd([AD('500', 'ACTIVE'), AD('100', 'ARCHIVED')]));
  t('ad merge: ACTIVE beats ARCHIVED when the archived record arrives FIRST', (() => { const r = F.adPickLiveAd([AD('100', 'ARCHIVED'), AD('500', 'ACTIVE')]); return r && r.st === 'ACTIVE' && r.ad_id === '500' && r.records === 2; })(), F.adPickLiveAd([AD('100', 'ARCHIVED'), AD('500', 'ACTIVE')]));
  t('ad merge: ACTIVE still beats ARCHIVED when the archived record has the HIGHER adId', F.adPickLiveAd([AD('900', 'ARCHIVED'), AD('100', 'ACTIVE')]).st === 'ACTIVE', F.adPickLiveAd([AD('900', 'ARCHIVED'), AD('100', 'ACTIVE')]));
  t('ad merge: PAUSED beats ARCHIVED either way round', F.adPickLiveAd([AD('1', 'PAUSED'), AD('2', 'ARCHIVED')]).st === 'PAUSED' && F.adPickLiveAd([AD('2', 'ARCHIVED'), AD('1', 'PAUSED')]).st === 'PAUSED', null);
  t('ad merge: a blank status (cost-per-sale, where existing IS the status) beats ARCHIVED either way round', F.adPickLiveAd([AD('1', ''), AD('2', 'ARCHIVED')]).st === '' && F.adPickLiveAd([AD('2', 'ARCHIVED'), AD('1', '')]).st === '', null);
  t('ad merge: ACTIVE beats PAUSED, and PAUSED beats blank, so the whole order is ACTIVE > PAUSED > blank > ARCHIVED', F.adPickLiveAd([AD('1', 'PAUSED'), AD('2', 'ACTIVE')]).st === 'ACTIVE' && F.adPickLiveAd([AD('1', ''), AD('2', 'PAUSED')]).st === 'PAUSED' && F.adStatusRank('ACTIVE') > F.adStatusRank('PAUSED') && F.adStatusRank('PAUSED') > F.adStatusRank('') && F.adStatusRank('') > F.adStatusRank('ARCHIVED'), [F.adStatusRank('ACTIVE'), F.adStatusRank('PAUSED'), F.adStatusRank(''), F.adStatusRank('ARCHIVED')]);
  t('ad merge: the status is read whatever case or padding eBay sends it in', F.adStatusRank(' active ') === F.adStatusRank('ACTIVE') && F.adStatusRank('Archived') === F.adStatusRank('ARCHIVED'), null);
  t('ad merge: a word eBay has not used before outranks ARCHIVED, because only ARCHIVED contradicts the money', F.adStatusRank('SOMETHING_NEW') > F.adStatusRank('ARCHIVED') && F.adPickLiveAd([AD('1', 'ARCHIVED'), AD('2', 'SOMETHING_NEW')]).st === 'SOMETHING_NEW', null);

  /* (c) ties go to the newest adId, compared as digits and never as a number */
  t('ad merge: two ACTIVE records take the newer adId, whichever order they arrive in', F.adPickLiveAd([AD('100', 'ACTIVE'), AD('900', 'ACTIVE')]).ad_id === '900' && F.adPickLiveAd([AD('900', 'ACTIVE'), AD('100', 'ACTIVE')]).ad_id === '900', null);
  t('ad merge: the newer adId is decided by digits, so a longer id wins and 1000 beats 999', F.adIdNewer('1000', '999') && !F.adIdNewer('999', '1000') && F.adPickLiveAd([AD('999', 'ACTIVE'), AD('1000', 'ACTIVE')]).ad_id === '1000', null);
  t('ad merge: an adId far past the largest exact integer is still compared correctly', F.adIdNewer('9007199254740993', '9007199254740992') && !F.adIdNewer('9007199254740992', '9007199254740993'), null);
  t('ad merge: leading zeroes do not make an id look longer, and equal ids are not newer than each other', F.adIdNewer('0100', '99') && !F.adIdNewer('100', '100') && !F.adIdNewer('100', '0100'), null);
  t('ad merge: two ARCHIVED records still answer, with the newer id, rather than refusing', F.adPickLiveAd([AD('1', 'ARCHIVED'), AD('2', 'ARCHIVED')]).ad_id === '2' && F.adPickLiveAd([AD('1', 'ARCHIVED'), AD('2', 'ARCHIVED')]).records === 2, null);

  /* (d) nothing in, nothing out */
  t('ad merge: an empty list is null, never a guessed status', F.adPickLiveAd([]) === null && F.adPickLiveAd(null) === null && F.adPickLiveAd(undefined) === null, null);
  t('ad merge: a list of nothing but holes is null too, and holes are not counted as records', F.adPickLiveAd([null, undefined]) === null, null);

  /* (e) the count is PER LISTING, which is the proof the owner can see */
  t('ad merge: the duplicate count is the records for THAT listing, not the campaign', (() => {
    const m = F.adMergeAds([AD('1', 'ARCHIVED', '', 'L1'), AD('2', 'ACTIVE', '', 'L1'), AD('3', 'ACTIVE', '', 'L2'), AD('4', 'ACTIVE', '', 'L3'), AD('5', 'PAUSED', '', 'L3'), AD('6', 'ARCHIVED', '', 'L3')]);
    return m.now.L1.records === 2 && m.now.L2.records === 1 && m.now.L3.records === 3 && m.duplicate_listings === 2 && m.extra_records === 3;
  })(), F.adMergeAds([AD('1', 'ARCHIVED', '', 'L1'), AD('2', 'ACTIVE', '', 'L1'), AD('3', 'ACTIVE', '', 'L2'), AD('4', 'ACTIVE', '', 'L3'), AD('5', 'PAUSED', '', 'L3'), AD('6', 'ARCHIVED', '', 'L3')]));
  t('ad merge: a whole campaign resolves one governing record per listing and the archived twin never wins', (() => {
    const m = F.adMergeAds([AD('1', 'ARCHIVED', '', 'L1'), AD('2', 'ACTIVE', '5.0', 'L1'), AD('3', 'ARCHIVED', '', 'L2')]);
    return m.now.L1.st === 'ACTIVE' && m.now.L1.bid === '5.0' && m.now.L2.st === 'ARCHIVED' && Object.keys(m.now).length === 2;
  })(), null);
  const AD_NOLID = [{ adId: '1', adStatus: 'ACTIVE', bidPercentage: '', adGroupId: '' }];
  t('ad merge: a record with no listing id is dropped rather than filed under an empty key', Object.keys(F.adGroupAdsByListing(AD_NOLID)).length === 0 && Object.keys(F.adMergeAds(AD_NOLID).now).length === 0, Object.keys(F.adGroupAdsByListing(AD_NOLID)));
  t('ad merge: the governing record carries its ad group and bid through, not just its status', (() => { const r = F.adPickLiveAd([AD('1', 'ARCHIVED', '1.0', 'L1', 'gOld'), AD('2', 'ACTIVE', '9.5', 'L1', 'gNew')]); return r.grp === 'gNew' && r.bid === '9.5'; })(), null);

  /* (f) fix 5: a short answer must never delete a membership */
  t('truncation: an answer short of the total eBay reports is truncated', F.adsFetchTruncated(500, 1200) === true && F.adsFetchTruncated(1000, 1200) === true, null);
  t('truncation: a whole answer is not truncated, and more than the total is not either', F.adsFetchTruncated(119, 119) === false && F.adsFetchTruncated(1000, 999) === false, null);
  t('truncation: no total, a total of none, or nonsense is not evidence of truncation', F.adsFetchTruncated(0, null) === false && F.adsFetchTruncated(5, 0) === false && F.adsFetchTruncated(5, undefined) === false && F.adsFetchTruncated(5, 'x') === false, null);
  t('truncation: a response short of the total produces NO deletions (the membership writer skips them)', (() => {
    const prev = { L1: '', L2: '', L3: '' };
    const now = { L1: {}, L2: {} };                                    // L3 simply was not on the page we got
    const truncated = F.adsFetchTruncated(500, 1200);
    const removed = truncated ? [] : Object.keys(prev).filter(l => !(l in now));
    const whole = F.adsFetchTruncated(3, 3) ? [] : Object.keys(prev).filter(l => !(l in now));
    return truncated && removed.length === 0 && whole.length === 1 && whole[0] === 'L3';
  })(), null);

  /* (g) fix 3: money beats status */
  const RQ = (acct, cid, lid, st) => ({ account: acct, campaign_id: cid, listing_id: lid, ad_status: st });
  t('repair: a billed listing reading ARCHIVED is queued for a re-read', (() => {
    const q = F.adRepairTargets([RQ('A', 'C1', 'L1', 'ARCHIVED')], { 'A|C1|L1': 12.34 }, {});
    return q.length === 1 && q[0].campaign_id === 'C1' && q[0].listing_id === 'L1' && q[0].evidence === 'campaign';
  })(), F.adRepairTargets([RQ('A', 'C1', 'L1', 'ARCHIVED')], { 'A|C1|L1': 12.34 }, {}));
  t('repair: a billed listing reading ACTIVE is not queued, because nothing about it disagrees', F.adRepairTargets([RQ('A', 'C1', 'L1', 'ACTIVE'), RQ('A', 'C1', 'L2', 'PAUSED'), RQ('A', 'C1', 'L3', '')], { 'A|C1|L1': 9, 'A|C1|L2': 9, 'A|C1|L3': 9 }, {}).length === 0, null);
  t('repair: an ARCHIVED row with no money against it is not queued', F.adRepairTargets([RQ('A', 'C1', 'L1', 'ARCHIVED')], {}, {}).length === 0 && F.adRepairTargets([RQ('A', 'C1', 'L1', 'ARCHIVED')], { 'A|C1|L1': 0 }, {}).length === 0, null);
  t('repair: money in a DIFFERENT campaign does not queue this campaign, and does not clear the one it was billed in', (() => {
    const rows = [RQ('A', 'C1', 'L1', 'ARCHIVED'), RQ('A', 'C2', 'L1', 'ARCHIVED')];
    const q = F.adRepairTargets(rows, { 'A|C1|L1': 7 }, { 'A|L1': 7 });
    return q.length === 1 && q[0].campaign_id === 'C1';
  })(), F.adRepairTargets([RQ('A', 'C1', 'L1', 'ARCHIVED'), RQ('A', 'C2', 'L1', 'ARCHIVED')], { 'A|C1|L1': 7 }, { 'A|L1': 7 }));
  t('repair: the per-listing figures are a FALLBACK, used only where the campaign-level rows say nothing at all about that listing', (() => {
    const only = F.adRepairTargets([RQ('A', 'C9', 'L9', 'ARCHIVED')], {}, { 'A|L9': 3 });
    const beaten = F.adRepairTargets([RQ('A', 'C9', 'L9', 'ARCHIVED')], { 'A|C8|L9': 3 }, { 'A|L9': 3 });
    return only.length === 1 && only[0].evidence === 'listing' && beaten.length === 0;
  })(), null);
  t('repair: another account is never swept in on the same campaign or listing id', F.adRepairTargets([RQ('B', 'C1', 'L1', 'ARCHIVED')], { 'A|C1|L1': 20 }, { 'A|L1': 20 }).length === 0, null);
  t('repair: a row missing its account, campaign or listing is skipped rather than queued half-built', F.adRepairTargets([RQ('', 'C1', 'L1', 'ARCHIVED'), RQ('A', '', 'L1', 'ARCHIVED'), RQ('A', 'C1', '', 'ARCHIVED')], { '|C1|L1': 5, 'A||L1': 5, 'A|C1|': 5 }, {}).length === 0, null);

  /* (h) fix 4: money first, then the oldest read */
  t('rotation: a campaign that spent comes before an idle one', (() => {
    const o = F.adsRotationOrder([{ campaign_id: 'idle', ads_synced_at: '2026-10-20 01:00:00' }, { campaign_id: 'spent', ads_synced_at: '2026-10-24 09:00:00' }], { spent: 4.2 });
    return o[0].campaign_id === 'spent' && o[1].campaign_id === 'idle';
  })(), F.adsRotationOrder([{ campaign_id: 'idle', ads_synced_at: '2026-10-20 01:00:00' }, { campaign_id: 'spent', ads_synced_at: '2026-10-24 09:00:00' }], { spent: 4.2 }).map(c => c.campaign_id));
  t('rotation: inside the same group an older read comes before a newer one', (() => {
    const o = F.adsRotationOrder([{ campaign_id: 'new', ads_synced_at: '2026-10-24 09:00:00' }, { campaign_id: 'old', ads_synced_at: '2026-10-24 02:00:00' }], {});
    return o[0].campaign_id === 'old';
  })(), null);
  t('rotation: a campaign never read at all has no stamp and goes first of all', F.adsRotationOrder([{ campaign_id: 'read', ads_synced_at: '2026-10-24 02:00:00' }, { campaign_id: 'never', ads_synced_at: null }], {})[0].campaign_id === 'never', null);
  t('rotation: a spending campaign read five minutes ago still outranks an idle one never read', F.adsRotationOrder([{ campaign_id: 'never', ads_synced_at: '' }, { campaign_id: 'spent', ads_synced_at: '2026-10-24 09:55:00' }], { spent: 0.01 })[0].campaign_id === 'spent', null);
  t('rotation: the order is total, so two campaigns with the same money and the same stamp never shuffle', (() => {
    const camps = [{ campaign_id: 'b', ads_synced_at: 'x' }, { campaign_id: 'a', ads_synced_at: 'x' }];
    const o1 = F.adsRotationOrder(camps, {}).map(c => c.campaign_id).join(',');
    const o2 = F.adsRotationOrder(camps.slice().reverse(), {}).map(c => c.campaign_id).join(',');
    return o1 === 'a,b' && o2 === 'a,b';
  })(), null);
  /* money first on its own would starve the quiet campaigns, which is the same disease in a new
     place, so a share of every tick is reserved for them */
  const CAMPS = (n, spentN, stampFrom) => { const a = []; for (let i = 0; i < n; i++) a.push({ campaign_id: 'c' + (i < 10 ? '0' : '') + i, ads_synced_at: '2026-10-24 0' + (i % 10) + ':00:00', spent: i < spentN }); return a; };
  const SPEND = cs => { const o = {}; cs.forEach(c => { if (c.spent) o[c.campaign_id] = 1; }); return o; };
  t('rotation: a tick reserves slots for the campaigns that did NOT spend, so money first cannot starve them', (() => {
    const cs = CAMPS(56, 40);                       // far more spenders than one tick can read
    const pick = F.adsRotationPick(cs, SPEND(cs), 14, 10);
    const quiet = pick.filter(c => !c.spent).length;
    return pick.length === 14 && quiet === 4 && pick.filter(c => c.spent).length === 10;
  })(), F.adsRotationPick(CAMPS(56, 40), SPEND(CAMPS(56, 40)), 14, 10).length);
  t('rotation: with nothing spending at all the whole tick goes to the oldest reads', (() => {
    const cs = CAMPS(20, 0);
    const pick = F.adsRotationPick(cs, {}, 14, 10);
    return pick.length === 14 && pick.filter(c => c.spent).length === 0;
  })(), null);
  t('rotation: with everything spending the reserved slots are filled from the money order rather than wasted', (() => {
    const cs = CAMPS(30, 30);
    const pick = F.adsRotationPick(cs, SPEND(cs), 14, 10);
    return pick.length === 14;
  })(), F.adsRotationPick(CAMPS(30, 30), SPEND(CAMPS(30, 30)), 14, 10).length);
  t('rotation: a tick never returns the same campaign twice, and never more than it was asked for', (() => {
    const cs = CAMPS(8, 3);
    const pick = F.adsRotationPick(cs, SPEND(cs), 14, 10);
    const ids = pick.map(c => c.campaign_id);
    return pick.length === 8 && new Set(ids).size === 8;
  })(), null);
  t('rotation: asked for none it reads none, and the money share is never larger than the tick', F.adsRotationPick(CAMPS(5, 2), {}, 0, 10).length === 0 && F.adsRotationPick(CAMPS(5, 5), SPEND(CAMPS(5, 5)), 3, 99).length === 3, null);
  t('rotation: the spending campaigns a tick does take are the ones read longest ago', (() => {
    const cs = [{ campaign_id: 'newSpend', ads_synced_at: '2026-10-24 09:00:00' }, { campaign_id: 'oldSpend', ads_synced_at: '2026-10-24 01:00:00' }, { campaign_id: 'idle', ads_synced_at: '2026-10-24 00:00:00' }];
    const pick = F.adsRotationPick(cs, { newSpend: 1, oldSpend: 1 }, 2, 1);
    return pick[0].campaign_id === 'oldSpend' && pick[1].campaign_id === 'idle';
  })(), F.adsRotationPick([{ campaign_id: 'newSpend', ads_synced_at: '2026-10-24 09:00:00' }, { campaign_id: 'oldSpend', ads_synced_at: '2026-10-24 01:00:00' }, { campaign_id: 'idle', ads_synced_at: '2026-10-24 00:00:00' }], { newSpend: 1, oldSpend: 1 }, 2, 1).map(c => c.campaign_id));
  t('rotation: the list handed in is not reordered underneath the caller', (() => { const camps = [{ campaign_id: 'z', ads_synced_at: 'b' }, { campaign_id: 'a', ads_synced_at: 'a' }]; F.adsRotationOrder(camps, {}); return camps[0].campaign_id === 'z'; })(), null);

  /* (i) plain words for how stale a status is (fix 6) */
  t('last read: plain words, and never read when there is no stamp', (() => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    return F.adsAgeWords('', now) === 'never read' && F.adsAgeWords(null, now) === 'never read' &&
      F.adsAgeWords('2026-10-24 11:59:30', now) === 'just now' &&
      F.adsAgeWords('2026-10-24 11:30:00', now) === '30 minutes ago' &&
      F.adsAgeWords('2026-10-24 11:00:00', now) === 'an hour ago' &&
      F.adsAgeWords('2026-10-24 06:00:00', now) === '6 hours ago' &&
      F.adsAgeWords('2026-10-23 06:00:00', now) === 'yesterday' &&
      F.adsAgeWords('2026-09-18 06:00:00', now) === '36 days ago';
  })(), [F.adsAgeWords('2026-10-24 11:00:00', Date.parse('2026-10-24T12:00:00Z')), F.adsAgeWords('2026-09-18 06:00:00', Date.parse('2026-10-24T12:00:00Z'))]);
  t('last read: an unreadable stamp says never read rather than inventing an age', F.adsAgeWords('not a date', Date.parse('2026-10-24T12:00:00Z')) === 'never read', null);

  /* (j) and the engine really uses all of it — the rules above are worth nothing if the job still
     keeps whichever record arrived last. These read the source. */
  const asBlk = src.slice(src.indexOf('async function adsItems(env) {'), src.indexOf('/* The safety net for the dedicated cron slot'));
  t('engine: the membership job merges by precedence and no longer keeps whichever record arrived last', /const merged = adMergeAds\(got\.ads\);/.test(asBlk) && !/if \(lid\) now\[lid\] = \{ ad_id:/.test(src), null);
  t('engine: the removed list is EMPTY when the answer was truncated, so no membership is deleted from a short answer', /const removed = got\.truncated \? \[\] : Object\.keys\(prev\)\.filter/.test(asBlk) && /if \(got\.truncated\) budget\.truncated\+\+;/.test(asBlk), null);
  t('engine: a truncated campaign is written down where a person can read it, naming what eBay said', /adsItemsTruncated/.test(asBlk) && /eBay reported/.test(asBlk), null);
  t('engine: the duplicate count is stored on both the insert and the update, so an existing row gains it too', /INSERT INTO campaign_ads \(account, campaign_id, listing_id, ad_id, bid_pct, ad_status, ad_group, ad_records, synced_at\)/.test(asBlk) && /UPDATE campaign_ads SET bid_pct = \?4, ad_id = \?5, ad_status = \?6, ad_group = \?7, ad_records = \?8/.test(asBlk), null);
  t('engine: the column is added once, guarded, in the same list as the two that are already there', /"ALTER TABLE campaign_ads ADD COLUMN ad_records INTEGER DEFAULT 1"/.test(src) && /"ALTER TABLE campaign_ads ADD COLUMN ad_group TEXT"/.test(src), null);
  t('engine: the rotation is money first and the rate is high enough to come round inside the hour', /const order = adsRotationPick\(running, spend, ADS_ITEM_CAMPAIGNS_PER_TICK, ADS_ITEM_MONEY_SLOTS\);/.test(asBlk) && /const ADS_ITEM_CAMPAIGNS_PER_TICK = (\d+);/.test(src) && Number((src.match(/const ADS_ITEM_CAMPAIGNS_PER_TICK = (\d+);/) || [])[1]) >= 14, (src.match(/const ADS_ITEM_CAMPAIGNS_PER_TICK = (\d+);/) || [])[1]);
  t('engine: a slow account cannot starve the ones after it — the tick carries a clock and a fetch ceiling, checked before every campaign', /function adsBudgetSpent\(b\) \{ return !b \|\| b\.fetches >= ADS_ITEM_FETCH_CAP \|\| Date\.now\(\) >= b\.until; \}/.test(src) && (asBlk.match(/adsBudgetSpent\(budget\)/g) || []).length >= 2 && /starved/.test(asBlk), (asBlk.match(/adsBudgetSpent\(budget\)/g) || []).length);
  t('engine: the heavy rotation got a cron slot of its own, and the 15-minute slot keeps only a safety net', /'8-59\/15 \* \* \* \*': \[adsItems\],/.test(src) && /adsItemsNet, adsReportPoll/.test(src) && !/\[reportsRelayToSheet, adsItems,/.test(src), null);
  t('engine: the safety net runs the job only when the dedicated slot has not landed, so nothing runs twice', /async function adsItemsNet\(env\) \{/.test(src) && /ADS_ITEM_NET_MINUTES \* 60000\) return;/.test(src), null);
  t('engine: the repair pass re-reads from eBay and takes eBay’s own answer through the merge, never a guess', /async function adsRepairPass\(env, acct, tok, budget, truthOn\)/.test(src) && /const targets = adRepairTargets\(rows, byCampaign, byListing\);/.test(src) && /const merged = adMergeAds\(got\.ads\);/.test(src.slice(src.indexOf('async function adsRepairPass'))), null);
  t('engine: the repair pass is bounded — a capped row read, a capped campaign count per tick and the same tick budget', (() => { const rp = src.slice(src.indexOf('async function adsRepairPass'), src.indexOf('/* The safety net for the dedicated cron slot')); return /LIMIT 4000/.test(rp) && /ADS_REPAIR_CAMPAIGNS_PER_TICK\)/.test(rp) && /adsBudgetSpent\(budget\)/.test(rp) && /LIMIT 20000/.test(rp); })(), null);
  t('engine: the repair pass writes down what it corrected, what eBay still calls archived, and what has no ad at all', (() => { const rp = src.slice(src.indexOf('async function adsRepairPass'), src.indexOf('/* The safety net for the dedicated cron slot')); return /adsItemsRepair/.test(rp) && /corrected/.test(rp) && /still says archived/.test(rp) && /no ad record at all/.test(rp); })(), null);
  t('engine: the repair pass never deletes a membership, it only updates the row it re-read', (() => { const rp = src.slice(src.indexOf('async function adsRepairPass'), src.indexOf('/* The safety net for the dedicated cron slot')); return !/DELETE/.test(rp) && /UPDATE campaign_ads SET ad_status/.test(rp); })(), null);
  t('engine: the pause action reads its answer back through the merge too, so an old archived twin cannot undo it', (() => { const pl = src.slice(src.indexOf('  adsPauseListing: {'), src.indexOf('  adsAdProbe: {')); return /adPickLiveAd\(adGroupAdsByListing\(got\.ads\)\[lid\]\)/.test(pl) && /ad_records = \?6/.test(pl) && !/if \(String\(ad\.listingId\) === lid\)/.test(src); })(), null);

  /* (k) the probe (fix 2). It exists, it is sync-key only, and it writes NOTHING. */
  const probe = src.slice(src.indexOf('  adsAdProbe: {'), src.indexOf('  /* WO-08: the advertising truth for the three pages'));
  t('probe: the route exists, takes an account, a campaign and an optional listing, and is sync-key only', /adsAdProbe: \{\n\s*auth: 'sync', fn:/.test(src) && /p && p\.account/.test(probe) && /p && p\.campaign_id/.test(probe) && /p && p\.listing_id/.test(probe), null);
  t('probe: it hands back every RAW record, grouped by listing, with the duplicate count and the record that governs', /adGroupAdsByListing\(got\.ads\)/.test(probe) && /governs: adPickLiveAd\(by\[lid\]\)/.test(probe) && /ad_status: String\(ad\.adStatus \|\| ''\)/.test(probe) && /bid_percentage/.test(probe) && /ad_group_id/.test(probe) && /duplicate_listings/.test(probe) && /records: by\[lid\]\.length/.test(probe), null);
  t('probe: it says whether the answer was whole, so a truncated read can never be mistaken for the truth', /answer_complete: !got\.truncated/.test(probe) && /total_reported: got\.total/.test(probe), null);
  t('probe: READ ONLY — not one write of any kind, no schema guard, no note, and nothing but a GET to eBay', !/INSERT|UPDATE |DELETE |ALTER |ctx_setSync|ensureTruthSchema|ensureAdtoolPhase/.test(probe) && !/method: 'POST'|method: 'PUT'|method: 'DELETE'/.test(probe) && (probe.match(/adsFetchAdList/g) || []).length === 1 && !/fetch\(/.test(probe), null);
  t('probe: its answer is bounded, so one campaign can never return an unbounded payload', /ADS_PROBE_LISTING_CAP/.test(probe) && /ADS_PROBE_RECORD_CAP/.test(probe) && /const ADS_PROBE_LISTING_CAP = \d+;/.test(src), null);
  t('probe: the ad list is read with a GET and nothing else, and the one fetch in the engine’s ad reader sends no body', (() => { const fa = src.slice(src.indexOf('async function adsFetchAdList'), src.indexOf('async function adsItems(env) {')); return /headers: \{ authorization: 'Bearer ' \+ tok \} \}\);/.test(fa) && !/method:/.test(fa) && !/body:/.test(fa); })(), null);

  /* (l) fix 6: an ad status is only as true as the last time eBay was asked, and only RUNNING
     campaigns are ever asked again. Every page that shows one is handed the stamp and the words. */
  t('honesty: the shared per-listing read sends the stamp of its own reading, whether it is still being re-read, and how many ad records eBay held', (() => { const w = src.slice(src.indexOf('async function adtWhereRows'), src.indexOf('/* ---- actions ---- */')); return /ca\.synced_at, ca\.ad_records, c\.ads_synced_at/.test(w) && /ads_synced_at: adsOldestStamp\(r\.ads_synced_at, r\.synced_at\)/.test(w) && /campaign_running:/.test(w) && /ad_records: r\.ad_records == null \? 1 : Number\(r\.ad_records\)/.test(w); })(), null);
  /* ONE OWNER FOR THE WORDING (settled 24 Oct). The engine used to send a pre-worded age AND the
     pages derived their own from the stamp. Two sources for one sentence drift, and the engine's is
     the one that goes wrong: it is built when the payload is built, so a page left open on a desk
     keeps showing the age it had when it loaded. The pages own the words; the engine sends stamps.
     The probe is the single exception and says why in its own comment: it is a sync-key JSON answer
     a person reads seconds after asking for it, not a page. */
  t('honesty: no PAGE payload pre-words an age any more, so the pages are the only owner of that sentence', (() => {
    const calls = (src.match(/adsAgeWords\(/g) || []).length;          // one definition + one caller
    const probe = src.slice(src.indexOf('  adsAdProbe: {'), src.indexOf('  /* WO-08: the advertising truth for the three pages'));
    /* the cadence sentence is gone as a FIELD; the comment that records why it went still names it */
    return calls === 2 && (probe.match(/adsAgeWords\(/g) || []).length === 1 && !/ad_status_cadence:/.test(src);
  })(), [(src.match(/adsAgeWords\(/g) || []).length]);
  t('honesty: every payload that shows an ad status carries the stamp and the duplicate count, and the cadence sentence is gone', (() => {
    const F2 = (name, end) => src.slice(src.indexOf(name), src.indexOf(end));
    const item = F2('async function adtoolItemCampaignsCompute', 'const ADTOOL_ACTIONS_P14');
    const inside = F2('async function adtoolCampaignListingsCompute', 'async function adtoolItemCampaignsCompute');
    const board = F2('async function adtoolCampaignBoardCompute', 'async function adtoolCampaignListingsCompute');
    const watch = F2('  campaignWatch: {', '  /* CPQ, last 14 days per item');
    /* the three payloads the pages were waiting on, each forwarding both fields */
    const forwards = [item, inside].every(s => /ads_synced_at: adsOldestStamp\(/.test(s) && /ad_records:/.test(s));
    return forwards && /ads_synced_at: adsOldestStamp\(c\.ads_synced_at, memAge\[k\]\)/.test(src) &&
      /c\.ads_synced_at FROM campaigns c/.test(board) && /ca\.synced_at AS ad_synced_at/.test(board) &&
      /ads_synced_at: adsOldestStamp\(r\.ads_synced_at, r\.synced_at\)/.test(watch) && /ca\.ad_records, ca\.synced_at/.test(watch) &&
      /ads_rotating/.test(src) && /ads_duplicated/.test(src) && !/ads_last_read/.test(item + inside + board + watch);
  })(), null);
  /* the honest age when two stamps describe one thing, and when one row stands for many */
  t('oldest stamp: the older of two readings wins, whichever order they are given', F.adsOldestStamp('2026-10-24 09:00:00', '2026-10-20 01:00:00') === '2026-10-20 01:00:00' && F.adsOldestStamp('2026-10-20 01:00:00', '2026-10-24 09:00:00') === '2026-10-20 01:00:00', null);
  t('oldest stamp: a space and a T in the middle are the same stamp, so the two formats compare', F.adsOldestStamp('2026-10-24T09:00:00', '2026-10-24 08:00:00') === '2026-10-24 08:00:00', null);
  t('oldest stamp: a missing stamp carries no information and never wins, because one unstamped row must not blank out the dates we do hold', F.adsOldestStamp('', '2026-10-24 09:00:00') === '2026-10-24 09:00:00' && F.adsOldestStamp(null, '2026-10-24 09:00:00') === '2026-10-24 09:00:00' && F.adsOldestStamp(undefined, '2026-10-24 09:00:00') === '2026-10-24 09:00:00', null);
  t('oldest stamp: nothing at all answers with the empty string, which the pages read as unknown rather than as old', F.adsOldestStamp() === '' && F.adsOldestStamp('', null) === '', null);
  t('oldest stamp: it takes any number of stamps, which is how a campaign row answers for all of its ads', F.adsOldestStamp('2026-10-24 09:00:00', '2026-10-22 09:00:00', '2026-10-23 09:00:00', '') === '2026-10-22 09:00:00', null);
  t('campaign board: a campaign row carries the OLDEST reading under it, not the campaign\'s own ask-time, because the row is only as current as its stalest ad', (() => {
    const r = F.adtCampaignRollup({
      campaigns: [{ account: 'A', campaign_id: 'C1', name: 'one', status: 'RUNNING', budget: '10', funding_model: 'COST_PER_CLICK', ads_synced_at: '2026-10-24 09:00:00' }],
      members: [{ account: 'A', campaign_id: 'C1', item_id: 'L1', ad_synced_at: '2026-10-24 09:00:00' },
        { account: 'A', campaign_id: 'C1', item_id: 'L2', ad_synced_at: '2026-10-19 03:00:00' }],
      live: [{ account: 'A', campaign_id: 'C1', item_id: 'L1' }], money: {}, real: [], rules: { day_cap: 2 },
    });
    return r.campaigns[0].ads_synced_at === '2026-10-19 03:00:00';
  })(), F.adtCampaignRollup({ campaigns: [{ account: 'A', campaign_id: 'C1', status: 'RUNNING', ads_synced_at: '2026-10-24 09:00:00' }], members: [{ account: 'A', campaign_id: 'C1', item_id: 'L2', ad_synced_at: '2026-10-19 03:00:00' }], live: [], money: {}, real: [], rules: { day_cap: 2 } }).campaigns[0]);
  t('campaign board: a campaign with no ads left still answers with its own ask-time rather than nothing', (() => {
    const r = F.adtCampaignRollup({ campaigns: [{ account: 'A', campaign_id: 'C9', status: 'PAUSED', ads_synced_at: '2026-10-21 07:00:00' }], members: [], live: [], money: {}, real: [], rules: { day_cap: 2 } });
    return r.campaigns[0].ads_synced_at === '2026-10-21 07:00:00';
  })(), null);
  /* the two columns this fix leans on, made sure of before anything names them */
  t('columns: the ad_records and ads_synced_at ALTERs have their own tiny guarded pass, run before the first query that names either', (() => {
    const g = src.slice(src.indexOf('async function ensureAdsReadingColumns'), src.indexOf('/* The rotation rate (fix 4)'));
    const items = src.slice(src.indexOf('async function adsItems(env) {'), src.indexOf('/* Fix 3, money beats status.'));
    return /ALTER TABLE campaign_ads ADD COLUMN ad_records INTEGER DEFAULT 1/.test(g) && /ALTER TABLE campaigns ADD COLUMN ads_synced_at TEXT/.test(g) &&
      /ADS_READING_COLS_OK/.test(g) && items.indexOf('ensureAdsReadingColumns(env)') < items.indexOf('FROM campaigns WHERE account = ?1') &&
      (src.match(/ensureAdsReadingColumns\(/g) || []).length >= 5;
  })(), [(src.match(/ensureAdsReadingColumns\(/g) || []).length]);
  t('columns: the pause path makes sure of the column BEFORE it calls eBay, so a missing column can never swallow the read-back of a pause that already landed', (() => {
    const pause = src.slice(src.indexOf('  adsPauseListing: {'), src.indexOf('  /* THE PROBE (owner batch 24 Oct, fix 2)'));
    return pause.indexOf('ensureAdsReadingColumns(ctx.env)') > 0 && pause.indexOf('ensureAdsReadingColumns(ctx.env)') < pause.indexOf('bulk_update_ads_status_by_listing_id');
  })(), null);
  t('columns: pre-existing rows read truthfully as one ad record, which is what the default says and what every reader falls back to', /ad_records INTEGER DEFAULT 1/.test(src) && /COALESCE\(ca\.ad_records, 1\)/.test(src) && /ad_records == null \? 1 :/.test(src), null);
  t('honesty: when the ad list was last read is a real column the engine can name, so a fresh database has it too', /"ALTER TABLE campaigns ADD COLUMN ads_synced_at TEXT"/.test(src), null);
  t('honesty: the ad-state event rows say whether a change came from the rolling read or from the money-beats-status repair', /adtoolAdEventsWrite\(env, acct, cid, prevSt, now, source\)|async function adtoolAdEventsWrite\(env, acct, cid, prevSt, now, source\)/.test(src) && /String\(source \|\| 'sync'\)\.slice\(0, 12\)/.test(src) && /nowSub, 'repair'\)/.test(src), null);

  /* (m) the hard rule: no eBay write endpoint is ever added. The readers GET and nothing else, and
     the peak switch of 28 Oct sends through the endpoint table that was already there. */
  t('hard rule: no new eBay write endpoint has been added, so the bulk ad-status URL is still written down exactly twice', (() => {
    const posts = (src.match(/method: 'POST'[\s\S]{0,400}?api\.ebay\.com\/sell\/marketing[^']*/g) || []);
    /* two mentions and only two: the endpoint table that names it, and the pause action that calls
       it by its full URL. The peak switch reaches it through ADTOOL_APPLY_ENDPOINTS, which is the
       whole point: a second copy of the URL is a second path nobody is watching. */
    const bulk = (src.match(/bulk_update_ads_status_by_listing_id/g) || []);
    return bulk.length === 2 && !/ad_campaign\/' \+ encodeURIComponent\(cid\) \+ '\/ad'[\s\S]{0,120}method/.test(src) && posts.length <= 2;
  })(), [(src.match(/bulk_update_ads_status_by_listing_id/g) || []).length]);
  t('hard rule: the repair pass and the probe both go through the one read-only ad reader', (() => { const uses = (src.match(/adsFetchAdList\(/g) || []).length; return uses === 5 && /async function adsFetchAdList\(tok, acct, cid, budget\)/.test(src); })(), (src.match(/adsFetchAdList\(/g) || []).length);
  t('hard rule: the money read uses the spend already held per day and never adds a click fee on top of it, and never reads impressions', (() => { const rp = src.slice(src.indexOf('async function adsItems(env) {'), src.indexOf('/* The safety net for the dedicated cron slot')); return /SUM\(spend\) AS sp/.test(rp) && !/impressions/.test(rp) && !/cpc_spend/.test(rp); })(), null);


  /* ---------------------------------------------------------------------------------------------
     The owner's Change Spec, 28 Oct 2026. Four things the engine owes the rebuilt portal, and the
     properties each of them has to keep: the three-way split of the live listings PARTITIONS them,
     the dynamic rate says who answered, Potential CPC fails on each of its three conditions alone,
     the hours format can be read or is refused with a reason, and the peak switch cannot send
     anything for an account whose own live switch is off.
     --------------------------------------------------------------------------------------------- */

  /* (1) Entire Live Listings: every live listing in exactly one of three places */
  /* THE PRODUCTION SHAPE, and nothing else. These fixtures used to carry `name`, which no membership
     row in this engine has ever had: adtoolLiveSplitCompute builds them with `campaign_name`. The
     fixtures passed while the page they stand for put every campaign the owner calls dynamic in the
     wrong list, because the classifier read a field that was not there. A fixture that does not have
     the shape of the real row is not a test, it is a second implementation agreeing with itself. */
  const mCpc = { funding_model: 'COST_PER_CLICK', campaign_name: 'ABRT pay per click', ad_rate_strategy: '' };
  const mDynName = { funding_model: 'COST_PER_SALE', campaign_name: 'General dynamic', ad_rate_strategy: '' };
  const mDynEbay = { funding_model: 'COST_PER_SALE', campaign_name: 'General', ad_rate_strategy: 'DYNAMIC' };
  const mFixed = { funding_model: 'COST_PER_SALE', campaign_name: 'General', ad_rate_strategy: 'FIXED' };
  const mOwner = { funding_model: 'COST_PER_SALE', campaign_name: 'ZAREEN Dynamic general', ad_rate_strategy: '' };
  const splitCases = [
    [[], 'no_cpc'], [[mCpc], 'on_cpc'], [[mFixed], 'no_cpc'], [[mDynName], 'dynamic'], [[mDynEbay], 'dynamic'],
    [[mOwner], 'dynamic'],
    [[mCpc, mDynName], 'on_cpc'], [[mDynName, mCpc], 'on_cpc'], [[mFixed, mDynEbay], 'dynamic'], [[mFixed, mFixed], 'no_cpc'],
  ];
  t('split: a campaign the owner names dynamic, in the shape the page really builds, lands in Dynamic', F.adLiveSplitClass([mOwner]) === 'dynamic' && F.adDynamicRate(mOwner).source === 'name' && F.adDynamicRate({ campaign_name: 'General dynamic' }).dynamic === true, [F.adLiveSplitClass([mOwner]), F.adDynamicRate(mOwner)]);
  t('split: the name is read under BOTH spellings and they agree, because the campaigns table says name and a membership row says campaign_name', F.adDynamicRate({ name: 'General dynamic' }).source === 'name' && F.adDynamicRate({ campaign_name: 'General dynamic' }).source === 'name' && F.adDynamicRate({ name: '', campaign_name: 'General dynamic' }).dynamic === true && F.adDynamicRate({ name: 'General dynamic', campaign_name: 'General' }).dynamic === true, null);
  t('split: every pattern of memberships lands where the spec says it does', splitCases.every(c => F.adLiveSplitClass(c[0]) === c[1]), splitCases.map(c => [F.adLiveSplitClass(c[0]), c[1]]).filter(x => x[0] !== x[1]));
  t('split: a listing on pay-per-click AND in a dynamic campaign counts as on pay-per-click, which is the figure a reader is after', F.adLiveSplitClass([mCpc, mDynEbay]) === 'on_cpc', F.adLiveSplitClass([mCpc, mDynEbay]));
  t('split: the answer is always exactly one of the three, so no listing can be in two lists or in none', splitCases.every(c => F.ADTOOL_LIVE_SPLIT_CLASSES.filter(k => k === F.adLiveSplitClass(c[0])).length === 1) && F.ADTOOL_LIVE_SPLIT_CLASSES.length === 3, F.ADTOOL_LIVE_SPLIT_CLASSES);
  t('split: the three counts add back up to the listings they were taken from', (() => {
    const tally = { on_cpc: 0, dynamic: 0, no_cpc: 0 }; const n = 97;
    for (let i = 0; i < n; i++) tally[F.adLiveSplitClass(splitCases[i % splitCases.length][0])]++;
    return tally.on_cpc + tally.dynamic + tally.no_cpc === n;
  })(), null);
  t('split: the third place says which kind of third it is, and only the third does', (() => {
    /* advertised on pay-on-sale at a fixed rate, and not advertised at all, are nothing alike: one
       costs nothing until it sells, the other cannot sell through an ad. The owner's three words
       cannot tell them apart, so they are counted apart INSIDE the third rather than made a fourth. */
    const un = F.adLiveSplitClassify([]), gen = F.adLiveSplitClassify([mFixed]);
    return un.split === 'no_cpc' && un.advertised === false && un.detail === 'unadvertised'
      && gen.split === 'no_cpc' && gen.advertised === true && gen.detail === 'general'
      && F.adLiveSplitClassify([mCpc]).detail === '' && F.adLiveSplitClassify([mDynEbay]).detail === ''
      && F.adLiveSplitClassify([mCpc]).advertised === true;
  })(), [F.adLiveSplitClassify([]), F.adLiveSplitClassify([mFixed])]);
  t('split: the two kinds of the third place add back up to it, over every pattern of memberships', (() => {
    let no = 0, gen = 0, un = 0;
    for (const c of splitCases) { const v = F.adLiveSplitClassify(c[0]); if (v.split !== 'no_cpc') continue; no++; if (v.detail === 'general') gen++; else if (v.detail === 'unadvertised') un++; }
    return no > 0 && gen > 0 && un > 0 && gen + un === no;
  })(), null);
  t('split: the owner’s three words are still the answer, and the detail never becomes a fourth place', F.ADTOOL_LIVE_SPLIT_CLASSES.length === 3 && splitCases.every(c => F.adLiveSplitClass(c[0]) === F.adLiveSplitClassify(c[0]).split), null);
  t('split: the two kinds are counted on the fleet and on every account row, and every row of the third list carries its own (regex over the real source)', (() => {
    const b = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('/* ---- Potential CPC'));
    return /no_cpc_general: 0, no_cpc_unadvertised: 0/.test(b) && /fleet\['no_cpc_' \+ cl\.detail\]\+\+; bk\['no_cpc_' \+ cl\.detail\]\+\+;/.test(b) && /split_detail: cl\.detail/.test(b);
  })(), null);
  t('split: each of the three places has a name a reader would say out loud', F.ADTOOL_LIVE_SPLIT_CLASSES.every(k => /^[A-Z]/.test(F.ADTOOL_LIVE_SPLIT_NAMES[k])) && F.ADTOOL_LIVE_SPLIT_NAMES.on_cpc === 'On CPC now', F.ADTOOL_LIVE_SPLIT_NAMES);
  t('one home per number: the fourth tab points at the page that already answers it instead of a second copy', /archive_action: 'adtoolCpcListings', archive_payload: \{ mode: 'post' \}/.test(src), null);
  /* 10 Nov: Entire live listings now carries each listing's own By period table, so this page does
     return a profit figure where it used to return none. The law did not change: profit leaves the
     engine PER ITEM. So the test changed from "no profit at all" to the thing actually required —
     every profit figure in both new computes is read on a row keyed by its own item id, and the
     collective objects (the three counts, the totals, the invariant) carry none. */
  t('hard rule: the only profit either new page returns is one LISTING\'s own, on a row keyed by its item id, so the collective strip has nothing above item level to take', (() => {
    const blk = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));
    const code = blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const hits = code.match(/[A-Za-z0-9_.]*profit[A-Za-z0-9_.]*/gi) || [];
    /* exactly two, and both of them are read off one listing's own By period row */
    const onlyItem = hits.length === 2 && hits[0] === 'r.profit_7d' && hits[1] === 'per.d7.actual_profit';
    /* and the rows they are written onto are the ones that carry the item id */
    const onRows = /r\.profit_7d = per && per\.d7 \? per\.d7\.actual_profit : null;/.test(blk) && /item_id: id, account: a, title: String\(it\.title \|\| ''\)/.test(blk);
    /* the collective objects are counts and nothing else */
    const blank = /const blank = \(\) => \(\{ on_cpc: 0, dynamic: 0, no_cpc: 0, no_cpc_general: 0, no_cpc_unadvertised: 0, active: 0 \}\);/.test(blk);
    /* and the strip really keeps an item-keyed profit while taking a collective one away */
    const pay = { totals: { on_cpc: 3 }, fleet_profit: 9, on_cpc: [{ item_id: '336798586123', profit_7d: 4.5, periods: { d7: { actual_profit: 4.5 } } }] };
    const out = F.adtStripCollectiveProfit(JSON.parse(JSON.stringify(pay)), { keepCollective: false });
    const strip = out.on_cpc[0].profit_7d === 4.5 && out.on_cpc[0].periods.d7.actual_profit === 4.5 && out.fleet_profit === undefined && out.totals.on_cpc === 3;
    return onlyItem && onRows && blank && strip;
  })(), (() => { const blk = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('const ADTOOL_ACTIONS_P16 = {')); const code = blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); return code.match(/[A-Za-z0-9_.]*profit[A-Za-z0-9_.]*/gi) || []; })());

  /* (2) the dynamic ad rate, all three sources */
  t('dynamic rate: eBay saying so is the answer, and the answer says eBay said it', JSON.stringify(F.adDynamicRate({ ad_rate_strategy: 'DYNAMIC', name: 'General' })) === JSON.stringify({ dynamic: true, source: 'ebay' }), F.adDynamicRate({ ad_rate_strategy: 'DYNAMIC', name: 'General' }));
  t('dynamic rate: with nothing from eBay the campaign name decides, whatever case it is written in', F.adDynamicRate({ name: 'ZAREEN Dynamic general' }).source === 'name' && F.adDynamicRate({ ad_rate_strategy: '', name: 'dynamic' }).dynamic === true, [F.adDynamicRate({ name: 'ZAREEN Dynamic general' }), F.adDynamicRate({ ad_rate_strategy: '', name: 'dynamic' })]);
  t('dynamic rate: neither says so, so it is not one, and the source is left empty', JSON.stringify(F.adDynamicRate({ ad_rate_strategy: 'FIXED', name: 'General' })) === JSON.stringify({ dynamic: false, source: '' }) && F.adDynamicRate(null).dynamic === false && F.adDynamicRate({}).source === '', [F.adDynamicRate({ ad_rate_strategy: 'FIXED', name: 'General' }), F.adDynamicRate(null)]);
  t('dynamic rate: eBay saying FIXED does not overrule a name the owner calls dynamic, and the source shows which answered', F.adDynamicRate({ ad_rate_strategy: 'FIXED', name: 'General dynamic' }).dynamic === true && F.adDynamicRate({ ad_rate_strategy: 'FIXED', name: 'General dynamic' }).source === 'name', F.adDynamicRate({ ad_rate_strategy: 'FIXED', name: 'General dynamic' }));
  t('columns: the rate strategy and the funding reply are nullable columns added behind a guard, with the old column list still behind them', /ALTER TABLE campaigns ADD COLUMN ad_rate_strategy TEXT DEFAULT ''/.test(src) && /ALTER TABLE campaigns ADD COLUMN funding_json TEXT DEFAULT ''/.test(src) && /INSERT INTO campaigns \(account, campaign_id, name, status, budget, funding_model, ad_rate_strategy, funding_json, synced_at\)/.test(src) && (src.match(/INSERT INTO campaigns \(account, campaign_id, name, status, budget, funding_model, synced_at\)/g) || []).length === 1, null);
  t('honesty: the whole funding reply is kept, and kept long enough to read back, which 400 characters was not (regex over the real source)', /JSON\.stringify\(fs\)\.slice\(0, 1000\)/.test(src) && !/JSON\.stringify\(fs\)\.slice\(0, 400\)/.test(src) && /fs\.adRateStrategy/.test(src) && /adtoolFundingStrategy/.test(src), null);
  t('honesty: a reply that does not carry the rate strategy keeps the one already on record instead of blanking it (regex over the real source)', (() => {
    /* both writers run on the same five-minute tick, so both have to refuse the blank: the upsert
       guards on excluded, the flagged field write on the bound value. One of them unguarded would
       put the blank straight back. */
    const up = /ad_rate_strategy = CASE WHEN COALESCE\(excluded\.ad_rate_strategy, ''\) <> '' THEN excluded\.ad_rate_strategy ELSE campaigns\.ad_rate_strategy END/.test(src);
    const fw = /ad_rate_strategy = CASE WHEN \?6 <> '' THEN \?6 ELSE ad_rate_strategy END/.test(src);
    return up && fw && !/DO UPDATE SET name=\?3, status=\?4, budget=\?5, funding_model=\?6, ad_rate_strategy=\?7/.test(src);
  })(), null);
  t('honesty: a database that has not caught up with the two columns still answers, from the campaign name', (() => { const m = src.slice(src.indexOf('async function adtCampaignRateMap'), src.indexOf('/* ---- Entire Live Listings')); return /catch \(e\) \{/.test(m) && (m.match(/SELECT account, campaign_id, name, status, funding_model/g) || []).length === 2; })(), null);

  /* (3) Potential CPC: each of the three conditions failing on its own */
  const pcR = F.adPotentialRules({});
  t('potential: the two figures default to the owner’s own, and a manager’s own are used where he has set them', pcR.min_orders === 15 && pcR.quiet_days === 3 && F.adPotentialRules({ adtool_potential_min_orders: '8', adtool_potential_quiet_days: '7' }).min_orders === 8 && F.adPotentialRules({ adtool_potential_min_orders: '8', adtool_potential_quiet_days: '7' }).quiet_days === 7, [pcR, F.adPotentialRules({ adtool_potential_min_orders: '8', adtool_potential_quiet_days: '7' })]);
  const pcPass = { orders_completed: 20, sold_qty: 3, on_cpc: false, cpc_in_quiet_window: false, last_cpc_day: null };
  const pcWith = x => F.adPotentialCpc(Object.assign({}, pcPass, x), pcR);
  t('potential: all three hold, so it is on the list with advice and nothing against it', (() => { const v = pcWith({}); return v.eligible && v.fails.length === 0 && /no click fee on record/.test(v.advice) && v.orders_completed === 20; })(), pcWith({}));
  t('potential: too few sales on its own keeps it off, and that is the only reason given', (() => { const v = pcWith({ orders_completed: 14, sold_qty: 0 }); return !v.eligible && v.fails.length === 1 && /fewer than the 15/.test(v.why) && v.advice === ''; })(), pcWith({ orders_completed: 14, sold_qty: 0 }));
  t('potential: being on pay-per-click already on its own keeps it off', (() => { const v = pcWith({ on_cpc: true }); return !v.eligible && v.fails.length === 1 && /already/.test(v.why); })(), pcWith({ on_cpc: true }));
  t('potential: pay-per-click inside the quiet days on its own keeps it off, so this afternoon cannot undo this morning', (() => { const v = pcWith({ cpc_in_quiet_window: true, last_cpc_day: '2026-10-27' }); return !v.eligible && v.fails.length === 1 && /inside the last 3 day/.test(v.why); })(), pcWith({ cpc_in_quiet_window: true, last_cpc_day: '2026-10-27' }));
  t('potential: all three failing at once gives all three reasons', pcWith({ orders_completed: 1, sold_qty: 0, on_cpc: true, cpc_in_quiet_window: true }).fails.length === 3, pcWith({ orders_completed: 1, sold_qty: 0, on_cpc: true, cpc_in_quiet_window: true }).fails);
  t('potential: the sale count is the higher of our own and eBay’s, and the answer names which', pcWith({ orders_completed: 12, sold_qty: 19 }).orders_completed === 19 && /eBay/.test(pcWith({ orders_completed: 12, sold_qty: 19 }).orders_source) && /our own/.test(pcWith({ orders_completed: 19, sold_qty: 12 }).orders_source) && /agrees/.test(pcWith({ orders_completed: 19, sold_qty: 19 }).orders_source), [pcWith({ orders_completed: 12, sold_qty: 19 }).orders_source, pcWith({ orders_completed: 19, sold_qty: 12 }).orders_source, pcWith({ orders_completed: 19, sold_qty: 19 }).orders_source]);
  t('potential: a listing advertised before says when, and one with no day on record never claims it was never advertised', (() => {
    /* the click fees are a rolling record a fortnight deep. "Never advertised on pay-per-click" is a
       claim about the listing; the record can only support a claim about itself, so the sentence says
       there is no click fee ON RECORD, and names the oldest day the record reaches where it knows it. */
    const was = pcWith({ last_cpc_day: '2026-09-01' }).advice;
    const none = pcWith({ last_cpc_day: null }).advice;
    const dated = pcWith({ last_cpc_day: null, records_from: '2026-10-15' });
    return /last advertised on 2026-09-01/.test(was) && /no click fee on record/.test(none) && !/never advertised/.test(none)
      && /no click fee on record since 2026-10-15/.test(dated.advice) && dated.records_from === '2026-10-15'
      && dated.last_cpc_seen === 'no click fee on record since 2026-10-15'
      && pcWith({ last_cpc_day: '2026-09-01' }).last_cpc_seen === 'the day eBay charged a click fee';
  })(), [pcWith({ last_cpc_day: null }).advice, pcWith({ last_cpc_day: null, records_from: '2026-10-15' }).advice]);
  t('potential: the figures in the sentence come from the rules in force, never from a number written into the code', /fewer than the 8/.test(F.adPotentialCpc({ orders_completed: 2, sold_qty: 0 }, { min_orders: 8, quiet_days: 7 }).why) && /last 7 day/.test(F.adPotentialCpc({ orders_completed: 20, sold_qty: 0, cpc_in_quiet_window: true }, { min_orders: 8, quiet_days: 7 }).why), null);
  t('potential: the four counts are a partition, so a listing is in exactly one of them and the four add back up', (() => {
    /* they were counted independently and a listing already on pay-per-click with too few orders was
       counted twice, so the four could total more than the listings they came from. */
    const cases = [
      [{ on_cpc: true, ran_recently: true, orders_completed: 1 }, 'already_on_cpc'],
      [{ on_cpc: false, ran_recently: true, orders_completed: 1 }, 'ran_recently'],
      [{ on_cpc: false, ran_recently: false, orders_completed: 14 }, 'too_few_orders'],
      [{ on_cpc: false, ran_recently: false, orders_completed: 15 }, 'eligible'],
    ];
    if (!cases.every(c => F.adPotentialBucket(c[0], pcR) === c[1])) return false;
    if (F.ADTOOL_POTENTIAL_BUCKETS.join(',') !== 'already_on_cpc,ran_recently,too_few_orders,eligible') return false;
    const tally = {}; for (const k of F.ADTOOL_POTENTIAL_BUCKETS) tally[k] = 0;
    const n = 53; for (let i = 0; i < n; i++) tally[F.adPotentialBucket(cases[i % cases.length][0], pcR)]++;
    const total = F.ADTOOL_POTENTIAL_BUCKETS.reduce((a, k) => a + tally[k], 0);
    /* and the bucket agrees with the verdict: eligible there means eligible here, never both or neither */
    const agree = cases.every(c => (F.adPotentialBucket(c[0], pcR) === 'eligible') === F.adPotentialCpc({ orders_completed: c[0].orders_completed, sold_qty: 0, on_cpc: c[0].on_cpc, cpc_in_quiet_window: c[0].ran_recently }, pcR).eligible);
    return total === n && agree;
  })(), null);
  t('potential: the page really counts through the one bucket decision, and keeps no tally of its own beside it (regex over the real source)', (() => {
    const b = src.slice(src.indexOf('async function adtoolPotentialCpcCompute'), src.indexOf('/* ---- Peak hours: the system switches'));
    return /counts\[adPotentialBucket\(v, rules\)\]\+\+;/.test(b) && !/counts\.too_few_orders\+\+/.test(b) && !/counts\.already_on_cpc\+\+/.test(b) && !/counts\.ran_recently\+\+/.test(b) && !/counts\.eligible\+\+/.test(b);
  })(), null);
  t('potential: the manager’s own figure moves the partition with it, so nothing is counted against a number written into the code', F.adPotentialBucket({ orders_completed: 9 }, { min_orders: 8, quiet_days: 3 }) === 'eligible' && F.adPotentialBucket({ orders_completed: 9 }, { min_orders: 15, quiet_days: 3 }) === 'too_few_orders', null);
  t('potential: the quiet window is counted in calendar days INCLUDING today, so three days reaches back to the day before yesterday (regex over the real source)', /const quietFrom = adtAddDays\(today, -\(rules\.quiet_days - 1\)\);/.test(src) && !/const quietFrom = adtAddDays\(today, -rules\.quiet_days\);/.test(src) && F.adtAddDays('2026-10-29', -(3 - 1)) === '2026-10-27', null);
  t('potential: the click-fee read sits on the ACTIVE listings, so its ceiling is above the universe and not inside it (regex over the real source)', (() => {
    const b = src.slice(src.indexOf('async function adtoolPotentialCpcCompute'), src.indexOf('/* ---- Peak hours: the system switches'));
    return /FROM ads_daily ad JOIN items_api ia ON ia\.item_id = ad\.item_id WHERE ad\.cpc_spend > 0 AND ad\.date >= \?1 AND ia\.status = 'ACTIVE'/.test(b)
      && /last_cpc_capped: lastCpcCapped/.test(b) && /lastCpcRows\.length >= ADTOOL_LIVE_SPLIT_UNIVERSE_CAP/.test(b)
      && /SELECT MIN\(date\) AS d FROM ads_daily WHERE cpc_spend > 0 LIMIT 1/.test(b) && /records_from: recordsFrom/.test(b);
  })(), null);
  t('potential: the completed orders read leaves out cancelled, lost and refunded orders, and counts one row as one sale', /o\.status NOT IN \('CANCELLED', 'NOT_FOUND'\) AND COALESCE\(o\.refunded, 0\) <= 0/.test(src) && /SELECT o\.item_id, COUNT\(\*\) AS n FROM orders o JOIN items_api i/.test(src), null);

  /* (4) the hours format */
  const hp = F.adPeakHoursParse('17-23');
  t('hours: 17-23 is on at 17:00 and off at 23:00, so hour 22 is inside it and 23 is not', JSON.stringify(hp.ranges) === JSON.stringify([[17, 23]]) && F.adInPeakRanges(17, hp.ranges) && F.adInPeakRanges(22, hp.ranges) && !F.adInPeakRanges(23, hp.ranges) && !F.adInPeakRanges(16, hp.ranges), hp);
  t('hours: two stretches in one day are read as two', JSON.stringify(F.adPeakHoursParse('09-13,18-22').ranges) === JSON.stringify([[9, 13], [18, 22]]), F.adPeakHoursParse('09-13,18-22'));
  t('hours: a stretch across midnight stays one stretch and reads correctly either side of it', (() => { const p2 = F.adPeakHoursParse('22-02'); return JSON.stringify(p2.ranges) === JSON.stringify([[22, 2]]) && F.adInPeakRanges(23, p2.ranges) && F.adInPeakRanges(0, p2.ranges) && F.adInPeakRanges(1, p2.ranges) && !F.adInPeakRanges(2, p2.ranges) && !F.adInPeakRanges(21, p2.ranges); })(), F.adPeakHoursParse('22-02'));
  t('hours: overlapping and touching stretches are joined, so one boundary can only ever be switched once', JSON.stringify(F.adPeakHoursParse('09-13,11-15').ranges) === JSON.stringify([[9, 15]]) && JSON.stringify(F.adPeakHoursParse('09-13,13-15').ranges) === JSON.stringify([[9, 15]]) && JSON.stringify(F.adPeakHoursParse('18-22,09-13').ranges) === JSON.stringify([[9, 13], [18, 22]]), [F.adPeakHoursParse('09-13,11-15').ranges, F.adPeakHoursParse('09-13,13-15').ranges]);
  t('hours: text that is not hours is refused with a reason, instead of stored and silently never acted on', ['evenings', '17', '17-', 'a-b', '25-30', '17-17', '', '   '].every(x => F.adPeakHoursParse(x).ranges === null && F.adPeakHoursParse(x).reason), ['evenings', '25-30', '17-17', ''].map(x => [x, F.adPeakHoursParse(x).reason]));
  t('hours: every hour of the day is refused, because there is no boundary left to switch at', F.adPeakHoursParse('00-12,12-00').ranges === null && /every hour of the day/.test(F.adPeakHoursParse('00-12,12-00').reason), F.adPeakHoursParse('00-12,12-00').reason);
  t('hours: more than six stretches in a day is refused', F.adPeakHoursParse('01-02,03-04,05-06,07-08,09-10,11-12,13-14').ranges === null, F.adPeakHoursParse('01-02,03-04,05-06,07-08,09-10,11-12,13-14').reason);
  t('hours: they are written back in the form they were read as, so the page and the switch cannot disagree', F.adPeakHoursText(F.adPeakHoursParse('9-13, 18-22').ranges) === '09-13,18-22' && F.adPeakHoursText(F.adPeakHoursParse('22-02').ranges) === '22-02', F.adPeakHoursText(F.adPeakHoursParse('9-13, 18-22').ranges));
  t('hours: what happens next is said in plain words, from either side of either boundary', F.adPeakNextChange(hp.ranges, 10) === 'on at 17:00' && F.adPeakNextChange(hp.ranges, 18) === 'off at 23:00' && F.adPeakNextChange(hp.ranges, 22) === 'off at 23:00' && F.adPeakNextChange(hp.ranges, 23) === 'on at 17:00', [F.adPeakNextChange(hp.ranges, 10), F.adPeakNextChange(hp.ranges, 18), F.adPeakNextChange(hp.ranges, 23)]);
  t('hours: the help line says what the second number means, because nobody guesses that right', /on at 17:00 and off at 22:00/.test(F.ADTOOL_PEAK_HOURS_HELP) && /midnight/.test(F.ADTOOL_PEAK_HOURS_HELP), F.ADTOOL_PEAK_HOURS_HELP);
  t('hours: text that cannot be read is refused as it is typed, with the reason and the help beside it', (() => { const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {')); return /adPeakHoursParse\(hours\)/.test(a) && /throw new Error\('SAY: ' \+ parsed\.reason/.test(a) && /ADTOOL_PEAK_HOURS_HELP/.test(a) && /adPeakHoursText\(parsed\.ranges\)/.test(a) && /const auto = \(!parsed\.ranges \|\|/.test(a); })(), null);
  t('hours: a work-list row with no hours at all is still allowed, and stored with its switching off rather than looking armed', (() => { const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {')); return /const auto = \(!parsed\.ranges/.test(a) && !/give the hours this listing should run/.test(a) && F.adPeakHoursParse('').ranges === null; })(), null);

  /* (5) the peak switch, and the one thing that decides whether anything leaves the worker */
  const pkBase = { auto: 1, ranges: hp.ranges, live_cpc_ad: true, account_live_switch: true, account_switches_today: 0 };
  const pkAt = (hour, believed, extra) => F.adPeakSwitchDecide(Object.assign({}, pkBase, { hour: hour, believed_state: believed }, extra || {}));
  t('peak switch: on the hour the peak starts, a paused ad is sent back to running', pkAt(17, 'PAUSED').send === 'ACTIVE' && pkAt(17, 'PAUSED').mode === 'live', pkAt(17, 'PAUSED'));
  t('peak switch: on the hour the peak ends, a running ad is paused', pkAt(23, 'ACTIVE').send === 'PAUSED' && pkAt(23, 'ACTIVE').mode === 'live', pkAt(23, 'ACTIVE'));
  t('peak switch: the hour before the start and the last hour inside both change nothing', pkAt(16, 'PAUSED').send === null && pkAt(22, 'ACTIVE').send === null, [pkAt(16, 'PAUSED'), pkAt(22, 'ACTIVE')]);
  t('peak switch: an ad already in the right state is left alone, which is what keeps one boundary to one instruction', pkAt(18, 'ACTIVE').send === null && /already running/.test(pkAt(18, 'ACTIVE').why) && pkAt(3, 'PAUSED').send === null && /already paused/.test(pkAt(3, 'PAUSED').why), [pkAt(18, 'ACTIVE'), pkAt(3, 'PAUSED')]);
  t('peak switch: switching turned off for the listing, no hours, and no ad to switch each stop it on their own', pkAt(17, 'PAUSED', { auto: 0 }).send === null && pkAt(17, 'PAUSED', { ranges: [] }).send === null && pkAt(17, 'PAUSED', { live_cpc_ad: false }).send === null, [pkAt(17, 'PAUSED', { auto: 0 }).why, pkAt(17, 'PAUSED', { ranges: [] }).why, pkAt(17, 'PAUSED', { live_cpc_ad: false }).why]);
  t('peak switch: with the account’s own switch OFF, every change at every hour of the day is written down and never sent', (() => {
    for (let h = 0; h < 24; h++) {
      const want = F.adInPeakRanges(h, hp.ranges) ? 'ACTIVE' : 'PAUSED';
      const d = F.adPeakSwitchDecide(Object.assign({}, pkBase, { hour: h, believed_state: want === 'ACTIVE' ? 'PAUSED' : 'ACTIVE', account_live_switch: false }));
      if (d.send !== want || d.mode !== 'would-send' || !/live switch is off/.test(d.why)) return false;
    }
    return true;
  })(), null);
  t('peak switch: with the switch ON the same changes go live, so the account’s switch is the only thing that decides', (() => {
    for (let h = 0; h < 24; h++) {
      const want = F.adInPeakRanges(h, hp.ranges) ? 'ACTIVE' : 'PAUSED';
      const d = F.adPeakSwitchDecide(Object.assign({}, pkBase, { hour: h, believed_state: want === 'ACTIVE' ? 'PAUSED' : 'ACTIVE', account_live_switch: true }));
      if (d.send !== want || d.mode !== 'live') return false;
    }
    return true;
  })(), null);
  t('peak switch: the daily ceiling holds a change back and says so, and nothing is marked live', (() => { const d = pkAt(17, 'PAUSED', { account_switches_today: F.ADTOOL_PEAK_SWITCH_CAP }); return d.send === 'ACTIVE' && d.mode === 'blocked' && /already had/.test(d.why); })(), pkAt(17, 'PAUSED', { account_switches_today: 20 }));
  t('peak caps: twenty a day for an account, and the morning job’s quiet hours are deliberately not one of the rules here', F.adPeakApplyCaps({ account_switches_today: 19 }).allowed === true && F.adPeakApplyCaps({ account_switches_today: 20 }).allowed === false && F.ADTOOL_PEAK_SWITCH_CAP === 20 && F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 23).allowed === false && F.adPeakApplyCaps({ account_switches_today: 0 }).allowed === true, [F.adPeakApplyCaps({ account_switches_today: 20 }), F.adtApplyCaps({ account_actions_today: 0, listing_bid_changes_week: 0 }, 'status', 23)]);
  t('peak switch: what the ad is doing now comes from whichever of eBay’s reading and our own record is the newer', (() => {
    const rows = [{ ad_status: 'PAUSED', ad_synced_at: '2026-10-28 10:00:00' }];
    const older = F.adtPeakBelieved(rows, { to: 'ACTIVE', at: '2026-10-28 09:00:00' });
    const newer = F.adtPeakBelieved(rows, { to: 'ACTIVE', at: '2026-10-28 10:30:00' });
    const none = F.adtPeakBelieved(rows, null);
    const unstamped = F.adtPeakBelieved([{ ad_status: '', ad_synced_at: '2026-10-28 10:00:00' }], null);
    return older.state === 'PAUSED' && /eBay/.test(older.from) && newer.state === 'ACTIVE' && /own record/.test(newer.from) && none.state === 'PAUSED' && unstamped.state === 'ACTIVE';
  })(), null);
  t('peak switch: the ad it switches is one that CAN be switched, paused ones included, because the shared live rule would never let it turn one back on', (() => { const q = src.slice(src.indexOf('const ADTOOL_PEAK_SWITCHABLE_SQL'), src.indexOf('const ADTOOL_PEAK_MANUAL_CAP')); return /COALESCE\(ca\.ad_status, ''\) <> 'ARCHIVED'/.test(q) && /c\.funding_model = 'COST_PER_CLICK'/.test(q) && /ia\.status = 'ACTIVE'/.test(q) && !/ca\.ad_status = 'ACTIVE'/.test(q); })(), null);
  t('peak switch: the job holds exactly one request, inside the live branch, through the endpoint table rather than a URL of its own', (() => {
    const j = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));
    if (!j || (j.match(/await fetch\(/g) || []).length !== 1) return false;
    const gate = j.indexOf("if (mode === 'live') {"), req = j.indexOf('await fetch(');
    /* nothing stands between the live branch and the request but the cap counter, the try and the
       token: measured in CODE, not characters, so the prose between them can be as long as it needs
       to be. Anything else appearing there would be a second decision taken after the gate. */
    const between = j.slice(gate + "if (mode === 'live') {".length, req).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    const allowed = /^doneToday\[macct\] = \(doneToday\[macct\] \|\| 0\) \+ 1; try \{ const tok = await ebayAccessToken\(env, macct\); const r =$/.test(between);
    /* and `mode` can only BE 'live' where the pure answer said so and the account's own ceiling still allows it */
    return gate > 0 && req > gate && allowed && /const mode = d\.mode === 'live' && !cap\.allowed \? 'blocked' : d\.mode;/.test(j) && /ADTOOL_APPLY_ENDPOINTS\.bulk_status_by_listing/.test(j) && !/api\.ebay\.com/.test(j);
  })(), null);
  t('peak switch: the account’s switch is read from the one place the morning apply job reads it', (() => { const j = src.slice(src.indexOf('async function adtPeakLiveSwitches(env) {'), src.indexOf('async function adtPeakLastSwitch')); return /portal_config WHERE key LIKE 'adtool_apply_live_%'/.test(j) && /String\(r\.value\) === 'on'/.test(j); })(), null);
  t('peak switch: a change a daily ceiling held back is owed and tried again, and so is one eBay never answered or answered 5xx; a 4xx refusal is kept as eBay\'s last word instead', /\(mode = 'would-send' OR \(mode = 'live' AND \(\(http_status >= 200 AND http_status < 300\) OR \(http_status >= 400 AND http_status < 500 AND http_status <> 429\)\)\)\)/.test(src) && !/mode = 'blocked'/.test(src.slice(src.indexOf('async function adtPeakLastSwitch'), src.indexOf('async function adtoolPeakSwitch'))), null);
  t('peak switch: its rows keep the operation name the change pages read, so a switch is never read as somebody changing it on eBay', (() => { const j = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {')); return /decision_id, op, payload_json, mode, http_status, response, undo_json, at\) VALUES \(\?1, \?2, \?3, \?4, 'peak', 'status'/.test(j) && /if \(String\(r\.op \|\| ''\) !== 'status'\) continue;/.test(src); })(), null);
  t('peak switch: every row carries the undo that puts the ad back, which is what the undo button sends', (() => { const j = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {')); return /undo: \{ op: 'status', campaign_id: cid, listing_id: id, to: d\.send === 'ACTIVE' \? 'PAUSED' : 'ACTIVE' \}/.test(j); })(), null);
  t('peak switch: the job follows the page it belongs to, so switching the page off stops it deciding anything at all', (() => { const j = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {')); return /adtFlag\(env, 'adtool_page_peak'\)\) !== 'on'\) return;/.test(j); })(), null);
  t('peak switch: it has an invocation of its OWN, one minute after each quarter hour, and shares a subrequest budget with nothing (regex over the real source)', (() => {
    /* riding first in the twelve-job quarter-hour slot was not enough: every job in a slot shares one
       invocation's budget, and the one job here that writes to eBay cannot be the one that starves. */
    const own = /'1-59\/15 \* \* \* \*': \[adtoolPeakSwitch\],/.test(src);
    const gone = !/'\*\/15 \* \* \* \*': \[adtoolPeakSwitch/.test(src);
    const i = src.indexOf("'*/15 * * * *': [");
    const slot = src.slice(i, src.indexOf('\n', i));
    return own && gone && !/adtoolPeakSwitch/.test(slot) && (src.match(/adtoolPeakSwitch\]/g) || []).length === 1;
  })(), null);
  /* 3 Nov, the owner read "off, so nothing is sent" beside a listing that was running on eBay and took it
     to mean the ad was off. The chip is about the ACCOUNT's live-apply switch; the ad's own state is a
     different fact and now sits beside it, and a change that was only written down may never be reported
     in the past tense. */
  t('peak page: the live-apply chip names the switch, not the ad, and the ad\'s own state is printed beside it', (() => {
    const v = readFile('frontend/view-adtool-peak.js');
    const chip = /'live apply is off: the hours are written down only'/.test(v) && /'live apply is on: the hours are sent to eBay'/.test(v) &&
      !/'off, so nothing is sent'/.test(v) && !/'on, so changes are sent'/.test(v);
    const state = /function adStateLine\(r\) \{/.test(v) && /its ad is running on eBay now/.test(v) && /its ad is not running on eBay now/.test(v) &&
      (v.match(/adStateLine\(r\)/g) || []).length >= 3;
    return chip && state;
  })(), null);
  t('peak page: a change that was only written down is never reported as having happened', (() => {
    const v = readFile('frontend/view-adtool-peak.js');
    return /var done = mode === 'live';/.test(v) && /would have switched on/.test(v) && /would have switched off/.test(v) &&
      /the system writes it down/.test(v);
  })(), null);
  t('peak page: every by-hand row says what its hours were read as, what happens next, what the system last did, and whether that account is switched on', (() => { const m = (() => { const a = src.indexOf('const manual = manualRows.map(r => {'); return src.slice(a, src.indexOf('const allAccounts =', a)); })(); return /hours_parsed: parsed\.ranges/.test(m) && /next_change: parsed\.ranges \? adPeakNextChange/.test(m) && /last_switch: ls \? \{ at: ls\.at, to: ls\.to, mode: ls\.mode, http_status: ls\.http_status \|\| 0, refused: !!ls\.refused \} : null/.test(m) && /live_switch_on: !!liveSwitch\[a\]/.test(m) && /auto: auto/.test(m); })(), null);
  t('peak page: the line promising nothing on the page reaches eBay is gone, because it stopped being true', !/never a timer: eBay cannot run an ad by the hour, so nothing here is sent to eBay/.test(src) && /the system switches these on at the start of their hours/.test(src), null);


  /* ─── the review's findings on the one path to eBay, each held by the thing that was wrong ─── */
  const pkJob = () => src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));

  t('peak switch: the added column is born 0, so a row typed before switching existed is never armed by the deploy that added it (regex over the real source)', (() => {
    /* DEFAULT 1 would have armed every free-text row on the list the moment this landed, on an
       account whose live switch is already on. An existing row cannot consent to being automated. */
    const alter = /ALTER TABLE adtool_peak_items ADD COLUMN auto INTEGER DEFAULT 0/.test(src) && !/ADD COLUMN auto INTEGER DEFAULT 1/.test(src);
    const insert = /INSERT INTO adtool_peak_items \(account, item_id, hours, note, added_by, added_at, removed_by, removed_at, auto\)/.test(src);
    const read = /COALESCE\(auto, 0\) = 1/.test(src) && !/COALESCE\(auto, 1\) = 1/.test(src);
    const fallback = /const auto = Number\(row\.auto == null \? 0 : row\.auto\) \? 1 : 0;/.test(pkJob());
    return alter && insert && read && fallback;
  })(), null);

  t('peak switch: a new row with readable hours is still born armed, and one with no hours is born off', (() => {
    const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {'));
    return /const auto = \(!parsed\.ranges \|\| \(p && p\.auto === false\) \|\| \(p && p\.auto === 0\)\) \? 0 : 1;/.test(a) && /, auto = \?6/.test(a);
  })(), null);

  t('peak switch: the sending has a stop button of its own and the job needs BOTH it and the page flag (regex over the real source)', (() => {
    const j = pkJob();
    return /adtFlag\(env, 'adtool_page_peak'\)\) !== 'on'\) return;/.test(j) && /adtFlag\(env, 'adtool_job_peakswitch'\)\) !== 'on'\) return;/.test(j)
      && /for \(const key of \['adtool_page_changes', 'adtool_page_peak', 'adtool_job_peakswitch'\]\)/.test(src);
  })(), null);

  t('peak switch: the seed comment no longer promises that nothing on the peak page reaches eBay, because one account is switched on', !/the peak page writes nothing but its own\s*\n\s*by-hand list, and nothing on it reaches eBay/.test(src) && /is SWITCHED by a job/.test(src), null);

  t('peak switch: the token and the switch test come off the AD’s own account, never the one typed on the list (regex over the real source)', (() => {
    /* the switchable read joins on the listing id alone, so a row can come back for another account.
       Gating on the typed account would mint a token for the wrong account and send a change to an
       account nobody switched on. */
    const j = pkJob();
    const mint = /const tok = await ebayAccessToken\(env, macct\);/.test(j) && !/ebayAccessToken\(env, acct\)/.test(j);
    const gate = /const on = !!switches\[macct\];/.test(j) && !/account_live_switch: !!switches\[acct\]/.test(j);
    const cap = /adPeakApplyCaps\(\{ account_switches_today: doneToday\[macct\] \|\| 0 \}\)/.test(j) && !/doneToday\[acct\]/.test(j);
    return mint && gate && cap;
  })(), null);

  t('peak switch: where the list and the ad name different accounts, a blocked row says which two and nothing is sent (regex over the real source)', (() => {
    const j = pkJob();
    const i = j.indexOf('if (!macct || macct !== acct) {'), f = j.indexOf('await fetch(');
    return i > 0 && f > i && /'blocked', 0, \?6, '', datetime\('now'\)/.test(j) && /the peak list holds this listing under/.test(j) && /and the ad belongs to/.test(j) && /continue;/.test(j.slice(i, f));
  })(), null);

  t('peak switch: a standing account mismatch is written down once a day, not once a quarter hour (regex over the real source)', (() => {
    /* it is a data fault that does not pass on its own, so the same blocked row every tick would bury
       a day's real work under ninety-six copies of one complaint. A row a CAP held back is not
       deduplicated: that change is still owed and is owed again on the next tick. */
    const j = pkJob();
    return /SELECT item_id, campaign_id FROM adtool_apply_log WHERE decision_id = 'peak' AND mode = 'blocked' AND day = \?1 LIMIT 2000/.test(j)
      && /if \(blockedToday\[id \+ '\|' \+ cid\]\) continue;/.test(j) && /blockedToday\[id \+ '\|' \+ cid\] = 1;/.test(j);
  })(), null);
  t('peak switch: an account whose switch is OFF is compared with its OWN shadow timeline, so one state change is one row and not one per ad rotation (regex over the real source)', (() => {
    /* nothing is ever sent for that account, so eBay's reading can never move; comparing against it
       wrote the same would-send row every quarter hour for ever. */
    const j = pkJob();
    return /const believed = on \? adtPeakBelieved\(camp, hist\.live\)\.state : \(hist\.shadow \? hist\.shadow\.to : ''\);/.test(j);
  })(), null);

  t('peak switch: told its own last would-send, the decision is to send nothing, which is what stops the churn', (() => {
    /* the pure half of the rule above: believed == wanted, so nothing leaves and no row is written. */
    const ranges = F.adPeakHoursParse('17-23').ranges;
    const base = { auto: 1, ranges: ranges, live_cpc_ad: true, account_live_switch: false, account_switches_today: 0 };
    const again = F.adPeakSwitchDecide(Object.assign({}, base, { hour: 18, believed_state: 'ACTIVE' }));
    const first = F.adPeakSwitchDecide(Object.assign({}, base, { hour: 18, believed_state: '' }));
    const flipped = F.adPeakSwitchDecide(Object.assign({}, base, { hour: 23, believed_state: 'ACTIVE' }));
    return again.send === null && first.send === 'ACTIVE' && first.mode === 'would-send' && flipped.send === 'PAUSED' && flipped.mode === 'would-send';
  })(), null);

  t('peak switch: the last-switch read takes the NEWEST rows, not the oldest two thousand (regex over the real source)', (() => {
    /* ORDER BY id ASC LIMIT 2000 returns the oldest rows once the window passes two thousand, so on a
       busy day the job believed nothing had happened and sent every boundary again. */
    const m = src.slice(src.indexOf('async function adtPeakLastSwitch'), src.indexOf('async function adtoolPeakSwitch'));
    return /ORDER BY id DESC LIMIT 2000/.test(m) && !/ORDER BY id ASC LIMIT 2000/.test(m) && /if \(!slot\.newest\) slot\.newest = rec;/.test(m);
  })(), null);

  t('peak switch: the record is kept per listing AND campaign, because one send is one campaign (regex over the real source)', (() => {
    const m = src.slice(src.indexOf('async function adtPeakLastSwitch'), src.indexOf('async function adtoolPeakSwitch'));
    const keyed = /SELECT item_id, campaign_id, payload_json, mode, http_status, at FROM adtool_apply_log/.test(m) && /byKey\[item \+ '\|' \+ cid\]/.test(m);
    const used = /last\.by_key\[id \+ '\|' \+ cid\]/.test(pkJob());
    /* and the page reads the per-listing half of the same one pass, never a second read */
    const page = /lastSwitch\.by_item\[id\]/.test(src) && /lastSwitch\.by_key\[id \+ '\|' \+ cid\]/.test(src);
    return keyed && used && page;
  })(), null);

  t('peak switch: a campaign eBay refused is owed and tried again, and one it accepted is not (regex over the real source)', (() => {
    /* a non-2xx live row never enters the map, so the believed state falls back to eBay's own reading
       and the change is still owed; an accepted one is in the map and the next tick finds it done. */
    const m = src.slice(src.indexOf('async function adtPeakLastSwitch'), src.indexOf('async function adtoolPeakSwitch'));
    const only2xx = /\(mode = 'would-send' OR \(mode = 'live' AND \(\(http_status >= 200 AND http_status < 300\) OR \(http_status >= 400 AND http_status < 500 AND http_status <> 429\)\)\)\)/.test(m) && /if \(!slot\.live && rec\.mode === 'live' && !rec\.refused\) slot\.live = rec;/.test(m);
    const believed = F.adtPeakBelieved([{ ad_status: 'PAUSED', ad_synced_at: '2026-10-28 17:05:00' }], null);
    const accepted = F.adtPeakBelieved([{ ad_status: 'PAUSED', ad_synced_at: '2026-10-28 17:05:00' }], { to: 'ACTIVE', at: '2026-10-28 17:10:00' });
    return only2xx && believed.state === 'PAUSED' && accepted.state === 'ACTIVE';
  })(), null);

  t('peak switch: a LIVE row is written the moment its send comes back, so a cut-short invocation can never leave a change without its log row (regex over the real source)', (() => {
    const j = pkJob();
    const f = j.indexOf('await fetch('), w = j.indexOf("if (mode === 'live') { await logRow.run(); written++; } else { stmts.push(logRow); }");
    return f > 0 && w > f && /await adtBatch\(env, stmts\); written \+= stmts\.length;/.test(j) && !/written = stmts\.length;/.test(j);
  })(), null);

  t('peak switch: the morning apply’s thirty a day never counts a peak switch, and the peak’s twenty never counts a morning one (regex over the real source)', (() => {
    /* one shared allowance meant an evening of boundaries could spend the morning run's whole day
       before it woke up, and the morning would then apply nothing without a word about why. */
    const a = src.slice(src.indexOf('async function adtoolApply(env) {'), src.indexOf('const ADTOOL_ACTIONS_P8'));
    const morning = /WHERE day = \?1 AND mode = 'live' AND COALESCE\(decision_id, ''\) <> 'peak' GROUP BY account/.test(a);
    const peak = /WHERE decision_id = 'peak' AND mode = 'live' AND day = \?1 GROUP BY account/.test(pkJob());
    const caps = /per_account_per_day: 30, bid_changes_per_listing_per_week: 3[^}]*peak_switches_per_account_per_day: ADTOOL_PEAK_SWITCH_CAP/.test(src);
    return morning && peak && caps && !/counts over EVERY live row including these/.test(src);
  })(), null);

  t('peak switch: undoing one turns its switching OFF too, or the next tick sends the very change somebody undid (regex over the real source)', (() => {
    const u = src.slice(src.indexOf("if (p && p.op === 'undo') {"), src.indexOf('const today = ukDate(\'\');', src.indexOf("if (p && p.op === 'undo') {")));
    return /String\(row\.decision_id \|\| ''\) === 'peak'/.test(u) && /UPDATE adtool_peak_items SET auto = 0 WHERE item_id = \?1/.test(u) && /peak_disarmed: peakDisarmed/.test(u) && u.indexOf('peakDisarmed = true') < u.indexOf('peak_disarmed: peakDisarmed');
  })(), null);

  t('apply log: the two senders have a table each and a tally each, so neither ever carries the other’s rows (regex over the real source)', (() => {
    const b = src.slice(src.indexOf('adtoolApplyPage: {'), src.indexOf('/* ADTOOL-P8-END'));
    const split = /WHERE COALESCE\(decision_id, ''\) <> 'peak' ORDER BY id DESC LIMIT 200/.test(b) && /WHERE COALESCE\(decision_id, ''\) = 'peak' ORDER BY id DESC LIMIT 100/.test(b);
    const tallies = /AND COALESCE\(decision_id, ''\) <> 'peak' GROUP BY mode/.test(b) && /AND COALESCE\(decision_id, ''\) = 'peak' GROUP BY mode/.test(b);
    const shape = /peak_log: logRows\(peakLog\)/.test(b) && /peak_counts_today: pc/.test(b) && /const pc = \{ live: 0, would_send: 0, blocked: 0 \};/.test(b);
    return split && tallies && shape;
  })(), null);

  t('apply log: the note gives the quiet hours to the two runs alone, in a finished sentence', (() => {
    const b = src.slice(src.indexOf('adtoolApplyPage: {'), src.indexOf('/* ADTOOL-P8-END'));
    return /The quiet hours belong to the morning and evening runs alone;/.test(b) && !/the morning and evening runs’;/.test(b) && /keeps a daily ceiling of its own that this one never counts against/.test(b);
  })(), null);

  t('peak page: a row on an account already at its daily ceiling says blocked, instead of claiming the change is about to go (regex over the real source)', (() => {
    /* the page passed nought switches today whatever the account had really had, so a row the job
       would have held back read as one about to be sent. */
    const ma = src.indexOf('const manual = manualRows.map(r => {');
    const b = src.slice(ma, src.indexOf('const allAccounts =', ma));
    const real = /account_switches_today: doneA/.test(b) && !/account_switches_today: 0/.test(b) && /const onSw = !!liveSwitch\[a\], doneA = peakDoneToday\[a\] \|\| 0;/.test(b);
    const read = /WHERE decision_id = 'peak' AND mode = 'live' AND day = \?1 GROUP BY account/.test(src.slice(src.indexOf('const peakDoneToday = {};'), src.indexOf('const manual = manualRows.map(r => {')));
    const state = /switch_state: d\.send \? d\.mode : '', switch_to: d\.send \|\| '', switch_note: d\.why,/.test(b);
    /* and the pure answer at the ceiling really is 'blocked', so the field can say it */
    const blocked = F.adPeakSwitchDecide({ auto: 1, ranges: F.adPeakHoursParse('17-23').ranges, hour: 17, live_cpc_ad: true, believed_state: 'PAUSED', account_live_switch: true, account_switches_today: F.ADTOOL_PEAK_SWITCH_CAP }).mode === 'blocked';
    return real && read && state && blocked;
  })(), null);

  t('spend windows: a listing with no day in a window gets no number, because nought is a figure and "no day on record" is not (regex over the real source)', (() => {
    /* a conditional SUM over no rows is 0 in SQL, so every listing with nothing in the window read as
       having spent nothing, which a reader acts on differently. */
    const i = src.indexOf('AS spend_3d, SUM(CASE WHEN day >= ?3 THEN 1 ELSE 0 END) AS days_3d');
    const nulls = /spend_3d: Number\(r\.days_3d\) > 0 \? round2\(Number\(r\.spend_3d\) \|\| 0\) : null,/.test(src)
      && /spend_7d: Number\(r\.days_7d\) > 0 \? round2\(Number\(r\.spend_7d\) \|\| 0\) : null,/.test(src)
      && /spend_14d: Number\(r\.days_14d\) > 0 \? round2\(Number\(r\.spend_14d\) \|\| 0\) : null,/.test(src);
    const none = /\{ spend_3d: null, spend_7d: null, spend_14d: null \}/.test(src) && !/\{ spend_3d: 0, spend_7d: 0, spend_14d: 0 \}/.test(src);
    return i > 0 && nulls && none;
  })(), null);

  t('register: the rows the review rewrote say what is really true, in the house voice', (() => {
    const r = id => rgAll.filter(x => x.id === id)[0] || {};
    const ls = r('LIVE_SPLIT'), dy = r('AD_RATE_DYNAMIC'), lr = r('POTENTIAL_CPC_LAST_RUN'), oo = r('POTENTIAL_CPC_ORDERS'), dt = r('DECISIONS_TODAY');
    return /SEPARATE count of the live listings/.test(ls.formula) && /prepared every hour/.test(ls.recompute)
      && /prepared every hour/.test(r('POTENTIAL_CPC').recompute)
      && /OR when the team/.test(dy.formula) && /does NOT overrule/.test(dy.formula) && /whole funding reply/.test(dy.formula)
      && /as far back as the click-fee record goes/.test(lr.formula) && /no click fee on record/.test(lr.formula) && !/says it has never been advertised that way/.test(lr.formula)
      && /counts ORDERS/.test(oo.formula) && /counts UNITS/.test(oo.formula) && /GREATER/.test(oo.formula)
      && /every account/.test(dt.formula) && /exactly the rows the Decision page lists/.test(dt.formula);
  })(), null);

  /* (6) today by the hour: the orders half of the one chart on the Overview */
  t('today by hour: the hours add up to the same orders and units the four parts of the day do', (() => {
    const stamps = ['2026-10-28T00:10:00Z', '2026-10-28T06:30:00Z', '2026-10-28T06:40:00Z', '2026-10-28T11:05:00Z', '2026-10-28T16:59:00Z', '2026-10-28T22:45:00Z'];
    const qtys = [1, 2, 1, 3, 1, 1];
    const hA = {}, sA = {};
    stamps.forEach((iso, i) => {
      const uk = F.adtUkParts(Date.parse(iso)), q = Math.max(1, qtys[i]);
      const h = (hA[uk.hour] = hA[uk.hour] || { hour_uk: uk.hour, orders: 0, units: 0 }); h.orders++; h.units += q;
      const s2 = (sA[uk.slot] = sA[uk.slot] || { slot: uk.slot, orders: 0, units: 0 }); s2.orders++; s2.units += q;
    });
    const hs = Object.keys(hA).map(k => hA[k]), ss = Object.keys(sA).map(k => sA[k]);
    const add = (l, k) => l.reduce((x, y) => x + y[k], 0);
    return add(hs, 'orders') === stamps.length && add(hs, 'orders') === add(ss, 'orders') && add(hs, 'units') === add(ss, 'units') && add(hs, 'units') === qtys.reduce((a, b) => a + b, 0)
      && hs.length === 5 && ss.length === 4 && hs.every(x => x.hour_uk >= 0 && x.hour_uk <= 23);
  })(), null);
  t('today by hour: both lists come out of ONE read of the orders, so they can never disagree', (() => {
    const a = src.indexOf('const todayOrders = []; const slotAgg = {}; const hourAgg = {};');
    if (a < 0) return false;
    const blk = src.slice(a, a + 1500);
    return (blk.match(/FROM orders WHERE created_at/g) || []).length === 1 && /slotAgg\[uk\.slot\]/.test(blk) && /hourAgg\[uk\.hour\]/.test(blk) && /today_hours: todayHours/.test(src);
  })(), null);

  /* (7) what a listing spent over the last three, seven and fourteen finished days */
  t('spend windows: three, seven and fourteen days are nested and all three end yesterday, so they can never come out of order', (() => {
    const day0 = '2026-10-28', yd = F.adtAddDays(day0, -1);
    const rows = []; for (let i = 0; i < 28; i++) rows.push({ day: F.adtAddDays(day0, -i), spend: (i % 5) + 0.5 });
    const add = from => rows.filter(r => r.day >= from && r.day <= yd).reduce((x, r) => x + r.spend, 0);
    const s3 = add(F.adtAddDays(day0, -3)), s7 = add(F.adtAddDays(day0, -7)), s14 = add(F.adtAddDays(day0, -14));
    return s3 > 0 && s3 <= s7 && s7 <= s14 && rows.filter(r => r.day > yd).length === 1;
  })(), null);
  t('spend windows: the three come out of the aggregate already being read, and not one of them reaches into today', /ROUND\(SUM\(CASE WHEN day >= \?3 THEN spend ELSE 0 END\), 2\) AS spend_3d/.test(src) && /AS spend_7d/.test(src) && /AS spend_14d/.test(src) && /adtAddDays\(today, -28\), yday, adtAddDays\(today, -3\), adtAddDays\(today, -7\), adtAddDays\(today, -14\)/.test(src) && /day >= \?1 AND day <= \?2/.test(src), null);
  t('spend windows: the spend already carries the fee charged on clicks, so the click fee is never added on top of it', !/spend \+ cpc_spend[\s\S]{0,80}AS spend_3d/.test(src) && !/AS spend_3d[\s\S]{0,200}cpc_spend/.test(src), null);

  /* (8) the two new pages: born on, gated before the cache, keyed by profit class */
  /* 31 Oct, §4: Videos joined the same born-on seed, so the list is three and the promise is unchanged. */
  t('flags: all three of these pages are born on, and a switch somebody has already set is left exactly as it stands', (() => { const a = src.indexOf("for (const key of ['adtool_page_livesplit', 'adtool_page_potential', 'adtool_page_videos'])"); return a > 0 && /ON CONFLICT\(key\) DO NOTHING/.test(src.slice(a, a + 400)); })(), null);
  /* 31 Oct, §4: the Videos board joined this block, and §3's hourly panel with it. EVERY route in the
     block is checked rather than a named two, so a route added later cannot slip past the gate order
     by not being on a list here. */
  t('gates: every page in this block refuses by role BEFORE it looks for a cached answer, on the memoised path and on the warm\'s raw path, and the key carries the profit class', (() => {
    const blk = src.slice(src.indexOf('const ADTOOL_ACTIONS_P16 = {'), src.indexOf('/* ADTOOL-P16-END'));
    const names = (blk.match(/\n  (adtool[A-Za-z]+): \{/g) || []).map(s => s.replace(/[^A-Za-z]/g, '').replace(/^n/, ''));
    const ok = names.every(a => { const i = blk.indexOf(a + ': {'); if (i < 0) return false; const b = blk.slice(i, i + 3200); const g = b.indexOf('adtGate(ctx, null)'), f = b.indexOf("adtGate(ctx, 'adtool_page_"); const m = b.indexOf('adtKvMemo('); return g >= 0 && f > g && (m < 0 || m > f); });
    /* the two warmed pages have a second path, raw (the hourly warm's, no memo), and it refuses by role first too */
    const rawOk = ['adtoolLiveSplit', 'adtoolPotentialCpc'].every(a => { const i = blk.indexOf(a + ': {'); const b = blk.slice(i, i + 1800); const r = b.indexOf('raw: async'); const rg = b.indexOf('adtGate(ctx, null)', r), rc = b.indexOf('Compute(ctx.env', r); return r > 0 && rg > r && rc > rg; });
    /* three memoised pages, and a gate on every path: two paths each for the warmed pair, one each for the other two */
    return names.length === 4 && ok && rawOk && (blk.match(/adtProfitClass\(ctx\.user\)/g) || []).length === 3 && (blk.match(/adtGate\(ctx, null\)/g) || []).length === 6;
  })(), null);
  t('routes: both new actions carry the advertising prefix, so the router gates them by role and strips collective profit on the way out', /Object\.assign\(ROUTES, ADTOOL_ACTIONS_P16\)/.test(src) && /adtoolLiveSplit: \{/.test(src) && /adtoolPotentialCpc: \{/.test(src) && /adtoolLiveSplit: 120000, adtoolPotentialCpc: 120000/.test(src), null);
  t('bounds: every read the two new pages make is held to a window or a ceiling', (() => {
    const blk = src.slice(src.indexOf('/* ---- Entire Live Listings'), src.indexOf('/* ---- Peak hours: the system switches'));
    const selects = blk.match(/SELECT [\s\S]{0,600}?'/g) || [];
    return /LIMIT ' \+ ADTOOL_LIVE_SPLIT_UNIVERSE_CAP/.test(blk) && /LIMIT 2000/.test(blk) && /day >= \?1 AND day <= \?2/.test(blk) && selects.length > 0;
  })(), null);
  /* ten rows from 28 Oct: the nine the batch was specified with, plus SUGGESTIONS_WAITING, which the
     Overview prints as a tile of its own and which had stood at a hard nought since the Command
     centre was written. */
  t('register: the new entries name the rule, the sources, when they recompute and how they are rechecked', (() => { const p16 = rgAll.filter(r => r.array === 'ADTOOL_REGISTER_P16'); return p16.length === 26 && p16.some(r => r.id === 'DECISIONS_TODAY') && p16.some(r => r.id === 'PEAK_CAMPAIGN') && !p16.some(r => r.id === 'SUGGESTIONS_WAITING') && ['PEAK_COHORT_LISTINGS', 'PEAK_HOURS_ON_OFF', 'PEAK_SPEND_AVOIDED', 'PEAK_SALES_IN_OUT', 'PEAK_PROFILE', 'PEAK_DEAD_HOURS', 'PEAK_SCHEDULE', 'PEAK_HOLD', 'PEAK_TRACKING', 'VIDEO_COHORT', 'VIDEO_ADDED_ON', 'VIDEO_BEFORE_AFTER', 'VIDEO_VS_NO_VIDEO'].every(k => p16.some(r => r.id === k)) && p16.every(r => r.id && r.name && r.formula && r.sources && r.recompute && r.recheck); })(), rgAll.filter(r => r.array === 'ADTOOL_REGISTER_P16').map(r => r.id));
  t('register: there is an entry for every new number the two pages, the switch and the Overview now show', ['LIVE_SPLIT', 'AD_RATE_DYNAMIC', 'POTENTIAL_CPC', 'POTENTIAL_CPC_ORDERS', 'POTENTIAL_CPC_LAST_RUN', 'PEAK_HOURS_FORMAT', 'PEAK_SWITCH', 'PEAK_CAMPAIGN', 'TODAY_HOURS', 'SPEND_BACK_WINDOWS'].every(id => rgAll.filter(r => r.id === id).length === 1), ['LIVE_SPLIT', 'AD_RATE_DYNAMIC', 'POTENTIAL_CPC', 'POTENTIAL_CPC_ORDERS', 'POTENTIAL_CPC_LAST_RUN', 'PEAK_HOURS_FORMAT', 'PEAK_SWITCH', 'PEAK_CAMPAIGN', 'TODAY_HOURS', 'SPEND_BACK_WINDOWS'].filter(id => rgAll.filter(r => r.id === id).length !== 1));
  t('register: the switch entry says outright that it is sent only for an account whose own switch is on', (() => { const r = rgAll.filter(x => x.id === 'PEAK_SWITCH')[0]; return r && /own live switch is on/.test(r.formula) && /nothing leaves the portal/.test(r.formula); })(), null);
  t('report: yesterday’s report still answers for any day it is asked for, and offers the days it has', /SELECT day, generated_at FROM adtool_reports ORDER BY day DESC LIMIT 60/.test(src) && /const day = String\(\(p && p\.day\) \|\| \(days\[0\] && days\[0\]\.day\) \|\| ''\);/.test(src) && /yesterday_missing: !days\.some\(d => d\.day === ukYesterday\)/.test(src), null);

  /* ─────────────────────────────────────────────────────────────────────────────────────────────
     (9) 28 OCT, THE RECONCILIATION. The engine half and the two frontend halves of this batch were
     built on disjoint files and each reported green. They still disagreed about the NAMES of eight
     figures, and a name the engine does not send renders as an empty cell, which a reader takes for
     a nought. Each test below is one of those disagreements, held from both sides: the engine really
     sends the field, and the page really reads it.
     ───────────────────────────────────────────────────────────────────────────────────────────── */
  const rdFile = (rel) => { const n = $.NSString.stringWithContentsOfFileEncodingError(root + '/' + rel, $.NSUTF8StringEncoding, null); return n && n.js ? n.js : ''; };
  const cpcSrc = rdFile('frontend/view-adtool-cpc.js');
  const pcSrc = rdFile('frontend/view-potential-cpc.js');
  const pkSrc = rdFile('frontend/view-adtool-peak.js');
  const splitBlk = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('/* ---- Potential CPC'));
  const potBlk = src.slice(src.indexOf('async function adtoolPotentialCpcCompute'), src.indexOf('/* ---- Peak hours: the system switches'));

  t('split: the fleet counts are nested under counts.fleet and the page reads the nest, not the flat spelling', /counts: \{ fleet: fleet, by_account:/.test(splitBlk) && /C\.fleet && typeof C\.fleet === 'object'/.test(cpcSrc), null);
  t('split: the page never falls back to a capped list’s length before it has tried the totals the engine sends', (() => { const i = cpcSrc.indexOf('function splitCount('); const b = cpcSrc.slice(i, i + 700); return b.indexOf('totals') > 0 && b.indexOf('totals') < b.indexOf('list.length'); })(), null);
  t('split: held back and the three totals are read from the objects the engine sends', /held_back: \{ on_cpc:/.test(splitBlk) && /totals: totals,/.test(splitBlk) && /D\.held_back && D\.held_back\[key\]/.test(cpcSrc) && /D\.totals && D\.totals\[key\]/.test(cpcSrc), null);
  t('split: the invariant line reads classified against the INDEPENDENT active count, which is the whole point of it', /classified: sum, read: fleet\.active, active_counted: activeCounted/.test(splitBlk) && /num\(I\.classified\)/.test(cpcSrc) && /num\(I\.active_counted\)/.test(cpcSrc), null);
  t('split: the engine’s own sentence is added only where the three do NOT add up, so no count is written out twice', (() => {
    const i = cpcSrc.indexOf('function invariantLine('), j = cpcSrc.indexOf('/* ── 2 ·', i);
    const body = cpcSrc.slice(i, j > i ? j : i + 2600);
    const ok = body.slice(body.indexOf('They add up, so no listing is in two states or in none.'), body.indexOf('return \'<div class="cpc-inv bad">'));
    /* both uses are on the bad branch; the ok branch adds nothing after its own full stop */
    return /function invNote/.test(cpcSrc) && /I\.text != null/.test(cpcSrc) && (body.match(/invNote\(I\)/g) || []).length === 2 && !/invNote/.test(ok);
  })(), null);
  t('split: the classifier really reads the spelling the page really sends, which a regex over the source could not tell us', (() => {
    /* this used to be a regex pinning `campaign_name: String(r.name || '')` in the engine next to a
       regex over the view. Both were true and the page was still wrong, because nothing checked that
       the function doing the classifying could read that name. So it is checked by calling it. */
    const row = { funding_model: 'COST_PER_SALE', campaign_name: 'General dynamic', ad_rate_strategy: '' };
    return F.adLiveSplitClass([row]) === 'dynamic' && /campaign_name: String\(r\.name \|\| ''\)/.test(splitBlk) && /bid_pct: adtMoneyNum\(rate\)/.test(splitBlk) && /campaign_name/.test(cpcSrc);
  })(), null);
  t('split: there is no `live` flag to read, so the page decides it from the ad status the engine does send', !/\blive: !!/.test(splitBlk) && /c\.live != null \? !!c\.live : String\(c\.ad_status \|\| ''\)\.toUpperCase\(\) !== 'PAUSED'/.test(cpcSrc), null);
  t('split: the ad reading stamp is read under the name the engine sends it by', /ad_reading_at: r\.ad_synced_at/.test(splitBlk) && /o\.ad_reading_at != null/.test(cpcSrc), null);
  t('split: no column asks for units, because the split answer carries none and a column of dashes reads as "sold nothing"', !/units_7d/.test(splitBlk) && !/r\.units_7d/.test(cpcSrc.slice(cpcSrc.indexOf('var SPLIT_COLS'), cpcSrc.indexOf('function splitSorter'))) && /campaigns_count/.test(splitBlk), null);
  t('potential: the order count is read by the name the engine sends, so the column is never a row of dashes', /orders_completed: v\.orders_completed/.test(potBlk) && /'orders_completed', 'orders'/.test(pcSrc), null);
  t('potential: the sentence about the record comes from the one place that builds it, so the row and the advice cannot disagree', /last_cpc_seen: v\.last_cpc_seen/.test(potBlk) && !/never in the last ' \+ ADTOOL_POTENTIAL_LOOKBACK_DAYS/.test(src) && /last_cpc_seen/.test(pcSrc) && !/never on record/.test(pcSrc), null);
  t('potential: both reads this batch added are held to a ceiling as well as a window', (() => { const q = potBlk.match(/GROUP BY o\.item_id[^']*/) || [], d = potBlk.match(/GROUP BY item_id ORDER BY last_cpc[^']*/) || []; return /GROUP BY o\.item_id ORDER BY n DESC LIMIT ' \+ ADTOOL_LIVE_SPLIT_UNIVERSE_CAP/.test(potBlk) && /ORDER BY last_cpc DESC LIMIT ' \+ ADTOOL_LIVE_SPLIT_UNIVERSE_CAP/.test(potBlk) && q.length + d.length >= 1; })(), null);
  t('peak: "the system switches it" is only said where the hours read AND there is an ad to switch', /switchable: pickC\.rows\.length > 0/.test(src) && /r\.switchable === false/.test(pkSrc) && /no pay-per-click ad to switch, so nothing happens/.test(pkSrc), null);
  t('peak: the row says what WOULD HAPPEN in the job’s own words and the page reads those words, so a row at the ceiling never reads as one about to be sent', /switch_state: d\.send \? d\.mode : '', switch_to: d\.send \|\| ''/.test(src) && /r\.switch_state/.test(pkSrc) && /'would-send':/.test(pkSrc) && /'blocked':/.test(pkSrc), null);
  t('peak: hours the system cannot read print the engine’s own reason, not a general refusal', /hours_problem: parsed\.reason \|\| ''/.test(src) && /r\.hours_problem/.test(pkSrc), null);
  t('peak: the daily ceiling on the banner comes from the answer, never typed into the page', /switch_caps: \{ per_account_per_day: ADTOOL_PEAK_SWITCH_CAP/.test(src) && /PK\.data && PK\.data\.switch_caps/.test(pkSrc) && !/20 switches/.test(pkSrc), null);


  /* ═══ WHICH CAMPAIGN a peak listing runs in (owner, 31 Oct: "give option in peak listings to
     select campaign, in which campaign we need to run this product?"). Every rule of it is held
     here: the filter itself as a pure function, and each promise around it over the real source. ═══ */
  const pcAds = [
    { campaign_id: 'C1', name: 'General', ad_status: 'ACTIVE' },
    { campaign_id: 'C2', name: 'Evening push', ad_status: 'PAUSED' },
    { campaign_id: 'C3', name: 'Third', ad_status: '' },
  ];
  t('which campaign: a row naming none acts on every pay-per-click ad the listing has, which is what this list has always done', (() => {
    const a = F.adPeakCampaignPick(pcAds, ''), b = F.adPeakCampaignPick(pcAds, null), c = F.adPeakCampaignPick(pcAds, '  ');
    return a.rows.length === 3 && a.chosen === '' && a.missing === false && a.all_campaigns === true &&
      b.rows.length === 3 && b.missing === false && c.rows.length === 3 && c.chosen === '';
  })(), F.adPeakCampaignPick(pcAds, ''));
  t('which campaign: a row naming one acts on that campaign’s ad ALONE, and the listing’s other ads are not in the answer at all', (() => {
    const r = F.adPeakCampaignPick(pcAds, 'C2');
    return r.rows.length === 1 && r.rows[0].campaign_id === 'C2' && r.chosen === 'C2' && r.missing === false &&
      r.all_campaigns === false && r.rows.filter(x => x.campaign_id !== 'C2').length === 0;
  })(), F.adPeakCampaignPick(pcAds, 'C2'));
  t('which campaign: a PAUSED ad in the chosen campaign is still the ad it acts on, because turning that one back on is the whole point', (() => {
    const r = F.adPeakCampaignPick(pcAds, 'C2');
    return r.rows.length === 1 && r.rows[0].ad_status === 'PAUSED';
  })(), null);
  t('which campaign: naming a campaign the listing has no ad in acts on NOTHING and says so, rather than switching the others in its place', (() => {
    const r = F.adPeakCampaignPick(pcAds, 'C9');
    return r.rows.length === 0 && r.missing === true && r.chosen === 'C9' && r.all_campaigns === false;
  })(), F.adPeakCampaignPick(pcAds, 'C9'));
  t('which campaign: with no ad on the listing at all, naming one is missing and naming none is simply nothing to do', (() => {
    const named = F.adPeakCampaignPick([], 'C1'), none = F.adPeakCampaignPick(null, '');
    return named.rows.length === 0 && named.missing === true && none.rows.length === 0 && none.missing === false;
  })(), null);
  t('which campaign: the id is matched as text, so an id that happens to be a number is the same campaign either way', (() => {
    const r = F.adPeakCampaignPick([{ campaign_id: 12345 }, { campaign_id: 'C1' }], '12345');
    return r.rows.length === 1 && r.missing === false;
  })(), null);

  t('which campaign: the column is added guarded, beside the switch it belongs with, and born blank so no existing row changes the day it lands (regex over the real source)', (() => {
    const sch = src.slice(src.indexOf('async function ensureAdtoolPhase16Schema(env) {'), src.indexOf('const ADTOOL_REGISTER_P16'));
    /* guarded is adtDdlOne's business since 2 Nov: it forgives "already there" and writes down
       anything else, which is what keeps the schema marker from claiming a column that never landed */
    const added = /await adtDdlOne\(env, "ALTER TABLE adtool_peak_items ADD COLUMN campaign_id TEXT DEFAULT ''"\);/.test(sch);
    const blank = !/ADD COLUMN campaign_id TEXT NOT NULL/.test(src) && !/ADD COLUMN campaign_id TEXT DEFAULT 'all'/.test(src);
    /* beside the switch, in the one place every added column on this table is added */
    return added && blank && sch.indexOf('ADD COLUMN auto INTEGER DEFAULT 0') < sch.indexOf('ADD COLUMN campaign_id');
  })(), null);

  t('which campaign: the picker and the save read ONE list, the ads the switch job itself can act on (adtPeakSwitchable, paused ads included) and never a second rule (regex over the real source)', (() => {
    const fn = src.slice(src.indexOf('async function adtPeakCampaignsFor(env, iid) {'), src.indexOf('async function adtPeakCacheClear'));
    const shared = /\(await adtPeakSwitchable\(env, \[id\]\)\)\[id\] \|\| \[\]/.test(fn) && !/adtCampaignStmt\(/.test(fn) && !/c\.status LIKE/.test(fn) && !/ca\.ad_status = /.test(fn);
    const cpcOnly = /String\(r\.funding_model \|\| ''\) !== 'COST_PER_CLICK'\) continue;/.test(fn);
    /* one definition and exactly two callers: the action behind the picker, and the save */
    const callers = (src.match(/adtPeakCampaignsFor\(/g) || []).length === 3;
    return shared && cpcOnly && callers;
  })(), [(src.match(/adtPeakCampaignsFor\(/g) || []).length]);

  t('which campaign: the action is gated like the page it belongs to, is never cached, and names the campaigns newest ad reading first (regex over the real source)', (() => {
    const blk = p15Src.slice(p15Src.indexOf('  adtoolPeakCampaigns: {'));
    const body = blk.slice(0, blk.indexOf('\n  },'));
    const gated = body.indexOf('adtGate(ctx, null)') >= 0 && body.indexOf('ensureAdtoolPhase15Register') > body.indexOf('adtGate(ctx, null)') &&
      body.indexOf("adtGate(ctx, 'adtool_page_peak')") > body.indexOf('ensureAdtoolPhase15Register');
    const uncached = body.indexOf('adtKvMemo') < 0;
    const shape = /campaigns: camps\.map\(c => \(\{ campaign_id: c\.campaign_id, campaign_name: c\.campaign_name, funding_model: c\.funding_model, ad_status: c\.ad_status, status: c\.status \}\)\)/.test(body) &&
      /note: camps\.length \? '' : 'this listing has no pay-per-click ad in a running campaign at the moment, so there is no campaign to choose'/.test(body);
    const newest = /String\(b\.ad_synced_at \|\| ''\)\.localeCompare\(String\(a\.ad_synced_at \|\| ''\)\)/.test(src);
    return gated && uncached && shape && newest;
  })(), null);

  t('which campaign: the save checks it against that list BEFORE it writes a single row, and refuses with the reason (regex over the real source)', (() => {
    const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {'));
    const checked = /const offered = await adtPeakCampaignsFor\(env, iid\);/.test(a) && /const hit = offered\.filter\(c => c\.campaign_id === want\)\[0\];/.test(a) &&
      /if \(!hit\) \{\n\s*throw new Error\('SAY: ' \+ \(offered\.length/.test(a);
    /* BEFORE: the check and its refusal both stand ahead of every write this action makes */
    const order = a.indexOf('adtPeakCampaignsFor(env, iid)') < a.indexOf('INSERT INTO adtool_peak_items') &&
      a.indexOf("throw new Error('SAY: ' + (offered.length") < a.indexOf('INSERT INTO adtool_peak_items');
    const names = /that campaign is not one this listing has a pay-per-click ad in/.test(a);
    return checked && order && names;
  })(), null);

  t('which campaign: the row carries it, with the two older column lists still behind it, and a named campaign is never quietly dropped (regex over the real source)', (() => {
    const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {'));
    const full = /INSERT INTO adtool_peak_items \(account, item_id, hours, note, added_by, added_at, removed_by, removed_at, auto, campaign_id\)/.test(a) && /, auto = \?6, campaign_id = \?7/.test(a);
    /* a database without the column still takes a row with NO campaign; a row WITH one is refused
       outright, because saving it as every campaign is the opposite of what was asked for */
    const kept = /if \(cid\) throw new Error\('SAY: this database cannot record a campaign against a peak listing yet/.test(a);
    const older = /INSERT INTO adtool_peak_items \(account, item_id, hours, note, added_by, added_at, removed_by, removed_at, auto\)/.test(a) &&
      /INSERT INTO adtool_peak_items \(account, item_id, hours, note, added_by, added_at, removed_by, removed_at\)/.test(a);
    return full && kept && older;
  })(), null);

  t('which campaign: the audit row and the answer both name the campaign, so the record says which ad was armed (regex over the real source)', (() => {
    const a = src.slice(src.indexOf('adtoolPeakAdd: {'), src.indexOf('adtoolPeakRemove: {'));
    const audit = /'ADTOOL_PEAK_ADD'[\s\S]{0,400}\(cid \? 'campaign ' \+ \(cname \|\| cid\) \+ ' \(' \+ cid \+ '\)' : 'every pay-per-click campaign it is in'\)/.test(a);
    const answer = /campaign_id: cid, campaign_name: cname,/.test(a) && /only its ad in ' \+ \(cname \|\| cid\) \+ ' is switched: its ads in other campaigns are left as they are/.test(a);
    return audit && answer;
  })(), null);

  t('which campaign: the job narrows the ads ONCE, before it decides anything, so nothing below that line can see the ads it left out (regex over the real source)', (() => {
    const j = pkJob();
    const read = /SELECT account, item_id, hours, auto, campaign_id FROM adtool_peak_items WHERE removed_at = '' AND COALESCE\(auto, 0\) = 1/.test(j);
    const filtered = /const pick = adPeakCampaignPick\(rows, row\.campaign_id\);/.test(j) && /for \(const m of pick\.rows\)/.test(j) && !/for \(const m of rows\)/.test(j);
    const order = j.indexOf('const pick = adPeakCampaignPick(') < j.indexOf('const byCamp = {};') &&
      j.indexOf('const byCamp = {};') < j.indexOf('await fetch(');
    return read && filtered && order;
  })(), null);

  t('which campaign: a chosen campaign with no ad left sends NOTHING and is written down once a day, the same way a standing account mismatch is (regex over the real source)', (() => {
    const j = pkJob();
    const i = j.indexOf('if (pick.missing) {'), f = j.indexOf('await fetch(');
    const deduped = /if \(blockedToday\[id \+ '\|' \+ gone\]\) continue;/.test(j) && /blockedToday\[id \+ '\|' \+ gone\] = 1;/.test(j);
    const written = /'peak', 'status', \?5, 'blocked', 0, \?6, '', datetime\('now'\)/.test(j) &&
      /the peak list runs this listing in one campaign only and that campaign has no pay-per-click ad for it to switch: nothing sent/.test(j);
    /* and it leaves the row there: no request can be reached from inside that branch */
    const stops = i > 0 && f > i && /continue;/.test(j.slice(i, f)) && /campaignGone\+\+;/.test(j);
    return deduped && written && stops && /blocked because the campaign the list names has no ad to switch/.test(j);
  })(), null);

  t('which campaign: the eBay gate is untouched, so the account switch and the daily ceiling are still the only things that decide what is sent (regex over the real source)', (() => {
    const j = pkJob();
    /* the filter picks WHICH ads; it must not have become a second answer to WHETHER anything goes */
    const gate = /const on = !!switches\[macct\];/.test(j) && /const mode = d\.mode === 'live' && !cap\.allowed \? 'blocked' : d\.mode;/.test(j) &&
      /const tok = await ebayAccessToken\(env, macct\);/.test(j) && (j.match(/await fetch\(/g) || []).length === 1;
    const pureUntouched = !/campaign/i.test(String(F.adPeakSwitchDecide)) && !/campaign/i.test(String(F.adPeakApplyCaps));
    return gate && pureUntouched;
  })(), null);

  t('which campaign: the page says which campaign the row runs in, blank for all of them, and takes the row’s decision for that campaign alone (regex over the real source)', (() => {
    const ma = src.indexOf('const manual = manualRows.map(r => {');
    const m = src.slice(ma, src.indexOf('const allAccounts =', ma));
    const read = /COALESCE\(p\.campaign_id, ''\) AS campaign_id/.test(src);
    const fields = /campaign_id: pickC\.chosen, campaign_name: cRow \? String\(cRow\.name \|\| ''\) : '',/.test(m) && /campaign_missing: pickC\.missing,/.test(m);
    const decided = /const pickC = adPeakCampaignPick\(sw, r\.campaign_id\);/.test(m) && /for \(const m of pickC\.rows\)/.test(m) && /switchable: pickC\.rows\.length > 0,/.test(m);
    return read && fields && decided;
  })(), null);

  t('which campaign: the picker is on both forms, defaults to every campaign, and the save only ever sends one the picker was showing for that listing', (() => {
    const asks = /api\('adtoolPeakCampaigns', \{ item_id: want \}\)/.test(pkSrc);
    const dflt = />every pay-per-click campaign it is in<\/option>/.test(pkSrc);
    /* one picker, built once and put on the add form and the change form by the same function */
    const both = (pkSrc.match(/<div id="pktCampWrap">/g) || []).length === 1 && /campaign_id: campForSave\(id, null\)/.test(pkSrc) && /campaign_id: campForSave\(id, row\)/.test(pkSrc);
    const onlyShown = /if \(PK\.campFor === String\(id \|\| ''\)\) return String\(PK\.pick \|\| ''\);/.test(pkSrc) && /return String\(\(row && row\.campaign_id\) \|\| ''\);/.test(pkSrc);
    return asks && dflt && both && onlyShown;
  })(), null);

  t('which campaign: the copy under the picker is plain, the row links the campaign, and the page keeps its own class prefix', (() => {
    const copy = /The hours switch the ad in this campaign only\. Its ads in other campaigns are left as they are\./.test(pkSrc);
    const row = /all its pay-per-click campaigns/.test(pkSrc) && /adtCampaignLink\(cid, String\(\(r && r\.campaign_name\) \|\| ''\) \|\| cid\)/.test(pkSrc);
    /* 2 Nov: the campaign sits in its own column now, so the reason names what it is talking
       about rather than pointing at a position in the cell it used to share */
    const why = /but it has no pay-per-click ad in the campaign this row names, so nothing happens/.test(pkSrc) && /r\.campaign_missing/.test(pkSrc);
    const prefix = /\.pkt-add select\{/.test(pkSrc) && !/\.adt-add select\{/.test(pkSrc);
    /* and every field the engine sends against a campaign is used: its name, what its ad is doing,
       and the campaign's own state where that is something other than plain running */
    const used = /function campWords/.test(pkSrc) && /campWords\(c && c\.status\)/.test(pkSrc) && /adStatusWords\(c && c\.ad_status\)/.test(pkSrc);
    if (!used) return false;
    /* and no threshold or ceiling is typed into any of it */
    return copy && row && why && prefix && !/20 switches/.test(pkSrc);
  })(), null);

  t('which campaign: a campaign the listing has no ad in RIGHT NOW is never dropped from the choice, because dropping it would widen what somebody narrowed', (() => {
    /* the engine offers the campaigns a listing has a RUNNING pay-per-click ad in, and a listing the
       hours have switched off has none in the campaign it runs in until the hours bring it back.
       Dropping the choice would send the next save as every campaign; it is kept, said plainly, and
       a save the engine turns down leaves the row exactly as it was. */
    const kept = /function campaignKnown\(\)/.test(pkSrc) && /no ad running in it just now/.test(pkSrc) &&
      !/if \(PK\.pick && !PK\.camps\.filter\(/.test(pkSrc);
    const warned = /so a save will be turned down until you choose another\. The row is left as it is either way\./.test(pkSrc);
    return kept && warned;
  })(), null);

  t('which campaign: the item number and the note survive a redraw of the hours, which is what lets the picker fill at all', (() => {
    const kept = /value="' \+ esc\(String\(PK\.item \|\| ''\)\) \+ '"/.test(pkSrc) && /value="' \+ esc\(String\(PK\.note \|\| ''\)\) \+ '"/.test(pkSrc);
    const typed = /itEl\.oninput = function \(\)/.test(pkSrc) && /loadCampaignsSoon\(PK\.item\)/.test(pkSrc);
    /* the picker repaints itself and never the form: a form rebuilt mid-typing loses both the box
       and the button somebody was reaching for */
    const own = /function paintCamp\(\)/.test(pkSrc) && /el\.innerHTML = campaignInner\(formItem\(\)\)/.test(pkSrc);
    return kept && typed && own;
  })(), null);

  t('which campaign: the explainer tag beside the picker opens the register entry that states the rule', (() => {
    const tagged = /reg\('which campaign', 'how'\)/.test(pkSrc);
    let keys = null;
    for (const row of (regMap || [])) { if (row[0].test('which campaign')) { keys = row[1]; break; } }
    const hit = keys ? rgAll.filter(r => keys.some(k => String(r.sources).indexOf(k) >= 0 || r.id === k)).map(r => r.id) : [];
    const entry = rgAll.filter(r => r.id === 'PEAK_CAMPAIGN')[0];
    return tagged && hit.indexOf('PEAK_CAMPAIGN') >= 0 &&
      entry && /its hours switch the ad in that campaign alone/.test(entry.formula) &&
      /every pay-per-click campaign the listing is in/.test(entry.formula) && !/—/.test(entry.formula);
  })(), null);

  /* the pre-warm, the two stale claims, and the last place the portal stashed an item id */
  /* a refusal is eBay's last word for that wanted state: the same request is not repeated every quarter hour */
  t('peak switch: a change eBay refused (404) is not asked again while the hours still want it', (() => { const d = F.adPeakSwitchDecide({ auto: 1, ranges: [[17, 23]], hour: 22, live_cpc_ad: true, believed_state: 'PAUSED', account_live_switch: true, account_switches_today: 3, refused_to: 'ACTIVE', refused_status: 404 }); return d.send === null && /refused/.test(d.why) && /404/.test(d.why); })(), null);
  t('peak switch: once the hours flip the wanted state, the old refusal no longer binds and the change is sent', (() => { const d = F.adPeakSwitchDecide({ auto: 1, ranges: [[17, 23]], hour: 23, live_cpc_ad: true, believed_state: 'ACTIVE', account_live_switch: true, account_switches_today: 3, refused_to: 'ACTIVE', refused_status: 404 }); return d.send === 'PAUSED' && d.mode === 'live'; })(), null);
  t('peak switch: a 5xx or a dropped request is not a refusal, so it is tried again (regex over the source)', (() => { const m = src.slice(src.indexOf('async function adtPeakLastSwitch'), src.indexOf('async function adtoolPeakSwitch')); return /http_status >= 400 AND http_status < 500 AND http_status <> 429/.test(m) && !/http_status >= 500/.test(m); })(), null);
  t('peak switch: the job hands the newest refusal for the listing and campaign to the decision (regex over the source)', /refused_to: hist\.refused \? hist\.refused\.to : '', refused_status: hist\.refused \? hist\.refused\.http_status : 0,/.test(src), null);
  t('warm (regex over the source): the three routes that memoise inside fn expose raw, and the warm prefers raw, so the hourly put is the only put for those keys', (() => {
    const okWarm = /const data = await \(route\.raw \|\| route\.fn\)\(payload, ctx\)/.test(src);
    return okWarm && ['adtoolLiveSplit', 'adtoolPotentialCpc', 'adtoolDepts'].every(a => { const i = src.indexOf('  ' + a + ': {'); const b = src.slice(i, i + 1400); return i > 0 && /\n    raw: async \(p, ctx\) => \{ await adtGate\(ctx, null\);/.test(b) && b.indexOf('raw:') < b.indexOf('fn: async'); });
  })(), null);
  t('warm: the two slow new pages are warmed, and LAST, so they cannot take an earlier page’s turn on a tight hour', (() => { const i = src.indexOf('const jobs = [[\'adtoolCpcListings\''); const b = src.slice(i, src.indexOf('const out = []; const skippedNames', i)); return /\['adtoolLiveSplit', \{\}, true\], \['adtoolPotentialCpc', \{\}, true\]\]/.test(b) && b.indexOf('adtoolLiveSplit') > b.indexOf('adtoolDepts'); })(), null);
  t('product history: nothing in the portal stashes an item id any more, so a second tab shows its own listing', (() => ['frontend/view-adtool-morning.js', 'frontend/view-adtool-product.js', 'frontend/view-adsCentre.js', 'frontend/view-adtool-cpc.js', 'src/shell.html'].every(f => !/m98m:adtoolItem/.test(rdFile(f))))(), null);
  t('links: nothing points at the page the merge deleted', (() => ['frontend/view-campaignWatch.js', 'frontend/view-adtool-stopped.js', 'frontend/view-adtool-morning.js'].every(f => !/href="#adtoolActivated/.test(rdFile(f))))(), null);
  t('claims: the Decision page no longer says the hours are only ever a suggestion, now that one page does switch them', (() => { const r = rdFile('frontend/view-adtool-runtoday.js'); return /#adtoolPeak/.test(r) && !/Hours are a suggestion only, as eBay cannot schedule ads by the hour/.test(r); })(), null);
  t('claims: Live apply gives the quiet hours to the two runs alone, names the other sender, and reads both ceilings out of the answer', (() => {
    /* the page used to promise "nothing between 22:00 and 06:00" for everything that sends, which the
       peak switch broke the day it landed. It must name the other sender, say the quiet hours do not
       bind it, and take BOTH ceilings from the payload rather than typing either of them. */
    const r = rdFile('frontend/view-adtool-stop.js');
    return /The morning and evening runs/.test(r) && /#adtoolPeak/.test(r) && /quiet hours do not apply to it/.test(r)
      && /caps\.peak_switches_per_account_per_day/.test(r) && /caps\.per_account_per_day/.test(r) && /decision_id/.test(r)
      && !/\b30 actions\b/.test(r) && !/\b20 switches\b/.test(r);
  })(), null);
  t('apply log: the row says which sender wrote it, because every one of them writes the same operation', /decision_id, op, mode, http_status/.test(src) && /peak_switches_per_account_per_day: ADTOOL_PEAK_SWITCH_CAP/.test(src), null);
  t('peak switch: the ceiling counts requests, so an account whose every send fails stops at the cap too', (() => {
    const i = src.indexOf("if (mode === 'live') {", src.indexOf('async function adtoolPeakSwitch'));
    const b = src.slice(i, i + 1400);
    /* the count goes up before the request leaves, not after a 2xx comes back */
    return b.indexOf("doneToday[acct] = (doneToday[acct] || 0) + 1;") < b.indexOf('await fetch(') && /if \(r\.ok \|\| r\.status === 204\) \{ sent\+\+; \}/.test(b);
  })(), null);
  t('overview: the hourly chart draws all 24 hours and claims nothing for an hour that has not arrived', (() => { const o = rdFile('frontend/view-adtool-overview.js'); return /for \(i = 0; i < 24; i\+\+\) \{\n      var hx/.test(o) && /var lastKnown = -1;/.test(o) && /this hour has not happened yet/.test(o) && /i > lastKnown/.test(o); })(), null);
  t('overview: the decisions tile counts EXACTLY the rows the Decision page lists, over every account, with nothing filtered out (regex over the real source)', (() => {
    /* the tile and the page it points at must read the same rows or one of them is lying. The page's
       own list is day + anything but KEEP, with no account and no applied/undone filter, so the tile
       is the same predicate and nothing else. `decisions_waiting` is gone with its old narrower read. */
    /* 31 Oct section 2: the predicate is the same one, and the Peak-time Overview's own answer adds
       the cohort's item filter to it and nothing else. */
    const tile = /SELECT COUNT\(\*\) AS n FROM adtool_decisions WHERE day = \?1 AND decision <> 'KEEP'" \+ coIn\('item_id'\)\)\.bind\(today\)/.test(src);
    const page = /FROM adtool_decisions d LEFT JOIN adtool_listings l ON l\.item_id = d\.item_id WHERE d\.day = \?1 AND d\.decision <> 'KEEP'/.test(src);
    const scope = /decisions_today: decisionsToday, decisions_scope: CO \? 'the listings on the peak list' : 'all accounts'/.test(src);
    return tile && page && scope && !/decisions_waiting/.test(src.replace(/\/\*[\s\S]*?\*\//g, ''));
  })(), null);
  t('overview: and a database without the decisions table still draws the landing page, with the tile saying so', (() => { const i = src.indexOf('const alertSql = () =>'); const b = src.slice(i, i + 1600); return /catch \(e\) \{ alerts = null; decisionsToday = null; \}/.test(b) && /if \(!alerts\) alerts = await alertSql\(\)\.first\(\);/.test(b); })(), null);

  /* ---- 28 Oct, second pass: what the Past situation note may claim, the signals window, the two
     morning jobs that still have readers, and the new window's 7-day count ---- */

  /* G1: the eBay sentence comes off the apply log and nothing else */
  t('past situation: no live apply-log row for the day is the only case that may say nothing was sent to eBay', (() => {
    const z = F.adtReportSentLive([]);
    return z.total === 0 && z.morning === 0 && z.peak === 0 && z.sentence === 'nothing was sent to eBay that day';
  })(), F.adtReportSentLive([]));
  t('past situation: a day whose decisions were all shadow still owns up to the peak switch’s live sends', (() => {
    /* the bug: adtool_decisions said shadow for every row, so the note said nothing was sent, while
       the peak switch had moved real ads on the one account whose live switch is on. */
    const z = F.adtReportSentLive([{ decision_id: 'peak', n: 4 }]);
    return z.total === 4 && z.peak === 4 && z.morning === 0 && z.sentence === '4 changes were sent to eBay that day (4 by peak switching)';
  })(), F.adtReportSentLive([{ decision_id: 'peak', n: 4 }]));
  t('past situation: the two senders are counted apart, named, and the morning apply is read first', (() => {
    const z = F.adtReportSentLive([{ decision_id: 'peak', n: 2 }, { decision_id: '', n: 5 }]);
    return z.total === 7 && z.morning === 5 && z.peak === 2 && z.sentence === '7 changes were sent to eBay that day (5 by the morning apply, 2 by peak switching)';
  })(), F.adtReportSentLive([{ decision_id: 'peak', n: 2 }, { decision_id: '', n: 5 }]));
  t('past situation: a decision id that is not peak is the morning apply, however it is spelt, and one change reads in the singular', (() => {
    const z = F.adtReportSentLive([{ decision_id: 'D-2026-10-27-6174', n: 1 }]);
    return z.total === 1 && z.morning === 1 && z.sentence === '1 change was sent to eBay that day (1 by the morning apply)';
  })(), F.adtReportSentLive([{ decision_id: 'D-2026-10-27-6174', n: 1 }]));
  t('past situation: an empty count is not a send', F.adtReportSentLive([{ decision_id: 'peak', n: 0 }, { decision_id: '', n: null }]).sentence === 'nothing was sent to eBay that day', F.adtReportSentLive([{ decision_id: 'peak', n: 0 }]));
  t('past situation: the note reads the apply log for the day, counts live rows only, and the old blanket claim is gone (regex over the real source)', (() => {
    /* a would-send or blocked row is not a send, so the read asks for mode live and nothing else;
       the decisions sentence and the eBay sentence are two sentences, not one clause. */
    const reads = /FROM adtool_apply_log WHERE day = \?1 AND mode = 'live' GROUP BY CASE WHEN COALESCE\(decision_id, ''\) = 'peak'/.test(src);
    const returns = /sent_live: \{ total: sent\.total, morning: sent\.morning, peak: sent\.peak \}/.test(src);
    const apart = /the day’s decisions were made in shadow/.test(src) && /note: cap\(decSentence\) \+ '\. ' \+ cap\(sent\.sentence\)/.test(src);
    return reads && returns && apart && !/all in shadow, nothing was sent to eBay/.test(src);
  })(), null);

  /* G2: the signals feed says which window it filtered by */
  t('past situation: the signals feed returns the window it filters by, under the names the page already reads (regex over the real source)', (() => {
    const eng = /window_days: pinDays, window_from: cutoff,/.test(src);
    const cut = /const cutoff = new Date\(Date\.parse\(today \+ 'T12:00:00Z'\) - pinDays \* 86400000\)/.test(src);
    const view = rdFile('frontend/view-adtool-morning.js');
    return eng && cut && /d\.window_from/.test(view) && /d\.window_days/.test(view);
  })(), null);

  /* G3: the two morning jobs whose output is still read on a live page */
  t('forecast and ROAS: both jobs stay in the 05:20 chain because live pages still read what they write (regex over the real source)', (() => {
    /* the Sales forecast page and the ROAS target page are gone, but the jobs are not orphans.
       adtool_roas is read by the account narratives; the forecast's cursor, its MASE check and its
       register rows are all shown on Data health, and the hourly rollup calls the job regardless of
       this slot, so dropping it would only make the schedule the page prints untrue. */
    const slot = /'20 5 \* \* \*': \[adtoolTruth, adtoolProfiles, adtoolForecast, adtoolReport, adtoolRoas\]/.test(src);
    const roasReader = /SELECT json FROM adtool_roas ORDER BY day DESC LIMIT 1/.test(src);
    const catchUp = /try \{ await adtoolForecast\(env\); \} catch/.test(src);
    const cursorShown = /forecast: await adtFlag\(env, 'adtool_forecast_cursor'\)/.test(src) && /D\.cursors\.forecast/.test(rdFile('frontend/view-adtool-morning.js'));
    return slot && roasReader && catchUp && cursorShown;
  })(), null);
  t('register: no row sends the reader to a page this batch deleted (regex over the real source)', !/Sales forecast page|ROAS target page/.test(src.slice(src.indexOf('const ADTOOL_REGISTER_P4'), src.indexOf('const ADTOOL_FORECAST_BATCH'))), null);

  /* G4: the new window's 7-day count is the new department's own rows */
  t('new listings: the ladder reads the new department first and on age alone, so the 7-day count is the new rows and nothing else', (() => {
    /* sold_life and units_30d are set high enough to be a TOP listing, so a pass here proves the age
       test comes first; a listing live 7 days or less therefore cannot sit in another department. */
    const hot = { sold_life: 99, units_30d: 99, units_prev30: 0 };
    const R14 = Object.assign({}, F.ADTOOL_DEPT_DEFAULTS, { new_days: 14 });
    let allNew = true; for (let a = 0; a <= 7; a++) if (F.adtDeptOf(Object.assign({ age_days: a }, hot), R14).key !== 'new') allNew = false;
    return allNew && F.ADTOOL_DEPT_DEFAULTS.new_days >= 7;
  })(), null);
  t('new listings: the two counts can part only where the new window is shorter than 7 days, which is what the note claims', (() => {
    const hot = { sold_life: 99, units_30d: 99, units_prev30: 0 };
    const R5 = Object.assign({}, F.ADTOOL_DEPT_DEFAULTS, { new_days: 5 });
    const inside = F.adtDeptOf(Object.assign({ age_days: 5 }, hot), R5).key === 'new';
    const outside = F.adtDeptOf(Object.assign({ age_days: 6 }, hot), R5).key !== 'new';
    /* and an age we do not have is not new on either side of the comparison */
    const unknown = F.adtDeptOf({ age_days: null, sold_life: 0, units_30d: 0, units_prev30: 0 }, R5).key !== 'new';
    return inside && outside && unknown;
  })(), null);
  t('new listings: the 7-day note says which rows it counted and reads the new window out of the rules (regex over the real source)', (() => {
    const i = src.indexOf('last_7_days_note:');
    const line = src.slice(i, src.indexOf('\n', i));
    return /counted over every active listing rather than the rows listed here/.test(line)
      && /' \+ rules\.new_days \+ '/.test(line)
      && /shorter than 7 days/.test(line)
      && !/14 days/.test(line);
  })(), null);

  /* ============ 31 Oct: the peak switch's own two alarms, and the cron slots it rides on ============
     The job sends real changes to eBay from a cron, so nobody is watching when it works and nobody is
     watching when it stops. Everything below is the pure half of the two ways it can fail quietly,
     plus the one test that can tell whether the slot it rides on is still registered at all. */
  const pkNow = (iso) => { const ms = Date.parse(iso); const p = F.adtUkParts(ms); return { now_ms: ms, date: p.date, hour: p.hour, minute: p.minute }; };
  const pkRow = (extra) => Object.assign({ item_id: 'I1', account: 'AZHAR ABRT', hours: '09-11', auto: 1, added_at: '2026-10-01 00:00:00' }, extra || {});
  const pkSw = { I1: [{ campaign_id: 'C1', account: 'AZHAR ABRT' }] };
  const pkMissed = (over) => F.adPeakMissedSends(Object.assign({ rows: [pkRow()], log: [], switchable: pkSw, now_uk: pkNow('2026-10-30T12:40:00Z'), grace_min: 20 }, over || {}));

  t('A20: both boundaries of a stretch are judged, and each says which state the hours asked for', (() => {
    const m = pkMissed();
    return m.length === 2
      && m[0].boundary_iso === '2026-10-30T09:00:00.000Z' && m[0].want === 'ACTIVE'
      && m[1].boundary_iso === '2026-10-30T11:00:00.000Z' && m[1].want === 'PAUSED'
      && m[0].item_id === 'I1' && m[0].account === 'AZHAR ABRT' && /09:00 UK/.test(m[0].note);
  })(), pkMissed());
  t('A20: one row of ANY mode inside the grace clears that boundary, and a row for another listing does not', (() => {
    const one = pkMissed({ log: [{ item_id: 'I1', at: '2026-10-30 09:05:00', mode: 'would-send' }] });
    const both = pkMissed({ log: [{ item_id: 'I1', at: '2026-10-30 09:05:00', mode: 'blocked' }, { item_id: 'I1', at: '2026-10-30 11:19:00', mode: 'live' }] });
    const other = pkMissed({ log: [{ item_id: 'I2', at: '2026-10-30 09:05:00', mode: 'live' }] });
    return one.length === 1 && one[0].want === 'PAUSED' && both.length === 0 && other.length === 2;
  })(), null);
  t('A20: a row that lands AFTER the grace has run out does not clear the boundary it was owed to', pkMissed({ log: [{ item_id: 'I1', at: '2026-10-30 09:05:00' }, { item_id: 'I1', at: '2026-10-30 11:21:00' }] }).length === 1, null);
  t('A20: a boundary younger than the grace is not late yet', (() => {
    const m = F.adPeakMissedSends({ rows: [pkRow()], log: [], switchable: pkSw, now_uk: pkNow('2026-10-30T11:10:00Z'), grace_min: 20 });
    return m.length === 1 && m[0].boundary_iso === '2026-10-30T09:00:00.000Z';
  })(), null);
  t('A20: silent for a row nobody armed, for hours that cannot be read, and for a listing with no ad to switch', (() => {
    const off = pkMissed({ rows: [pkRow({ auto: 0 })] });
    const bad = pkMissed({ rows: [pkRow({ hours: 'evenings' })] });
    const noAd = pkMissed({ switchable: {} });
    const unarmedNull = pkMissed({ rows: [pkRow({ auto: null })] });
    return off.length === 0 && bad.length === 0 && noAd.length === 0 && unarmedNull.length === 0;
  })(), null);
  t('A20: a boundary older than the row itself is not a missed send, because the row did not exist to be switched', (() => {
    const m = pkMissed({ rows: [pkRow({ added_at: '2026-10-30 10:00:00' })] });
    return m.length === 1 && m[0].boundary_iso === '2026-10-30T11:00:00.000Z';
  })(), null);
  t('A20: only the last 24 hours are judged, so yesterday morning is not reported for ever', (() => {
    /* 09:00 and 11:00 yesterday are both older than 24 h at 12:40 today, and both of today's are inside it */
    const m = pkMissed();
    return m.every(x => x.boundary_iso.slice(0, 10) === '2026-10-30');
  })(), null);
  t('A20: an hour boundary is resolved on the UK clock, not assumed — BST, GMT, and an hour the spring forward skips', (() => {
    const bst = F.adPeakBoundaryMs('2026-10-24', 17);     // BST: 17:00 UK = 16:00Z
    const gmt = F.adPeakBoundaryMs('2026-10-30', 17);     // GMT: 17:00 UK = 17:00Z
    const gone = F.adPeakBoundaryMs('2026-03-29', 1);     // 01:00 does not happen on the day the clocks go forward
    return new Date(bst).toISOString() === '2026-10-24T16:00:00.000Z'
      && new Date(gmt).toISOString() === '2026-10-30T17:00:00.000Z'
      && isNaN(gone);
  })(), [new Date(F.adPeakBoundaryMs('2026-10-24', 17)).toISOString(), new Date(F.adPeakBoundaryMs('2026-10-30', 17)).toISOString()]);
  t('A20: an unreadable stamp is never read as a moment, so a log nobody can date cannot clear a boundary', pkMissed({ log: [{ item_id: 'I1', at: '' }, { item_id: 'I1', at: 'yesterday' }] }).length === 2 && isNaN(F.adPeakStampMs('')) && F.adPeakStampMs('2026-10-30 09:05:00') === Date.parse('2026-10-30T09:05:00Z'), null);

  const pkSend = (extra) => Object.assign({ item_id: 'I1', campaign_id: 'C1', account: 'AZHAR ABRT', mode: 'live', http_status: 200, to: 'PAUSED', at: '2026-10-30 11:00:05' }, extra || {});
  const pkRead = (extra) => Object.assign({ item_id: 'I1', campaign_id: 'C1', ad_status: 'ACTIVE', synced_at: '2026-10-30 11:30:00' }, extra || {});
  const pkDis = (sends, reads) => F.adPeakReadingDisagree({ last_sends: sends, readings: reads, settle_min: 10 });

  t('A21: eBay took the change, then went on reading the ad the other way round', (() => {
    const d = pkDis([pkSend()], [pkRead()]);
    return d.length === 1 && d[0].item_id === 'I1' && d[0].campaign_id === 'C1' && d[0].sent === 'PAUSED' && d[0].read === 'ACTIVE' && d[0].read_at === '2026-10-30 11:30:00';
  })(), pkDis([pkSend()], [pkRead()]));
  t('A21: a reading taken before eBay has had time to settle is evidence of nothing', pkDis([pkSend()], [pkRead({ synced_at: '2026-10-30 11:05:00' })]).length === 0 && pkDis([pkSend()], [pkRead({ synced_at: '2026-10-30 11:10:05' })]).length === 0, null);
  t('A21: they agree, so nothing is found, which is how the alert clears', pkDis([pkSend()], [pkRead({ ad_status: 'PAUSED' })]).length === 0, null);
  t('A21: a reading with no state on it is never read as ACTIVE', pkDis([pkSend({ to: 'ACTIVE' })], [pkRead({ ad_status: '' })]).length === 0 && pkDis([pkSend({ to: 'ACTIVE' })], [pkRead({ ad_status: 'ARCHIVED' })]).length === 0, null);
  t('A21: only a live row eBay accepted counts — a refusal, a would-send and a held-back row are not claims about the ad', (() => {
    const refused = pkDis([pkSend({ http_status: 404 })], [pkRead()]);
    const shadow = pkDis([pkSend({ mode: 'would-send', http_status: 0 })], [pkRead()]);
    const blocked = pkDis([pkSend({ mode: 'blocked', http_status: 0 })], [pkRead()]);
    return refused.length === 0 && shadow.length === 0 && blocked.length === 0;
  })(), null);
  t('A21: the NEWEST accepted send per listing and campaign is the one still claimed', (() => {
    const two = [pkSend(), pkSend({ to: 'ACTIVE', at: '2026-10-30 11:40:00' })];
    const agree = pkDis(two, [pkRead({ synced_at: '2026-10-30 12:00:00' })]);
    const differ = pkDis(two, [pkRead({ ad_status: 'PAUSED', synced_at: '2026-10-30 12:00:00' })]);
    return agree.length === 0 && differ.length === 1 && differ[0].sent === 'ACTIVE' && differ[0].read === 'PAUSED';
  })(), null);
  t('A21: another campaign\'s send says nothing about this one, and the newest reading of a pair is the one judged', (() => {
    const wrongCamp = pkDis([pkSend({ campaign_id: 'C2' })], [pkRead()]);
    const newestRead = pkDis([pkSend()], [pkRead({ ad_status: 'PAUSED', synced_at: '2026-10-30 11:20:00' }), pkRead({ synced_at: '2026-10-30 12:00:00' })]);
    return wrongCamp.length === 0 && newestRead.length === 1 && newestRead[0].read === 'ACTIVE';
  })(), null);

  t('alerts: A20 and A21 join the rules with a severity, a waiting time, a suggested action and a why', (() => {
    const R = F.ADTOOL_ALERT_RULES;
    return !!R.A20 && !!R.A21 && Object.keys(R).length === 23
      && ['A20', 'A21'].every(k => R[k].sev && R[k].cool >= 1 && R[k].action && R[k].why_matters.length >= 20 && /peak hours/.test(R[k].text));
  })(), Object.keys(F.ADTOOL_ALERT_RULES).length);
  t('alerts: neither peak rule prints a figure of its own, so a grace or a settling time cannot be changed in one place and stated in another', ['A20', 'A21'].every(k => !/\d/.test(F.ADTOOL_ALERT_RULES[k].text) && !/—/.test(F.ADTOOL_ALERT_RULES[k].text + F.ADTOOL_ALERT_RULES[k].why_matters)), [F.ADTOOL_ALERT_RULES.A20.text, F.ADTOOL_ALERT_RULES.A21.text]);
  t('alerts: the two peak rules are raised by the hourly sweep itself, scoped per boundary and per campaign, with the severity decided per finding (regex over the real source)', (() => {
    const sw = src.slice(src.indexOf('async function adtoolAlerts(env) {'), src.indexOf('async function adtoolAlertsFixtureCheck'));
    const raised = /adPeakMissedSends\(\{ rows: peakRows, log: peakLog, switchable: peakSwitchable/.test(sw) && /adPeakReadingDisagree\(\{ last_sends: peakSends, readings: peakReadings/.test(sw);
    const scoped = /put\('A20', m\.item_id \+ '\|' \+ m\.boundary_iso/.test(sw) && /put\('A21', dis\.item_id \+ '\|' \+ dis\.campaign_id/.test(sw);
    /* high where the account really sends, medium where nothing ever left the portal; meta is merged
       over the rule's own severity by put(), which is what lets one rule read two ways. */
    const perFinding = /const peakSev = a => \(peakSwitches\[String\(a \|\| ''\)\] \? 'high' : 'medium'\);/.test(sw)
      && (sw.match(/sev: peakSev\(/g) || []).length === 2
      && /found\[id\] = Object\.assign\(\{ rule, sev: ADTOOL_ALERT_RULES\[rule\]\.sev, payload[\s\S]{0,200}\}, meta \|\| \{\}\)/.test(sw);
    /* the switches are read in the one place the jobs read them, never from a second copy */
    const oneSwitch = /await adtPeakLiveSwitches\(env\)/.test(sw) && !/adtool_apply_live_/.test(sw);
    /* and eBay's readings come out of the switchable read the job itself decides on, not a second
       trip to campaign_ads: the same ads, one D1 read, and the same rule about which ad counts */
    const oneRead = /for \(const iid of Object\.keys\(peakSwitchable\)\)/.test(sw) && !/FROM campaign_ads ca WHERE ca\.listing_id IN/.test(sw);
    return raised && scoped && perFinding && oneSwitch && oneRead;
  })(), null);

  t('trail: adsPeakTrail is key-authed exactly as backupDump is, never writes, and says nothing was sent (regex over the real source)', (() => {
    const i = src.indexOf('  adsPeakTrail: {');
    const r = i < 0 ? '' : src.slice(i, src.indexOf('\n  },\n', i));
    const sameGate = /^  adsPeakTrail: \{\n    auth: 'sync',/m.test(src) && /^  backupDump: \{\n    auth: 'sync',/m.test(src);
    /* the router role-gates every action whose name starts with adtool before it has a user to judge,
       and a key-authed call has none, so this one deliberately does not carry that prefix */
    const notPrefixed = r.length > 2000 && !/adtool[A-Z]/.test('adsPeakTrail');
    const readOnly = !/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|ensureAdtool)/.test(r);
    const answers = /sent_to_ebay: false/.test(r) && /build: \{ crons: Object\.keys\(map\), has_peak_job: !!peakSlot, peak_slot: peakSlot \}/.test(r)
      && /switches, list, log, jobs, readings,/.test(r) && /LIMIT 600/.test(r) && /LIMIT 2000/.test(r) && /LIMIT 60/.test(r) && /LIMIT 3000/.test(r);
    const bounded = /Math\.min\(Math\.max\(Math\.round\(Number\(\(p && p\.days\)\) \|\| 3\), 1\), 14\)/.test(r);
    const nullKept = /auto: r\.auto == null \? null : \(Number\(r\.auto\) \? 1 : 0\)/.test(r);
    return sameGate && notPrefixed && readOnly && answers && bounded && nullKept;
  })(), null);

  t('trail: a read that fails says so, because on an evidence route a refused look and a quiet day must not read the same (regex over the real source)', (() => {
    const i = src.indexOf('  adsPeakTrail: {');
    const r = i < 0 ? '' : src.slice(i, src.indexOf('\n  },\n', i));
    /* and the one case it is written for: a database that never took the two columns the 28 Oct batch
       added answers nothing to the full query, and the second attempt leaves those two unknown. */
    return /const readErrors = \[\]/.test(r) && /readErrors\.push\(what \+ ': '/.test(r)
      && /read_errors: readErrors,/.test(r) && /q\('list \(without the two columns the 28 Oct batch added\)'/.test(r);
  })(), null);

  /* ================= THE PEAK-TIME OVERVIEW (owner's brief, 31 Oct, section 2) =================
     "Our Overview already exists. We need a replica of it on a smaller level, where the only focus
     is the listings that are playing on peak time." The section is the Overview's own blocks over
     one cohort, so what is tested here is the cohort rule itself, the four figures that are the
     cohort's own, and the two claims the whole thing rests on: one cache key per cohort, and one
     set of block functions both screens render through. */

  /* (a) the membership rule, which is the whole cohort */
  const PKE = (id, added, removed) => ({ item_id: id, added_day: added, removed_day: removed || '' });
  t('peak cohort: a listing counts FROM the day it joined and not the day before',
    F.adPeakInCohort(PKE('1', '2026-10-10'), '2026-10-10') === true && F.adPeakInCohort(PKE('1', '2026-10-10'), '2026-10-09') === false, null);
  t('peak cohort: it LEAVES on the day it was taken off, and the days before that stay in',
    F.adPeakInCohort(PKE('1', '2026-10-10', '2026-10-20'), '2026-10-19') === true &&
    F.adPeakInCohort(PKE('1', '2026-10-10', '2026-10-20'), '2026-10-20') === false &&
    F.adPeakInCohort(PKE('1', '2026-10-10', '2026-10-20'), '2026-10-21') === false, null);
  t('peak cohort: a row still on the list has no end, and a row with no join day is in no day at all',
    F.adPeakInCohort(PKE('1', '2026-10-10'), '2026-12-31') === true && F.adPeakInCohort(PKE('1', ''), '2026-10-10') === false, null);
  /* the one-hour-a-day trap: datetime('now') is UTC and the list is kept on a British clock */
  t('peak cohort: the join day is the UK day of the stamp, not its first ten characters',
    F.adPeakUkDayOf('2026-09-17 23:30:00') === '2026-09-18' && F.adPeakUkDayOf('2026-11-17 23:30:00') === '2026-11-17' &&
    F.adPeakUkDayOf('') === '' && F.adPeakUkDayOf('not a date') === '',
    [F.adPeakUkDayOf('2026-09-17 23:30:00'), F.adPeakUkDayOf('2026-11-17 23:30:00')]);
  t('peak cohort: an as-of stamp is the UK clock, and one nobody can read is null rather than midnight',
    F.adPeakUkClock('2026-09-17 23:30:00') === '00:30' && F.adPeakUkClock('2026-11-17 09:05:00') === '09:05' && F.adPeakUkClock('') === null,
    [F.adPeakUkClock('2026-09-17 23:30:00'), F.adPeakUkClock('')]);
  t('peak cohort: one entry per listing with the newest kept, a row with no join day left out, and unreadable hours saying why', (() => {
    const es = F.adPeakCohortEntries([
      { item_id: '111', account: 'A', hours: '17-23', auto: 1, added_at: '2026-10-10 09:00:00', removed_at: '' },
      { item_id: '111', account: 'A', hours: '09-12', auto: 1, added_at: '2026-09-01 09:00:00', removed_at: '' },
      { item_id: '222', account: 'B', hours: 'evenings please', auto: 1, added_at: '2026-10-01 09:00:00', removed_at: '2026-10-05 09:00:00' },
      { item_id: '333', account: 'B', hours: '10-11', auto: 0, added_at: '', removed_at: '' },
    ]);
    return es.length === 2 && es[0].item_id === '111' && es[0].added_day === '2026-10-10' && es[0].open === true &&
      es[0].ranges.length === 1 && es[0].ranges[0][0] === 17 &&
      es[1].item_id === '222' && es[1].removed_day === '2026-10-05' && es[1].open === false &&
      es[1].ranges.length === 0 && /not an hour range/.test(es[1].hours_problem);
  })(), F.adPeakCohortEntries([{ item_id: '111', hours: '17-23', auto: 1, added_at: '2026-10-10 09:00:00', removed_at: '' }]));
  t('peak cohort: the day filter is built from literals that can only ever hold digits and dates', (() => {
    const sql = F.adPeakCohortSql([
      { item_id: '123', added_day: '2026-10-01', removed_day: '' },
      { item_id: "oops'; DROP TABLE adtool_listing_day; --", added_day: '2026-10-01', removed_day: '' },
      { item_id: '456', added_day: 'yesterday', removed_day: '' },
      { item_id: '789', added_day: '2026-10-01', removed_day: 'whenever' },
    ]);
    return /pk_item/.test(sql) && sql.indexOf('123') >= 0 && sql.indexOf('DROP') < 0 &&
      sql.indexOf('456') < 0 && sql.indexOf('yesterday') < 0 && sql.indexOf('789') < 0;
  })(), F.adPeakCohortSql([{ item_id: '123', added_day: '2026-10-01', removed_day: '' }]));
  t('peak cohort: a list of six hundred is ONE json_each term, never a compound SELECT (D1 refused 94 UNION ALL terms on 31 Oct)', (() => {
    const sql = F.adPeakCohortSql(Array.from({ length: 600 }, (_, i) => ({ item_id: String(100000000000 + i), added_day: '2026-10-01', removed_day: i % 7 === 0 ? '2026-10-20' : '' })));
    return sql.indexOf('UNION ALL') < 0 && (sql.match(/json_each\(/g) || []).length === 1 && /pk_item/.test(sql) && /pk_from/.test(sql) && /pk_to/.test(sql) && sql.indexOf('100000000599') > 0 && sql.indexOf('2026-10-20') > 0;
  })(), null);
  t('peak cohort: an EMPTY list gives a table with no rows, never a filter that quietly vanished', (() => {
    const sql = F.adPeakCohortSql([]);
    const j = F.adPeakCohortJoin(sql, 'item_id', 'day');
    return /WHERE 1 = 0/.test(sql) && / JOIN /.test(j) && /pkc\.pk_item = item_id/.test(j) &&
      /day >= pkc\.pk_from/.test(j) && /day < pkc\.pk_to/.test(j);
  })(), F.adPeakCohortJoin(F.adPeakCohortSql([]), 'item_id', 'day'));
  t('peak cohort: the before window is each listing’s own 28 days up to the day it joined', (() => {
    const j = F.adPeakCohortBeforeJoin(F.adPeakCohortSql([{ item_id: '1', added_day: '2026-10-01', removed_day: '' }]), 'item_id', 'day', 28);
    /* the ON clause names only the join day and the day it joined: a row already taken off still
       had the days before it joined, so the removal day has no part in the before window. */
    const on = j.slice(j.indexOf(' pkc ON '));
    return /date\(pkc\.pk_from, '-28 day'\)/.test(j) && /day < pkc\.pk_from/.test(j) && on.indexOf('pk_to') < 0;
  })(), null);

  /* (b) the hours on and off today, in listing-hours */
  const PKH = (id, hours, auto) => F.adPeakCohortEntry({ item_id: id, hours: hours, auto: auto, added_at: '2026-10-01 09:00:00', removed_at: '' });
  t('peak hours: at 12:30 none of a 17-23 listing’s six hours has run and all six are still to come', (() => {
    const H = F.adPeakHoursToday([PKH('1', '17-23', 1)], { hour: 12, minute: 30 });
    return H.on_elapsed === 0 && H.off_elapsed === 12.5 && H.on_planned === 6 && H.off_planned === 5.5 && H.listings === 1;
  })(), F.adPeakHoursToday([PKH('1', '17-23', 1)], { hour: 12, minute: 30 }));
  t('peak hours: at 20:00 three of the six have run and three are still to come', (() => {
    const H = F.adPeakHoursToday([PKH('1', '17-23', 1)], { hour: 20, minute: 0 });
    return H.on_elapsed === 3 && H.on_planned === 3 && H.off_elapsed === 17 && H.off_planned === 1;
  })(), F.adPeakHoursToday([PKH('1', '17-23', 1)], { hour: 20, minute: 0 }));
  t('peak hours: on and off add back up to the whole of today for every listing counted, a stretch across midnight included', (() => {
    const H = F.adPeakHoursToday([PKH('1', '17-23', 1), PKH('2', '22-02', 1)], { hour: 9, minute: 15 });
    return H.listings === 2 && Math.abs(H.on_elapsed + H.off_elapsed - 2 * 9.25) < 0.001 &&
      Math.abs(H.on_planned + H.off_planned - 2 * (24 - 9.25)) < 0.001 && H.on_elapsed === 2;
  })(), F.adPeakHoursToday([PKH('1', '17-23', 1), PKH('2', '22-02', 1)], { hour: 9, minute: 15 }));
  t('peak hours: a row left to a person and a row with hours we cannot read are both left out, and counted apart', (() => {
    const H = F.adPeakHoursToday([PKH('1', '17-23', 0), PKH('2', 'evenings', 1), PKH('3', '17-23', 1)], { hour: 6, minute: 0 });
    return H.listings === 1 && H.listings_left_to_a_person === 1 && H.listings_without_readable_hours === 1;
  })(), F.adPeakHoursToday([PKH('1', '17-23', 0), PKH('2', 'evenings', 1), PKH('3', '17-23', 1)], { hour: 6, minute: 0 }));

  /* (c) orders inside and outside a listing’s own hours */
  t('peak sales: inside counts in, outside counts out, and the hour a stretch STOPS on is outside it', (() => {
    const es = [F.adPeakCohortEntry({ item_id: '1', hours: '17-23', auto: 1, added_at: '2026-10-10 09:00:00', removed_at: '' })];
    const r = F.adPeakSalesSplit({ rows: [
      { item_id: '1', day: '2026-10-20', hour: 17, orders: 1, units: 1 },
      { item_id: '1', day: '2026-10-20', hour: 23, orders: 1, units: 2 },
      { item_id: '1', day: '2026-10-20', hour: 16, orders: 1, units: 1 },
    ], entries: es, windows: [{ key: 'w', from: '2026-10-20', to: '2026-10-20' }] });
    const w = r.windows.w;
    return w.in_orders === 1 && w.in_units === 1 && w.out_orders === 2 && w.out_units === 3 && r.listings_counted === 1;
  })(), null);
  t('peak sales: a day before the listing joined, and the day it was taken off, do not count at all', (() => {
    const es = [F.adPeakCohortEntry({ item_id: '1', hours: '17-23', auto: 1, added_at: '2026-10-10 09:00:00', removed_at: '2026-10-15 09:00:00' })];
    const r = F.adPeakSalesSplit({ rows: [
      { item_id: '1', day: '2026-10-09', hour: 18, orders: 1, units: 1 },
      { item_id: '1', day: '2026-10-10', hour: 18, orders: 1, units: 1 },
      { item_id: '1', day: '2026-10-15', hour: 18, orders: 1, units: 1 },
    ], entries: es, windows: [{ key: 'w', from: '2026-10-01', to: '2026-10-31' }] });
    return r.windows.w.in_orders === 1 && r.rows_outside_the_cohort === 2;
  })(), null);
  t('peak sales: a listing whose hours cannot be read is left out, never counted as selling outside hours it never had', (() => {
    const es = [F.adPeakCohortEntry({ item_id: '1', hours: 'evenings', auto: 1, added_at: '2026-10-01 09:00:00', removed_at: '' })];
    const r = F.adPeakSalesSplit({ rows: [{ item_id: '1', day: '2026-10-20', hour: 18, orders: 1, units: 1 }], entries: es, windows: [{ key: 'w', from: '2026-10-01', to: '2026-10-31' }] });
    return r.windows.w.in_orders === 0 && r.windows.w.out_orders === 0 && r.listings_counted === 0 && r.listings_without_readable_hours === 1;
  })(), null);

  /* (d) the money no longer spent outside the hours */
  t('peak avoided: each listing is its own money per day, and before minus now is the figure', (() => {
    const r = F.adPeakAvoided({ listings: [
      { item_id: '1', off_spend_now: 7, days_now: 7, off_spend_before: 56, days_before: 28 },
      { item_id: '2', off_spend_now: 4, days_now: 4, off_spend_before: 28, days_before: 14 },
    ] });
    return r.now_per_day === 2 && r.before_per_day === 4 && r.avoided_per_day === 2 &&
      r.listings_with_before_data === 2 && r.days_observed_before === 28;
  })(), F.adPeakAvoided({ listings: [{ item_id: '1', off_spend_now: 7, days_now: 7, off_spend_before: 56, days_before: 28 }] }));
  t('peak avoided: a listing with nothing from before is out of the comparison, and the whole list’s own figure still stands', (() => {
    const r = F.adPeakAvoided({ listings: [
      { item_id: '1', off_spend_now: 7, days_now: 7, off_spend_before: 56, days_before: 28 },
      { item_id: '2', off_spend_now: 10, days_now: 5, off_spend_before: null, days_before: 0 },
    ] });
    return r.now_per_day === 3 && r.now_per_day_compared === 1 && r.before_per_day === 2 &&
      r.avoided_per_day === 1 && r.listings_with_before_data === 1 && r.listings === 2;
  })(), null);
  t('peak avoided: no before-data at all is null and never a nought', (() => {
    const r = F.adPeakAvoided({ listings: [{ item_id: '1', off_spend_now: 7, days_now: 7, off_spend_before: null, days_before: 0 }] });
    return r.before_per_day === null && r.avoided_per_day === null && r.days_observed_before === null &&
      r.now_per_day === 1 && /nothing to compare/.test(r.note);
  })(), F.adPeakAvoided({ listings: [{ item_id: '1', off_spend_now: 7, days_now: 7, off_spend_before: null, days_before: 0 }] }));

  /* (e) the check the page prints */
  t('peak reconcile: equal to the penny passes, a penny out fails, and either side unknown is neither', (() => {
    const ok = F.adPeakReconcile({ today_spend_cohort: 12.34, today_spend_sum_of_listings: 12.34, period_spend_cohort: 500, period_spend_sum: 500 });
    const bad = F.adPeakReconcile({ today_spend_cohort: 12.34, today_spend_sum_of_listings: 12.35, period_spend_cohort: 500, period_spend_sum: 500 });
    const un = F.adPeakReconcile({ today_spend_cohort: 12.34, today_spend_sum_of_listings: null, period_spend_cohort: 500, period_spend_sum: 500 });
    return ok.equal === true && ok.equal2 === true && ok.difference === 0 &&
      bad.equal === false && bad.difference === -0.01 &&
      un.equal === null && un.difference === null && un.equal2 === true;
  })(), null);

  /* (f) ONE CACHE KEY PER COHORT. A cohort answer served to a reader who asked for the whole fleet
     is the one fault here that would look exactly like a correct page. */
  t('peak cohort: the cohort is part of the cache key for both actions, and is never folded away', (() => {
    const a1 = F.adtKvKey('adtoolPlan', 'p', { period: 'd30' });
    const b1 = F.adtKvKey('adtoolPlan', 'p', { period: 'd30', cohort: 'peak' });
    const a2 = F.adtKvKey('adtoolCommand', 'p', {});
    const b2 = F.adtKvKey('adtoolCommand', 'p', { cohort: 'peak' });
    const a3 = F.adtKvKey('adtoolPlan', 'p', { period: 'd30', account: 'X', cohort: 'peak' });
    const canon = F.adtKvCanon('adtoolPlan', { period: 'd30', cohort: 'peak' });
    return a1 !== b1 && a2 !== b2 && b1 !== a3 && canon.cohort === 'peak' && Object.keys(canon).length === 1;
  })(), [F.adtKvKey('adtoolPlan', 'p', { period: 'd30' }), F.adtKvKey('adtoolPlan', 'p', { period: 'd30', cohort: 'peak' })]);
  t('peak cohort: both actions take the cohorts they know, refuse any other, and narrow by ONE join (regex over the real source)', (() => {
    /* 31 Oct, §4: a second cohort joined these two actions, so the refusal and the read now name both
       and the list of them lives in one place. The guarantee is the same one: an unknown cohort is
       refused rather than quietly answered for the whole fleet. */
    const refuse = (src.match(/if \(cohort && ADTOOL_COHORTS\.indexOf\(cohort\) < 0\) throw new Error\('SAY: the cohorts this answer knows are ' \+ ADTOOL_COHORT_WORDS\);/g) || []).length === 2;
    const read = (src.match(/const CO = cohort === 'peak' \? await adPeakCohortRead\(env, acct\) : cohort === 'video' \? await adVideoCohortRead\(env, acct\) : null;/g) || []).length === 2;
    const join = (src.match(/const coJoin = \(itemCol, dayCol\) => CO \? adPeakCohortJoin\(CO\.sql, itemCol, dayCol\) : '';/g) || []).length === 2;
    /* and the today grain gets the item list rather than a day rule it has no day column for */
    const today = /await adtoolTodayCompute\(env, \{ account: acct, cohort_items: coToday \}\)/.test(src);
    const extras = /peak_extras: peakExtras, reconcile: reconcile,/.test(src);
    return refuse && read && join && today && extras;
  })(), null);
  t('peak cohort: the tiles, the per-listing rows, the day rows and today’s orders are ALL narrowed, so none of them can answer for the fleet (regex over the real source)', (() => {
    const tiles = /FROM adtool_listing_day' \+ coJoin\('item_id', 'day'\) \+ ' WHERE day >= \?1 AND day <= \?2'/.test(src);
    const back = /FROM adtool_listing_day' \+ coJoin\('item_id', 'day'\) \+ ' WHERE day >= \?1 AND day <= \?2 AND item_id IN \(/.test(src);
    const days = /FROM adtool_listing_day' \+ coJoin\('item_id', 'day'\) \+ ' WHERE day >= \?1 AND day <= \?2' \+ \(acct \? ' AND account = \?3' : ''\) \+ ' GROUP BY day ORDER BY day'/.test(src);
    const orders = /FROM orders WHERE created_at >= \?1 AND status <> 'CANCELLED'" \+ aw\.replace\('\?', '\?2'\) \+ coIn\('item_id'\)/.test(src);
    const planRows = (src.match(/coJoin\('d\.item_id', 'd\.day'\)/g) || []).length === 4;
    const caps = /coJoin\('c\.item_id', 'c\.day'\)/.test(src) && /adtool_cap_days' \+ coJoin\('item_id', 'day'\)/.test(src);
    return tiles && back && days && orders && planRows && caps;
  })(), null);

  /* (g) ONE SET OF BLOCKS. The section is the Overview or it is a fork, and this is the difference. */
  t('overview: the page renders THROUGH adtOverviewBlocks, so the Peak-time overview draws the same blocks (regex over the real file)', (() => {
    const ov = readFile('frontend/view-adtool-overview.js');
    const exported = /window\.adtOverviewBlocks = \{\n\s*hero: heroBlock, today: todayBlock, hourly: hourBlock,\n\s*byAccount: accountBlock, slots: slotBlock, foot: footBlock,\n\s*\};/.test(ov);
    const heroThrough = /\$\('ovHero'\)\.innerHTML = window\.adtOverviewBlocks\.hero\(OV\.plan\);/.test(ov);
    const todayThrough = /var B = window\.adtOverviewBlocks;\n\s*\$\('ovToday'\)\.innerHTML = B\.today\(D\) \+ B\.byAccount\(D\) \+ B\.slots\(D\) \+ B\.hourly\(D(?:, \{ picker: true \})?\) \+ B\.foot\(D\);/.test(ov);
    /* and the old straight-line render is gone, so there is no way past the blocks */
    const noBypass = !/statusBlock\(D\) \+ tilesBlock\(D\) \+ accountBlock\(D\)/.test(ov);
    return exported && heroThrough && todayThrough && noBypass;
  })(), null);
  t('peak: the Peak-time overview draws those same blocks from the cohort answers and keeps its own class prefix (regex over the real file)', (() => {
    const pk = readFile('frontend/view-adtool-peak.js');
    const code = pk.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = /B\.today\(PK\.pkoCmd\) \+ B\.byAccount\(PK\.pkoCmd\) \+ B\.slots\(PK\.pkoCmd\) \+ B\.hourly\(PK\.pkoCmd\) \+ B\.foot\(PK\.pkoCmd\)/.test(pk);
    const hero = /B\.hero\(PK\.pkoPlan\)/.test(pk);
    const asks = /api\('adtoolCommand', PK\.account \? \{ account: PK\.account, cohort: 'peak' \} : \{ cohort: 'peak' \}\)/.test(pk) && /q\.cohort = 'peak';/.test(pk);
    const shared = /window\.adtOverviewBlocks/.test(pk);
    /* it may RENDER the other file's blocks, but it must not write that file's classes itself */
    const ownPrefix = code.indexOf('.ov-') < 0 && /'\.pkt-kpis\{/.test(code);
    return blocks && hero && asks && shared && ownPrefix;
  })(), null);
  t('peak: every new tile carries an explainer label the shell has a pattern for, and that pattern reaches its own register row', (() => {
    if (!regMap) return false;
    const pk = readFile('frontend/view-adtool-peak.js');
    const want = { 'listings on peak': 'PEAK_COHORT_LISTINGS', 'hours on and off': 'PEAK_HOURS_ON_OFF', 'spend avoided': 'PEAK_SPEND_AVOIDED', 'sales in and out of the peak': 'PEAK_SALES_IN_OUT' };
    /* the four labels travel into reg() through pkoTile, so what has to be true is that each label
       is written in this file and that the shell's FIRST matching pattern reaches its own row. */
    const viaReg = /reg\(regLabel, 'how'\)/.test(pk);
    return viaReg && Object.keys(want).every(l => {
      if (pk.indexOf("'" + l + "'") < 0) return false;
      const row = regMap.filter(r => r[0].test(l))[0];
      return !!row && row[1].indexOf(want[l]) >= 0;
    });
  })(), regMapFail);
  t('peak: the freshness badge reads both thresholds off the answer, and neither is typed into the page', (() => {
    const pk = readFile('frontend/view-adtool-peak.js');
    const reads = /var amber = num\(rules && rules\.amber_min\), red = num\(rules && rules\.red_min\);/.test(pk);
    const fromPayload = /X\.freshness_rules \|\| D\.freshness_rules \|\| null/.test(pk);
    /* 31 Oct §5: the pair is no longer a constant repeated on five payloads. One law, one helper,
       and the figures themselves live in the settings store. */
    const engineHasThem = /const ADTOOL_FRESH_DEFAULTS = \{ amber_min: 15, red_min: 60 \};/.test(src) &&
      F.ADTOOL_FRESH_DEFAULTS.amber_min === 15 && F.ADTOOL_FRESH_DEFAULTS.red_min === 60 &&
      !/ADTOOL_PEAK_FRESHNESS_RULES/.test(src);
    const notTyped = !/amber_min: *\d/.test(pk) && !/red_min: *\d/.test(pk);
    return reads && fromPayload && engineHasThem && notTyped;
  })(), null);
  t('peak: a tile opens the listings behind it through the portal’s one listing cell, so every row keeps its History link', (() => {
    const pk = readFile('frontend/view-adtool-peak.js');
    return /data-pkolist=/.test(pk) && /adtProductCell\(r\)/.test(pk) && /PKO_LISTS/.test(pk) &&
      /all: \[/.test(pk) && /switching: \[/.test(pk) && /avoided: \[/.test(pk) && /sales: \[/.test(pk);
  })(), null);
  t('peak: the page says in words what eBay does not give us, and the words come from the engine (regex over both)', (() => {
    const pk = readFile('frontend/view-adtool-peak.js');
    const page = /not_from_ebay/.test(pk) && /What eBay does not give us/.test(pk);
    const engine = /not_from_ebay: \[/.test(src) && /eBay publishes no ad spend by hour at all/.test(src) &&
      /eBay does not say which hour a click or an ad-attributed sale happened in/.test(src);
    return page && engine;
  })(), null);

  /* (h) the key-authed probe, so the acceptance check can be printed without a browser */
  t('probe: adsPeakOverviewProbe is key-authed exactly as backupDump is, is not adtool-prefixed, and prints the acceptance check (regex over the real source)', (() => {
    const i = src.indexOf('  adsPeakOverviewProbe: {');
    const r = i < 0 ? '' : src.slice(i, src.indexOf('\n  },\n', i));
    const sameGate = /^  adsPeakOverviewProbe: \{\n    auth: 'sync',/m.test(src) && /^  backupDump: \{\n    auth: 'sync',/m.test(src);
    /* the router role-gates every action whose name starts with adtool before it has a user to judge,
       and a key-authed call has none, so this one deliberately does not carry that prefix */
    const notPrefixed = r.length > 1500 && 'adsPeakOverviewProbe'.indexOf('adtool') !== 0;
    const windows = /line\('today'/.test(r) && /line\('d7'/.test(r) && /line\('d28'/.test(r);
    const answers = /acceptance: acceptance,/.test(r) && /reconcile: cmdCohort \? cmdCohort\.reconcile : null,/.test(r) &&
      /peak_extras: cmdCohort \? cmdCohort\.peak_extras : null,/.test(r) && /sent_to_ebay: false,/.test(r);
    const sameCode = /ROUTES\[action\]/.test(r) && /\(r\.raw \|\| r\.fn\)\(payload, sub\)/.test(r) && /cohort: 'peak'/.test(r);
    const stripped = /adtStripCollectiveProfit\(JSON\.parse\(JSON\.stringify\(d\)\), \{ keepCollective: false \}\)/.test(r);
    const errors = /const readErrors = \[\]/.test(r) && /read_errors: readErrors,/.test(r);
    return sameGate && notPrefixed && windows && answers && sameCode && stripped && errors;
  })(), null);

  /* THE CRON PIN. A slot written in the worker and never registered on Cloudflare never fires, and
     nothing in the build can see the difference: engine/crons.json is the list the engine guard
     registers, and this is the only place the two are ever compared. */
  t('crons: engine/crons.json holds exactly the slots of the worker\'s own cron map (real source, real file)', (() => {
    let file = null;
    try { file = JSON.parse(readFile('engine/crons.json')); } catch (e) { file = null; }
    const i = src.indexOf('function cronMap() {');
    const block = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)).replace(/\/\*[\s\S]*?\*\//g, '');
    const keys = (block.match(/'[^']+':\s*\[/g) || []).map(s => s.slice(1, s.indexOf("':")));
    const inFile = (file && Array.isArray(file.crons)) ? file.crons.map(String) : null;
    if (!inFile || keys.length < 15) return false;
    const missing = keys.filter(k => inFile.indexOf(k) < 0), extra = inFile.filter(k => keys.indexOf(k) < 0);
    const dupe = inFile.length !== new Set(inFile).size || keys.length !== new Set(keys).size;
    return !missing.length && !extra.length && !dupe && keys.length === inFile.length;
  })(), (() => {
    let file = null; try { file = JSON.parse(readFile('engine/crons.json')); } catch (e) {}
    const i = src.indexOf('function cronMap() {');
    const block = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)).replace(/\/\*[\s\S]*?\*\//g, '');
    const keys = (block.match(/'[^']+':\s*\[/g) || []).map(s => s.slice(1, s.indexOf("':")));
    return { in_worker: keys.length, in_file: file && file.crons ? file.crons.length : null };
  })());
  t('crons: the peak switch has one slot of its own, and it is the quarter-hour slot a minute past (real source)', (() => {
    const i = src.indexOf('function cronMap() {');
    const block = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)).replace(/\/\*[\s\S]*?\*\//g, '');
    const slots = (block.match(/'[^']+':\s*\[[^\]]*adtoolPeakSwitch[^\]]*\]/g) || []);
    return slots.length === 1 && slots[0].indexOf("'1-59/15 * * * *'") === 0 && /\[adtoolPeakSwitch\]/.test(slots[0]);
  })(), null);
  t('crons: the map has ONE home, read by the handler and by the trail route rather than copied (real source)', /const jobs = cronMap\(\);/.test(src) && (src.match(/function cronMap\(\) \{/g) || []).length === 1 && /const map = cronMap\(\);/.test(src), null);

  /* ===== §3 of the 31 Oct brief: the 24-hour pattern engine and the dead-hour switch-off =====
     The owner: "take the 24-hour span of the day and what happened in it; if the listing is playing on
     the same methodology today, keep it on the same 24-hour pattern; at the times where it is not
     driving any sales at all, switch it off."
     Every rule below is a pure function, so the two things that could cost real money — an hour switched
     off that sells, and an ad sent for a listing nobody armed — are fixtures rather than hopes. */
  const pkToday = '2026-10-30';                       // a Friday; 2026-10-31 is the Saturday after it
  const pkDay = (n) => F.adtAddDays(pkToday, -n);
  /* one listing's hourly rows: typed hours 09-23, selling in the evening and in the nine o'clock hour,
     spending and never selling through the afternoon. The afternoon is the dead stretch, and it is a
     different part of the day from the evening its sales come from, which is what lets it be dead at
     all: an hour inside a proven slot is never switched off. */
  const pkRows = (nDays, opts) => {
    const o = opts || {}, out = [];
    for (let d = 1; d <= nDays; d++) {
      const day = pkDay(d);
      for (const h of [9]) out.push({ day: day, hour: h, orders: 1, units: 1, revenue: 10, spend: 0.4, clicks: 3, impressions: 90 });
      for (const h of [12, 13, 14, 15, 16]) out.push({ day: day, hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4, impressions: 120 });
      for (const h of (o.evening || [17, 18, 19, 20, 21, 22])) out.push({ day: day, hour: h, orders: 3, units: 3, revenue: 30, spend: 0.6, clicks: 5, impressions: 140 });
      for (const h of (o.quiet_evening || [])) out.push({ day: day, hour: h, orders: 0, units: 0, revenue: 0, spend: 0.6, clicks: 5, impressions: 140 });
    }
    return out;
  };
  const pkRules = F.adPeakPlanRules({});
  t('§3 defaults: the seven figures are the owner’s own, and each is read from portal_config and never typed into a sentence',
    pkRules.lookback_days === 28 && pkRules.min_days === 14 && pkRules.dead_min_clicks === 5 && pkRules.proven_share === 60 &&
    pkRules.proven_min_orders === 5 && pkRules.min_block_h === 2 && pkRules.plan_time === '23:30' && pkRules.proven_share_of_one === 0.6 &&
    F.ADTOOL_PEAK_PLAN_CONFIG_KEYS.lookback_days === 'adtool_peak_lookback_days' && F.ADTOOL_PEAK_PLAN_CONFIG_KEYS.plan_time === 'adtool_peak_plan_time' &&
    F.ADTOOL_PEAK_PLAN_CONFIG_KEYS.proven_min_orders === 'adtool_peak_proven_min_orders', pkRules);
  t('§3 defaults: a manager’s own figures are taken, a mistyped share is held to the range it means something in, a floor of nought is a floor switched off on purpose, and a plan time that is not a time falls back',
    (() => {
      const r = F.adPeakPlanRules({ adtool_peak_lookback_days: '14', adtool_peak_min_days: '7', adtool_peak_dead_min_clicks: '0', adtool_peak_proven_share: '140', adtool_peak_proven_min_orders: '12', adtool_peak_min_block_h: '3', adtool_peak_plan_time: 'half eleven' });
      return r.lookback_days === 14 && r.min_days === 7 && r.dead_min_clicks === 0 && r.proven_share === 100 && r.proven_min_orders === 12 &&
        r.min_block_h === 3 && r.plan_time === '23:30' &&
        F.adPeakPlanRules({ adtool_peak_proven_min_orders: '0' }).proven_min_orders === 0 &&
        F.adPeakPlanRules({ adtool_peak_proven_min_orders: 'five' }).proven_min_orders === 5;
    })(), F.adPeakPlanRules({ adtool_peak_proven_share: '140', adtool_peak_plan_time: 'half eleven' }));

  const pk20 = F.adPeakProfile(pkRows(20), { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 });
  t('§3 profile: the 24-hour span is read per hour, with the days behind each hour counted as real days',
    pk20.hours.length === 24 && pk20.days_observed === 20 && pk20.hours[13].days_observed === 20 &&
    pk20.hours[13].days_with_spend === 20 && pk20.hours[13].days_with_sales === 0 &&
    pk20.hours[18].days_with_sales === 20 && pk20.hours[2].days_observed === 0,
    [pk20.days_observed, pk20.hours[13].days_with_sales, pk20.hours[18].days_with_sales]);
  t('§3 profile: today is kept OUT of the pattern and answered on its own, because a part day reads as quiet in every hour the clock has not reached',
    (() => {
      const withToday = F.adPeakProfile(pkRows(20).concat([{ day: pkToday, hour: 18, orders: 9, units: 9, revenue: 90, spend: 1, clicks: 9 }]), { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 });
      return withToday.days_observed === 20 && withToday.hours[18].orders_raw === pk20.hours[18].orders_raw &&
        withToday.today[18].orders_raw === 9 && withToday.today_day === pkToday && pk20.today_day === null;
    })(), null);
  t('§3 profile: the weekday weighting is the owner’s own — the same weekday’s last four occurrences count double, the last seven days count double, and a day that is both counts four times',
    (() => {
      const rows = [
        { day: '2026-10-03', hour: 10, orders: 1, units: 1, revenue: 9, spend: 0.2, clicks: 1 },   // Sat
        { day: '2026-10-10', hour: 10, orders: 1, units: 1, revenue: 9, spend: 0.2, clicks: 1 },   // Sat
        { day: '2026-10-17', hour: 10, orders: 1, units: 1, revenue: 9, spend: 0.2, clicks: 1 },   // Sat
        { day: '2026-10-24', hour: 10, orders: 1, units: 1, revenue: 9, spend: 0.2, clicks: 1 },   // Sat, and inside the last 7 days
        { day: '2026-10-20', hour: 10, orders: 1, units: 1, revenue: 9, spend: 0.2, clicks: 1 },   // Tue, neither
      ];
      const p = F.adPeakProfile(rows, { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 });
      return p.for_weekday === 'Sat' && p.weekday_weighting_used === true &&
        p.weekday_days_doubled.join(',') === '2026-10-03,2026-10-10,2026-10-17,2026-10-24' &&
        p.hours[10].orders_raw === 5 && p.hours[10].orders === 11 && p.hours[10].days_observed === 5 && p.hours[10].weight === 11;
    })(), (() => { const p = F.adPeakProfile([{ day: '2026-10-24', hour: 10, orders: 1 }], { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 }); return [p.hours[10].orders, p.hours[10].orders_raw, p.weekday_days_doubled]; })());
  t('§3 profile: a day outside the window is not read at all, however many rows are handed over',
    (() => {
      const p = F.adPeakProfile([{ day: '2026-01-01', hour: 10, orders: 50 }, { day: pkDay(1), hour: 10, orders: 1 }], { today: pkToday, for_day: pkToday, lookback_days: 28 });
      return p.days_observed === 1 && p.hours[10].orders_raw === 1;
    })(), null);

  const pkDead20 = F.adPeakDeadHours(pk20, pkRules);
  t('§3 dead hours: the afternoon it spends in and never sells in is dead, as one stretch, and the hours with no reading at all are not',
    pkDead20.dead.join(',') === '12,13,14,15,16' && pkDead20.windows.length === 1 &&
    pkDead20.windows[0].from === 12 && pkDead20.windows[0].to === 17 && pkDead20.windows[0].hours === 5 &&
    pkDead20.dead.indexOf(2) < 0 && /no reading for this hour/.test(pkDead20.why[2]), [pkDead20.dead, pkDead20.windows]);
  t('§3 dead hours: the part of the day its sales come from is PROVEN and never switched off, however quiet one hour inside it looks',
    (() => {
      /* the same listing, with eight o'clock in the evening spending and selling nothing. The evening
         still holds nearly all of its sales, so that hour is kept and the reason says why. */
      const p = F.adPeakProfile(pkRows(20, { evening: [17, 18, 19, 21, 22], quiet_evening: [20] }), { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 });
      const d = F.adPeakDeadHours(p, pkRules);
      return p.hours[20].days_with_sales === 0 && p.hours[20].days_with_spend === 20 &&
        d.proven_slots.join(',') === '3' && d.proven_slot_names.join(',') === 'evening' &&
        d.dead.indexOf(20) < 0 && /never switched off/.test(d.why[20]) && d.dead.join(',') === '12,13,14,15,16';
    })(), null);
  t('§3 dead hours: a stretch shorter than the minimum block is left running, because switching twice for one hour costs a send and buys nothing',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        const day = pkDay(d);
        rows.push({ day: day, hour: 13, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });   // the only dead hour
        for (const h of [9, 12, 14, 15, 16]) rows.push({ day: day, hour: h, orders: 1, units: 1, revenue: 10, spend: 0.4, clicks: 3 });
        for (const h of [17, 18, 19]) rows.push({ day: day, hour: h, orders: 1, units: 1, revenue: 10, spend: 0.4, clicks: 3 });
      }
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), pkRules);
      return d.dead.join(',') === '13' && d.windows.length === 0 && d.windows_found.length === 1 &&
        d.windows_dropped.length === 1 && d.windows_dropped[0].hours === 1 && /too short a stretch/.test(d.adjustments.join(' '));
    })(), null);
  t('§3 dead hours: one order in one hour on one day of the window keeps that hour, because an hour that sells occasionally is an hour that sells',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        const day = pkDay(d);
        for (const h of [13, 14]) rows.push({ day: day, hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });
        for (const h of [17, 18]) rows.push({ day: day, hour: h, orders: 2, units: 2, revenue: 20, spend: 0.5, clicks: 4 });
      }
      rows.push({ day: pkDay(11), hour: 14, orders: 1, units: 1, revenue: 9, spend: 0.5, clicks: 4 });
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), pkRules);
      return d.dead.indexOf(14) < 0 && d.dead.indexOf(13) >= 0 && /has sold in this hour/.test(d.why[14]);
    })(), null);
  t('§3 dead hours: an hour that never spent anything and drew too few clicks is not dead either, having no waste to cut',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        rows.push({ day: pkDay(d), hour: 3, orders: 0, units: 0, revenue: 0, spend: 0, clicks: 0 });
        for (const h of [17, 18]) rows.push({ day: pkDay(d), hour: h, orders: 2, units: 2, revenue: 20, spend: 0.5, clicks: 4 });
      }
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), pkRules);
      return d.dead.indexOf(3) < 0 && /no waste in it to cut/.test(d.why[3]);
    })(), null);
  t('§3 dead hours: a dead stretch over midnight is ONE stretch and not two halves each too short to count',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        for (const h of [23, 0]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });
        for (const h of [12, 13]) rows.push({ day: pkDay(d), hour: h, orders: 2, units: 2, revenue: 20, spend: 0.5, clicks: 4 });
      }
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), pkRules);
      return d.windows.length === 1 && d.windows[0].from === 23 && d.windows[0].to === 1 && d.windows[0].hours === 2;
    })(), null);
  t('§3 dead hours: a running gap too short to stand between two dead stretches is swallowed where nothing in it has ever sold, and WIDENED where it sells, by giving an hour back rather than dropping both stretches (31 Oct finding F2)',
    (() => {
      /* two dead stretches of four hours with a three-hour gap between them and a minimum block of four.
         The gap is not DEAD, because touching dead hours are already one window: its hours have simply
         never sold, for one of the other reasons. Switching the ad on through them buys nothing.
         Where the gap DOES sell, the hour that sells is the one thing that must not be touched, so the
         gap is widened to the block instead: the cheapest dead hour beside it comes back, and what is
         left of each stretch is applied if it is still a block in its own right. Until 31 Oct this case
         dropped both stretches, which left every one of the eight dead hours running. */
      const build = gap => {
        const rows = [];
        for (let d = 1; d <= 20; d++) {
          for (const h of [0, 1, 2, 3, 7, 8, 9, 10]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });
          if (gap === 'sells') for (const h of [4, 5, 6]) rows.push({ day: pkDay(d), hour: h, orders: 1, units: 1, revenue: 9, spend: 0.5, clicks: 4 });
          if (gap === 'free') for (const h of [4, 5, 6]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0, clicks: 0 });
          /* 'unread' leaves the gap with no row at all */
          for (const h of [18, 19]) rows.push({ day: pkDay(d), hour: h, orders: 40, units: 40, revenue: 400, spend: 0.5, clicks: 4 });
        }
        return F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), { dead_min_clicks: 5, proven_share: 60, min_block_h: 4 });
      };
      const unread = build('unread'), free = build('free'), sells = build('sells');
      const one = d => d.windows.length === 1 && d.windows[0].from === 0 && d.windows[0].to === 11 && d.windows[0].hours === 11 && /run as one/.test(d.adjustments.join(' '));
      return one(unread) && one(free) && unread.dead.join(',') === '0,1,2,3,7,8,9,10' &&
        sells.given_back.join(',') === '3' &&
        sells.windows.length === 1 && sells.windows[0].from === 7 && sells.windows[0].to === 11 && sells.windows[0].hours === 4 &&
        sells.windows_applied === sells.windows &&
        sells.windows_dropped.length === 1 && sells.windows_dropped[0].from === 0 && sells.windows_dropped[0].to === 3 &&
        /03:00 is given back/.test(sells.adjustments.join(' ')) && /left running as well/.test(sells.adjustments.join(' ')) &&
        !/neither stretch either side/.test(sells.adjustments.join(' '));
    })(), null);
  /* the owner's worked example of the new rule, on the shape the live probe found: a stretch of dead
     evening hours with one hour at each end of it that sells, inside hours that reach midnight. */
  const pkGiveBack = (() => {
    const perDay = { 18: 2.85, 19: 1.63, 20: 2.54, 21: 3.38, 22: 4.85 };
    const rows = [];
    for (let d = 1; d <= 22; d++) {
      /* the morning and the afternoon, so no one part of the day holds the share and the evening is not
         proven: whether these hours are dead is not what this fixture is about. 10 and 11 spend and
         never sell, and lie OUTSIDE the typed hours. */
      rows.push({ day: pkDay(d), hour: 9, orders: d <= 8 ? 1 : 0, units: d <= 8 ? 1 : 0, revenue: 11, spend: 0.9, clicks: 3 });
      for (const h of [10, 11]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.8, clicks: 3 });
      rows.push({ day: pkDay(d), hour: 14, orders: d <= 8 ? 1 : 0, units: d <= 8 ? 1 : 0, revenue: 11, spend: 0.9, clicks: 3 });
      /* the evening: 17 and 23 sell, 18 to 22 spend every day and have never once sold */
      rows.push({ day: pkDay(d), hour: 17, orders: d <= 6 ? 1 : 0, units: d <= 6 ? 1 : 0, revenue: 12, spend: 1.2, clicks: 4 });
      for (const h of [18, 19, 20, 21, 22]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: perDay[h], clicks: 6 });
      rows.push({ day: pkDay(d), hour: 23, orders: d <= 6 ? 1 : 0, units: d <= 6 ? 1 : 0, revenue: 12, spend: 1.1, clicks: 4 });
    }
    const prof = F.adPeakProfile(rows, { today: pkToday, for_day: '2026-10-31', lookback_days: 28, recent_days: 7 });
    const typed = F.adPeakHoursParse('17-00').ranges;
    return {
      profile: prof, typed: typed,
      dead: F.adPeakDeadHours(prof, Object.assign({}, pkRules, { typed_ranges: typed })),
      blind: F.adPeakDeadHours(prof, pkRules),
    };
  })();
  t('§3 dead hours: the owner’s worked example — dead 18-23 with one sale at 17 and one at 23 gives ON 17-19, OFF 19-22 and ON 22-00, with the hour given back at each end named (31 Oct finding F2)',
    (() => {
      const d = pkGiveBack.dead, p = pkGiveBack.profile;
      const sch = F.adPeakSchedule({ typed_ranges: pkGiveBack.typed, dead_windows: d.windows, hold: 'auto', min_days_ok: p.days_observed >= pkRules.min_days, tracking: true });
      const on = [];
      for (let h = 0; h < 24; h++) if (sch.states[h] === 'ON' && (h === 0 || sch.states[h - 1] !== 'ON')) { let e = h; while (e < 24 && sch.states[e] === 'ON') e++; on.push(h + '-' + e); }
      return p.days_observed === 22 && d.dead.join(',') === '10,11,18,19,20,21,22' &&
        d.windows_found.map(w => w.from + '-' + w.to).join(',') === '10-12,18-23' &&
        d.windows.length === 1 && d.windows[0].from === 19 && d.windows[0].to === 22 && d.windows[0].hours === 3 &&
        d.windows[0].given_back.join(',') === '18,22' && d.given_back.join(',') === '18,22' &&
        /18:00 is given back/.test(d.adjustments.join(' ')) && /22:00 is given back/.test(d.adjustments.join(' ')) &&
        /Given back so the ad is not switched twice/.test(d.note) &&
        on.join(' ') === '17-19 22-24' && sch.off_windows.length === 1 && sch.off_windows[0].from === 19 && sch.off_windows[0].to === 22 &&
        /18:00 and 22:00 left running either side/.test(sch.reasons[20]) &&
        /left running so the ad is not switched twice/.test(sch.reasons[18]) && /left running so the ad is not switched twice/.test(sch.reasons[22]) &&
        /left running so the ad is not switched/.test(d.why[18]);
    })(), (() => { const d = pkGiveBack.dead; return [d.dead, d.windows, d.given_back]; })());
  t('§3 dead hours: the hours somebody typed are what make those stretches visible — the same listing read without them keeps the whole stretch and gives nothing back, and a stretch wholly outside them is reported and never applied',
    (() => {
      const d = pkGiveBack.dead, b = pkGiveBack.blind;
      return b.windows.map(w => w.from + '-' + w.to).join(',') === '10-12,18-23' && b.given_back.length === 0 && b.envelope === '' &&
        d.envelope === '17-00' &&
        d.windows_outside_envelope.length === 1 && d.windows_outside_envelope[0].from === 10 && d.windows_outside_envelope[0].to === 12 &&
        d.windows.every(w => w.from !== 10) && /outside the hours somebody typed/.test(d.adjustments.join(' ')) &&
        /reported and never applied/.test(d.note);
    })(), null);
  t('§3 dead hours: of the two dead hours beside a gap it is the one the least money goes out in that is given back, whichever side it is on',
    (() => {
      /* hours 09-18 typed, dead 9 to 11 and 13 to 15, and the one-hour gap at 12 sells. The hour beside
         the gap on each side is dead, so the money decides which of them comes back. */
      const build = (s11, s13) => {
        const rows = [];
        for (let d = 1; d <= 20; d++) {
          rows.push({ day: pkDay(d), hour: 3, orders: 2, units: 2, revenue: 20, spend: 0.2, clicks: 2 });   // the night holds the share, far from the hours typed
          for (const h of [9, 10]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 1.0, clicks: 4 });
          rows.push({ day: pkDay(d), hour: 11, orders: 0, units: 0, revenue: 0, spend: s11, clicks: 4 });
          rows.push({ day: pkDay(d), hour: 12, orders: d <= 3 ? 1 : 0, units: d <= 3 ? 1 : 0, revenue: 9, spend: 0.5, clicks: 4 });
          rows.push({ day: pkDay(d), hour: 13, orders: 0, units: 0, revenue: 0, spend: s13, clicks: 4 });
          for (const h of [14, 15]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 1.0, clicks: 4 });
          for (const h of [16, 17]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0, clicks: 0 });
        }
        return F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), Object.assign({}, pkRules, { typed_ranges: F.adPeakHoursParse('09-18').ranges }));
      };
      const after = build(3.0, 0.4), before = build(0.4, 3.0);
      return after.dead.join(',') === '9,10,11,13,14,15' && after.proven_slots.join(',') === '0' &&
        after.given_back.join(',') === '13' &&
        after.windows.map(w => w.from + '-' + w.to).join(',') === '9-12,14-16' &&
        after.windows[1].given_back.join(',') === '13' && after.windows[0].given_back.length === 0 &&
        before.given_back.join(',') === '11' &&
        before.windows.map(w => w.from + '-' + w.to).join(',') === '9-11,13-16' &&
        before.windows[0].given_back.join(',') === '11' && before.windows[1].given_back.length === 0;
    })(), null);
  t('§3 dead hours: a part of the day is not proven on two orders — below the floor of sales there is no proven part at all, and the note says why (31 Oct finding F3)',
    (() => {
      /* the live shape: three orders in the whole window, two of them in the night, and two night hours
         that spend every day and have never sold. On the share alone the night was proven and those two
         hours were protected; with the floor they are dead, which is what they are. */
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        for (const h of [1, 2]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.6, clicks: 4 });
        rows.push({ day: pkDay(d), hour: 3, orders: (d === 4 || d === 9) ? 1 : 0, units: (d === 4 || d === 9) ? 1 : 0, revenue: 9, spend: 0.6, clicks: 4 });
        rows.push({ day: pkDay(d), hour: 18, orders: d === 7 ? 1 : 0, units: d === 7 ? 1 : 0, revenue: 9, spend: 0.6, clicks: 4 });
      }
      const prof = F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 });
      const d = F.adPeakDeadHours(prof, pkRules);
      return d.orders_total === 3 && d.slot_orders.join(',') === '2,0,0,1' &&
        d.proven_ready === false && d.proven_slots.length === 0 &&
        d.dead.join(',') === '1,2' && d.windows.length === 1 && d.windows[0].from === 1 && d.windows[0].to === 3 &&
        d.rules.proven_min_orders === pkRules.proven_min_orders &&
        new RegExp('only ' + d.orders_total + ' orders came back in the whole window').test(d.note) &&
        new RegExp('proven from ' + pkRules.proven_min_orders + ' orders upwards').test(d.note) &&
        d.proven_note.length > 20 && d.note.indexOf(d.proven_note) >= 0;
    })(), null);
  t('§3 dead hours: the floor is a figure and not a rule of its own — set to nought by a manager, the share alone proves the part of the day again and those hours stop being dead',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        for (const h of [1, 2]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.6, clicks: 4 });
        rows.push({ day: pkDay(d), hour: 3, orders: (d === 4 || d === 9) ? 1 : 0, units: (d === 4 || d === 9) ? 1 : 0, revenue: 9, spend: 0.6, clicks: 4 });
        rows.push({ day: pkDay(d), hour: 18, orders: d === 7 ? 1 : 0, units: d === 7 ? 1 : 0, revenue: 9, spend: 0.6, clicks: 4 });
      }
      const prof = F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 });
      const noFloor = F.adPeakDeadHours(prof, Object.assign({}, pkRules, { proven_min_orders: 0 }));
      return noFloor.proven_slots.join(',') === '0' && noFloor.proven_ready === true && noFloor.dead.length === 0 &&
        noFloor.windows.length === 0 && /never switched off/.test(noFloor.why[1]) && noFloor.proven_note === '' &&
        noFloor.rules.proven_min_orders === 0;
    })(), null);
  t('§3 dead hours: a quiet hour inside the part of the day its sales come from is never swallowed into a dead stretch either, the same as it is never dead',
    (() => {
      /* the gap sits inside the evening, which holds every sale this listing makes, so the two dead
         stretches either side of it are not applied: the proven slot wins over the gap rule too. */
      const rows = [];
      for (let d = 1; d <= 20; d++) {
        for (const h of [13, 14, 15, 16]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });
        for (const h of [20, 21, 22, 23]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.5, clicks: 4 });
        for (const h of [17, 19]) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0, clicks: 0 });
        rows.push({ day: pkDay(d), hour: 18, orders: 40, units: 40, revenue: 400, spend: 0.5, clicks: 4 });
      }
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), { dead_min_clicks: 5, proven_share: 60, min_block_h: 4 });
      return d.proven_slots.join(',') === '3' && d.dead.join(',') === '13,14,15,16' && d.windows.length === 1 &&
        d.windows[0].from === 13 && d.windows[0].to === 17 && d.dead.indexOf(20) < 0 && /never switched off/.test(d.why[20]);
    })(), null);
  t('§3 dead hours: a listing that spends all day and never sells is dead all day, which is the case the owner asked about',
    (() => {
      const rows = [];
      for (let d = 1; d <= 20; d++) for (let h = 0; h < 24; h++) rows.push({ day: pkDay(d), hour: h, orders: 0, units: 0, revenue: 0, spend: 0.3, clicks: 4 });
      const d = F.adPeakDeadHours(F.adPeakProfile(rows, { today: pkToday, for_day: pkToday, lookback_days: 28 }), pkRules);
      return d.dead.length === 24 && d.proven_slots.length === 0 && d.windows.length === 1 && d.windows[0].from === 0 && d.windows[0].to === 24;
    })(), null);

  /* the schedule itself */
  const pkSchPattern = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('09-23').ranges, dead_windows: pkDead20.windows, hold: 'auto', min_days_ok: true, tracking: true });
  t('§3 schedule: the typed hours are the ENVELOPE — outside them the ad is off as before, inside them the dead stretch takes it off, and nothing can put an ad into an hour nobody asked for',
    pkSchPattern.source === 'pattern' && pkSchPattern.states.length === 24 &&
    pkSchPattern.states.slice(0, 9).every(s => s === 'OFF') && pkSchPattern.states[23] === 'OFF' &&
    pkSchPattern.states.slice(9, 12).every(s => s === 'ON') &&
    pkSchPattern.states.slice(12, 17).every(s => s === 'OFF') &&
    pkSchPattern.states.slice(17, 23).every(s => s === 'ON') &&
    pkSchPattern.reasons[2] === 'outside its hours' && pkSchPattern.reasons[13] === 'dead window 12-17' && pkSchPattern.reasons[18] === 'inside its hours' &&
    pkSchPattern.off_windows.length === 1 && pkSchPattern.off_windows[0].from === 12 && pkSchPattern.off_windows[0].to === 17,
    [pkSchPattern.source, pkSchPattern.states.join('')]);
  t('§3 schedule: with fewer than the days the rule asks for, the schedule IS the typed hours and the dead stretches come back only as a suggestion',
    (() => {
      const p10 = F.adPeakProfile(pkRows(10), { today: pkToday, for_day: pkToday, lookback_days: 28 });
      const d10 = F.adPeakDeadHours(p10, pkRules);
      const s = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('09-23').ranges, dead_windows: d10.windows, hold: 'auto', min_days_ok: p10.days_observed >= pkRules.min_days, tracking: true });
      return p10.days_observed === 10 && d10.windows.length === 1 && s.source === 'proposal' && s.applied === false &&
        s.states.slice(9, 23).every(x => x === 'ON') && s.proposal.length === 1 && s.proposal[0].from === 12 &&
        s.off_windows.length === 0 && /put forward as a suggestion/.test(s.why);
    })(), null);
  t('§3 schedule: a listing that has stopped playing on its pattern falls back to the typed hours for the day, and says why',
    (() => {
      const s = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('09-23').ranges, dead_windows: pkDead20.windows, hold: 'auto', min_days_ok: true, tracking: false });
      return s.source === 'typed' && s.applied === false && s.states.slice(9, 23).every(x => x === 'ON') &&
        s.proposal.length === 1 && /no longer playing on the pattern/.test(s.why);
    })(), null);
  t('§3 schedule: a hold wins over the hours and the pattern both, on and off',
    (() => {
      const on = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('09-23').ranges, dead_windows: pkDead20.windows, hold: 'on', min_days_ok: true, tracking: true });
      const off = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('09-23').ranges, dead_windows: pkDead20.windows, hold: 'off', min_days_ok: true, tracking: true });
      return on.source === 'hold' && on.states.every(x => x === 'ON') && on.reasons[3] === 'held on by hand' &&
        off.source === 'hold' && off.states.every(x => x === 'OFF') && off.reasons[3] === 'held off by hand' &&
        F.ADTOOL_PEAK_HOLDS.join(',') === 'auto,on,off';
    })(), null);
  t('§3 schedule: nothing in the pattern can switch an ad ON outside the hours somebody typed, whatever the dead stretches say',
    (() => {
      /* a dead window handed in that reaches outside the typed hours cannot widen them: the envelope is
         read first and the window only ever narrows what is left. */
      const s = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('17-23').ranges, dead_windows: [{ from: 2, to: 8 }], hold: 'auto', min_days_ok: true, tracking: true });
      return s.states.filter(x => x === 'ON').length === 6 && s.states.slice(17, 23).every(x => x === 'ON') &&
        s.states.slice(0, 17).every(x => x === 'OFF') && s.states[23] === 'OFF';
    })(), null);
  t('§3 schedule: a listing whose hours cannot be read is scheduled as nothing at all, never as all day off',
    (() => {
      const s = F.adPeakSchedule({ typed_ranges: [], dead_windows: pkDead20.windows, hold: 'auto', min_days_ok: true, tracking: true });
      return s.source === 'none' && s.off_windows.length === 0 && s.proposal.length === 0 && s.states.every(x => x === 'OFF');
    })(), null);

  /* tracking: the SAME rule A17 uses, not a second one */
  t('§3 tracking: the thresholds are A17’s own, named once, and the drift rule still reads them',
    F.ADTOOL_REGIME_JSD === 0.05 && F.ADTOOL_REGIME_CONSEC === 3 && F.ADTOOL_REGIME_MIN_ORDERS === 20 &&
    /const th = threshold == null \? ADTOOL_REGIME_JSD : threshold, C = consecutive \|\| ADTOOL_REGIME_CONSEC, minN = minCount == null \? ADTOOL_REGIME_MIN_ORDERS : minCount;/.test(src), null);
  t('§3 tracking: a drift the pattern check has already written down IS the answer, and the day is named',
    (() => {
      const r = F.adPeakTracking(pk20.today, pk20.hours, { drift_detected_day: '2026-10-28' });
      return r.tracking === false && r.drift_detected_day === '2026-10-28' && /2026-10-28/.test(r.note) && r.same_rule_as === 'A17';
    })(), null);
  t('§3 tracking: too few orders either side is still TRACKING, which is the answer the drift rule gives for the same reason',
    (() => {
      const today = new Array(24).fill(0); today[18] = 2;
      const pat = new Array(24).fill(0); pat[18] = 3;
      const r = F.adPeakTracking(today, pat, {});
      return r.tracking === true && r.orders_today === 2 && r.orders_pattern === 3 && /too few orders/.test(r.note);
    })(), null);
  t('§3 tracking: two shapes that differ above A17’s own threshold are not tracking, and two that agree are',
    (() => {
      const evening = new Array(24).fill(0); for (const h of [17, 18, 19, 20, 21, 22]) evening[h] = 10;
      const morning = new Array(24).fill(0); for (const h of [6, 7, 8, 9, 10, 11]) morning[h] = 10;
      const moved = F.adPeakTracking(morning, evening, {});
      const same = F.adPeakTracking(evening, evening, {});
      return moved.tracking === false && moved.jsd > F.ADTOOL_REGIME_JSD && same.tracking === true && same.jsd === 0;
    })(), null);
  t('§3 tracking: the SHAPE compared is the weighted one and the floor of orders is not, because a day counted twice has not happened twice',
    (() => {
      const hrs = h => { const l = []; for (let i = 0; i < 24; i++) l.push({ hour: i, orders: 0, orders_raw: 0 }); for (const k of Object.keys(h)) { l[Number(k)].orders = h[k][0]; l[Number(k)].orders_raw = h[k][1]; } return l; };
      /* raw says 30 orders either side, so the floor is met; weighted says the pattern leans evening */
      const today = hrs({ 9: [30, 30] });
      const pattern = hrs({ 9: [5, 30] , 18: [60, 0] });
      const r = F.adPeakTracking(today, pattern, {});
      return r.orders_today === 30 && r.orders_pattern === 30 && r.tracking === false && r.shape_compared === true;
    })(), null);
  t('§3 tracking: a caller with no hourly shape to spare asks on the drift record alone, and then the order counts are NULL and never nought',
    (() => {
      const r = F.adPeakTracking([], [], {});
      return r.tracking === true && r.orders_today === null && r.orders_pattern === null && r.jsd === null &&
        r.shape_compared === false && /no hourly shape was handed/.test(r.note);
    })(), null);

  /* the override the switch is handed, and THE PROMISE: no schedule row behaves exactly as today */
  t('§3 switch: a listing with NO schedule row and no hold is handed no override at all, so the decision is the one this job has always taken, word for word',
    (() => {
      const w = F.adPeakWantFor({ hold: 'auto', schedule: null, hour: 20 });
      const before = F.adPeakSwitchDecide({ auto: 1, ranges: F.adPeakHoursParse('17-23').ranges, hour: 20, live_cpc_ad: true, believed_state: 'PAUSED', account_live_switch: false, account_switches_today: 0 });
      const after = F.adPeakSwitchDecide({ auto: 1, ranges: F.adPeakHoursParse('17-23').ranges, hour: 20, live_cpc_ad: true, believed_state: 'PAUSED', account_live_switch: false, account_switches_today: 0, want_override: w.want_override, want_source: w.want_source });
      return w.want_override === '' && w.want_source === '' && w.from === 'hours' &&
        before.send === after.send && before.mode === after.mode && before.why === after.why &&
        before.why === 'inside its peak hours, written down and not sent: this account’s live switch is off';
    })(), null);
  t('§3 switch: a hold wins over the schedule and over the hours, and the log row says which',
    (() => {
      const sch = F.adPeakSchedule({ typed_ranges: F.adPeakHoursParse('17-23').ranges, dead_windows: [], hold: 'auto', min_days_ok: true, tracking: true });
      const on = F.adPeakWantFor({ hold: 'on', schedule: sch, hour: 3 });
      const off = F.adPeakWantFor({ hold: 'off', schedule: sch, hour: 20 });
      const d = F.adPeakSwitchDecide({ auto: 1, ranges: F.adPeakHoursParse('17-23').ranges, hour: 3, live_cpc_ad: true, believed_state: 'PAUSED', account_live_switch: false, account_switches_today: 0, want_override: on.want_override, want_source: on.want_source });
      return on.want_override === 'ACTIVE' && on.want_source === 'hold on' && on.from === 'hold' &&
        off.want_override === 'PAUSED' && off.want_source === 'hold off' &&
        d.send === 'ACTIVE' && /^hold on/.test(d.why);
    })(), null);
  t('§3 switch: inside a dead stretch the wanted state comes from the schedule and the log row names the stretch',
    (() => {
      const w = F.adPeakWantFor({ hold: 'auto', schedule: Object.assign({ day: pkToday }, pkSchPattern), hour: 13 });
      const d = F.adPeakSwitchDecide({ auto: 1, ranges: F.adPeakHoursParse('09-23').ranges, hour: 13, live_cpc_ad: true, believed_state: 'ACTIVE', account_live_switch: false, account_switches_today: 0, want_override: w.want_override, want_source: w.want_source });
      return w.want_override === 'PAUSED' && w.want_source === 'pattern: dead window 12-17' && w.from === 'schedule' &&
        d.send === 'PAUSED' && d.why === 'pattern: dead window 12-17, written down and not sent: this account’s live switch is off' && d.want_from === 'schedule';
    })(), null);
  t('§3 switch: an hour the schedule only repeats the typed hours for says so rather than claiming a pattern',
    (() => {
      const w = F.adPeakWantFor({ hold: 'auto', schedule: Object.assign({ day: pkToday }, pkSchPattern), hour: 18 });
      return w.want_override === 'ACTIVE' && w.want_source === 'typed hours';
    })(), null);
  t('§3 switch: a schedule for a listing whose hours could not be read is the ABSENCE of a wanted state, never an instruction to pause',
    (() => {
      const bad = F.adPeakSchedule({ typed_ranges: [], dead_windows: [], hold: 'auto', min_days_ok: true, tracking: true });
      const w = F.adPeakWantFor({ hold: 'auto', schedule: Object.assign({ day: pkToday }, bad), hour: 13 });
      return bad.source === 'none' && w.want_override === '' && w.from === 'hours';
    })(), null);
  t('§3 switch: the override decides WHAT is wanted and never whether it may be sent — the gate, the ceiling and the refusal rule are the same lines in the same order (real source)',
    (() => {
      const fn = src.slice(src.indexOf('function adPeakSwitchDecide(input) {'), src.indexOf('function adPeakCampaignPick('));
      const order = [
        "if (!i.auto) return nothing('switching is off for this listing');",
        "if (!ranges.length) return nothing('no hours to read');",
        "if (!i.live_cpc_ad) return nothing('no pay-per-click ad to switch');",
        "if (String(i.believed_state || '').toUpperCase() === want) return nothing('already '",
        'if (i.refused_to && String(i.refused_to).toUpperCase() === want) return nothing(',
        'const on = !!i.account_live_switch;',
        'const cap = adPeakApplyCaps({ account_switches_today: i.account_switches_today });',
        "const mode = (on && cap.allowed) ? 'live' : (on ? 'blocked' : 'would-send');",
      ];
      let at = -1;
      for (const line of order) { const k = fn.indexOf(line); if (k <= at) return false; at = k; }
      return !/fetch\(/.test(fn) && /ADTOOL_PEAK_SWITCH_CAP = 20/.test(src);
    })(), null);
  t('§3 switch: the job reads today’s schedule and the hold through the one pure function, and hands them in as an override rather than deciding twice (real source)',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));
      return /const schedToday = await adtPeakSchedulesRead\(env, ids, \[today\]\);/.test(job) &&
        /const wantFor = adPeakWantFor\(\{ hold: row\.hold, schedule: schedToday\[id \+ '\|' \+ today\] \|\| null, hour: uk\.hour \}\);/.test(job) &&
        /want_override: wantFor\.want_override, want_source: wantFor\.want_source,/.test(job) &&
        /ADTOOL_APPLY_ENDPOINTS\.bulk_status_by_listing/.test(job) && (job.match(/await fetch\(/g) || []).length === 1;
    })(), null);

  /* the planner's tick, read off the UK clock */
  t('§3 planner: the planning tick is the half-hour slot and the three cuts between the parts of the day are the only hours the hourly slot does anything at',
    (() => {
      const m = (h, mi, pt) => F.adPeakPlanTick({ hour: h, minute: mi }, pt).mode;
      return m(23, 30) === 'nightly' && m(0, 30) === 'nightly' &&
        m(6, 0) === 'boundary' && m(12, 0) === 'boundary' && m(17, 0) === 'boundary' &&
        m(9, 0) === 'none' && m(0, 0) === 'none' && m(23, 0) === 'none' &&
        m(6, 0, '06:00') === 'nightly' &&
        F.ADTOOL_PEAK_PLAN_BOUNDARY_HOURS.join(',') === '6,12,17' &&
        [0, 5, 6, 11, 12, 16, 17, 23].map(F.adtSlot).join(',') === '0,0,1,1,2,2,3,3';
    })(), [F.adPeakPlanTick({ hour: 23, minute: 30 }), F.adPeakPlanTick({ hour: 9, minute: 0 })]);
  t('§3 planner: a UK clock that cannot be read plans nothing off it',
    F.adPeakPlanTick({}, '23:30').mode === 'none' && F.adPeakPlanTick({ hour: 99, minute: 0 }).mode === 'none', null);
  t('§3 planner: it writes rows and sends nothing — no token, no endpoint, no fetch anywhere in it (real source)',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolPeakPlan(env) {'), src.indexOf('async function adtPeakOffWindowsToday(env, acct) {'));
      return !/fetch\(/.test(job) && !/ebayAccessToken/.test(job) && !/ADTOOL_APPLY_ENDPOINTS/.test(job) && !/api\.ebay\.com/.test(job) &&
        /adtJobStart\(env, 'adtoolPeakPlan'\)/.test(job) && /adtJobEnd\(env, 'adtoolPeakPlan'/.test(job) &&
        /adtFlag\(env, 'adtool_job_peakplan'\)/.test(job) && /adtFlag\(env, 'adtool_page_peak'\)/.test(job) &&
        /INSERT INTO adtool_peak_schedule/.test(src);
    })(), null);
  t('§3 planner: only a row somebody armed is ever scheduled, and only one with hours the system can read (real source)',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolPeakPlan(env) {'), src.indexOf('async function adtPeakOffWindowsToday(env, acct) {'));
      return /const armed = all\.filter\(r => Number\(r\.auto \|\| 0\) === 1 && adPeakHoursParse\(r\.hours\)\.ranges\);/.test(job) &&
        /tick\.mode === 'nightly'/.test(job) && /else if \(drift\[id\]\)/.test(job);
    })(), null);
  t('§3 planner: it rides the half-hour boundary slot and the hourly slot, and crons.json is untouched (real source, real file)', (() => {
    let file = null; try { file = JSON.parse(readFile('engine/crons.json')); } catch (e) {}
    const i = src.indexOf('function cronMap() {');
    const block = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)).replace(/\/\*[\s\S]*?\*\//g, '');
    const slots = (block.match(/'[^']+':\s*\[[^\]]*adtoolPeakPlan[^\]]*\]/g) || []).map(s => s.slice(1, s.indexOf("':")));
    const inFile = (file && Array.isArray(file.crons)) ? file.crons.map(String) : [];
    /* "crons.json is untouched" held as a FACT and not as a count: both slots were already
       registered and both already carry other jobs, so the planner took no slot of its own. A
       literal length here failed the next time another change legitimately needed a slot, which
       made a test about the peak planner go red over the traffic sampler. */
    const shared = (block.match(/'[^']+':\s*\[[^\]]*adtoolPeakPlan[^\]]*\]/g) || [])
      .every(s => s.slice(s.indexOf('[') + 1, s.indexOf(']')).split(',').length > 1);
    return slots.length === 2 && slots.indexOf('30 23 * * *') >= 0 && slots.indexOf('0 * * * *') >= 0 &&
      slots.every(s => inFile.indexOf(s) >= 0) && shared &&
      /'0 \* \* \* \*': \[adtoolPeakPlan, financeSync/.test(block);
  })(), null);

  /* the next switch, across midnight */
  t('§3 next switch: the next change the SCHEDULE makes, walked into tomorrow where today has none left',
    (() => {
      const today = Object.assign({ day: pkToday }, pkSchPattern);
      const tomorrow = Object.assign({ day: '2026-10-31' }, pkSchPattern);
      const a = F.adPeakNextSwitch({ today: today, tomorrow: tomorrow, uk: { date: pkToday, hour: 10 } });
      const b = F.adPeakNextSwitch({ today: today, tomorrow: tomorrow, uk: { date: pkToday, hour: 13 } });
      const c = F.adPeakNextSwitch({ today: today, tomorrow: tomorrow, uk: { date: pkToday, hour: 23 } });
      return a.at === pkToday + ' 12:00' && a.to === 'OFF' && a.reason === 'dead window 12-17' &&
        b.at === pkToday + ' 17:00' && b.to === 'ON' &&
        c.at === '2026-10-31 09:00' && c.to === 'ON' && c.source === 'pattern';
    })(), null);
  t('§3 next switch: no schedule is null and never a time, because "there is no schedule here" and "nothing happens" are different claims',
    F.adPeakNextSwitch({ today: null, uk: { hour: 10 } }) === null &&
    F.adPeakNextSwitch({ today: { states: ['ON'] }, uk: { hour: 10 } }) === null, null);

  /* A22 */
  t('§3 alert A22: an hour the pattern calls productive that the schedule or a hold had the ad off through, once it has passed',
    (() => {
      const row = { account: 'A', item_id: '1', day: pkToday, states: pkSchPattern.states, reasons: pkSchPattern.reasons, source: 'pattern', productive_hours: [13, 18] };
      const past = F.adPeakOffWhenProductive({ rows: [row], now_uk: { date: pkToday, hour: 20 } });
      const notYet = F.adPeakOffWhenProductive({ rows: [row], now_uk: { date: pkToday, hour: 12 } });
      const held = F.adPeakOffWhenProductive({ rows: [{ account: 'A', item_id: '1', day: pkToday, states: new Array(24).fill('OFF'), reasons: new Array(24).fill('held off by hand'), source: 'hold', productive_hours: [18] }], now_uk: { date: pkToday, hour: 20 } });
      const outside = F.adPeakOffWhenProductive({ rows: [{ account: 'A', item_id: '1', day: pkToday, states: new Array(24).fill('OFF'), reasons: new Array(24).fill('outside its hours'), source: 'typed', productive_hours: [3] }], now_uk: { date: pkToday, hour: 20 } });
      return past.length === 1 && past[0].hour === 13 && past[0].day === pkToday && /has sold in the 13:00 hour/.test(past[0].note) &&
        notYet.length === 0 && held.length === 1 && /a hold somebody set/.test(held[0].note) && outside.length === 0;
    })(), null);
  t('§3 alert A22: it joins the rules with a severity, a waiting time, an action and a why, prints no figure of its own, and is scoped per listing per day per hour (real source)',
    (() => {
      const R = F.ADTOOL_ALERT_RULES;
      const sw = src.slice(src.indexOf('async function adtoolAlerts(env) {'), src.indexOf('async function adtoolAlertsFixtureCheck'));
      return !!R.A22 && R.A22.sev === 'medium' && R.A22.cool >= 1 && R.A22.action && R.A22.why_matters.length >= 20 &&
        /peak hours/.test(R.A22.text) && !/\d/.test(R.A22.text) && !/—/.test(R.A22.text + R.A22.why_matters) &&
        /adPeakOffWhenProductive\(\{ rows: schRows\.map\(adtPeakScheduleRow\), now_uk: nowUkA \}\)/.test(sw) &&
        /put\('A22', f\.item_id \+ '\|' \+ f\.day \+ '\|' \+ String\(f\.hour\)/.test(sw);
    })(), null);

  /* automatic or by hand */
  t('§3 changes: `by` is the attribution’s own answer in the owner’s two words, with how long before the change the portal’s send went out beside it',
    (() => {
      const ebay = F.adChangeBy({ who: 'ebay', tool: null }, '2026-10-30 18:00:00', 5);
      const close = F.adChangeBy({ who: 'tool', tool: { op: 'status', mode: 'live', decision_id: 'peak', at: '2026-10-30 17:58:00' } }, '2026-10-30 18:00:00', 5);
      const far = F.adChangeBy({ who: 'tool', tool: { op: 'status', mode: 'live', decision_id: 'morning', at: '2026-10-30 07:00:00' } }, '2026-10-30 18:00:00', 5);
      const blind = F.adChangeBy({ who: 'tool', tool: { op: 'status', mode: 'live', decision_id: 'peak', at: '' } }, '2026-10-30 18:00:00', 5);
      return ebay.by === 'manual' && ebay.minutes_before === null &&
        close.by === 'automatic' && close.minutes_before === 2 && close.close === true && close.sender === 'peak switching' &&
        far.by === 'automatic' && far.minutes_before === 660 && far.close === false && far.sender === 'the morning apply' &&
        blind.by === 'automatic' && blind.minutes_before === null && blind.close === null &&
        F.ADTOOL_CHANGE_AUTOMATIC_MIN === 5;
    })(), null);
  t('§3 changes: the stamp of the row that matched is carried out of the attribution, and the match itself is unchanged (real source)',
    /return \{ who: 'tool', tool: \{ op: String\(r\.op \|\| ''\), mode: String\(r\.mode \|\| ''\), decision_id: String\(r\.decision_id \|\| ''\), at: String\(r\.at \|\| ''\) \} \};/.test(src) &&
    /const by = adChangeBy\(who, r\.at_utc, ADTOOL_CHANGE_AUTOMATIC_MIN\);/.test(src) &&
    /r\.by = by\.by;/.test(src), null);

  /* the table, the column, the config and the register */
  t('§3 tables: the schedule table holds exactly the columns the brief names, one row per listing per UK day, and the hold column is added guarded (real source)',
    /CREATE TABLE IF NOT EXISTS adtool_peak_schedule \(account TEXT, item_id TEXT NOT NULL, day TEXT NOT NULL, states_json TEXT, source TEXT, reasons_json TEXT, dead_json TEXT, profile_days INTEGER, computed_at TEXT, PRIMARY KEY \(account, item_id, day\)\)/.test(src) &&
    /await adtDdlOne\(env, "ALTER TABLE adtool_peak_items ADD COLUMN hold TEXT DEFAULT 'auto'"\);/.test(src), null);
  t('§3 config: the planner’s stop flag and the seven figures are seeded by ONE function, never written back over a figure somebody has set (real source)',
    (() => {
      const seed = src.slice(src.indexOf('async function ensureAdtoolPeakPlanConfig(env) {'), src.indexOf('const ADTOOL_REGISTER_P16 = ['));
      const keys = ['lookback_days', 'min_days', 'dead_min_clicks', 'proven_share', 'proven_min_orders', 'min_block_h', 'plan_time'];
      return seed.length > 200 && /'adtool_job_peakplan', 'on'/.test(seed) &&
        /ON CONFLICT\(key\) DO NOTHING/.test(seed) && !/DO UPDATE/.test(seed) &&
        keys.every(k => new RegExp("'" + k + "'").test(seed)) &&
        /const K = ADTOOL_PEAK_PLAN_CONFIG_KEYS, D = ADTOOL_PEAK_PLAN_DEFAULTS;/.test(seed) &&
        (src.match(/function ensureAdtoolPeakPlanConfig\(env\) \{/g) || []).length === 1 &&
        !/'adtool_job_peakplan', 'off'/.test(src);
    })(), null);
  t('§3 config: the planner, the switch job and the probe each SEED BEFORE THEY READ, so a database no page has been opened on still plans tonight (31 Oct finding F1, real source)',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolPeakPlan(env) {'), src.indexOf('async function adtPeakOffWindowsToday(env, acct) {'));
      const sw = src.slice(src.indexOf('async function adtoolPeakSwitch(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));
      const probe = src.slice(src.indexOf('  adsPeakPlanProbe: {'), src.indexOf('  backupStamp: {'));
      const page = src.slice(src.indexOf('async function ensureAdtoolPhase16Register(env) {'), src.indexOf('/* ---- the campaign map, with the rate strategy where the database has caught up ---- */'));
      const at = (hay, needle) => hay.indexOf(needle);
      /* the planner's own stop flag is one of the rows the seed writes, so the ORDER is the fix: the
         seed call must come before the flag is read, or a blank reads as off and nothing is planned. */
      const plannerOrder = /await ensureAdtoolPeakPlanConfig\(env\);/.test(job) &&
        at(job, 'await ensureAdtoolPeakPlanConfig(env);') < at(job, "adtFlag(env, 'adtool_job_peakplan')") &&
        at(job, "adtFlag(env, 'adtool_job_peakplan')") > 0;
      /* and the switch job's own gate is untouched: both flags are still read, in that order, before
         anything starts, and the seed is a line after them rather than anything inside them. */
      const switchGate = /if \(\(await adtFlag\(env, 'adtool_page_peak'\)\) !== 'on'\) return;\n  if \(\(await adtFlag\(env, 'adtool_job_peakswitch'\)\) !== 'on'\) return;\n/.test(sw) &&
        at(sw, "adtFlag(env, 'adtool_job_peakswitch')") < at(sw, 'await ensureAdtoolPeakPlanConfig(env);') &&
        at(sw, 'await ensureAdtoolPeakPlanConfig(env);') < at(sw, "adtJobStart(env, 'adtoolPeakSwitch')");
      return plannerOrder && switchGate &&
        /ensureAdtoolPeakPlanConfig\(env\)/.test(probe) && /adtPeakPlanRulesFor\(env\)/.test(probe) &&
        probe.indexOf('ensureAdtoolPeakPlanConfig(env)') < probe.indexOf('adtPeakPlanRulesFor(env)') &&
        /await ensureAdtoolPeakPlanConfig\(env\);/.test(page) &&
        (src.match(/ensureAdtoolPeakPlanConfig\(env\)/g) || []).length >= 5;
    })(), null);
  t('§3 register: the five new entries name the rule, the sources, when they recompute and how they are rechecked, and none of them prints a figure of its own',
    (() => {
      const want = ['PEAK_PROFILE', 'PEAK_DEAD_HOURS', 'PEAK_SCHEDULE', 'PEAK_HOLD', 'PEAK_TRACKING'];
      const got = rgAll.filter(r => want.indexOf(r.id) >= 0);
      return got.length === 5 && got.every(r => r.name && r.formula && r.sources && r.recompute && r.recheck &&
        String(r.formula).split(/\s+/).length <= 120 && !/\d+ ?%/.test(String(r.formula)) && !/—/.test(String(r.formula)));
    })(), rgAll.filter(r => ['PEAK_PROFILE', 'PEAK_DEAD_HOURS', 'PEAK_SCHEDULE', 'PEAK_HOLD', 'PEAK_TRACKING'].indexOf(r.id) >= 0).map(r => [r.id, String(r.formula).split(/\s+/).length]));
  t('§3 hold: the write is gated by the advertising roles and the page flag, refuses a word that is not a hold, refuses a listing that is not on the list, and sends nothing (real source)',
    (() => {
      const route = src.slice(src.indexOf('  adtoolPeakHold: {'), src.indexOf('};\n/* ADTOOL-P15-END'));
      return /await adtGate\(ctx, null\);/.test(route) && /await adtGate\(ctx, 'adtool_page_peak'\);/.test(route) &&
        /ADTOOL_PEAK_HOLDS\.indexOf\(asked\) < 0/.test(route) && /that listing is not on the peak hours list/.test(route) &&
        /'ADTOOL_PEAK_HOLD'/.test(route) && /sent_to_ebay: false/.test(route) && !/fetch\(/.test(route) &&
        F.ADTOOL_ROLES.join(',') === 'Management,Ops Head,Advertising Manager';
    })(), null);
  t('§3 probe: the evidence route is key-gated like backupDump, is not adtool-prefixed, reaches no eBay endpoint, and says what cannot reconcile and why (real source)',
    (() => {
      /* 31 Oct, §3 item 0: the per-listing assembly moved into adPeakListingProfile, which this route
         and the Peak page's own hourly panel both call. The route's own promises are asserted here and
         the four pure calls where they now live, so neither claim went unchecked when the code moved.
         The slice ENDS at the video probe beside it, which is a different route with its own promises. */
      const route = src.slice(src.indexOf('  adsPeakPlanProbe: {'), src.indexOf('  adsVideoProbe: {'));
      const shared = src.slice(src.indexOf('function adPeakListingProfile(row, inp) {'), src.indexOf('/* \u2550\u2550 VIDEOS'));
      return /adsPeakPlanProbe: \{\n\s*auth: 'sync'/.test(src) && !/fetch\(/.test(route) && !/ebayAccessToken/.test(route) &&
        /reconcile_note:/.test(route) && /daily_totals: perDay/.test(shared) && /envelope_note:/.test(route) &&
        /read_errors: readErrors/.test(route) && /sent_to_ebay: false/.test(route) &&
        /adPeakListingProfile\(row, \{/.test(route) &&
        /adPeakProfile\(/.test(shared) && /adPeakDeadHours\(/.test(shared) && /adPeakSchedule\(/.test(shared) && /adPeakWantFor\(/.test(shared);
    })(), null);
  t('§3 pages: the peak page, the Decision page and the campaigns-per-listing page all read the schedule the planner wrote rather than working it out again (real source)',
    /schedule_today: showSch\(schT\), schedule_tomorrow: showSch\(schM\),/.test(src) &&
    /peak_off_windows_today: peakOff,/.test(src) &&
    /peak: peakNow\[id\] \|\| null,/.test(src) &&
    /state_now: want\.want_override \? \(want\.want_override === 'ACTIVE' \? 'ON' : 'OFF'\)/.test(src) &&
    (src.match(/function adPeakProfile\(/g) || []).length === 1 &&
    (src.match(/function adPeakDeadHours\(/g) || []).length === 1, null);

  t('§3 planner: a listing whose hours the run’s clock never reached is LEFT EXACTLY AS IT IS, rather than having a good schedule written over with one that only repeats the typed hours (real source)',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolPeakPlan(env) {'), src.indexOf('async function adtPeakOffWindowsToday(env, acct) {'));
      const read = src.slice(src.indexOf('async function adtPeakHourRows(env, ids, today, lookbackDays, deadlineMs) {'), src.indexOf('async function adtPeakDriftDays('));
      return /if \(deadlineMs && Date\.now\(\) > deadlineMs\) \{ for \(const id of ch\) skipped\.push\(String\(id\)\); continue; \}/.test(read) &&
        /return \{ by_item: out, read: read, skipped: skipped \};/.test(read) &&
        /for \(const id of hours\.skipped\) noHours\[id\] = 1;/.test(job) &&
        /if \(noHours\[id\]\) \{ ranOut\+\+; continue; \}/.test(job) &&
        /ADTOOL_PEAK_PLAN_CAP = 60/.test(src) && /ADTOOL_PEAK_PLAN_CHUNK = 10/.test(src) && /ADTOOL_PEAK_PLAN_MS = 20000/.test(src);
    })(), null);
  t('§3 planner: the dead rule is handed the listing’s own typed hours, and the hours it gave back are written into the row the page reads (real source)',
    (() => {
      const one = src.slice(src.indexOf('async function adtPeakPlanOne(env, row, ctxIn) {'), src.indexOf('function adtPeakScheduleStmt(env, plan) {'));
      const probe = src.slice(src.indexOf('  adsPeakPlanProbe: {'), src.indexOf('  adsVideoProbe: {'));
      const shared = src.slice(src.indexOf('function adPeakListingProfile(row, inp) {'), src.indexOf('/* \u2550\u2550 VIDEOS'));
      const row = src.slice(src.indexOf('function adtPeakScheduleRow(r) {'), src.indexOf('async function adtPeakSchedulesRead('));
      return /const dead = adPeakDeadHours\(profile, Object\.assign\(\{\}, c\.rules, \{ typed_ranges: hours\.ranges \}\)\);/.test(one) &&
        /given_back: sch\.applied \? dead\.given_back : \[\], windows_outside_envelope: dead\.windows_outside_envelope,/.test(one) &&
        /reasons_json = \?6/.test(src) && /JSON\.stringify\(plan\.reasons\)/.test(src) &&
        /given_back: Array\.isArray\(dead\.given_back\) \? dead\.given_back : \[\],/.test(row) &&
        /dead_given_back: schT && schT\.readable \? schT\.given_back : \[\],/.test(src) &&
        /adPeakDeadHours\(profile, Object\.assign\(\{\}, rules, \{ typed_ranges: hours\.ranges \|\| \[\] \}\)\)/.test(shared) &&
        /dead_hours: dead,/.test(shared) &&
        /const listings = chosen\.map\(row => adPeakListingProfile\(row, \{/.test(probe);
    })(), null);
  t('§3 pages: a row nobody set to switch itself is never shown a wanted state, because nothing is touching it (real source)',
    (() => {
      const ic = src.slice(src.indexOf('async function adtoolItemCampaignsCompute(env, p) {'), src.indexOf('const ADTOOL_ACTIONS_P14 = {'));
      const off = src.slice(src.indexOf('async function adtPeakOffWindowsToday(env, acct) {'), src.indexOf('async function adtoolPeakSwitch(env) {'));
      const hold = src.slice(src.indexOf('  adtoolPeakHold: {'), src.indexOf('};\n/* ADTOOL-P15-END'));
      return /const parm = plist\.filter\(r => Number\(r\.auto \|\| 0\) === 1\);/.test(ic) &&
        /const ids = rows\.filter\(r => Number\(r\.auto \|\| 0\) === 1\)\.map\(r => String\(r\.item_id\)\);/.test(off) &&
        /takes_effect_note:/.test(hold) && /this listing is not set to switch itself/.test(hold);
    })(), null);


  /* ══ §4 (31 Oct): VIDEOS ═══════════════════════════════════════════════════════════════════ */

  /* 4.1 the video ids out of a Trading GetItem reply */
  t('§4 videos: GetItem’s VideoDetails gives the video ids, a listing with none is readable with an empty list, and a refusal is NOT read as "no video"',
    (() => {
      const two = F.adVideoIdsFromXml('<GetItemResponse><Ack>Success</Ack><Item><VideoDetails><VideoID>abc123</VideoID><VideoID>def456</VideoID></VideoDetails></Item></GetItemResponse>');
      const none = F.adVideoIdsFromXml('<GetItemResponse><Ack>Success</Ack><Item></Item></GetItemResponse>');
      const dup = F.adVideoIdsFromXml('<VideoID>abc123</VideoID><VideoID>abc123</VideoID>');
      const refused = F.adVideoIdsFromXml('<GetItemResponse><Ack>Failure</Ack><Errors><ShortMessage>Invalid item</ShortMessage></Errors></GetItemResponse>');
      const nothing = F.adVideoIdsFromXml('');
      return two.readable && two.ids.length === 2 && two.ids[0] === 'abc123' &&
        none.readable && none.ids.length === 0 &&
        dup.ids.length === 1 &&
        !refused.readable && refused.ids.length === 0 && !nothing.readable;
    })(), null);

  /* 4.2 the upload date out of the thumbnail picture id — the real ids and the real times the
     18 October study recovered, one per distinct upload day it found */
  t('§4 videos: the thumbnail picture id decodes to the video’s own upload time, on eight real thumbnails spanning eight different upload days (18 Oct data)',
    (() => {
      const real = [
        ['odcAAeSww81qO7t9', '2026-06-24 11:11:57'],
        ['htwAAeSwURVqPQSY', '2026-06-25 10:36:08'],
        ['BbMAAeSwZlJqVNDT', '2026-07-13 11:49:39'],
        ['3TQAAeSwu3ZqkIq-', '2026-08-27 19:06:38'],
        ['b-IAAeSw0O5qtxTQ', '2026-09-26 00:41:52'],
        ['-vQAAeSwV71qvwbU', '2026-10-02 01:20:20'],
        ['nNMAAeSwkXNqxYeU', '2026-10-06 23:43:16'],
        ['yVsAAeSwsgpqxpF8', '2026-10-07 18:37:48'],
      ];
      const at = Date.parse('2026-10-31T00:00:00Z');
      return real.every(r => {
        const bare = F.adVideoThumbDate(r[0], at);
        const url = F.adVideoThumbDate('https://i.ebayimg.com/00/s/MTA4MFgxMDgw/z/' + r[0] + '/$_26.PNG?set_id=880000500F', at);
        return bare.iso === r[1] && url.iso === r[1] && url.day === r[1].slice(0, 10) && url.picture_id === r[0];
      });
    })(), null);
  t('§4 videos: a picture id that is not a believable upload time, a short id and an empty address all come back NULL with the reason, never as a date',
    (() => {
      const at = Date.parse('2026-10-31T00:00:00Z');
      const zeros = F.adVideoThumbDate('AAAAAAAAAAAAAAAA', at);          /* decodes to timestamp 0 */
      const short = F.adVideoThumbDate('abc', at);
      const none = F.adVideoThumbDate('', at);
      const future = F.adVideoThumbDate('odcAAeSww81qO7t9', Date.parse('2020-01-01T00:00:00Z'));
      return zeros.day === null && zeros.note && short.day === null && none.day === null && future.day === null;
    })(), null);
  t('§4 videos: a listing PHOTO address under /g/ decodes the same way, which is why only the video thumbnail is ever read for a video date (real photo id)',
    F.adVideoThumbDate('https://i.ebayimg.com/images/g/odcAAeSww81qO7t9/s-l140.jpg', Date.parse('2026-10-31T00:00:00Z')).iso === '2026-06-24 11:11:57', null);

  /* 4.2b THE SECOND SIGNAL AND THE RULE THAT PICKS BETWEEN THEM (31 Oct follow-up). Three live
     videos read back by hand through the ebayRestCall route on 31 October, one per account, with the
     expirationDate eBay returned and the thumbnail address it returned beside it. On all three the
     expiry less a year is the thumbnail's second plus one, which is what makes the cross-check
     worth having: a date nobody can check is a date nobody can trust. */
  const vreal = [
    ['qdAAAeSwBXtq0oFs', '2027-10-16T19:56:29Z', '2026-10-16 19:56:28', '2026-10-16'],   /* AZHAR ABRT */
    ['swoAAeSwGClq11kf', '2027-10-20T12:05:52Z', '2026-10-20 12:05:51', '2026-10-20'],   /* Amna Baji */
    ['0~gAAeSwSZJqz6mX', '2027-10-14T16:11:04Z', '2026-10-14 16:11:03', '2026-10-14'],   /* Azhar Bhai */
  ];
  const vat = Date.parse('2026-10-31T04:00:00Z');
  t('§4 videos: eBay’s expiry date LESS ONE YEAR names the upload second, on three live videos read back by hand on 31 October',
    vreal.every(r => {
      const e = F.adVideoExpiryDate(r[1], vat);
      /* the expiry is the thumbnail's second plus one on every one of the three */
      return e.day === r[3] && e.ts === F.adVideoThumbDate(r[0], vat).ts + 1 && e.note === '';
    }), vreal.map(r => [r[1], F.adVideoExpiryDate(r[1], vat).iso]));
  t('§4 videos: the year comes off the CALENDAR and not off 365 days, so a leap year does not shift the clock, and an expiry that is missing, unreadable or out of range comes back null with the reason',
    (() => {
      /* across 29 February 2028: a video uploaded 1 March 2027 expires 1 March 2028 */
      const leap = F.adVideoExpiryDate('2028-03-01T09:15:00Z', Date.parse('2027-06-01T00:00:00Z'));
      const none = F.adVideoExpiryDate('', vat), junk = F.adVideoExpiryDate('last Tuesday', vat);
      const old = F.adVideoExpiryDate('1990-01-01T00:00:00Z', vat), ahead = F.adVideoExpiryDate('2099-01-01T00:00:00Z', vat);
      return leap.iso === '2027-03-01 09:15:00' &&
        none.day === null && none.note && junk.day === null && junk.note &&
        old.day === null && old.note && ahead.day === null && ahead.note;
    })(), null);
  t('§4 videos: BOTH SIGNALS AND THEY AGREE — the day is the thumbnail’s, the gap is the measured seconds, and the source says the expiry agreed (the AZHAR ABRT video, end to end)',
    (() => {
      const d = F.adVideoMediaDate('https://i.ebayimg.com/00/s/MTA4MFgxMDgw/z/qdAAAeSwBXtq0oFs/$_26.PNG?set_id=880000500F', '2027-10-16T19:56:29Z', vat);
      return d.day === '2026-10-16' && d.iso === '2026-10-16 19:56:28' && d.gap_seconds === 1 &&
        d.source === F.ADTOOL_VIDEO_DATE_BOTH && d.source === 'eBay media (thumbnail, expiry agrees)' && d.note === '' &&
        d.thumbnail.picture_id === 'qdAAAeSwBXtq0oFs' && d.expiry.iso === '2026-10-16 19:56:29' &&
        /* and all three live videos agree inside the tolerance, every one of them by a single second */
        vreal.every(r => { const x = F.adVideoMediaDate(r[0], r[1], vat); return x.source === F.ADTOOL_VIDEO_DATE_BOTH && x.day === r[3] && x.gap_seconds === 1; });
    })(), null);
  t('§4 videos: ONE SIGNAL ONLY — each is used on its own and NAMED for which it was, so a reader can tell a cross-checked date from a bare one',
    (() => {
      const thumbOnly = F.adVideoMediaDate('qdAAAeSwBXtq0oFs', '', vat);
      const expiryOnly = F.adVideoMediaDate('', '2027-10-16T19:56:29Z', vat);
      return thumbOnly.day === '2026-10-16' && thumbOnly.source === F.ADTOOL_VIDEO_DATE_THUMB && thumbOnly.gap_seconds === null &&
        /* and it says WHY there was no second signal rather than leaving the row blank about it */
        /no expiry date came back/.test(thumbOnly.note) &&
        expiryOnly.day === '2026-10-16' && expiryOnly.source === F.ADTOOL_VIDEO_DATE_EXPIRY && expiryOnly.gap_seconds === null &&
        /no thumbnail to read/.test(expiryOnly.note);
    })(), null);
  t('§4 videos: THEY DISAGREE — the THUMBNAIL is kept, because that is the half verified on 1,246 pictures, and the gap is written down in seconds rather than averaged away',
    (() => {
      /* the same video with an expiry a fortnight out: the day stays the thumbnail's */
      const d = F.adVideoMediaDate('qdAAAeSwBXtq0oFs', '2027-10-30T19:56:29Z', vat);
      /* and one just outside the tolerance, which is the boundary the rule turns on */
      const edge = F.adVideoMediaDate('qdAAAeSwBXtq0oFs', '2027-10-16T19:57:30Z', vat);
      const inside = F.adVideoMediaDate('qdAAAeSwBXtq0oFs', '2027-10-16T19:57:28Z', vat);
      return d.day === '2026-10-16' && d.source === F.ADTOOL_VIDEO_DATE_THUMB && d.gap_seconds === 1209601 &&
        /the thumbnail is the one kept/.test(d.note) && /2026-10-30 19:56:29/.test(d.note) &&
        edge.gap_seconds === F.ADTOOL_VIDEO_DATE_AGREE_S + 2 && edge.source === F.ADTOOL_VIDEO_DATE_THUMB &&
        inside.gap_seconds === F.ADTOOL_VIDEO_DATE_AGREE_S && inside.source === F.ADTOOL_VIDEO_DATE_BOTH;
    })(), null);
  t('§4 videos: NEITHER SIGNAL — the day is null with both reasons and never a nought, and the gap is null because nothing was compared, which is not the same as nothing apart',
    (() => {
      const n = F.adVideoMediaDate('', '', vat);
      const bad = F.adVideoMediaDate('AAAAAAAAAAAAAAAA', 'not a date', vat);
      const agreed = F.adVideoMediaDate('qdAAAeSwBXtq0oFs', '2027-10-16T19:56:28Z', vat);
      return n.day === null && n.iso === null && n.source === '' && n.gap_seconds === null &&
        /no thumbnail to read/.test(n.note) && /no expiry date came back/.test(n.note) &&
        bad.day === null && bad.gap_seconds === null && bad.note &&
        /* 0 seconds apart is a real reading and comes back as 0, never as null */
        agreed.gap_seconds === 0 && agreed.source === F.ADTOOL_VIDEO_DATE_BOTH;
    })(), null);
  t('§4 videos: every name the rule hands out is on the declared list of date sources, and the name the rows written before this change carry is still on it',
    (() => {
      const names = [F.ADTOOL_VIDEO_DATE_BOTH, F.ADTOOL_VIDEO_DATE_THUMB, F.ADTOOL_VIDEO_DATE_EXPIRY, F.ADTOOL_VIDEO_DATE_REFUSED];
      return names.every(n => F.ADTOOL_VIDEO_DATE_SOURCES.indexOf(n) >= 0) &&
        F.ADTOOL_VIDEO_DATE_SOURCES.indexOf('media thumbnail') >= 0 &&
        F.ADTOOL_VIDEO_DATE_SOURCES.indexOf('item page thumbnail') >= 0 &&
        F.ADTOOL_VIDEO_DATE_SOURCES.indexOf('lister record') >= 0 &&
        F.ADTOOL_VIDEO_DATE_SOURCES.indexOf('unknown date') >= 0 &&
        F.ADTOOL_VIDEO_DATE_REFUSED === 'refused';
    })(), F.ADTOOL_VIDEO_DATE_SOURCES);
  t('§4 videos: a GetItem refusal carries eBay’s OWN words out — the error code and its one-line message — because the first 120 characters of a Trading reply are the XML preamble and say nothing (the real Knives refusal, 31 Oct)',
    (() => {
      const real = '<?xml version="1.0" encoding="UTF-8"?>\n<GetItemResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Timestamp>2026-10-31T04:22:33.851Z</Timestamp><Ack>Failure</Ack><Errors><ShortMessage>This listing was removed for violating our Knives policy.</ShortMessage><LongMessage>This listing was removed for violating our Knives policy.</LongMessage><ErrorCode>21920397</ErrorCode><SeverityCode>Error</SeverityCode></Errors><Version>1193</Version><Build>E1193_CORE_API_19146280_R1</Build><Item/></GetItemResponse>';
      const r = F.adVideoIdsFromXml(real);
      /* the preamble a "first 120 characters" note would have recorded instead */
      const head = real.replace(/\s+/g, ' ').slice(0, 120);
      const hidden = F.adVideoIdsFromXml('<GetItemResponse><Ack>Failure</Ack><Errors><ShortMessage>This listing has a policy violation. It&apos;s hidden until you can fix it.</ShortMessage><ErrorCode>21920398</ErrorCode></Errors></GetItemResponse>');
      return !r.readable && r.reason === 'error 21920397: This listing was removed for violating our Knives policy.' &&
        head.indexOf('Knives') < 0 && head.indexOf('Ack') < 0 &&
        /* eBay's own escapes are turned back into the character, so the note reads as a sentence */
        hidden.reason === 'error 21920398: This listing has a policy violation. It’s hidden until you can fix it.' &&
        /* a readable reply carries no reason, and a refusal with no error block still says it was refused */
        F.adVideoIdsFromXml('<Ack>Success</Ack><Item/>').reason === '' &&
        F.adVideoIdsFromXml('<Ack>Failure</Ack>').reason === '' && !F.adVideoIdsFromXml('<Ack>Failure</Ack>').readable;
    })(), null);

  /* 4.3 THE BEFORE-AND-AFTER, against the 18 October workbook’s own listings and its own figures.
     Three real listings out of final.json: the windows, both sides, the change and the rest of the
     account. If this port ever disagrees with that workbook, these three say so. */
  (() => {
    const vcases = [
    { item: '236997583159', account: 'Sir Hasib', video: '2026-10-02', listed: '2026-08-10', N: 15, ub: 207, ua: 130, rb: 1786.15, ra: 1241.8, adb: 437.88, ada: 300.62, cb: 318, ca: 329,
      rows: [['2026-09-17',13,104.92,24.88],['2026-09-18',13,104.91,27.97],['2026-09-19',11,88.77,29.0],['2026-09-20',9,72.63,31.02],['2026-09-21',17,137.19,28.23],['2026-09-22',13,106.63,13.17],['2026-09-23',4,34.45,18.95],['2026-09-24',16,143.2,29.88],['2026-09-25',8,71.6,21.66],['2026-09-26',16,143.2,32.65],['2026-09-27',12,107.4,38.44],['2026-09-28',7,62.65,21.11],['2026-09-29',23,205.85,40.63],['2026-09-30',38,340.1,65.5],['2026-10-01',7,62.65,14.79],['2026-10-02',10,89.5,14.41],['2026-10-03',11,98.45,18.61],['2026-10-04',13,116.35,25.28],['2026-10-05',14,125.3,28.09],['2026-10-06',5,44.75,16.03],['2026-10-07',10,89.5,18.26],['2026-10-08',9,79.2,22.9],['2026-10-09',7,62.65,15.0],['2026-10-10',5,43.4,18.35],['2026-10-11',8,71.6,20.49],['2026-10-12',10,89.5,23.17],['2026-10-13',3,26.85,16.59],['2026-10-14',11,107.45,30.28],['2026-10-15',13,155.35,30.92],['2026-10-16',7,83.65,16.65],['2026-10-17',4,47.8,0]],
      crows: [['2026-09-17',18,155.31],['2026-09-18',23,200.65],['2026-09-19',28,283.07],['2026-09-20',21,174.12],['2026-09-21',21,173.21],['2026-09-22',8,67.48],['2026-09-23',22,194.64],['2026-09-24',12,116.92],['2026-09-25',23,216.57],['2026-09-26',23,231.97],['2026-09-27',21,195.78],['2026-09-28',24,231.15],['2026-09-29',24,229.82],['2026-09-30',31,279.93],['2026-10-01',19,189.67],['2026-10-02',15,165.45],['2026-10-03',21,188.12],['2026-10-04',23,215.61],['2026-10-05',21,217.33],['2026-10-06',21,213.91],['2026-10-07',34,340.07],['2026-10-08',19,180.71],['2026-10-09',17,154.64],['2026-10-10',23,225.37],['2026-10-11',25,268.95],['2026-10-12',21,208.37],['2026-10-13',19,190.08],['2026-10-14',28,286.22],['2026-10-15',22,200.92],['2026-10-16',14,161.79],['2026-10-17',21,248.79]] },
    { item: '407239436234', account: 'Azhar Bhai', video: '2026-10-07', listed: '2026-09-23', N: 10, ub: 20, ua: 34, rb: 215.0, ra: 364.96, adb: 47.92, ada: 70.17, cb: 246, ca: 285,
      rows: [['2026-09-30',1,10.75,3.49],['2026-10-01',5,53.75,8.96],['2026-10-02',1,10.75,6.3],['2026-10-03',3,32.25,6.53],['2026-10-04',5,53.75,9.46],['2026-10-05',4,43.0,9.13],['2026-10-06',1,10.75,4.05],['2026-10-07',3,31.71,7.66],['2026-10-08',3,31.71,4.16],['2026-10-09',5,53.75,11.13],['2026-10-10',2,21.5,8.62],['2026-10-11',1,10.75,8.77],['2026-10-12',2,21.5,4.93],['2026-10-13',2,21.5,6.12],['2026-10-14',4,43.0,6.06],['2026-10-15',5,53.75,11.25],['2026-10-16',5,53.75,9.13],['2026-10-17',5,53.75,0]],
      crows: [['2026-09-27',12,129.59],['2026-09-28',15,150.43],['2026-09-29',25,250.5],['2026-09-30',30,316.11],['2026-10-01',23,191.81],['2026-10-02',24,255.53],['2026-10-03',39,373.8],['2026-10-04',25,239.72],['2026-10-05',21,213.89],['2026-10-06',32,287.64],['2026-10-07',32,311.78],['2026-10-08',22,183.28],['2026-10-09',34,327.71],['2026-10-10',28,240.47],['2026-10-11',33,286.53],['2026-10-12',42,380.18],['2026-10-13',25,236.32],['2026-10-14',20,191.36],['2026-10-15',18,167.8],['2026-10-16',28,248.06],['2026-10-17',35,313.08]] },
    { item: '136854829678', account: 'Saif Bhai', video: '2026-10-08', listed: '2025-12-16', N: 9, ub: 98, ua: 53, rb: 673.11, ra: 367.9, adb: 125.21, ada: 44.24, cb: 349, ca: 411,
      rows: [['2026-09-29',21,145.67,23.31],['2026-09-30',20,138.72,47.76],['2026-10-01',11,76.45,7.23],['2026-10-02',11,72.08,8.64],['2026-10-03',11,73.39,5.04],['2026-10-04',5,34.75,9.2],['2026-10-05',8,55.6,9.59],['2026-10-06',5,34.75,6.61],['2026-10-07',6,41.7,7.83],['2026-10-08',4,27.8,5.1],['2026-10-09',5,34.75,3.1],['2026-10-10',7,48.65,4.66],['2026-10-11',5,34.75,4.24],['2026-10-12',6,41.65,4.52],['2026-10-13',7,48.3,3.99],['2026-10-14',4,27.75,8.89],['2026-10-15',7,48.65,7.48],['2026-10-16',2,13.9,7.36],['2026-10-17',10,69.5,0]],
      crows: [['2026-09-29',43,408.24],['2026-09-30',43,404.67],['2026-10-01',37,357.84],['2026-10-02',32,329.61],['2026-10-03',22,202.97],['2026-10-04',42,377.7],['2026-10-05',46,426.2],['2026-10-06',47,454.91],['2026-10-07',37,353.14],['2026-10-08',47,453.05],['2026-10-09',51,468.19],['2026-10-10',47,434.4],['2026-10-11',35,358.42],['2026-10-12',45,434.76],['2026-10-13',42,401.64],['2026-10-14',36,362.72],['2026-10-15',55,566.57],['2026-10-16',51,511.75],['2026-10-17',49,490.03]] },
    ];
    const mk = a => a.map(r => ({ day: r[0], units: r[1], revenue: r[2], spend: r[3] }));
    const mkc = a => a.map(r => ({ day: r[0], units: r[1], revenue: r[2] }));
    const LAST = '2026-10-17';   /* the last complete UK day in the 18 Oct dump */
    for (const c of vcases) {
      const got = F.adVideoBeforeAfter(mk(c.rows), c.video, LAST, { listed_day: c.listed, data_start: '2026-05-16', cap: 30, control_rows: mkc(c.crows) });
      t('§4 videos: ' + c.item + ' (' + c.account + ') — the 18 Oct workbook’s own window, both sides, the change and the rest of the account',
        got.window_days === c.N &&
        got.before.units === c.ub && got.after.units === c.ua &&
        near(got.before.revenue, c.rb, 0.02) && near(got.after.revenue, c.ra, 0.02) &&
        near(got.before.spend, c.adb, 0.02) && near(got.after.spend, c.ada, 0.02) &&
        near(got.change.units, (c.ua - c.ub) / c.ub, 0.0002) &&
        got.control.before_units === c.cb && got.control.after_units === c.ca &&
        near(got.control.change, (c.ca - c.cb) / c.cb, 0.0002) &&
        got.before.from === new Date(Date.parse(c.video + 'T12:00:00Z') - c.N * 86400000).toISOString().slice(0, 10) &&
        got.after.to === new Date(Date.parse(c.video + 'T12:00:00Z') + c.N * 86400000).toISOString().slice(0, 10),
        { item: c.item, N: got.window_days, ub: got.before.units, ua: got.after.units, rb: got.before.revenue, ra: got.after.revenue, adb: got.before.spend, ada: got.after.spend, cb: got.control.before_units, ca: got.control.after_units });
    }
    /* the upload day is in NEITHER window, and is handed back on its own */
    const c = vcases[0];
    const got = F.adVideoBeforeAfter(mk(c.rows), c.video, LAST, { listed_day: c.listed, data_start: '2026-05-16', cap: 30, control_rows: mkc(c.crows) });
    const onDay = (c.rows.filter(r => r[0] === c.video)[0] || [null, 0, 0, 0]);
    t('§4 videos: the upload day itself is in neither window and comes back on its own',
      got.before.to < c.video && got.after.from > c.video && got.upload_day.day === c.video && got.upload_day.units === onDay[1], { upload: got.upload_day });
    /* the two windows the Decision page asks for narrow the same answer and never widen it */
    const w14 = F.adVideoBeforeAfter(mk(c.rows), c.video, LAST, { listed_day: c.listed, data_start: '2026-05-16', cap: 14, control_rows: mkc(c.crows) });
    const w28 = F.adVideoBeforeAfter(mk(c.rows), c.video, LAST, { listed_day: c.listed, data_start: '2026-05-16', cap: 28, control_rows: mkc(c.crows) });
    t('§4 videos: the 14-day ceiling narrows the window and the 28-day one cannot widen it past the days that exist',
      w14.window_days === 14 && w28.window_days === c.N && w14.before.units <= got.before.units && w14.window_days <= w28.window_days,
      [w14.window_days, w28.window_days, got.window_days]);
  })();
  t('§4 videos: a window is EQUAL on both sides and is the shorter of the days since the video, the history before it and the ceiling',
    (() => {
      const rows = [];
      for (let i = 1; i <= 40; i++) rows.push({ day: F.adtAddDays('2026-09-01', i), units: 1, revenue: 10, spend: 1 });
      /* video on 2026-09-11, listed 2026-09-08: only 3 days of history before it */
      const a = F.adVideoBeforeAfter(rows, '2026-09-11', '2026-10-10', { listed_day: '2026-09-08', data_start: '2026-05-16', cap: 30 });
      /* video on 2026-10-08, two finished days since */
      const b = F.adVideoBeforeAfter(rows, '2026-10-08', '2026-10-10', { listed_day: '2026-09-01', data_start: '2026-05-16', cap: 30 });
      return a.window_days === 3 && a.before.days === 3 && a.after.days === 3 &&
        b.window_days === 2 && b.before.days === 2 && b.after.days === 2;
    })(), null);
  t('§4 videos: a video on from the listing day has NO before-period, so the answer is blank with the reason and never a nought',
    (() => {
      const r = F.adVideoBeforeAfter([{ day: '2026-10-02', units: 3, revenue: 30, spend: 3 }], '2026-10-01', '2026-10-17', { listed_day: '2026-10-01', data_start: '2026-05-16', cap: 30 });
      return r.window_days === 0 && r.before === null && r.after === null && r.change === null &&
        r.notes.join(' ').indexOf('no before-period') >= 0;
    })(), null);
  t('§4 videos: a change against a before-side of nought is NULL, never a percentage',
    (() => {
      const rows = [{ day: '2026-10-05', units: 4, revenue: 40, spend: 4 }];
      const r = F.adVideoBeforeAfter(rows, '2026-10-02', '2026-10-10', { listed_day: '2026-08-01', data_start: '2026-05-16', cap: 30 });
      return r.window_days === 8 && r.before.units === 0 && r.after.units === 4 && r.change.units === null && r.change.units_abs === 4;
    })(), null);
  t('§4 videos: the ad spend either side is read from the click fee, and a spend that moved by half says so, so the two sides are not read as equal money',
    (() => {
      const rows = [];
      for (let i = 0; i <= 9; i++) rows.push({ day: F.adtAddDays('2026-09-20', i), units: 1, revenue: 10, spend: 10 });
      for (let i = 11; i <= 20; i++) rows.push({ day: F.adtAddDays('2026-09-20', i), units: 2, revenue: 20, spend: 30 });
      const r = F.adVideoBeforeAfter(rows, '2026-09-30', '2026-10-17', { listed_day: '2026-06-01', data_start: '2026-05-16', cap: 10 });
      return r.before.spend === 100 && r.after.spend === 300 && r.notes.join(' ').indexOf('Ad spend rose 200%') >= 0;
    })(), null);

  /* 4.4 the cohort: the day a listing joins, and the ONE membership rule the peak list already has */
  t('§4 videos: a listing counts from its video’s own upload day, and from the day the sweep first saw the video when the day could not be decoded; a row with neither is left out',
    (() => {
      const dated = F.adVideoCohortEntry({ item_id: '123456789012', account: 'A', video_count: 1, video_added_on: '2026-10-09', first_seen: '2026-10-20' });
      const undated = F.adVideoCohortEntry({ item_id: '123456789013', account: 'A', video_count: 1, video_added_on: null, first_seen: '2026-10-20' });
      const neither = F.adVideoCohortEntry({ item_id: '123456789014', account: 'A', video_count: 1 });
      const notAnId = F.adVideoCohortEntry({ item_id: '', account: 'A', video_added_on: '2026-10-09' });
      const list = F.adVideoCohortEntries([{ item_id: '1', video_added_on: '2026-10-09' }, { item_id: '2' }]);
      return dated.added_day === '2026-10-09' && dated.removed_day === '' && dated.from_source.indexOf('upload day') >= 0 &&
        undated.added_day === '2026-10-20' && undated.from_source.indexOf('sweep') >= 0 &&
        neither === null && notAnId === null && list.length === 1;
    })(), null);
  t('§4 videos: the cohort is joined by the SAME builder the peak cohort uses, so a day before the video never counts',
    (() => {
      const ents = F.adVideoCohortEntries([{ item_id: '123456789012', video_added_on: '2026-10-09' }]);
      const sql = F.adPeakCohortSql(ents);
      const join = F.adPeakCohortJoin(sql, 'd.item_id', 'd.day');
      return /pk_item/.test(sql) && /123456789012/.test(sql) && /2026-10-09/.test(sql) &&
        /d\.day >= pkc\.pk_from/.test(join) && F.adPeakInCohort(ents[0], '2026-10-08') === false && F.adPeakInCohort(ents[0], '2026-10-09') === true;
    })(), null);
  t('§4 videos: an EMPTY video cohort is a table with no rows and never a vanished filter, so a page can never answer for the whole fleet under a cohort heading',
    F.adPeakCohortSql(F.adVideoCohortEntries([])).indexOf('WHERE 1 = 0') > 0, null);

  /* 4.5 on eBay against the listers’ own record */
  t('§4 videos: eBay’s answer and the lister record are counted apart, and both differences are listed rather than reconciled away',
    (() => {
      const c = F.adVideoCohortCounts(
        [{ item_id: '1', account: 'A', video_count: 1 }, { item_id: '2', account: 'A', video_count: 2 }, { item_id: '3', account: 'A', video_count: 0 }],
        [{ item_id: '2', account: 'A', video_status: 'DONE', video_link: 'x' }, { item_id: '9', account: 'A', video_status: 'done' }, { item_id: '8', account: 'A', video_status: '' }]);
      return c.on_ebay === 2 && c.recorded === 2 && c.both === 1 &&
        c.ebay_only.length === 1 && c.ebay_only[0].item_id === '1' &&
        c.recorded_only.length === 1 && c.recorded_only[0].item_id === '9';
    })(), null);

  /* 4.6 with a video against without one */
  t('§4 videos: each side is divided by its OWN number of listings, so four videos against four hundred other listings is not read as a collapse',
    (() => {
      const rows = [
        { key: 'A', has_video: true, listings: 1, listings_with_traffic: 1, views: 1000, impressions: 10000, units: 10, revenue: 100, spend: 20, attr_revenue: 60, attr_units: 6, clicks: 100, orders: 9 },
        { key: 'A', has_video: false, listings: 1, listings_with_traffic: 1, views: 100, impressions: 2000, units: 1, revenue: 10, spend: 4, attr_revenue: 4, attr_units: 1, clicks: 20, orders: 1 },
        { key: 'A', has_video: false, listings: 1, listings_with_traffic: 1, views: 100, impressions: 2000, units: 1, revenue: 10, spend: 4, attr_revenue: 4, attr_units: 1, clicks: 20, orders: 1 },
      ];
      const out = F.adVideoVsNoVideo(rows);
      const a = out[0];
      return out.length === 1 && a.with.listings === 1 && a.without.listings === 2 &&
        a.with.views_listing === 1000 && a.without.views_listing === 100 &&
        a.with.ctr === 0.1 && a.without.ctr === 0.05 &&
        a.lift.views === 9 && a.lift.ctr === 1 && a.with.roas === 3 && a.without.roas === 1;
    })(), null);
  t('§4 videos: a group with nothing on one side has no lift and says why, because a comparison against nought is not a comparison',
    (() => {
      const out = F.adVideoVsNoVideo([{ key: 'B', has_video: true, listings: 1, views: 10, impressions: 100, units: 1, revenue: 10, spend: 1, attr_revenue: 1, attr_units: 1, clicks: 2, orders: 1 }]);
      return out[0].lift === null && out[0].without === null && out[0].note.indexOf('nothing to compare against') >= 0;
    })(), null);
  t('§4 videos: a rate on a side with no views and no spend is NULL and never nought',
    (() => {
      const out = F.adVideoVsNoVideo([
        { key: 'C', has_video: true, listings: 1, views: 0, impressions: 0, units: 0, revenue: 0, spend: 0, attr_revenue: 0, attr_units: 0, clicks: 0, orders: 0 },
        { key: 'C', has_video: false, listings: 1, views: 0, impressions: 0, units: 0, revenue: 0, spend: 0, attr_revenue: 0, attr_units: 0, clicks: 0, orders: 0 },
      ]);
      return out[0].with.ctr === null && out[0].with.conversion === null && out[0].with.roas === null && out[0].lift.ctr === null;
    })(), null);

  /* 4.7 the real source: the sweep, the cohort plumbing, the gates and the one-way-only promise */
  t('§4 videos (real source): the sweep rides an hourly slot that is ALREADY registered, last in it, with its own per-account ceiling, its own fleet-wide fetch cap and its own clock',
    /'25 \* \* \* \*': \[adtoolAlerts, adtoolVideoSweep\]/.test(src) &&
    /ADTOOL_VIDEO_SWEEP_PER_ACCOUNT = 120/.test(src) && /ADTOOL_VIDEO_SWEEP_FETCH_CAP = 700/.test(src) &&
    /ADTOOL_VIDEO_SWEEP_MS = 40000/.test(src) && /ADTOOL_VIDEO_RECHECK_DAYS = 7/.test(src) &&
    /fetches >= ADTOOL_VIDEO_SWEEP_FETCH_CAP/.test(src) && /Date\.now\(\) > deadline/.test(src), null);
  t('§4 videos (real source): the sweep asks about ACTIVE listings first and longest-unchecked first, and re-asks a week after a listing was last asked about',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /ORDER BY \(i\.status = 'ACTIVE'\) DESC, COALESCE\(v\.checked_at, ''\) ASC LIMIT/.test(job) &&
        /adtAddDays\(today, -ADTOOL_VIDEO_RECHECK_DAYS\)/.test(job) &&
        /first_seen = CASE WHEN \?4 > 0 AND COALESCE\(first_seen, ''\) = '' THEN \?5 ELSE first_seen END/.test(job) &&
        /OutputSelector>Item\.VideoDetails</.test(job);
    })(), null);
  t('§4 videos (real source): NOTHING new reaches eBay — every eBay call the video code makes is a read: the GetItem POST carries only an item id and an output selector, and the media and item-page calls are plain GETs',
    (() => {
      const block = src.slice(src.indexOf('async function adVideoThumbFetch(env, acct, videoId, itemId) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      /* one POST in the whole section, and it is GetItem */
      const posts = (block.match(/method: 'POST'/g) || []).length;
      return posts === 1 && /'X-EBAY-API-CALL-NAME': 'GetItem'/.test(block) &&
        /* 31 Oct: the media read goes through the shared REST call, which is the ONE place the host
           is chosen, and the video code only ever asks it for a GET */
        /await ebayRestFetch\(env, acct, 'GET', '\/commerce\/media\/v1_beta\/video\/' \+ vid\)/.test(block) &&
        !/ebayRestFetch\(env, acct, '(POST|PUT|DELETE|PATCH)'/.test(block) &&
        /www\.ebay\.co\.uk\/itm\//.test(block) &&
        !/method: '(PUT|DELETE|PATCH)'/.test(block) && !/fetch\(/.test(board);
    })(), null);
  t('§4 videos (real source): the date pass and the ebayRestCall route make the SAME media read through ONE function — same host chosen from the path, same headers, and a token minted for the account it was handed',
    (() => {
      const rest = src.slice(src.indexOf('  ebayRestCall: {'), src.indexOf('  ebayFinanceRead: {'));
      const shared = src.slice(src.indexOf('async function ebayRestFetch(env, account, method, path, body) {'), src.indexOf('/* eBay\'s own accepted-carrier list'));
      const block = src.slice(src.indexOf('async function adVideoThumbFetch(env, acct, videoId, itemId) {'), src.indexOf('async function adtoolVideoSweep(env) {'));
      return /\^\\\/commerce\\\/media\\\/v1_beta\\\/video/.test(rest) &&
        /* nothing on /commerce/media/ can be written, by the route's own refusal */
        /throw new Error\('SAY: the video read is GET only'\);/.test(rest) &&
        /* the route no longer builds the call itself: it hands it to the shared one */
        /await ebayRestFetch\(ctx\.env, String\(p\.account \|\| ''\), method, path/.test(rest) &&
        !/await fetch\(/.test(rest) &&
        /* and the host, the headers and the token all live in that one function */
        (src.match(/async function ebayRestFetch\(/g) || []).length === 1 &&
        /const host = \/\^\\\/commerce\\\/media\\\/\/\.test\(p\) \? 'https:\/\/apim\.ebay\.com' : 'https:\/\/api\.ebay\.com';/.test(shared) &&
        /const tok = await ebayAccessToken\(env, String\(account \|\| ''\)\);/.test(shared) &&
        /'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB'/.test(shared) &&
        /* it hands the refusal back rather than throwing, because the status and the body are what
           the row records */
        /return \{ status: r\.status, ok: r\.ok, body: text,/.test(shared) &&
        /* and the video lookup builds no eBay call of its own bar the item page, which is not a
           REST read at all */
        (block.match(/await fetch\(/g) || []).length === 1 &&
        /await fetch\('https:\/\/www\.ebay\.co\.uk\/itm\/' \+ iid/.test(block);
    })(), null);
  t('§4 videos (real source): both cohorts are named in ONE place and an unknown cohort is refused by BOTH of the Overview’s actions, never answered for the whole fleet',
    (() => {
      const cmd = src.slice(src.indexOf('  adtoolCommand: {'), src.indexOf('  adtoolToday: {'));
      const plan = src.slice(src.indexOf('  adtoolPlan: {'), src.indexOf('  adtoolSales: {'));
      const refuse = /if \(cohort && ADTOOL_COHORTS\.indexOf\(cohort\) < 0\) throw new Error\('SAY: the cohorts this answer knows are ' \+ ADTOOL_COHORT_WORDS\);/;
      const read = /const CO = cohort === 'peak' \? await adPeakCohortRead\(env, acct\) : cohort === 'video' \? await adVideoCohortRead\(env, acct\) : null;/;
      return /const ADTOOL_COHORTS = \['peak', 'video'\];/.test(src) &&
        refuse.test(cmd) && refuse.test(plan) && read.test(cmd) && read.test(plan) &&
        (src.match(/ADTOOL_COHORTS\.indexOf/g) || []).length === 2;
    })(), null);
  t('§4 videos (real source): the Videos page is role-gated and flag-gated with the gate BEFORE the cache, the flag is born on, and the board carries the API-truth sentence and the cohort rule',
    (() => {
      const route = src.slice(src.indexOf('  adtoolVideoBoard: {'), src.indexOf('  adtoolPeakProfile: {'));
      return /await adtGate\(ctx, null\);/.test(route) && /await adtGate\(ctx, 'adtool_page_videos'\);/.test(route) &&
        route.indexOf('adtGate(ctx, null)') < route.indexOf('adtKvMemo') &&
        /'adtool_page_livesplit', 'adtool_page_potential', 'adtool_page_videos'/.test(src) &&
        /one\('adtool_job_videosweep', 'on'\), one\('adtool_page_videos', 'on'\)/.test(src) &&
        /api_truth: ADTOOL_VIDEO_API_TRUTH,/.test(src) && /cohort_rule: 'A listing counts from the day/.test(src) &&
        /ADTOOL_VIDEO_API_TRUTH = 'These are listing-level metrics for listings with video\./.test(src);
    })(), null);
  t('§4 videos (real source): the board says there is no traffic reading from before the video, because eBay publishes views as a rolling window the portal keeps only the latest of',
    (() => {
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      return /traffic_available: false,/.test(board) && /No traffic reading from before the video\./.test(board) &&
        /range_days = 30/.test(board);
    })(), null);
  t('§4 videos (real source): the Overview blocks on the Videos page come from the Overview’s OWN two actions asked for the video cohort, not from a copy of their arithmetic',
    (() => {
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      return /const route = ROUTES\[name\]; if \(!route\) return null;/.test(board) &&
        /\(route\.raw \|\| route\.fn\)\(pay, ctx\)/.test(board) &&
        /call\('adtoolPlan', planPay\)/.test(board) && /call\('adtoolCommand', cmdPay\)/.test(board) &&
        /cohort: 'video'/.test(board);
    })(), null);
  t('§4 videos (real source): the register carries the four figures and the probe is a sync-key read that sends nothing',
    (() => {
      const probe = src.slice(src.indexOf('  adsVideoProbe: {'), src.indexOf('  adsFreshnessProbe: {'));
      return /\['VIDEO_COHORT',/.test(src) && /\['VIDEO_ADDED_ON',/.test(src) && /\['VIDEO_BEFORE_AFTER',/.test(src) && /\['VIDEO_VS_NO_VIDEO',/.test(src) &&
        /auth: 'sync'/.test(probe) && /sent_to_ebay: false,/.test(probe) && /agreement: agreement,/.test(probe) &&
        !/method: 'POST'/.test(probe);
    })(), null);
  t('§4 videos (real source): the video table keeps a listing asked about and found to carry none, which is what orders the rotation, and the cohort is built on the count and not on a row existing',
    (() => {
      const sch = src.slice(src.indexOf('async function ensureAdtoolVideoSchema(env) {'), src.indexOf('async function adVideoThumbFetch('));
      const read = src.slice(src.indexOf('async function adVideoCohortRead(env, acct) {'), src.indexOf('function adVideoIdList(ids) {'));
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /CREATE TABLE IF NOT EXISTS adtool_listing_video \(account TEXT NOT NULL, item_id TEXT NOT NULL, video_ids_json TEXT, video_count INTEGER DEFAULT 0, video_added_on TEXT, video_gone_on TEXT, date_source TEXT, source TEXT, thumb_url TEXT, first_seen TEXT, checked_at TEXT, date_checked_at TEXT, note TEXT, PRIMARY KEY \(account, item_id\)\)/.test(sch) &&
        /WHERE video_count > 0/.test(read) && /adPeakCohortSql\(entries\)/.test(read) &&
        /* a video that has gone is written down rather than forgotten, and one that comes back clears the day */
        /video_gone_on = CASE WHEN \?4 > 0 THEN '' WHEN COALESCE\(video_count, 0\) > 0 AND COALESCE\(video_gone_on, ''\) = '' THEN \?6 ELSE video_gone_on END/.test(job) &&
        /* an ended listing is asked about once, ever; a live one again every week */
        /i\.status = 'ACTIVE' AND substr\(v\.checked_at, 1, 10\) < \?2/.test(job);
    })(), null);

  /* 4.9 THE SWEEP'S SPEED (31 Oct follow-up): the reads go out in slices, and the slicing is a pure
     function so "eight at a time, in the order they were chosen" is a test and not a hope. Asked one
     after another the run managed about thirty-nine listings before its clock, so the first pass over
     the fleet took more than a day and the weekly re-check never caught up with itself. */
  t('\u00a74 sweep speed: the slicer cuts eight to a slice and cuts nothing out \u2014 same members, same order, remainder last',
    (() => {
      const list = [];
      for (let i = 1; i <= 20; i++) list.push({ item_id: String(i) });
      const sl = F.adtFetchSlices(list, F.ADTOOL_VIDEO_SWEEP_PARALLEL);
      const flat = [].concat.apply([], sl).map(x => x.item_id).join(',');
      const want = list.map(x => x.item_id).join(',');
      return sl.length === 3 && sl[0].length === 8 && sl[1].length === 8 && sl[2].length === 4 &&
        flat === want && sl[0][0] === list[0] && sl[2][3] === list[19];
    })(), null);
  t('\u00a74 sweep speed: an exact multiple leaves no empty slice, a short list is one slice, an empty list is no slices, and a repeat is kept because the rotation\u2019s order is the whole point',
    (() => {
      const mk = n => { const a = []; for (let i = 0; i < n; i++) a.push({ item_id: 'x' + i }); return a; };
      const eight = F.adtFetchSlices(mk(16), 8), few = F.adtFetchSlices(mk(3), 8);
      const dupes = F.adtFetchSlices([{ item_id: '1' }, { item_id: '1' }, { item_id: '2' }], 8);
      return eight.length === 2 && eight[1].length === 8 && few.length === 1 && few[0].length === 3 &&
        F.adtFetchSlices([], 8).length === 0 && F.adtFetchSlices(null, 8).length === 0 &&
        dupes.length === 1 && dupes[0].length === 3 &&
        /* a size nobody set, or one somebody set to nonsense, still cuts one at a time rather than throwing */
        F.adtFetchSlices(mk(3)).length === 3 && F.adtFetchSlices(mk(3), 0).length === 3 && F.adtFetchSlices(mk(3), -4).length === 3;
    })(), null);
  t('\u00a74 sweep speed (real source): BOTH passes await a Promise.all over slices \u2014 eight for the GetItem rotation, four for the date pass \u2014 and neither fetches inside a plain for-await loop over its rows',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /const ADTOOL_VIDEO_SWEEP_PARALLEL = 8;/.test(src) && /const ADTOOL_VIDEO_SWEEP_DATE_PARALLEL = 4;/.test(src) &&
        /for \(const slice of adtFetchSlices\(rows, ADTOOL_VIDEO_SWEEP_PARALLEL\)\)/.test(job) &&
        /for \(const slice of adtFetchSlices\(need, ADTOOL_VIDEO_SWEEP_DATE_PARALLEL\)\)/.test(job) &&
        (job.match(/await Promise\.all\(batch\.map\(async \(r\) => \{/g) || []).length === 2 &&
        /* the old one-at-a-time loops are gone, and no eBay read is reached outside a slice's map */
        !/for \(const r of rows\)/.test(job) && !/for \(const r of need\)/.test(job) &&
        (job.match(/await fetch\(/g) || []).length === 1 && (job.match(/await adVideoThumbFetch\(/g) || []).length === 1 &&
        job.indexOf('await fetch(') > job.indexOf('await Promise.all(batch.map(async (r) => {') &&
        job.lastIndexOf('await adVideoThumbFetch(') > job.lastIndexOf('await Promise.all(batch.map(async (r) => {');
    })(), null);
  t('\u00a74 sweep speed (real source): the cap is spent BEFORE the reads go out, the date pass still RESERVES a pair and then charges the item pages it really read, and the clock and the cap are judged between slices \u2014 so eight replies landing together cannot carry the run past its ceiling',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /const room = ADTOOL_VIDEO_SWEEP_FETCH_CAP - fetches;/.test(job) &&
        /const room = Math\.floor\(\(ADTOOL_VIDEO_SWEEP_FETCH_CAP - fetches\) \/ 2\);/.test(job) &&
        (job.match(/const batch = room < slice\.length \? slice\.slice\(0, room\) : slice;/g) || []).length === 2 &&
        /* 31 Oct: a lookup is ONE small read now, so both passes charge a read apiece up front and
           the date pass adds the item pages it actually had to fall back to */
        (job.match(/fetches \+= batch\.length;/g) || []).length === 2 && !/fetches \+= batch\.length \* 2;/.test(job) &&
        /fetches \+= found\.reduce\(\(n, f\) => n \+ Math\.max\(0, f\.reads - 1\), 0\);/.test(job) &&
        (job.match(/if \(Date\.now\(\) > deadline\) \{ stopped = 'deadline'; break; \}/g) || []).length === 2 &&
        (job.match(/if \(batch\.length < slice\.length\) \{ stopped = 'cap'; break; \}/g) || []).length === 2 &&
        /* and whatever a cut-short pass did read is still written */
        (job.match(/written \+= await adtBatch\(env, stmts\);/g) || []).length === 2;
    })(), null);
  t('\u00a74 sweep speed (real source): the job note says what the run cost and what ended it \u2014 listings asked, found with a video, reads made, seconds used, and whether the clock or the cap stopped it',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /const began = Date\.now\(\);/.test(job) && /const deadline = began \+ ADTOOL_VIDEO_SWEEP_MS;/.test(job) &&
        /notes\.push\(asked \+ ' asked about, ' \+ withVideo \+ ' carry a video, '/.test(job) &&
        /notes\.push\(fetches \+ ' reads in ' \+ Math\.round\(\(Date\.now\(\) - began\) \/ 1000\) \+ 's'\);/.test(job) &&
        /its own clock stopped it, so there are listings it did not reach/.test(job) &&
        /its own fetch cap stopped it, so there are listings it did not reach/.test(job) &&
        /neither the clock nor the cap stopped it/.test(job) &&
        /* a run cut short before the date pass says so too, rather than reporting a clean finish */
        /if \(Date\.now\(\) > deadline\) stopped = 'deadline';/.test(job) &&
        /else if \(fetches >= ADTOOL_VIDEO_SWEEP_FETCH_CAP\) stopped = 'cap';/.test(job) &&
        /* and no ceiling is typed into the sentence a reader is shown */
        !/40 ?s|700 reads|forty seconds/.test(job.slice(job.indexOf('const covered =')));
    })(), null);

  /* 4.10 THE REFUSAL LOOP (31 Oct follow-up). A refusal was counted and thrown away, writing no row,
     so checked_at stayed empty and the listing stayed at the head of the never-checked rotation and
     was re-asked every run for ever. Once the fleet was covered that WAS the rotation: six listings
     an hour, every one of them a listing eBay had removed over a policy breach, and no row anywhere
     saying so. These hold the fix to the shape of the fault. */
  t('§4 refusals (real source): a refusal is WRITTEN DOWN — the row records that the check happened, eBay’s status and eBay’s own reason — so the listing leaves the never-checked head of the rotation instead of being re-asked every hour for ever',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      const refusal = job.slice(job.indexOf('refused++;'), job.indexOf('asked++;'));
      return /if \(!rep\.got \|\| !rep\.got\.readable\) \{/.test(job) &&
        /* the old shape is gone: counted and dropped with nothing written */
        !/\{ refused\+\+; continue; \}/.test(job) &&
        /* the row records the check, so the rotation moves on, and the 7-day interval is the retry */
        /INSERT INTO adtool_listing_video \(account, item_id, checked_at, date_checked_at, date_source, note\)/.test(refusal) &&
        /checked_at = datetime\('now'\), date_checked_at = datetime\('now'\), note = \?3,/.test(refusal) &&
        /* eBay's status AND its own words, not the preamble a blind body slice would have caught */
        /'HTTP ' \+ rep\.status \+ ': ' \+ \(\(rep\.got && rep\.got\.reason\) \|\| rep\.head \|\| 'eBay gave no reason'\)/.test(refusal) &&
        /\.slice\(0, 120\)/.test(job) &&
        /* a call that never completed is NOT a refusal: nothing of eBay's to record, so it waits */
        /if \(!rep\.answered\) continue;/.test(job) &&
        job.indexOf('if (!rep.answered) continue;') < job.indexOf('refused++;');
    })(), null);
  t('§4 refusals (real source): the refusal write does NOT go through the listing upsert’s ON CONFLICT — that one stamps video_gone_on, which would turn "eBay would not answer" into "the video has been taken off" — and it leaves a date already recovered alone',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      const refusal = job.slice(job.indexOf('refused++;'), job.indexOf('asked++;'));
      const upsert = job.slice(job.indexOf('asked++;'), job.indexOf('if (batch.length < slice.length)'));
      /* two upserts in the job, and only the listing one touches the video columns */
      return (job.match(/ON CONFLICT\(account, item_id\) DO UPDATE SET/g) || []).length === 2 &&
        !/video_gone_on/.test(refusal) && !/video_count/.test(refusal) && !/first_seen/.test(refusal) && !/video_ids_json/.test(refusal) &&
        /video_gone_on = CASE WHEN \?4 > 0 THEN ''/.test(upsert) &&
        /* and a row that already has a date keeps the source that date came from */
        /date_source = CASE WHEN COALESCE\(video_added_on, ''\) = '' THEN \?4 ELSE date_source END/.test(refusal) &&
        !/video_added_on = /.test(refusal);
    })(), null);
  t('§4 refusals: the rotation picks never-checked first, so a refusal that writes no row is re-asked for ever — the write is what makes the 7-day interval the retry, and an ended listing eBay removed is never asked about again',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /WHERE i\.account = \?1 AND \(COALESCE\(v\.checked_at, ''\) = '' OR \(i\.status = 'ACTIVE' AND substr\(v\.checked_at, 1, 10\) < \?2\)\)/.test(job) &&
        /ORDER BY \(i\.status = 'ACTIVE'\) DESC, COALESCE\(v\.checked_at, ''\) ASC/.test(job) &&
        /const stale = adtAddDays\(today, -ADTOOL_VIDEO_RECHECK_DAYS\);/.test(job) &&
        F.ADTOOL_VIDEO_RECHECK_DAYS === 7;
    })(), null);
  t('§4 refusals: the count a reader sees is the number of rows actually written as refused, and the Videos panel counts them so a cohort short of the fleet has an explanation on the page',
    (() => {
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      return /refused_by_ebay: cover \? Number\(cover\.refused\) \|\| 0 : null,/.test(board) &&
        /SUM\(CASE WHEN date_source = \?/.test(board) &&
        /ADTOOL_VIDEO_DATE_REFUSED/.test(board) &&
        /* and the sentence beside it names no ceiling of its own */
        /Where eBay refuses to answer for a listing/.test(board);
    })(), null);

  /* 4.11 FORTY A RUN, AND THE BOARD TOLD AT ONCE */
  t('§4 dating rate: forty lookups a run, four in flight, and the ceiling is read from the constant rather than typed into the query',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return F.ADTOOL_VIDEO_SWEEP_DATES === 40 && F.ADTOOL_VIDEO_SWEEP_DATE_PARALLEL === 4 &&
        /const ADTOOL_VIDEO_SWEEP_DATES = 40;/.test(src) &&
        /ORDER BY COALESCE\(date_checked_at, ''\) ASC LIMIT " \+ ADTOOL_VIDEO_SWEEP_DATES/.test(job) &&
        /* forty lookups at one read each sit well inside the run's own fetch ceiling even with every
           one of them falling back to the item page */
        F.ADTOOL_VIDEO_SWEEP_DATES * 2 < F.ADTOOL_VIDEO_SWEEP_FETCH_CAP &&
        /* and the never-looked-up rows come first, with the given-up ones behind them on the same clock */
        /COALESCE\(date_checked_at, ''\) = '' OR date_checked_at < datetime\('now', '-" \+ ADTOOL_VIDEO_RECHECK_DAYS \+ " day'\)/.test(job);
    })(), null);
  t('§4 dating rate: the date pass reads the TWO signals through the cross-checking rule, names the item page for what it is, and still falls back to the lister’s record before blank',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      return /const dec = adVideoMediaDate\(thumb, got\.expires, Date\.now\(\)\);/.test(job) &&
        /source = got\.step === 'item page' \? 'item page thumbnail' : dec\.source;/.test(job) &&
        /if \(\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(u\)\) \{ day = u; source = 'lister record'; \}/.test(job) &&
        /if \(f\.day\) dated\+\+; else \{ source = 'unknown date'; lost\+\+; \}/.test(job) &&
        /* the decode is never read twice, and never off the thumbnail alone */
        !/adVideoThumbDate\(thumb\)/.test(job);
    })(), null);
  t('§4 dating rate (real source): a run that dated anything DROPS the board’s memo, by the prefix the memo key itself is built from, so the before-and-after shows for every listing dated this run instead of the window’s worth of the old answer',
    (() => {
      const job = src.slice(src.indexOf('async function adtoolVideoSweep(env) {'), src.indexOf('async function adVideoCohortRead(env, acct) {'));
      const clear = src.slice(src.indexOf('async function adVideoBoardCacheClear(env) {'), src.indexOf('const ADTOOL_ACTIONS_P15 = {'));
      return /if \(dated\) \{ const gone = await adVideoBoardCacheClear\(env\);/.test(job) &&
        /* dropped after the writes land, not before them */
        job.indexOf('adVideoBoardCacheClear') > job.lastIndexOf('written += await adtBatch(env, stmts);') &&
        /prefix: adtKvPrefix\('adtoolVideoBoard'\)/.test(clear) &&
        /* never fatal, and bounded, because this runs inside a job with a clock to keep */
        /catch \(e\) \{ \/\* no listing, no clear/.test(clear) && /for \(let page = 0; page < 10; page\+\+\)/.test(clear) &&
        /* and the ceiling it falls back on when there is no listing is the page's own two minutes,
           which is short enough that a memo surviving the clear is a page minutes behind and not a
           page a day behind */
        /* the entry is pinned to two minutes; it stopped being the LAST entry in the map on 2 Nov,
           when Product history was given a memo of its own, so the comma is allowed for as well */
        /adtoolVideoBoard: 120000[,}]/.test(src);
    })(), null);
  t('§4 dating rate: every memo entry of an action shares the prefix its key is built from, so clearing by prefix cannot miss a window or an account somebody opened',
    (() => {
      const pre = F.adtKvPrefix('adtoolVideoBoard');
      const keys = [F.adtKvKey('adtoolVideoBoard', 'p', {}), F.adtKvKey('adtoolVideoBoard', 'np', {}),
        F.adtKvKey('adtoolVideoBoard', 'p', { account: 'AZHAR ABRT' }), F.adtKvKey('adtoolVideoBoard', 'p', { period: 'd14', from: '2026-10-17', to: '2026-10-30' })];
      const uniq = {}; for (const k of keys) uniq[k] = 1;
      return pre === 'adt:rt:adtoolVideoBoard:' && keys.every(k => k.indexOf(pre) === 0) &&
        Object.keys(uniq).length === 4 &&
        /* and another action's entries are NOT under it */
        F.adtKvKey('adtoolPeak', 'p', {}).indexOf(pre) !== 0;
    })(), null);
  t('§4 dating rate (real source): the before-and-after runs for EVERY dated listing the cohort read hands back, not for a page of them, and the cohort ceiling is well clear of the fleet’s videos',
    (() => {
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      return /const dated = CO\.rows\.filter\(r => \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(String\(r\.video_added_on \|\| ''\)\)\);/.test(board) &&
        /for \(const r of dated\) \{/.test(board) &&
        /* no LIMIT of its own on the loop, and the cohort read's ceiling is hundreds */
        !/dated\.slice\(/.test(board) && F.ADTOOL_PEAK_COHORT_CAP >= 500;
    })(), null);

  /* 4.8 ITEM 0 (§3 leftover): the real hours one click away, from the SAME assembling function the
     evidence probe calls, so the page and the probe cannot show different hours for one listing */
  t('§3 item 0 (real source): the Peak page’s hourly panel and the evidence probe assemble a listing through ONE function, and the page’s own action is role-gated and flag-gated',
    (() => {
      const probe = src.slice(src.indexOf('  adsPeakPlanProbe: {'), src.indexOf('  adsVideoProbe: {'));
      const route = src.slice(src.indexOf('  adtoolPeakProfile: {'), src.indexOf('  adtoolLiveSplit: {'));
      return (src.match(/function adPeakListingProfile\(row, inp\) \{/g) || []).length === 1 &&
        /const listings = chosen\.map\(row => adPeakListingProfile\(row, \{/.test(probe) &&
        /adPeakListingProfile\(row, \{/.test(route) &&
        /await adtGate\(ctx, 'adtool_page_peak'\);/.test(route) &&
        /if \(!item\) throw new Error\('SAY: name the listing'\);/.test(route) &&
        /that listing is not on the peak list/.test(route);
    })(), null);
  t('§3 item 0: the shared function gives the 24 hours with their real sums beside the weighted pattern, the dead hours, the tracking answer, the schedule worked out now, and the finished days asked for',
    (() => {
      const rows = [];
      /* ten finished days, every hour with a reading; hour 3 spends and never sells */
      for (let d = 1; d <= 10; d++) {
        const day = F.adtAddDays('2026-10-10', d);
        for (let h = 0; h < 24; h++) {
          rows.push({ day: day, hour: h, spend: h === 3 ? 1.2 : 0.5, clicks: h === 3 ? 6 : 3, impressions: 10, orders: h === 3 ? 0 : (h >= 17 ? 2 : 1), units: h === 3 ? 0 : 1, revenue: h === 3 ? 0 : 12 });
        }
      }
      const one = F.adPeakListingProfile({ item_id: '123456789012', account: 'A', hours: '00-24', auto: 1, hold: 'auto' }, {
        rows: rows, drift_day: '', sched: {}, daily_by: { '123456789012|2026-10-20': { spend: 12, clicks: 72, orders: 25, units: 23, revenue: 276 } },
        rules: F.adPeakPlanRules({}), uk: { date: '2026-10-21', hour: 9, minute: 0 }, today: '2026-10-21', tomorrow: '2026-10-22', day: '2026-10-20', days: 3,
      });
      return one.item_id === '123456789012' && one.profile.hours.length === 24 &&
        one.profile.hours[3].spend_raw > 0 && one.profile.hours[3].orders_raw === 0 &&
        one.profile.hours[0].days_observed === 10 && typeof one.profile.hours[0].days_with_sales === 'number' &&
        one.profile.days_observed === 10 &&
        one.dead_hours && Array.isArray(one.dead_hours.windows) &&
        one.tracking && one.tracking.tracking !== undefined &&
        one.schedule_worked_out_now.states.length === 24 && one.schedule_worked_out_now.day === '2026-10-20' &&
        one.daily_totals.length === 3 && one.daily_totals[2].day === '2026-10-20' && one.daily_totals[2].daily_total !== null &&
        one.daily_totals[0].daily_total === null;
    })(), null);

  /* ══ §4 and §3 item 0, BOTH SIDES: the engine really sends the field and the page really reads it.
     The 28 October reconciliation is the reason these exist: two halves built on separate files each
     reported green and still disagreed about the NAMES of eight figures, and a name the engine does
     not send renders as an empty cell, which a reader takes for a nought. ══ */
  const ovSrc = rdFile('frontend/view-adtool-overview.js');
  const rtSrc = rdFile('frontend/view-adtool-runtoday.js');
  const vidBlk = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));

  t('§4 videos: the sub-page is registered in the Overview’s OWN file, as the key the shell keeps off the sidebar, and the Overview links to it',
    /VIEWS\.adtoolVideos = \{/.test(ovSrc) && /label: 'Videos'/.test(ovSrc) && /roles: ROLES/.test(ovSrc) &&
    /href="#adtoolVideos"/.test(ovSrc) && (ovSrc.match(/VIEWS\.adtoolVideos = \{/g) || []).length === 1, null);
  t('§4 videos: the sub-page draws the Overview’s blocks through window.adtOverviewBlocks and never forks them',
    (() => {
      const i = ovSrc.indexOf('function vidDraw()'), b = ovSrc.slice(i, i + 1400);
      return /var B = window\.adtOverviewBlocks;/.test(b) && /B\.hero\(O\.plan\)/.test(b) &&
        /B\.today\(O\.command\) \+ B\.byAccount\(O\.command\) \+ B\.slots\(O\.command\) \+ B\.hourly\(O\.command\) \+ B\.foot\(O\.command\)/.test(b);
    })(), null);
  t('§4 videos: the page asks adtoolVideoBoard with the period bar’s own window and the account chip, and the engine answers on the same two',
    /api\('adtoolVideoBoard', p\)/.test(ovSrc) && /adtPeriodParams\(VD\.period\)/.test(ovSrc) &&
    /adtPeriodOr\(p, today, 'd30'\)/.test(vidBlk) && /const acct = String\(\(p && p\.account\) \|\| ''\)\.trim\(\);/.test(vidBlk), null);
  t('§4 videos: the API-truth sentence and the cohort rule are PRINTED on both pages, out of the answer rather than typed into the view',
    /esc\(String\(D\.api_truth \|\| ''\)\)/.test(ovSrc) && /esc\(String\(D\.cohort_rule\)\)/.test(ovSrc) &&
    /esc\(String\(D\.api_truth \|\| ''\)\)/.test(rtSrc) &&
    !/listing-level metrics for listings with video/.test(ovSrc) && !/listing-level metrics for listings with video/.test(rtSrc), null);
  t('§4 videos: the cohort counts the page prints are the four the engine sends, and the two difference lists are the engine’s own',
    /on_ebay: eIds\.length, recorded: rIds\.length, both: both\.length,/.test(src) &&
    /cnt\(C\.on_ebay\)/.test(ovSrc) && /cnt\(C\.recorded\)/.test(ovSrc) && /cnt\(C\.both\)/.test(ovSrc) &&
    /vidList\(C\.ebay_only,/.test(ovSrc) && /vidList\(C\.recorded_only,/.test(ovSrc), null);
  t('§4 videos: the with-against-without table reads the per-listing figures and the lift the engine sends, by account and by case type',
    /by_account: adVideoVsNoVideo\(/.test(vidBlk) && /by_case_type: adVideoVsNoVideo\(/.test(vidBlk) &&
    /views_listing/.test(ovSrc) && /units_listing/.test(ovSrc) && /revenue_listing/.test(ovSrc) &&
    /tbl\('Account', V\.by_account\)/.test(ovSrc) && /tbl\('Case type', V\.by_case_type\)/.test(ovSrc), null);
  t('§4 videos: the Videos sub-page carries NO per-listing table and NO before-and-after of its own, because the owner put that record on the Decision page, and it links there',
    !/before_after/.test(ovSrc) && !/per_listing/.test(ovSrc) && /href="#adtoolRunToday"/.test(ovSrc) && /Video revisions/.test(ovSrc), null);
  t('§4 videos: the Decision page’s department reads the engine’s own windows, both sides, the change and the control, by the names the engine sends',
    /windows: windows,/.test(vidBlk) && /before_after_windows: ADTOOL_VIDEO_WINDOWS,/.test(vidBlk) &&
    /Array\.isArray\(D\.per_listing\) \? D\.per_listing : \[\]/.test(rtSrc) && /Array\.isArray\(D\.before_after\) \? D\.before_after : \[\]/.test(rtSrc) &&
    /D\.before_after_windows \|\| \[14, 28\]/.test(rtSrc) &&
    /w\.before/.test(rtSrc) && /w\.after/.test(rtSrc) && /w\.change/.test(rtSrc) && /w\.control/.test(rtSrc) &&
    /units_day/.test(rtSrc) && /revenue_day/.test(rtSrc) && /spend_day/.test(rtSrc), null);
  t('§4 videos: EVERY listing row on the department is an adtProductCell, so it keeps its History link',
    (() => {
      const i = rtSrc.indexOf('function vrRow(r)'), b = rtSrc.slice(i, i + 3000);
      const rows = (b.match(/<tr>/g) || []).length;
      return rows > 0 && (b.match(/adtProductCell\(r\)/g) || []).length === rows;
    })(), null);
  t('§4 videos: the department says what eBay could not give us rather than leaving a column blank, and names the control in the engine’s own words',
    /traffic_note: 'No traffic reading from before the video\./.test(vidBlk) &&
    /rows\[q\]\.traffic_note/.test(rtSrc) && /esc\(String\(D\.control_note \|\| ''\)\)/.test(rtSrc) &&
    /no video date, so there is nothing to put either side of one/.test(rtSrc), null);
  t('§4 videos: a change the engine sends as null reads as "no before" on the page and never as a nought per cent',
    (() => { const i = rtSrc.indexOf('function vrChg(v)'), b = rtSrc.slice(i, i + 400); return /no before/.test(b) && /if \(n == null\)/.test(b); })(), null);
  t('§3 item 0: the Peak page asks adtoolPeakProfile for the ONE listing whose panel is open, by the name the engine registers, and prints the hours it sends',
    /api\('adtoolPeakProfile', \{ item_id: key, days: 3 \}\)/.test(pkSrc) &&
    /if \(PK\.dataFor\) loadProfile\(PK\.dataFor\);/.test(pkSrc) &&
    /P\.profile && P\.profile\.hours/.test(pkSrc) &&
    /spend_raw/.test(pkSrc) && /clicks_raw/.test(pkSrc) && /orders_raw/.test(pkSrc) && /days_observed/.test(pkSrc) && /days_with_sales/.test(pkSrc) &&
    /P\.dead_hours && Array\.isArray\(P\.dead_hours\.windows\)/.test(pkSrc) && /daily_totals/.test(pkSrc), null);
  t('§3 item 0: the panel prints the twenty-four hours and the four parts of the day under them, and says the four are the same hours added up',
    (() => {
      const i = pkSrc.indexOf('function profSlotRow(hours)'), b = pkSrc.slice(i, i + 1400);
      return /PROF_SLOTS = \[\['Night', 0, 6\], \['Morning', 6, 12\], \['Afternoon', 12, 17\], \['Evening', 17, 24\]\]/.test(pkSrc) &&
        /The same hours added into the four parts of the day/.test(b) &&
        /for \(var i = 0; i < 24; i\+\+\)/.test(pkSrc.slice(pkSrc.indexOf('function profRows('), pkSrc.indexOf('function profDays(')));
    })(), null);
  t('§3 item 0: the sentence that said the hourly figures are NOT in this answer is gone, because they are, and the page says where they come from instead',
    !/The money, the clicks and the sales in each hour are not in this answer/.test(pkSrc) &&
    /eBay publishes no ad figures by hour/.test(pkSrc) && /a day\\'s first reading belongs to no hour of trading/.test(pkSrc), null);
  t('§4 videos: the department lists EVERY listing that carries a video, the before-and-after joined onto the ones whose date we have, so an undated listing is a row that says why rather than one that is dropped',
    (() => {
      const i = rtSrc.indexOf('function vrRows()'), b = rtSrc.slice(i, i + 1600);
      return /per_listing/.test(b) && /byId\[String\(r\.item_id\)\] \|\| null/.test(b) &&
        /windows: b \? b\.windows : null/.test(b) &&
        /no video date, so there is nothing to put either side of one/.test(rtSrc);
    })(), null);
  t('§4 videos: the conversion rate takes BOTH its sides from eBay\u2019s own traffic reading, never this period\u2019s units over a thirty-day view count',
    /transactions: t30 \? n0\(t30\.transactions\) : null,/.test(vidBlk) &&
    /conversion: \(views != null && views > 0 && t30 && n0\(t30\.transactions\) != null\) \? round4\(n0\(t30\.transactions\) \/ views\) : null,/.test(vidBlk), null);

  t('§4 videos: VIEWS are divided by the listings eBay published views for, because the traffic report covers the top three hundred of an account and a listing with no reading is not a listing with nought views',
    (() => {
      /* four listings a side; eBay published views for one of the four on each side */
      const mk = (hv, n, trafficOn) => { const out = []; for (let i = 0; i < n; i++) out.push({ key: 'A', has_video: hv, listings: 1, listings_with_traffic: (i < trafficOn ? 1 : 0), views: (i < trafficOn ? 400 : 0), impressions: (i < trafficOn ? 4000 : 0), units: 2, revenue: 20, spend: 2, attr_revenue: 4, attr_units: 1, clicks: 10, orders: 2 }); return out; };
      const out = F.adVideoVsNoVideo(mk(true, 4, 1).concat(mk(false, 4, 1)));
      const a = out[0];
      return a.with.listings === 4 && a.with.listings_with_traffic === 1 && a.with.views_listing === 400 &&
        a.without.views_listing === 400 && a.lift.views === 0 &&
        a.with.units_listing === 2 && a.with.revenue_listing === 20;
    })(), null);
  t('§4 videos: a side with no traffic reading at all has no views each, rather than nought views each',
    (() => {
      const out = F.adVideoVsNoVideo([
        { key: 'B', has_video: true, listings: 3, listings_with_traffic: 0, views: 0, impressions: 0, units: 6, revenue: 60, spend: 3, attr_revenue: 6, attr_units: 3, clicks: 9, orders: 6 },
        { key: 'B', has_video: false, listings: 3, listings_with_traffic: 3, views: 300, impressions: 3000, units: 3, revenue: 30, spend: 3, attr_revenue: 3, attr_units: 1, clicks: 9, orders: 3 },
      ]);
      return out[0].with.views_listing === null && out[0].without.views_listing === 100 && out[0].lift.views === null;
    })(), null);
  t('§4 videos: a whole-period rate is NOT worked out from a bounded slice of days; it comes back blank with the reason, and the equal windows are untouched',
    (() => {
      const rows = [];
      for (let i = 0; i < 20; i++) rows.push({ day: F.adtAddDays('2026-09-20', i), units: 1, revenue: 10, spend: 1 });
      const full = F.adVideoBeforeAfter(rows, '2026-09-30', '2026-10-09', { listed_day: '2026-06-01', data_start: '2026-05-16', cap: 10 });
      const cut = F.adVideoBeforeAfter(rows, '2026-09-30', '2026-10-09', { listed_day: '2026-06-01', data_start: '2026-05-16', cap: 10, rows_from: '2026-09-20' });
      return full.whole.pre_units === 10 && cut.whole.pre_units === null && cut.whole.before_side_limited === true &&
        /after this listing/.test(cut.whole.note) &&
        JSON.stringify(cut.before) === JSON.stringify(full.before) && JSON.stringify(cut.after) === JSON.stringify(full.after);
    })(), null);

  t('§4 videos: no setting is typed into copy \u2014 the sweep\u2019s ceilings and the two windows are written from the settings themselves, in the register and on the page',
    (() => {
      const reg = rgAll.filter(r => r.id === 'VIDEO_COHORT')[0], ba = rgAll.filter(r => r.id === 'VIDEO_BEFORE_AFTER')[0];
      const board = src.slice(src.indexOf('async function adtoolVideoBoardCompute(env, p, ctx) {'), src.indexOf('function adtPeriodParamsOf(w) {'));
      return reg && ba &&
        /up to 120 listings an account/.test(reg.recompute) && /again every 7 days/.test(reg.formula) &&
        /which is 14 days and then 28 days/.test(ba.formula) &&
        /' \+ ADTOOL_VIDEO_SWEEP_PER_ACCOUNT \+ '/.test(src) && /' \+ ADTOOL_VIDEO_RECHECK_DAYS \+ '/.test(src) &&
        /ADTOOL_VIDEO_WINDOWS\.join\(' days and then '\)/.test(src) &&
        !/a hundred and twenty/.test(src) && !/asks again a week after/.test(src) &&
        /ADTOOL_VIDEO_SWEEP_PER_ACCOUNT \+ ' listings an account each hour/.test(board);
    })(), null);

  /* ══════════════════════════════════════════════════════════════════════════════════════════
     §5 of the owner's 31 Oct brief: one freshness law, a stamp on every tile, the stale alert A23
     and the sampler's own runs on Data health.
     ══════════════════════════════════════════════════════════════════════════════════════════ */
  const K5 = F.ADTOOL_FRESH_CONFIG_KEYS;
  const cfg5 = (a, r) => { const o = {}; if (a !== undefined) o[K5.amber_min] = a; if (r !== undefined) o[K5.red_min] = r; return o; };

  t('§5 freshness: the two figures are the owner\u2019s own, and they are the ones the keys are named for',
    F.ADTOOL_FRESH_DEFAULTS.amber_min === 15 && F.ADTOOL_FRESH_DEFAULTS.red_min === 60 &&
    K5.amber_min === 'adtool_fresh_amber_min' && K5.red_min === 'adtool_fresh_red_min', [F.ADTOOL_FRESH_DEFAULTS, K5]);
  t('§5 freshness: a key nobody has set falls back to the default, so an unwritten database and one set to the defaults behave the same',
    (() => {
      const none = F.adtFreshRules(null), empty = F.adtFreshRules({});
      return none.amber_min === 15 && none.red_min === 60 && empty.amber_min === 15 && empty.red_min === 60;
    })(), null);
  t('§5 freshness: the stored figures are read through the two named keys and nothing else',
    (() => {
      const r = F.adtFreshRules(cfg5('20', '90'));
      const wrongName = F.adtFreshRules({ adtool_fresh_amber: '20', fresh_red_min: '90' });
      return r.amber_min === 20 && r.red_min === 90 && wrongName.amber_min === 15 && wrongName.red_min === 60;
    })(), null);
  t('§5 freshness: a figure somebody mistyped falls back rather than stopping the badge working',
    (() => {
      const bad = ['', 'soon', null, undefined, '0', '-5'];
      return bad.every(v => { const r = F.adtFreshRules(cfg5(v, v)); return r.amber_min === 15 && r.red_min === 60; });
    })(), null);
  t('§5 freshness: amber is never allowed past red \u2014 a tile cannot be amber and red at once, and red is the figure that must not move',
    (() => {
      const r = F.adtFreshRules(cfg5('120', '30'));
      return r.red_min === 30 && r.amber_min === 30;
    })(), null);
  t('§5 freshness: both figures are held to a range they mean something in, rather than refused',
    (() => {
      const big = F.adtFreshRules(cfg5('99999', '99999'));
      const frac = F.adtFreshRules(cfg5('14.6', '59.4'));
      return big.amber_min === 1440 && big.red_min === 1440 && frac.amber_min === 15 && frac.red_min === 59;
    })(), null);
  t('§5 freshness: a stamp nobody could read is NULL minutes old and never nought, which is the one answer a badge must not get wrong',
    F.adtFreshAgeMin('', Date.parse('2026-10-31T09:00:00Z')) === null &&
    F.adtFreshAgeMin(null, Date.parse('2026-10-31T09:00:00Z')) === null &&
    F.adtFreshAgeMin('not a time', Date.parse('2026-10-31T09:00:00Z')) === null, null);
  t('§5 freshness: a D1 stamp with no zone on it is read as UTC, and an ISO stamp is left alone',
    (() => {
      const now = Date.parse('2026-10-31T09:00:00Z');
      return F.adtFreshAgeMin('2026-10-31 08:30:00', now) === 30 && F.adtFreshAgeMin('2026-10-31T08:30:00.000Z', now) === 30;
    })(), [F.adtFreshAgeMin('2026-10-31 08:30:00', Date.parse('2026-10-31T09:00:00Z'))]);
  t('§5 freshness: the badge turns at the minute the age goes PAST a figure, not the minute it reaches it',
    (() => {
      const R = F.adtFreshRules(cfg5('15', '60')), now = Date.parse('2026-10-31T12:00:00Z');
      const at = m => F.adtFreshVerdict(new Date(now - m * 60000).toISOString(), R, now).verdict;
      return at(5) === 'ok' && at(15) === 'ok' && at(16) === 'amber' && at(60) === 'amber' && at(61) === 'red';
    })(), null);
  t('§5 freshness: no stamp is \u2018none\u2019 and not \u2018red\u2019, because nothing behind a tile is a different thing from an old reading',
    F.adtFreshVerdict('', F.adtFreshRules(null), Date.now()).verdict === 'none' &&
    F.adtFreshVerdict('', F.adtFreshRules(null), Date.now()).age_min === null, null);
  t('§5 freshness: a verdict asked for with no figures stands on the law\u2019s own, so a caller cannot judge on nothing',
    (() => {
      const now = Date.parse('2026-10-31T12:00:00Z');
      const old = new Date(now - 61 * 60000).toISOString();
      return F.adtFreshVerdict(old, null, now).verdict === 'red' && F.adtFreshVerdict(old, {}, now).verdict === 'red';
    })(), null);
  t('§5 freshness: one stamp shape for the whole tool \u2014 the UK clock a reader sees and the instant the badge ages, both null where it could not be read',
    (() => {
      const s = F.adtFreshStamp('2026-10-31T08:05:00.000Z');
      const n = F.adtFreshStamp('rubbish');
      return s.as_of === '08:05' && s.as_of_at === '2026-10-31T08:05:00.000Z' && n.as_of === null && n.as_of_at === null;
    })(), [F.adtFreshStamp('2026-10-31T08:05:00.000Z')]);
  t('§5 freshness: the clock on a stamp is the UK one, so a summer reading does not print an hour early',
    F.adtFreshStamp('2026-07-15T08:05:00.000Z').as_of === '09:05' &&
    F.adtFreshStamp('2026-12-15T08:05:00.000Z').as_of === '08:05', [F.adtFreshStamp('2026-07-15T08:05:00.000Z')]);

  /* the sampler's runs */
  const tick5 = (iso, acct, fam, total, changed, corrected) => ({ account: acct, family: fam, report_day: '2026-10-31', sampled_at: iso, rows_total: total, rows_changed: changed == null ? 0 : changed, rows_corrected: corrected == null ? 0 : corrected });
  const runSet = () => [
    tick5('2026-10-31T08:00:02.000Z', 'A', 'cpc', 100, 4), tick5('2026-10-31T08:00:09.000Z', 'A', 'std', 90, 1),
    tick5('2026-10-31T08:00:14.000Z', 'B', 'cpc', 60, 2),
    /* 08:05 never landed anything: no tick at all, which is what a missed run looks like */
    tick5('2026-10-31T08:10:03.000Z', 'A', 'cpc', 101, 3, 1), tick5('2026-10-31T08:10:11.000Z', 'B', 'cpc', 61, 0),
    tick5('2026-10-31T08:15:01.000Z', 'A', 'cpc', 102, 1),
  ];
  t('§5 sampler: the ticks of one invocation are ONE run, however many accounts and families they cover',
    (() => {
      const runs = F.adtSamplerRuns(runSet(), { limit: 12, rules: F.adtFreshRules(null) });
      return runs.length === 3 && runs[2].samples === 3 && runs[2].accounts === 2 &&
        JSON.stringify(runs[2].families) === JSON.stringify(['cpc', 'std']);
    })(), (() => { const r = F.adtSamplerRuns(runSet(), { limit: 12 }); return [r.length, r.map(x => x.samples)]; })());
  t('§5 sampler: a run that landed nothing wrote nothing, so it shows as a longer gap and never as a row',
    (() => {
      const runs = F.adtSamplerRuns(runSet(), { limit: 12, rules: F.adtFreshRules(null) });
      /* newest first: 08:15 five minutes after 08:10, 08:10 TEN minutes after 08:00 */
      return runs[0].at_uk === '08:15' && runs[0].gap_min === 5 && runs[1].at_uk === '08:10' && runs[1].gap_min === 10;
    })(), (() => F.adtSamplerRuns(runSet(), { limit: 12 }).map(r => [r.at_uk, r.gap_min]))());
  t('§5 sampler: the oldest run shown carries NO gap it cannot know, and null is not nought',
    (() => {
      const runs = F.adtSamplerRuns(runSet(), { limit: 12, rules: F.adtFreshRules(null) });
      return runs[runs.length - 1].gap_min === null && runs[runs.length - 1].gap_verdict === null;
    })(), null);
  t('§5 sampler: a run\u2019s rows, changes and eBay\u2019s own corrections are summed across its samples',
    (() => {
      const runs = F.adtSamplerRuns(runSet(), { limit: 12, rules: F.adtFreshRules(null) });
      const first = runs[runs.length - 1], mid = runs[1];
      return first.rows === 250 && first.rows_changed === 7 && first.rows_corrected === 0 &&
        mid.rows === 162 && mid.rows_changed === 3 && mid.rows_corrected === 1;
    })(), null);
  t('§5 sampler: the spread is from a run\u2019s first landed sample to its last, which is as near its length as the record goes',
    (() => {
      const runs = F.adtSamplerRuns(runSet(), { limit: 12, rules: F.adtFreshRules(null) });
      return runs[runs.length - 1].duration_s === 12 && runs[0].duration_s === 0;
    })(), null);
  t('§5 sampler: a report that arrived carrying no listing reads as empty, which is not the same as figures that had not moved',
    (() => {
      const runs = F.adtSamplerRuns([
        tick5('2026-10-31T08:00:00.000Z', 'A', 'cpc', 0, 0),
        tick5('2026-10-31T08:05:00.000Z', 'A', 'cpc', 80, 0),
      ], { limit: 12, rules: F.adtFreshRules(null) });
      return runs[1].status === 'empty' && runs[0].status === 'ok' && runs[0].rows_changed === 0;
    })(), null);
  t('§5 sampler: the gap is judged against the very figures the badges are, so a stall is amber then red on one law',
    (() => {
      const rows = [tick5('2026-10-31T08:00:00.000Z', 'A', 'cpc', 10, 0), tick5('2026-10-31T08:20:00.000Z', 'A', 'cpc', 11, 1), tick5('2026-10-31T09:40:00.000Z', 'A', 'cpc', 12, 1)];
      const runs = F.adtSamplerRuns(rows, { limit: 12, rules: F.adtFreshRules(cfg5('15', '60')) });
      return runs[1].gap_min === 20 && runs[1].gap_verdict === 'amber' && runs[0].gap_min === 80 && runs[0].gap_verdict === 'red';
    })(), null);
  t('§5 sampler: a tick whose stamp nobody could read dates no run at all, rather than being guessed into one',
    (() => {
      const rows = runSet().concat([tick5('', 'C', 'cpc', 5, 0), tick5('not a time', 'C', 'std', 5, 0)]);
      const runs = F.adtSamplerRuns(rows, { limit: 12, rules: F.adtFreshRules(null) });
      return runs.length === 3 && runs.every(r => r.at_uk && r.at_uk.length === 5);
    })(), null);
  t('§5 sampler: only the last runs asked for come back, newest first',
    (() => {
      const rows = [];
      for (let i = 0; i < 30; i++) rows.push(tick5(new Date(Date.parse('2026-10-31T08:00:00.000Z') + i * 300000).toISOString(), 'A', 'cpc', 10 + i, 1));
      const runs = F.adtSamplerRuns(rows, { limit: 12, rules: F.adtFreshRules(null) });
      return runs.length === 12 && runs[0].rows === 39 && runs[11].rows === 28 && runs.every(r => r.gap_min === 5);
    })(), (() => { const rows = []; for (let i = 0; i < 30; i++) rows.push(tick5(new Date(Date.parse('2026-10-31T08:00:00.000Z') + i * 300000).toISOString(), 'A', 'cpc', 10 + i, 1)); return F.adtSamplerRuns(rows, { limit: 12 }).length; })());
  t('§5 sampler: the panel shows the last twelve runs, and what makes two samples one run is half the cadence \u2014 written from the timer, never typed',
    F.ADTOOL_SAMPLER_RUNS_SHOWN === 12 && F.ADTOOL_SAMPLER_EVERY_MIN === 5 && F.ADTOOL_SAMPLER_RUN_SPLIT_S === 150 &&
    /const ADTOOL_SAMPLER_RUN_SPLIT_S = Math\.round\(ADTOOL_SAMPLER_EVERY_MIN \* 60 \/ 2\);/.test(src),
    [F.ADTOOL_SAMPLER_RUNS_SHOWN, F.ADTOOL_SAMPLER_RUN_SPLIT_S]);

  /* the wiring, over the real source */
  t('§5 engine: every payload that carries the thresholds goes through the ONE helper, and the old per-phase constant is gone',
    (() => {
      const uses = src.split('freshness_rules:').slice(1).map(s => s.slice(0, 48).trim());
      const ok = uses.length >= 6 && uses.every(u => /^await adtoolFreshnessRules\((env|ctx\.env)\)/.test(u) || /^FRh?,/.test(u) || /^R,/.test(u));
      const one = (src.match(/async function adtoolFreshnessRules\(env\) \{/g) || []).length === 1;
      /* the one payload that carries its pair as `R` carries the SAME pair, held to the cadence of the
         job it is judging: that is still one read and one law, not a second opinion. */
      const held = /const R = adtRollupFreshRules\(await adtoolFreshnessRules\(env\), 60\);/.test(src);
      return ok && one && held && !/ADTOOL_PEAK_FRESHNESS_RULES/.test(src);
    })(), src.split('freshness_rules:').slice(1).map(s => s.slice(0, 36).trim()));
  t('§5 engine: the helper reads the two named keys out of the settings store, and seeds them before it reads so a blank is never shown for a figure that is in force',
    (() => {
      const i = src.indexOf('async function adtoolFreshnessRules(env) {');
      const blk = i < 0 ? '' : src.slice(i, src.indexOf('\n}', src.indexOf('async function ensureAdtoolFreshConfig(env) {')));
      return /await ensureAdtoolFreshConfig\(env\);/.test(blk) &&
        /WHERE key LIKE 'adtool_fresh_%'/.test(blk) && /return adtFreshRules\(cfg\);/.test(blk) &&
        /ON CONFLICT\(key\) DO NOTHING/.test(blk) && /ADTOOL_FRESH_CFG_OK/.test(blk);
    })(), null);
  t('§5 alert: A23 is the stale rule, it reads high, and its own words name no figure \u2014 the limit is the settings\u2019 and not the sentence\u2019s',
    (() => {
      const A = F.ADTOOL_ALERT_RULES.A23;
      return !!A && A.sev === 'high' && A.action === 'check' && Object.keys(F.ADTOOL_ALERT_RULES).length === 23 &&
        /five-minute/.test(A.text) && !/\d/.test(A.text) && !/\d/.test(A.why_matters) && !/\u2014/.test(A.text + A.why_matters);
    })(), F.ADTOOL_ALERT_RULES.A23);
  t('§5 alert: A23 is judged on the SAME red figure the badges are, and only inside the window a reading can land in, after the day\u2019s first task has had time to build',
    (() => {
      const i = src.indexOf("    /* A23: the five-minute sampler going quiet.");
      const blk = i < 0 ? '' : src.slice(i, src.indexOf('/* reconcile with the open set', i));
      return /const FRa = await adtoolFreshnessRules\(env\);/.test(blk) &&
        /adtInSamplingWindow\(nowD\) && nowMins >= adtSamplingFromMin\(nowD\) \+ ADTOOL_SAMPLER_ALERT_GRACE_MIN/.test(blk) &&
        /ageS == null \|\| ageS > Number\(FRa\.red_min\)/.test(blk) &&
        /MAX\(sampled_at\) AS t FROM adtool_intraday_ticks/.test(blk) &&
        /put\('A23', 'all',/.test(blk) && !/\bred_min: *\d/.test(blk);
    })(), null);
  t('§6.7 grace: how long the alert waits after the window opens is ONE figure, kept beside the cadence and read by the alert, the today-freshness check and the probe alike',
    F.ADTOOL_SAMPLER_ALERT_GRACE_MIN === 15 &&
    /const ADTOOL_SAMPLER_ALERT_GRACE_MIN = 15;/.test(src) &&
    (src.match(/adtSamplingFromMin\(now\w*\) \+ ADTOOL_SAMPLER_ALERT_GRACE_MIN/g) || []).length === 2 &&
    /mins < fromMin \+ ADTOOL_SAMPLER_ALERT_GRACE_MIN/.test(src) &&
    /* and nowhere is it still typed beside one of those three */
    !/adtSamplingFromMin\(now\w*\) \+ 15\b/.test(src) && !/mins < fromMin \+ 15\b/.test(src),
    F.ADTOOL_SAMPLER_ALERT_GRACE_MIN);
  t('§5 Data health: the Sampler runs panel stands on what the sampler actually writes \u2014 the ticks, not a job row and not a sync cursor',
    (() => {
      const i = src.indexOf('async function adtSamplerPanel(env, rules, nowD) {');
      const blk = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i));
      return /FROM adtool_intraday_ticks ORDER BY sampled_at DESC LIMIT \?1/.test(blk) &&
        /adtSamplerRuns\(tickRows, \{ limit: ADTOOL_SAMPLER_RUNS_SHOWN, rules: R \}\)/.test(blk) &&
        /\(ADTOOL_SAMPLER_RUNS_SHOWN \+ 1\) \* 24/.test(blk) &&
        /sent_to_ebay: false/.test(blk) && /in_sampling_window: adtInSamplingWindow\(now\)/.test(blk) &&
        !/adtool_jobs/.test(blk) && !/FROM sync_state/.test(blk) && !/fetch\(/.test(blk);
    })(), null);
  t('\u00a76.7 Data health and the probe read the sampler through ONE function, so the page and the evidence a manager is handed cannot disagree about whether a sample landed',
    (() => {
      const page = src.slice(src.indexOf('  adtoolHealthPage: {'), src.indexOf('/* ADTOOL-P5-END'));
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      return (src.match(/async function adtSamplerPanel\(/g) || []).length === 1 &&
        (src.match(/await adtSamplerPanel\(env, FRh?, now\)/g) || []).length === 1 &&
        /const sampler = await adtSamplerPanel\(env, FRh, new Date\(\)\);/.test(page) &&
        /const lastSample = sampler\.last_sample;/.test(page) &&
        /sampler = await adtSamplerPanel\(env, FR, now\);/.test(probe) &&
        /* and neither of them keeps a grouping of its own beside it */
        !/adtSamplerRuns\(/.test(page) && !/adtSamplerRuns\(/.test(probe) &&
        !/adtool_intraday_ticks ORDER BY/.test(page) && !/adtool_intraday_ticks ORDER BY/.test(probe);
    })(), null);
  t('§5 Data health: the engine sends a stamp for every tile the page draws, each from the thing that last wrote that figure',
    (() => {
      const i = src.indexOf('const tile_stamps = {');
      const blk = i < 0 ? '' : src.slice(i, src.indexOf('\n      return { fresh: await adtFresh', i));
      const keys = ['number_checks', 'jobs', 'campaigns_unnamed', 'orders_not_costed', 'categories', 'sampler'];
      return keys.every(k => new RegExp(k + ': adtFreshStamp\\(').test(blk)) &&
        /validation_runs WHERE metric_id LIKE 'ADTOOL_%'/.test(blk) && /lastOk\('adsItems'\)/.test(blk) &&
        /lastOk\('orderSync'\)/.test(blk) && /lastOk\('listingSync'\)/.test(blk) &&
        /tile_stamps,/.test(src);
    })(), null);
  t('§5 page: every tile on Data health prints \u201cas of HH:MM UK\u201d, and a tile with nothing behind it says so instead of printing a time',
    (() => {
      const mo = readFile('frontend/view-adtool-morning.js');
      const stamped = ['TS.number_checks', 'TS.jobs', 'TS.campaigns_unnamed', 'TS.orders_not_costed', 'TS.categories']
        .every(k => mo.indexOf('moStamp(' + k + ', RU)') >= 0);
      return stamped && /moStamp\(SM, RU\)/.test(mo) &&
        /as of ' \+ esc\(String\(S\.as_of\)\) \+ ' UK'/.test(mo) &&
        /if \(!S\.as_of\) return '<div class="mo-asof">no reading yet<\/div>';/.test(mo);
    })(), null);
  t('§5 page: both thresholds are read off the answer on Data health, and neither figure is typed into the page',
    (() => {
      const mo = readFile('frontend/view-adtool-morning.js');
      return /var amber = num\(rules && rules\.amber_min\), red = num\(rules && rules\.red_min\);/.test(mo) &&
        /var RU = D\.freshness_rules \|\| null/.test(mo) &&
        !/amber_min: *\d/.test(mo) && !/red_min: *\d/.test(mo) && !/15 min/.test(mo) && !/60 min/.test(mo);
    })(), null);
  t('§5 page: the Sampler runs panel writes its cadence and its window from the answer, says in plain words how far apart the runs should be, and never prints nought for a gap it does not know',
    (() => {
      const mo = readFile('frontend/view-adtool-morning.js');
      const i = mo.indexOf('function samplerPanel(SM, RU) {');
      const blk = i < 0 ? '' : mo.slice(i, mo.indexOf('\n  /* ---------------- Data health ----------------', i));
      return /var every = num\(S\.every_min\);/.test(blk) &&
        /every \+ ' minutes' : ' every few minutes'/.test(blk) &&
        /should start/.test(blk) && /after the one before it/.test(blk) &&
        /esc\(String\(S\.sampling_window\)\)/.test(blk) &&
        /none on record/.test(blk) && !/\bevery 5 minutes\b/.test(blk) &&
        /Nothing on this panel reaches eBay/.test(blk);
    })(), null);
  t('§5 page: Live apply is where the two figures are changed, through the portal\u2019s own settings write, and it prints neither of them from itself',
    (() => {
      const st = readFile('frontend/view-adtool-stop.js');
      return /var FRESH_KEYS = \[/.test(st) && /\['amber_min',/.test(st) && /\['red_min',/.test(st) &&
        /ST\.flags && ST\.flags\.freshness_rules/.test(st) && /data-stfresh=/.test(st) &&
        /api\('adtoolFlags', \{ set: \{ key: key, value: v \} \}\)/.test(st) &&
        /Nothing is sent to eBay by this/.test(st) &&
        !/amber_min: *\d/.test(st) && !/red_min: *\d/.test(st);
    })(), null);
  t('§5 register: the freshness law and the sampler\u2019s runs each have a row, the rules row counts twenty-three, and the cadence in the words is written from the setting',
    (() => {
      const fr = rgAll.filter(r => r.id === 'FRESHNESS')[0], sr = rgAll.filter(r => r.id === 'SAMPLER_RUNS')[0];
      const ar = rgAll.filter(r => r.id === 'ALERT_RULES')[0];
      return !!fr && !!sr && !!ar && !/\d/.test(fr.formula) &&
        /Twenty-three things/.test(ar.formula) && /adtool_intraday_ticks/.test(ar.sources) &&
        /every 5 minutes/.test(sr.formula) && /' \+ ADTOOL_SAMPLER_EVERY_MIN \+ ' minutes/.test(src) &&
        /adtool_intraday_ticks/.test(sr.sources) && /portal_config/.test(fr.sources);
    })(), null);
  t('§5 videos: each of the four figures on the video panel carries the stamp of the thing that wrote it, in the one stamp shape, and the panel\u2019s own stamp is the sweep\u2019s and never the moment of the read',
    (() => {
      const i = src.indexOf('  const ladderAt = ladder.reduce');
      const blk = i < 0 ? '' : src.slice(i, src.indexOf('let overview = { plan: null', i));
      return /on_ebay: adtFreshStamp\(sweepAt\)/.test(blk) && /recorded: adtFreshStamp\(ladderAt\)/.test(blk) &&
        /both: adtFreshStamp\(bothAt\)/.test(blk) && /coverage: adtFreshStamp\(sweepAt\)/.test(blk) &&
        /Object\.assign\(cohort, adtFreshStamp\(sweepAt\)\);/.test(blk) &&
        /cohort\.read_at = CO\.as_of;/.test(blk) && !/cohort\.as_of = CO\.as_of;/.test(src);
    })(), null);
  t('§5: nothing this section added can reach eBay \u2014 it reads the record of samples already taken and writes two settings rows',
    (() => {
      const i = src.indexOf('async function adtoolFreshnessRules(env) {');
      const helper = i < 0 ? '' : src.slice(i, src.indexOf('/* ---- job: listings', i));
      const j = src.indexOf('function adtSamplerRuns(ticks, opts) {');
      const pureBlk = j < 0 ? '' : src.slice(j, src.indexOf('\nfunction adPeakUkDayOf(stamp) {', j));
      return !/fetch\(/.test(helper) && !/fetch\(/.test(pureBlk) && !/ebay/i.test(pureBlk) &&
        /INSERT INTO portal_config/.test(helper) && !/UPDATE /.test(helper);
    })(), null);

  /* \u00a76.7 THE FRESHNESS EVIDENCE BY KEY: the Data health panel without a browser session, so a
     night check can settle "are today's figures real" on its own. */
  t('\u00a76.7 probe: it is a sync-key route gated exactly as backupDump is, and it is NOT named with the adtool prefix \u2014 the dispatcher refuses that prefix unless the CALLER holds an advertising role, and a key route has no caller to hold one',
    (() => {
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      const dump = src.slice(src.indexOf('  backupDump: {'), src.indexOf('  backupDump: {') + 80);
      return /^  adsFreshnessProbe: \{\n    auth: 'sync', fn: async \(p, ctx\) => \{/.test(probe) &&
        /auth: 'sync'/.test(dump) &&
        /if \(action\.indexOf\('adtool'\) === 0 && !adtRoleAllowed\(ctx2\.user\)\) throw new AuthError\('auth'\);/.test(src) &&
        src.indexOf('  adsFreshnessProbe: {') > 0;
    })(), null);
  t('\u00a76.7 probe: it READS and nothing else \u2014 no eBay call of any kind and not one statement that changes a row',
    (() => {
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      return !/fetch\(/.test(probe) && !/ebay\.com/.test(probe) &&
        !/INSERT INTO/.test(probe) && !/\bUPDATE \w/.test(probe) && !/DELETE FROM/.test(probe) && !/CREATE TABLE/.test(probe) &&
        !/\.run\(\)/.test(probe) && !/HOT\.put/.test(probe) && !/method: '(POST|PUT|PATCH|DELETE)'/.test(probe) &&
        /sent_to_ebay: false,/.test(probe) && /writes: 'none',/.test(probe) &&
        /* a read that fails says so, because on an evidence route a refused look and a quiet day must not read the same */
        /read_errors: readErrors,/.test(probe) && /readErrors\.push\(/.test(probe);
    })(), null);
  t('\u00a76.7 probe: it carries the five things the brief asks for \u2014 the thresholds through the one helper, the last twelve runs, the A23 state, the window verdict, and the cadence',
    (() => {
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      return /const FR = await adtoolFreshnessRules\(env\);/.test(probe) && /freshness_rules: FR,/.test(probe) &&
        /sampler = await adtSamplerPanel\(env, FR, now\);/.test(probe) && /sampler: sampler,/.test(probe) &&
        /FROM adtool_alerts WHERE rule_id = 'A23' ORDER BY fired_at DESC LIMIT 1/.test(probe) &&
        /verdict: inWindow \? 'inside' : 'outside',/.test(probe) &&
        /inside: inWindow,/.test(probe) && /const inWindow = adtInSamplingWindow\(now\);/.test(probe) &&
        /every_min: ADTOOL_SAMPLER_EVERY_MIN,/.test(probe) && /sampling_window: windowState,/.test(probe);
    })(), null);
  t('\u00a76.7 probe: A23 open is cleared_at being empty \u2014 the same test the alerts screen draws \u2014 and a rule that never fired answers null, never a nought and never a date standing in for one',
    (() => {
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      return /open: !!\(a23Row && String\(a23Row\.cleared_at \|\| ''\) === ''\),/.test(probe) &&
        /open_since: \(a23Row && String\(a23Row\.cleared_at \|\| ''\) === ''\) \? \(a23Row\.fired_at \|\| null\) : null,/.test(probe) &&
        /ever_fired: !!a23Row,/.test(probe) &&
        /* every field of the state falls back to null, so nothing reads as a zero or a blank date */
        (probe.slice(probe.indexOf('const a23 = {'), probe.indexOf('/* THE WINDOW.')).match(/: null,/g) || []).length >= 8 &&
        /* the rule's own words come from the rule table, not a second copy of them */
        /what_it_says: \(ADTOOL_ALERT_RULES\.A23 \|\| \{\}\)\.text \|\| null,/.test(probe) &&
        !/five-minute reading of eBay/.test(probe);
    })(), null);
  t('\u00a76.7 probe: the window is worked out from the Pacific zone at this instant and the grace is the alert\u2019s own, so the probe can never say silence is a fault at a minute the alert would not have',
    (() => {
      const probe = src.slice(src.indexOf('  adsFreshnessProbe: {'), src.indexOf('  backupStamp: {'));
      return /opens_at: adtSamplingFromText\(now\),/.test(probe) && /window: adtSamplingWindowText\(now\),/.test(probe) &&
        /grace_min: ADTOOL_SAMPLER_ALERT_GRACE_MIN,/.test(probe) &&
        /alert_judging_now: inWindow && nowMins >= adtSamplingFromMin\(now\) \+ ADTOOL_SAMPLER_ALERT_GRACE_MIN,/.test(probe) &&
        /* THE TWO SENTENCES A READER IS SHOWN name no figure at all and carry no em-dash. Both must
           really be found, or this would pass by failing to look. */
        (() => {
          const a = probe.match(/'eBay has let[^']*'/), b = probe.match(/'eBay will not[^']*'/);
          if (!a || !b) return false;
          const words = a[0] + ' ' + b[0];
          return !/\d/.test(words) && !/\u2014/.test(words) && /silence/.test(words);
        })();
    })(), null);

  /* ---- 1 Nov: THE HOURLY ROLL-UP'S OWN BUDGET -------------------------------------------------
     The job was started every hour at :20 and finished twice in thirty hours: the invocation was
     ended by the platform ('exceededResources') and the row was left reading 'running', so the hour
     table, the day rows and every "every hour" stamp on the Peak time page stood still at 07:26 all
     day. These tests are the three rules that replace that: the order the pages need, a gate every
     step passes before it starts, and a job row that is honest about a run which stopped itself. */
  const rbSteps = (costs, due) => F.ADTOOL_ROLLUP_ORDER.slice(0, 7).map(n => ({ name: n, words: n, cost_ms: (costs || F.ADTOOL_ROLLUP_STEP_MS)[n], due: due && due[n] === false ? false : undefined }));
  const rbPlan = (o) => F.adtRollupPlan(o);

  t('roll-up budget: the whole run is planned inside 180 s of wall clock, with time held back for the last commit and the job row',
    F.ADTOOL_ROLLUP_BUDGET_MS === 180000 && F.ADTOOL_ROLLUP_RESERVE_MS > 0 && F.ADTOOL_ROLLUP_RESERVE_MS < 20000 &&
    rbPlan({ now_ms: 0, t0: 0, steps: [] }).left_ms === F.ADTOOL_ROLLUP_BUDGET_MS - F.ADTOOL_ROLLUP_RESERVE_MS,
    [F.ADTOOL_ROLLUP_BUDGET_MS, F.ADTOOL_ROLLUP_RESERVE_MS]);
  t('roll-up budget: today comes before yesterday, and both before the day beyond it and the tail — the owner’s "update every hour" is about today',
    (() => {
      const o = F.ADTOOL_ROLLUP_ORDER;
      return o.indexOf('today') < o.indexOf('yesterday') && o.indexOf('yesterday') < o.indexOf('day2') && o.indexOf('day2') < o.indexOf('tail') &&
        o.indexOf('orders') < o.indexOf('today') && o.indexOf('warm') === o.length - 1 &&
        o.indexOf('periods') < o.indexOf('day2');
    })(), F.ADTOOL_ROLLUP_ORDER);
  /* the first run after a deploy has measured nothing, so it works off the first guesses: a whole
     day of today at 70 s and a whole day of yesterday at 97 s do not both fit, and the honest answer
     is to do today and say where it stopped — not to begin yesterday and be killed inside it. */
  t('roll-up budget: on a first run, with nothing measured, the gate does the order roll and today and leaves the rest — not one step is begun that cannot finish',
    (() => {
      const pl = rbPlan({ now_ms: 0, t0: 0, steps: rbSteps() });
      return pl.run.join(',') === 'orders,today' && pl.cut === true && pl.cut_at === 'yesterday' &&
        pl.skipped.every(s => /next hour/.test(s.reason)) && pl.run_steps.reduce((a, b) => a + b.cost_ms, 0) <= pl.budget_ms - pl.reserve_ms;
    })(), rbPlan({ now_ms: 0, t0: 0, steps: rbSteps() }).run);
  t('roll-up budget: once a step is left for the next hour everything after it is left too — a cheap step never jumps the queue the order exists for',
    (() => {
      const pl = rbPlan({ now_ms: 0, t0: 0, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 40000 }, { name: 'b', cost_ms: 90000 }, { name: 'c', cost_ms: 1000 }] });
      return pl.run.join(',') === 'a' && pl.cut_at === 'b' && pl.skipped.length === 2 && pl.skipped[1].step === 'c' && /budget ran out at b/.test(pl.skipped[1].reason);
    })(), rbPlan({ now_ms: 0, t0: 0, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 40000 }, { name: 'b', cost_ms: 90000 }, { name: 'c', cost_ms: 1000 }] }));
  t('roll-up budget: a step that is not due this hour is skipped on its own terms and does not stop the ones below it — "not due" and "no time" are different facts and the trail says which',
    (() => {
      const pl = rbPlan({ now_ms: 0, t0: 0, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 10000, due: false, note: 'already done today' }, { name: 'b', cost_ms: 10000 }] });
      return pl.run.join(',') === 'b' && pl.cut === false && pl.skipped.length === 1 && pl.skipped[0].reason === 'already done today' && !/next hour/.test(pl.skipped[0].reason);
    })(), null);
  t('roll-up budget: the time already spent is charged against the budget, so a step late in a slow run is judged on the clock and not on the plan',
    (() => {
      const fresh = rbPlan({ now_ms: 1000, t0: 1000, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 60000 }] });
      const late = rbPlan({ now_ms: 51000, t0: 1000, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 60000 }] });
      return fresh.run.length === 1 && late.run.length === 0 && late.elapsed_ms === 50000 && /it needs 60 s and 50 s is left/.test(late.skipped[0].reason);
    })(), null);
  t('roll-up budget: a clock that cannot be read spends the whole budget and never borrows time it has not got',
    (() => {
      const pl = rbPlan({ budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 100000 }] });
      const neg = rbPlan({ now_ms: 500, t0: 1000, budget_ms: 100000, reserve_ms: 0, steps: [{ name: 'a', cost_ms: 100000 }] });
      return pl.elapsed_ms === 0 && pl.run.length === 1 && neg.elapsed_ms === 0;
    })(), null);
  t('roll-up budget: the measured rate is the two runs that finished (190 rows a second), and a size nobody can read costs null rather than nothing',
    F.ADTOOL_ROLLUP_ROWS_PER_S === 190 && F.adtRollupCostMs(190, 190) === 1000 && F.adtRollupCostMs(19000, 190) === 100000 &&
    F.adtRollupCostMs(null, 190) === null && F.adtRollupCostMs('x', 190) === null && F.adtRollupCostMs(-1, 190) === null,
    [F.adtRollupCostMs(190, 190), F.adtRollupCostMs(null, 190)]);
  t('roll-up budget: what a whole day is expected to cost is WORKED OUT from the rows that run wrote and the measured rate, not typed beside them, so the figure and its evidence cannot drift apart',
    F.ADTOOL_ROLLUP_WHOLE_DAY_MS === F.adtRollupCostMs(F.ADTOOL_ROLLUP_DAY_ROWS, F.ADTOOL_ROLLUP_ROWS_PER_S) &&
    F.ADTOOL_ROLLUP_DAY_ROWS === Math.round(53365 / 3) &&
    ['yesterday', 'day2', 'tail', 'catchup'].every(k => F.ADTOOL_ROLLUP_STEP_MS[k] === F.ADTOOL_ROLLUP_WHOLE_DAY_MS) &&
    F.ADTOOL_ROLLUP_WHOLE_DAY_MS < F.ADTOOL_ROLLUP_BUDGET_MS - F.ADTOOL_ROLLUP_RESERVE_MS,
    [F.ADTOOL_ROLLUP_DAY_ROWS, F.ADTOOL_ROLLUP_WHOLE_DAY_MS]);
  t('roll-up budget: the evidence itself — the three whole days the run used to rebuild every hour cannot fit one run at the measured rate, and today on its own can',
    (() => {
      const threeDays = F.adtRollupCostMs(53365, F.ADTOOL_ROLLUP_ROWS_PER_S);     // the 31 Oct 07:20 run
      const oneDay = F.adtRollupCostMs(Math.round(53365 / 3), F.ADTOOL_ROLLUP_ROWS_PER_S);
      return threeDays > F.ADTOOL_ROLLUP_BUDGET_MS && oneDay < F.ADTOOL_ROLLUP_BUDGET_MS - F.ADTOOL_ROLLUP_RESERVE_MS;
    })(), [F.adtRollupCostMs(53365, 190), F.adtRollupCostMs(17788, 190)]);
  t('roll-up budget: a measured step is budgeted at what it took plus the margin, a step never run keeps its first guess, and a freak measurement cannot lock a step out for good',
    (() => {
      const c = F.adtRollupStepCosts({ today: 20000, yesterday: 9999999 }, F.ADTOOL_ROLLUP_STEP_MS, F.ADTOOL_ROLLUP_COST_MARGIN);
      return c.today === 25000 && c.yesterday === F.ADTOOL_ROLLUP_BUDGET_MS && c.tail === F.ADTOOL_ROLLUP_STEP_MS.tail &&
        F.adtRollupStepCosts('not json', F.ADTOOL_ROLLUP_STEP_MS).today === F.ADTOOL_ROLLUP_STEP_MS.today &&
        F.adtRollupStepCosts(null, F.ADTOOL_ROLLUP_STEP_MS).orders === F.ADTOOL_ROLLUP_STEP_MS.orders &&
        F.adtRollupStepCosts({ today: 0 }, F.ADTOOL_ROLLUP_STEP_MS).today === F.ADTOOL_ROLLUP_STEP_MS.today;
    })(), F.adtRollupStepCosts({ today: 20000, yesterday: 9999999 }, F.ADTOOL_ROLLUP_STEP_MS, F.ADTOOL_ROLLUP_COST_MARGIN));
  t('roll-up budget: what a step is remembered costing jumps to its worst run at once and comes down only slowly — yesterday is cheap at the day flip and dear again when eBay’s report lands, and it must be budgeted at the dear price',
    (() => {
      const dear = F.adtRollupStepBlend(20000, 97000, F.ADTOOL_ROLLUP_COST_DECAY);
      const cheap = F.adtRollupStepBlend(97000, 20000, F.ADTOOL_ROLLUP_COST_DECAY);
      return dear === 97000 && cheap === 77600 && F.ADTOOL_ROLLUP_COST_DECAY > 0.5 && F.ADTOOL_ROLLUP_COST_DECAY < 1;
    })(), [F.adtRollupStepBlend(20000, 97000), F.adtRollupStepBlend(97000, 20000)]);
  t('roll-up budget: a step that did not run this hour is left exactly as it was, not decayed, and a step with neither a reading nor a figure held is null and never nought',
    F.adtRollupStepBlend(50000, undefined) === 50000 && F.adtRollupStepBlend(50000, null) === 50000 &&
    F.adtRollupStepBlend(undefined, 7000) === 7000 && F.adtRollupStepBlend(undefined, undefined) === null && F.adtRollupStepBlend(null, null) === null,
    [F.adtRollupStepBlend(50000, undefined), F.adtRollupStepBlend(undefined, undefined)]);
  t('roll-up budget: the job note says where the run stopped FIRST, because the note is cut at four hundred characters and that is the fact a reader needs',
    (() => {
      const n = F.adtRollupStepNote({ run_steps: [{ words: 'today' }, { words: 'yesterday' }], skipped: [{ words: 'the week and month sums', reason: 'left for the next hour: it needs 12 s and 3 s is left' }, { words: 'the page cache', reason: 'left for the next hour: the budget ran out at the week and month sums' }, { words: 'the tail day', reason: 'the tail round for today is already done' }] });
      return n.indexOf('left the week and month sums for the next hour') === 0 && /with the 1 step after it/.test(n) && /did today, yesterday/.test(n) && /not due: the tail day/.test(n);
    })(), F.adtRollupStepNote({ run_steps: [{ words: 'today' }], skipped: [{ words: 'x', reason: 'left for the next hour: no' }] }));
  t('roll-up budget: a run where nothing fitted says so rather than reading as a run with nothing to do',
    /nothing fitted the budget/.test(F.adtRollupStepNote({ run_steps: [], skipped: [{ words: 'today', reason: 'left for the next hour: it needs 70 s and 2 s is left' }] })) &&
    /did today/.test(F.adtRollupStepNote({ run_steps: [{ words: 'today' }], skipped: [] })), null);

  /* the hour cursor (item 3): the hours of today that are still filling, and nothing else */
  t('hour cursor: with no cursor, or one for another day, or one nobody can read, the whole of today is rebuilt — and that is "no cursor", never "hour nought"',
    (() => {
      const none = F.adtRollupHourCursor('', '2026-11-01', 14);
      const other = F.adtRollupHourCursor('2026-10-31|20', '2026-11-01', 14);
      const junk = F.adtRollupHourCursor('rubbish', '2026-11-01', 14);
      return none.from === 0 && none.whole_day === true && none.last_settled === null &&
        other.from === 0 && other.whole_day === true && /another day/.test(other.source) &&
        junk.from === 0 && junk.whole_day === true && junk.last_settled === null;
    })(), F.adtRollupHourCursor('2026-10-31|20', '2026-11-01', 14));
  t('hour cursor: a run rebuilds from the hour after the last settled one, and the hour it is standing in is rebuilt again next time because it is still filling',
    (() => {
      const at11 = F.adtRollupHourCursor('2026-11-01|10', '2026-11-01', 11);
      const at12 = F.adtRollupHourCursor(at11.next, '2026-11-01', 12);
      return at11.from === 11 && at11.next === '2026-11-01|10' && at12.from === 11 && at12.next === '2026-11-01|11';
    })(), [F.adtRollupHourCursor('2026-11-01|10', '2026-11-01', 11), F.adtRollupHourCursor('2026-11-01|10', '2026-11-01', 12)]);
  t('hour cursor: every hour is therefore written twice at most — once while it fills and once when it is done — where the old roll wrote all twenty-four of them every hour',
    (() => {
      let cur = '', writes = 0;
      for (let h = 0; h < 24; h++) { const c = F.adtRollupHourCursor(cur, '2026-11-01', h); for (let x = c.from; x <= h; x++) writes++; cur = c.next; }
      return writes === 47;      /* hour 0 once, every later hour twice */
    })(), (() => { let cur = '', w = 0; for (let h = 0; h < 24; h++) { const c = F.adtRollupHourCursor(cur, '2026-11-01', h); for (let x = c.from; x <= h; x++) w++; cur = c.next; } return w; })());
  t('hour cursor: at midnight nothing of today is settled yet, and the cursor says so instead of claiming hour nought',
    (() => { const c = F.adtRollupHourCursor('', '2026-11-01', 0); return c.from === 0 && c.next === '2026-11-01|-1' && F.adtRollupHourCursor(c.next, '2026-11-01', 0).from === 0; })(),
    F.adtRollupHourCursor('', '2026-11-01', 0));
  t('hour cursor: it only ever moves on, so a forced run at an earlier hour cannot make the next run rebuild hours it has already settled',
    F.adtRollupHourCursor('2026-11-01|18', '2026-11-01', 3).next === '2026-11-01|18' &&
    F.adtRollupHourCursor('2026-11-01|18', '2026-11-01', 3).from === 3,
    F.adtRollupHourCursor('2026-11-01|18', '2026-11-01', 3));
  t('hour cursor: an hour outside the day is held to it rather than refused, so a figure nobody understands can never stop the roll-up',
    F.adtRollupHourCursor('2026-11-01|99', '2026-11-01', 40).from === 23 && F.adtRollupHourCursor('2026-11-01|5', '2026-11-01', -3).from === 0,
    [F.adtRollupHourCursor('2026-11-01|99', '2026-11-01', 40).from, F.adtRollupHourCursor('2026-11-01|5', '2026-11-01', -3).from]);

  /* what a settled hour costs: nothing, unless something about it has really moved */
  t('settled hours: an hour whose figures have not moved prints the same and earns no write, and one with a sale cancelled inside it prints differently and earns one',
    (() => {
      const held = { orders: 2, units: 3, revenue: 29.97, impressions_s: 100, clicks_s: 4, spend_s: 1.2, attr_units_s: 1, clicks_r: 4, spend_r: 1.25, attr_units_r: 1, samples: 12, hourly_status: 'reconciled', carry_spend: 0.4 };
      const same = Object.assign({}, held);
      const cancelled = Object.assign({}, held, { orders: 1, units: 2, revenue: 19.98 });
      return F.adtHourPrint(held) === F.adtHourPrint(same) && F.adtHourPrint(held) !== F.adtHourPrint(cancelled);
    })(), null);
  t('settled hours: a null is not a nought — an hour with no reconciled spend and one reconciled to nought must never compare equal',
    (() => {
      const base = { orders: 1, units: 1, revenue: 9.99, impressions_s: 0, clicks_s: 0, spend_s: 0, attr_units_s: 0, samples: 0, hourly_status: 'none' };
      const noRec = Object.assign({}, base, { spend_r: null, clicks_r: null, attr_units_r: null, carry_spend: null });
      const zeroRec = Object.assign({}, base, { spend_r: 0, clicks_r: 0, attr_units_r: 0, carry_spend: 0 });
      return F.adtHourPrint(noRec) !== F.adtHourPrint(zeroRec) && /~/.test(F.adtHourPrint(noRec)) && F.adtHourPrint(undefined) === F.adtHourPrint(null);
    })(), [F.adtHourPrint({ spend_r: null }), F.adtHourPrint({ spend_r: 0 })]);
  t('settled hours: what the database hands back and what the upsert would write are printed the same way, money to the penny, so "unchanged" means unchanged and not "close enough"',
    F.adtHourPrint({ revenue: 29.97, spend_s: 1.2 }) === F.adtHourPrint({ revenue: 29.970000000000002, spend_s: 1.2000001 }) &&
    F.adtHourPrint({ revenue: 29.97 }) !== F.adtHourPrint({ revenue: 29.98 }), null);

  /* the week and month sums a run owes, carried so a cut can never lose them */
  t('owed sums: the span widens and is never replaced, so a run cut off before the re-sum leaves the days it rolled for the next run to re-sum',
    (() => {
      const a = F.adtRollupOwed('', ['2026-10-30']);
      const b = F.adtRollupOwed(a.text, ['2026-10-23']);
      const c = F.adtRollupOwed(b.text, ['2026-10-31']);
      return a.text === '2026-10-30|2026-10-30' && b.from === '2026-10-23' && b.to === '2026-10-30' && c.from === '2026-10-23' && c.to === '2026-10-31' && c.owed === true;
    })(), F.adtRollupOwed(F.adtRollupOwed('', ['2026-10-30']).text, ['2026-10-23']));
  t('owed sums: nothing owed is null and never a span of nought days, and a stored span nobody can read is nothing owed rather than a date invented for it',
    (() => {
      const none = F.adtRollupOwed('', []);
      const junk = F.adtRollupOwed('off', []);
      return none.owed === false && none.from === null && none.to === null && none.text === '' && junk.owed === false && junk.from === null &&
        F.adtRollupOwed('', ['not a day']).owed === false;
    })(), F.adtRollupOwed('off', []));

  /* item 5: the stamp the Peak time page prints, and the two thresholds behind it */
  t('roll-up freshness: nothing that runs once an hour is amber at fifteen minutes — amber is one missed slot and red is two, off the law’s own pair',
    (() => {
      const R = F.adtRollupFreshRules({ amber_min: 15, red_min: 60 }, 60);
      return R.amber_min === 60 && R.red_min === 120 && R.cadence_min === 60 &&
        F.adtFreshVerdict(new Date(Date.now() - 30 * 60000).toISOString(), R, Date.now()).verdict === 'ok' &&
        F.adtFreshVerdict(new Date(Date.now() - 75 * 60000).toISOString(), R, Date.now()).verdict === 'amber' &&
        F.adtFreshVerdict(new Date(Date.now() - 200 * 60000).toISOString(), R, Date.now()).verdict === 'red';
    })(), F.adtRollupFreshRules({ amber_min: 15, red_min: 60 }, 60));
  t('roll-up freshness: a manager who sets the figures higher keeps his own, amber never passes red, and a pair nobody set falls back to the law and not to nothing',
    (() => {
      const high = F.adtRollupFreshRules({ amber_min: 180, red_min: 360 }, 60);
      const odd = F.adtRollupFreshRules({ amber_min: 500, red_min: 90 }, 60);
      const none = F.adtRollupFreshRules(null, 60);
      return high.amber_min === 180 && high.red_min === 360 && odd.amber_min <= odd.red_min && none.red_min === 120 && none.amber_min === 60;
    })(), [F.adtRollupFreshRules({ amber_min: 180, red_min: 360 }, 60), F.adtRollupFreshRules(null, 60)]);
  t('roll-up freshness: the stall is said in a reader’s words, and an age nobody can work out is null and never "0 minutes"',
    F.adtRollupAgeWords(1) === 'a minute' && F.adtRollupAgeWords(75) === '75 minutes' && F.adtRollupAgeWords(100) === 'an hour' &&
    F.adtRollupAgeWords(300) === '5 hours' && F.adtRollupAgeWords(1500) === 'a day' && F.adtRollupAgeWords(4320) === '3 days' &&
    F.adtRollupAgeWords(null) === null && F.adtRollupAgeWords(-1) === null && F.adtRollupAgeWords('x') === null,
    [F.adtRollupAgeWords(100), F.adtRollupAgeWords(null)]);

  /* ---- the same rules, read off the source: the wiring, not a second copy of the arithmetic --- */
  const rbSrc = src.slice(src.indexOf('/* ADTOOL-P17-PURE-BEGIN */'), src.indexOf('async function adtoolRollupsFull(env) {'));
  /* 5 Nov: the driver is ONE body run by two jobs, the hourly slot and the catch-up slot, so the
     tests below read adtoolRollupRun and not the one-line wrapper each slot calls. */
  const rbDrv = src.slice(src.indexOf('async function adtoolRollupRun(env, part) {'), src.indexOf('/* THE DAYS THE 5 NOVEMBER AUDIT FOUND WRONG'));
  const rbSeed = src.slice(src.indexOf('async function adtoolRollupOwedSeed(env) {'), src.indexOf('async function adtoolRollupsFull(env) {'));
  t('roll-up engine: a run that stops itself writes its own row with status ‘cut’ — the trail never shows ‘running’ for a run that is over',
    /await adtJobEnd\(env, JOB, t, rows, coreCut \? 'cut' : 'ok', note\);/.test(rbDrv) &&
    (rbDrv.match(/adtJobEnd\(env, JOB, t, rows, coreCut \? 'cut' : 'ok', note\)/g) || []).length === 2 &&
    /const coreCut = leftOver\.length > 0;/.test(rbDrv) && /await adtJobEnd\(env, JOB, t, rows, 'error'/.test(rbDrv) &&
    /const JOB = PART === 'catchup' \? 'adtoolRollupsCatchup' : 'adtoolRollups';/.test(rbDrv), null);
  t('roll-up engine: the note on that row names the step the run reached, through the one function that writes it',
    /adtRollupStepNote\(\{ run_steps: ran, skipped: leftOver\.concat\(notDue\) \}\)/.test(rbDrv) && /'left ' \+ left\[0\] \+ ' for the next hour'/.test(rbSrc), null);
  t('roll-up engine: a row the platform left reading ‘running’ is closed by the next run as ‘killed’, before that run has a row of its own to catch',
    (() => {
      const wd = src.slice(src.indexOf('async function adtRollupWatchdog(env, job, deadMin) {'), src.indexOf('async function adtRollupFresh(env) {'));
      return /SET status = 'killed'/.test(wd) && /status = 'running'/.test(wd) && /started_at < \?2/.test(wd) &&
        F.ADTOOL_ROLLUP_DEAD_MIN === 20 && rbDrv.indexOf('adtRollupWatchdog(env, JOB,') < rbDrv.indexOf('adtJobStart(env, JOB)');
    })(), null);
  t('roll-up engine: the watchdog invents no finishing time for a run nobody watched end, and says in the row why there is none',
    (() => {
      const wd = src.slice(src.indexOf('async function adtRollupWatchdog(env, job, deadMin) {'), src.indexOf('async function adtRollupFresh(env) {'));
      return !/SET status = 'killed', finished_at/.test(wd) && /no finish was ever written/.test(wd) && /no finishing time to record/.test(wd);
    })(), null);
  t('roll-up engine: every long step goes through the gate, and the old invocation-cap gates that let one slow run take the slot down are gone',
    (() => {
      const gated = (rbDrv.match(/await step\(/g) || []).length;
      return gated >= 12 && /adtRollupPlan\(\{ now_ms: Date\.now\(\), t0: t0, budget_ms: BUDGET_MS/.test(rbDrv) &&
        !/Date\.now\(\) - t0 < 810000/.test(rbDrv) && !/Date\.now\(\) - t0 < 200000/.test(rbDrv) &&
        /const BUDGET_MS = PART === 'catchup' \? ADTOOL_ROLLUP_CATCHUP_BUDGET_MS : ADTOOL_ROLLUP_BUDGET_MS;/.test(rbDrv);
    })(), (rbDrv.match(/await step\(/g) || []).length);
  t('roll-up engine: today is rolled first and committed on its own, its cursor and its hour cursor in the one write',
    (() => {
      const iToday = rbDrv.indexOf("await step('today'"), iYday = rbDrv.indexOf("await step('yesterday'"), iDay2 = rbDrv.indexOf("await step('day2'");
      return iToday > 0 && iToday < iYday && iYday < iDay2 &&
        /adtoolRollupDays\(env, today, today, \{ hours_from: hc\.from, hours_from_day: today, periods: false, stats: st \}\)/.test(rbDrv) &&
        /const puts = \[cfgPut\('adtool_rollup_hour_cursor', hc\.next\)\];/.test(rbDrv) &&
        /if \(cursor >= histWanted\) puts\.push\(cfgPut\('adtool_rollup_cursor', today\)\);/.test(rbDrv);
    })(), null);
  t('roll-up engine: the hour cursor is kept under the name the brief gives it, and read through the one pure rule',
    /adtRollupHourCursor\(await adtFlag\(env, 'adtool_rollup_hour_cursor'\), today, ukH\)/.test(rbDrv) && /const ukH = adtUkParts\(Date\.now\(\)\)\.hour;/.test(rbDrv), null);
  t('roll-up engine: yesterday is rebuilt when its day closes and again when eBay’s report for it lands, and left alone the other twenty-two runs',
    /const ydayKey = yday \+ '\|' \+ repState;/.test(rbDrv) && /const ydayDue = \(await adtFlag\(env, 'adtool_rollup_yday'\)\) !== ydayKey;/.test(rbDrv) &&
    /await adtReportStatus\(env, yday\)/.test(rbDrv) && /cfgPut\('adtool_rollup_yday', ydayKey\)/.test(rbDrv), null);
  t('roll-up engine: every finished day is rolled with its hours settled, so a day that closed last week costs a write only where something about it really changed',
    (rbDrv.match(/hours_from: 24, hours_from_day: /g) || []).length === 5 && /hours_from: hc\.from, hours_from_day: today/.test(rbDrv) &&
    /hours_from: 24, hours_from_day: take\.day/.test(rbSeed), (rbDrv.match(/hours_from: 24/g) || []).length);
  t('roll-up engine: the tail round is a day per run on its own cursor, and the day stamp is set only when the round completes, so partial progress is kept',
    /adtRollupTailNext\(await adtFlag\(env, 'adtool_rollup_tail_day'\), tailFrom, tailTo\)/.test(rbDrv) &&
    /if \(tail\.next >= tailTo\) \{ puts\.push\(cfgPut\('adtool_tail_reroll_day', today\)\); puts\.push\(cfgPut\('adtool_rollup_tail_day', 'off'\)\); \}/.test(rbDrv) &&
    /else puts\.push\(cfgPut\('adtool_rollup_tail_day', tailFrom \+ '\|' \+ tail\.next\)\);/.test(rbDrv) &&
    !/const tailMid = /.test(rbDrv), null);
  t('roll-up engine: the history catch-up is a day at a time, not six — a six-day chunk could never finish inside any budget worth having',
    /const dayN = adtAddDays\(cursor, 1\);/.test(rbDrv) && !/adtAddDays\(from, 5\)/.test(rbDrv) && /if \(!went\) break;/.test(rbDrv) &&
    /cfgPut\('adtool_rollup_cursor', dayN\)/.test(rbDrv), null);
  t('roll-up engine: the week and month sums are a step of their own, paid before another finished day is taken on, and what is owed survives a run that is cut',
    /if \(O\.periods !== false\) written \+= await adtoolRollupPeriods\(env, fromDay, toDay\);/.test(src) &&
    /async function adtoolRollupPeriods\(env, fromDay, toDay\) \{/.test(src) &&
    (rbDrv.match(/periods: false/g) || []).length === 6 && /adtRollupOwed\(await adtFlag\(env, 'adtool_rollup_periods_owed'\), ownedDays\)/.test(rbDrv) &&
    rbDrv.indexOf('await doPeriods();\n      /* (d) the listing facts') < rbDrv.indexOf("await step('day2'"), null);
  t('roll-up engine: the hour rows carry when they were last rebuilt, and the Peak time page’s stamp reads that for today with the job’s own last finish behind it',
    (() => {
      const fr = src.slice(src.indexOf('async function adtRollupFresh(env) {'), src.indexOf('/* ---- job: rollups driver'));
      return /ALTER TABLE adtool_listing_hour ADD COLUMN computed_at TEXT/.test(src) && /computed_at = datetime\('now'\)/.test(src) &&
        /SELECT MAX\(computed_at\) AS t FROM adtool_listing_hour WHERE day = \?1/.test(fr) &&
        /job = 'adtoolRollups' AND \(status = 'ok' OR status = 'cut'\)/.test(fr) &&
        /cadence: 'every hour'/.test(fr) && /fresh: await adtRollupFresh\(env\)/.test(src);
    })(), null);
  t('roll-up engine: the stall is printed beside the stamp rather than only recorded, and a page with nothing rebuilt yet says so instead of reading as fresh',
    (() => {
      const fr = src.slice(src.indexOf('async function adtRollupFresh(env) {'), src.indexOf('/* ---- job: rollups driver'));
      /* the words themselves, sliced rather than matched out of the file: the sentences a reader
         sees must name no figure (the pair is the settings' business, not the sentence's) and carry
         no em-dash, and a test that read the comments around them would be testing the comments. */
      const say = fr.slice(fr.indexOf('note: at == null'), fr.indexOf('sent_to_ebay: false'));
      return /note: at == null \? 'the hourly roll-up has not written an hour for today yet'/.test(say) &&
        /is behind: these figures were last rebuilt/.test(say) && /has missed a slot/.test(say) &&
        say.length > 200 && !/\u2014/.test(say) && !/\d/.test(say);
    })(), null);
  /* THE DEADLOCK THIS NEARLY SHIPPED WITH. A rebuild resumes by re-entering its own branch with the
     cursor already back at the first ad day. Had its prerequisites been re-done every run they would
     have eaten the budget the first history day needs, the day would have been left for the next hour
     every hour, and the rebuild would never have moved a single day. That is a gate working perfectly
     and a job that never finishes, which is the exact failure this whole change is about. */
  t('roll-up engine: a rebuild does its prerequisites once and not once an hour for ever, so a resumed rebuild spends its budget moving a history day',
    /const beginning = cursor !== want;/.test(rbDrv) &&
    /if \(beginning\) puts\.push\(cfgPut\('adtool_rollup_rebuild_prep', 'off'\)\);/.test(rbDrv) &&
    /const done = \(await adtFlag\(env, 'adtool_rollup_rebuild_prep'\)\) === 'done';/.test(rbDrv) &&
    (rbDrv.match(/await startRebuild\(\);\n      await rebuildPrep\(\);/g) || []).length === 2 &&
    /await commit\('adtool_rollup_rebuild_prep', 'done'\);/.test(rbDrv), null);
  t('roll-up engine: the whole order book is a step of its own, never budgeted off the four-day roll’s measurement — the same name for both would gate the dear one on the cheap one’s time',
    /await step\('ordersall', 'the whole order book'/.test(rbDrv) && !/await step\('orders', 'the whole order book'/.test(rbDrv) &&
    F.ADTOOL_ROLLUP_STEP_MS.ordersall > F.ADTOOL_ROLLUP_STEP_MS.orders && F.ADTOOL_ROLLUP_ORDER.indexOf('ordersall') < 0, null);
  t('roll-up engine: what every step took is written back under one key, so the next run’s gate is arithmetic on measurement and not a figure somebody typed',
    /adtRollupStepBlend\(storedMs && storedMs\[k\], took\[k\], ADTOOL_ROLLUP_COST_DECAY\)/.test(rbDrv) &&
    /await commit\('adtool_rollup_step_ms', JSON\.stringify\(blended\)\);/.test(rbDrv) &&
    /adtRollupStepCosts\(storedRaw, ADTOOL_ROLLUP_STEP_MS, ADTOOL_ROLLUP_COST_MARGIN\)/.test(rbDrv) &&
    /cost\[name\] = Math\.min\(BUDGET_MS, Math\.round\(took\[name\] \* ADTOOL_ROLLUP_COST_MARGIN\)\);/.test(rbDrv), null);
  t('roll-up engine: nothing in any of it reaches eBay — the whole slot reads the engine’s own tables and writes the engine’s own tables',
    !/api\.ebay\.com/.test(rbSrc) && !/apiz?\.ebay/.test(rbSrc) && !/fetch\(/.test(rbSrc) && /sent_to_ebay: false/.test(rbSrc), null);

  /* ───────────────────────────────────────────────────────────────────────────────────────────────
     (10) 2 NOV, ACCOUNT TRAFFIC. The owner asked for the comparison bars on views as well as
     impressions, and for hour-to-hour bars that actually show something. The arithmetic behind the
     drawing is sliced out of the page and CALLED, not matched: a bar of the wrong height, and a
     month-back marker standing above the top of its own bar, are wrong figures shown to a manager
     and neither is visible to a regex over the source.
     ─────────────────────────────────────────────────────────────────────────────────────────────── */
  const trSrc = rdFile('frontend/view-traffic.js');
  const trPure = trSrc.slice(trSrc.indexOf('/* TRAFFIC-PURE-BEGIN'), trSrc.indexOf('/* TRAFFIC-PURE-END */'));
  let TRF = null, trFail = null;
  try { TRF = new Function(trPure + '\n return { trBarMax, trBarH, trMarkAt, trHourMerge };')(); }
  catch (e) { trFail = String((e && e.message) || e); }
  t('traffic: the page\u2019s own bar arithmetic is a block on its own that parses and can be called, with nothing of the document in it',
    !trFail && TRF && typeof TRF.trBarMax === 'function' && typeof TRF.trBarH === 'function' &&
    typeof TRF.trMarkAt === 'function' && typeof TRF.trHourMerge === 'function' &&
    trPure.length > 1500 && !/document\.|\besc\(|VIEW_CSS|\$\(/.test(trPure), trFail || trPure.length);

  const trRows = [{ date: '2026-11-01', impressions: 100, views: 10 }, { date: '2026-11-02', impressions: 50, views: 30 }];
  const trCmp = (r) => (r.date === '2026-11-01' ? { impressions: 400, views: 5 } : null);
  t('traffic: the scale covers the month-back level as well as the day, and each row takes its OWN maximum \u2014 one scale for both would press the views row flat against the floor',
    TRF.trBarMax(trRows, 'impressions', trCmp) === 400 && TRF.trBarMax(trRows, 'views', trCmp) === 30 &&
    TRF.trBarMax(trRows, 'impressions', null) === 100,
    [TRF.trBarMax(trRows, 'impressions', trCmp), TRF.trBarMax(trRows, 'views', trCmp)]);
  t('traffic: an empty window still scales to one, so no bar is ever a division by nought',
    TRF.trBarMax([], 'impressions', trCmp) === 1 && TRF.trBarMax(null, 'views', null) === 1 &&
    TRF.trBarMax([{ date: 'x' }], 'impressions', () => null) === 1, null);
  t('traffic: a bar is its share of the chart, floored so a thin day is still something to point at and never drawn past the top',
    TRF.trBarH(400, 400) === 100 && TRF.trBarH(200, 400) === 50 && TRF.trBarH(1, 400) === 4 &&
    TRF.trBarH(0, 400) === 4 && TRF.trBarH(0, 400, 2) === 2 && TRF.trBarH(900, 400) === 100 &&
    TRF.trBarH(null, 400) === 4,
    [TRF.trBarH(1, 400), TRF.trBarH(0, 400, 2), TRF.trBarH(900, 400)]);
  /* THE BUG THIS EXISTS FOR. The marker belongs at (month back / max) of the CHART, but it is drawn
     inside a bar that is only trBarH of that chart. Done as then/now it overshoots the chart every
     time the floor kicks in, and the dashed line lands above the top of the column it belongs to. */
  t('traffic: the month-back marker is placed against the CHART and then converted into the bar\u2019s own frame, so the height floor cannot push it off the top',
    TRF.trMarkAt(200, 400, 50) === 100 && TRF.trMarkAt(100, 400, 25) === 100 && TRF.trMarkAt(100, 400, 4) === 625 &&
    TRF.trMarkAt(0, 400, 50) === 0 && TRF.trMarkAt(500, 400, 0) === 0 && TRF.trMarkAt(1e9, 1, 1) === 10000,
    [TRF.trMarkAt(100, 400, 4), TRF.trMarkAt(1e9, 1, 1)]);
  t('traffic: wherever the marker ends up, its height measured against the CHART is the month-back figure\u2019s own share of the chart',
    (() => {
      for (const pair of [[3, 37], [1, 400], [400, 1], [250, 250], [0, 90]]) {
        const max = 400, h = TRF.trBarH(pair[0], max), at = TRF.trMarkAt(pair[1], max, h);
        if (Math.abs(h * at / 100 - pair[1] / max * 100) > 0.6) return false;
      }
      return true;
    })(), null);

  /* THE THREE HOUR SERIES. traffic_hour was created on 2 Nov and holds nothing earlier; the order
     book holds every hour of its whole history. A source with nothing for the day must leave ITS
     series missing in all twenty-four slots, because a nought is a reading and "we have none" is
     not one, and drawing them as the same bar is what made the owner's page look broken. */
  const trClock = [{ hour: 8, impressions: 90, views: 9, samples: 3 }, { hour: 9, impressions: 110, views: 11, samples: 4 }];
  const trSold = [{ hour: 8, orders: 2, units: 3 }, { hour: 20, orders: 1, units: 1 }];
  const trM = TRF.trHourMerge(trClock, trSold, { upto: 23 });
  t('traffic: the three hour series merge into twenty-four slots in clock order, each hour carrying all three',
    trM.slots.length === 24 && trM.slots.every((s, i) => s.hour === i) &&
    trM.slots[8].impressions === 90 && trM.slots[8].views === 9 && trM.slots[8].sold === 3 && trM.slots[8].orders === 2 &&
    trM.slots[9].impressions === 110 && trM.slots[20].sold === 1,
    [trM.slots.length, trM.slots[8], trM.slots[20]]);
  t('traffic: inside a day the source DOES hold, an hour with no row is a real nought \u2014 both sources record every unit of their series against an hour',
    trM.slots[0].impressions === 0 && trM.slots[0].views === 0 && trM.slots[0].sold === 0 && trM.slots[0].orders === 0 &&
    trM.totals.impressions === 200 && trM.totals.sold === 4 && trM.totals.samples === 7, [trM.slots[0], trM.totals]);
  t('traffic: a source holding NOTHING for the day leaves its own series missing in every slot, and missing is never nought',
    (() => {
      const noClock = TRF.trHourMerge([], trSold, { upto: 23 });
      const noSold = TRF.trHourMerge(trClock, null, { upto: 23 });
      return noClock.slots.every(s => s.impressions === null && s.views === null && s.samples === null) &&
        noClock.has.impressions === false && noClock.has.views === false && noClock.totals.impressions === null &&
        noClock.totals.views === null && noClock.slots[20].sold === 1 && noClock.has.sold === true &&
        noSold.slots.every(s => s.sold === null && s.orders === null) && noSold.has.sold === false &&
        noSold.totals.sold === null && noSold.slots[8].impressions === 90;
    })(), null);
  t('traffic: an hour that has not come round yet holds no reading either, and a row the source really HAS is shown whatever the viewer\u2019s clock says',
    (() => {
      const T = TRF.trHourMerge(trClock, trSold, { upto: 9 });
      return T.slots[10].impressions === null && T.slots[10].sold === null &&
        T.slots[9].impressions === 110 && T.slots[0].impressions === 0 &&
        /* the 20:00 order is an order at 20:00 even on a machine that thinks it is nine in the morning */
        T.slots[20].sold === 1 && T.slots[20].orders === 1 && T.slots[20].impressions === null;
    })(), null);
  t('traffic: twenty-four hours is the whole of it \u2014 an hour outside the clock is dropped rather than drawn as a twenty-fifth bar',
    (() => {
      const odd = TRF.trHourMerge([{ hour: 24, impressions: 9 }, { hour: -1, impressions: 9 }], null, {});
      const dflt = TRF.trHourMerge(trClock, trSold);
      return odd.slots.length === 24 && odd.has.impressions === false && odd.totals.impressions === null &&
        dflt.slots.length === 24 && dflt.slots[23].impressions === 0;
    })(), null);

  /* the engine half: the reads behind those series */
  /* THE FUNCTION'S OWN BODY, not everything up to the next one: slicing to `async function
     trafficNow` made the sampler's helpers, which do write, count as the hour block's own code. A
     top-level declaration ends at the first `}` in column one. */
  const trHBi = src.indexOf('async function trafficHourBlock(env, o) {');
  const trHB = src.slice(trHBi, src.indexOf('\n}\n', trHBi) + 3);
  const trBoard = src.slice(src.indexOf('  trafficBoard: {'), src.indexOf('  /* THE HOUR BLOCK, READABLE WITH THE SYNC KEY ALONE'));
  /* the probe WITH the note above it: the reason it is authenticated the way it is, and the reason
     it is not named adtool*, are written there and are the part a reader needs. */
  const trProbe = src.slice(src.indexOf('  /* THE HOUR BLOCK, READABLE WITH THE SYNC KEY ALONE'), src.indexOf("  /* THE ORDERS BOARD (Hasib's item 2"));
  t('traffic engine: every hour read is BOUNDED \u2014 an hour grouping can only answer twenty-four rows, the day list is capped, and the two single-figure reads ask for one',
    (trHB.match(/LIMIT 24/g) || []).length === 4 && (trHB.match(/LIMIT 1/g) || []).length === 2 &&
    /LIMIT ' \+ TRAFFIC_HOUR_DAYS_SHOWN/.test(trHB) && /const TRAFFIC_HOUR_DAYS_SHOWN = 30;/.test(src) &&
    !/SELECT \* FROM/.test(trHB),
    [(trHB.match(/LIMIT 24/g) || []).length, (trHB.match(/LIMIT 1/g) || []).length]);
  t('traffic engine: the hour block writes nothing, makes no schema and reaches nothing outside the database, and every read goes through the one helper that records a refusal',
    (trHB.match(/env\.DB\.prepare\(/g) || []).length === 1 && /readErrors\.push\(what \+ ': '/.test(trHB) &&
    !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER)\b/.test(trHB) && !/fetch\(/.test(trHB) &&
    !/ensureTrafficSchema/.test(trHB) && /sent_to_ebay: false/.test(trHB), null);
  t('traffic engine: the sold series comes from the order book\u2019s own hour and its own column names, through the aliased read the SQL checker can judge',
    /SELECT o\.local_hour AS hour, COUNT\(\*\) AS orders, SUM\(COALESCE\(o\.qty, 1\)\) AS units/.test(trHB) &&
    /FROM adtool_orders o /.test(trHB) && /o\.status <> 'CANCELLED'/.test(trHB) &&
    /ROUND\(SUM\(COALESCE\(o\.sale_price, 0\)\), 2\) AS revenue/.test(trHB) && !/o\.sold\b/.test(trHB), null);
  t('traffic engine: a day eBay is still counting is kept out of BOTH averages and out of the day count that divides them, or every hour\u2019s average would be dragged down by the part of today still to come',
    /const lastSettled = to < today \? to : yday;/.test(trHB) &&
    /date >= \?1 AND date <= \?2/.test(trHB) && /o\.local_date >= \?1 AND o\.local_date <= \?2/.test(trHB) &&
    /const spanDays = from <= lastSettled/.test(trHB), null);
  t('traffic engine: the clock\u2019s average is divided by the days the CLOCK holds and the order book\u2019s by the settled days of the window, and an average with no days behind it is null rather than nought',
    /const per = \(v, n\) => n > 0 \? Math\.round\(\(Number\(v\) \|\| 0\) \/ n \* 10\) \/ 10 : null;/.test(trHB) &&
    /const hoursAvg = avgDays > 0 \?/.test(trHB) && /const hoursSoldAvg = spanDays > 0 \?/.test(trHB) &&
    /: null;/.test(trHB) && /hours_avg_days: avgDays \|\| null/.test(trHB) &&
    /hour_samples: hours\.length \? sum\(hours, 'samples'\) : null/.test(trHB), null);
  t('traffic engine: an empty clock today is SAID, not acted on \u2014 moving the day under the reader would leave them looking at figures they never asked for',
    /hour_clock_empty_today: !!\(todayEmpty && earlierHeld\)/.test(trHB) &&
    /const todayEmpty = day === today &&/.test(trHB) && /const earlierHeld = /.test(trHB) &&
    /const hourDay = okDate\(p\.hour_date\) \? String\(p\.hour_date\) : ukDate\(''\);/.test(trBoard), null);
  t('traffic: the page and the key-authed probe read the hour block through ONE function, so the screen and the evidence a manager is handed cannot disagree about whether an hour holds anything',
    (src.match(/async function trafficHourBlock\(/g) || []).length === 1 &&
    (src.match(/await trafficHourBlock\(/g) || []).length === 2 &&
    /const HB = await trafficHourBlock\(ctx\.env, \{ day: hourDay, account, from: dFrom, to: dTo, today: ukDate\(''\) \}\);/.test(trBoard) &&
    /const HB = await trafficHourBlock\(env, \{ day, account, from, to: today, today \}\);/.test(trProbe) &&
    !/FROM traffic_hour/.test(trBoard) && !/FROM traffic_hour/.test(trProbe), null);
  /* THE RECONCILIATION. The engine half and the page half of this change were built in one file
     each and each reads green on its own. A name the engine does not send renders as an empty cell,
     which a reader takes for a nought, so every field is held from BOTH sides: the engine really
     sends it, and the page really reads it. */
  t('traffic board: the three new series, the two averages and what the clock holds all reach the page under the names the page really reads them by',
    ['hours_sold: HB.hours_sold', 'hours_sold_prev: HB.hours_sold_prev', 'hours_avg: HB.hours_avg',
     'hours_avg_days: HB.hours_avg_days', 'hours_sold_avg: HB.hours_sold_avg',
     'hours_sold_avg_days: HB.hours_sold_avg_days', 'hour_days: HB.hour_days',
     'hour_clock_from: HB.hour_clock_from', 'hour_clock_days: HB.hour_clock_days',
     'hour_samples: HB.hour_samples', 'hour_clock_empty_today: HB.hour_clock_empty_today']
      .every(k => trBoard.indexOf(k) > 0) &&
    ['d.hours_sold', 'd.hours_sold_prev', 'd.hours_avg', 'd.hours_avg_days', 'd.hours_sold_avg',
     'd.hours_sold_avg_days', 'd.hour_clock_from', 'd.hour_clock_days', 'd.hour_samples',
     'd.hour_clock_empty_today', 'd.hour_prev_date', 'd.hour_date']
      .every(k => trSrc.indexOf(k) > 0),
    ['hours_sold: HB.hours_sold', 'hour_clock_days: HB.hour_clock_days'].filter(k => trBoard.indexOf(k) < 0)
      .concat(['d.hours_sold_avg_days', 'd.hour_clock_days'].filter(k => trSrc.indexOf(k) < 0)));
  t('traffic probe: the sync key and nothing else, never named adtool* because the router role-gates that prefix before it has a user to judge',
    /\n  adsTrafficProbe: \{\n    auth: 'sync', fn: async \(p, ctx\) => \{/.test(src) &&
    !/\n  adtoolTraffic/.test(src) && /gate like backupDump|Authenticated exactly as backupDump is/.test(trProbe) &&
    /auth: 'sync', fn: async \(p, ctx\) => \{/.test(src.slice(src.indexOf('  backupDump: {'), src.indexOf('  backupDump: {') + 80)), null);
  t('traffic probe: it writes nothing, makes no schema, reaches nothing outside the database, and says so in the answer',
    !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER)\b/.test(trProbe) && !/fetch\(/.test(trProbe) &&
    !/ensureTrafficSchema/.test(trProbe) && /sent_to_ebay: false, writes: 'none', read_errors: readErrors/.test(trProbe), null);
  t('traffic probe: it answers the only questions worth asking from outside \u2014 when the clock started, which dates it holds, the day\u2019s three series, the window\u2019s averages, and whether the job that fills it last refused',
    /hour_clock_from: HB\.hour_clock_from/.test(trProbe) && /\(HB\.hour_days \|\| \[\]\)\.slice\(0, 14\)/.test(trProbe) &&
    /day_series: \{/.test(trProbe) && /impressions_views: HB\.hours, sold: HB\.hours_sold/.test(trProbe) &&
    /month_back: \{ date: HB\.hour_prev_date/.test(trProbe) && /hours_avg: HB\.hours_avg/.test(trProbe) &&
    /hours_sold_avg: HB\.hours_sold_avg/.test(trProbe) &&
    /WHERE job = 'trafficNow' ORDER BY account LIMIT 20/.test(trProbe) &&
    /refusals: runs\.filter\(\(r\) => String\(r\.last_error \|\| ''\) !== ''\)/.test(trProbe) &&
    /db_now: nowRow \? nowRow\.now : null/.test(trProbe), null);

  /* ===== THE SAMPLER INSIDE THE QUOTA (2 Nov, the 429s) =====================================
     Within an hour of the five-minute clock going live, eBay was answering "Too many requests" on
     six of its eight accounts, the fleet row still read ok, and the owner opened the page to nothing.
     8 accounts x 288 runs a day = 2,304 traffic-report calls. These are the rules that keep it
     inside the quota, and the arithmetic below is the whole of the fix. */
  t('traffic quota: the reserve is a share of EBAY’S OWN limit, the default is used when nobody has set one, and a limit nobody has read is null rather than a limit of nought',
    F.trfReserveCalls(1000, null) === Math.ceil(1000 * F.TRAFFIC_QUOTA_RESERVE_PCT / 100) &&
    F.trfReserveCalls(1000, '') === F.trfReserveCalls(1000, null) &&
    F.trfReserveCalls(1000, 'rubbish') === F.trfReserveCalls(1000, null) &&
    /* and a key somebody really HAS set to nought is honoured, which is why an unset key cannot
       simply be read through Number: both come out 0 and they mean opposite things */
    F.trfReserveCalls(1000, 50) === 500 && F.trfReserveCalls(1000, 0) === 0 && F.trfReserveCalls(1000, '0') === 0 &&
    F.trfReserveCalls(null, null) === null && F.trfReserveCalls(0, null) === null &&
    F.trfReserveCalls(-5, null) === null,
    [F.trfReserveCalls(1000, null), F.trfReserveCalls(1000, 50), F.trfReserveCalls(null, null)]);
  t('traffic quota: the CADENCE falls out of the quota — what is left after the reserve and the once-a-day per-listing reads, spread over a day, divided between the accounts',
    /* 1000 a day, a fifth held back, sixteen for the per-listing reads, eight accounts: 784 / 8 = 98 reads each, one every 14.7 min */
    F.trfSampleIntervalMin(1000, 20, 8) === 14.7 &&
    /* halve the limit and the wait doubles; take more reserve and it stretches */
    F.trfSampleIntervalMin(500, 20, 8) === 30 && F.trfSampleIntervalMin(1000, 50, 8) === 23.9 &&
    /* fewer accounts share it out further */
    F.trfSampleIntervalMin(1000, 20, 4) === 7.3 &&
    /* and the rounding is always UP: rounding an interval down is spending calls the quota has not got */
    F.trfSampleIntervalMin(999, 20, 8) === 14.8 &&
    /* 5 Nov, THE FIGURE THAT MATTERS: eBay's published hundred a day, five per cent held back, sixteen
       for the per-listing reads, eight accounts = 79 reads for the sampler, one per account every 145.9 min */
    F.TRAFFIC_DOC_LIMIT_PER_DAY === 100 && F.TRAFFIC_LISTING_CALLS_PER_DAY === 2 && F.TRAFFIC_QUOTA_RESERVE_PCT === 5 &&
    F.trfSampleIntervalMin(F.TRAFFIC_DOC_LIMIT_PER_DAY, null, 8) === 145.9,
    [F.trfSampleIntervalMin(1000, 20, 8), F.trfSampleIntervalMin(500, 20, 8), F.trfSampleIntervalMin(1000, 50, 8), F.trfSampleIntervalMin(999, 20, 8)]);
  t('traffic quota: nothing known about the limit is NOT an interval of nought — it is null, and the cadence in force then falls out of eBay’s PUBLISHED limit, never the ladder’s fifteen minutes',
    F.trfSampleIntervalMin(null, 20, 8) === null && F.trfSampleIntervalMin(0, 20, 8) === null &&
    F.trfSampleIntervalMin(1000, 20, 0) === null && F.trfSampleIntervalMin(1000, 20, null) === null &&
    /* a limit smaller than its own reserve leaves nothing to spend, which is null and never a divide by nought */
    F.trfSampleIntervalMin(1, 99, 8) === null &&
    /* 5 Nov: fifteen minutes spent the day's hundred calls by half past eleven every morning; the
       published figure stands in until eBay's own answer can be read, and the ladder's rung is
       only ever the answer when there are no accounts to share it between */
    F.trfCadenceMin(null, 20, 8) === F.trfSampleIntervalMin(F.TRAFFIC_DOC_LIMIT_PER_DAY, 20, 8) &&
    F.trfCadenceMin(null, null, 8) === 145.9 && F.trfCadenceMin(null, 20, 0) === F.TRAFFIC_BACKOFF_FIRST_MIN &&
    F.trfCadenceMin(1000, 20, 8) === 14.7,
    [F.trfSampleIntervalMin(null, 20, 8), F.trfCadenceMin(null, 20, 8)]);
  t('traffic quota: the accounts are STAGGERED across the ticks of one cycle, so a tick is one or two eBay calls and never eight, and every account gets exactly one turn per cycle',
    (() => {
      const iv = F.trfSampleIntervalMin(1000, 20, 8), n = 8;
      const c = F.trfCycleTicks(iv, F.TRAFFIC_TICK_MIN);                      // 14.4 min / 5 = 3 ticks
      const want = []; for (let i = 0; i < n; i++) want.push(F.trfAccountTick(i, n, c));
      const perTick = {}; want.forEach(w => { perTick[w] = (perTick[w] || 0) + 1; });
      const onEveryTick = F.trfCycleTicks(F.TRAFFIC_TICK_MIN, F.TRAFFIC_TICK_MIN) === 1 &&
        F.trfAccountTick(7, 8, 1) === 0;                                      // a cycle of one tick serves all
      return c === 3 && JSON.stringify(want) === JSON.stringify([0, 0, 0, 1, 1, 1, 2, 2]) &&
        Object.keys(perTick).length === c && Math.max.apply(null, Object.keys(perTick).map(k => perTick[k])) <= Math.ceil(n / c) &&
        /* a tick index advances once per tick and the cycle repeats */
        F.trfTickIndex(Date.parse('2026-11-02T15:04:00Z'), 5) - F.trfTickIndex(Date.parse('2026-11-02T14:59:00Z'), 5) === 1 &&
        onEveryTick;
    })(), null);
  t('traffic backoff: the ladder is fifteen minutes, then thirty, an hour, two, and no further — and a refusal at the ceiling stays at the ceiling',
    (() => {
      const steps = []; let m = 0;
      for (let k = 0; k < 6; k++) { m = F.trfBackoffNextMin(m); steps.push(m); }
      const first = F.TRAFFIC_BACKOFF_FIRST_MIN, max = F.TRAFFIC_BACKOFF_MAX_MIN;
      return JSON.stringify(steps) === JSON.stringify([first, first * 2, first * 4, max, max, max]) &&
        F.trfBackoffNextMin(null) === first && F.trfBackoffNextMin(0) === first &&
        F.trfBackoffNextMin('') === first && F.trfBackoffNextMin(-9) === first;
    })(), null);
  t('traffic backoff: the instant stored is exactly that many minutes ahead, and an instant that has passed is no backoff at all rather than a wait of nought',
    (() => {
      const now = Date.parse('2026-11-02T15:00:00Z');
      const b1 = F.trfBackoffUntil(now, 0), b2 = F.trfBackoffUntil(now, b1.minutes);
      return b1.minutes === F.TRAFFIC_BACKOFF_FIRST_MIN && b1.until === '2026-11-02T15:15:00.000Z' &&
        b2.minutes === F.TRAFFIC_BACKOFF_FIRST_MIN * 2 && b2.until === '2026-11-02T15:30:00.000Z' &&
        F.trfBackoffLeftMin(b1.until, now) === 15 && F.trfBackoffLeftMin(b1.until, now + 16 * 60000) === null &&
        F.trfBackoffLeftMin('', now) === null && F.trfBackoffLeftMin(null, now) === null &&
        /* D1 stamps a time with no zone and means UTC; read as local it would be a whole hour out on a BST day */
        F.trfParseUtc('2026-11-02 15:00:00') === now && F.trfParseUtc('2026-11-02T15:00:00Z') === now &&
        F.trfParseUtc('') === null && F.trfParseUtc('not a time') === null;
    })(), null);
  t('traffic sampler: THE ORDER OF THE SKIPS — a refusal is honoured before anything else, then the quota reserve, then the account’s turn, and only a decision that passes all three reaches eBay',
    (() => {
      const now = Date.parse('2026-11-02T15:04:00Z');
      const base = { now_ms: now, remaining: 900, reserve: 200, interval_min: 14.4, tick_min: 5, accounts: 8, index: 0, last_call_at: '' };
      const due = F.trfSampleDecision(base);
      /* a held-back account is skipped even with a full quota and its turn on this very tick */
      const held = F.trfSampleDecision(Object.assign({}, base, { backoff_until: '2026-11-02T15:30:00Z' }));
      /* the reserve bites before the turn is even looked at */
      const thin = F.trfSampleDecision(Object.assign({}, base, { remaining: 199 }));
      const exact = F.trfSampleDecision(Object.assign({}, base, { remaining: 200 }));
      /* not this account's tick */
      const other = F.trfSampleDecision(Object.assign({}, base, { index: 7 }));
      /* its tick, but it was read a moment ago: a tick delivered twice must not read twice */
      const early = F.trfSampleDecision(Object.assign({}, base, { last_call_at: '2026-11-02 15:03:00' }));
      /* eBay not saying how many calls are left is not nought left */
      const unknown = F.trfSampleDecision(Object.assign({}, base, { remaining: null }));
      return due.call === true && due.reason === 'due' &&
        held.call === false && held.reason === 'backoff' && held.left_min === 26 &&
        thin.call === false && thin.reason === 'reserve' && /199/.test(thin.note) && /200/.test(thin.note) &&
        exact.call === true && other.call === false && other.reason === 'turn' && other.note === '' &&
        early.call === false && early.reason === 'early' && unknown.call === true;
    })(), null);
  t('traffic sampler: THE BASELINE RULE — a day’s first reading is credited IN FULL (the record began at nought at midnight Pacific; the caller spreads it), the second credits the difference, and a restatement downwards credits nothing and does not lower the mark',
    (() => {
      const first = F.trfClockCredit(null, { impressions: 40000, views: 900, transactions: 12 });
      const second = F.trfClockCredit(first.store, { impressions: 40250, views: 912, transactions: 12 });
      const still = F.trfClockCredit(second.store, { impressions: 40250, views: 912, transactions: 12 });
      const down = F.trfClockCredit(second.store, { impressions: 39000, views: 900, transactions: 11 });
      const backUp = F.trfClockCredit(down.store, { impressions: 40250, views: 912, transactions: 12 });
      const past = F.trfClockCredit(backUp.store, { impressions: 40300, views: 912, transactions: 12 });
      return first.baseline === true && first.credit && first.credit.impressions === 40000 && first.credit.views === 900 && first.store.impressions === 40000 &&
        /* a first reading of nought is a baseline with nothing to credit */
        F.trfClockCredit(null, { impressions: 0, views: 0, transactions: 0 }).credit === null &&
        second.baseline === false && second.credit.impressions === 250 && second.credit.views === 12 &&
        second.credit.transactions === 0 && second.store.impressions === 40250 &&
        /* nothing moved is null, never a credit of nought written into the hour */
        still.credit === null &&
        /* the mark holds at the high-water figure, so the climb back to it is not counted a second time */
        down.credit === null && down.store.impressions === 40250 && backUp.credit === null &&
        past.credit.impressions === 50;
    })(), null);
  t('traffic sampler: THE SPREAD — a rise is shared over the UK hours between the last reading and this one in proportion to the minutes each hour contributed, whole units with the remainder on the last hour, and a span of nothing is the hour it was seen in',
    (() => {
      const from = Date.parse('2026-11-05T08:30:00Z'), to = Date.parse('2026-11-05T10:54:00Z');
      const s = F.trfSpreadCredit(from, to, { impressions: 1440, views: 10, transactions: 1 });
      const sum = (k) => s.reduce((a, r) => a + r[k], 0);
      const one = F.trfSpreadCredit(to, to, { impressions: 7, views: 0, transactions: 0 });
      const back = F.trfSpreadCredit(to, from, { impressions: 7, views: 0, transactions: 0 });
      const night = F.trfSpreadCredit(Date.parse('2026-07-04T22:30:00Z'), Date.parse('2026-07-05T00:10:00Z'), { impressions: 100, views: 0, transactions: 0 });
      return s.length === 3 && s[0].hour === 8 && s[0].impressions === 300 && s[1].hour === 9 && s[1].impressions === 600 && s[2].hour === 10 && s[2].impressions === 540 &&
        sum('impressions') === 1440 && sum('views') === 10 && sum('transactions') === 1 && s[2].transactions === 1 &&
        s.every((r) => r.date === '2026-11-05') &&
        one.length === 1 && one[0].hour === 10 && one[0].impressions === 7 &&
        back.length === 1 && back[0].hour === 8 && back[0].impressions === 7 &&
        F.trfSpreadCredit(from, to, { impressions: 0, views: 0, transactions: 0 }).length === 0 &&
        F.trfSpreadCredit(NaN, NaN, { impressions: 5 }).length === 0 &&
        /* a span over UK midnight in summer lands on the UK dates and hours, not the UTC ones */
        night.length === 3 && night[0].date === '2026-07-04' && night[0].hour === 23 && night[1].date === '2026-07-05' && night[1].hour === 0 && night[2].hour === 1 &&
        night[0].impressions === 30 && night[1].impressions === 60 && night[2].impressions === 10;
    })(), null);
  t('traffic sampler: EBAY’S DAY is a Pacific day — it begins at 08:00 UK in winter and 07:00 UTC in summer, the clock-change days included, and the date step never leaves the calendar',
    new Date(F.trfPtDayStartMs('2026-11-05')).toISOString() === '2026-11-05T08:00:00.000Z' &&
    new Date(F.trfPtDayStartMs('2026-07-05')).toISOString() === '2026-07-05T07:00:00.000Z' &&
    new Date(F.trfPtDayStartMs('2026-11-01')).toISOString() === '2026-11-01T07:00:00.000Z' &&
    new Date(F.trfPtDayStartMs('2026-03-08')).toISOString() === '2026-03-08T08:00:00.000Z' &&
    F.trfPtDayStartMs('rubbish') === null &&
    F.trfPtDate(Date.parse('2026-11-05T07:59:00Z')) === '2026-11-04' && F.trfPtDate(Date.parse('2026-11-05T08:00:00Z')) === '2026-11-05' &&
    F.trfPtShift('2026-11-05', -89) === '2026-08-08' && F.trfPtShift('2026-03-01', -1) === '2026-02-28',
    [F.trfPtDate(Date.parse('2026-11-05T07:59:00Z')), F.trfPtShift('2026-11-05', -89)]);
  t('traffic quota: eBay’s own answer is read and not interpreted, and an answer that names no traffic-report limit gives null rather than a limit of nought',
    (() => {
      const body = JSON.stringify({ rateLimits: [
        { apiContext: 'sell', apiName: 'marketing', apiVersion: 'v1', resources: [{ name: 'getAdReport', rates: [{ limit: 5000, remaining: 4999, reset: 'x', timeWindow: 86400 }] }] },
        { apiContext: 'sell', apiName: 'analytics', apiVersion: 'v1', resources: [
          { name: 'getUserRateLimits', rates: [{ limit: 10, remaining: 9 }] },
          { name: F.TRAFFIC_QUOTA_RESOURCE, rates: [{ limit: 1000, remaining: 812, reset: '2026-11-03T07:00:00.000Z', timeWindow: 86400 }] }] },
      ] });
      const q = F.trfQuotaFromRateLimits(body), qObj = F.trfQuotaFromRateLimits(JSON.parse(body));
      const none = F.trfQuotaFromRateLimits(JSON.stringify({ rateLimits: [{ apiName: 'analytics', resources: [{ name: 'somethingElse', rates: [{ limit: 7 }] }] }] }));
      const nought = F.trfQuotaFromRateLimits(JSON.stringify({ rateLimits: [{ apiName: 'analytics', resources: [{ name: F.TRAFFIC_QUOTA_RESOURCE, rates: [{ limit: 0, remaining: 0 }] }] }] }));
      const silent = F.trfQuotaFromRateLimits(JSON.stringify({ rateLimits: [{ apiName: 'analytics', resources: [{ name: F.TRAFFIC_QUOTA_RESOURCE, rates: [{ limit: 1000 }] }] }] }));
      return q && q.limit === 1000 && q.remaining === 812 && q.window_sec === 86400 &&
        q.reset_at === '2026-11-03T07:00:00.000Z' && JSON.stringify(q) === JSON.stringify(qObj) &&
        none === null && nought === null && F.trfQuotaFromRateLimits('not json') === null &&
        /* 5 Nov: the resource is matched by meaning, however eBay spells it, and what eBay DID name is
           handed back in words when nothing matched */
        F.trfQuotaFromRateLimits({ rateLimits: [{ apiName: 'Analytics', resources: [{ name: 'sell.analytics.traffic_report', rates: [{ limit: 100, remaining: 7 }] }] }] }).limit === 100 &&
        F.trfQuotaResourcesSeen({ rateLimits: [{ apiName: 'Analytics', resources: [{ name: 'a' }, { name: 'b' }] }] }) === 'Analytics.a, Analytics.b' &&
        F.trfQuotaResourcesSeen('not json') === '' &&
        F.trfQuotaFromRateLimits(null) === null &&
        /* eBay stating a limit but not the remainder is "does not say", not nought left */
        silent && silent.remaining === null && silent.window_sec === null;
    })(), null);
  t('traffic quota: the sentence that goes into sync_state carries eBay’s figures and not one figure of ours, and says plainly when eBay named no limit at all',
    (() => {
      const note = F.trfQuotaNote({ limit: 1000, remaining: 812, reset_at: '2026-11-03T07:00:00.000Z', window_sec: 86400, scope: 'account' });
      const app = F.trfQuotaNote({ limit: 1000, remaining: 812, scope: 'application' });
      const quiet = F.trfQuotaNote({ limit: 1000, remaining: null, reset_at: null, window_sec: null });
      return /1000/.test(note) && /812/.test(note) && /86400/.test(note) && !/—/.test(note) &&
        /does not say how many are left/.test(quiet) && !/—/.test(quiet) &&
        /* a per-account figure and an application-wide one are not the same claim, so the sentence says which */
        /for this account/.test(note) && /across the whole application/.test(app) && !/—/.test(app) &&
        F.trfQuotaNote(null) === 'eBay named no traffic-report limit in its answer';
    })(), null);

  /* ---- the sampler's own source: the order, the slot, the allow-list, the baseline's one owner ---- */
  const trNowI = src.indexOf('async function trafficNow(env) {');
  const trNow = src.slice(trNowI, src.indexOf('\n}\n', trNowI) + 3);
  const trPlanI = src.indexOf('async function trafficSamplePlan(env) {');
  const trPlan = src.slice(trPlanI, src.indexOf('\n}\n', trPlanI) + 3);
  const trQuotaI = src.indexOf('async function trafficQuota(env) {');
  const trQuota = src.slice(trQuotaI, src.indexOf('\n}\n', trQuotaI) + 3);
  const trStateI = src.indexOf('async function trafficClockState(env, o) {');
  const trState = src.slice(trStateI, src.indexOf('\n}\n', trStateI) + 3);
  const trSyncI = src.indexOf('async function trafficSync(env) {');
  /* comments stripped: the hourly pass must not WRITE the clock's tables, and the comment that says
     so names one of them. A checker that cannot tell a note from a write is a checker that punishes
     the explanation. */
  const trSync = src.slice(trSyncI, src.indexOf('\n}\n', trSyncI) + 3).replace(/\/\*[\s\S]*?\*\//g, '');
  const cronBlk = src.slice(src.indexOf('function cronMap() {'), src.indexOf('\n}\n', src.indexOf('function cronMap() {')));
  t('traffic sampler (real source): SKIP BEFORE CALL — the decision is taken from stored state and returned on before a token is minted or a byte is sent to eBay',
    trNow.indexOf('const decided = trfSampleDecision({') > 0 &&
    trNow.indexOf('trfSampleDecision({') < trNow.indexOf('ebayAccessToken(') &&
    trNow.indexOf('if (!decided.call) {') < trNow.indexOf('ebayAccessToken(') &&
    trNow.indexOf('ebayAccessToken(') < trNow.indexOf('await fetch(') &&
    /if \(!decided\.call\) \{\n      if \(decided\.note\) await trfSay\(env, 'trafficNow', acct, decided\.note, plan\.notes\[acct\]\);\n      return;\n    \}/.test(trNow) &&
    /* and only ONE call reaches eBay in the whole job */
    (trNow.match(/await fetch\(/g) || []).length === 1,
    [trNow.indexOf('trfSampleDecision({'), trNow.indexOf('ebayAccessToken('), trNow.indexOf('await fetch(')]);
  t('traffic sampler (real source): a 429 puts the account to sleep BEFORE the refusal is thrown, so the ladder is set even though perAccount takes the error',
    trNow.indexOf('if (r.status === 429) {') < trNow.indexOf("throw new Error('traffic_report 429:") &&
    /const b = trfBackoffUntil\(nowMs, plan\.backoff_min_of\(acct\)\);\n      await trfBackoffSet\(env, acct, b\);/.test(trNow) &&
    /await trfBackoffSet\(env, acct, b\);[\s\S]{0,200}throw new Error\('traffic_report 429:/.test(trNow) &&
    /* and a good read ends the ladder and withdraws the last skip's note */
    /if \(plan\.backoff_of\(acct\) \|\| plan\.backoff_min_of\(acct\)\) await trfBackoffClear\(env, acct\);/.test(trNow) &&
    /await trfSay\(env, 'trafficNow', acct, '', plan\.notes\[acct\]\);/.test(trNow), null);
  t('traffic sampler (real source): the plan is FOUR reads for the whole run, not four per account, and the stagger index comes from a sorted list rather than perAccount’s hourly rotation',
    (trPlan.match(/await one\(/g) || []).length === 4 &&
    /const order = all\.slice\(\)\.sort\(\);/.test(trPlan) && /perAccount rotates/.test(trPlan) &&
    /plan\.order\.indexOf\(acct\)/.test(trNow) &&
    /WHERE key LIKE 'adtool_traffic_%'/.test(trPlan) &&
    /* and an account with no quota of its own borrows the smallest limit any account was given */
    /floorLimit == null \|\| L < floorLimit/.test(trPlan) &&
    /return \(r == null \|\| !isFinite\(n\)\) \? null : n;/.test(trPlan),
    (trPlan.match(/await one\(/g) || []).length);
  t('traffic sampler (real source): the note is written ONLY when it changes, because a note a tick is two thousand D1 writes a day for no new information, and an ordinary wait for a turn says nothing at all',
    /if \(had !== null && had !== undefined && n === String\(had\)\) return;/.test(src) &&
    /ON CONFLICT\(job, account\) DO UPDATE SET cursor = \?3/.test(src) &&
    /if \(decided\.note\) await trfSay\(/.test(trNow) &&
    /return \{ call: false, reason: 'turn', left_min: null, note: '' \}/.test(src) &&
    /return \{ call: false, reason: 'early', left_min: null, note: '' \}/.test(src), null);
  t('traffic sampler (real source): THE CLOCK’S BASELINE IS ITS OWN — only the sampler writes traffic_clock_baseline, the hourly history pass never touches it, and the rise is no longer measured against the row that pass rewrites',
    /INSERT INTO traffic_clock_baseline/.test(trNow) && /UPDATE traffic_clock_baseline SET/.test(trNow) &&
    (src.match(/INTO traffic_clock_baseline|UPDATE traffic_clock_baseline/g) || []).length === 2 &&
    trSync.indexOf('traffic_clock_baseline') < 0 && trSync.indexOf('traffic_hour') < 0 &&
    /* the credit now comes from the baseline row, never from the traffic_daily row the :40 pass rewrites */
    /const prev = plan\.base\[acct\] \|\| null;\n        const cc = trfClockCredit\(prev, \{ impressions: imp, views: vie, transactions: tr \}\)/.test(trNow) &&
    !/Math\.max\(0, imp - Number\(\(o \|\| \{\}\)\.impressions \|\| 0\)\)/.test(trNow),
    (src.match(/INTO traffic_clock_baseline|UPDATE traffic_clock_baseline/g) || []).length);
  t('traffic sampler (real source): the day’s FIRST reading is written race-safe and credited back to the day’s Pacific start, every rise is SPREAD over the hours since the last reading through the one pure function, and the window is eBay’s own ninety Pacific days',
    /if \(cc\.baseline\) \{/.test(trNow) &&
    /ON CONFLICT\(account, date\) DO NOTHING/.test(trNow) &&
    /* 5 Nov: the credit comes AFTER both branches and is shared out by trfSpreadCredit, from the last
       reading (or the day's Pacific start) to now, each slot under its own UK date and hour */
    trNow.indexOf('for (const slot of trfSpreadCredit(fromMs, seenMs, cc.credit))') > trNow.indexOf('} else {') &&
    trNow.indexOf('INSERT INTO traffic_hour') > trNow.indexOf('for (const slot of trfSpreadCredit(') &&
    /const dayStart = trfPtDayStartMs\(date\);/.test(trNow) && /const fromMs = Math\.max\(floorMs, lastMs == null \? floorMs : lastMs\);/.test(trNow) &&
    /\.bind\(acct, slot\.date, slot\.hour, slot\.impressions, slot\.views, slot\.transactions\)/.test(trNow) &&
    /* the window is eBay's own ninety Pacific days, never a UK date eBay has not begun, and the plan
       follows the same day */
    /const ptTo = plan\.today, ptFrom = trfPtShift\(ptTo, -89\);/.test(trNow) && !/ukDate\(/.test(trNow) &&
    /if \(date === plan\.today && date === trfPtDate\(\)\) \{/.test(trNow) &&
    /const today = trfPtDate\(\);/.test(trPlan) && /transactions, last_at FROM traffic_clock_baseline WHERE date = \?1/.test(trPlan) &&
    /* and the hourly history pass is gone: trafficSync spends its two per-listing reads once a day,
       in the first hour after eBay's window resets, and nothing else */
    !/dimension=DAY/.test(trSync) && /const listingPass = ptHour === 0;/.test(trSync) && /if \(!listingPass\) return;/.test(trSync) &&
    trSync.indexOf('if (!listingPass) return;') < trSync.indexOf('ebayAccessToken(') &&
    /baseline_hour, readings, first_at, last_at/.test(trNow) &&
    /* and the stamp that means eBay was actually reached rides in the same transaction */
    /INSERT INTO traffic_quota \(account, last_call_at\)/.test(trNow) &&
    /only figure that means this account was READ/.test(trNow), null);
  t('traffic quota (real source): the ACCOUNT’S OWN limit is asked for first on its own token, because the traffic report is a user-authorised call and the account’s own quota is the one that refuses it',
    /const r = await ebayRestFetch\(env, acct, 'GET', TRAFFIC_QUOTA_USER_PATH\);/.test(trQuota) &&
    /const TRAFFIC_QUOTA_USER_PATH = '\/developer\/analytics\/v1_beta\/user_rate_limit';/.test(src) &&
    /const TRAFFIC_QUOTA_PATH = '\/developer\/analytics\/v1_beta\/rate_limit';/.test(src) &&
    /INSERT INTO traffic_quota \(account, call_limit, remaining, reset_at, window_sec, read_at, note\)/.test(trQuota) &&
    /await trfSay\(env, 'trafficQuota', acct, note, null\);/.test(trQuota) &&
    /q\.scope = scope;/.test(trQuota) &&
    trQuota.indexOf('TRAFFIC_QUOTA_USER_PATH') < trQuota.indexOf('TRAFFIC_QUOTA_PATH') &&
    /* the application-wide figure is the FALLBACK, on an application token minted once for the whole
       run: eBay answers rate_limit only to an application token, and eight mints an hour to ask the
       same application-wide question eight times is a cost for no extra truth */
    /if \(appTried\) return appTok;/.test(trQuota) && /grant_type=client_credentials/.test(trQuota) &&
    (trQuota.match(/ebayRestFetch\(/g) || []).length === 1 &&
    /* a refusal stores NOTHING, so the last good figure stands and the reason is recorded instead */
    /if \(!q\) throw new Error\('traffic quota unread: '/.test(trQuota) &&
    trQuota.indexOf("throw new Error('traffic quota unread") < trQuota.indexOf('INSERT INTO traffic_quota') &&
    /* and the only POST in it is eBay's own token mint: nothing in this job can change anything at eBay */
    (trQuota.match(/method: 'POST'/g) || []).length === 1 && !/'PUT'|'DELETE'/.test(trQuota), null);
  t('traffic quota (real source): the allow-list carries the two rate-limit paths and nothing else of that endpoint, and it is GET only',
    /\/\^\\\/developer\\\/analytics\\\/v1_beta\\\/\(user_\)\?rate_limit\(\\\?\|\$\)\//.test(src) &&
    /if \(\/\^\\\/developer\\\/\/\.test\(path\) && method !== 'GET'\) throw new Error\('SAY: the quota read is GET only'\);/.test(src) &&
    (src.match(/developer\\\/analytics/g) || []).length === 1, null);
  t('traffic crons (real source + real file): the sampler has an invocation of its OWN, is gone from the packed five-minute slot, and the quota reader rides last in a slot of cheap work',
    (() => {
      let file = null; try { file = JSON.parse(readFile('engine/crons.json')); } catch (e) {}
      const inFile = (file && Array.isArray(file.crons)) ? file.crons.map(String) : [];
      const bare = cronBlk.replace(/\/\*[\s\S]*?\*\//g, '');
      const slots = (bare.match(/'[^']+':\s*\[[^\]]*\btrafficNow\b[^\]]*\]/g) || []);
      return slots.length === 1 && slots[0].indexOf("'4-59/5 * * * *'") === 0 && /\[trafficNow\]/.test(slots[0]) &&
        /'\*\/5 \* \* \* \*': \[orderSync, adsSync, cpcAudit, adsIntraday, openSync\]/.test(bare) &&
        /'20 \* \* \* \*': \[adtoolRollups, trafficQuota\]/.test(bare) &&
        inFile.indexOf('4-59/5 * * * *') >= 0 && inFile.indexOf('20 * * * *') >= 0 &&
        /* and the minute is clear of every other entry in the map, which is the whole reason for it */
        !/'[0-9,-]*4-59\/5/.test(bare.replace("'4-59/5 * * * *'", '')) &&
        /Own invocation = own\n       subrequest budget/.test(cronBlk) && /THE CADENCE IS NOT THIS SLOT'S BUSINESS/.test(cronBlk);
    })(), null);
  t('traffic clock state: it is the one reader of the sampler’s state, it writes nothing and reaches nothing outside the database, and an unread quota answers null rather than nought',
    !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER)\b/.test(trState) && !/fetch\(/.test(trState) &&
    !/ensureTrafficSchema/.test(trState) && /read_errors: errs, sent_to_ebay: false, writes: 'none'/.test(trState) &&
    /errs\.push\(what \+ ': '/.test(trState) &&
    /let limit = null, remaining = null, readAt = null, lastRead = null;/.test(trState) &&
    /sampling_every_min: trfCadenceMin\(limit, pct, fleet\.length\)/.test(trState) &&
    /sampling_from_quota: limit != null/.test(trState) &&
    /* every read is bounded */
    (trState.match(/LIMIT \d+/g) || []).length === 4, (trState.match(/LIMIT \d+/g) || []).length);
  t('traffic clock state: the governing figures are the SMALLEST any account was given, because the first account to be refused is the one that sets the whole cadence',
    /limit == null \|\| L < limit/.test(trState) && /remaining == null \|\| M < remaining/.test(trState) &&
    /the first account to be refused is the one that governs/.test(trState) &&
    /* the fleet count is read whether or not one account is on screen: the turn is set by who shares the quota */
    /WHERE api_enabled = 1 ORDER BY name LIMIT 40/.test(trState) && /an account's turn in the\n     cycle is set by how many accounts share the quota/.test(trState), null);
  t('traffic clock state: it answers the questions the bars cannot — the cadence, eBay’s limit and what is left, who is held back, the day’s first reading, how many readings stand behind it, and the hour before which nothing was counted',
    ['sampling_every_min:', 'quota_limit:', 'quota_remaining:', 'quota_reserve:', 'backoff_accounts:',
     'first_reading_today:', 'readings_today:', 'baseline_hour:', 'last_reading_at:']
      .every(k => trState.indexOf(k) > 0) &&
    /held\.push\(\{ account: name, until: cfg\[k\], minutes_left: left \}\)/.test(trState) &&
    /const left = trfBackoffLeftMin\(cfg\[k\], nowMs\);/.test(trState) &&
    /* a backoff whose instant has passed is not a held account */
    /if \(left != null\) held\.push/.test(trState) &&
    /* and the minutes key is never mistaken for an account name */
    /k\.indexOf\(TRAFFIC_BACKOFF_MIN_KEY\) === 0\) continue;/.test(trState), null);
  t('traffic clock state: it reaches BOTH the page and the key-authed probe, through the one function, so the screen and the evidence a manager is handed cannot disagree about why an hour is empty',
    (src.match(/async function trafficClockState\(/g) || []).length === 1 &&
    (src.match(/await trafficClockState\(/g) || []).length === 2 &&
    /hour_clock_state: CS,/.test(trBoard) &&
    /const CS = await trafficClockState\(ctx\.env, \{ account, day: hourDay \}\);/.test(trBoard) &&
    /hour_clock_state: await trafficClockState\(env, \{ account, day \}\),/.test(trProbe) &&
    /* and the hour block's own shape is untouched: the page reads its bars out of that */
    !/hour_clock_state/.test(trHB), null);
  t('traffic sampler: the two tables are readable with the sync key, because from outside "the clock holds nothing" and "eBay is refusing us" were the same thing — which is how the fault hid for an hour',
    /traffic_quota: 'SELECT \* FROM traffic_quota',/.test(src) &&
    /traffic_clock_baseline: "SELECT \* FROM traffic_clock_baseline WHERE date >= datetime\('now','-30 day'\)",/.test(src) &&
    /* and the quota can be read on demand rather than waited for. 2 Nov: the peak campaign fill
       joined the same key-run map behind it, so the entry is checked and not the map's closing brace */
    /adtoolRollups, adtoolTruth, adtoolVideoSweep, trafficQuota,/.test(src), null);

  /* the page half */
  t('traffic page (5 Nov): impressions and views are ONE grouped row per block, red and green side by side, off ONE helper, after the tiles and the so-far-today line, and the month-back block is drawn the same way on the same scales',
    (trSrc.match(/trBarPair\(/g) || []).length === 3 &&
    /trBarPair\('Impressions and views by day', chartDays, \{ today: today, maxImp: maxImp, maxViews: maxViews, vsOf: backOf, note: weekNote \}\)/.test(trSrc) &&
    /trBarPair\('Impressions and views by day \u00b7 a month back', prevDays, \{ maxImp: maxImp, maxViews: maxViews, vsOf: nowOf, vsWord: 'the window above', note: 'same scales as the row above' \}\)/.test(trSrc) &&
    trSrc.indexOf('So far today (') < trSrc.indexOf("trBarPair('Impressions and views by day', chartDays") &&
    trSrc.indexOf("trBarPair('Impressions and views by day', chartDays") < trSrc.indexOf("trBarPair('Impressions and views by day \u00b7 a month back'") &&
    !/trBarRow\(/.test(trSrc) && !/var max = Math\.max\.apply/.test(trSrc) &&
    /* red for impressions, green for views, and the legend carries the same two classes */
    /\.tr-bar\.tr-imp\{background:linear-gradient\(180deg,#e5484d/.test(trSrc) && /\.tr-bar\.tr-vw\{background:linear-gradient\(180deg,#3fb950/.test(trSrc) &&
    /<i class="tr-imp"><\/i>Impressions/.test(trSrc) && /<i class="tr-vw"><\/i>Views/.test(trSrc),
    (trSrc.match(/trBarPair\(/g) || []).length);
  t('traffic page (5 Nov): the pair keeps each series on its OWN scale, every pair carries its figures as data for the one hover card, the date sits under each pair, and a day still counting is faded and given no percentage',
    (() => {
      const row = trSrc.slice(trSrc.indexOf('  function trBarPair('), trSrc.indexOf('\n  }', trSrc.indexOf('  function trBarPair(')));
      return /var maxImp = opt\.maxImp \|\| trBarMax\(rows, 'impressions', null\);/.test(row) &&
        /var maxViews = opt\.maxViews \|\| trBarMax\(rows, 'views', null\);/.test(row) &&
        /trBarH\(r\.impressions, maxImp\)/.test(row) && /trBarH\(r\.views, maxViews\)/.test(row) &&
        /'<div class="tr-grp"' \+ trTipData\(card\(r, v\)\) \+ '>'/.test(row) && !/<span>' \+ tip\(/.test(row) &&
        /var isPart = r\.date === today, hold = isPart \|\| !!\(v && v\.part\);/.test(row) &&
        /d: hold \? null : trDelta\(r\.impressions, v\.impressions\), hold: hold/.test(row) &&
        /\{ c: '#e5484d', k: 'Impressions', v: trN\(r\.impressions\) \}/.test(row) && /\{ c: '#3fb950', k: 'Views', v: trN\(r\.views\) \}/.test(row) &&
        /\{ k: 'CTR', v: ctr\.toFixed\(2\) \+ '%' \}/.test(row) &&
        /'<div class="tr-dx">' \+ rows\.map\(function \(r\) \{ return '<span>' \+ esc\(axisLbl\(r\)\) \+ '<\/span>'; \}\)\.join\(''\) \+ '<\/div>'/.test(row) &&
        /isPart \? ' tr-part' : ''/.test(row) && /each series on its own scale/.test(row);
    })(), null);
  t('traffic page (5 Nov): ONE hover card serves every bar on the page, built from the bar\u2019s own data, keyed by series colour, with a signed difference that is withheld in words while a day is still counting, placed by the cursor and kept inside the window',
    (() => {
      const wire = trSrc.slice(trSrc.indexOf('  function trWire(box) {'), trSrc.indexOf('\n  }', trSrc.indexOf('  function trWire(box) {')));
      return /function trTipHtml\(o\) \{/.test(trSrc) && /function trTipMove\(ev\) \{/.test(trSrc) && /function trTipData\(o\) \{ return ' data-tr-tip="' \+ esc\(JSON\.stringify\(o\)\) \+ '"'; \}/.test(trSrc) &&
        /if \(r\.hold\) \{ dl = '<span class="tr-dl na">still counting<\/span>'; \}/.test(trSrc) &&
        /\(r\.d >= 0 \? 'up' : 'dn'\)/.test(trSrc) && /Math\.abs\(r\.d\)\.toFixed\(1\) \+ '%<\/span>'/.test(trSrc) &&
        /if \(x \+ w > window\.innerWidth - 8\) \{ x = ev\.clientX - w - 16; \}/.test(trSrc) && /if \(y < 8\) \{ y = ev\.clientY \+ 18; \}/.test(trSrc) &&
        /box\.querySelectorAll\('\[data-tr-tip\]'\)\.forEach/.test(wire) && /tipEl\.innerHTML = trTipHtml\(o\); tipEl\.classList\.add\('on'\); trTipMove\(ev\);/.test(wire) &&
        /b\.onmouseleave = function \(\) \{ tipEl\.classList\.remove\('on'\); \};/.test(wire) &&
        /* the hour bars carry the same card, and the old in-bar spans are gone from both charts */
        /'"' \+ trTipData\(card\) \+ ' style="height:' \+ ch \+ '%"><\/div>'/.test(trSrc) && !/\.tr-hb span\{/.test(trSrc) && !/\.tr-bar span\{/.test(trSrc) &&
        /\.tr-tip\{position:fixed;z-index:9999;pointer-events:none/.test(trSrc);
    })(), null);
  t('traffic page: the hour block opens on Sold while the traffic clock has nothing for the day and on Impressions once it has, so it is never the empty box the owner was shown',
    /var ser = TR\.hour_series \|\| \(CUR\.totals\.impressions \? 'impressions' : 'sold'\);/.test(trSrc) &&
    /if \(!CUR\.has\[ser\]\) \{ ser = CUR\.has\.impressions \? 'impressions' : 'sold'; \}/.test(trSrc) &&
    /trHourMerge\(d\.hours, d\.hours_sold,/.test(trSrc) &&
    /trHourMerge\(d\.hours_prev, d\.hours_sold_prev,/.test(trSrc) &&
    /trHourMerge\(d\.hours_avg, d\.hours_sold_avg,/.test(trSrc) &&
    /* the old page refused to draw anything at all unless the clock held impressions */
    !/var hAny = hrs\.some/.test(trSrc), null);
  t('traffic page: the picker above the bars offers the day, yesterday and the window\u2019s average, and only a change of DAY asks the engine again',
    /data-tr-hp="/.test(trSrc) && /\['today', 'Today'\], \['yesterday', 'Yesterday'\], \['avg', 'Average over the window'\]/.test(trSrc) &&
    /if \(want === String\(\(TR\.data \|\| \{\}\)\.hour_date \|\| ''\)\) \{ trPaint\(\); \} else \{ trLoad\(\); \}/.test(trSrc) &&
    /payload\.hour_date = TR\.hour_pick === 'yesterday' \? trShift\(ukToday\(\), -1\) : ukToday\(\);/.test(trSrc) &&
    /data-tr-hs="/.test(trSrc) && /TR\.hour_series = String\(this\.getAttribute\('data-tr-hs'\) \|\| ''\);\n        trPaint\(\);/.test(trSrc), null);
  t('traffic page: an hour with no reading behind it is hatched and says so in words, never drawn or written as a nought',
    /class="tr-hb' \+ \(miss \? ' tr-none' : ''\)/.test(trSrc) &&
    /var v = s\[ser\], miss = \(v === null\);/.test(trSrc) &&
    /x === null \|\| x === undefined \? 'not recorded'/.test(trSrc) &&
    /\.tr-hb\.tr-none\{background:repeating-linear-gradient/.test(trSrc), null);
  t('traffic page: the line under the bars says what each series is off the engine\u2019s own sentence and takes every figure beside it from the answer, so no date and no count is typed into the copy',
    (() => {
      const line = trSrc.slice(trSrc.indexOf('h += \'<div class="tr-src">\''), trSrc.indexOf('/* review 3: account-to-account'));
      const note = src.slice(src.indexOf("hours_note: 'eBay publishes"), src.indexOf("\n", src.indexOf("hours_note: 'eBay publishes")));
      return /esc\(String\(d\.hours_note \|\| ''\)\)/.test(line) && /d\.hour_clock_from/.test(line) &&
        /d\.hour_samples == null \? 'not recorded'/.test(line) && !/\d/.test(line) &&
        /* and the engine's sentence no longer names the day the clock was switched on, because the
           answer now carries that date and a literal would go stale the moment it moved */
        note.length > 300 && !/\u2014/.test(note) && !/\d/.test(note) && /and never by hour/.test(note);
    })(), null);
  t('traffic page: every listing row still goes through the portal\u2019s standard listing cell, so the History link is on all of them',
    (trSrc.match(/adtProductCell\(r\)/g) || []).length === 2 && !/<td>' \+ esc\(r\.title/.test(trSrc), null);
  t('traffic page: this file is spliced into BOTH portals, so every selector it adds carries its own tr- prefix and nothing is borrowed from another file',
    (() => {
      const css = trSrc.slice(trSrc.indexOf('VIEW_CSS.push('), trSrc.indexOf('function trN('));
      const sels = css.match(/'\.[a-zA-Z][a-zA-Z0-9-]*/g) || [];
      return sels.length > 14 && sels.every(s => s.indexOf("'.tr-") === 0);
    })(), (trSrc.slice(trSrc.indexOf('VIEW_CSS.push('), trSrc.indexOf('function trN(')).match(/'\.[a-zA-Z][a-zA-Z0-9-]*/g) || []).filter(s => s.indexOf("'.tr-") !== 0));
  t('traffic page: the paint is a step of its own, so a reader flicking between the three series costs no engine call and the two-minute refresh still goes through the quiet path',
    /function trPaint\(\) \{/.test(trSrc) && /TR\.data = d \|\| \{\};/.test(trSrc) &&
    (trSrc.match(/trPaint\(\)/g) || []).length >= 4 && /function trWire\(box\) \{/.test(trSrc) &&
    /trWire\(box\);/.test(trSrc) && /adtPoll\('trBody', 120000, function \(\) \{ return trLoad\(true\); \}\)/.test(trSrc), null);

  /* ================= EACH PEAK ROW'S OWN BY PERIOD FIGURES (owner, 2 Nov) =================
     "In these details of peak time listings, make a bar of product history along with the product
     details." The Peak page now draws Product history's own By period table under each of its rows.
     THE WHOLE POINT OF THESE TESTS is the one thing that could go wrong without anybody seeing it:
     two pages giving one listing two different numbers. Product history adds its own day rows up in
     JavaScript (adtWindowSums); the Peak page cannot read hundreds of listings' day rows on an open
     page, so it asks the database for the sums. The arithmetic after the sums is therefore written
     once and mirrored, and these tests hold the mirror against the real thing field by field. */
  const bpFix = [
    /* one listing's day rows: inside every window, inside some of them, and a today row that must
       stay out of all four because the day grain is read to yesterday only. The three nullable
       columns are null on one row on purpose, because that is how the table really is. */
    /* and this one has no pending_fee_orders column AT ALL, which is a day rolled before that column
       landed: the rule reads it as nothing owed, and a mirror that dropped the guard would make the
       whole window NaN instead. */
    { day: '2026-10-05', orders: 2, units: 3, revenue: 41.97, actual_profit: 3.21, pending_cost_orders: 0, clicks: 11, spend: 2.44, attr_units: 2, attr_revenue: 27.98 },
    { day: '2026-10-28', orders: 1, units: 1, revenue: 13.99, actual_profit: null, pending_cost_orders: 1, pending_fee_orders: null, clicks: 4, spend: 0.91, attr_units: 1, attr_revenue: 13.99 },
    { day: '2026-11-01', orders: 3, units: 4, revenue: 55.96, actual_profit: -1.07, pending_cost_orders: 0, pending_fee_orders: 2, clicks: 9, spend: 7.13, attr_units: 1, attr_revenue: 13.99 },
    { day: '2026-11-02', orders: 9, units: 9, revenue: 99.90, actual_profit: 9.90, pending_cost_orders: 9, pending_fee_orders: 9, clicks: 9, spend: 9.90, attr_units: 9, attr_revenue: 99.90 },
  ];
  /* today 2 Nov 2026, so yesterday is the 1st and the windows are the four the page asks for */
  const bpWins = [['yesterday', '2026-11-01', '2026-11-01'], ['d7', '2026-10-26', '2026-11-01'], ['d30', '2026-10-03', '2026-11-01'], ['all', '2000-01-01', '2026-11-01']];
  /* every key adtWindowSums puts on a window, so "every field is equal" means every field */
  const bpFields = ['days', 'orders', 'units', 'revenue', 'actual', 'pending', 'pending_fee_orders', 'clicks', 'spend', 'attr_units', 'attr_revenue', 'roas', 'actual_profit', 'pending_cost_orders'];
  const bpEqv = (x, y) => (x == null && y == null) || (x != null && y != null && Math.abs(Number(x) - Number(y)) < 1e-9);
  /* WHAT THE DATABASE WOULD HAND BACK, worked out here and not by the engine: a plain conditional
     sum per column per window, which is exactly what the query's SUM(CASE WHEN … ) does. This is
     the independent half of the comparison; the engine's half is adPeakPeriodFromAgg. */
  const bpAgg = (rows, wins) => {
    const out = {};
    for (const w of wins) {
      out[w[0] + '_days'] = 0;
      for (const f of F.ADTOOL_PEAK_PERIOD_FIELDS) out[w[0] + '_' + f[0]] = 0;
      for (const r of rows) {
        if (r.day < w[1] || r.day > w[2]) continue;
        out[w[0] + '_days'] += 1;
        for (const f of F.ADTOOL_PEAK_PERIOD_FIELDS) out[w[0] + '_' + f[0]] += (Number(r[f[1]]) || 0);
      }
    }
    return out;
  };
  const bpSums = bpAgg(bpFix, bpWins);

  t('by period: the Peak page\'s arithmetic IS Product history\'s, field for field, over one fixture and all four windows',
    bpWins.every(w => { const a = F.adtWindowSums(bpFix, w[1], w[2]), b = F.adPeakPeriodSums(bpFix, w[1], w[2]); return bpFields.every(k => bpEqv(a[k], b[k])); }),
    bpWins.map(w => { const a = F.adtWindowSums(bpFix, w[1], w[2]), b = F.adPeakPeriodSums(bpFix, w[1], w[2]); return [w[0], bpFields.filter(k => !bpEqv(a[k], b[k]))]; }));
  t('by period: and the sums a database returns go through that same arithmetic to the same answer, field for field',
    bpWins.every(w => { const a = F.adtWindowSums(bpFix, w[1], w[2]), c = F.adPeakPeriodFinish(F.adPeakPeriodFromAgg(bpSums, w[0])); return bpFields.every(k => bpEqv(a[k], c[k])); }),
    bpWins.map(w => { const a = F.adtWindowSums(bpFix, w[1], w[2]), c = F.adPeakPeriodFinish(F.adPeakPeriodFromAgg(bpSums, w[0])); return [w[0], bpFields.filter(k => !bpEqv(a[k], c[k]))]; }));
  t('by period: the fixture really exercises the windows, so the two tests above are not both agreeing about nothing', (() => {
    const y = F.adtWindowSums(bpFix, '2026-11-01', '2026-11-01'), d7 = F.adtWindowSums(bpFix, '2026-10-26', '2026-11-01'), all = F.adtWindowSums(bpFix, '2000-01-01', '2026-11-01');
    /* and the ratio is worked out off the unrounded sums, which is the order adtWindowSums uses:
       rounding each side of a division first moves the answer. */
    const ratio = near(all.roas, Math.round((27.98 + 13.99 + 13.99) / (2.44 + 0.91 + 7.13) * 100) / 100, 0.0001);
    return y.days === 1 && d7.days === 2 && all.days === 3 && y.orders === 3 && all.units === 8 && all.attr_units === 4 && ratio && all.roas !== null;
  })(), [F.adtWindowSums(bpFix, '2000-01-01', '2026-11-01')]);
  /* THE ORDER THE ROUNDING HAPPENS IN IS PART OF THE RULE, and here is a fixture where it shows:
     round each side of the division first and one click of ad spend reads as 7.69 times over
     instead of 8. Both routes have to get 8, or the Peak page and Product history would print
     different ROAS for the same listing on the same day. */
  const bpTiny = [{ day: '2026-11-01', orders: 1, units: 1, revenue: 1, actual_profit: 0, pending_cost_orders: 0, pending_fee_orders: 0, clicks: 1, spend: 0.125, attr_units: 1, attr_revenue: 1 }];
  t('by period: the ratio is worked out before the money is rounded, on both routes, because rounding first moves it', (() => {
    const a = F.adtWindowSums(bpTiny, '2026-11-01', '2026-11-01');
    const b = F.adPeakPeriodSums(bpTiny, '2026-11-01', '2026-11-01');
    const c = F.adPeakPeriodFinish(F.adPeakPeriodFromAgg(bpAgg(bpTiny, [['one', '2026-11-01', '2026-11-01']]), 'one'));
    const wrong = Math.round((1 / 0.13) * 100) / 100;
    return a.roas === 8 && b.roas === 8 && c.roas === 8 && a.spend === 0.13 && b.spend === 0.13 && c.spend === 0.13 && near(wrong, 7.69, 0.001);
  })(), [F.adtWindowSums(bpTiny, '2026-11-01', '2026-11-01').roas, F.adPeakPeriodSums(bpTiny, '2026-11-01', '2026-11-01').roas]);
  t('by period: a window we hold no day for is nothing-known and not nought, because nought is a figure a reader acts on', (() => {
    const none = F.adPeakPeriodOrNull({}, 'd7');
    const some = F.adPeakPeriodOrNull(bpSums, 'd7');
    const empty = F.adPeakPeriodsEmpty();
    return none === null && some !== null && some.orders === 4 &&
      F.ADTOOL_PEAK_PERIOD_KEYS.every(k => empty[k] === null) && F.ADTOOL_PEAK_PERIOD_KEYS.join(',') === 'today,yesterday,d7,d30,all';
  })(), [F.adPeakPeriodOrNull({}, 'd7'), F.adPeakPeriodOrNull(bpSums, 'd7')]);
  t('by period: a row carries the eight columns of the table and nothing else, and units not from ads is the one subtraction Product history prints', (() => {
    const a = F.adtWindowSums(bpFix, '2026-10-03', '2026-11-01');
    const row = F.adPeakPeriodRow(a, false);
    const keys = Object.keys(row).join(',');
    return keys === 'spend,attr_units,roas,orders,units,units_not_from_ads,actual_profit,pending_cost_orders,pending_fee_orders,includes_today' &&
      row.units_not_from_ads === Math.max(0, (Number(a.units) || 0) - (Number(a.attr_units) || 0)) && row.units_not_from_ads === 4 &&
      bpEqv(row.actual_profit, a.actual) && row.includes_today === false;
  })(), Object.keys(F.adPeakPeriodRow(F.adtWindowSums(bpFix, '2026-10-03', '2026-11-01'), false)));
  t('by period: today comes off the today grain and through the same honesty rule, so neither page shows last night\'s whole ad day as today\'s loss', (() => {
    const live = { report_day: '2026-11-02', uk_day: '2026-11-02', spend: 3.4, clicks: 12, attr_units: 2, attr_revenue: 23.98, orders: 3, units: 4, revenue: 47.97, raw_priced_sum: 5, refunds: 0, actual_profit: 1.22, pending_cost_orders: 1, pending_fee_orders: 2 };
    const a = F.adPeakPeriodToday(F.adtTodayRowHonest(Object.assign({}, live), '2026-11-02'));
    const b = F.adPeakPeriodToday(F.adtTodayRowHonest(Object.assign({}, live, { report_day: '2026-11-01', uk_day: '2026-11-01' }), '2026-11-02'));
    const fresh = near(a.spend, 3.4) && a.attr_units === 2 && near(a.roas, Math.round(23.98 / 3.4 * 100) / 100, 0.0001) && a.orders === 3 && a.units === 4 && a.units_not_from_ads === 2 && near(a.actual_profit, 1.22) && a.pending_cost_orders === 1 && a.pending_fee_orders === 2 && a.includes_today === true;
    /* a row still on yesterday's eBay report day is order-only: no ad figure at all, and the profit
       is the law over the priced orders without the click-fee leg */
    const stale = b.spend === null && b.attr_units === null && b.roas === null && b.orders === 3 && b.units === 4 && b.units_not_from_ads === 4 && near(b.actual_profit, 0.8 * 5);
    return fresh && stale && F.adPeakPeriodToday(null) === null;
  })(), [F.adPeakPeriodToday(F.adtTodayRowHonest({ report_day: '2026-11-01', uk_day: '2026-11-01', spend: 3.4, raw_priced_sum: 5, refunds: 0, orders: 3, units: 4 }, '2026-11-02'))]);
  t('by period: all time is the same sums with no lower bound and today spliced in exactly as Product history splices it, and it says so', (() => {
    const live = F.adtTodayRowHonest({ report_day: '2026-11-02', uk_day: '2026-11-02', spend: 3.4, clicks: 12, attr_units: 2, attr_revenue: 23.98, orders: 3, units: 4, revenue: 47.97, raw_priced_sum: 5, refunds: 0, actual_profit: 1.22, pending_cost_orders: 1, pending_fee_orders: 2 }, '2026-11-02');
    /* Product history's own route: the day rows to yesterday, plus the today grain as one more day */
    const spliced = Object.assign({ day: '2026-11-02' }, live, { spend: Number(live.spend) || 0, clicks: Number(live.clicks) || 0, attr_units: Number(live.attr_units) || 0, attr_revenue: Number(live.attr_revenue) || 0 });
    const ph = F.adtWindowSums(bpFix.slice(0, 3).concat([spliced]), '2000-01-01', '2026-11-02');
    /* the Peak page's route: the aggregate with no lower bound, the same splice on top */
    const pk = F.adPeakPeriodFinish(F.adPeakPeriodSpliceToday(F.adPeakPeriodFromAgg(bpSums, 'all'), live));
    const row = F.adPeakPeriodRow(pk, true);
    return bpFields.every(k => bpEqv(ph[k], pk[k])) && pk.days === 4 && row.includes_today === true &&
      /all: all\.days > 0 \? adPeakPeriodRow\(adPeakPeriodFinish\(all\), !!tRow\) : null,/.test(src) &&
      /const all = adPeakPeriodSpliceToday\(adPeakPeriodFromAgg\(agg, 'all'\), tRow\);/.test(src);
  })(), null);
  t('by period: the aggregate is written from the same column list the arithmetic loops, adds up the day table alone, and rounds nothing in SQL', (() => {
    const sel = F.adPeakPeriodSelect([['yesterday', 'd.day = ?1'], ['d7', 'd.day >= ?2'], ['d30', 'd.day >= ?3'], ['all', '1 = 1']]);
    const perWin = 1 + F.ADTOOL_PEAK_PERIOD_FIELDS.length;
    const named = (sel.match(/ AS [a-z0-9_]+/g) || []).length;
    const everyField = F.ADTOOL_PEAK_PERIOD_FIELDS.every(f => sel.indexOf('SUM(CASE WHEN 1 = 1 THEN COALESCE(d.' + f[1] + ', 0) ELSE 0 END) AS all_' + f[0]) >= 0);
    const counted = sel.indexOf('SUM(CASE WHEN d.day = ?1 THEN 1 ELSE 0 END) AS yesterday_days') >= 0;
    /* the ROUND belongs to adPeakPeriodFinish, after the ratio: the two cannot both do it */
    const noRound = !/ROUND\(/.test(sel) && /for \(const k of ADTOOL_PEAK_PERIOD_MONEY\) s\[k\] = round2\(s\[k\]\);/.test(src) && F.ADTOOL_PEAK_PERIOD_MONEY.join(',') === 'revenue,actual,spend,attr_revenue';
    const inRoute = /SELECT d\.item_id, ' \+ adPeakPeriodSelect\(perWin\) \+ ' FROM adtool_listing_day d JOIN ' \+ perSql \+ ' pkc ON pkc\.pk_item = d\.item_id WHERE d\.day <= \?1 GROUP BY d\.item_id'\)\.bind\(yday, d7from, d30from\)/.test(src);
    return named === 4 * perWin && everyField && counted && noRound && inRoute;
  })(), null);
  t('by period: every column it adds up is a real column of the day table, read from the statements that create it', (() => {
    const i = src.indexOf('CREATE TABLE IF NOT EXISTS adtool_listing_day (');
    const body = src.slice(i, src.indexOf('PRIMARY KEY (account, item_id, day))', i));
    const have = {};
    body.replace(/[(,]\s*([a-z_]+)\s+(?:TEXT|INTEGER|REAL)/g, (m, c) => { have[c] = 1; return m; });
    (src.match(/ALTER TABLE adtool_listing_day ADD COLUMN ([a-z_]+)/g) || []).forEach(a => { have[a.split(' ').pop()] = 1; });
    return i > 0 && Object.keys(have).length > 15 && have.pending_fee_orders === 1 &&
      F.ADTOOL_PEAK_PERIOD_FIELDS.every(f => have[f[1]] === 1);
  })(), (() => { const i = src.indexOf('CREATE TABLE IF NOT EXISTS adtool_listing_day ('); const body = src.slice(i, src.indexOf('PRIMARY KEY (account, item_id, day))', i)); const have = {}; body.replace(/[(,]\s*([a-z_]+)\s+(?:TEXT|INTEGER|REAL)/g, (m, c) => { have[c] = 1; return m; }); return F.ADTOOL_PEAK_PERIOD_FIELDS.filter(f => !have[f[1]]).map(f => f[1]); })());
  t('by period: the read is bounded to the rows the page returns, under the SAME cap the list itself is read under', (() => {
    const cm = /const ADTOOL_PEAK_MANUAL_CAP = (\d+);/.exec(src);
    const cap = cm ? Number(cm[1]) : 0;
    const many = []; for (let k = 0; k < cap + 40; k++) many.push(String(300000000000 + k));
    const q = F.adPeakItemsSql(many, cap);
    const bound = (q.match(/\{"i":/g) || []).length === cap && cap > 0;
    /* the figures read is handed the list read's own rows and the list read's own ceiling, so one
       cannot be wider than the other and the page cannot carry a figure for a row it is not showing.
       10 Nov: through the shared helper, which chunks the cohort at the ceiling it is handed. */
    const route = /adtPeriodsForItems\(env, manualRows\.map\(r => String\(r\.item_id \|\| ''\)\), ADTOOL_PEAK_MANUAL_CAP, today, todayUtc\)/.test(src) &&
      /const perSql = adPeakItemsSql\(ch, chunkN\);/.test(src);
    const listCap = /ORDER BY p\.added_at DESC LIMIT ' \+ ADTOOL_PEAK_MANUAL_CAP/.test(src) && !/ORDER BY p\.added_at DESC LIMIT 500/.test(src);
    return bound && route && listCap;
  })(), null);
  t('by period: nothing anybody typed can reach that read, and an empty list reads as no rows rather than as the whole fleet', (() => {
    const mixed = F.adPeakItemsSql(['336798586123', '4\' OR 1 = 1 --', '', null, 'abc', '336798586123', '12 34'], 50);
    const clean = (mixed.match(/\{"i":/g) || []).length === 1 && mixed.indexOf('OR 1 = 1') < 0 && /json_each/.test(mixed) && /json_extract\(value, '\$\.i'\) AS pk_item/.test(mixed);
    const none = F.adPeakItemsSql([], 50);
    /* an empty cohort must be a table with NO ROWS and never an empty string: a join that vanished
       would quietly answer for every listing in the database */
    return clean && none !== '' && /WHERE 1 = 0/.test(none) && none.indexOf('json_each') < 0 && /\(SELECT /.test(none);
  })(), [F.adPeakItemsSql(['336798586123', '4\' OR 1 = 1 --', 'abc'], 50), F.adPeakItemsSql([], 50)]);
  t('by period: the 7-day spend column and the table\'s own 7-day row are ONE number, read off one table over one set of days', (() => {
    const ma = src.indexOf('const manual = manualRows.map(r => {');
    const b = src.slice(ma, src.indexOf('const allAccounts =', ma));
    const fromTable = /spend_7d: per && per\.d7 && per\.d7\.spend != null \? per\.d7\.spend : \(spend7\[id\] === undefined \? 0 : spend7\[id\]\),/.test(b);
    const carried = /periods: per \|\| adPeakPeriodsEmpty\(\),/.test(b) && /const per = periodsBy\[id\] \|\| null;/.test(b);
    /* and both really are the same source: the day table, over the seven finished days to yesterday */
    const oneSource = /AS spend, SUM\(units\) AS units FROM adtool_listing_day WHERE day >= \?1 AND day <= \?2/.test(src) && /const d7from = adtAddDays\(today, -7\);/.test(src) && /\['d7', 'd\.day >= \?2'\]/.test(src);
    return fromTable && carried && oneSource;
  })(), null);
  t('by period: today is read from the today grain for these rows too, never from the day grain, whose own today row carries no ad columns', (() => {
    const grain = /FROM adtool_listing_today t JOIN ' \+ perSql \+ ' pkc ON pkc\.pk_item = t\.item_id WHERE t\.uk_day = \?1'\)\.bind\(today\)/.test(src);
    const honest = /perToday\[String\(r\.item_id\)\] = adtTodayRowHonest\(r, todayUtc\)/.test(src) && /const today = ukDate\(''\), todayUtc = utcDate\(\), yday = adtAddDays\(today, -1\);/.test(src);
    const toYesterday = /WHERE d\.day <= \?1 GROUP BY d\.item_id/.test(src);
    /* a listing with a today row and no finished day is still a listing with figures */
    const union = /for \(const k of Object\.keys\(perToday\)\) perIds\[k\] = 1;/.test(src);
    /* and one read, batched: not one statement per listing */
    const one = /const perB = await adtBatchRead\(env, \[/.test(src) && (src.slice(src.indexOf('const perB = await adtBatchRead(env, ['), src.indexOf('const perAgg = {}, perToday = {};')).match(/env\.DB\.prepare\(/g) || []).length === 2;
    return grain && honest && toYesterday && union && one;
  })(), null);
  t('by period: the answer says where each figure comes from, in a sentence carrying no setting and no em-dash, and says so plainly when the read failed', (() => {
    /* 10 Nov: ONE const, printed by both pages that show the table, so one set of numbers is
       described one way and the sentence cannot drift between them. */
    const i = src.indexOf("const ADTOOL_PERIODS_NOTE = '");
    const say = src.slice(i, src.indexOf('\n', i));
    return i > 0 && /advertising report/.test(say) && /order book/.test(say) && /still filling/.test(say) &&
      !/—/.test(say) && !/\d/.test(say) && /periods_problem: periodsProblem,/.test(src) &&
      /catch \(e\) \{ periodsProblem = 'the figures by period could not be read just now'; \}/.test(src) &&
      (src.match(/periods_windows: ADTOOL_PEAK_PERIOD_KEYS,/g) || []).length === 2 &&
      (src.match(/periods_note: periods\.note,/g) || []).length === 2 &&
      (src.match(/periods_problem: periodsProblem,/g) || []).length === 2 &&
      F.ADTOOL_PERIODS_NOTE === F.ADTOOL_PERIODS_NOTE.trim() && F.ADTOOL_PERIODS_NOTE.length > 120;
  })(), null);

  /* ---- and the page: the same table, inside the row's own details block ---- */
  const bpProd = rdFile('frontend/view-adtool-product.js');
  t('peak page: the By period table is drawn INSIDE the listing\'s own details block, before the hour strips, and nowhere else', (() => {
    /* 2 Nov: it now shares a row with the campaigns the listing is in, and that row is still the
       first thing in the block and still sits above the hour strips. */
    const first = /var h = '<div class="pkt-perwrap">' \+ periodsBlock\(r\) \+ campaignsNowBlock\(r\) \+ '<\/div>';\s*\n\s*h \+= '<div class="pkt-sched">' \+ hourStrip\(id, T, 'Today'\)/.test(pkSrc);
    /* declared once and called once: the table has one home and it is that block */
    const once = (pkSrc.match(/periodsBlock\(/g) || []).length === 2 && /function periodsBlock\(r\) \{/.test(pkSrc);
    /* and that block is the second row under the listing, the one patternBlock fills */
    /* 2 Nov: the table gained the Campaign column, so the block under the row spans eleven */
    const where = /<tr class="pkt-sub2"><td colspan="11">' \+ patternBlock\(r, s\)/.test(pkSrc);
    const link = /href="#adtoolProduct\/' \+ esc\(id\) \+ '" target="_blank" rel="noopener"/.test(pkSrc) && /the full Product history/.test(pkSrc);
    /* this file's own prefix throughout, and not one class borrowed from Product history's file */
    const prefix = /'\.pkt-per\{/.test(pkSrc) && /'\.pkt-moving\{/.test(pkSrc) && /'\.pkt-open\{/.test(pkSrc) && !/\.at-tbl/.test(pkSrc) && !/\.at-src/.test(pkSrc);
    return first && once && where && link && prefix;
  })(), null);
  t('peak page: its columns, their wording and their order are Product history\'s own, so one listing reads the same on both pages', (() => {
    const cols = (s) => {
      const i = s.indexOf('<th>Period</th>'); if (i < 0) return '';
      const j = s.indexOf('Profit</th>', i); if (j < 0) return '';
      return s.slice(i, j + 11).replace(/'\s*\+\s*'/g, '').replace(/\s+/g, ' ');
    };
    const a = cols(bpProd), b = cols(pkSrc);
    const order = /\[\['today', 'Today so far'\], \['yesterday', 'Yesterday'\], \['d7', 'Last 7 days'\], \['d30', 'Last 30 days'\], \['all', 'All time'\]\]/.test(pkSrc);
    /* Product history lists them in that order too, today first */
    const same = /\[\['Yesterday', K\.yesterday \|\| \{\}\], \['Last 7 days', K\.d7 \|\| \{\}\], \['Last 30 days', K\.d30 \|\| \{\}\]/.test(bpProd) && /w\.unshift\(\['Today so far', K\.today\]\)/.test(bpProd);
    return a.length > 100 && a === b && order && same;
  })(), [bpProd.indexOf('<th>Period</th>') >= 0, pkSrc.indexOf('<th>Period</th>') >= 0]);
  t('peak page: today and all time carry the still-updating mark, the profit is the shared per-item cell, and the orders it could not cost are counted beside it', (() => {
    const mark = /function perMoving\(key, p\) \{ return key === 'today' \|\| !!\(p && p\.includes_today\); \}/.test(pkSrc) && /<span class="pkt-moving">still updating<\/span>/.test(pkSrc);
    const prof = /adtProfitCell\(p\.actual_profit, 0, 0\)/.test(pkSrc) && (pkSrc.match(/adtProfitCell\(/g) || []).length === 1;
    const unp = /var pc = n0\(p\.pending_cost_orders\), pf = n0\(p\.pending_fee_orders\), un = pc \+ pf;/.test(pkSrc) && /not costed yet/.test(pkSrc);
    /* a window with nothing behind it says so, and the page never turns a nothing into a nought */
    const nul = /<td colspan="7"><span class="pkt-sm2">not available yet<\/span><\/td><\/tr>/.test(pkSrc);
    /* and the page works nothing out for itself: every figure is printed as the answer carries it */
    const noMaths = !/p\.units\s*-\s*p\.attr_units/.test(pkSrc) && /cnt\(p\.units_not_from_ads\)/.test(pkSrc) && /roas\(num\(p\.roas\)\)/.test(pkSrc);
    /* where the money comes from is said ONCE for the list, not under each of five hundred rows */
    const noteOnce = (pkSrc.match(/periodsNote\(\)/g) || []).length === 2 && /PK\.data && PK\.data\.periods_note/.test(pkSrc);
    return mark && prof && unp && nul && noMaths && noteOnce;
  })(), null);

  /* ══ EVERY ROW OF ENTIRE LIVE LISTINGS CARRIES THE SAME TABLE (owner, 10 Nov) ══════════════════
     "On entire listings page I need product history numbers added, with the item details and item
     ids, so that I can see the items that are running are currently working nicely."
     The danger in granting that is a SECOND piece of period arithmetic: two pages each summing the
     same days their own way is how one listing comes to read two ways, and the owner acts on these
     figures. So the Peak page's aggregate was lifted into one function and both pages call it. These
     tests hold that there is exactly one of it, that it is bounded to the rows a page returns, and
     that the page really draws the table under every row of all three lists. ══ */
  t('shared: there is ONE period aggregate in the engine and both pages call it, so no second piece of this arithmetic exists to disagree with the first', (() => {
    /* declared once, called twice, and the two callers are the two computes */
    const decl = (src.match(/async function adtPeriodsForItems\(env, ids, cap, today, todayUtc\) \{/g) || []).length === 1;
    const calls = (src.match(/adtPeriodsForItems\(/g) || []).length === 3;
    const pkBlk = src.slice(src.indexOf('async function adtoolPeakCompute'), src.indexOf('/* ---- which campaigns a listing’s peak hours could switch ----'));
    const lsBlk = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('/* ---- Potential CPC'));
    const both = /const periods = await adtPeriodsForItems\(env, manualRows\.map/.test(pkBlk) && /const periods = await adtPeriodsForItems\(env, perIdsShown, ADTOOL_LIVE_SPLIT_LIST_CAP, today, todayUtc\)/.test(lsBlk);
    /* and the arithmetic itself is in that one place: each of the five windows is built exactly once
       in the whole engine, and neither compute builds any of it for itself */
    const onceEach = ["adPeakPeriodSpliceToday(adPeakPeriodFromAgg(agg, 'all'), tRow)", "today: adPeakPeriodToday(tRow),", "yesterday: adPeakPeriodOrNull(agg, 'yesterday'),", "d7: adPeakPeriodOrNull(agg, 'd7'),", "d30: adPeakPeriodOrNull(agg, 'd30'),"]
      .every(x => src.split(x).length === 2);
    const noneInComputes = !/adPeakPeriodOrNull\(|adPeakPeriodToday\(|adPeakPeriodFromAgg\(|adPeakPeriodSpliceToday\(/.test(pkBlk) && !/adPeakPeriodOrNull\(|adPeakPeriodToday\(|adPeakPeriodFromAgg\(|adPeakPeriodSpliceToday\(/.test(lsBlk);
    /* one day-aggregate statement and one today-grain statement in the whole engine for this table */
    const oneQuery = src.split("FROM adtool_listing_day d JOIN ' + perSql + ' pkc ON pkc.pk_item = d.item_id").length === 2 &&
      src.split("FROM adtool_listing_today t JOIN ' + perSql + ' pkc ON pkc.pk_item = t.item_id").length === 2;
    return decl && calls && both && onceEach && noneInComputes && oneQuery;
  })(), [(src.match(/adtPeriodsForItems\(/g) || []).length]);
  t('shared: the cohort is CHUNKED at the cap the caller passes, so a thousand listings is a handful of bounded reads and never one unbounded one', (() => {
    const cap = 500;
    const many = []; for (let k = 0; k < 1030; k++) many.push(String(300000000000 + k));
    const ch = F.adPeakPeriodChunks(many, cap);
    /* 1,030 listings at five hundred a piece: three pieces, none of them over the cap, and every
       listing in exactly one of them */
    const shape = ch.length === 3 && ch.every(c => c.length <= cap) && ch[0].length === cap && ch[2].length === 30 &&
      ch.reduce((a2, c) => a2 + c.length, 0) === many.length;
    const flat = [].concat.apply([], ch);
    const sameOrder = flat.length === many.length && flat.every((v, i) => v === many[i]);
    /* and the rows the three lists really return — 217 on pay-per-click, the dynamic list at its own
       cap of five hundred, 87 without — are two pieces, which is four statements */
    const page = F.adPeakPeriodChunks(many.slice(0, 217 + 500 + 87), cap);
    const cost = page.length === 2 && page.length * 2 === 4;
    /* each piece is one cohort literal of its own, cut to the same cap */
    const perChunk = /const perSql = adPeakItemsSql\(ch, chunkN\);/.test(src) && /const chunks = adPeakPeriodChunks\(ids, chunkN\);/.test(src) &&
      /for \(const ch of chunks\) \{/.test(src) && /reads: chunks\.length \* 2/.test(src);
    /* nothing anybody typed reaches it, and one listing twice is one listing */
    const clean = F.adPeakPeriodChunks(['336798586123', '336798586123', "4' OR 1 = 1 --", '', null, 'abc'], cap);
    const safe = clean.length === 1 && clean[0].length === 1 && clean[0][0] === '336798586123';
    const none = F.adPeakPeriodChunks([], cap);
    return shape && sameOrder && cost && perChunk && safe && none.length === 0;
  })(), [F.adPeakPeriodChunks(['1', '1', 'x'], 500)]);
  t('live listings: every row of all THREE lists gets its figures, only the rows the page returns are read for, and what the read cost is said out loud', (() => {
    const b = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('/* ---- Potential CPC'));
    /* the ids are the rows of the three lists after the caps, not the universe the page classified:
       a figure for a row the page is not showing is a read nobody asked for */
    const ids = /const perIdsShown = \[\];\s*\n\s*for \(const k of ADTOOL_LIVE_SPLIT_CLASSES\) for \(const r of lists\[k\]\) perIdsShown\.push\(r\.item_id\);/.test(b);
    const cap = /adtPeriodsForItems\(env, perIdsShown, ADTOOL_LIVE_SPLIT_LIST_CAP, today, todayUtc\)/.test(b) && /const ADTOOL_LIVE_SPLIT_LIST_CAP = 500;/.test(src);
    /* every row of every list carries it, and a listing we hold nothing for carries five nulls
       rather than a row of noughts nobody earned */
    const every = /for \(const k of ADTOOL_LIVE_SPLIT_CLASSES\) for \(const r of lists\[k\]\) \{/.test(b) && /r\.periods = per \|\| adPeakPeriodsEmpty\(\);/.test(b);
    /* attached BEFORE the sort, because the sort reads the seven-day spend and that figure now comes
       off this table */
    const before = b.indexOf('r.periods = per || adPeakPeriodsEmpty();') < b.indexOf('lists[k].sort((x, y) => (y.spend_7d - x.spend_7d)');
    /* the answer says which windows it carries, where they come from, whether the read failed, and
       what it cost */
    const says = /periods_windows: ADTOOL_PEAK_PERIOD_KEYS,/.test(b) && /periods_note: periods\.note,/.test(b) && /periods_problem: periodsProblem,/.test(b) &&
      /periods_reads: \{ listings: periods\.listings, chunks: periods\.chunks, reads: periods\.reads, chunk_size: ADTOOL_LIVE_SPLIT_LIST_CAP \}/.test(b);
    /* the today grain is read for these rows too, and under the same UTC report day rule */
    const utc = /const today = ukDate\(''\), todayUtc = utcDate\(\), yday = adtAddDays\(today, -1\), d7from = adtAddDays\(today, -7\);/.test(b);
    return ids && cap && every && before && says && utc;
  })(), null);
  t('live listings: the 7-day spend column and the table’s own 7-day row are ONE number, and the 7-day profit the list sorts on is lifted straight out of that table', (() => {
    const b = src.slice(src.indexOf('async function adtoolLiveSplitCompute'), src.indexOf('/* ---- Potential CPC'));
    /* the same rule the Peak page keeps: the column is taken off the table where the table has that
       window, and the separate aggregate stands in only where no day in it is on record */
    const one = /if \(per && per\.d7 && per\.d7\.spend != null\) r\.spend_7d = per\.d7\.spend;/.test(b);
    /* and both really are one source: adtool_listing_day over the seven finished days to yesterday */
    const oneSource = /ROUND\(SUM\(spend\), 2\) AS spend FROM adtool_listing_day WHERE day >= \?1 AND day <= \?2/.test(b) && /d7from = adtAddDays\(today, -7\)/.test(b) && /\['d7', 'd\.day >= \?2'\]/.test(src);
    /* the profit the sort uses is the table's own d7 figure, and NULL stays null: a listing we hold
       no day for in that window is not a listing that earned nothing */
    const prof = /r\.profit_7d = per && per\.d7 \? per\.d7\.actual_profit : null;/.test(b);
    /* and it is one LISTING's profit, on a row keyed by its item id, which is all this portal allows */
    const perItem = /item_id: id, account: a, title: String\(it\.title \|\| ''\)/.test(b) && !/fleet_profit|profit_total|total_profit/.test(b);
    return one && oneSource && prof && perItem;
  })(), null);

  /* ---- and the page: the same table, under every row of all three lists ---- */
  t('live listings page: the By period table is drawn under EVERY row of all three lists, in a second row spanning that list’s own columns', (() => {
    /* one function, called from the one place that builds a row — and that place is splitPanel,
       which draws all three lists, so the table cannot reach one list and miss another */
    const once = (cpcSrc.match(/periodsBlock\(/g) || []).length === 2 && /function periodsBlock\(r\) \{/.test(cpcSrc);
    const under = /'<tr class="cpc-sub2"><td colspan="' \+ cols\.length \+ '">' \+ periodsBlock\(r\) \+ '<\/td><\/tr>';/.test(cpcSrc);
    /* the row map it is in is splitPanel's, and splitPanel is what every one of the three tabs draws */
    const i = cpcSrc.indexOf('function splitPanel(key) {'), j = cpcSrc.indexOf('/* ── 3 · the money', i);
    const inPanel = i > 0 && j > i && cpcSrc.slice(i, j).indexOf('periodsBlock(r)') > 0;
    const threeTabs = /function isSplitTab\(\) \{ return CP\.tab === 'on_cpc' \|\| CP\.tab === 'dynamic' \|\| CP\.tab === 'no_cpc'; \}/.test(cpcSrc) && /h \+= splitPanel\(CP\.tab\);/.test(cpcSrc);
    /* the listing cell stays the shared product cell, which is what carries the title, the item id,
       the account and the two links the owner asked for */
    const cell = /\{ key: 'listing', label: 'Listing', cell: function \(r\) \{ return adtProductCell\(r\); \}/.test(cpcSrc);
    const link = /href="#adtoolProduct\/' \+ esc\(id\) \+ '" target="_blank" rel="noopener"/.test(cpcSrc) && /the full Product history/.test(cpcSrc);
    /* this page's own prefix throughout: not one class borrowed from the Peak page or from Product
       history, and every class it draws with is defined in its own sheet */
    const prefix = !/pkt-/.test(cpcSrc) && !/\bat-tbl|\bat-src/.test(cpcSrc) && /'\.cpc-per\{/.test(cpcSrc) && /'\.cpc-moving\{/.test(cpcSrc) &&
      /'\.cpc-open\{/.test(cpcSrc) && /'\.cpc-htbl\{/.test(cpcSrc) && /'\.cpc-tbl tr\.cpc-sub2 td\{/.test(cpcSrc) && /'\.cpc-sm2\{/.test(cpcSrc) && /'\.cpc-rules\{/.test(cpcSrc) && /'\.cpc-bad\{/.test(cpcSrc) && /'\.cpc-perk\{/.test(cpcSrc);
    return once && under && inPanel && threeTabs && cell && link && prefix;
  })(), null);
  t('live listings page: its columns, their wording and their order are Product history’s own, so one listing reads the same on all three pages', (() => {
    const cols = (s) => {
      const i = s.indexOf('<th>Period</th>'); if (i < 0) return '';
      const j = s.indexOf('Profit</th>', i); if (j < 0) return '';
      return s.slice(i, j + 11).replace(/'\s*\+\s*'/g, '').replace(/\s+/g, ' ');
    };
    const a = cols(bpProd), b = cols(cpcSrc), c = cols(pkSrc);
    const order = /\[\['today', 'Today so far'\], \['yesterday', 'Yesterday'\], \['d7', 'Last 7 days'\], \['d30', 'Last 30 days'\], \['all', 'All time'\]\]/.test(cpcSrc);
    return a.length > 100 && a === b && b === c && order;
  })(), [cpcSrc.indexOf('<th>Period</th>') >= 0]);
  t('live listings page: today and all time are marked as still updating, the profit is the shared per-item cell, the orders it could not cost are counted beside it, and nothing is worked out on the page', (() => {
    const mark = /function perMoving\(key, p\) \{ return key === 'today' \|\| !!\(p && p\.includes_today\); \}/.test(cpcSrc) && /<span class="cpc-moving">still updating<\/span>/.test(cpcSrc);
    const prof = /adtProfitCell\(p\.actual_profit, 0, 0\)/.test(cpcSrc);
    const unp = /var pc = n0\(p\.pending_cost_orders\), pf = n0\(p\.pending_fee_orders\), un = pc \+ pf;/.test(cpcSrc) && /not costed yet/.test(cpcSrc);
    /* a window with nothing behind it says so, and the page never turns a nothing into a nought */
    const nul = /<td colspan="7"><span class="cpc-sm2">not available yet<\/span><\/td><\/tr>/.test(cpcSrc) &&
      /This answer carries no figures by period for this listing/.test(cpcSrc) && /there is nothing to show by period/.test(cpcSrc);
    /* every figure is printed as the answer carries it: no subtraction, no ratio, no sum */
    const noMaths = !/p\.units\s*-\s*p\.attr_units/.test(cpcSrc) && /cnt\(p\.units_not_from_ads\)/.test(cpcSrc) && /roasTxt\(num\(p\.roas\)\)/.test(cpcSrc);
    return mark && prof && unp && nul && noMaths;
  })(), null);
  t('live listings page: where the figures come from is said ONCE, above the first table, in the engine’s own words', (() => {
    const once = (cpcSrc.match(/periodsNote\(\)/g) || []).length === 2 && /function periodsNote\(\) \{/.test(cpcSrc);
    /* the engine's sentence, never the page's own, and the failure said plainly beside it */
    const engines = /var t = String\(\(D && D\.periods_note\) \|\| ''\)\.trim\(\);/.test(cpcSrc) && /var bad = String\(\(D && D\.periods_problem\) \|\| ''\)\.trim\(\);/.test(cpcSrc);
    /* above the list that carries it, and after the two panels that were always there */
    const i = cpcSrc.indexOf('h += periodsNote();');
    const where = i > 0 && cpcSrc.indexOf('h += invariantLine();') < i && i < cpcSrc.indexOf('h += splitPanel(CP.tab);');
    /* and nothing of it is typed into the page: no sentence of its own about fees or costs */
    const noCopy = !/after eBay fees, product cost, ad spend and returns\.<\/div>/.test(cpcSrc);
    return once && engines && where && noCopy;
  })(), null);
  t('live listings page: the 7-day profit sort sits beside the 7-day spend sort on every list, and a figure we do not hold reads "not known" and never nought', (() => {
    /* the column is in SPLIT_COLS, which is what all three lists are drawn from, so the sort reaches
       every list rather than one of them */
    const col = /\{ key: 'profit_7d', label: 'Profit over 7 days', cls: 'r', title: 'this listing\\'s own profit over the last 7 finished days/.test(cpcSrc) &&
      /cell: profit7Cell, sortVal: per7 \}/.test(cpcSrc);
    const beside = cpcSrc.indexOf("key: 'spend_7d'") < cpcSrc.indexOf("key: 'profit_7d'") &&
      cpcSrc.indexOf("key: 'profit_7d'") < cpcSrc.indexOf('var NO_CPC_COL =');
    /* the three lists are drawn from SPLIT_COLS, the third adding its own column INSIDE it */
    const allThree = /function splitColsFor\(key\) \{ return key === 'no_cpc' \? SPLIT_COLS\.slice\(0, 2\)\.concat\(\[NO_CPC_COL\], SPLIT_COLS\.slice\(2\)\) : SPLIT_COLS; \}/.test(cpcSrc);
    /* and it really is clickable: the heading carries this page's own sort attribute and the handler
       sorts numbers the heavy way first */
    const clickable = /data-cps="' \+ esc\(c\.key\) \+ '"/.test(cpcSrc) && /CP\.splitSort = \{ key: k, dir: \(k === 'listing' \|\| k === 'campaigns' \|\| k === 'split_detail'\) \? 1 : -1 \}/.test(cpcSrc);
    /* NOT KNOWN, NEVER NOUGHT: the cell says so and the sort value stays null, which sinks the row */
    const notKnown = /return v == null \? '<span class="cpc-sub">not known<\/span>' : adtProfitCell\(v, 0, 0\);/.test(cpcSrc) &&
      /if \(r\.profit_7d != null\) return num\(r\.profit_7d\);/.test(cpcSrc) && /return \(d && typeof d === 'object'\) \? num\(d\.actual_profit\) : null;/.test(cpcSrc);
    /* nulls sink whichever way the list is sorted, so a listing we know nothing about never heads it */
    const sink = /if \(va == null\) return 1; if \(vb == null\) return -1;/.test(cpcSrc);
    /* and the page keeps its own five-minute poller: this change adds a figure, not a second clock */
    const poll = /adtPoll\('cpcBody', 300000, function \(\) \{ CP\.money = null; CP\.archive = null; CP\.split = null; return loadTab\(true\); \}\);/.test(cpcSrc);
    return col && beside && allThree && clickable && notKnown && sink && poll;
  })(), null);
  t('live listings page: no reader copy on it carries an em-dash, and the one dash it prints is the empty-figure mark every advertising page prints', (() => {
    /* a dash as a FIGURE is this portal's "nothing to divide by" and stays; a dash in a SENTENCE is
       the thing the owner reads as a mistake. The new copy is checked line by line. */
    const lines = cpcSrc.split('\n').filter(l => /cpc-sm2|cpc-rules|cpc-psub|not known|still updating|not available yet/.test(l));
    return lines.length > 4 && lines.every(l => !/—/.test(l)) && !/—/.test(cpcSrc.slice(cpcSrc.indexOf('function periodsBlock(r) {'), cpcSrc.indexOf('var SPLIT_COLS = [')));
  })(), null);

  /* ══ PRODUCT HISTORY MUST OPEN FAST, AND NO FIGURE ON IT MAY MOVE (owner, 2 Nov) ═══════════════
     "Product history page takes a lot of time to get open, make it fast." The page was the one heavy
     advertising action with no memo at all and it ran six and twenty reads one after another. These
     tests hold the three halves of the fix: the memo and the write that drops it, the hour read
     bounded to what the page draws with the window named in the answer, and the groups that turned
     a queue of reads into a handful of trips. The figures themselves are held by the By period
     equality tests above, which still stand. ══ */
  const plSrc = src.slice(src.indexOf('async function adtoolListingCompute(env, iid, p) {'), src.indexOf('async function adtListingCacheClear('));
  const plRoute = src.slice(src.indexOf('  adtoolListing: {'), src.indexOf('  adtoolActionLog: {'));
  t('product history: the page’s own open goes through the KV memo, keyed by the listing, the reader’s profit class and the pattern window, and nothing else', (() => {
    /* 9 Nov: the key carries the pattern window too, because the page sends one on every open and
       four blocks of it are summed over that window. All time keys to nothing, so a reader who asks
       for nothing and a reader who asks for all time share one entry. */
    const memo = /return adtKvMemo\(ctx\.env, 'adtoolListing', adtProfitClass\(ctx\.user\), patKey \? \{ item_id: iid, pattern: patKey \} : \{ item_id: iid \}, ADTOOL_KV_TTL_MS\.adtoolListing,/.test(plRoute) &&
      /const patKey = adListingPatternKey\(p && p\.pattern\);/.test(plRoute) &&
      /\(\) => adtoolListingCompute\(ctx\.env, iid, p\),/.test(plRoute);
    /* two minutes, the same ceiling the other listing-level pages state */
    const ttl = /adtoolListing: 120000 \};/.test(src);
    /* THE ROLE HALF OF THE GATE IS ABOVE THE CACHE: the key carries a profit class, never a role, so
       a stored answer must never be the thing that decides who may read the page */
    const gateFirst = plRoute.indexOf("adtGate(ctx, 'adtool_page_product')") >= 0 &&
      plRoute.indexOf("adtGate(ctx, 'adtool_page_product')") < plRoute.indexOf('adtKvMemo');
    /* a caller asking for a PERIOD of its own is still answered FRESH: the key names no period */
    const windowFresh = /if \(p && \(p\.period \|\| p\.from\)\) return adtoolListingCompute\(ctx\.env, iid, p\);/.test(plRoute);
    /* one key per listing per class, and nothing else in it */
    const kA = kk('adtoolListing', { item_id: '137675597138' }), kB = kk('adtoolListing', { item_id: '236997583155' });
    /* and one key per WINDOW on top of that: two windows of one listing are two answers and must
       never be served for one another, while all time and no window asked for are one answer */
    const kAll = kk('adtoolListing', { item_id: '137675597138', pattern: F.adListingPatternKey({ kind: 'all' }) });
    const kM = kk('adtoolListing', { item_id: '137675597138', pattern: F.adListingPatternKey({ kind: 'month', month: '2026-10' }) });
    const kW = kk('adtoolListing', { item_id: '137675597138', pattern: F.adListingPatternKey({ kind: 'last_week' }) });
    const perWindow = kAll === kA && kM !== kA && kW !== kA && kM !== kW &&
      kM === kk('adtoolListing', { item_id: '137675597138', pattern: 'm:2026-10' });
    return memo && ttl && gateFirst && windowFresh && kA !== kB && perWindow &&
      kA.indexOf(F.adtKvPrefix('adtoolListing')) === 0 &&
      kA !== F.adtKvKey('adtoolListing', 'np', { item_id: '137675597138' });
  })(), null);
  t('product history: the two writes that page makes drop its own memo entry, both profit classes, after the write lands and never fatally', (() => {
    const log = src.slice(src.indexOf('  adtoolActionLog: {'), src.indexOf('  adtoolHealth: {'));
    /* 9 Nov: the note carries the window the page is showing, so the entry that reader's own reload
       will read is dropped as well as the default one. A window it cannot read is not a reason to
       refuse a note: the key falls back to the default. */
    const note = /await adtListingCacheClear\(ctx\.env, iid, patKey\);/.test(log) &&
      /try \{ patKey = adListingPatternKey\(p && p\.pattern\); \} catch \(e\) \{ patKey = ''; \}/.test(log) &&
      log.indexOf('adtListingCacheClear') > log.indexOf('INSERT INTO adtool_actions');
    const narr = src.indexOf('await adtListingCacheClear(env, id);') > src.indexOf('INSERT INTO adtool_narratives');
    const clear = src.slice(src.indexOf('async function adtListingCacheClear('), src.indexOf('const ADTOOL_ACTIONS = {'));
    const both = /for \(const cls of \['p', 'np'\]\)/.test(clear) && /adtKvKey\('adtoolListing', cls, \{ item_id: id \}\)/.test(clear) &&
      /if \(pat\) \{ try \{ await env\.HOT\.delete\(adtKvKey\('adtoolListing', cls, \{ item_id: id, pattern: pat \}\)\); \}/.test(clear);
    /* it never throws, and it never reaches past this one listing */
    const safe = /catch \(e\) \{ \/\* the read window catches it \*\/ \}/.test(clear) && clear.indexOf('adtKvPrefix') < 0 &&
      /const id = String\(iid \|\| ''\)\.replace\(\/\\D\/g, ''\);/.test(clear) && /if \(!id\) return;/.test(clear);
    return note && narr && both && safe;
  })(), null);
  t('product history: the hour read is bounded to what the page draws, and the answer says what window the hours cover', (() => {
    /* the rows that TRAVEL are the one day the hour chart draws: the newest day row at or before
       yesterday, under the same 28-day floor the window always had, so a listing whose last day is
       older than that still draws the empty chart it drew before */
    const drawn = /FROM adtool_listing_hour WHERE item_id = \?1 AND day >= \?2 AND day = \(SELECT MAX\(day\) FROM adtool_listing_day WHERE item_id = \?1 AND day <= \?3\) ORDER BY day, hour/.test(plSrc);
    /* and the 28-day profile is its own statement, narrowed to the six columns the sums use */
    const prof = /SELECT day, hour, orders, units, revenue, hourly_status FROM adtool_listing_hour WHERE item_id = \?1 AND day >= \?2 ORDER BY day, hour/.test(plSrc);
    const floor = /const hourFrom = adtAddDays\(today, -28\);/.test(plSrc);
    /* THE FIGURES COME OFF THE PROFILE AND NEVER OFF THE ROWS THAT TRAVEL, which is why bounding the
       payload cannot move the heat map, the time slots or the hourly note */
    const sums = /for \(const h of hourProfile\) \{ const w2 = adtWeekdayOf\(h\.day\); heat\[w2\]\[h\.hour\] \+= h\.units;/.test(plSrc) &&
      plSrc.indexOf('for (const h of hours)') < 0;
    const named = /hours_window: \{ from: hourFrom, to: yday, days: 28, hours_day: hours\.length \? String\(hours\[0\]\.day\) : '', profile_rows: hourProfile\.length,/.test(plSrc);
    /* and the view asks for exactly that one day, off the last day row it holds */
    const view = /var hrs = D\.hours\.filter\(function \(x\) \{ return x\.day === yday; \}\);/.test(bpProd) &&
      /var D = AT\.data; var days = D\.days; var yday = days\.length \? days\[days\.length - 1\]\.day : '';/.test(bpProd) &&
      (bpProd.match(/D\.hours/g) || []).length === 1;
    return drawn && prof && floor && sums && named && view;
  })(), null);
  t('product history: the independent reads go in groups, one trip each, and the groups run at the same time', (() => {
    const grouped = /const G = await clock\('reads_ms', \(\) => Promise\.all\(\[/.test(plSrc) &&
      /clock\('core_ms', \(\) => adtBatchRead\(env, core\)\),/.test(plSrc);
    /* the core group is ONE batch of eight statements, read back in the order they were sent */
    const eight = (plSrc.slice(plSrc.indexOf('const core = ['), plSrc.indexOf("const G = await clock('reads_ms'")).match(/env\.DB\.prepare\(/g) || []).length === 8 &&
      /const cr = G\[0\], tRowRaw = G\[1\], saleRows = G\[2\], where = G\[3\], profile = G\[4\], notes = G\[5\], freshPair = G\[6\](?:, peakRead = G\[7\])?(?:, patHours = G\[8\])?;/.test(plSrc);
    /* the campaign map went from four trips to one, and the pattern bundle from five to one */
    const wr = (src.slice(src.indexOf('const WR = await adtBatchRead(env, ['), src.indexOf('const rows = WR[0] || [];')).match(/env\.DB\.prepare\(/g) || []).length === 4;
    const pb = (src.slice(src.indexOf('const PB = await adtBatchRead(env, ['), src.indexOf('const st = (PB[0] || [])[0];')).match(/env\.DB\.prepare\(/g) || []).length === 5;
    /* THE SCHEMA GUARDS RUN FIRST AND IN THEIR OLD ORDER: two lots of DDL at once is not a saving */
    const ddl = plSrc.indexOf('ensureAdtoolPhase1Schema(env)') < plSrc.indexOf('ensureAdtoolPhase2Schema(env)') &&
      plSrc.indexOf('ensureAdtoolPhase2Schema(env)') < plSrc.indexOf('ensureAdtoolPhase3Schema(env)') &&
      plSrc.indexOf('ensureAdtoolPhase3Schema(env)') < plSrc.indexOf("const G = await clock('reads_ms'");
    /* and every read that stood behind a guard of its own still does, so one missing table cannot
       empty a group it was never in: the sale grains are still guarded as the pair they were */
    const guards = /clock\('where_ms', \(\) => adtWhereRows\(env, iid\)\.catch\(\(\) => null\)\),/.test(plSrc) &&
      /clock\('profile_ms', \(\) => adtListingProfileBundle\(env, iid\)\.catch\(\(\) => null\)\),/.test(plSrc) &&
      /\]\)\.catch\(\(\) => null\)\),/.test(plSrc) &&
      (plSrc.match(/\.catch\(\(\) => null\)/g) || []).length >= 7;
    return grouped && eight && wr && pb && ddl && guards;
  })(), null);
  t('product history: the answer carries its own working-out time and the page prints it beside how long it took to arrive', (() => {
    const tot = /T\.total_ms = Date\.now\(\) - t0;/.test(plSrc) && /timings: T,/.test(plSrc);
    const groups = ['schema_ms', 'core_ms', 'today_ms', 'sale_ms', 'where_ms', 'profile_ms', 'notes_ms', 'fresh_ms', 'reads_ms'].every(k => plSrc.indexOf("clock('" + k + "'") >= 0) &&
      /T\.shape_ms = Date\.now\(\) - t0 - \(T\.schema_ms \|\| 0\) - \(T\.reads_ms \|\| 0\);/.test(plSrc);
    const page = /' ms' \+ workedOut\(D\)/.test(bpProd) && /return ' · worked out in ' \+ Math\.round\(ms\) \+ ' ms';/.test(bpProd);
    /* and a nought is never printed where the engine sent no figure */
    const nul = /if \(t == null \|\| t\.total_ms == null \|\| isNaN\(ms\)\) return '';/.test(bpProd);
    return tot && groups && page && nul;
  })(), null);
  t('product history probe: by key, not adtool-prefixed, out of no sidebar, running the page’s own composition and returning the clock and the sizes and nothing else', (() => {
    const pr = src.slice(src.indexOf('  adsListingProbe: {'), src.indexOf("  /* §3 of the 31 Oct brief, read-only and by key"));
    const gated = /auth: 'sync', fn: async \(p, ctx\) => \{/.test(pr);
    /* THE SAME COMPOSITION, through the same function, with the memo bypassed: a probe that answered
       out of the cache would be timing the cache */
    const same = /const d = await adtoolListingCompute\(ctx\.env, iid, \(p && p\.pattern\) \? \{ pattern: p\.pattern \} : null\);/.test(pr) && pr.indexOf('adtKvMemo') < 0;
    /* the clock and the sizes and nothing else: no money, no profit, no listing text. A key is not a
       role, so this route must never be a way round the profit law or round the page flag. */
    const only = /timings: d\.timings,/.test(pr) && /rows: \{ days: \(d\.days \|\| \[\]\)\.length, hours: \(d\.hours \|\| \[\]\)\.length, hour_profile: Number\(hw\.profile_rows\) \|\| 0, weeks: \(d\.weeks \|\| \[\]\)\.length, months: \(d\.months \|\| \[\]\)\.length,/.test(pr) &&
      !/spend|profit|revenue|actual|price|title|margin/.test(pr.slice(pr.indexOf('return {')));
    /* it writes nothing and it reaches nothing */
    const readonly = !/\.run\(\)|INSERT |UPDATE |DELETE /.test(pr) && !/fetch\(/.test(pr);
    /* the router role-gates the adtool prefix before it has a user to judge, and a key-authed call
       has none, so the name must not carry that prefix and must not be in the portal's action list */
    const naming = src.indexOf('adtoolListingProbe') < 0 && shellSrc.indexOf('adsListingProbe') < 0;
    return gated && same && only && readonly && naming;
  })(), null);

  /* ══ THE PEAK ROWS SHOW WHICH CAMPAIGNS THE LISTING IS IN NOW (owner, 2 Nov) ══════════════════ */
  t('peak rows: the campaigns a listing is in now come off the switchable read the page already made, with no second query inside the row loop', (() => {
    /* `const allAccounts =` appears in an earlier function too, so the end is searched for FROM the
       start of this one: a slice taken without the offset is empty and every check in it passes. */
    const ma = src.indexOf('const manual = manualRows.map(r => {');
    const blk = src.slice(ma, src.indexOf('const allAccounts =', ma));
    const fromSw = /campaigns_now: adPeakCampaignsNow\(sw, pickC\.chosen\),/.test(blk) && /const sw = switchable\[id\] \|\| \[\];/.test(blk);
    /* ONE switchable read for the whole page, taken before the rows are built, and it is the same
       function the switch job itself is judged on */
    const oneRead = (src.match(/const switchable = await adtPeakSwitchable\(env, manualRows\.map\(r => String\(r\.item_id\)\)\);/g) || []).length === 1 &&
      src.indexOf('const switchable = await adtPeakSwitchable') < src.indexOf('const manual = manualRows.map(r => {');
    /* and nothing new is asked of the database inside the loop over the rows */
    const noQuery = blk.indexOf('env.DB.prepare') < 0;
    /* the WHOLE list, not the filtered one: which campaigns it IS IN is not the same question as
       which campaign the row NAMES, and the row carries both */
    const whole = /campaigns_now: adPeakCampaignsNow\(sw,/.test(blk) && !/campaigns_now: adPeakCampaignsNow\(pickC\.rows/.test(blk) &&
      /campaign_id: pickC\.chosen,/.test(blk);
    /* and the answer says once what that list covers, in a sentence carrying no setting */
    const says = /campaigns_now_note: 'the campaigns under each row are the live pay-per-click campaigns the listing is in/.test(src) &&
      !/\d/.test(src.slice(src.indexOf("campaigns_now_note: '"), src.indexOf("',", src.indexOf("campaigns_now_note: '"))));
    return fromSw && oneRead && noQuery && whole && says;
  })(), null);
  t('peak rows: newest reading first, the named campaign marked and only where one is named, and an ad eBay never stamped is given no state', (() => {
    const rows = [
      { campaign_id: 'C1', name: 'General', funding_model: 'COST_PER_CLICK', c_status: 'RUNNING', ad_status: 'PAUSED', ad_synced_at: '2026-11-01 08:00:00' },
      { campaign_id: 'C2', name: 'Winners', funding_model: 'COST_PER_CLICK', c_status: 'RUNNING', ad_status: '', ad_synced_at: '2026-11-02 16:00:00' },
      { campaign_id: 'C3', name: 'Cases', funding_model: 'COST_PER_CLICK', c_status: 'ENDING_SOON', ad_status: 'ACTIVE', ad_synced_at: '2026-11-02 16:00:00' },
    ];
    const a = F.adPeakCampaignsNow(rows, 'C1');
    /* newest reading first, and a tie falls back to the campaign id so two opens of the page cannot
       put the same two readings in a different order */
    const order = a.map(x => x.campaign_id).join(',') === 'C2,C3,C1';
    const marked = a.filter(x => x.chosen).length === 1 && a.filter(x => x.chosen)[0].campaign_id === 'C1';
    const none = F.adPeakCampaignsNow(rows, '').every(x => x.chosen === false) &&
      F.adPeakCampaignsNow(rows, null).every(x => x.chosen === false) &&
      F.adPeakCampaignsNow(rows, 'C9').every(x => x.chosen === false);
    const blank = a.filter(x => x.campaign_id === 'C2')[0];
    const shape = blank.ad_status === '' && blank.campaign_name === 'Winners' && blank.funding_model === 'COST_PER_CLICK' &&
      blank.campaign_status === 'RUNNING' && blank.ad_read_at === '2026-11-02 16:00:00' && blank.chosen === false &&
      Object.keys(blank).sort().join(',') === 'ad_read_at,ad_status,campaign_id,campaign_name,campaign_status,chosen,funding_model';
    /* a listing with no switchable ad gets an empty list and never a row of nothings */
    const empty = F.adPeakCampaignsNow([], 'C1').length === 0 && F.adPeakCampaignsNow(null, '').length === 0 &&
      F.adPeakCampaignsNow([null, undefined], '').length === 0;
    /* a row eBay sent with no stamp at all still answers, with empty strings and not undefined */
    const bare = F.adPeakCampaignsNow([{ campaign_id: 'C4' }], '')[0];
    const bareOk = bare.campaign_name === '' && bare.funding_model === '' && bare.campaign_status === '' && bare.ad_status === '' && bare.ad_read_at === '';
    return order && marked && none && shape && empty && bareOk;
  })(), [F.adPeakCampaignsNow([{ campaign_id: 'C1', ad_synced_at: 'a' }, { campaign_id: 'C2', ad_synced_at: 'b' }], 'C1').map(x => x.campaign_id)]);
  t('peak page: the campaigns block sits beside the By period table, every campaign is a campaign link, and a listing with no live ad is told so plainly', (() => {
    const beside = /var h = '<div class="pkt-perwrap">' \+ periodsBlock\(r\) \+ campaignsNowBlock\(r\) \+ '<\/div>';/.test(pkSrc) &&
      (pkSrc.match(/campaignsNowBlock\(/g) || []).length === 2;
    /* every campaign is a link, through the shared helper this page already links campaigns with */
    const link = /campCell\(\{ campaign_id: c && c\.campaign_id, campaign_name: c && c\.campaign_name \}\)/.test(pkSrc) &&
      /return adtCampaignLink\(r\.campaign_id, name\);/.test(pkSrc);
    /* its type in plain words, both ways round, and never the raw constant */
    const type = /if \(v === 'COST_PER_CLICK'\) return 'pay-per-click';/.test(pkSrc) && /if \(v === 'COST_PER_SALE'\) return 'cost per sale';/.test(pkSrc);
    /* what the ad said AND when that reading was taken, because a status here is a reading */
    const reading = /var when = whenTxt\(c && c\.ad_read_at\), st = statusWords\(c && c\.campaign_status\);/.test(pkSrc) &&
      /', read ' \+ esc\(when\) \+ ' UK'/.test(pkSrc) && /and we do not hold when that reading was taken/.test(pkSrc);
    const mark = /c && c\.chosen \? ' <span class="pkt-tag live">its hours switch this one<\/span>' : ''/.test(pkSrc);
    const nolive = /This listing has no live ad at all just now, so its hours have nothing to switch\./.test(pkSrc) &&
      /No live pay-per-click campaign holds an ad for this listing, so its hours have nothing to switch\./.test(pkSrc) &&
      /This answer does not say which campaigns this listing is in\./.test(pkSrc);
    /* this file's own prefix throughout, and not one class borrowed from Product history's file */
    const prefix = /'\.pkt-now\{/.test(pkSrc) && /'\.pkt-nowl\{/.test(pkSrc) && /'\.pkt-perwrap\{/.test(pkSrc) &&
      !/\.at-tbl/.test(pkSrc) && !/\.at-src/.test(pkSrc) && !/\.at-age/.test(pkSrc);
    /* and the page invents nothing: no state is put on an ad eBay has never stamped */
    const honest = /return 'eBay has never stamped this ad, so it is being served';/.test(pkSrc);
    return beside && link && type && reading && mark && nolive && prefix && honest;
  })(), null);

  /* ══ EVERY PEAK ROW NAMES ITS OWN CAMPAIGN (owner, 2 Nov) ═════════════════════════════════════
     Measured on the live list the night this was asked for: 88 rows, none naming a campaign, of
     which 68 are in exactly one running pay-per-click campaign, 10 are in two and 10 are in none.
     The fill job may write the 68, because for them naming the campaign is only the truth being
     recorded, and must never touch the 10 in two, because naming one of those would take the other
     out of the 17:00 and 23:00 switch on a fleet where live apply is on for all eight accounts. ══ */
  t('peak campaign fill: exactly one running pay-per-click campaign fills, two or more never do, none never does, and two readings of one campaign are still one campaign', (() => {
    const ad = (cid, name, extra) => Object.assign({ campaign_id: cid, name: name, funding_model: 'COST_PER_CLICK', ad_synced_at: '2026-11-02 16:00:00' }, extra || {});
    /* THE 68: one campaign, so it is named, with its own name carried for the audit row */
    const one = F.adPeakCampaignFill([ad('C1', 'General')]);
    const oneOk = one.fill === true && one.campaign_id === 'C1' && one.campaign_name === 'General' &&
      one.reason === 'one' && one.campaigns_n === 1 && one.campaigns.join(',') === 'C1';
    /* THE 10 IN TWO: never chosen for, and the answer says why in one word rather than by an empty id */
    const many = F.adPeakCampaignFill([ad('C1', 'General'), ad('C2', 'Winners')]);
    const manyOk = many.fill === false && many.campaign_id === '' && many.campaign_name === '' &&
      many.reason === 'many' && many.campaigns_n === 2;
    /* THE 10 IN NONE: nothing to name, and a listing read as being in no campaign is not a fill */
    const none = F.adPeakCampaignFill([]), nil = F.adPeakCampaignFill(null);
    const noneOk = none.fill === false && none.reason === 'none' && none.campaigns_n === 0 &&
      nil.fill === false && nil.reason === 'none' && nil.campaigns_n === 0;
    /* eBay returns several ad records per listing per campaign (24 Oct). Counting the records would
       read a one-campaign listing as a two-campaign one and leave it unfilled for ever. */
    const dup = F.adPeakCampaignFill([ad('C1', 'General'), ad('C1', 'General'), ad('C1', '')]);
    const dupOk = dup.fill === true && dup.campaigns_n === 1 && dup.campaign_name === 'General';
    /* a pay-on-sale ad has no state to switch, so it is not a campaign this rule counts: a listing
       with one pay-per-click ad and one pay-on-sale ad is a ONE-campaign listing */
    const mixed = F.adPeakCampaignFill([ad('C1', 'General'), ad('C9', 'Promoted', { funding_model: 'COST_PER_SALE' })]);
    const mixedOk = mixed.fill === true && mixed.campaign_id === 'C1' && mixed.campaigns_n === 1;
    /* a reading with no funding model at all still counts: the membership rule that produced these
       rows has already held them to pay-per-click, and dropping it would read the listing as being
       in no campaign and fill nothing for ever */
    const bare = F.adPeakCampaignFill([{ campaign_id: 'C1' }]);
    const bareOk = bare.fill === true && bare.campaign_id === 'C1' && bare.campaign_name === '';
    /* and a row with no campaign id is not a campaign */
    const blank = F.adPeakCampaignFill([{ campaign_id: '' }, null, ad('C1', 'General')]);
    const blankOk = blank.fill === true && blank.campaigns_n === 1;
    return oneOk && manyOk && noneOk && dupOk && mixedOk && bareOk && blankOk;
  })(), null);
  t('peak campaign fill: the job names only the obvious ones, writes one audit row per listing, never chooses for a listing in more than one, and drops the page’s memo', (() => {
    const fj = src.slice(src.indexOf('async function adtoolPeakCampaignFill(env) {'), src.indexOf('const ADTOOL_ACTIONS_P16 = {'));
    if (fj.length < 500) return false;
    /* it reads ONLY the rows naming nothing, so a campaign somebody set is never read, let alone
       overwritten, and the write carries the same guard so two runs cannot fight each other */
    const onlyBlank = /SELECT account, item_id, hours FROM adtool_peak_items WHERE removed_at = '' AND COALESCE\(campaign_id, ''\) = ''/.test(fj) &&
      /UPDATE adtool_peak_items SET campaign_id = \?2 WHERE item_id = \?1 AND removed_at = '' AND COALESCE\(campaign_id, ''\) = ''/.test(fj);
    /* the decision is the pure rule and nothing else, off the read the page is judged on too */
    const byRule = /const switchable = await adtPeakSwitchable\(env, rows\.map\(r => String\(r\.item_id\)\)\);/.test(fj) &&
      /const f = adPeakCampaignFill\(switchable\[id\] \|\| \[\]\);/.test(fj) &&
      /if \(f\.reason === 'many'\) \{ many\.push\(id\); continue; \}/.test(fj) &&
      /if \(f\.reason === 'none'\) \{ none\+\+; continue; \}/.test(fj);
    /* ONE write and ONE audit row per filled listing, pushed in the same pass, so the trail cannot
       hold more or fewer rows than the fill itself wrote */
    const perListing = (fj.match(/setStmts\.push\(/g) || []).length === 1 &&
      (fj.match(/auditStmts\.push\(/g) || []).length === 1 &&
      /INSERT INTO audit \(actor, action, target, old, new, at\) VALUES \('adtool \(campaign fill\)', 'ADTOOL_PEAK_CAMPAIGN_FILL', \?1, '', \?2, datetime\('now'\)\)/.test(fj) &&
      /\.bind\(id, \(f\.campaign_name \|\| f\.campaign_id\) \+ ' \(' \+ f\.campaign_id \+ '\)'\)/.test(fj);
    /* the trail never blocks the fill, and the fill is never hidden by the trail failing */
    const trail = /if \(auditStmts\.length\) \{ try \{ await adtBatch\(env, auditStmts\); \} catch \(e\)/.test(fj) &&
      fj.indexOf('await adtBatch(env, setStmts)') < fj.indexOf('await adtBatch(env, auditStmts)');
    /* the memo goes at the end, for the all-accounts entry and for every account it filled on */
    const memo = /await adtPeakCacheClear\(env, ''\);/.test(fj) &&
      /for \(const a of Object\.keys\(accounts\)\) await adtPeakCacheClear\(env, a\);/.test(fj) &&
      fj.indexOf("await adtPeakCacheClear(env, '')") > fj.indexOf('await adtBatch(env, setStmts)');
    /* the note carries all three figures and names the ones it left alone */
    const note = /' of ' \+ rows\.length \+ ' named their one campaign; ' \+ many\.length \+/.test(fj) &&
      /' left alone because the listing is in more than one running pay-per-click campaign/.test(fj) &&
      /' have no running pay-per-click campaign to name'/.test(fj) &&
      /\(many\.length \? ' · in more than one: ' \+ many\.join\(', '\) : ''\)/.test(fj);
    /* and it reaches eBay with nothing at all: no fetch, and no row written to the apply log, which
       is the only table in this tool that records something having been sent */
    const sendsNothing = fj.indexOf('fetch(') < 0 && fj.indexOf('adtool_apply_log') < 0 && fj.indexOf('ebayAccessToken') < 0;
    return onlyBlank && byRule && perListing && trail && memo && note && sendsNothing;
  })(), null);
  t('peak campaign fill: the job runs by key and sits on no cron slot, because a once-over of a list people keep must not re-name rows somebody cleared on purpose', (() => {
    const rk = src.slice(src.indexOf('  runJobKey: {'), src.indexOf('  asRunJob: {'));
    const byKey = rk.length > 200 && /adtoolPeakCampaignFill, adtoolPeakHoursSet \};/.test(rk);
    const cm = src.slice(src.indexOf('function cronMap() {'), src.indexOf('export default {'));
    const noCron = cm.length > 1000 && cm.indexOf('adtoolPeakCampaignFill') < 0;
    /* it keeps its own row in the job trail, under its own name, like every other job here */
    const trail = /const t = await adtJobStart\(env, 'adtoolPeakCampaignFill'\);/.test(src) &&
      (src.match(/await adtJobEnd\(env, 'adtoolPeakCampaignFill'/g) || []).length === 4;
    /* a database that never took the campaign column has nothing to fill and says so rather than
       failing, and a list that already names its campaigns is not an error either */
    const graceful = /this database cannot record a campaign against a peak listing yet, so there was nothing to fill/.test(src) &&
      /every row on the by-hand list already names the campaign its hours switch/.test(src);
    return byKey && noCron && trail && graceful;
  })(), null);
  t('peak rows: the Campaign cell is on the row itself with the count of campaigns the listing is in, and the row’s own control opens the same picker the add form uses', (() => {
    /* its own column, in the header and in the row, carrying the explainer the picker carries */
    const col = /<th>Campaign' \+ reg\('which campaign', 'how'\) \+ '<\/th>/.test(pkSrc) &&
      /'<td>' \+ campaignCell\(r\) \+ '<\/td>'/.test(pkSrc) && /function campaignCell\(r\) \{/.test(pkSrc);
    /* the campaign itself is still the link, and still "all its pay-per-click campaigns" where the
       row names none: the cell was moved, not rewritten */
    const named = /var h = campChosen\(r\);/.test(pkSrc) && /all its pay-per-click campaigns/.test(pkSrc);
    /* the count beside it is the ENGINE's own, which is the count its fill rule decided on, and the
       page falls back to the row's own list only where the answer carries no count */
    const count = /campaigns_n: fillC\.campaigns_n,/.test(src) && /const fillC = adPeakCampaignFill\(sw\);/.test(src) &&
      /var n = num\(r && r\.campaigns_n\);/.test(pkSrc) && /pay-per-click ' \+ plural\(n, 'campaign', 'campaigns'\) \+ ' just now/.test(pkSrc) &&
      /this answer does not say how many campaigns it is in/.test(pkSrc);
    /* a listing in more than one with none named is marked plainly, and they are named */
    const plural2 = /if \(!cid && n != null && n > 1\)/.test(pkSrc) &&
      /Its hours switch every one of them<\/b>/.test(pkSrc) && /function campsNamed\(r\)/.test(pkSrc);
    /* ONE picker still, in one container, now put on three forms by one function */
    const picker = (pkSrc.match(/<div id="pktCampWrap">/g) || []).length === 1 &&
      /function campWrapHtml\(\) \{ return '<div id="pktCampWrap">' \+ campaignInner\(formItem\(\)\) \+ '<\/div>'; \}/.test(pkSrc) &&
      (pkSrc.match(/campWrapHtml\(\)/g) || []).length === 3;
    /* the control opens the row's own form and saves through the action the add form saves through,
       with the row's hours, note and switch travelling back untouched: a save about the campaign
       must not wipe the hours, and must not arm a listing somebody left to a person */
    const control = /data-pkcampedit="/.test(pkSrc) && /function campaignForm\(id, row\)/.test(pkSrc) &&
      /auto: autoForSave\(row\), campaign_id: want \}/.test(pkSrc) &&
      /function autoForSave\(row\) \{\n    return !\(row && row\.auto != null && !Number\(row\.auto\)\);/.test(pkSrc) &&
      /Clearing the campaign puts its hours back across every pay-per-click campaign it is in\./.test(pkSrc);
    /* it opens UNDER the row, so the row keeps its History link and the By period block stays where
       it is, and only one of the two forms is ever open */
    const where = /PK\.campEdit === id \? '<tr class="pkt-sub2"><td colspan="11">' \+ campaignForm\(id, r\)/.test(pkSrc) &&
      /PK\.edit = null; PK\.campEdit = id;/.test(pkSrc) && /PK\.edit = id; PK\.campEdit = null;/.test(pkSrc);
    return col && named && count && plural2 && picker && control && where;
  })(), null);
  t('peak page: the one line at the top of the list is the answer’s own three counts, which are exclusive and add up to the list, and an answer carrying none of them prints nothing', (() => {
    /* the engine splits on NAMING first, so the three can never overlap or leave a row out */
    const eng = /campaign_named: manual\.filter\(m => m\.campaign_id\)\.length,/.test(src) &&
      /campaign_all: manual\.filter\(m => !m\.campaign_id && m\.campaigns_n > 0\)\.length,/.test(src) &&
      /campaign_none: manual\.filter\(m => !m\.campaign_id && m\.campaigns_n === 0\)\.length \},/.test(src);
    /* the page reads them and adds up nothing else: the total is the three of them */
    const page = /campaign_named: num\(C\.campaign_named\),/.test(pkSrc) &&
      /var tot = C\.campaign_named \+ C\.campaign_all \+ C\.campaign_none;/.test(pkSrc) &&
      /name the campaign their hours switch/.test(pkSrc) &&
      /switch every pay-per-click campaign they are in/.test(pkSrc) &&
      /have no pay-per-click campaign to switch/.test(pkSrc);
    /* NULL IS NEVER NOUGHT: an older answer carrying no counts prints no sentence at all */
    const nul = /if \(C\.campaign_named == null \|\| C\.campaign_all == null \|\| C\.campaign_none == null\) return '';/.test(pkSrc);
    /* and it is at the top of the list, above the two notes that were already there */
    const top = /campaignLine\(counts\(\)\) \+ periodsNote\(\) \+ campaignsNowNote\(\);/.test(pkSrc);
    return eng && page && nul && top;
  })(), null);

  /* ══ THE SCHEMA GUARDS ARE PAID ONCE, NOT ONCE PER ISOLATE (2 Nov) ═════════════════════════════
     Measured live through adsListingProbe: a cold isolate spent 5,627 ms of a 5,870 ms answer
     inside the ensure families and a second cold isolate 10,303 ms, while a warm isolate answered
     the same listing in 147 to 373 ms. These tests hold the three halves of the fix and, above all,
     the safety: one version marker read once, batches for the statements that still have to run,
     and nothing skipped on a database that has not had a statement applied. ══ */
  const scSrc = src.slice(src.indexOf('/* ---- ONE MARKER FOR THE WHOLE OF THIS VERSION'), src.indexOf('let BATCH_SCHEMA_OK = false;'));
  /* EVERY DDL STATEMENT IN THE ENGINE, AS ITS OWN TEXT. Each CREATE TABLE / CREATE INDEX / ALTER
     TABLE keyword opens a string literal, so the statement is read from that literal's own quote,
     through every literal glued to it by a bare +, to the closing quote. A statement finished off
     with a name rather than a literal (ALTER TABLE ' + table) is taken from the start of its line
     instead, so the names it is built out of are inside the fingerprint as well. A keyword with
     anything but its own opening quote in front of it is prose in a comment, not a statement. */
  const ddlFingerprint = (s) => {
    const KW = /CREATE TABLE IF NOT EXISTS|CREATE UNIQUE INDEX IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|ALTER TABLE/g;
    const closeFrom = (i, q) => { let j = i; while (j < s.length) { const c = s.charAt(j); if (c === '\\') j++; else if (c === q) return j; j++; } return -1; };
    const list = []; let m, guard = -1;
    while ((m = KW.exec(s)) !== null) {
      if (m.index < guard) continue;                          /* a later fragment of one already taken */
      const q = s.charAt(m.index - 1);
      if (q !== '"' && q !== "'") continue;                   /* prose in a comment, not a statement */
      let end = closeFrom(m.index, q);
      if (end < 0) continue;
      end++;
      for (;;) {
        const g = /^(\s*\+\s*)(["'])/.exec(s.slice(end, end + 40));
        if (!g) break;
        const e2 = closeFrom(end + g[1].length + 1, g[2]);
        if (e2 < 0) break;
        end = e2 + 1;
      }
      const from = /^\s*\+\s*[A-Za-z_$]/.test(s.slice(end, end + 8)) ? s.lastIndexOf('\n', m.index) + 1 : m.index - 1;
      list.push(s.slice(from, end).replace(/\s+/g, ' ').trim());
      guard = end;
    }
    let h = 2166136261; const txt = list.join('\n');
    for (let j = 0; j < txt.length; j++) { h ^= txt.charCodeAt(j); h = Math.imul(h, 16777619) >>> 0; }
    return { n: list.length, hash: list.length + '-' + ('0000000' + h.toString(16)).slice(-8) };
  };
  const fp = ddlFingerprint(src);
  const fpStored = (src.match(/const ADTOOL_SCHEMA_DDL_HASH = '([^']+)';/) || [])[1] || '';
  const fpVersion = (src.match(/const ADTOOL_SCHEMA_VERSION = '([^']+)';/) || [])[1] || '';
  t('schema marker: the fingerprint of every DDL statement in the engine still matches the hash stored beside the version — if this fails you have added or changed a CREATE TABLE, CREATE INDEX or ALTER TABLE, so BUMP ADTOOL_SCHEMA_VERSION and set ADTOOL_SCHEMA_DDL_HASH to the fingerprint printed here, or every database already marked will never be given your statement',
    fp.n > 150 && fpVersion.length > 0 && fp.hash === fpStored, { found: fp.hash, stored: fpStored, version: fpVersion });
  t('schema marker: every family that owns an isolate flag asks the marker first, and the one pass that writes the marker runs every one of those families', (() => {
    /* the gate, in this exact shape, in every family that has an isolate flag: the flag first (a
       warm isolate costs nothing at all), then the marker, then the flag is set and it returns */
    const flags = (src.match(/^let ([A-Z0-9_]+_OK) = false;$/gm) || []).map(l => l.replace(/^let | = false;$/g, ''));
    const gated = flags.filter(f => src.indexOf('  if (' + f + ') return;\n  if (await adtSchemaMarked(env)) { ' + f + ' = true; return; }') >= 0);
    /* 28 families: every flag in the file is gated, and none is gated any other way */
    const all = gated.length === flags.length && flags.length === 28 &&
      (src.match(/if \(await adtSchemaMarked\(env\)\) \{/g) || []).length === 28;
    /* and the pass runs the lot. The list is read out of the source and held against the gated
       functions: a family gated on the marker and left out of the list would be a family the pass
       never applied, and the marker would be written over its statements. */
    const fam = src.slice(src.indexOf('function adtSchemaFamilies() {'), src.indexOf('async function adtSchemaSettleRun(env) {'));
    const listed = (fam.match(/, (ensure[A-Za-z0-9]+)\]/g) || []).map(x => x.replace(/, |\]/g, ''));
    /* read out of the source rather than typed: every ensure function whose body asks the marker.
       Two of them ask it after their own long comment, so the gate is looked for in the body and
       not on the second line. */
    const owners = []; const reFn = /async function (ensure[A-Za-z0-9]+)\(env\) \{/g; let gm;
    while ((gm = reFn.exec(src)) !== null) {
      if (src.slice(gm.index, src.indexOf('\n}', gm.index)).indexOf('if (await adtSchemaMarked(env)) {') >= 0) owners.push(gm[1]);
    }
    const same = owners.length === 28 && listed.length === 28 &&
      owners.slice().sort().join(',') === listed.slice().sort().join(',');
    /* phase 1B owns no flag and is not listed, because phase 1 awaits it, which is the only way it
       has ever run: that is the one family the list is allowed to leave out */
    const oneB = /async function ensureAdtoolPhase1bSchema\(env\) \{/.test(src) &&
      src.indexOf('await ensureAdtoolPhase1bSchema(env);\n  ADTOOL_P1_SCHEMA_OK = true;') >= 0 &&
      fam.indexOf('ensureAdtoolPhase1bSchema') < 0;
    /* the families run one at a time and in order, never two lots of DDL at once */
    const ordered = /for \(const f of adtSchemaFamilies\(\)\) \{\n      try \{ await f\[1\]\(env\); \} catch \(e\) \{ adtSchemaRefused\(f\[0\], String\(\(e && e\.message\) \|\| e\)\); \}/.test(src);
    return all && same && oneB && ordered;
  })(), null);
  t('schema marker: a database that has not had a statement applied still gets it — no marker, an unreadable marker, another version and a refused statement all run everything', (() => {
    /* ONE READ OF ONE CONFIG ROW, kept for the isolate, and a read that throws reads as behind:
       portal_config itself is born in ensureTruthSchema, so the table not existing yet must be the
       safe answer rather than an exception */
    const read = /ADTOOL_SCHEMA_MARK = env\.DB\.prepare\('SELECT value FROM portal_config WHERE key = \?1'\)\.bind\(ADTOOL_SCHEMA_KEY\)\.first\(\)/.test(scSrc) &&
      /\.then\(r => String\(\(r && r\.value\) \|\| ''\)\)\.catch\(\(\) => ''\);/.test(scSrc) &&
      /if \(!ADTOOL_SCHEMA_MARK\) \{/.test(scSrc);
    /* the gate skips only on an exact match, so a blank row and any other version both run */
    const exact = /if \(\(await adtSchemaMarkRead\(env\)\) === ADTOOL_SCHEMA_VERSION\) return true;/.test(scSrc) &&
      scSrc.indexOf('indexOf(ADTOOL_SCHEMA_VERSION)') < 0 && !/>=\s*ADTOOL_SCHEMA_VERSION/.test(scSrc);
    /* while the pass is inside the families every one of them runs, marker or no marker */
    const inside = /if \(ADTOOL_SCHEMA_INSIDE\) return false;/.test(scSrc) &&
      /ADTOOL_SCHEMA_INSIDE = true;/.test(scSrc) && /\} finally \{ ADTOOL_SCHEMA_INSIDE = false; \}/.test(scSrc);
    /* THE MARKER IS WRITTEN ONLY WHEN NOTHING WAS REFUSED, and the gate asks the row again after
       the pass rather than assuming it landed: a family left out of the list, or a pass that could
       not finish, therefore leaves every family running its own guards as it does today */
    const onlyClean = /if \(ADTOOL_SCHEMA_REFUSED\.length\) return \{ version: '', refused: ADTOOL_SCHEMA_REFUSED\.slice\(0, 40\) \};/.test(scSrc) &&
      scSrc.indexOf('ADTOOL_SCHEMA_REFUSED.length) return') < scSrc.indexOf('INSERT INTO portal_config (key, value, updated_at) VALUES (?1, ?2') &&
      /return \(await adtSchemaMarkRead\(env\)\) === ADTOOL_SCHEMA_VERSION;/.test(scSrc) &&
      /try \{ await adtSchemaSettle\(env\); \} catch \(e\) \{ return false; \}/.test(scSrc);
    /* the write names the version and is the only write of that row in the engine */
    const write = (src.match(/\.bind\(ADTOOL_SCHEMA_KEY, ADTOOL_SCHEMA_VERSION\)\.run\(\)/g) || []).length === 1 &&
      /ADTOOL_SCHEMA_MARK = Promise\.resolve\(ADTOOL_SCHEMA_VERSION\);/.test(scSrc) &&
      scSrc.indexOf('ADTOOL_SCHEMA_MARK = Promise.resolve') > scSrc.indexOf('.bind(ADTOOL_SCHEMA_KEY, ADTOOL_SCHEMA_VERSION).run()');
    /* the pass happens once per isolate, and a failure to write is itself a refusal */
    const once = /function adtSchemaSettle\(env\) \{ return ADTOOL_SCHEMA_SETTLE \|\| \(ADTOOL_SCHEMA_SETTLE = adtSchemaSettleRun\(env\)\); \}/.test(scSrc) &&
      /adtSchemaRefused\('marker', String\(\(e && e\.message\) \|\| e\)\);/.test(scSrc);
    return read && exact && inside && onlyClean && write && once;
  })(), null);
  t('schema marker: "already there" is the only answer a guarded statement is forgiven for, and a refused batch is run again one statement at a time so the rest still land', (() => {
    /* duplicate column name is what a guarded ALTER says on every live database and is not a
       failure; anything else is written down, and that is what keeps the marker unwritten */
    const forgive = /if \(\/duplicate column name\|already exists\/i\.test\(why\)\) return true;/.test(scSrc) &&
      /adtSchemaRefused\(sql, why\);\n    return false;/.test(scSrc);
    const fallback = /for \(const s of sqls\) \{ if \(!\(await adtDdlOne\(env, s\)\)\) ok = false; \}/.test(scSrc) &&
      scSrc.indexOf('try { await adtBatch(env, sqls.map(s => env.DB.prepare(s))); return true; }') < scSrc.indexOf('for (const s of sqls) {');
    /* a seed that did not land is a statement of this version that was not accepted, so it is
       written down too, and it is still never fatal to the page that happened to run it */
    const seed = /async function adtSeedRun\(env, stmts, what\) \{/.test(scSrc) &&
      /catch \(e\) \{ adtSchemaRefused\(what, String\(\(e && e\.message\) \|\| e\)\); return false; \}/.test(scSrc) &&
      (src.match(/await adtSeedRun\(env, /g) || []).length >= 12;
    /* the two config seeds only claim their isolate flag when the seed actually landed */
    const cfg = /if \(await adtSeedRun\(env, \[one\(K\.amber_min, D\.amber_min\), one\(K\.red_min, D\.red_min\)\], 'freshness config'\)\) ADTOOL_FRESH_CFG_OK = true;/.test(src) &&
      /if \(await adtSeedRun\(env, stmts, 'peak plan config'\)\) ADTOOL_PEAK_CFG_OK = true;/.test(src);
    /* and the ledger cannot grow without bound on a database refusing everything */
    const capped = /if \(ADTOOL_SCHEMA_REFUSED\.length < 40\) ADTOOL_SCHEMA_REFUSED\.push\(/.test(scSrc);
    return forgive && fallback && seed && cfg && capped;
  })(), null);
  t('schema guards: what still has to run goes in batches, the guarded ALTERs stay one at a time, and the written order is kept so a table lands before its index', (() => {
    /* a run of CREATEs is flushed before the next ALTER, which is what keeps the order */
    const run = /async function adtDdlRun\(env, ddl\) \{/.test(scSrc) &&
      /if \(\/\^\\s\*ALTER\\s\/i\.test\(q\)\) \{ await flush\(\); if \(!\(await adtDdlOne\(env, q\)\)\) ok = false; \}\n    else pend\.push\(q\);/.test(scSrc) &&
      /const flush = async \(\) => \{ if \(!pend\.length\) return; const b = pend; pend = \[\]; if \(!\(await adtDdlBatch\(env, b\)\)\) ok = false; \};/.test(scSrc) &&
      /try \{ await adtBatch\(env, sqls\.map\(s => env\.DB\.prepare\(s\)\)\); return true; \}/.test(scSrc);
    /* NOT ONE FAMILY STILL AWAITS ITS DDL ONE STATEMENT AT A TIME. The six families that already
       batched now go through the same runner, and the five that looped do too. */
    const noLoops = !/for \(const [qds] of ddl\) \{ try \{ await env\.DB\.prepare/.test(src) &&
      !/\]\) \{ try \{ await env\.DB\.prepare\([qds]\)\.run\(\); \} catch/.test(src) &&
      (src.match(/await adtDdlRun\(env, /g) || []).length === 20 &&
      src.indexOf('await adtBatch(env, ddl.map(s => env.DB.prepare(s)))') < 0;
    /* every guarded ALTER left in the families goes through adtDdlOne, and the only raw guarded
       ALTER left in the engine is the rollup's own repair of sales_daily, which is no family's */
    const alters = (src.match(/await adtDdlOne\(env, /g) || []).length === 22 &&
      (src.match(/env\.DB\.prepare\('ALTER |env\.DB\.prepare\("ALTER /g) || []).length === 1 &&
      /catch \(e\) \{ try \{ await env\.DB\.prepare\('ALTER TABLE sales_daily ADD COLUMN pri_est INTEGER DEFAULT 0'\)/.test(src);
    /* the truth family keeps the KV tag it already had: an edge-cached read is cheaper still, and it
       answers on a database whose portal_config cannot be read at all */
    const kv = /try \{ if \(\(await env\.HOT\.get\('schema:tag'\)\) === tag\) \{ TRUTH_SCHEMA_OK = true; return; \} \} catch \(e\) \{\}/.test(src);
    return run && noLoops && alters && kv;
  })(), null);
  t('product history probe: the guards’ own figure says whether the marker answered for them or this answer paid for them', (() => {
    /* schema_ms was already clocked; beside it now sit the three figures that explain it */
    const named = /T\.schema_skipped = adtSchemaSkipped\(\);/.test(plSrc) &&
      /T\.schema_version = ADTOOL_SCHEMA_VERSION;/.test(plSrc) &&
      /T\.schema_refused = ADTOOL_SCHEMA_REFUSED\.length;/.test(plSrc) &&
      plSrc.indexOf("clock('schema_ms'") < plSrc.indexOf('T.schema_skipped');
    /* and it is honest: skipped means no DDL ran on this isolate at all, which is exactly "the
       settle pass was never needed", not "the marker said so afterwards" */
    const honest = /function adtSchemaSkipped\(\) \{ return ADTOOL_SCHEMA_SETTLE === null; \}/.test(scSrc);
    /* the probe returns the timings whole, so all three arrive by key with no second route */
    const pr = src.slice(src.indexOf('  adsListingProbe: {'), src.indexOf("  /* §3 of the 31 Oct brief, read-only and by key"));
    const byKey = /timings: d\.timings,/.test(pr) && pr.indexOf('schema_skipped') > 0 && pr.indexOf('schema_refused') > 0;
    /* the three sit in the timings and nowhere near the figures: still no money on this route */
    const clean = !/spend|profit|revenue|actual|margin/.test(pr.slice(pr.indexOf('return {')));
    return named && honest && byKey && clean;
  })(), null);

  /* ══ THE DATABASE WAS READING BILLIONS OF ROWS A DAY (5 Nov) ═════════════════════════════════
     Cloudflare's own D1 figures: 1.5 to 3.9 BILLION rows read a day against 2.2 million written,
     the roll-up killed with "D1 DB is overloaded", and reads are billed. The cause was four reads
     with no index to stand on and two that asked for the same rows twice.
     EVERY TEST IN THIS BLOCK IS A REGEX ON THE SQL SHAPE, and that is deliberate and stated here
     once: the harness has no database, so an EXPLAIN plan cannot be asserted. What CAN be held is
     the shape the plan was measured against — the index exists in a guarded family, the version
     and the hash moved with it, and the query still names the columns that index leads with. A
     plan is only as good as the query that earns it, so the queries are pinned too. The plans
     themselves were measured on a local SQLite built from this file's own 199 DDL statements at
     the live row counts (adsAuditProbe check=counts, 5 Nov). ══ */
  t('billions of rows: the four indexes the reads were measured without are all in a guarded DDL family, named after the query each is for (regex on the DDL text — the harness has no database to EXPLAIN against)', (() => {
    /* each one inside a family the settle pass runs, so a marked database is given it */
    const truth = src.slice(src.indexOf('async function ensureTruthSchema(env) {'), src.indexOf("let tag = 'schema:'"));
    const p2 = src.slice(src.indexOf('async function ensureAdtoolPhase2Schema(env) {'), src.indexOf('const ADTOOL_REGISTER_P2 = ['));
    const want = [
      /* ladderSales, called once per row by ladderWatch and three times per row by the two ladder
         desks: 300 whole-table walks of `orders` for one page of 100 listings */
      ["CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_id, created_at)", truth],
      /* the fifty-six reads that bound themselves by created_at with no account, five of them on
         every five-minute tick */
      ["CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)", truth],
      /* Potential CPC's last-click-fee read: ads_daily is keyed (account, item_id, date), so a bare
         date window had nothing to stand on */
      ["CREATE INDEX IF NOT EXISTS idx_ads_daily_date ON ads_daily(date)", truth],
      /* the stop-start archive read by time alone, on Stopped yesterday and in the daily report */
      ["CREATE INDEX IF NOT EXISTS idx_adtcae_seen ON adtool_campaign_ad_events(seen_at)", p2],
    ];
    const placed = want.every(w => w[1].indexOf(w[0]) >= 0);
    /* and each is named after the query it is for, in a comment beside it */
    const named = /ladderSales \(the listing ladder's sales windows\)/.test(src) &&
      /idx_orders_created — the fifty-six reads/.test(src) &&
      /idx_ads_daily_date — THE ROLL-UP'S OWN per-day ads read/.test(src) &&
      /the stop-start archive is read BY TIME ALONE in two places/.test(src);
    return placed && named;
  })(), null);
  t('billions of rows: the schema version and the DDL hash both moved with those four CREATE INDEX statements, or a database already marked would never be given them', (() => {
    /* the hash test above proves the fingerprint matches the file; this one proves the file is not
       still carrying the version the 2 Nov marker was written under, which is the one way four new
       indexes could be in the source and on no live database at all */
    const v = (src.match(/const ADTOOL_SCHEMA_VERSION = '([^']+)';/) || [])[1] || '';
    const h = (src.match(/const ADTOOL_SCHEMA_DDL_HASH = '([^']+)';/) || [])[1] || '';
    const moved = v !== '2026-11-02.1' && h !== '195-b1518cd2';
    /* the count in the hash is the DDL statement count, and it is never again below the 199 these
       four brought it to (6 Nov took it to 208; the placement test above is what holds these four
       in the file, so this one only has to refuse a count that has gone BACKWARDS) */
    const grew = Number(String(h).split('-')[0] || 0) >= 199;
    return moved && grew && /^\d{4}-\d{2}-\d{2}\.\d+$/.test(v);
  })(), null);
  t('billions of rows: the queries those indexes were measured against still lead with the indexed column (regex on the SQL shape, not an EXPLAIN)', (() => {
    /* ladderSales: item_id equality is the only leg an index can take, because created_at is
       wrapped in substr(replace(...)) and no index can answer a function of a column */
    const ladder = /SELECT COALESCE\(SUM\(qty\), 0\) AS n FROM orders WHERE item_id = \?1 AND status NOT IN \('CANCELLED','NOT_FOUND'\) /.test(src) &&
      (src.match(/await ladderSales\(/g) || []).length >= 8;
    /* the five-minute tick's two order reads and the two hour charts, all bounded by created_at */
    const created = /FROM orders WHERE created_at >= \?1"\)\.bind\(start\)/.test(src) &&
      /SELECT created_at, qty FROM orders WHERE created_at >= \?1 AND status <> 'CANCELLED'"/.test(src) &&
      /SELECT created_at, item_id, qty FROM orders WHERE created_at >= \?1 AND status <> 'CANCELLED'"/.test(src);
    /* ads_daily by date, and the archive by seen_at */
    const ads = /FROM ads_daily ad JOIN items_api ia ON ia\.item_id = ad\.item_id WHERE ad\.cpc_spend > 0 AND ad\.date >= \?1/.test(src);
    const seen = (src.match(/FROM adtool_campaign_ad_events WHERE seen_at >= \?1 AND seen_at < \?2/g) || []).length === 2;
    return ladder && created && ads && seen;
  })(), null);
  t('billions of rows: the month sum asks for a day RANGE and never substr(day, 1, 7), which no index can answer', (() => {
    /* substr(day, 1, 7) = ?1 walked all 71,145 rows of adtool_listing_day for a month holding a
       few thousand, every hour the week-and-month step ran. A day is 'YYYY-MM-DD' throughout this
       table, so the range is the same set of rows and the planner can take it off idx_adtld_day. */
    const ranged = /FROM adtool_listing_day WHERE day >= \?1 AND day <= \?2 AND day < \?3 GROUP BY account, item_id"\)\.bind\(m \+ '-01', m \+ '-31', todayUk\)/.test(src);
    /* and the substr form is gone from the engine entirely, not merely from this one read */
    const gone = src.indexOf('substr(day, 1, 7) = ?1') < 0;
    /* the week sum was already a range and stays one, bound by its own first and last day */
    const week = /FROM adtool_listing_day WHERE day >= \?1 AND day <= \?2 AND day < \?3 GROUP BY account, item_id"\)\.bind\(days\[0\], days\[days\.length - 1\], todayUk\)/.test(src);
    /* the month written is still the month, so nothing a page reads moves */
    const sameKey = /INSERT INTO adtool_listing_month \(account, item_id, month, days, orders/.test(src) &&
      /\.bind\(x\.account, x\.item_id, m, x\.days,/.test(src);
    return ranged && gone && week && sameKey;
  })(), null);
  t('billions of rows: the peak panel reads each hour window ONCE — the day counts ride with the hour sums instead of a second pass over the same rows', (() => {
    const pk = src.slice(src.indexOf('async function adPeakOverviewExtras(env, opts) {'), src.indexOf('const perListing = [];'));
    /* one statement a window, and the two that read the same rows twice are gone */
    const two = (pk.match(/env2\.DB\.prepare\(hourSel\(/g) || []).length === 2 &&
      pk.indexOf('daySelNow') < 0 && pk.indexOf('const daySel =') < 0 &&
      /let H = \[\[\], \[\]\];/.test(pk) && /\} catch \(e\) \{ H = \[\[\], \[\]\]; \}/.test(pk);
    /* THE ARITHMETIC IS THE SAME ARITHMETIC: every column is still ROUND(SUM(...), 2) over exactly
       one (listing, hour) of exactly the same rows, so an hour reads to the penny it read before */
    const shape = /ROUND\(SUM\(CASE WHEN hour = ' \+ h \+ ' THEN ' \+ hourSpend \+ ' ELSE 0 END\), 2\) AS h' \+ h/.test(pk) &&
      /ROUND\(SUM\(CASE WHEN hour = ' \+ h \+ ' AND day = \?' \+ tp \+ ' THEN ' \+ hourSpend \+ ' ELSE 0 END\), 2\) AS t' \+ h/.test(pk) &&
      /const hourSpend = 'COALESCE\(spend_r, spend_s\)';/.test(pk);
    /* the day counts travel on the same row, today's own kept apart so a listing with no reading
       yet today still prints nothing rather than nought */
    const days = /COUNT\(DISTINCT day\) AS days/.test(pk) &&
      /COUNT\(DISTINCT CASE WHEN day = \?' \+ tp \+ ' THEN day END\) AS days_today/.test(pk) &&
      /daysNow\[id\] = Number\(r\.days\) \|\| 0; daysToday\[id\] = Number\(r\.days_today\) \|\| 0;/.test(pk) &&
      /daysBefore\[id\] = Number\(r\.days\) \|\| 0;/.test(pk);
    /* the window that has no today in it asks for neither the today columns nor a placeholder for
       them: a statement handed a parameter it never names is a statement that fails */
    const noTp = /env2\.DB\.prepare\(hourSel\(0\) \+ befJoin \+ guard \+ ' GROUP BY item_id'\)\.bind\(ADTOOL_CARRY_FIX_DAY\)/.test(pk) &&
      /\(tp \? ', COUNT\(DISTINCT CASE WHEN day = \?' \+ tp \+ ' THEN day END\) AS days_today' : ''\)/.test(pk);
    /* both windows group at the listing's own grain now, so neither carries an hour column */
    const grain = (pk.match(/GROUP BY item_id'\)\.bind\(ADTOOL_CARRY_FIX_DAY/g) || []).length === 2 &&
      pk.indexOf('GROUP BY item_id, hour') < 0;
    /* the cohort join and the guard are untouched: the same rows, read once */
    const same = /const guard = ' WHERE samples > 0 AND NOT \(day < \?1 AND hour = 8\)';/.test(pk) &&
      /const nowJoin = adPeakCohortJoin\(CO\.sql, 'item_id', 'day'\);/.test(pk) &&
      /const befJoin = adPeakCohortBeforeJoin\(CO\.sql, 'item_id', 'day', 28\);/.test(pk);
    return two && shape && days && noTp && grain && same;
  })(), null);
  t('billions of rows: the roll-up’s forced-after-two-skips way out is still there, so no step can be budgeted out for ever', (() => {
    /* the one thing this work must not break: a step whose estimate can never fit is what froze
       the roll-up on 2 November, and the force is the only thing that gets it a turn */
    const force = /function adtRollupForced\(skips, name, after\) \{/.test(src) &&
      /const n = Math\.max\(1, Math\.round\(Number\(after\) \|\| ADTOOL_ROLLUP_FORCE_AFTER\)\);/.test(src) &&
      F.adtRollupForced({ periods: 2 }, 'periods', 2) === true;
    /* and it is still wired into the run, not merely declared */
    const used = (src.match(/adtRollupForced\(/g) || []).length >= 2;
    return force && used;
  })(), null);

  /* ══ THE NIGHT-TIME BASELINE: 40 MILLION ROWS AN HOUR WITH NOBODY SIGNED IN (6 Nov) ══════════
     Yesterday's indexes took the day from 3.9 billion rows read to a pace of 1.2 billion and what
     was left was FLAT — 40.2 million rows an hour between midnight and 04:00 UTC, which is the
     cron slots alone and is also the bill. Read out of Cloudflare's own per-query figures for the
     database (d1QueriesAdaptiveGroups, 6 Nov) rather than guessed at, and it was six query shapes
     on five tables that carried no index at all plus one guard asked on the wrong side of a read.
     EVERY TEST IN THIS BLOCK IS A REGEX ON THE SQL SHAPE OR THE CODE'S OWN ORDER, and that is
     deliberate and stated once: THE HARNESS HAS NO DATABASE, so no EXPLAIN plan can be asserted
     here. The plans were measured on a local SQLite built from this file's own DDL at the live row
     counts (adsAuditProbe check=counts, 6 Nov) with the planner's own statistics thrown away, so
     the model answers the way a database that has never been ANALYZEd does — which is how the
     figures above were earned. What can be held is the shape those plans were measured against. ══ */
  t('night baseline: the nine indexes the night\'s reads were measured without are each in a guarded DDL family, named after the query it serves (regex on the DDL text — the harness has no database to EXPLAIN against)', (() => {
    const truth = src.slice(src.indexOf('async function ensureTruthSchema(env) {'), src.indexOf("let tag = 'schema:'"));
    const intra = src.slice(src.indexOf('async function ensureAdtoolSchema(env) {'), src.indexOf('async function adtoolIntradayOn(env) {'));
    const want = [
      /* alertAckWatch's own NOT EXISTS, and every `WHERE ref = ?` probe in the file: 20.2 million
         rows an hour, half the night's whole bill */
      ['"CREATE INDEX IF NOT EXISTS idx_alert_log_ref ON alert_log(ref)"', truth],
      /* the open-letter slice: the candidate read's outer, and the two nightly tidy-ups */
      ['"CREATE INDEX IF NOT EXISTS idx_alert_log_open ON alert_log(resolved_at, created_at)"', truth],
      /* cpcAudit's once-a-day-per-listing guard: 6.7 million rows an hour */
      ['"CREATE INDEX IF NOT EXISTS idx_campev_item_rule ON campaign_events(item_id, change_type, at)"', truth],
      /* the alert fixture's per-listing fee check and Potential CPC's last-CPC-day read */
      ['"CREATE INDEX IF NOT EXISTS idx_ads_daily_item ON ads_daily(item_id, date)"', truth],
      /* the feedback book, read one account at a time every hour */
      ['"CREATE INDEX IF NOT EXISTS idx_feedback_account_at ON feedback(account, at)"', truth],
      /* the three shapes ad_report_tasks is read in: the five-minute poll, the roll-up's report
         status, and the two-hour zombie sweep */
      ['"CREATE INDEX IF NOT EXISTS idx_art_account_status ON ad_report_tasks(account, status, created_at)"', truth],
      ['"CREATE INDEX IF NOT EXISTS idx_art_day_status ON ad_report_tasks(report_date, status)"', truth],
      ['"CREATE INDEX IF NOT EXISTS idx_art_status_created ON ad_report_tasks(status, created_at)"', truth],
      /* MAX(sampled_at) over the tick ledger, asked by six readers */
      ["'CREATE INDEX IF NOT EXISTS idx_adt_ticks_sampled ON adtool_intraday_ticks(sampled_at)'", intra],
    ];
    const placed = want.every(w => w[1].indexOf(w[0]) >= 0);
    /* and each is named after the query it is for, in a comment beside it */
    const named = /idx_alert_log_ref — THE BIGGEST SINGLE READ IN THE SYSTEM/.test(src) &&
      /idx_alert_log_open — the other half of the same read/.test(src) &&
      /idx_campev_item_rule — cpcAudit's once-a-day-per-listing guard/.test(src) &&
      /idx_ads_daily_item — 1\.8 million rows an hour/.test(src) &&
      /idx_feedback_account_at — 1\.9 million rows an hour/.test(src) &&
      /idx_art_account_status, idx_art_day_status, idx_art_status_created — ad_report_tasks has/.test(src) &&
      /THE WHOLE TICK LEDGER FOR ONE ROW/.test(src);
    return placed && named;
  })(), null);
  t('night baseline: the schema version and the DDL hash both moved with those nine CREATE INDEX statements, or a database already marked would never be given them', (() => {
    const v = (src.match(/const ADTOOL_SCHEMA_VERSION = '([^']+)';/) || [])[1] || '';
    const h = (src.match(/const ADTOOL_SCHEMA_DDL_HASH = '([^']+)';/) || [])[1] || '';
    /* not the version or the hash the 5 November markers were written under */
    const moved = v !== '2026-11-05.1' && h !== '199-4f19ee92' && /^\d{4}-\d{2}-\d{2}\.\d+$/.test(v);
    /* 199 statements plus exactly these nine. The hash itself is pinned by the fingerprint test
       further up this file, which recomputes it from the source. */
    /* 10 Nov: the sale truth rule added three guarded ALTERs, so the count moved on from 208.
       It must never go BACKWARDS, which is what this holds; the fingerprint test above is what
       pins the hash itself to the file. */
    const grew = Number(String(h).split('-')[0] || 0) >= 208;
    return moved && grew;
  })(), null);
  t('night baseline: alertAckWatch asks its once-a-day gate BEFORE the candidate read, so the 23 runs a day with nothing to do cost one row instead of 12.8 million', (() => {
    const fn = src.slice(src.indexOf('async function alertAckWatch(env) {'), src.indexOf('async function statusRefresh(env) {'));
    const gate = fn.indexOf("const dayRef = 'engine:acksla:day:' + ukDate('');");
    const read = fn.indexOf('SELECT id, to_addr, type, message, created_at FROM alert_log');
    const ret = fn.indexOf('if (already) return;');
    /* the gate, its return, and then the read — in that order, and the gate declared exactly once */
    const ordered = gate > 0 && read > gate && ret > gate && ret < read &&
      (fn.match(/const dayRef = /g) || []).length === 1 &&
      (fn.match(/if \(already\) return;/g) || []).length === 1;
    /* and nothing it writes has moved above the gate: the digest and every per-alert marker are
       still written after it, which is why the order can change without changing what happens */
    const writesAfter = fn.indexOf("await notifyRole(env, 'Management', 'Alert not acknowledged in time'") > ret &&
      fn.indexOf("INSERT INTO alert_log (to_addr, type, message, ref, created_at) ") > ret;
    return ordered && writesAfter;
  })(), null);
  t('night baseline: cpcAudit asks its day guard as a RANGE over `at` and never date(at) = date(\'now\'), which no index can answer', (() => {
    /* 530 asks an hour, each a whole walk of campaign_events while the day was a function of the
       column. `at` is written by every writer of this table as datetime('now'), so the range is
       the same UTC day and the same set of rows. */
    const ranged = /SELECT 1 AS x FROM campaign_events WHERE change_type = 'cpc_rule' AND item_id = \?1 AND at >= date\('now'\) AND at < date\('now', '\+1 day'\)/.test(src);
    /* and the date() form is gone from the engine entirely, not merely from this one read */
    const gone = src.indexOf("date(at) = date('now')") < 0;
    /* every writer of campaign_events.at still writes datetime('now'), which is what makes the
         range the same set of rows — if one of them ever writes something else, this fails */
    const writes = (src.match(/INSERT INTO campaign_events \([^)]*\) VALUES \([^)]*datetime\('now'\)\)/g) || []).length ===
      (src.match(/INSERT INTO campaign_events \(/g) || []).length;
    /* the guard still decides the same thing: a listing already reported today is skipped */
    const same = /\.bind\(String\(r\.item_id\)\)\.first\(\);\n    if \(seen\) continue;/.test(src);
    return ranged && gone && writes && same;
  })(), null);
  t('night baseline: the queries those nine indexes were measured against still lead with the columns each index leads with (regex on the SQL shape, not an EXPLAIN)', (() => {
    /* alert_log by ref: the correlated NOT EXISTS, the probes, and the file-unless-filed insert */
    const byRef = /NOT EXISTS \(SELECT 1 FROM alert_log a2 WHERE a2\.ref = 'engine:acksla:' \|\| alert_log\.id\)/.test(src) &&
      (src.match(/FROM alert_log WHERE ref = \?1 LIMIT 1/g) || []).length >= 4 &&
      (src.match(/FROM alert_log WHERE to_addr = \?1 AND ref = \?2/g) || []).length >= 3 &&
      /WHERE NOT EXISTS \(SELECT 1 FROM alert_log WHERE to_addr = \?1 AND ref = \?4\)/.test(src);
    /* alert_log open + aged: the candidate read and the two tidy-ups */
    const byOpen = /WHERE resolved_at = '' AND type != 'Alert not acknowledged in time' /.test(src) &&
      /WHERE resolved_at = '' AND type LIKE '%ast%' AND created_at < datetime\('now', '-1 day'\)/.test(src) &&
      /WHERE resolved_at = '' AND created_at < datetime\('now', '-14 days'\)/.test(src);
    /* ads_daily by item */
    const byItem = /FROM ads_daily WHERE item_id = \?1 AND spend > 0 AND cpc_spend > 0/.test(src) &&
      /FROM ads_daily ad JOIN items_api ia ON ia\.item_id = ad\.item_id WHERE ad\.cpc_spend > 0 AND ad\.date >= \?1/.test(src);
    /* feedback by account */
    const byAcct = /SELECT fb_key FROM feedback WHERE account = \?1/.test(src);
    /* ad_report_tasks: account+status, report_date+status, status+age */
    const byTask = /FROM ad_report_tasks WHERE account = \?1 AND status = 'PENDING' AND family LIKE '%_intra'/.test(src) &&
      /FROM ad_report_tasks WHERE report_date = \?1 AND status = 'INGESTED' AND family NOT LIKE '%_intra' GROUP BY account/.test(src) &&
      /FROM ad_report_tasks WHERE account = \?1 AND status IN \('PENDING', 'SUCCESS'\) AND family NOT LIKE '%_intra' ORDER BY created_at/.test(src) &&
      /UPDATE ad_report_tasks SET status = 'FAILED', error = 'intraday timeout' WHERE status = 'PENDING' AND family LIKE '%_intra' AND created_at < datetime\('now', '-2 hour'\)/.test(src);
    /* the tick ledger's MAX, in every place that asks it (the freshness badge, the five-minute
       today grain, the today-freshness verdict, the hourly A23 alert and the two probes) */
    const byTick = (src.match(/SELECT MAX\(sampled_at\) AS t FROM adtool_intraday_ticks/g) || []).length >= 4;
    return byRef && byOpen && byItem && byAcct && byTask && byTick;
  })(), null);
  t('night baseline: nothing in this pass touched the roll-up, the Sale event route or the warm — the night\'s bill was in the watchers, not the advertising tool', (() => {
    /* said out loud because the suspects were the other way about: the roll-up's own steps, the
       catch-up and the hourly page warm are between them under a tenth of what the alert ledger
       and the CPC guard were spending, so none of them was changed and the forced way out and the
       warm's horizon are exactly as they were. */
    const rollup = /await step\('today', 'today', true, '', async \(\) => \{/.test(src) &&
      /function adtRollupForced\(skips, name, after\) \{/.test(src) &&
      /function adtWarmUntil\(nowMs, minAheadMs\) \{/.test(src) &&
      /const jobs = \[\['adtoolCpcListings', \{ period: 'd30', mode: 'active' \}, true\]/.test(src);
    /* and the Sale event route, which a second pair of hands is editing, is untouched here */
    const sales = src.indexOf('adtoolSales:') >= 0;
    return rollup && sales;
  })(), null);

  /* ================= THE ROLL-UP'S STARVATION (owner, 5 Nov: "the whole system is stuck") =========
     yesterday was estimated at the cost of building a whole day from nothing and never fitted what an
     ordinary run had left, so it was left for the next hour every hour from 2 to 5 November, was never
     measured, and the guess that kept it out stood for ever. Every money figure in the portal froze
     with it. A step left this many runs in a row now runs whatever the estimate says. */
  t('roll-up: a step left two runs in a row runs on the third, whatever its estimate says', (() => {
    const none = F.adtRollupForced({}, 'yesterday', 2) === false;
    const once = F.adtRollupForced({ yesterday: 1 }, 'yesterday', 2) === false;
    const twice = F.adtRollupForced({ yesterday: 2 }, 'yesterday', 2) === true;
    const more = F.adtRollupForced({ yesterday: 9 }, 'yesterday', 2) === true;
    const other = F.adtRollupForced({ tail: 9 }, 'yesterday', 2) === false;
    const asText = F.adtRollupForced('{"yesterday":3}', 'yesterday', 2) === true;
    return none && once && twice && more && other && asText;
  })(), null);
  t('roll-up: the count clears the moment the step runs, and counts up only while it is left', (() => {
    const a = F.adtRollupSkipsAfter({}, 'yesterday', false);
    const b = F.adtRollupSkipsAfter(a, 'yesterday', false);
    const c = F.adtRollupSkipsAfter(b, 'yesterday', true);
    const d = F.adtRollupSkipsAfter({ yesterday: 2, tail: 1 }, 'tail', true);
    return a.yesterday === 1 && b.yesterday === 2 && c.yesterday === undefined && d.yesterday === 2 && d.tail === undefined;
  })(), null);
  t('roll-up: the forced run is measured, so the guess that starved it is replaced (regex over the real source)', (() => {
    const j = src.slice(src.indexOf('const step = async (name, words, due, dueNote, fn) => {'), src.indexOf('let cursor = await adtFlag(env, \'adtool_rollup_cursor\')'));
    return /const forced = !cutAt && !pl\.run\.length && adtRollupForced\(skips, name, ADTOOL_ROLLUP_FORCE_AFTER\);/.test(j) &&
      /if \(!forced && \(cutAt \|\| !pl\.run\.length\)\) \{/.test(j) &&
      /skips = adtRollupSkipsAfter\(skips, name, true\);/.test(j) && /skips = adtRollupSkipsAfter\(skips, name, false\);/.test(j) &&
      /took\[name\] = Date\.now\(\) - s0;/.test(j) &&
      /await commit\('adtool_rollup_step_skips'/.test(src);
  })(), null);

  /* ================= 5 NOV: THE ROLL-UP CANNOT FINISH ITS WORK ====================================
     The gate of 1 November stopped the slot being killed; it did not make the work happen. Over 150
     runs `yesterday` ran 6 times and was left 36, and the eleven steps behind it in the order were
     reached only by luck, because every one of them was asked whether it fitted in what today had
     already spent. The owner read £29.39 of profit for 2 November where the law gives £246.68,
     twenty-two finished days carried an eBay vintage the portal never took, and two thirds of the
     fleet had no pattern figures at all because the pass stopped at its first batch and the pages
     drew that part-day as the whole fleet. Five rules replace that, and each is a test. */

  /* ---- item 1: two slots, one list, one lease ------------------------------------------------- */
  t('roll-up slots: today and yesterday are the hourly slot’s, and every other step is the catch-up slot’s — the two lists together are the whole order, with nothing in both but the order roll both build their days from',
    (() => {
      const H = F.ADTOOL_ROLLUP_HOURLY_STEPS, C = F.ADTOOL_ROLLUP_CATCHUP_STEPS;
      const both = H.filter(n => C.indexOf(n) >= 0);
      const union = H.concat(C.filter(n => H.indexOf(n) < 0));
      const missing = F.ADTOOL_ROLLUP_ORDER.filter(n => union.indexOf(n) < 0);
      return H.join(',') === 'orders,today,yesterday' && both.join(',') === 'orders' && !missing.length &&
        C.indexOf('catchup') >= 0 && C.indexOf('ordersall') >= 0 && C.indexOf('warm') === C.length - 1 &&
        H.length === new Set(H).size && C.length === new Set(C).size;
    })(), [F.ADTOOL_ROLLUP_HOURLY_STEPS, F.ADTOOL_ROLLUP_CATCHUP_STEPS]);
  t('roll-up slots: EVERY step name in the real driver is on exactly one of the two lists — a step on neither could never run, and nothing but this would say so',
    (() => {
      const names = {};
      for (const m of (rbDrv.match(/step\('[a-z0-9]+'/g) || [])) names[m.slice(6, -1)] = 1;
      const keys = Object.keys(names);
      if (keys.length < 12) return false;
      return keys.every(n => {
        const h = F.ADTOOL_ROLLUP_HOURLY_STEPS.indexOf(n) >= 0, c = F.ADTOOL_ROLLUP_CATCHUP_STEPS.indexOf(n) >= 0;
        return (h || c) && F.ADTOOL_ROLLUP_STEP_MS[n] !== undefined;
      });
    })(), Object.keys((rbDrv.match(/step\('[a-z0-9]+'/g) || []).reduce((o, m) => { o[m.slice(6, -1)] = 1; return o; }, {})));
  t('roll-up slots: a step of the other slot is neither "left for the next hour" nor "not due" — the hourly row used to read cut because the page cache had not been warmed',
    /if \(!adtRollupMine\(PART, name\)\) \{ otherSlot\.push\(words\); return false; \}/.test(rbDrv) &&
    rbDrv.indexOf('adtRollupMine(PART, name)') < rbDrv.indexOf('if (due === false)') &&
    F.adtRollupMine('hourly', 'today') === true && F.adtRollupMine('hourly', 'warm') === false &&
    F.adtRollupMine('catchup', 'warm') === true && F.adtRollupMine('catchup', 'today') === false &&
    F.adtRollupMine('rubbish', 'today') === true && F.adtRollupMine('catchup', 'nosuchstep') === false, null);
  t('roll-up slots: the catch-up slot has a budget of its own and is not racing today’s figures, and the hourly budget is untouched',
    F.ADTOOL_ROLLUP_CATCHUP_BUDGET_MS === 420000 && F.ADTOOL_ROLLUP_BUDGET_MS === 180000 &&
    F.ADTOOL_ROLLUP_CATCHUP_BUDGET_MS > F.ADTOOL_ROLLUP_BUDGET_MS, [F.ADTOOL_ROLLUP_BUDGET_MS, F.ADTOOL_ROLLUP_CATCHUP_BUDGET_MS]);
  /* THE WAY OUT OF THE NEW GATE, PROVED ON MEASURED NUMBERS AND NOT ON HOPE. The freeze of 2 to 5
     November was a step whose estimate could never fit what was left, so it was never run, never
     measured, and the estimate stood for ever. Giving the catch-up its own slot repeats that fault
     exactly if its budget and its order cannot reach the steps at the bottom of the list. These are
     the costs the engine itself had measured at 14:22 on 5 November, read out of
     portal_config.adtool_rollup_step_ms, and the planner is the real one. */
  const rbMeasured = { orders: 6964, today: 61479, listings: 16218, yesterday: 136245, day2: 68196, tail: 35462, periods: 36222, report: 7415, roas: 1776, profiles: 34306, forecast: 53673, truth: 5096, warm: 20164 };
  t('roll-up slots: ON THE MEASURED COSTS the catch-up slot reaches the pattern pass, which is the whole reason it exists — a budget that could not would be the freeze again, one slot down',
    (() => {
      const cost = F.adtRollupStepCosts(rbMeasured, F.ADTOOL_ROLLUP_STEP_MS, F.ADTOOL_ROLLUP_COST_MARGIN);
      /* a steady run: the boundary batch is only owed before 05:00, so it is not due here */
      const steps = F.ADTOOL_ROLLUP_CATCHUP_STEPS.filter(n => n !== 'ordersall' && n !== 'catchup')
        .map(n => ({ name: n, words: n, cost_ms: cost[n], due: n === 'boundary' ? false : undefined }));
      const pl = F.adtRollupPlan({ now_ms: 0, t0: 0, budget_ms: F.ADTOOL_ROLLUP_CATCHUP_BUDGET_MS, steps: steps });
      /* and the same list on the hourly budget, which is the arithmetic that made the audit's point:
         everything from the pattern pass down was unreachable there */
      const old = F.adtRollupPlan({ now_ms: 0, t0: 0, budget_ms: F.ADTOOL_ROLLUP_BUDGET_MS, steps: steps });
      return pl.run.indexOf('profiles') >= 0 && pl.run.indexOf('owed') >= 0 && pl.run.indexOf('periods') >= 0 &&
        pl.run.indexOf('listings') >= 0 && pl.run.indexOf('report') >= 0 && old.run.indexOf('profiles') < 0;
    })(), F.adtRollupPlan({ now_ms: 0, t0: 0, budget_ms: F.ADTOOL_ROLLUP_CATCHUP_BUDGET_MS, steps: F.ADTOOL_ROLLUP_CATCHUP_STEPS.filter(n => n !== 'ordersall' && n !== 'catchup').map(n => ({ name: n, words: n, cost_ms: F.adtRollupStepCosts(rbMeasured, F.ADTOOL_ROLLUP_STEP_MS, F.ADTOOL_ROLLUP_COST_MARGIN)[n], due: n === 'boundary' ? false : undefined })) }).run);
  t('roll-up slots: the declared order IS the order the steps are called in, step for step, so the list a reader checks against the brief cannot say one thing while the code does another (real source)',
    (() => {
      /* from the steady-state marker on, which is where the order applies: the rebuild's own two
         steps and the history day loop sit above it. The week and month sums are called through the
         one helper that pays what the register owes, so that call counts as the step it runs. */
      const run = rbDrv.slice(rbDrv.indexOf('---- STEADY STATE'));
      const calls = [];
      for (const m of (run.match(/step\('[a-z0-9]+'|await doPeriods\(\)/g) || [])) {
        const n = m === 'await doPeriods()' ? 'periods' : m.slice(6, -1);
        if (calls[calls.length - 1] !== n) calls.push(n);
      }
      return calls.join(',') === F.ADTOOL_ROLLUP_ORDER.join(',');
    })(), (() => { const run = rbDrv.slice(rbDrv.indexOf('---- STEADY STATE')); const calls = []; for (const m of (run.match(/step\('[a-z0-9]+'|await doPeriods\(\)/g) || [])) { const n = m === 'await doPeriods()' ? 'periods' : m.slice(6, -1); if (calls[calls.length - 1] !== n) calls.push(n); } return calls; })());
  t('roll-up slots: the catch-up slot is registered, it is the ONLY job on its minute, and that minute is on no other entry in the whole map (real source, real file)',
    (() => {
      let file = null; try { file = JSON.parse(readFile('engine/crons.json')); } catch (e) {}
      const i = src.indexOf('function cronMap() {');
      const block = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)).replace(/\/\*[\s\S]*?\*\//g, '');
      const slots = (block.match(/'[^']+':\s*\[[^\]]*adtoolRollupsCatchup[^\]]*\]/g) || []);
      if (slots.length !== 1 || slots[0].indexOf("'43 * * * *'") !== 0 || !/\[adtoolRollupsCatchup\]/.test(slots[0])) return false;
      if (!file || file.crons.indexOf('43 * * * *') < 0) return false;
      /* and the minute itself is free: no other registered slot ever falls on :43 */
      const fires = c => { const m = String(c).split(' ')[0]; if (m === '*') return true; return m.split(',').some(part => { const st = part.split('/'); const step = st[1] ? Number(st[1]) : 1; const rg = st[0]; if (rg === '*') return 43 % step === 0; const se = rg.split('-'); const lo = Number(se[0]), hi = se[1] === undefined ? lo : Number(se[1]); return 43 >= lo && 43 <= hi && (43 - lo) % step === 0; }); };
      return file.crons.filter(fires).join(',') === '43 * * * *';
    })(), null);
  t('roll-up slots: ONE lease covers both halves, so the two invocations can never roll the same finished day at once — runJob’s own lease is per job name and would not have stopped it',
    /const ADTOOL_ROLLUP_LOCK_JOB = 'adtoolRollupFamily';/.test(src) &&
    /const lease = await adtRollupClaim\(env, JOB, BUDGET_MS \+ ADTOOL_ROLLUP_LEASE_MARGIN_MS\);/.test(rbDrv) &&
    rbDrv.indexOf('adtRollupClaim(env, JOB') < rbDrv.indexOf('adtJobStart(env, JOB)') &&
    /if \(!lease\.got\) \{ await ctx_setSync\(env, JOB, '@waited'/.test(rbDrv) &&
    /await adtRollupLeaseFree\(env\);/.test(rbDrv) && /\} finally \{/.test(rbDrv), null);
  t('roll-up lease: the three ways out of it — an expired lease, this job’s own lease left by a run the platform stopped, and a row nobody can read at all',
    (() => {
      const now = 1000000;
      const held = F.adtRollupClaimVerdict(String(now + 60000) + '|adtoolRollups', 'adtoolRollupsCatchup', now);
      const expired = F.adtRollupClaimVerdict(String(now - 1) + '|adtoolRollups', 'adtoolRollupsCatchup', now);
      const own = F.adtRollupClaimVerdict(String(now + 60000) + '|adtoolRollupsCatchup', 'adtoolRollupsCatchup', now);
      const none = F.adtRollupClaimVerdict(null, 'adtoolRollups', now);
      const junk = F.adtRollupClaimVerdict('rubbish', 'adtoolRollups', now);
      const zero = F.adtRollupClaimVerdict('0', 'adtoolRollups', now);
      return held.may === false && held.held_by === 'adtoolRollups' && /another 60 s/.test(held.reason) &&
        expired.may === true && own.may === true && none.may === true && junk.may === true && zero.may === true &&
        none.until_ms === null;
    })(), F.adtRollupClaimVerdict('1060000|adtoolRollups', 'adtoolRollupsCatchup', 1000000));
  t('roll-up lease: a lease that cannot be WRITTEN lets the run go ahead and says so in its own row — a day rolled twice costs a slot, a run that refuses to start is the fault being fixed',
    (() => {
      const cl = src.slice(src.indexOf('async function adtRollupClaim(env, who, holdMs) {'), src.indexOf('async function adtRollupLeaseFree(env) {'));
      return /let written = true;/.test(cl) && /\.catch\(\(\) => \{ written = false; \}\)/.test(cl) &&
        /return \{ got: true, note: written \? null : 'the roll-up family’s lease could not be written/.test(cl) &&
        /\.first\(\)\.catch\(\(\) => null\)/.test(cl) && /\(lease\.note \? ' · ' \+ lease\.note : ''\)/.test(rbDrv);
    })(), null);
  t('roll-up slots: the history rebuild is the catch-up slot’s, and the hourly slot never moves the day cursor while one is part way through — its own today step would otherwise declare it finished',
    /while \(PART === 'catchup' && cursor < histWanted\) \{/.test(rbDrv) &&
    /if \(PART !== 'catchup'\) \{/.test(rbDrv) &&
    /if \(cursor >= histWanted\) puts\.push\(cfgPut\('adtool_rollup_cursor', today\)\);/.test(rbDrv) &&
    /const histOk = cursor >= adtAddDays\(today, -1\);/.test(rbDrv), null);

  /* ---- item 3: the tail cursor cannot skip a new window's earliest days ----------------------- */
  const tlW = ['2026-10-27', '2026-11-02'];     // today-9 .. today-3 on 5 Nov
  t('tail round: with no cursor, a cursor for another window, a bare day left by the old code or the completed marker, the round starts at the EARLIEST day of the window in force',
    (() => {
      const none = F.adtRollupTailNext('', tlW[0], tlW[1]);
      const off = F.adtRollupTailNext('off', tlW[0], tlW[1]);
      const bare = F.adtRollupTailNext('2026-10-30', tlW[0], tlW[1]);
      const other = F.adtRollupTailNext('2026-10-26|2026-11-01', tlW[0], tlW[1]);
      const junk = F.adtRollupTailNext('rubbish', tlW[0], tlW[1]);
      return [none, off, bare, other, junk].every(x => x.next === '2026-10-27' && x.resumed === false && x.done === false);
    })(), F.adtRollupTailNext('2026-10-26|2026-11-01', tlW[0], tlW[1]));
  t('tail round: THE SKIP ITSELF — yesterday’s cursor one day short of today’s last day used to make the round roll that one day, call itself complete and stamp it, which skipped six days of the window every day after',
    (() => {
      /* the old rule: mid-round if the day reached is inside today's window at all. Yesterday's
         round reached 1 November, today's window is 27 Oct to 2 Nov, so 1 Nov read as mid-round and
         the next day was 2 November, which is the window's end: one day rolled, stamp set. */
      const oldMid = '2026-11-01' >= tlW[0] && '2026-11-01' < tlW[1];
      const oldNext = oldMid ? '2026-11-02' : tlW[0];
      const now = F.adtRollupTailNext('2026-10-26|2026-11-01', tlW[0], tlW[1]);
      return oldMid === true && oldNext === '2026-11-02' && now.next === '2026-10-27' && now.resumed === false &&
        /not this window/.test(now.source);
    })(), null);
  t('tail round: a round part way through THIS window is resumed at the next day, and a round that has reached the window’s last day is done rather than begun again',
    (() => {
      const mid = F.adtRollupTailNext('2026-10-27|2026-10-29', tlW[0], tlW[1]);
      const atEnd = F.adtRollupTailNext('2026-10-27|2026-11-02', tlW[0], tlW[1]);
      const past = F.adtRollupTailNext('2026-10-27|2026-11-05', tlW[0], tlW[1]);
      return mid.next === '2026-10-30' && mid.resumed === true && mid.done === false && mid.window_from === '2026-10-27' &&
        atEnd.next === null && atEnd.done === true && past.next === null && past.done === true;
    })(), F.adtRollupTailNext('2026-10-27|2026-10-29', tlW[0], tlW[1]));
  t('tail round: a whole round walks every day of its window exactly once, from the earliest to the latest, whatever day it is resumed on',
    (() => {
      let cur = '', seen = [], guard = 0;
      for (;;) {
        const v = F.adtRollupTailNext(cur, tlW[0], tlW[1]);
        if (!v.next || guard++ > 20) break;
        seen.push(v.next);
        cur = v.next >= tlW[1] ? 'off' : tlW[0] + '|' + v.next;
        if (cur === 'off') break;
      }
      return seen.join(',') === '2026-10-27,2026-10-28,2026-10-29,2026-10-30,2026-10-31,2026-11-01,2026-11-02' &&
        seen.length === new Set(seen).size;
    })(), null);
  t('tail round: a window nobody can read is NULL and never a day — a round with no window is not a round',
    (() => {
      const a = F.adtRollupTailNext('2026-10-27|2026-10-28', '', tlW[1]);
      const b = F.adtRollupTailNext('2026-10-27|2026-10-28', tlW[0], 'rubbish');
      const c = F.adtRollupTailNext('', '2026-11-02', '2026-10-27');     // back to front
      return a.next === null && b.next === null && c.next === null && a.done === false && c.done === false;
    })(), null);

  /* ---- item 2: the days that are behind their own sources ------------------------------------- */
  t('days behind: 2 NOVEMBER ITSELF — the row still counts 65 orders waiting for an Ali cost where the book has 3, and that one field is enough to owe the day a re-roll',
    (() => {
      const v = F.adtRollupBehind(
        { spend: 456.59, clicks: 2912, attr_units: 310, attr_revenue: 1673.12, orders: 254, pending_cost_orders: 65 },
        { spend: 456.59, clicks: 2912, attr_units: 310, attr_revenue: 1673.12, orders: 254, pending_cost_orders: 3 });
      return v.behind === true && v.fields.join(',') === 'pending_cost_orders' && /waiting for an Ali cost is stored as 65 where its source now says 3/.test(v.why);
    })(), F.adtRollupBehind({ pending_cost_orders: 65 }, { pending_cost_orders: 3 }));
  t('days behind: THE STALE VINTAGE — 12 October’s £25.52 of spend the portal counts and eBay does not, and a day where both sides agree is not behind at all',
    (() => {
      const bad = F.adtRollupBehind({ spend: 818.03, clicks: 5050, attr_units: 400, attr_revenue: 2867.47 }, { spend: 792.51, clicks: 5050, attr_units: 400, attr_revenue: 2876.92 });
      const good = F.adtRollupBehind({ spend: 727.60, clicks: 4676, attr_units: 400, attr_revenue: 2338.35 }, { spend: 727.60, clicks: 4676, attr_units: 400, attr_revenue: 2338.35 });
      return bad.behind === true && bad.fields.join(',') === 'spend,attr_revenue' && good.behind === false && good.why === null;
    })(), F.adtRollupBehind({ spend: 818.03 }, { spend: 792.51 }));
  t('days behind: money is judged to the penny and a count exactly, so a penny of rounding is not a day re-rolled for ever and one click is',
    (() => {
      const penny = F.adtRollupBehind({ spend: 100.004, clicks: 10 }, { spend: 100, clicks: 10 });
      const tuppence = F.adtRollupBehind({ spend: 100.02, clicks: 10 }, { spend: 100, clicks: 10 });
      const oneClick = F.adtRollupBehind({ spend: 100, clicks: 11 }, { spend: 100, clicks: 10 });
      return penny.behind === false && tuppence.behind === true && oneClick.behind === true && oneClick.fields.join(',') === 'clicks';
    })(), null);
  t('days behind: A MISSING SIDE IS NOT NOUGHT — two empty sides are a quiet day and agree, while a figure against nothing is a disagreement and is said as one',
    (() => {
      const quiet = F.adtRollupBehind(null, null);
      const neverBuilt = F.adtRollupBehind(null, { spend: 12.5, clicks: 40 });
      const goneFromSource = F.adtRollupBehind({ spend: 12.5 }, {});
      const zeroVsNull = F.adtRollupBehind({ spend: 0 }, {});
      return quiet.behind === false && quiet.why === null && neverBuilt.behind === true && neverBuilt.fields.join(',') === 'spend,clicks' &&
        goneFromSource.behind === true && /holds none at all/.test(goneFromSource.why) && zeroVsNull.behind === true;
    })(), [F.adtRollupBehind(null, null), F.adtRollupBehind({ spend: 0 }, {})]);
  t('days behind: the fields judged are the ones both sources can move — eBay’s spend, clicks, credited units and credited sales, and the book’s orders and unpriced count',
    F.ADTOOL_OWED_FIELDS.map(f => f[0]).join(',') === 'spend,clicks,attr_units,attr_revenue,orders,pending_cost_orders' &&
    F.ADTOOL_OWED_FIELDS.every(f => f[1] && f[1] !== f[0]) &&
    F.ADTOOL_OWED_FIELDS.filter(f => f[2]).map(f => f[0]).join(',') === 'spend,attr_revenue', F.ADTOOL_OWED_FIELDS.map(f => f[0]));
  t('owed queue: the queue de-duplicates, keeps only real dates, and is drained NEWEST FIRST — the newest wrong day is the one on a page, and draining that way keeps the span the week and month sums are asked to re-sum growing a day at a time',
    (() => {
      const q = F.adtRollupOwedDays('2026-10-12,2026-11-02,2026-10-12', ['2026-10-30', 'rubbish', '', '2026-11-02'], 60);
      const take = F.adtRollupOwedNext(q.text);
      const after = F.adtRollupOwedNext(take.rest);
      return q.days.join(',') === '2026-11-02,2026-10-30,2026-10-12' && q.owed === 3 && q.dropped === 0 &&
        take.day === '2026-11-02' && take.left === 2 && after.day === '2026-10-30';
    })(), F.adtRollupOwedDays('2026-10-12,2026-11-02,2026-10-12', ['2026-10-30', 'rubbish', '', '2026-11-02'], 60));
  t('owed queue: an empty queue is NULL and never a day the caller would then roll for no reason, and the queue drains to empty rather than to a day that is not there',
    (() => {
      const none = F.adtRollupOwedNext('');
      const off = F.adtRollupOwedNext('off');
      const one = F.adtRollupOwedNext('2026-11-02');
      return none.day === null && none.owed === 0 && off.day === null && one.day === '2026-11-02' && one.rest === '' && one.left === 0 &&
        F.adtRollupOwedNext(one.rest).day === null;
    })(), null);
  t('owed queue: over the cap it is the OLDEST that are dropped and the number dropped is returned rather than swallowed, and the cap cannot be filled by a month of finished days',
    (() => {
      const many = []; for (let i = 1; i <= 70; i++) many.push(F.adtAddDays('2026-11-05', -i));
      const q = F.adtRollupOwedDays('', many, 5);
      return q.days.join(',') === '2026-11-04,2026-11-03,2026-11-02,2026-11-01,2026-10-31' && q.dropped === 65 &&
        F.ADTOOL_OWED_CAP > F.ADTOOL_OWED_SCAN_DAYS && F.ADTOOL_OWED_SCAN_DAYS === 60 &&
        /* and the window reaches the two September days of the audit's £221.90, which a month-wide
           one would have left uncorrectable: 5 Nov back 60 days is 6 September. */
        F.adtAddDays('2026-11-05', -F.ADTOOL_OWED_SCAN_DAYS) <= '2026-09-27';
    })(), F.adtRollupOwedDays('', ['2026-11-04', '2026-11-03'], 1));
  t('days behind: the nightly comparison is three GROUPED reads and no per-listing work, and the ads side is summed the way the roll stores it — rounded per listing first — or every day in the window would read as behind by pennies for ever',
    (() => {
      const sc = src.slice(src.indexOf('async function adtRollupOwedScan(env, fromDay, toDay) {'), src.indexOf("/* ---- job: rollups driver"));
      const grouped = (sc.match(/GROUP BY/g) || []).length === 4 && /GROUP BY account, item_id, date\) GROUP BY day/.test(sc);
      const perListing = /ROUND\(SUM\(COALESCE\(spend, 0\) \+ COALESCE\(cpc_spend, 0\)\), 2\) AS sp/.test(sc);
      const book = /SUM\(CASE WHEN COALESCE\(ali_cost, 0\) > 0 THEN 0 ELSE 1 END\) AS pending_cost_orders/.test(sc) && /status <> 'CANCELLED'/.test(sc);
      const halfAnswer = /if \(dayRows === null \|\| adRows === null \|\| bookRows === null\) return \{ days: \[\], read: false/.test(sc);
      return grouped && perListing && book && halfAnswer && /adtRollupBehind\(by\[d\]\.stored, by\[d\]\.live\)/.test(sc);
    })(), null);
  t('days behind: the comparison and the drain are ONE budgeted step, the step sits above the two fixed re-rolls, and the day it re-rolls widens the week and month register rather than losing it',
    (() => {
      const o = F.ADTOOL_ROLLUP_ORDER;
      return o.indexOf('owed') > o.indexOf('periods') && o.indexOf('owed') < o.indexOf('day2') && o.indexOf('owed') < o.indexOf('tail') &&
        F.ADTOOL_ROLLUP_STEP_MS.owed === F.ADTOOL_ROLLUP_WHOLE_DAY_MS &&
        /await step\('owed', 'a finished day that is behind', owedScanDue \|\| !!adtRollupOwedNext\(owedText\)\.day/.test(rbDrv) &&
        /ownedDays\.push\(take\.day\);/.test(rbDrv) && /cfgPut\('adtool_rollup_periods_owed', await oweText\(\)\)/.test(rbDrv);
    })(), F.ADTOOL_ROLLUP_ORDER);
  t('days behind: the order book is re-rolled for THAT DAY ONLY, bounded both ends, because an Ali cost typed after the day closed is half of why the day is behind and rolling every order since it would cost more than the day',
    /async function adtoolOrdersRoll\(env, sinceIso, untilIso\) \{/.test(src) &&
    /created_at >= \?1 AND created_at < \?2/.test(src) &&
    /adtoolOrdersRoll\(env, new Date\(a0\)\.toISOString\(\), new Date\(a1\)\.toISOString\(\)\)/.test(rbDrv) &&
    /const a0 = adtUkMidnightUtcMs\(take\.day\), a1 = adtUkMidnightUtcMs\(adtAddDays\(take\.day, 1\)\);/.test(rbDrv), null);

  /* ---- item 4: a part-finished day can never be drawn as the fleet --------------------------- */
  t('last complete day: every page read of "the newest day the table holds" is capped at the day the pass FINISHED — stages, descriptors, pattern profiles and forecasts, with not one uncapped read left (real source)',
    (() => {
      const bare = src.match(/MAX\(day\)[^)]*FROM adtool_(stages|descriptors)[^)]*\)|MAX\(computed_day\)[^)]*FROM adtool_profiles[^)]*\)|MAX\(made_day\)[^)]*FROM adtool_forecast[^)]*\)/g) || [];
      const uncapped = bare.filter(x => !/DAY_SQL/.test(x));
      const capped = bare.filter(x => /DAY_SQL/.test(x));
      return uncapped.length === 0 && capped.length >= 13 &&
        /MAX\(day\) AS d FROM adtool_stages WHERE day <= ' \+ ADTOOL_PROFILES_DAY_SQL/.test(src) &&
        /MAX\(made_day\) AS d FROM adtool_forecast WHERE made_day <= ' \+ ADTOOL_FORECAST_DAY_SQL/.test(src);
    })(), (src.match(/MAX\(day\)[^)]*FROM adtool_(stages|descriptors)[^)]*\)|MAX\(computed_day\)[^)]*FROM adtool_profiles[^)]*\)|MAX\(made_day\)[^)]*FROM adtool_forecast[^)]*\)/g) || []).filter(x => !/DAY_SQL/.test(x)));
  t('last complete day: the cap has a WAY OUT — a database with no stamp yet answers exactly as it did before, because a cap with no way out would empty every page it sits on',
    /COALESCE\(\(SELECT value FROM portal_config WHERE key = 'adtool_profiles_day'\), '9999-12-31'\)/.test(F.ADTOOL_PROFILES_DAY_SQL) &&
    /COALESCE\(\(SELECT value FROM portal_config WHERE key = 'adtool_forecast_day'\), '9999-12-31'\)/.test(F.ADTOOL_FORECAST_DAY_SQL) &&
    F.ADTOOL_PROFILES_DAY_SQL !== F.ADTOOL_FORECAST_DAY_SQL,
    [F.ADTOOL_PROFILES_DAY_SQL, F.ADTOOL_FORECAST_DAY_SQL]);
  t('last complete day: the stamp is written ONLY where the pass completed, and in the same batch as the cursor that agrees it did — a stamp for a day whose cursor says otherwise must never be readable',
    (() => {
      const pr = src.slice(src.indexOf('async function adtoolProfiles(env) {'), src.indexOf('/* ADTOOL-P3-END'));
      const fc = src.slice(src.indexOf('async function adtoolForecast(env) {'), src.indexOf('async function adtForecastBundle(env, iid) {'));
      return /if \(finished\) profPuts\.push\(/.test(pr) && /'adtool_profiles_day'/.test(pr) && /await adtBatch\(env, profPuts\);/.test(pr) &&
        /if \(reached\) fcPuts\.push\(/.test(fc) && /'adtool_forecast_day'/.test(fc) && /await adtBatch\(env, fcPuts\);/.test(fc) &&
        !/'adtool_profiles_day'/.test(pr.slice(0, pr.indexOf('const finished =')));
    })(), null);
  t('last complete day: the pattern pass and the forecasts are run until their cursor says done, every call through the budget gate, with a ceiling so one step cannot eat a whole slot',
    /while \(!profDone && profBatches < ADTOOL_ROLLUP_PASS_CALLS\) \{/.test(rbDrv) &&
    /while \(fcOn && fcBatches < ADTOOL_ROLLUP_PASS_CALLS && !fcDone\) \{/.test(rbDrv) &&
    /profDone = String\(await adtFlag\(env, 'adtool_profiles_cursor'\) \|\| ''\) === today \+ '\|done';/.test(rbDrv) &&
    /fcDone = String\(await adtFlag\(env, 'adtool_forecast_cursor'\) \|\| ''\) === today \+ '\|done';/.test(rbDrv) &&
    F.ADTOOL_ROLLUP_PASS_CALLS === 4 && F.ADTOOL_ROLLUP_PASS_CALLS * 600 >= 1647 && F.ADTOOL_ROLLUP_PASS_CALLS * 300 >= 1200, F.ADTOOL_ROLLUP_PASS_CALLS);

  /* ---- item 5: the once-over the audit's own fifteen days need ------------------------------- */
  t('the once-over: the fifteen days the audit named are held as the two SPANS it found them in, it runs by key, it sits on no cron slot, and it drains under the same gate so it cannot be killed either',
    (() => {
      const cm = src.slice(src.indexOf('function cronMap() {'), src.indexOf('export default {'));
      const noCron = cm.length > 1000 && cm.indexOf('adtoolRollupOwedSeed') < 0;
      const rk = src.slice(src.indexOf('  runJobKey: {'), src.indexOf('  asRunJob: {'));
      const byKey = /adtoolRollupsCatchup, adtoolRollupOwedSeed,/.test(rk);
      const spans = /const ADTOOL_OWED_SEED_SPANS = \[\['2026-10-12', '2026-10-21'\], \['2026-10-29', '2026-11-02'\]\];/.test(src);
      const gated = /const pl = adtRollupPlan\(\{ now_ms: Date\.now\(\), t0: t0, budget_ms: ADTOOL_ROLLUP_CATCHUP_BUDGET_MS/.test(rbSeed) && /if \(!pl\.run\.length\) break;/.test(rbSeed);
      const leased = /await adtRollupClaim\(env, 'adtoolRollupOwedSeed'/.test(rbSeed) && /await adtRollupLeaseFree\(env\);/.test(rbSeed);
      const pays = /rows \+= await adtoolRollupPeriods\(env, owe\.from, owe\.to\);/.test(rbSeed);
      return noCron && byKey && spans && gated && leased && pays && /d < today/.test(rbSeed);
    })(), null);
  t('the once-over: nothing in any of it reaches eBay — it reads the engine’s own tables and writes the engine’s own tables, like every other step of the roll-up',
    (() => {
      const code = rbSeed.replace(/\/\*[\s\S]*?\*\//g, '') + src.slice(src.indexOf('async function adtRollupOwedScan(env, fromDay, toDay) {'), src.indexOf("/* ---- job: rollups driver")).replace(/\/\*[\s\S]*?\*\//g, '');
      return !/fetch\(/.test(code) && !/ebay(Call|Trade|Fetch|Token)/i.test(code) && /env\.DB\.prepare/.test(code);
    })(), null);

  /* 6 Nov: a listing whose clocks are known gets a projected date, so the Friday batch can place it */
  t('sale eligibility: a running clock projects its date (price changed 9 days ago -> eligible in 5), and an eligible listing keeps today', (() => {
    const db = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
    const r1 = F.adtSaleEligibility({ price_steady_days: 9, start_time: '2026-09-01' }, '2026-11-06', db);
    const r2 = F.adtSaleEligibility({ price_steady_days: 20, start_time: '2026-11-05' }, '2026-11-06', db);
    const r3 = F.adtSaleEligibility({ price_steady_days: 20, start_time: '2026-09-01' }, '2026-11-06', db);
    const r4 = F.adtSaleEligibility({}, '2026-11-06', db);
    return r1.eligible === false && r1.eligible_on === '2026-11-11' && r1.projected === true &&
      r2.eligible === false && r2.eligible_on === '2026-11-19' && r2.projected === true &&
      r3.eligible === true && r3.eligible_on === '2026-11-06' && r3.projected === false &&
      r4.eligible === false && r4.eligible_on === null && r4.projected === false;
  })(), null);

  /* 7 Nov: the owner's standard peak hours, 17:00 to 22:00, held on every row and offered on the form */
  t('peak hours: the standard is 17-22, the job rewrites every live row to it with an audit row each, runs by key and rides no cron, and the form opens on it', (() => {
    const pk = readFile('frontend/view-adtool-peak.js');
    const std = /const ADTOOL_PEAK_HOURS_STANDARD = '17-22';/.test(src) && /17-22 means on at 17:00 and off at 22:00/.test(src);
    const job = /async function adtoolPeakHoursSet\(env\) \{/.test(src) &&
      /WHERE removed_at = '' AND COALESCE\(hours, ''\) <> \?1 ORDER BY account, item_id LIMIT 1000/.test(src) &&
      /'ADTOOL_PEAK_HOURS_SET'/.test(src) && /UPDATE adtool_peak_items SET hours = \?3 WHERE item_id = \?1 AND account = \?2 AND removed_at = ''/.test(src) &&
      !/SET hours = \?3, auto/.test(src);
    const cron = !new RegExp("'[0-9*/, -]+': \\[[^\\]]*adtoolPeakHoursSet").test(src);
    const keyed = /adtoolPeakCampaignFill, adtoolPeakHoursSet/.test(src);
    const form = /\['Evening', \[\{ from: 17, to: 22 \}\]\],/.test(pk) && /PK\.ranges = \[\{ from: 17, to: 22 \}\];/.test(pk) && !/from: 17, to: 23/.test(pk);
    return std && job && cron && keyed && form;
  })(), null);

  /* 9 Nov: Product history says whether the listing is on the peak-time list, and what that means now */
  t('product history: the header carries the peak-time facts from the peak tables, read as one guarded block, and the page prints them with a link to the Peak page', (() => {
    const lc = src.slice(src.indexOf('async function adtoolListingCompute('), src.indexOf('async function adtListingCacheClear('));
    const read = /clock\('peak_ms', \(\) => Promise\.all\(\[/.test(lc) && /FROM adtool_peak_items WHERE item_id = \?1"\)\.bind\(iid\)\.first\(\)/.test(lc) &&
      /adtPeakSchedulesRead\(env, \[iid\], \[today, adtAddDays\(today, 1\)\]\)/.test(lc) && /adtPeakLiveSwitches\(env\),\n\s*\]\)\.catch\(\(\) => null\)\)/.test(lc);
    const compose = /let peakField = null;/.test(lc) && /next_switch: onList \? adPeakNextSwitch\(\{/.test(lc) && /live_switch_on: L\.account in sw \? !!sw\[L\.account\] : null/.test(lc) &&
      /eligible_on: saleField\.eligible_on, peak: peakField \}/.test(lc);
    const pv = readFile('frontend/view-adtool-product.js');
    const page = /function peakLines\(P\) \{/.test(pv) && /peakLines\(H\.peak\) \+ '<\/div><\/div><\/div>';/.test(pv) &&
      /not known<\/b>/.test(pv) && /not on the list<\/b>/.test(pv) && /href="#adtoolPeak"/.test(pv) && /live apply off, written down only/.test(pv);
    /* and the three peak actions drop this page's memo, so a change on the list shows here at once */
    const clears = (src.match(/await adtListingCacheClear\(env, iid\);   \/\* Product history's header names the peak list \*\//g) || []).length === 3;
    return read && compose && page && clears;
  })(), null);


  /* ══ THE FOUR PATTERN BLOCKS OVER A WINDOW THE READER CHOOSES (owner, 9 Nov 2026) ══════════════
     "In product history page I need all time and 30 days campaign data too; I need time slots of all
     time; weekly profile of all time; hour x weekday of all time; need best dates of the month with
     proper dates, and date selection option of month and week."
     The four blocks were fixed at 28 and 30 days and everything held, and their headings said so in
     typed words. What is held here: the window arithmetic, which is where a month and a week
     boundary hide an off-by-one; the four sums on one fixture with a gap day in it; that the read
     bounds and the heading come out of the same function; and that a window with nothing in it is
     answered as nothing rather than as a nought. ══ */
  const ptToday = '2026-11-09';                                     /* a Monday, so a week boundary is in play */
  const ptWin = (pat, first) => F.adListingPatternWindow(pat, ptToday, first == null ? '' : first, '2026-08-13');
  t('pattern window: all time runs from the first day the listing holds to yesterday, and from the engine’s own first day when it holds none', (() => {
    const a = ptWin({ kind: 'all' }), b = ptWin({ kind: 'all' }, '2026-08-20');
    /* the first call is the one the read is bounded by and it can only be WIDER than the second:
       the rows read are then always a superset of the window summed */
    return a.from === '2026-08-13' && a.to === '2026-11-08' && a.days === 88 && a.mode === 'average' &&
      b.from === '2026-08-20' && b.to === a.to && b.days === 81 && b.first_day === '2026-08-20' &&
      a.from <= b.from && a.to === b.to && a.key === '' && b.history_from === '2026-08-13';
  })(), [ptWin({ kind: 'all' }).label, ptWin({ kind: 'all' }, '2026-08-20').label]);
  t('pattern window: the last 28 days end yesterday, which is the window the time slots and the hour grid always had', (() => {
    const w = ptWin({ kind: 'd28' });
    return w.from === '2026-10-12' && w.to === '2026-11-08' && w.days === 28 && w.kind === 'd28' && w.key === 'd28' && w.mode === 'average';
  })(), ptWin({ kind: 'd28' }).label);
  t('pattern window: this month runs from the 1st to yesterday and says it is not finished; last month is the whole of it', (() => {
    const a = ptWin({ kind: 'this_month' }), b = ptWin({ kind: 'last_month' });
    return a.kind === 'month' && a.preset === 'this_month' && a.from === '2026-11-01' && a.to === '2026-11-08' && a.days === 8 &&
      a.span_from === '2026-11-01' && a.span_to === '2026-11-30' && a.complete === false && a.mode === 'calendar' &&
      b.from === '2026-10-01' && b.to === '2026-10-31' && b.days === 31 && b.span_to === '2026-10-31' && b.complete === true;
  })(), [ptWin({ kind: 'this_month' }).label, ptWin({ kind: 'last_month' }).label]);
  t('pattern window: a picked month is its own whole month, a 30-day month has 30 dates and February has 28', (() => {
    const s = ptWin({ kind: 'month', month: '2026-09' }), f = ptWin({ kind: 'month', month: '2026-02' });
    return s.days === 30 && s.span_to === '2026-09-30' && s.name === 'September 2026' && s.key === 'm:2026-09' &&
      f.days === 28 && f.span_to === '2026-02-28' && F.adListingMonthEnd('2026-09') === '2026-09-30' && F.adListingMonthEnd('2026-12') === '2026-12-31';
  })(), [ptWin({ kind: 'month', month: '2026-09' }).label, F.adListingMonthEnd('2026-02')]);
  t('pattern window: weeks start Monday, last week is the finished Mon to Sun, and on a Monday this week holds no finished day at all', (() => {
    const lw = ptWin({ kind: 'last_week' }), tw = ptWin({ kind: 'this_week' });
    return lw.kind === 'week' && lw.from === '2026-11-02' && lw.to === '2026-11-08' && lw.days === 7 && lw.span_to === '2026-11-08' &&
      tw.from === '2026-11-09' && tw.days === 0 && tw.span_from === '2026-11-09' && tw.span_to === '2026-11-15' &&
      /no finished day in it yet/.test(tw.label);
  })(), [ptWin({ kind: 'last_week' }).label, ptWin({ kind: 'this_week' }).label]);
  t('pattern window: the week picker takes ANY date and uses that date’s week, so a week that straddles a month boundary is one week and one key', (() => {
    const a = ptWin({ kind: 'week', week_start: '2026-11-01' });     /* a Sunday: its week began 26 Oct */
    const b = ptWin({ kind: 'week', week_start: '2026-10-28' });     /* a Wednesday in the same week */
    return a.from === '2026-10-26' && a.to === '2026-11-01' && a.days === 7 && b.from === a.from && b.to === a.to &&
      a.key === 'w:2026-10-26' && b.key === a.key && F.adListingPatternKey({ kind: 'week', week_start: '2026-11-01' }) === 'w:2026-10-26';
  })(), ptWin({ kind: 'week', week_start: '2026-11-01' }).label);
  t('pattern window: nothing is ever summed past yesterday, and a window that has not started holds no finished day rather than a nought', (() => {
    const fut = ptWin({ kind: 'month', month: '2026-12' });
    const old = ptWin({ kind: 'month', month: '2026-07' });
    return fut.days === 0 && fut.to === '2026-11-08' && fut.from > fut.to && /no finished day in it yet/.test(fut.label) &&
      old.days === 31 && old.before_history === true && fut.before_history === false;
  })(), [ptWin({ kind: 'month', month: '2026-12' }).label, ptWin({ kind: 'month', month: '2026-07' }).before_history]);
  t('pattern window: every label carries the window it covers, in words a reader can check, with no em-dash and no typed phrase', (() => {
    const labs = [{ kind: 'all' }, { kind: 'd28' }, { kind: 'this_month' }, { kind: 'last_month' }, { kind: 'last_week' }, { kind: 'month', month: '2026-09' }, { kind: 'week', week_start: '2026-11-05' }]
      .map(p2 => ptWin(p2, '2026-08-20').label);
    return labs.every(l => l.length > 10 && !/—/.test(l) && (/\d+ days?$/.test(l) || /no finished day in it yet$/.test(l))) &&
      labs.filter(l => /\d+ days?$/.test(l)).every(l => / to /.test(l)) &&
      labs[0].indexOf('all time, 20 Aug to 8 Nov, 81 days') === 0;
  })(), [ptWin({ kind: 'all' }, '2026-08-20').label, ptWin({ kind: 'week', week_start: '2026-11-05' }).label]);
  t('pattern window: the memo key is all time to nothing and one key per window otherwise, and a window the engine would refuse can never be stored under a key', (() => {
    const k = F.adListingPatternKey;
    const keys = [k(null), k({}), k({ kind: 'all' }), k({ kind: 'd28' }), k({ kind: 'this_month' }), k({ kind: 'month', month: '2026-10' }), k({ kind: 'week', week_start: '2026-11-02' })];
    const refused = [];
    for (const bad of [{ kind: 'nope' }, { kind: 'month' }, { kind: 'month', month: '2026-13' }, { kind: 'month', month: 'Oct' }, { kind: 'week' }, { kind: 'week', week_start: 'Monday' }]) {
      try { k(bad); } catch (e) { refused.push(String(e.message).indexOf('SAY: ') === 0); }
    }
    return JSON.stringify(keys) === JSON.stringify(['', '', '', 'd28', 'this_month', 'm:2026-10', 'w:2026-11-02']) &&
      refused.length === 6 && refused.every(Boolean) && F.ADTOOL_PATTERN_KINDS.length === 8;
  })(), null);

  /* ---- the four sums, on ONE fixture: a week of hours with a gap day in the middle of it ---- */
  const ptHours = (() => {
    const out = [];
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']) {
      for (const hr of [2, 9, 14, 20]) out.push({ day: d, hour: hr, orders: 1, units: hr === 14 ? 2 : 1, revenue: 10, spend_s: 0.5, clicks_s: 3, samples: 1, hourly_status: 'sampled' });
    }
    /* THE GAP DAY: a row exists for it, and it carries no order and no reading. It must count as a
       date the window holds and NOT as a day with a reading. */
    out.push({ day: '2026-11-04', hour: 11, orders: 0, units: 0, revenue: 0, spend_s: null, clicks_s: null, samples: 0, hourly_status: 'none' });
    return out;
  })();
  const ptDays = ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map(d => ({ day: d, weekday: F.adtWeekdayOf(d), dom: Number(d.slice(8, 10)), orders: 2, units: 5, revenue: 40, actual_profit: 3.5, spend: 2, attr_units: 3, pending_cost_orders: 0, pending_fee_orders: 0 }));
  const ptWk = ptWin({ kind: 'week', week_start: '2026-11-02' }, '2026-08-20');
  t('pattern slots: the share is of UNITS, the per-day figures divide by the days in the window, and the ad spend divides by the days that hold a reading', (() => {
    const s = F.adListingSlots(ptHours, ptWk), r = s.rows;
    /* 30 units over the week: 6 in each of three slots and 12 in the afternoon */
    const share = near(r[0].share, 0.2) && near(r[2].share, 0.4) && s.units === 30;
    /* seven days in the window, so 6 orders a slot is 0.86 a day, NOT 1 a day over the six days held */
    const perDay = near(r[0].orders_day, 0.86) && near(r[2].units_day, 1.71) && near(r[0].revenue_day, 8.57) && s.days === 7;
    /* six days carried a reading, the gap day did not: £3 over six days, never over seven */
    const ad = r[0].sampled_days === 6 && r[0].sampled_hours === 6 && near(r[0].spend_day, 0.5) && near(r[0].spend, 3);
    return share && perDay && ad;
  })(), F.adListingSlots(ptHours, ptWk).rows.map(x => [x.share, x.orders_day, x.spend_day, x.sampled_days]));
  t('pattern slots: a window whose hours hold no ad reading at all says the spend is not known, and never that it was nought', (() => {
    const bare = ptHours.map(h => ({ day: h.day, hour: h.hour, orders: h.orders, units: h.units, revenue: h.revenue, samples: 0, hourly_status: 'none' }));
    const s = F.adListingSlots(bare, ptWk);
    const empty = F.adListingSlots([], ptWk);
    return s.rows.every(x => x.spend_day === null && x.sampled_days === 0) && s.rows[2].units_day !== null &&
      empty.rows.every(x => x.share === null && x.spend_day === null) && empty.rows.every(x => x.orders_day === 0);
  })(), null);
  t('pattern weekday: each weekday counts its own dates in the window, and a weekday the window has no date for is not known rather than nought', (() => {
    const w = F.adListingWeekday(ptDays, ptWk), r = w.rows;
    const mon = r[0].dates === 1 && near(r[0].units_day, 5) && near(r[0].spend_day, 2) && near(r[0].profit_day, 3.5) && near(r[0].attr_units_day, 3);
    const gap = r[2].day === 'Wed' && r[2].dates === 0 && r[2].units_day === null && r[2].spend_day === null && r[2].profit_day === null;
    /* one date a weekday is thin, so the page may show the smoothed all-history rate beside it */
    const thin = w.thin === true && w.dates_min === 0 && r.length === 7;
    return mon && gap && thin;
  })(), F.adListingWeekday(ptDays, ptWk).rows.map(x => [x.day, x.dates, x.units_day]));
  t('pattern weekday: a window wide enough to stand on its own is not thin, and the window alone decides which days are counted', (() => {
    const wide = [];
    for (let i = 1; i <= 28; i++) wide.push({ day: F.adtAddDays('2026-10-12', i - 1), weekday: F.adtWeekdayOf(F.adtAddDays('2026-10-12', i - 1)), orders: 1, units: 2, revenue: 10, actual_profit: 1, spend: 1, attr_units: 1 });
    wide.push({ day: '2026-10-05', weekday: F.adtWeekdayOf('2026-10-05'), orders: 9, units: 9, revenue: 90, actual_profit: 9, spend: 9, attr_units: 9 });   /* outside the window */
    const w = F.adListingWeekday(wide, ptWin({ kind: 'd28' }));
    return w.thin === false && w.dates_min === 4 && w.rows.every(x => x.dates === 4) && near(w.rows[0].units_day, 2);
  })(), F.adListingWeekday([], ptWk).thin);
  t('pattern hour by weekday: the grid is units and orders over the window, and the dates behind each weekday are counted off the CALENDAR, not off the rows', (() => {
    const g = F.adListingHourWeekday(ptHours, ptWk);
    /* the gap day has an hour row with no units, and Wednesday must still count as a date in the week */
    const cal = JSON.stringify(g.dates) === JSON.stringify([1, 1, 1, 1, 1, 1, 1]) && g.days === 7;
    const grid = g.units[0][14] === 2 && g.orders[0][14] === 1 && g.units[2][11] === 0 && g.max === 2 &&
      g.units.length === 7 && g.units[0].length === 24;
    /* a wider window counts every such date, which is the divisor a reader needs */
    const wide = F.adListingHourWeekday(ptHours, ptWin({ kind: 'd28' }));
    return cal && grid && JSON.stringify(wide.dates) === JSON.stringify([4, 4, 4, 4, 4, 4, 4]) && wide.days === 28;
  })(), F.adListingHourWeekday(ptHours, ptWk).dates);
  t('pattern dates: a WEEK draws its seven real dates in order and the day it holds nothing for is null, never nought', (() => {
    const d = F.adListingDates(ptDays, ptWk);
    const shape = d.mode === 'calendar' && d.rows.length === 7 && d.held === 6 && d.missing === 1;
    const order = d.rows.map(r => r.label).join('|') === '2 Nov|3 Nov|4 Nov|5 Nov|6 Nov|7 Nov|8 Nov';
    const gap = d.rows[2].held === false && d.rows[2].units === null && d.rows[2].orders === null && d.rows[2].revenue === null &&
      d.rows[2].spend === null && d.rows[2].actual_profit === null && d.rows[2].future === false;
    const real = d.rows[0].units === 5 && d.rows[0].orders === 2 && near(d.rows[0].revenue, 40) && near(d.rows[0].spend, 2) && near(d.rows[0].actual_profit, 3.5);
    return shape && order && gap && real;
  })(), F.adListingDates(ptDays, ptWk).rows.map(r => [r.label, r.held, r.units]));
  t('pattern dates: a MONTH draws every date of the whole month, with the dates still to come marked as not reached rather than as empty days', (() => {
    const d = F.adListingDates(ptDays, ptWin({ kind: 'this_month' }));
    const whole = d.mode === 'calendar' && d.rows.length === 30 && d.rows[0].label === '1 Nov' && d.rows[29].label === '30 Nov';
    const past = d.rows[0].held === false && d.rows[0].future === false && d.rows[1].held === true && d.rows[1].units === 5;
    const ahead = d.rows[8].future === true && d.rows[8].units === null && d.rows[29].future === true;
    /* a 31-day month draws 31 and a February 28, under a cap that is a month and never more */
    const oct = F.adListingDates(ptDays, ptWin({ kind: 'month', month: '2026-10' })).rows.length;
    const feb = F.adListingDates(ptDays, ptWin({ kind: 'month', month: '2026-02' })).rows.length;
    return whole && past && ahead && oct === 31 && feb === 28 && F.ADTOOL_PATTERN_DATES_CAP >= 31 && F.ADTOOL_PATTERN_DATES_CAP < 60;
  })(), [F.adListingDates(ptDays, ptWin({ kind: 'this_month' })).rows.length, F.adListingDates(ptDays, ptWin({ kind: 'month', month: '2026-10' })).rows.length]);
  t('pattern dates: all time and the last 28 days stay the average per calendar date, 1 to 31, with the count of dates behind every one of them', (() => {
    const d = F.adListingDates(ptDays, ptWin({ kind: 'all' }, '2026-11-02'));
    const shape = d.mode === 'average' && d.rows.length === 31 && d.rows[0].dom === 1 && d.rows[30].dom === 31;
    const counted = d.rows[1].dates === 1 && near(d.rows[1].units_day, 5) && d.rows[3].dates === 0 && d.rows[3].units_day === null;
    /* two dates behind one calendar date average to the mean of them, and the count says it is two */
    const two = F.adListingDates(ptDays.concat([{ day: '2026-10-02', weekday: F.adtWeekdayOf('2026-10-02'), dom: 2, orders: 1, units: 1, revenue: 8, actual_profit: 1, spend: 1, attr_units: 1 }]), ptWin({ kind: 'all' }, '2026-10-02'));
    return shape && counted && two.rows[1].dates === 2 && near(two.rows[1].units_day, 3);
  })(), F.adListingDates(ptDays, ptWin({ kind: 'all' }, '2026-11-02')).rows.slice(0, 4).map(r => [r.dom, r.dates, r.units_day]));

  /* ---- and the engine composition: one bounded read, the bounds and the heading from one place ---- */
  t('product history: the four pattern blocks cost ONE read, bounded by the window, and the window the heading prints is worked out by the same function that bounded it', (() => {
    /* the hour grain answers the slots and the grid; the weekday profile and the dates are summed
       from the day rows the core group already holds, so they cost no read at all */
    const one = /clock\('pattern_ms', \(\) => env\.DB\.prepare\('SELECT day, hour, orders, units, revenue, spend_s, spend_r, clicks_s, clicks_r, samples, hourly_status FROM adtool_listing_hour WHERE item_id = \?1 AND day >= \?2 AND day <= \?3 ORDER BY day, hour'\)\.bind\(iid, patBounds\.from, patBounds\.to\)/.test(plSrc);
    const bounds = /const patBounds = adListingPatternWindow\(p && p\.pattern, today, '', ADTOOL_HISTORY_START\);/.test(plSrc) &&
      plSrc.indexOf('const patBounds =') < plSrc.indexOf("const G = await clock('reads_ms'");
    const named = /const patWin = adListingPatternWindow\(p && p\.pattern, today, days\.length \? String\(days\[0\]\.day\) : '', ADTOOL_HISTORY_START\);/.test(plSrc);
    const shape = /slots: patHours \? adListingSlots\(patHours, patWin\) : null,/.test(plSrc) &&
      /weekday: adListingWeekday\(days, patWin\),/.test(plSrc) &&
      /hour_weekday: patHours \? adListingHourWeekday\(patHours, patWin\) : null,/.test(plSrc) &&
      /dates: adListingDates\(days, patWin\),/.test(plSrc) && /window: patWin,/.test(plSrc) &&
      /weeks_behaviour, months, weekday: wd, heat, slots, dom, patterns, actions,/.test(plSrc);
    /* the hour read is the ONLY read this adds: no second trip, and no second statement in the batch */
    const trips = (plSrc.match(/clock\('pattern_ms'/g) || []).length === 1 &&
      (plSrc.match(/FROM adtool_listing_hour/g) || []).length === 3;
    /* and the fixed windows the page drew before are untouched, so no figure on it can have moved
       by accident and a frontend older than this engine still has something to draw */
    const old = /for \(const h of hourProfile\) \{ const w2 = adtWeekdayOf\(h\.day\); heat\[w2\]\[h\.hour\] \+= h\.units;/.test(plSrc) &&
      /const hourFrom = adtAddDays\(today, -28\);/.test(plSrc) && /if \(r\.day < adtAddDays\(today, -30\) \|\| r\.day > yday\) continue;/.test(plSrc);
    /* profile.* is the stage and regime machinery's and keeps no window of its own */
    const prof = /profile, forecast, decision, narrative/.test(plSrc) && plSrc.indexOf('profile.patterns') < 0;
    /* and the probe counts that read and names the window it was bounded by, so "the page is slow on
       all time" is answered with a row count from outside the portal instead of guessed at */
    const probe = /pattern_hours: \(d\.patterns && d\.patterns\.hours_read != null\) \? Number\(d\.patterns\.hours_read\) : null,/.test(src) &&
      /pattern_window: \[\(pw\.from\) \|\| '', \(pw\.to\) \|\| ''\], pattern_days: Number\(pw\.days\) \|\| 0, pattern_kind: String\(pw\.preset \|\| ''\)/.test(src);
    return one && bounds && named && shape && trips && old && prof && probe;
  })(), null);

  /* ---- the campaign table over 30 days and all time ---- */
  t('where its ads sit: the 30-day and all-time money per campaign come out of the SAME grouped read, with the counts beside them so an empty window is not a nought', (() => {
    const wr = src.slice(src.indexOf('async function adtWhereRows(env, iid) {'), src.indexOf('/* ---- actions ---- */'));
    const sql = /SUM\(CASE WHEN day >= \?4 THEN spend ELSE 0 END\) AS sp_30, SUM\(CASE WHEN day >= \?4 THEN revenue ELSE 0 END\) AS rv_30, SUM\(CASE WHEN day >= \?4 THEN units ELSE 0 END\) AS un_30, SUM\(CASE WHEN day >= \?4 THEN 1 ELSE 0 END\) AS n_30, SUM\(spend\) AS sp_all, SUM\(revenue\) AS rv_all, SUM\(units\) AS un_all, COUNT\(\*\) AS n_all, MIN\(day\) AS first_day, MAX\(day\) AS last_day FROM adtool_ads_daily WHERE item_id = \?1 GROUP BY campaign_id'\)\.bind\(iid, yday, d7, d30\)/.test(wr);
    /* ONE statement still, in the same batch of four: not a trip was added for either window */
    const trips = (wr.slice(wr.indexOf('const WR = await adtBatchRead(env, ['), wr.indexOf('const rows = WR[0] || [];')).match(/env\.DB\.prepare\(/g) || []).length === 4 &&
      (wr.match(/FROM adtool_ads_daily/g) || []).length === 1;
    /* a window with no row in it is null; a window with rows and no spend is a real nought; and no
       ROAS is ever printed off a nought spend */
    const nulls = /spend_30d: Number\(s\.n_30\) > 0 \? round2\(s\.sp_30\) : null, roas_30d: Number\(s\.sp_30\) > 0 \? round2\(s\.rv_30 \/ s\.sp_30\) : null/.test(wr) &&
      /spend_all: Number\(s\.n_all\) > 0 \? round2\(s\.sp_all\) : null, roas_all: Number\(s\.sp_all\) > 0 \? round2\(s\.rv_all \/ s\.sp_all\) : null/.test(wr) &&
      /all_from: s\.first_day \|\| '',/.test(wr);
    /* the 7-day pair and yesterday are untouched: this read feeds the Campaigns page's own panel too
       and not one figure there may move */
    const kept = /spend_7d: s\.sp_7 == null \? null : round2\(s\.sp_7\), roas_7d: \(s\.sp_7 > 0\) \? round2\(s\.rv_7 \/ s\.sp_7\) : null/.test(wr) &&
      /spend_yesterday: s\.sp_y == null \? null : round2\(s\.sp_y\)/.test(wr);
    return sql && trips && nulls && kept;
  })(), null);
  t('where its ads sit: the page gains four columns after the 7-day pair, each with its window in the header, and prints not known where the answer holds nothing', (() => {
    const head = bpProd.indexOf('<th class="r">Spend, last 7 days</th><th class="r">ROAS, last 7 days</th><th class="r">Units sold, last 7 days</th><th class="r">Spend, last 30 days</th><th class="r">ROAS, last 30 days</th><th class="r">Units sold, last 30 days</th><th class="r">Spend, all time</th><th class="r">ROAS, all time</th><th class="r">Units sold, all time</th><th>Last change</th>') > 0;
    const cells = /nk\(c\.spend_30d, gbp\)/.test(bpProd) && /nk\(c\.roas_30d, roas\)/.test(bpProd) &&
      /nk\(c\.spend_all, gbp\)/.test(bpProd) && /nk\(c\.roas_all, roas\)/.test(bpProd);
    /* all time is only as old as the first day that campaign has for this listing, and the cell says so */
    const from = /c\.all_from \? '<div class="at-src" title="the first day this listing has a row in this campaign">from ' \+ esc\(dfmt\(String\(c\.all_from\)\)\)/.test(bpProd);
    /* and not known is written in words, never as a nought */
    const words = /function nk\(v, f\) \{ return \(v == null \|\| v === '' \|\| \(typeof v === 'number' && isNaN\(v\)\)\) \? '<span class="at-nk">not known<\/span>' : f\(v\); \}/.test(bpProd);
    return head && cells && from && words;
  })(), null);

  /* ---- and the page: one selector, and every one of the four headings carrying its window ---- */
  t('product history page: ONE selector above the four blocks, all time first, with a month picker and a week picker, and changing it re-asks the engine with the window', (() => {
    const presets = /var PAT_PRESETS = \[\['all', 'All time'\], \['d28', 'Last 28 days'\], \['this_month', 'This month'\], \['last_month', 'Last month'\], \['this_week', 'This week'\], \['last_week', 'Last week'\]\];/.test(bpProd);
    const pickers = /<input id="atPatM" type="month"/.test(bpProd) && /<input id="atPatW" type="date"/.test(bpProd) &&
      /setPattern\(\{ kind: 'month', month: this\.value \}\)/.test(bpProd) && /setPattern\(\{ kind: 'week', week_start: this\.value \}\)/.test(bpProd);
    /* the window travels on every open and on every change, and all time is the default the owner asked for */
    const asks = /api\('adtoolListing', \{ item_id: id, pattern: AT\.pattern \}\)/.test(bpProd) &&
      /api\('adtoolListing', \{ item_id: AT\.item, pattern: pat \}\)/.test(bpProd) &&
      /pattern: \{ kind: 'all' \}/.test(bpProd);
    /* a half-typed month or date is never sent: the engine would refuse it and the refusal would
       land on somebody who had not finished typing */
    const guard = /if \(\/\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$\/\.test\(this\.value\)\)/.test(bpProd) && /if \(\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(this\.value\)\)/.test(bpProd);
    /* and the page a reader is in the middle of is NOT wiped while the new window is worked out */
    const keep = /var msg = \$\('atPatMsg'\); if \(msg\) msg\.textContent = 'Working that window out…';/.test(bpProd) &&
      bpProd.indexOf("function setPattern(pat) {") > 0;
    /* the note carries the window too, because the engine holds this page's answer per window now */
    const note = /api\('adtoolActionLog', \{ item_id: AT\.item, type: 'note', note: n, pattern: AT\.pattern \}\)/.test(bpProd);
    return presets && pickers && asks && guard && keep && note;
  })(), null);
  t('product history page: all four headings print the window the engine summed them over, and not one of them carries a typed window any more', (() => {
    const heads = ['Time slots · ', 'Weekday profile · ', 'Hour × weekday · ', 'Best dates of the month'].every(x => bpProd.indexOf(x) > 0);
    const label = (bpProd.match(/esc\(patLabel\(P, '(slots|weekday|hour_weekday|dates)'\)\)/g) || []).length === 4 &&
      /function patLabel\(P, block\) \{/.test(bpProd);
    /* the typed windows are gone from the headings of all four */
    const typed = bpProd.indexOf('Time slots, last 28 days') < 0 && bpProd.indexOf('Weekday profile, last 30 days') < 0 &&
      bpProd.indexOf('Hour × weekday, last 28 days') < 0 && bpProd.indexOf('Average units per calendar date, over every day we hold') < 0;
    /* a month or a week draws THE REAL DATES, and a date with no day held is said in words */
    const real = /var cal = DT\.mode === 'calendar';/.test(bpProd) && /'Every date in this window'/.test(bpProd) &&
      /\(r\.future \? 'not reached yet' : 'no day held'\)/.test(bpProd) &&
      /return cal \? \(r\.held \? r\.units : null\) : r\.units_day;/.test(bpProd);
    /* an engine older than this one sends no patterns: the page then labels each block with the
       fixed window that answer really is, rather than printing a window nobody computed */
    const fallback = /var PAT_LEGACY = \{ slots: 'last 28 days', weekday: 'last 30 days', hour_weekday: 'last 28 days', dates: 'every day we hold' \};/.test(bpProd) &&
      /if \(D\.patterns && D\.patterns\.window\) return D\.patterns;/.test(bpProd) && /if \(P && P\.legacy\) \{/.test(bpProd);
    return heads && label && typed && real && fallback;
  })(), null);

  /* 9 Nov (owner, mid-build): "clearly need in which campaign it has sold how many units" */
  t('product history: the campaign table prints units sold per campaign for 7 days, 30 days and all time, as not known where a window holds no row, with the attribution caveat once', (() => {
    const pv = readFile('frontend/view-adtool-product.js');
    const heads = /Units sold, last 7 days<\/th>/.test(pv) && /Units sold, last 30 days<\/th>/.test(pv) && /Units sold, all time<\/th>/.test(pv);
    const cells = /nk\(c\.units_7d, cnt\)/.test(pv) && /nk\(c\.units_30d, cnt\)/.test(pv) && /nk\(c\.units_all, cnt\)/.test(pv) && /function cnt\(v\) \{ return String\(Math\.round\(Number\(v\) \|\| 0\)\); \}/.test(pv);
    const caveat = (pv.match(/one order can be credited by more than one campaign/g) || []).length === 1;
    const eng = /units_30d: Number\(s\.n_30\) > 0 \? Number\(s\.un_30\) : null/.test(src) && /units_all: Number\(s\.n_all\) > 0 \? Number\(s\.un_all\) : null/.test(src) && /units_7d: /.test(src.slice(src.indexOf('async function adtWhereRows('), src.indexOf('async function adtWhereRows(') + 30000));
    return heads && cells && caveat && eng;
  })(), null);

  /* 10 Nov: the page died with "pm is not a function" because a local `var pm = $('atPatM')` in the selector
     wiring shadowed the money formatter pm(v, d) for the whole function. No local may reuse a helper's name. */
  t('product history: no local variable shadows a page-level helper (pm, gbp, roas, esc, nk, cnt)', (() => {
    const pv = readFile('frontend/view-adtool-product.js');
    return !/\bvar (pm|gbp|roas|esc|nk|cnt) = /.test(pv) && !/\b(let|const) (pm|gbp|roas|esc|nk|cnt) = /.test(pv) && /function pm\(v, d\)/.test(pv);
  })(), null);

  /* 10 Nov (owner): "product history, overview page, and all facts and figures of advertising department should
     get up to date after every 5 minutes". Every advertising page re-reads itself within five minutes while it is
     open, no advertising memo outlives five minutes, and Product history's header carries the five-minute clock. */
  t('advertising pages: every poller runs within five minutes, every memo expires within five minutes, and Product history polls quietly and shows both clocks', (() => {
    const files = ['view-adtool-product.js', 'view-adtool-overview.js', 'view-adtool-departments.js', 'view-adtool-newlistings.js', 'view-adtool-cpc.js', 'view-adtool-campaignboard.js', 'view-adtool-spendingtoday.js', 'view-adtool-runtoday.js', 'view-adtool-stopped.js', 'view-adtool-peak.js'];
    let polls = true;
    for (const f of files) { const s = readFile('frontend/' + f); for (const m of s.matchAll(/adtPoll\('[A-Za-z]+', (\d+),/g)) if (Number(m[1]) > 300000) polls = false; }
    const pv = readFile('frontend/view-adtool-product.js');
    const prod = /adtPoll\('atBody', 300000, function \(\) \{ return load\(AT\.item, true\); \}\);/.test(pv) && /function load\(id, quiet\) \{/.test(pv) && /if \(!quiet\) \$\('atBody'\)\.innerHTML = /.test(pv) &&
      /adtFreshTag\(D\.fresh_today\)/.test(pv) && /finished days: /.test(pv);
    const ttl = src.slice(src.indexOf('const ADTOOL_KV_TTL_MS = {'), src.indexOf('};', src.indexOf('const ADTOOL_KV_TTL_MS = {')));
    let memos = true; for (const m of ttl.matchAll(/adtool[A-Za-z]+: (\d+)/g)) if (Number(m[1]) > 300000) memos = false;
    return polls && prod && memos;
  })(), null);

  /* 10 Nov: the Sale page's first live run called 143 of Sir Hasib's 150 on sale where eBay had eleven, because 130
     were repriced five per cent down by hand on 7 Nov and that reads like eBay's own step. The ledger proof now
     needs the step on the fill day and nothing changed since; and the running-events read must carry listing_ids
     or every event names nothing (both events read named 0 on the first run). */
  t('sale truth: a discount step on the day eBay filled the event proves the sale; the same step four days later is a repricing, not a sale', (() => {
    const ev = { promo_id: 'P1', discount_pct: 0.05, starts: '2026-11-03', ends: '2026-11-16', added: true, whole_shop: false };
    const ledgerOk = [{ day: '2026-11-02', price: 9.99 }, { day: '2026-11-03', price: 9.49 }, { day: '2026-11-09', price: 9.49 }];
    const ledgerHand = [{ day: '2026-11-02', price: 9.99 }, { day: '2026-11-06', price: 9.99 }, { day: '2026-11-07', price: 9.49 }, { day: '2026-11-09', price: 9.49 }];
    const a = F.adSaleMembership({ item_id: '1', price: 9.49, listed_on: '2026-03-01' }, ev, ledgerOk, [], '2026-11-09');
    const b = F.adSaleMembership({ item_id: '2', price: 9.49, listed_on: '2026-03-01' }, ev, ledgerHand, [], '2026-11-09');   /* the record alone dates the step to the 7th */
    const c = F.adSaleMembership({ item_id: '3', price: 9.49, listed_on: '2026-03-01', last_change_any: '2026-11-07' }, ev, ledgerOk, [], '2026-11-09');   /* the clocks say it moved after */
    return a.on_sale === true && a.basis === 'ledger' && b.on_sale === false && /repricing, not the sale/.test(b.why) && c.on_sale === false;
  })(), null);
  t('sale events: the running-events read carries listing_ids and the snapshot hands the rule the enrol day', (() => {
    const sc = src.slice(src.indexOf('async function adtoolSalesCompute('), src.indexOf('async function adtoolSalesCompute(') + 60000);
    return /substr\(end_at,1,10\) AS ends, COALESCE\(listing_ids,''\) AS listing_ids " \+/.test(sc) && /enrol_on: clocks\.last_enrol \|\| null, last_change_any: clocks\.last_change \|\| null/.test(src);
  })(), null);

  const passed = results.filter(r => r.ok).length;
  const lines = results.map(r => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : '  → ' + r.detail));
  return lines.join('\n') + '\n' + (passed === results.length ? 'PASS ' : 'FAIL ') + passed + '/' + results.length;
}
