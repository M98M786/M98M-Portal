/** Phase 4 — the Order Earning Calculator, "Brain v17" (§4.2).
 *
 * §4.2 verbatim: `(FVF% × SoldFor + tiered per-order fee + 0.35% regulatory) × 1.2 VAT`;
 * FVF map + per-order tiers read from each Central Sheet's `⚙ Config` tab. Read config from
 * sheet; never hardcode. The constants below are DOCUMENTED FALLBACKS used only when that tab
 * cannot be reached — every result then carries configMissing:true so no caller mistakes a
 * fallback for a reading.
 *
 * Router.gs merges feature modules by name; `ACTIONS_BRAIN` must be added to its groups list
 * before calcProjectedProfit/anchorTest are reachable (RL-1 rejects unknown actions).
 */

const BRAIN_VERSION = 'v17';
const BRAIN_FORMULA = '(FVF% × SoldFor + tiered per-order fee + 0.35% regulatory) × 1.2 VAT';

// Tab name is a gear glyph U+2699, one space, "Config" — verified byte-for-byte on ABRT.
const BRAIN_CONFIG_TAB = '⚙ Config';
const BRAIN_DEFAULT_KEY = 'DEFAULT';
// The FVF map's vehicle slot on ABRT still holds this literal placeholder text instead of a
// category id. It must never be matched as if it were a category: no real listing can carry it.
const BRAIN_VEHICLE_PLACEHOLDER = '(add vehicle category id here)';

// Documented fallbacks (§4.2 + ABRT ⚙ Config as read 8 Aug 2026). Only reachable with configMissing:true.
const BRAIN_FALLBACK_FVF = 0.128;
const BRAIN_FALLBACK_REG_PCT = 0.0035;
const BRAIN_FALLBACK_VAT_MULT = 1.2;
const BRAIN_FALLBACK_TIERS = [{ upTo: 10, fee: 0.10 }, { upTo: 999999, fee: 0.30 }];

// A tier row with no upper bound ("else"). A finite sentinel, because Infinity is not JSON —
// and these objects round-trip through CacheService as JSON.
const BRAIN_TIER_ELSE = 1e15;
const BRAIN_CACHE_SECONDS = 120;

// §4.2 anchor test / Phase-4 Definition of Done.
const BRAIN_ANCHOR_ACCOUNT = 'ABRT';
const BRAIN_ANCHOR_SOLD_FOR = 19.99;
const BRAIN_ANCHOR_FVF = 0.10;
const BRAIN_ANCHOR_EXPECTED = 17.15;

const BRAIN_MAX_SOLD_FOR = 1000000;
const BRAIN_MAX_TEXT = 300;

// ---------- config (read from the sheet, never hardcoded) ----------

/** {fvfMap, tiers, defaultFvf, regulatoryPct, vatMultiplier, source, configMissing} for an account. */
function brainFeeConfig_(account) {
  return brainReadFeeConfig_(account, true);
}

/** useCache:false forces a live read — diagnostics (the anchor test) must never assert on a cache. */
function brainReadFeeConfig_(account, useCache) {
  const acct = String(account || '').trim().slice(0, BRAIN_MAX_TEXT);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'brain_cfg_' + brainNormAccount_(acct);
  if (useCache) {
    const hit = cache.get(cacheKey);
    if (hit) {
      try { return JSON.parse(hit); } catch (e) { /* corrupt entry → read the sheet again */ }
    }
  }

  let cfg = null;
  if (!acct) {
    cfg = brainFallbackConfig_('', 'no account given — ' + BRAIN_CONFIG_TAB + ' not read');
  } else {
    const found = brainFindCentral_(acct);
    if (!found.id) {
      cfg = brainFallbackConfig_(acct, found.why);
    } else {
      let ss = null;
      try { ss = brainOpenCentral_(found.id); } catch (e) { ss = null; }
      const sh = ss ? brainConfigTab_(ss) : null;
      if (!ss) cfg = brainFallbackConfig_(acct, 'the central sheet could not be opened');
      else if (!sh) cfg = brainFallbackConfig_(acct, BRAIN_CONFIG_TAB + ' tab not found');
      else {
        try { cfg = brainParseConfigTab_(sh, acct, found.name); }
        catch (e) {
          logActivity_('brain', 'BRAIN_CONFIG_READ_FAIL', acct, '', '', String(e && e.message || e));
          cfg = brainFallbackConfig_(acct, BRAIN_CONFIG_TAB + ' could not be parsed');
        }
      }
    }
  }

  if (useCache) cache.put(cacheKey, JSON.stringify(cfg), BRAIN_CACHE_SECONDS);
  return cfg;
}

function brainFallbackConfig_(account, why) {
  const map = {};
  map[BRAIN_DEFAULT_KEY] = BRAIN_FALLBACK_FVF;
  return {
    account: account,
    fvfMap: map,
    tiers: BRAIN_FALLBACK_TIERS.map(function (t) { return { upTo: t.upTo, fee: t.fee }; }),
    defaultFvf: BRAIN_FALLBACK_FVF,
    regulatoryPct: BRAIN_FALLBACK_REG_PCT,
    vatMultiplier: BRAIN_FALLBACK_VAT_MULT,
    source: 'documented defaults — ' + why,
    configMissing: true,
    placeholderUnfilled: false,
    notes: ['Fee config came from documented defaults, not from ' + BRAIN_CONFIG_TAB + ': ' + why + '.'],
  };
}

function brainParseConfigTab_(sh, account, connectionName) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 2) throw new Error('config tab is empty');
  const vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const head = vals[0].map(brainNormHeader_);

  const col = { key: -1, value: -1, fvfKey: -1, fvfVal: -1, tierUpTo: -1, tierFee: -1 };
  head.forEach(function (h, i) {
    if (!h) return;
    if (col.key < 0 && h === 'key') col.key = i;
    else if (col.value < 0 && h === 'value') col.value = i;
    else if (col.fvfKey < 0 && (h.indexOf('fvf map') === 0 || h.indexOf('categoryid') >= 0)) col.fvfKey = i;
    else if (col.fvfVal < 0 && h.indexOf('fvf decimal') === 0) col.fvfVal = i;
    else if (col.tierUpTo < 0 && h.indexOf('order total up to') >= 0) col.tierUpTo = i;
    else if (col.tierFee < 0 && h.indexOf('fee') === 0) col.tierFee = i;
  });
  // Reality: three side-by-side blocks at A/B, D/E, G/H with blank separator columns C and F.
  // Header text addresses them; the letters are the documented fallback if a header is edited.
  if (col.key < 0 && lastCol >= 2) col.key = 0;
  if (col.value < 0 && lastCol >= 2) col.value = 1;
  if (col.fvfKey < 0 && lastCol >= 5) col.fvfKey = 3;
  if (col.fvfVal < 0 && lastCol >= 5) col.fvfVal = 4;
  if (col.tierUpTo < 0 && lastCol >= 8) col.tierUpTo = 6;
  if (col.tierFee < 0 && lastCol >= 8) col.tierFee = 7;

  const notes = [];
  const keyVals = {};
  const fvfMap = {};
  const rawTiers = [];

  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    if (col.key >= 0 && col.value >= 0) {
      const k = String(row[col.key] === null || row[col.key] === undefined ? '' : row[col.key]).trim();
      if (k) keyVals[k.toUpperCase()] = row[col.value];
    }
    if (col.fvfKey >= 0 && col.fvfVal >= 0) {
      const fk = brainCellText_(row[col.fvfKey]);
      if (fk) {
        const rate = brainRate_(row[col.fvfVal]);
        if (isFinite(rate)) fvfMap[fk] = rate;
        else notes.push('FVF map row "' + fk + '" has an unreadable rate and was ignored.');
      }
    }
    if (col.tierUpTo >= 0 && col.tierFee >= 0) {
      const upRaw = brainCellText_(row[col.tierUpTo]);
      const feeRaw = brainCellText_(row[col.tierFee]);
      if (upRaw || feeRaw) {
        const fee = brainParseAmount_(row[col.tierFee]).value;
        const up = brainParseAmount_(row[col.tierUpTo]).value;
        if (isFinite(fee) && fee >= 0 && fee <= 100) rawTiers.push({ upTo: (isFinite(up) && up > 0) ? up : BRAIN_TIER_ELSE, fee: fee });
        else notes.push('Per-order fee row "' + upRaw + ' / ' + feeRaw + '" is unreadable and was ignored.');
      }
    }
  }

  // The FVF map is the authority for DEFAULT; the KEY/VALUE pair FVF_DEFAULT is the backstop.
  let defaultFvf = NaN;
  Object.keys(fvfMap).forEach(function (k) {
    if (k.trim().toUpperCase() === BRAIN_DEFAULT_KEY) defaultFvf = fvfMap[k];
  });
  const keyedDefault = brainRate_(keyVals['FVF_DEFAULT']);
  if (!isFinite(defaultFvf)) defaultFvf = keyedDefault;
  else if (isFinite(keyedDefault) && Math.abs(keyedDefault - defaultFvf) > 1e-9) {
    notes.push('FVF map DEFAULT (' + defaultFvf + ') and CONFIG FVF_DEFAULT (' + keyedDefault + ') disagree — the map was used.');
  }
  if (!isFinite(defaultFvf)) {
    defaultFvf = BRAIN_FALLBACK_FVF;
    notes.push('No DEFAULT row in the FVF map — the documented ' + BRAIN_FALLBACK_FVF + ' was used.');
  }

  let regPct = brainRate_(keyVals['REG_FEE_PCT']);
  if (!isFinite(regPct)) {
    regPct = BRAIN_FALLBACK_REG_PCT;
    notes.push('No REG_FEE_PCT in ' + BRAIN_CONFIG_TAB + ' — the documented 0.35% was used.');
  }

  let vatMult = brainParseAmount_(keyVals['VAT_MULT']).value;
  if (!isFinite(vatMult) || vatMult < 1 || vatMult > 2) {
    vatMult = BRAIN_FALLBACK_VAT_MULT;
    notes.push('No usable VAT_MULT in ' + BRAIN_CONFIG_TAB + ' — the documented 1.2 was used.');
  }

  let tiers = brainNormalizeTiers_(rawTiers);
  if (!tiers.length) {
    tiers = BRAIN_FALLBACK_TIERS.map(function (t) { return { upTo: t.upTo, fee: t.fee }; });
    notes.push('No readable per-order fee tiers in ' + BRAIN_CONFIG_TAB + ' — the documented tiers were used.');
  }

  let placeholderUnfilled = false;
  Object.keys(fvfMap).forEach(function (k) {
    if (brainKeyEq_(k, BRAIN_VEHICLE_PLACEHOLDER)) placeholderUnfilled = true;
  });
  if (placeholderUnfilled) {
    notes.push('The FVF map still holds the literal placeholder "' + BRAIN_VEHICLE_PLACEHOLDER +
      '" instead of a category id, so a real vehicle listing resolves to DEFAULT ' + defaultFvf + '.');
  }

  return {
    account: account,
    connectionName: connectionName || account,
    fvfMap: fvfMap,
    tiers: tiers,
    defaultFvf: defaultFvf,
    regulatoryPct: regPct,
    vatMultiplier: vatMult,
    source: BRAIN_CONFIG_TAB + ' — ' + (connectionName || account),
    configMissing: false,
    placeholderUnfilled: placeholderUnfilled,
    notes: notes,
  };
}

// ---------- FVF resolution ----------

/** Resolve a category (name or eBay category id) to its FVF, DEFAULT when unknown. */
function brainFvfFor_(account, categoryOrId) {
  return brainFvfFromConfig_(brainFeeConfig_(account), categoryOrId);
}

function brainFvfFromConfig_(cfg, categoryOrId) {
  const candidates = brainCategoryCandidates_(categoryOrId);
  const keys = Object.keys(cfg.fvfMap);
  let matchedKey = '';
  for (let i = 0; i < candidates.length && !matchedKey; i++) {
    for (let j = 0; j < keys.length; j++) {
      const k = keys[j];
      if (k.trim().toUpperCase() === BRAIN_DEFAULT_KEY) continue;        // DEFAULT is the fallback, not a match
      if (brainKeyEq_(k, BRAIN_VEHICLE_PLACEHOLDER)) continue;           // unfilled slot: matching it would invent a rate
      if (brainKeyEq_(k, candidates[i])) { matchedKey = k; break; }
    }
  }
  if (matchedKey) {
    return {
      fvf: cfg.fvfMap[matchedKey], matched: true, usedDefault: false,
      matchedKey: matchedKey, requested: candidates.length ? candidates[0] : '',
      configMissing: cfg.configMissing, placeholderUnfilled: !!cfg.placeholderUnfilled, source: cfg.source,
    };
  }
  return {
    fvf: cfg.defaultFvf, matched: false, usedDefault: true,
    matchedKey: BRAIN_DEFAULT_KEY, requested: candidates.length ? candidates[0] : '',
    configMissing: cfg.configMissing, placeholderUnfilled: !!cfg.placeholderUnfilled, source: cfg.source,
  };
}

// ---------- the formula ----------

/** §4.2: fees = (FVF% × SoldFor + tiered per-order fee + 0.35% regulatory) × 1.2 VAT.
 * opts: {config|account, tiers, regulatoryPct, vatMultiplier}. Money is rounded to 2dp only at
 * the end — `exact` carries the unrounded arithmetic, and the rounded breakdown parts are
 * rounded independently for display, so they need not re-sum to `fees` to the penny. */
function brainOrderEarning_(soldFor, fvf, opts) {
  const o = opts || {};
  const sold = brainRequireSoldFor_(soldFor);
  const rate = brainRequireFvf_(fvf);

  let cfg = o.config || null;
  if (!cfg && o.account) cfg = brainFeeConfig_(o.account);

  const tiers = brainNormalizeTiers_(o.tiers || (cfg ? cfg.tiers : BRAIN_FALLBACK_TIERS));
  let regPct = brainParseAmount_(o.regulatoryPct).value;
  if (!isFinite(regPct)) regPct = cfg ? cfg.regulatoryPct : BRAIN_FALLBACK_REG_PCT;
  let vatMult = brainParseAmount_(o.vatMultiplier).value;
  if (!isFinite(vatMult)) vatMult = cfg ? cfg.vatMultiplier : BRAIN_FALLBACK_VAT_MULT;
  if (!isFinite(regPct) || regPct < 0 || regPct > 1) regPct = BRAIN_FALLBACK_REG_PCT;
  if (!isFinite(vatMult) || vatMult < 1 || vatMult > 2) vatMult = BRAIN_FALLBACK_VAT_MULT;

  const fvfFee = rate * sold;
  const perOrderFee = brainTierFee_(tiers, sold);
  const regulatoryFee = regPct * sold;
  const netFees = fvfFee + perOrderFee + regulatoryFee;
  const vat = netFees * (vatMult - 1);
  const fees = netFees * vatMult;
  const orderEarning = sold - fees;

  return {
    orderEarning: brainRound2_(orderEarning),
    fees: brainRound2_(fees),
    breakdown: {
      fvfFee: brainRound2_(fvfFee),
      perOrderFee: brainRound2_(perOrderFee),
      regulatoryFee: brainRound2_(regulatoryFee),
      vat: brainRound2_(vat),
    },
    soldFor: brainRound2_(sold),
    fvf: rate,
    regulatoryPct: regPct,
    vatMultiplier: vatMult,
    perOrderTier: brainTierUsed_(tiers, sold),
    exact: { fees: fees, orderEarning: orderEarning, netFeesBeforeVat: netFees },
  };
}

/** The HUNTER's calculator output (§4.2 allowed exception): projected profit of the item they
 * are hunting, computed from the numbers they typed. The Central Main Sheet's own Profit column
 * is =ROUND(0.8*(OE−AliCost),2) — that 0.8 haircut lives in the cell, not in ⚙ Config, and is
 * deliberately NOT applied here; Brain v17 is the fee engine only. */
function brainProjectedProfit_(input) {
  const inp = input || {};
  const notes = [];
  const sold = brainRequireSoldFor_(inp.soldFor);

  const src = brainOptionalAmount_(inp.sourcePrice, 'sourcePrice');
  const ship = brainOptionalAmount_(inp.shipping, 'shipping');
  // Hunters type Source Price as a range ("3.02 - 3.30") in the live sheet; the higher end is
  // used so a projection is never rosier than the worst quoted cost.
  if (src.isRange) notes.push('Source price given as a range — the higher end (' + brainRound2_(src.value) + ') was used.');
  if (ship.isRange) notes.push('Shipping given as a range — the higher end (' + brainRound2_(ship.value) + ') was used.');

  const account = String(inp.account === null || inp.account === undefined ? '' : inp.account).trim().slice(0, BRAIN_MAX_TEXT);
  const category = String(inp.category === null || inp.category === undefined ? '' : inp.category).trim().slice(0, BRAIN_MAX_TEXT);

  const cfg = brainFeeConfig_(account);
  const fvfRes = brainFvfFromConfig_(cfg, category);
  const oe = brainOrderEarning_(sold, fvfRes.fvf, { config: cfg });

  const cost = src.value + ship.value;
  const profit = oe.exact.orderEarning - cost;
  const roiPct = cost > 0 ? (profit / cost) * 100 : null;
  if (cost <= 0) notes.push('No cost entered — ROI cannot be calculated.');
  if (fvfRes.usedDefault) {
    notes.push(category
      ? 'No FVF map entry for "' + category + '" — DEFAULT ' + fvfRes.fvf + ' was used.'
      : 'No category given — DEFAULT FVF ' + fvfRes.fvf + ' was used.');
  }

  return {
    version: BRAIN_VERSION,
    formula: BRAIN_FORMULA,
    account: account,
    category: category,
    soldFor: brainRound2_(sold),
    sourcePrice: brainRound2_(src.value),
    shipping: brainRound2_(ship.value),
    cost: brainRound2_(cost),
    orderEarning: oe.orderEarning,
    fees: oe.fees,
    profit: brainRound2_(profit),
    roiPct: roiPct === null ? null : brainRound2_(roiPct),
    breakdown: oe.breakdown,
    fvf: fvfRes.fvf,
    fvfMatched: fvfRes.matched,
    fvfUsedDefault: fvfRes.usedDefault,
    fvfMatchedKey: fvfRes.matchedKey,
    perOrderTier: oe.perOrderTier,
    configSource: cfg.source,
    configMissing: cfg.configMissing,
    notes: notes.concat(cfg.notes || []),
  };
}

// ---------- the anchor test (§4.2 / Phase-4 Definition of Done) ----------

/** £19.99 vehicle-parts → £17.15, run twice: once at the spec's 0.10 vehicle FVF, and once
 * through ABRT's live ⚙ Config so the unfilled placeholder is reported rather than papered over. */
function brainAnchorTest_() {
  return brainAnchorFor_(BRAIN_ANCHOR_ACCOUNT);
}

function brainAnchorFor_(account) {
  const acct = String(account || BRAIN_ANCHOR_ACCOUNT).trim().slice(0, BRAIN_MAX_TEXT);
  const cfg = brainReadFeeConfig_(acct, false);          // live read: a diagnostic never asserts on a cache

  // (1) The spec anchor: FVF forced to the 0.10 vehicle-parts rate.
  const specOe = brainOrderEarning_(BRAIN_ANCHOR_SOLD_FOR, BRAIN_ANCHOR_FVF, { config: cfg });
  const specPass = specOe.orderEarning === BRAIN_ANCHOR_EXPECTED;

  // (2) The live lookup. Find the non-DEFAULT slot the vehicle rate sits in; if it still holds
  // the placeholder text, no real vehicle category id is keyed and the lookup falls to DEFAULT.
  let vehicleKey = '';
  Object.keys(cfg.fvfMap).forEach(function (k) {
    if (vehicleKey) return;
    if (k.trim().toUpperCase() === BRAIN_DEFAULT_KEY) return;
    vehicleKey = k;
  });
  const placeholderFilled = !!vehicleKey && !brainKeyEq_(vehicleKey, BRAIN_VEHICLE_PLACEHOLDER);
  const liveLookupKey = placeholderFilled ? vehicleKey : BRAIN_VEHICLE_PLACEHOLDER;
  const liveFvf = brainFvfFromConfig_(cfg, liveLookupKey);
  const liveOe = brainOrderEarning_(BRAIN_ANCHOR_SOLD_FOR, liveFvf.fvf, { config: cfg });
  const liveMatchesAnchor = liveOe.orderEarning === BRAIN_ANCHOR_EXPECTED;

  const notes = [];
  notes.push('Spec anchor used FVF ' + BRAIN_ANCHOR_FVF + ' (the §4.2 vehicle-parts rate), not a looked-up value.');
  if (!placeholderFilled) {
    notes.push('The vehicle slot in ' + cfg.source + ' still reads "' + BRAIN_VEHICLE_PLACEHOLDER +
      '", so a real vehicle listing looked up by category id resolves to DEFAULT ' + cfg.defaultFvf +
      ' and earns ' + liveOe.orderEarning + ', not ' + BRAIN_ANCHOR_EXPECTED + '. The arithmetic is right; the map entry is unfilled.');
  } else {
    notes.push('The vehicle slot holds category id "' + vehicleKey + '" at FVF ' + liveFvf.fvf + '.');
  }
  if (cfg.configMissing) notes.push('Live figures below came from documented defaults, not from the sheet.');

  return {
    version: BRAIN_VERSION,
    formula: BRAIN_FORMULA,
    account: acct,
    soldFor: BRAIN_ANCHOR_SOLD_FOR,
    expected: BRAIN_ANCHOR_EXPECTED,
    pass: specPass,                                     // the Phase-4 DoD is the spec anchor
    specAnchor: {
      fvf: BRAIN_ANCHOR_FVF,
      fvfSource: '§4.2 vehicle-parts rate, supplied directly',
      orderEarning: specOe.orderEarning,
      fees: specOe.fees,
      breakdown: specOe.breakdown,
      exact: specOe.exact,
      perOrderTier: specOe.perOrderTier,
      pass: specPass,
    },
    liveAnchor: {
      fvf: liveFvf.fvf,
      fvfSource: cfg.source,
      lookupKey: liveLookupKey,
      matched: liveFvf.matched,
      usedDefault: liveFvf.usedDefault,
      orderEarning: liveOe.orderEarning,
      fees: liveOe.fees,
      breakdown: liveOe.breakdown,
      exact: liveOe.exact,
      perOrderTier: liveOe.perOrderTier,
      matchesAnchor: liveMatchesAnchor,
    },
    placeholderKey: BRAIN_VEHICLE_PLACEHOLDER,
    placeholderFilled: placeholderFilled,
    configSource: cfg.source,
    configMissing: cfg.configMissing,
    defaultFvf: cfg.defaultFvf,
    regulatoryPct: cfg.regulatoryPct,
    vatMultiplier: cfg.vatMultiplier,
    tiers: cfg.tiers,
    ranAt: now_(),
    notes: notes.concat(cfg.notes || []),
  };
}

// ---------- actions ----------

/** §4.2 allowed exception: a Product Hunter sees the projected profit of the item THEY are
 * hunting. Computed only from the numbers in this payload plus the account's fee rates — never
 * from live account data — so the result is deliberately NOT passed through stripForRole_:
 * stripping it would delete the one profit figure the hunter is entitled to. */
function actionCalcProjectedProfit_(payload, ctx) {
  const res = brainProjectedProfit_({
    soldFor: payload.soldFor,
    sourcePrice: payload.sourcePrice,
    shipping: payload.shipping,
    account: payload.account,
    category: payload.category,
  });
  res.calculatedFor = ctx.user.name;
  return res;
}

function actionAnchorTest_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const res = brainAnchorFor_(payload.account || BRAIN_ANCHOR_ACCOUNT);
  logActivity_(ctx.ident.email, 'BRAIN_ANCHOR_TEST', res.account, '',
    res.pass ? 'PASS' : 'FAIL',
    'spec ' + res.specAnchor.orderEarning + ' vs expected ' + res.expected +
    ' · live ' + res.liveAnchor.orderEarning + ' at fvf ' + res.liveAnchor.fvf +
    ' · placeholderFilled ' + res.placeholderFilled);
  return res;
}

// ---------- helpers ----------

/** Registry reality: the ABRT central sheet is registered as 'AZHAR ABRT' — bare 'ABRT' never
 * appears alone — so an exact name match is tried first and a unique containment match second.
 * Ambiguous tokens resolve to nothing rather than to a guess. */
function brainFindCentral_(account) {
  const want = brainNormAccount_(account);
  if (!want) return { id: '', name: '', why: 'no account given' };
  let exact = null;
  const partial = [];
  readTab_('CONNECTIONS').forEach(function (c) {
    if (String(c.sheet_kind) !== 'central') return;
    const name = String(c.account_name || '').trim();
    const id = String(c.spreadsheet_id || '').trim();
    const norm = brainNormAccount_(name);
    if (!norm) return;
    if (norm === want) { if (!exact) exact = { id: id, name: name }; return; }
    if (norm.indexOf(want) >= 0 || want.indexOf(norm) >= 0) partial.push({ id: id, name: name });
  });
  if (exact) return exact.id ? { id: exact.id, name: exact.name, why: '' } : { id: '', name: exact.name, why: 'the central sheet for ' + exact.name + ' is not connected yet' };
  if (partial.length === 1) return partial[0].id ? { id: partial[0].id, name: partial[0].name, why: '' } : { id: '', name: partial[0].name, why: 'the central sheet for ' + partial[0].name + ' is not connected yet' };
  if (partial.length > 1) return { id: '', name: '', why: 'the account name matches more than one connected central sheet' };
  return { id: '', name: '', why: 'no central sheet in CONNECTIONS for that account' };
}

/** SheetBridge owns business-sheet access where it is deployed; its absence must not break the
 * Brain, so the CONNECTIONS id is opened directly as a fallback. */
function brainOpenCentral_(spreadsheetId) {
  if (typeof sheetBridgeOpen_ === 'function') {
    try {
      const viaBridge = sheetBridgeOpen_('central', spreadsheetId);
      if (viaBridge) return viaBridge;
    } catch (e) { /* fall through to the direct open */ }
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function brainConfigTab_(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) if (sheets[i].getName() === BRAIN_CONFIG_TAB) return sheets[i];
  // A copied or renamed tab can carry the gear glyph with a variation selector, or lose it;
  // fall back to any tab whose name reduces to "config".
  for (let j = 0; j < sheets.length; j++) {
    if (sheets[j].getName().replace(/[^a-z0-9]/gi, '').toLowerCase() === 'config') return sheets[j];
  }
  return null;
}

function brainNormAccount_(v) {
  return String(v === null || v === undefined ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function brainNormHeader_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/£/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function brainCellText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return '';
  return String(v).trim();
}

/** Two config keys are equal if they match as trimmed text (case-insensitive) or as numbers —
 * eBay category ids arrive as both '50456' and 50456 in the same column. */
function brainKeyEq_(a, b) {
  const sa = String(a === null || a === undefined ? '' : a).trim();
  const sb = String(b === null || b === undefined ? '' : b).trim();
  if (!sa || !sb) return false;
  if (sa.toLowerCase() === sb.toLowerCase()) return true;
  const na = Number(sa), nb = Number(sb);
  return isFinite(na) && isFinite(nb) && sa !== '' && sb !== '' && na === nb;
}

/** A category may arrive as an id, a name, or the newline-separated breadcrumb the hunting sheet
 * stores ('\nElectronics\nMobile Phones & Communication\n…'); every segment is a candidate. */
function brainCategoryCandidates_(value) {
  if (value === null || value === undefined) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  const out = [raw];
  raw.split('\n').forEach(function (part) {
    const p = part.trim();
    if (p && out.indexOf(p) < 0) out.push(p);
  });
  const n = Number(raw);
  if (isFinite(n) && String(n) !== raw && out.indexOf(String(n)) < 0) out.push(String(n));
  return out;
}

/** A rate cell may hold 0.128 or 12.8 — anything above 1 is a percent typed whole. */
function brainRate_(v) {
  const p = brainParseAmount_(v).value;
  if (!isFinite(p) || p < 0) return NaN;
  const rate = p > 1 ? p / 100 : p;
  return rate >= 0 && rate <= 1 ? rate : NaN;
}

/** Accepts numbers, '£19.99', '1,234.56' and the 'x - y' ranges hunters type; a range yields its
 * higher end so nothing downstream looks cheaper than it is. */
function brainParseAmount_(value) {
  if (value === null || value === undefined || value === '') return { value: NaN, isRange: false };
  if (typeof value === 'number') return { value: isFinite(value) ? value : NaN, isRange: false };
  if (value instanceof Date) return { value: NaN, isRange: false };
  const s = String(value).replace(/[£$,\s]/g, '');
  if (!s) return { value: NaN, isRange: false };
  const range = s.match(/^(\d*\.?\d+)-(\d*\.?\d+)$/);
  if (range) {
    const lo = Number(range[1]), hi = Number(range[2]);
    if (!isFinite(lo) || !isFinite(hi)) return { value: NaN, isRange: false };
    return { value: Math.max(lo, hi), isRange: true };
  }
  const n = Number(s);
  return { value: isFinite(n) ? n : NaN, isRange: false };
}

function brainRequireSoldFor_(value) {
  const p = brainParseAmount_(value);
  if (!isFinite(p.value)) throw new Error('soldFor must be a number');
  if (p.value <= 0 || p.value > BRAIN_MAX_SOLD_FOR) throw new Error('soldFor out of range');
  return p.value;
}

function brainOptionalAmount_(value, field) {
  if (value === null || value === undefined || String(value).trim() === '') return { value: 0, isRange: false };
  const p = brainParseAmount_(value);
  if (!isFinite(p.value)) throw new Error(field + ' must be a number');
  if (p.value < 0 || p.value > BRAIN_MAX_SOLD_FOR) throw new Error(field + ' out of range');
  return p;
}

/** Percent-style rates are normalized when the config is read, so this stays strict. */
function brainRequireFvf_(value) {
  const p = brainParseAmount_(value);
  if (!isFinite(p.value) || p.value < 0 || p.value > 1) throw new Error('fvf must be a decimal between 0 and 1');
  return p.value;
}

function brainNormalizeTiers_(tiers) {
  const list = [];
  (tiers || []).forEach(function (t) {
    if (!t) return;
    const fee = brainParseAmount_(t.fee).value;
    if (!isFinite(fee) || fee < 0 || fee > 100) return;
    const up = brainParseAmount_(t.upTo).value;
    list.push({ upTo: (isFinite(up) && up > 0) ? up : BRAIN_TIER_ELSE, fee: fee });
  });
  list.sort(function (a, b) { return a.upTo - b.upTo; });
  return list;
}

/** "order total up to £X → £Y" is inclusive of X (§4.2: ≤£10 → £0.10 else £0.30). */
function brainTierFee_(tiers, soldFor) {
  for (let i = 0; i < tiers.length; i++) if (soldFor <= tiers[i].upTo) return tiers[i].fee;
  return tiers.length ? tiers[tiers.length - 1].fee : 0;
}

function brainTierUsed_(tiers, soldFor) {
  for (let i = 0; i < tiers.length; i++) {
    if (soldFor <= tiers[i].upTo) {
      return { upTo: tiers[i].upTo === BRAIN_TIER_ELSE ? null : tiers[i].upTo, fee: tiers[i].fee };
    }
  }
  if (!tiers.length) return { upTo: null, fee: 0 };
  const last = tiers[tiers.length - 1];
  return { upTo: last.upTo === BRAIN_TIER_ELSE ? null : last.upTo, fee: last.fee };
}

/** Binary floating point puts values like 2.675×100 at 267.4999…; the nudge keeps half-pennies
 * rounding away from zero instead of down at random. */
function brainRound2_(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  const scaled = Math.abs(n) * 100;
  const rounded = Math.round(scaled + (scaled * 1e-12 + 1e-9)) / 100;
  return n < 0 ? -rounded : rounded;
}

const ACTIONS_BRAIN = {
  calcProjectedProfit: [actionCalcProjectedProfit_, 'any'],
  anchorTest:          [actionAnchorTest_, 'any'],   // Management check inside
};
