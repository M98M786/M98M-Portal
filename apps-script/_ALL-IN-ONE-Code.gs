/** M98M PORTAL BACKEND — ALL-IN-ONE (Config + Seed + Setup + Auth + Router + Registry). Paste into Code.gs. */

/** M98M Portal — constants & schemas. The Sheet Contract: business sheets are read/written
 * ONLY via header-addressed columns and per-workflow whitelists; these tabs below are the
 * portal's OWN database spreadsheet ("M98M Portal DB"), created by setupDatabase(). */

const PORTAL_DB_NAME = 'M98M Portal DB';
const PROP_DB_ID = 'PORTAL_DB_ID';

// §7 — every Portal DB tab and its exact header row.
const DB_TABS = {
  USERS: ['email','name','role','shift','accounts_access','status','joined_at','approved_by','deactivated_at','notes'],
  TASKS: ['task_id','type','account','item_id','title','details','comments','assigned_by','assigned_to','priority','deadline_pkt','status','created_at','updated_at','submitted_at','submission_note','approved_by','decided_at','time_taken_min'],
  REPORTS_2H: ['report_id','email','role','shift','date','checkpoint','work_summary','count_1','count_2','count_3','count_4','submitted_at','flag'],
  HUNTING_DB: ['hunt_id','hunter_email','ts'], // + 33 real hunting cols appended at setup from HUNTING_COLS
  POTENTIAL_CPC: ['row_id','account','status','submitted_by','reviewed_by','ts','listing_item_id','item_link','date_listing_started','reason_for_selection','comments','our_price','avg_sold_price','last30_link','last90_link','main_competitor'],
  NOTIFICATIONS: ['notif_id','to','from','type','message','ref','created_at','read_at'],
  NOTICES: ['notice_id','audience','title','body','sent_by','created_at','ack_log'],
  SOPS: ['sop_id','dept','order','title','content','updated_by','updated_at'],
  STAFF_REVIEWS: ['review_id','comment','left_by','date'],
  STAFF_EVAL: ['eval_id','date','staff_name','punctuality','late_reason','breaks','absence','tasks_sheet','task_turnaround_time','work_pressure_handling','verbal_non_verbal','willing_to_learn','reaction_to_criticism','office_ethics','desk_cleaning','mobile_usage_during_work','helping_teammates','idea_generation','comments','filled_by'],
  CAMPAIGN_LOG: ['ts','account','item_id','old','new','changed_by','notified_to'],
  DASH_CACHE: ['metric','account','period','value','computed_at'],
  AGENT_QUEUE: ['job_id','kind','payload','status','created_at','started_at','done_at','result_ref','error'],
  ACTIVITY_LOG: ['ts','actor','action','target','old_value','new_value','detail'],
  CONNECTIONS: ['row_id','scope','account_name','sheet_kind','spreadsheet_id','status','notes'],
  SCHEDULES: ['email','effective_from','shift_label','work_start','work_end','break_start','break_end','working_days','assigned_by','assigned_at'],
  MESSAGES: ['msg_id','thread_id','from','to','body','sent_at','read_at','hidden'],
  RULES: ['rule_id','department','type','rule_text','added_by','added_at','status','ack_log'],
  INSTRUCTIONS: ['instr_id','instruction_text','department','date','given_by','active','ack_log'],
  SIGNALS: ['date','account','item_id','type','value','baseline','targeted_roles','acknowledged_by'],
  ATTENDANCE: ['email','date','clock_in','clock_out','working_hours','late_flag','early_flag'],
  IDEAS: ['idea_id','by','department','idea_text','submitted_at','status','management_notes'],
  DAILY_AGENDA: ['date','audience','day_targets','shoutouts','notes','set_by','set_at'],
  MEETINGS: ['meeting_id','title','datetime_pkt','duration','audience','location_link','created_by','reminder_offsets','rsvp_log'],
  CONFIG: ['key','value','updated_by','updated_at'],
};

// The 33 real hunting columns, verbatim from the live workbook (header row 1, A–AG).
const HUNTING_COLS = ['Selected By','Approval Status','Comments','Date Added','Account Selected','Listing Status','Seasonal','Main Keyword Terapeak link','Image Link of avg sold price','Image Link of Zik analytics','Terapeak overview','Temu Link','Product Link 1 Main supplier','Product Link 2','Product Link 3','Ebay Link','Title','Image Link','IMAGE','DESCRIPTION','Category','Source Price','E-Bey Caluclator + £4','CPC Selling Chance','Sell Through','Competitors','TOP THREE SALES','Total Competitors on main keyword','Price Range ANALYSIS','Sold Unit ANALYSIS','Our Profit','ROI','Comment'];

const ROLES = ['Management','Ops Head','Team Lead','Listing Manager','Advertising Manager','CS','Product Hunter','Item Lister','Order Processor','Pricing'];
const PROFIT_ROLES = ['Management','Ops Head','Team Lead','Advertising Manager','CS'];       // §4.2
const SUPER_ADMINS = ['mrhasibullah91@googlemail.com','zaidkaleem987@gmail.com'];

// §4.1 role prefill for USERS seeding (matched on normalized email).
const ROLE_PREFILL = {
  'm98mone@gmail.com':'Listing Manager', 'm98mtwo@gmail.com':'CS', 'm98mthree@gmail.com':'Pricing',
  'm98mfour@gmail.com':'Advertising Manager', 'm98mfive@gmail.com':'Product Hunter', 'm98msix@gmail.com':'Order Processor',
  'm98mseven@gmail.com':'Team Lead', 'm98meight@gmail.com':'Order Processor', 'm98mnine@gmail.com':'Order Processor',
  'm98mten@gmail.com':'Ops Head', 'm98meleven@gmail.com':'Item Lister',
};

// §5 defaults (CONFIG-overridable; [OPEN-4]).
const CONFIG_DEFAULTS = {
  checkpoints_shift1: '16:15,18:30,20:30,23:15',
  checkpoints_shift2: '23:00,01:00,04:00,06:00',
  shift1_hours: '14:15-23:15', shift1_break: '17:30-18:30',
  shift2_hours: '21:00-06:00', shift2_break: '00:00-01:00',
  late_threshold_min: '20',
  hide_order_earning_from_processors: 'false',            // [OPEN-3] default: visible as today
  super_admins: SUPER_ADMINS.join(','),
  oauth_client_id: '',                                    // set in Phase 2 — RL-1 refuses auth until set
  ai_model: 'claude-sonnet-5',
  ai_max_tokens: '4096',
  email_digest: 'false',
  submission_escalation_hours: '12',
};

// §6 connection checklist: per active account ×4 + globals ×11.
const ACCOUNT_SHEET_KINDS = ['central','order_processing','sales_analysis','account_report'];
const GLOBAL_KINDS = ['registry','ppc','potential_cpc','hunting','order_recheck','wrong_orders','cs','returns','staff_perf','staff_email','account_learnings'];

/** §4.1 mandatory email normalization: lowercase; gmail/googlemail identical; dots stripped from local part. */
function normalizeEmail(e) {
  if (!e) return '';
  e = String(e).trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 0) return e;
  let local = e.slice(0, at), domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return local + '@' + domain;
}
function isSuperAdmin(email) {
  const n = normalizeEmail(email);
  const cfg = getConfig('super_admins') || SUPER_ADMINS.join(',');
  return cfg.split(',').some(function(a){ return normalizeEmail(a) === n; });
}

/** GENERATED from the real M98M workbooks (8 Aug 2026) — verbatim seed data. Do not hand-edit; regenerate. */
const SEED = {
 "RULES": [
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Basic Rule: Search item with image, if there are top rated sellers and currently not picking up sales leave that product"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Low competition with high sales — No more than 20,000 competitors on ebay of primary keyword"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Price should be min 5 pounds for general campaign"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Min 10% General ad fees will be given to the product."
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Dynamic General campaign can be considered for the for the items with high profit"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "General campaign: Top 3 sellers on terapeak have sold more than 100 units in last 30 days"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Priority campaign: Item should be high selling on ebay and should give us consistent sales to all the competitors present on ebay — No More than 100,000 competitors on eBay"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Priority campaign: Item price should be minimum 8 pounds"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Priority campaign: High Quality Product & Images"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Priority campaign: PPC will only be considered if the item has strong sales, high-quality images, reliable supplier stock, and excellent seller feedback."
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Priority campaign: Top 3 sellers on terapeak sold more than 200 units in last 30 days"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: AliExpress is the primary supplier for this business model. Local UK suppliers can also be considered when they provide better pricing, faster delivery, or additional advantages."
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Get Product Ideas from Temu and than find supplier on aliexpress"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Item that include free shippping or in choice deals."
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Seller with min 50 pcs in stock of all variations."
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Seller rating should be more than 4.5"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Seller min sold should be 500"
  },
  {
   "department": "Hunting",
   "type": "Criteria",
   "rule_text": "Sourcing: Good feedback images & reviews"
  },
  {
   "department": "Hunting",
   "type": "Do",
   "rule_text": "Every listing must have two suppliers: one primary supplier and one backup supplier. The backup supplier should always be kept ready to ensure uninterrupted order fulfilment if the primary supplier becomes unavailable."
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Do not seach in following categories:"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "No oversized and over weight product"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "No Bladed products or grooming products should be selected"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Do not select variations with more than 3 violations on the same item"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Do not select any supplier with variations less than 50 pcs per variation and has less than 4.5 rating on Aliexpress"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Do not select items that are charging seperate shipping fees"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: No Product with trademark or logo"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Kinfes & Blades"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Perfumes"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Fashion"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: No Brand"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Appliances"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Clothing"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Shoes"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Electronics"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Food & Grocery"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Cell Phones"
  },
  {
   "department": "Hunting",
   "type": "Don't",
   "rule_text": "Banned category: Beauty & Health"
  },
  {
   "department": "Listing",
   "type": "Do",
   "rule_text": "Do the Competitor analysis first and than create listing"
  },
  {
   "department": "Listing",
   "type": "Don't",
   "rule_text": "Do not revise any top rated listing without authorization"
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Competitor analysis: Competitor analysis should be based on the highest-selling unbranded product. The item with the same product specifications should be considered the primary competitor for the product being listed."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Competitor analysis: The competitor's price, title, and description should also be used as the foundation for the item listing, with the necessary optimizations where required."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Competitor analysis: The competitor's current page ranking is the most important factor. Check whether the competitor is generating consistent sales. Only competitors with consistent sales performance should be considered as the main competitors for the product."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Title: Only the competitor's title should be used, with minimal changes. If a suitable title is not available, use the titles of the top three competitors from Terapeak, then merge the relevant keywords and product specifications to create the final title."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Title: Select the title of the highest-selling competitor."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Title: For ppc product select all the competitors of the products and than find keywords for tittle generation ."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Title: For general products just select the listing of the competitor and create the duplicate listing"
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Title: First select all the keywords of the tittle, understand the pattern of keywords, and top items"
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Description: The product description must include HTML and CSS and should be created only using the M98M Listing Tool."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Description: The description should include eBay suggested keywords, keywords from competitors' titles, and keywords from ZIK Analytics."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Description: Use ChatGPT to create a new, optimized title and to write the product content."
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Images & pricing: low to high price"
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Images & pricing: source images from temu and other google website and after that use chatgpt"
  },
  {
   "department": "Listing",
   "type": "Criteria",
   "rule_text": "Images & pricing: use For Apple , For Google instead of unbranded"
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Hold the benchmark — dashboard ROAS ≥ 5 on every account, all campaigns running."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Check ranking daily — product-page rank, relevant searches, competitor price & listing."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Rename campaigns to move tiers — it keeps the selling history."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Keep every campaign at 5–15 active listings."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Run Testing only 5 PM – 10 PM UK — close it at 10 PM sharp."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Pause Testing items at £3/day (check by 9 PM), Scaling items at £4/day — retry tomorrow."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Follow the sheet exactly. Changing it? Check price & profit first."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Take max cost-per-order from the Central Accounts Sheet."
  },
  {
   "department": "Advertising",
   "type": "Do",
   "rule_text": "Campaign ROAS ≥ 5 → raise the budget +30%."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never put one listing in two campaigns — eBay deducts CPC + General % both. This is the red line."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never transfer listings one by one between campaigns — you kill the history."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never add an item priced above £15 to Dynamic."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never let a listing eat > 15% in Dynamic — move it up to Simple General."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never break the fee gates — max 10% at £20 · 7% above £20 · 5% above £30."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never run a campaign with fewer than 5 or more than 15 listings."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never let a Testing campaign pass 2 weeks of age."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never run Testing outside 5–10 PM UK — it only creates wastage."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never change the price and the description together — description ONLY, and only when the protocol says."
  },
  {
   "department": "Advertising",
   "type": "Don't",
   "rule_text": "Never keep fixing a declining campaign beyond 1 week — rebuild it."
  },
  {
   "department": "CS",
   "type": "Don't",
   "rule_text": "Do not cancel any order, reject the order cancellation and send the item becuase it impacts the perfomance of the account that day"
  },
  {
   "department": "Order Processing",
   "type": "Do",
   "rule_text": "Check all orders after processing again , address , variation , quantity."
  },
  {
   "department": "Order Processing",
   "type": "Do",
   "rule_text": "check variation again before payment."
  },
  {
   "department": "Order Processing",
   "type": "Do",
   "rule_text": "Recheck orders according to the dates given by the organization , check if order has left china, 2 days before delivery."
  }
 ],
 "SOPS": [
  {
   "dept": "ALL",
   "order": 1,
   "title": "Organizational structure & hierarchy (v1.2)",
   "content": "{\n \"hierarchy\": {\n  \"owner\": \"Hasib Ullah — final authority and sign-off on structure, SOPs, all major decisions\",\n  \"manager\": \"Zaid Bin Kaleem — full organizational decision authority (all reports, task designation, strategies, growth, supplier connections); approves all hunted products (Approved/Not Approved on Main Sheet); entire team refers to him whenever stuck\",\n  \"primary_team_lead\": \"Yousaf Zahoor — leads day-to-day operations; half working time Product Hunting, half in Listing with Hamza\",\n  \"escalation_rule\": \"day-to-day under Primary Team Lead; anyone stuck anywhere on anything → Manager\"\n },\n \"roles\": [\n  \"1 Hasib Ullah — Owner\",\n  \"2 Zaid Bin Kaleem — Manager\",\n  \"3 Yousaf Zahoor — Primary Team Lead (Hunting · Listing)\",\n  \"4 Irfan Hassan Khan — Product Hunter\",\n  \"5 Husnain Naeem — Supervision & Accounts · Interim Senior CS\",\n  \"6 Hamza Mumtaz — Listing Manager\",\n  \"7 Muhammad Umar — Item Lister\",\n  \"8 Zain-Ul-Abideen Cheema — Advertising Manager\",\n  \"9 VACANT — Customer Service, Account Health & Order Solution\",\n  \"10 Wahab — Order Sheets & Tracking\",\n  \"11 Rana Noman — Order Processor\",\n  \"12 Zeeshan — Order Processor\"\n ],\n \"departments\": [\n  {\n   \"dept\": \"Product Hunting\",\n   \"people\": [\n    \"Yousaf Zahoor (Lead — half of working time)\",\n    \"Irfan Hassan Khan\"\n   ],\n   \"function\": \"hunt under General + Priority (PPC) criteria; sourcing links; audit account spending; duplicate listings; primary+backup supplier per listing\"\n  },\n  {\n   \"dept\": \"Supervision & Accounts\",\n   \"people\": [\n    \"Husnain Naeem\"\n   ],\n   \"function\": \"team supervision; cost analysis sheets; price upgradation; stock update; account health; profitability; overdues\"\n  },\n  {\n   \"dept\": \"Listing\",\n   \"people\": [\n    \"Hamza Mumtaz (Listing Manager)\",\n    \"Muhammad Umar (Item Lister)\",\n    \"Yousaf Zahoor (half of working time)\"\n   ],\n   \"function\": \"competitor analysis; title+keyword research; SEO/ranking/quality approval; Day 0 dummy + 72h real revision; daily listing quality report; product trend reports\"\n  },\n  {\n   \"dept\": \"Advertising\",\n   \"people\": [\n    \"Zain-Ul-Abideen Cheema\"\n   ],\n   \"function\": \"CPC + General campaigns; wastage control; Advertising SOP v2.0 (7-Tier); daily listing traffic report; issues item IDs for revision\"\n  },\n  {\n   \"dept\": \"Customer Service, Account Health & Order Solution\",\n   \"people\": [\n    \"VACANT — recruitment open; interim senior: Husnain Naeem\"\n   ],\n   \"function\": \"customer messages; requests/disputes; return+refund sheets; defects removal; negative feedback removal; rule: no order ever cancelled (reject cancellation, dispatch item)\"\n  },\n  {\n   \"dept\": \"Order Sheets & Tracking\",\n   \"people\": [\n    \"Wahab\"\n   ],\n   \"function\": \"order sheets; tracking upload; overdues; order cancellations; tracking verification on eBay accounts\"\n  },\n  {\n   \"dept\": \"Order Processing\",\n   \"people\": [\n    \"Rana Noman\",\n    \"Zeeshan\"\n   ],\n   \"function\": \"AliExpress order processing; recheck address/variation/quantity (variation re-checked before payment); 2-Stage Order Check jointly\"\n  }\n ]\n}"
  },
  {
   "dept": "Listing",
   "order": 2,
   "title": "Listing timing model (binding)",
   "content": "{\n \"model\": {\n  \"day0\": \"Muhammad Umar creates dummy listing; new listings go live 7:00 PM UK\",\n  \"plus_72h\": \"Umar revises dummy into real competitor-based listing using Hamza's title/keywords/description; revision window 1:00 PM – 5:00 PM UK\",\n  \"same_day_launch\": \"Zain adds revised listing to CPC campaign with real keywords the SAME DAY revision completes; testing window 5:00 PM – 10:00 PM UK per SOP v2.0\",\n  \"daily_loop\": \"Zain downloads listing traffic report daily → issues item IDs to Hamza for revision; Hamza downloads listing quality report daily and improves it\"\n },\n \"uk_windows\": [\n  \"1:00 PM – 5:00 PM UK — listing revision window (all revisions completed here)\",\n  \"5:00 PM – 10:00 PM UK — Testing campaigns live (open 5 PM, close 10 PM sharp; peak sales hours; outside = wastage only)\",\n  \"7:00 PM UK — new (Day 0 dummy) listings go live\",\n  \"By 9:00 PM UK — wastage check: Testing £3/item/day, Scaling £4/item/day (SOP text pins 9 PM to the Testing cap)\",\n  \"10:00 PM UK — Testing campaigns closed\"\n ],\n \"hamza_report\": [\n  \"CPC item selection\",\n  \"General campaign percentage\",\n  \"keywords\",\n  \"blacklisted keywords\"\n ]\n}"
  },
  {
   "dept": "Hunting",
   "order": 3,
   "title": "Hunting criteria (org doc)",
   "content": "{\n \"general\": {\n  \"competitors_max\": 20000,\n  \"min_price_gbp\": 5,\n  \"min_general_fee_pct\": 10,\n  \"dynamic_option\": \"Dynamic General may be considered for high-profit items\",\n  \"terapeak\": \"top 3 sellers 100+ units / last 30 days\"\n },\n \"ppc\": {\n  \"competitors_max\": 100000,\n  \"min_price_gbp\": 8,\n  \"requirements\": \"high-quality product+images; strong sales, reliable supplier stock, excellent seller feedback\",\n  \"terapeak\": \"top 3 sellers 200+ units / last 30 days\"\n },\n \"sourcing\": \"AliExpress primary (UK local if better price/delivery); ideas from Temu → supplier found on AliExpress; free shipping/Choice preferred; ≥50 pcs per variation; supplier rating >4.5 with ≥500 sold; TWO suppliers per listing (primary + backup)\",\n \"restricted_categories\": \"trademark/logo items; Knives & Blades; Perfumes; Fashion; No Brand; Appliances; Clothing; Shoes; Electronics; Food & Grocery; Cell Phones; Beauty & Health\"\n}"
  },
  {
   "dept": "Advertising",
   "order": 4,
   "title": "Main target & Rule Zero daily checks",
   "content": "{\n \"target\": \"Dashboard ROAS ≥ 5 on every account with all campaigns running; equivalently total ad spend ≤ 1/5th of ad sales; dashboard below 5 → open campaigns one by one and fix the weak ones; check first every day\",\n \"rule_zero\": [\n  \"where our item ranks on the product page\",\n  \"item showing on relevant searches\",\n  \"competitor's price vs ours\",\n  \"competitor's listing better than ours → fix ours\"\n ],\n \"red_line\": \"NEVER put the same listing in two campaigns — one sale would incur CPC fee AND General ad % (double fees). Move tiers by renaming the campaign or removing from the old one first; one listing = one home\"\n}"
  },
  {
   "dept": "Advertising",
   "order": 5,
   "title": "The 8 Laws (SOP v2.0)",
   "content": "[\n \"1. CPC bid range: £0.20 – £0.23. Every new Testing item starts at £0.20. Raise slowly, only with time.\",\n \"2. Campaign size: minimum 5, maximum 15 active listings. Fewer than 5 = wastage. More than 15 = make a new campaign.\",\n \"3. To move a tier, RENAME the campaign. Never move listings one by one — renaming keeps the selling history alive.\",\n \"4. One listing lives in ONE campaign only. Duplication is the red line — eBay charges double fees.\",\n \"5. Testing campaigns run only 5 PM – 10 PM UK. Closed outside these hours.\",\n \"6. Use smart keyword targeting on every CPC campaign — always improving, never on autopilot.\",\n \"7. Maximum cost-per-order for each listing comes from the Central Accounts Sheet. Check it before spending.\",\n \"8. ROAS must rise as a listing gets older — selling history builds it up. An old listing with flat ROAS is a warning sign.\"\n]"
  },
  {
   "dept": "Advertising",
   "order": 6,
   "title": "7-Tier Campaign System",
   "content": "{\n \"1_TOP_LISTINGS\": {\n  \"type\": \"CPC\",\n  \"entry\": \"RENAME a Scaling campaign when its items hold ROAS 6+ (ENTER AT ROAS ≥ 6)\",\n  \"budget\": \"£100–150/day\",\n  \"settle\": \"at least 1 week, no panic on daily dips\",\n  \"wastage\": \"NO per-item cap — earned trust; watch weekly trend\",\n  \"decline_order\": [\n   \"cut price £0.30, watch product-page rank\",\n   \"Listing Manager revises description ONLY\",\n   \"major decline → STOP, the Manager decides — Ad Manager never handles a major Top decline alone\"\n  ]\n },\n \"2_SCALING\": {\n  \"type\": \"CPC\",\n  \"entry\": \"RENAME the Testing campaign (ENTER AT ROAS ≥ 5); same campaign new name, selling history stays\",\n  \"budget\": \"£50–80/day; scale by raising budget step by step\",\n  \"settle\": \"at least 5 days\",\n  \"wastage\": \"£4 per item per day — spent £4 no sale → pause, try again tomorrow\",\n  \"decline_order\": [\n   \"cut price £0.20, give time to react\",\n   \"description ONLY revision\",\n   \"still down → price <£15 → Dynamic General, ≥£15 → Simple General at sheet % — remove from here first\"\n  ]\n },\n \"3_TESTING\": {\n  \"type\": \"CPC\",\n  \"entry\": \"entry point — every new CPC item starts here at £0.20 bid with smart keyword targeting\",\n  \"budget\": \"£10–20/day\",\n  \"stay\": \"STAY IF ROAS ≥ 4 (only until 2-week limit)\",\n  \"hours\": \"runs ONLY 5 PM – 10 PM UK; close at 10 PM every day, open again 5 PM; before/after = wastage\",\n  \"wastage\": \"£3 per item per day, check by 9 PM UK — £3 no sale → pause, try again tomorrow\",\n  \"max_age\": \"campaign never older than 2 weeks — by then every item renamed up or moved out\",\n  \"verdict_after_4_days\": {\n   \"ROAS≈5 (close)\": \"→ SCALING — rename campaign, raise budget\",\n   \"ROAS 4–4.9\": \"→ stays here (until 2-week limit)\",\n   \"ROAS<4 & price<£15\": \"→ DYNAMIC (remove from Testing first)\",\n   \"ROAS<4 & price≥£15\": \"→ SIMPLE GENERAL at the % written in the sheet\"\n  }\n },\n \"4_SEASONAL\": {\n  \"type\": \"CPC\",\n  \"entry\": \"Product Hunter marks item with a seasonal tag — tag alone is enough, NO ROAS gate\",\n  \"budget\": \"£10/day\",\n  \"rules\": \"same bid range/CPC rules (£0.20–0.23, smart targeting)\",\n  \"special\": \"iPhone cases & hot seasonal items: only 2 days of wastage allowed — watch closely, decide fast (keep or move out)\"\n },\n \"5_SIMPLE_GENERAL\": {\n  \"type\": \"General\",\n  \"entry\": \"items priced ABOVE £15\",\n  \"fee\": \"exact % written in the sheet (set by Product Hunter / Listing Manager per item); different % → first check price and profit, never guess; every % respects the Fee % Gates\"\n },\n \"6_DYNAMIC_GENERAL\": {\n  \"type\": \"General\",\n  \"entry\": \"home for CPC failures — items that did not work in CPC AND priced under £15 ONLY\",\n  \"rules\": [\n   \"NEVER add an item priced above £15 — no exceptions\",\n   \"any listing eating more than 15% of its price → move up to Simple General at sheet %, remove from Dynamic first — one home only\"\n  ]\n },\n \"7_SALES_PICK\": {\n  \"type\": \"CPC\",\n  \"entry\": \"dedicated push campaign for specially picked sales items\",\n  \"budget\": \"£30/day\",\n  \"rules\": \"same CPC rules: bid £0.20–0.23, smart keyword targeting, 5–15 listings, red line applies\"\n }\n}"
  },
  {
   "dept": "Advertising",
   "order": 7,
   "title": "Fee gates & budgets",
   "content": "{\n \"fee_gates\": {\n  \"under_20\": \"10%+ ALLOWED — cheap items may be given more than 10% general fees\",\n  \"exactly_20\": \"MAX 10% — hard ceiling\",\n  \"20_to_30\": \"RUN AT 7%\",\n  \"over_30\": \"RUN AT 5%\",\n  \"applies_to\": \"ALL General campaigns\"\n },\n \"budgets\": {\n  \"1_TOP\": \"£100–150\",\n  \"2_SCALING\": \"£50–80\",\n  \"7_SALES_PICK\": \"£30\",\n  \"3_TESTING\": \"£10–20\",\n  \"4_SEASONAL\": \"£10\",\n  \"small_accounts\": \"HALF of these budgets\",\n  \"general_campaigns\": \"no daily budget — pay % per sale\"\n }\n}"
  },
  {
   "dept": "Advertising",
   "order": 8,
   "title": "Team sequence & campaign control",
   "content": "{\n \"sequence\": [\n  \"1 Product Hunter — picks campaign type per product; decides CPC or General (PPC selection); sets general % for General items\",\n  \"2 Listing Manager — sends Item-ID sheets (CPC + General) to Ad Manager; revises description ONLY when a campaign protocol asks\",\n  \"3 Advertising Manager — adds every item exactly as the sheet says; changes require price & profit check first; runs all daily checks/protocols\",\n  \"4 Claude (Weekly) — builds the weekly CPC data sheet for every account; lists what to pause, scale, rename, re-price or move; Ad Manager executes it → dashboard judged vs ROAS ≥ 5 = one full weekly cycle\"\n ],\n \"control\": {\n  \"declining_campaign\": \"fix max 1 week → REBUILD: 1 create duplicate campaign, 2 pause old, 3 new picks up sales, 4 end old\",\n  \"out_of_budget\": \"1 increase budget → 2 still showing → eBay ERROR → make duplicate campaign; never leave stuck (stops showing items)\",\n  \"winning\": \"campaign ROAS ≥ 5 → raise budget +30% (or as situation needs); keep raising step by step while ROAS holds ≥5\",\n  \"size\": \"<5 = wastage; 5–15 healthy; >15 = create a new campaign for the extra items\"\n }\n}"
  }
 ],
 "INSTRUCTIONS": [],
 "STAFF": [
  {
   "name": "Hamza Mumtaz",
   "email": "m98mone@gmail.com"
  },
  {
   "name": "Husnain Naeem",
   "email": "m98mtwo@gmail.com"
  },
  {
   "name": "Ubaid Kaleem",
   "email": "m98mthree@gmail.com"
  },
  {
   "name": "Zain",
   "email": "m98mfour@gmail.com"
  },
  {
   "name": "Irfan Hassan Khan",
   "email": "m98mfive@gmail.com"
  },
  {
   "name": "Zeeshan ",
   "email": "m98msix@gmail.com"
  },
  {
   "name": "Yousaf Bhai ",
   "email": "m98mseven@gmail.com"
  },
  {
   "name": "Wahab",
   "email": "m98meight@gmail.com"
  },
  {
   "name": "Rana Noman ",
   "email": "m98mnine@gmail.com"
  },
  {
   "name": "Fasieh-Ul-Hassan ",
   "email": "m98mten@gmail.com"
  },
  {
   "name": "Muhammad Umar",
   "email": "m98meleven@gmail.com"
  }
 ],
 "CPC_MASTHEAD": "MASTER DO & DON'T — PIN THIS ON THE WALL (the whole SOP in one glance)",
 "HUNTING_BANNER": "Crieteria of Product Hunting "
};

/** Phase 1 — setupDatabase(): builds the M98M Portal DB spreadsheet (every §7 tab),
 * seeds USERS from the real staff list, CONFIG defaults, and RULES/SOPS from SEED
 * (verbatim from the Do's & Don'ts workbook + Organizational Structure doc).
 * Idempotent: safe to run again — creates only what's missing, never duplicates seeds. */

function setupDatabase() {
  const ss = getPortalDb_(true);
  const created = [], seeded = [];

  Object.keys(DB_TABS).forEach(function(name) {
    let headers = DB_TABS[name];
    if (name === 'HUNTING_DB') headers = headers.concat(HUNTING_COLS);
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); created.push(name); }
    if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  // CONFIG defaults — only keys that don't exist yet.
  const cfg = ss.getSheetByName('CONFIG');
  const have = {};
  cfg.getDataRange().getValues().slice(1).forEach(function(r){ if (r[0]) have[r[0]] = true; });
  Object.keys(CONFIG_DEFAULTS).forEach(function(k) {
    if (!have[k]) { cfg.appendRow([k, CONFIG_DEFAULTS[k], 'setup', now_()]); seeded.push('CONFIG:' + k); }
  });

  seedUsers_(ss, seeded);
  seedFromSeedGs_(ss, seeded);

  logActivity_('setup', 'setupDatabase', PORTAL_DB_NAME, '', '', 'created:[' + created.join(',') + '] seeded:' + seeded.length);
  const msg = 'Portal DB ready: ' + ss.getUrl() + '\nTabs created: ' + (created.join(', ') || 'none (already existed)') + '\nSeeded: ' + seeded.length + ' items';
  Logger.log(msg);
  return msg;
}

/** USERS: 11 staff prefilled per §4.1 as pending + 2 super admins approved. */
function seedUsers_(ss, seeded) {
  const sh = ss.getSheetByName('USERS');
  const existing = {};
  sh.getDataRange().getValues().slice(1).forEach(function(r){ if (r[0]) existing[normalizeEmail(r[0])] = true; });
  SEED.STAFF.forEach(function(s) {
    const em = normalizeEmail(s.email);
    if (existing[em]) return;
    sh.appendRow([s.email.trim(), s.name.trim(), ROLE_PREFILL[em] || '', '', 'per-role', 'pending', now_(), '', '', 'seeded §4.1']);
    seeded.push('USER:' + em);
  });
  SUPER_ADMINS.forEach(function(e) {
    if (existing[normalizeEmail(e)]) return;
    sh.appendRow([e, e.indexOf('mrhasibullah') === 0 ? 'Hasib' : 'Zaid', 'Management', '', 'ALL', 'approved', now_(), 'setup', '', 'super admin']);
    seeded.push('USER:' + normalizeEmail(e));
  });
}

/** RULES + SOPS from the generated SEED (only when the tab has no data yet). */
function seedFromSeedGs_(ss, seeded) {
  const rules = ss.getSheetByName('RULES');
  if (rules.getLastRow() < 2 && typeof SEED !== 'undefined') {
    const rows = SEED.RULES.map(function(r, i) {
      return ['R' + String(i + 1).padStart(3, '0'), r.department, r.type, r.rule_text, 'seed (Do\'s & Don\'ts workbook)', now_(), 'active', ''];
    });
    if (rows.length) { rules.getRange(2, 1, rows.length, rows[0].length).setValues(rows); seeded.push('RULES:' + rows.length); }
  }
  const sops = ss.getSheetByName('SOPS');
  if (sops.getLastRow() < 2 && typeof SEED !== 'undefined') {
    const rows = SEED.SOPS.map(function(s, i) {
      return ['S' + String(i + 1).padStart(2, '0'), s.dept, s.order, s.title, s.content, 'seed (org doc v1.2 + Advertising SOP v2.0)', now_()];
    });
    if (rows.length) { sops.getRange(2, 1, rows.length, rows[0].length).setValues(rows); seeded.push('SOPS:' + rows.length); }
  }
}

/** Phase 1 DoD: one-line Anthropic test — proves the key works. Reads key from Script Properties ONLY (RL-2). */
function testAnthropicKey() {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return 'NO KEY: add ANTHROPIC_API_KEY in Project Settings → Script Properties';
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: getConfig('ai_model') || 'claude-sonnet-5', max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with exactly: M98M AI LIVE' }] }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  const body = JSON.parse(resp.getContentText() || '{}');
  const text = body.content && body.content[0] && body.content[0].text;
  logActivity_('setup', 'testAnthropicKey', 'anthropic', '', '', 'http ' + code);
  return code === 200 ? 'AI LIVE ✅ — model replied: ' + text : 'FAILED http ' + code + ' — check the key (details in ACTIVITY_LOG only)';
}

// ---------- shared helpers ----------
function getPortalDb_(createIfMissing) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_DB_ID);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* fall through */ } }
  if (!createIfMissing) throw new Error('Portal DB not initialised — run setupDatabase()');
  const found = DriveApp.getFilesByName(PORTAL_DB_NAME);
  const ss = found.hasNext() ? SpreadsheetApp.open(found.next()) : SpreadsheetApp.create(PORTAL_DB_NAME);
  props.setProperty(PROP_DB_ID, ss.getId());
  return ss;
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Karachi', "yyyy-MM-dd'T'HH:mm:ss'+05:00'"); }
function getConfig(key) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('cfg_' + key);
  if (hit !== null) return hit;
  const sh = getPortalDb_(false).getSheetByName('CONFIG');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === key) { cache.put('cfg_' + key, String(rows[i][1]), 300); return String(rows[i][1]); }
  return '';
}
/** RL-6: append-only activity log, locked. Detail stays server-side (RL-9). */
function logActivity_(actor, action, target, oldV, newV, detail) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    getPortalDb_(true).getSheetByName('ACTIVITY_LOG').appendRow([now_(), actor, action, target, String(oldV).slice(0, 500), String(newV).slice(0, 500), String(detail || '').slice(0, 1000)]);
  } finally { lock.releaseLock(); }
}

/** Phase 2 — auth, registration/approval, home-screen reads, and the profit-stripping
 * middleware (RL-4). Registration writes a pending USERS row; Management approves.
 * Profit / PII / Learnings are removed from payloads server-side for restricted roles. */

const MGMT_ROLES = ['Management', 'Ops Head'];
// RL-4 — fields stripped from any record before it leaves the server for a restricted role.
const PROFIT_FIELDS = ['Our Profit', 'ROI', 'Profit', 'Order Earning', 'order_earning', 'profit', 'roi',
  'Raw Profit', 'Actual Profit', 'margin', 'Margin', 'earning', 'Earning', 'Our price net', 'net_after_cpc'];
const PII_FIELDS = ['Full Address', 'Post to name', 'Post to address 1', 'Post to address 2', 'Post to city',
  'Post to county', 'Post to postcode', 'Post to phone', 'Email', 'buyer', 'Buyer', 'Customer Address Detail'];

function roleDept_(role) {
  switch (role) {
    case 'Product Hunter': return 'Hunting';
    case 'Item Lister': case 'Listing Manager': return 'Listing';
    case 'Advertising Manager': return 'Advertising';
    case 'CS': return 'CS';
    case 'Order Processor': return 'Order Processing';
    default: return '*';                                   // Management/Ops Head/Team Lead/Pricing see all
  }
}
function isMgmt_(role, email) { return isSuperAdmin(email) || MGMT_ROLES.indexOf(role) >= 0; }
function canSeeProfit_(role) { return PROFIT_ROLES.indexOf(role) >= 0; }

/** RL-4 middleware — strip disallowed keys from an array/object of records for this role. */
function stripForRole_(records, role, email) {
  const profitOk = canSeeProfit_(role);
  const piiOk = (role === 'CS' || role === 'Order Processor' || isMgmt_(role, email));
  if (profitOk && piiOk) return records;
  const scrub = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    Object.keys(obj).forEach(function (k) {
      if (!profitOk && PROFIT_FIELDS.indexOf(k) >= 0) return;
      if (!piiOk && PII_FIELDS.indexOf(k) >= 0) return;
      out[k] = obj[k];
    });
    return out;
  };
  return Array.isArray(records) ? records.map(scrub) : scrub(records);
}

// ---------- public ----------
function actionGetPublicConfig_() {
  return { oauth_client_id: getConfig('oauth_client_id'), roles: ROLES, service: 'M98M Portal', phase: 2 };
}

// ---------- token-level ----------
function actionWhoami_(payload, ctx) {
  const email = ctx.ident.email;
  if (isSuperAdmin(email)) {
    const su = ctx.user || {};
    return { status: 'approved', email: email, name: su.name || ctx.ident.name, role: 'Management', shift: su.shift || '', accounts: 'ALL', isSuper: true };
  }
  if (!ctx.user) return { status: 'none', email: email, name: ctx.ident.name, prefillRole: ROLE_PREFILL[normalizeEmail(email)] || '' };
  const u = ctx.user;
  return { status: u.status, email: u.email, name: u.name, role: u.role, shift: u.shift, accounts: u.accounts };
}

function actionRegister_(payload, ctx) {
  const email = ctx.ident.email, name = ctx.ident.name;
  if (ctx.user && ctx.user.status === 'approved') return { status: 'approved', email: email, name: ctx.user.name, role: ctx.user.role, shift: ctx.user.shift, accounts: ctx.user.accounts };
  let role = String(payload.role || '');
  if (ROLES.indexOf(role) < 0) role = ROLE_PREFILL[normalizeEmail(email)] || 'Item Lister';
  let shift = String(payload.shift || 'Custom');
  if (['Shift 1', 'Shift 2', 'Custom'].indexOf(shift) < 0) shift = 'Custom';

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getPortalDb_(false).getSheetByName('USERS');
    const rows = sh.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) if (normalizeEmail(rows[i][0]) === normalizeEmail(email)) { rowIdx = i + 1; break; }
    if (rowIdx > 0) {
      const old = sh.getRange(rowIdx, 3, 1, 4).getValues()[0]; // role, shift, accounts, status
      sh.getRange(rowIdx, 3).setValue(role);
      sh.getRange(rowIdx, 4).setValue(shift);
      if (String(old[3]) !== 'approved') sh.getRange(rowIdx, 6).setValue('pending');
      logActivity_(email, 'REGISTER_UPDATE', email, old.join('|'), role + '|' + shift, 'requested');
    } else {
      sh.appendRow([email, name, role, shift, 'per-role', 'pending', now_(), '', '', 'self-registered']);
      logActivity_(email, 'REGISTER_NEW', email, '', role + '|' + shift, 'self-registered');
    }
  } finally { lock.releaseLock(); }

  notifyManagement_('New staff registration', name + ' (' + email + ') requested ' + role + ' · ' + shift, 'register:' + email);
  return { status: 'pending', email: email, name: name, role: role, shift: shift };
}

// ---------- approved-user reads ----------
function actionTodayAgenda_(payload, ctx) {
  const today = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
  const dept = roleDept_(ctx.user.role);
  const rows = readTab_('DAILY_AGENDA');
  const items = [];
  rows.forEach(function (r) {
    const d = String(r.date).slice(0, 10);
    if (d !== today) return;
    const aud = String(r.audience || 'ALL');
    if (aud !== 'ALL' && aud !== dept && normalizeEmail(aud) !== normalizeEmail(ctx.ident.email)) return;
    if (r.day_targets) items.push(String(r.day_targets));
    if (r.notes) items.push(String(r.notes));
    if (r.shoutouts) items.push('🎉 ' + String(r.shoutouts));
  });
  return { items: items };
}

function actionMyRules_(payload, ctx) {
  const dept = roleDept_(ctx.user.role);
  const rows = readTab_('RULES');
  const rules = rows.filter(function (r) {
    if (String(r.status) !== 'active') return false;
    const d = String(r.department || 'ALL');
    return d === 'ALL' || dept === '*' || d === dept;
  }).map(function (r) { return { type: r.type, rule_text: r.rule_text, department: r.department }; });
  return { rules: rules };
}

function actionSubmitIdea_(payload, ctx) {
  const idea = String(payload.idea || '').trim();
  if (!idea) throw new Error('empty idea');
  const dept = roleDept_(ctx.user.role);
  getPortalDb_(false).getSheetByName('IDEAS').appendRow(['I' + Utilities.getUuid().slice(0, 8), ctx.user.name, dept, idea, now_(), 'new', '']);
  notifyManagement_('New idea submitted', ctx.user.name + ' shared an idea', 'idea');
  logActivity_(ctx.ident.email, 'SUBMIT_IDEA', 'IDEAS', '', idea.slice(0, 80), '');
  return { ok: true };
}

// ---------- management ----------
function actionListPending_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  return { pending: readTab_('USERS').filter(function (u) { return String(u.status) === 'pending'; })
    .map(function (u) { return { email: u.email, name: u.name, role: u.role, shift: u.shift }; }) };
}

function actionApproveUser_(payload, ctx) {
  if (!isMgmt_(ctx.user.role, ctx.ident.email)) throw authErr_('not management', ctx.ident.email);
  const target = normalizeEmail(payload.email || '');
  const sh = getPortalDb_(false).getSheetByName('USERS');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === target) {
      const old = rows[i].slice();
      if (payload.role && ROLES.indexOf(payload.role) >= 0) sh.getRange(i + 1, 3).setValue(payload.role);
      if (payload.shift) sh.getRange(i + 1, 4).setValue(payload.shift);
      if (payload.accounts) sh.getRange(i + 1, 5).setValue(payload.accounts);
      sh.getRange(i + 1, 6).setValue('approved');
      sh.getRange(i + 1, 8).setValue(ctx.ident.email);
      logActivity_(ctx.ident.email, 'APPROVE_USER', rows[i][0], old[5], 'approved', payload.role || rows[i][2]);
      notify_(rows[i][0], 'Welcome to the M98M Portal', 'Your access is approved. Role: ' + (payload.role || rows[i][2]) + '.', 'approved');
      return { ok: true, email: rows[i][0] };
    }
  }
  throw new Error('user not found');
}

// ---------- helpers ----------
function readTab_(name) {
  const vals = getPortalDb_(false).getSheetByName(name).getDataRange().getValues();
  if (vals.length < 2) return [];
  const head = vals[0];
  return vals.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}
function notify_(toEmail, type, message, ref) {
  getPortalDb_(false).getSheetByName('NOTIFICATIONS').appendRow(['N' + Utilities.getUuid().slice(0, 8), toEmail, 'system', type, message, ref || '', now_(), '']);
}
function notifyManagement_(type, message, ref) {
  const mgmt = readTab_('USERS').filter(function (u) { return MGMT_ROLES.indexOf(u.role) >= 0 && String(u.status) === 'approved'; }).map(function (u) { return u.email; });
  SUPER_ADMINS.forEach(function (e) { if (mgmt.indexOf(e) < 0) mgmt.push(e); });
  mgmt.forEach(function (e) { notify_(e, type, message, ref); });
}

/** RL-1 deny-by-default action router. Identity comes ONLY from a Google ID token verified
 * server-side on every request (signature via Google tokeninfo, audience, expiry). Any
 * email/role posted by the client is ignored. Unknown action → rejected. Errors to the
 * browser are generic (RL-9); details go to ACTIVITY_LOG.
 *
 * Access levels: 'public' (no token) | 'token' (valid Google identity, any portal status)
 *              | 'any' (approved user) | 'super' (super admin). */

const ACTIONS = {
  ping:             [actionPing_, 'public'],
  getPublicConfig:  [actionGetPublicConfig_, 'public'],
  whoami:           [actionWhoami_, 'token'],
  register:         [actionRegister_, 'token'],
  todayAgenda:      [actionTodayAgenda_, 'any'],
  myRules:          [actionMyRules_, 'any'],
  submitIdea:       [actionSubmitIdea_, 'any'],
  // management / super
  listPending:      [actionListPending_, 'any'],   // gated to mgmt inside
  approveUser:      [actionApproveUser_, 'any'],
  importRegistry:   [actionImportRegistry_, 'super'],
  connectionHealth: [actionConnectionHealth_, 'any'],
};

function doPost(e) {
  let req = {};
  try {
    req = JSON.parse(e.postData && e.postData.contents || '{}');
    const entry = ACTIONS[req.action];
    if (!entry) return out_({ ok: false, error: 'unknown action' }, 'REJECT unknown action', req);

    let ident = null, user = null;
    if (entry[1] !== 'public') {
      ident = verifyGoogleToken_(req.idToken);              // RL-1: throws on any token failure
      rateLimit_(ident.email);
      user = loadUser_(ident.email);                        // may be null (not registered)
      if (entry[1] === 'any' || entry[1] === 'super') {
        if (!user || user.status !== 'approved') throw authErr_('not approved', ident.email);
        if (isSuperAdmin(ident.email)) user.role = 'Management';
        if (entry[1] === 'super' && !isSuperAdmin(ident.email)) throw authErr_('not super admin', ident.email);
      }
    }
    if (req.idem && seenIdem_(req.idem)) return out_({ ok: true, idempotent: true }, null, req);
    const ctx = { ident: ident, user: user };
    const data = entry[0](req.payload || {}, ctx);
    if (req.idem) markIdem_(req.idem);
    return out_({ ok: true, data: data }, null, req);
  } catch (err) {
    logActivity_('router', 'ERROR:' + (req.action || '?'), (req && req.action) || '', '', '', String(err && err.stack || err));
    return out_({ ok: false, error: (String(err.message) === 'auth' ? 'auth' : 'request failed') }, null, req);
  }
}
function doGet() { return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'M98M Portal', ts: now_() })).setMimeType(ContentService.MimeType.JSON); }

/** RL-1 identity: verify Google ID token (signature+aud+exp via Google), return {email,name,...}. */
function verifyGoogleToken_(idToken) {
  if (!idToken) throw authErr_('no token', '');
  const clientId = getConfig('oauth_client_id');
  if (!clientId) throw authErr_('oauth_client_id not configured', '');
  const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw authErr_('token rejected by Google', '');
  const t = JSON.parse(resp.getContentText());
  if (t.aud !== clientId) throw authErr_('audience mismatch', t.email || '');
  if (Number(t.exp) * 1000 < Date.now()) throw authErr_('token expired', t.email || '');
  if (String(t.email_verified) !== 'true') throw authErr_('email not verified', t.email || '');
  return { email: t.email, name: t.name || t.given_name || t.email, given_name: t.given_name || '', picture: t.picture || '' };
}

/** Load the USERS row for a (normalized) email, or null. */
function loadUser_(email) {
  const n = normalizeEmail(email);
  const rows = getPortalDb_(false).getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalizeEmail(rows[i][0]) === n) {
      return { email: rows[i][0], name: rows[i][1], role: rows[i][2], shift: rows[i][3], accounts: rows[i][4], status: rows[i][5], row: i + 1 };
    }
  }
  return null;
}
function authErr_(why, email) { logActivity_('auth', 'AUTH_FAIL', email, '', '', why); return new Error('auth'); }

function rateLimit_(email) {
  const c = CacheService.getScriptCache(), k = 'rl_' + normalizeEmail(email);
  const n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 60);
  if (n > 90) throw authErr_('rate limit', email);
}
function seenIdem_(key) { return CacheService.getScriptCache().get('idem_' + key) === '1'; }
function markIdem_(key) { CacheService.getScriptCache().put('idem_' + key, '1', 21600); }
function out_(obj, logMsg, req) {
  if (logMsg) logActivity_('router', logMsg, (req && req.action) || '', '', '', '');
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function actionPing_() { return { service: 'M98M Portal', phase: 2, ts: now_() }; }
function actionImportRegistry_(payload, ctx) { return importRegistry(String(payload.registryId || ''), ctx.ident.email); }
function actionConnectionHealth_(payload, ctx) { return connectionHealth(); }

/** §6 — CONNECTIONS import from Hasib's "Central Sheets" registry spreadsheet.
 * Reality (verified 8 Aug 2026): 5 of 6 tabs are `Name | Sheet Link` (with trailing spaces
 * in headers); "Staff Sheets" is a staff→email registry, NOT links — skipped here.
 * Missing links (Sir Hasib order/sales/report, Azhar Bhai order-processing) surface as
 * "not connected yet" — never errors. */

const REGISTRY_TAB_KINDS = {
  'Account Management Sheets': { scope: 'account', kind: 'central' },
  'Order Processing Sheets':   { scope: 'account', kind: 'order_processing' },
  'Sales Analysis Sheets':     { scope: 'account', kind: 'sales_analysis' },
  'Daily Account Report Sheets': { scope: 'account', kind: 'account_report' },
  'Staff Working Sheets':      { scope: 'global', kind: null }, // kind inferred per row name
};
const GLOBAL_NAME_HINTS = [
  // Spellings verified against the live registry 8 Aug 2026 ("Perfomance", "Costumer").
  [/ppc|advertis/i, 'ppc'], [/potential/i, 'potential_cpc'], [/hunt/i, 'hunting'],
  [/recheck|order check/i, 'order_recheck'], [/wrong/i, 'wrong_orders'],
  [/c[ou]st[ou]mer service|(^|\s)cs(\s|$)/i, 'cs'], [/return|refund/i, 'returns'],
  [/^staff.*perfo?r?mance/i, 'staff_perf'], [/email/i, 'staff_email'], [/learning/i, 'account_learnings'],
];

function importRegistry(registrySpreadsheetId, actor) {
  if (!registrySpreadsheetId) throw new Error('registryId required');
  const reg = SpreadsheetApp.openById(registrySpreadsheetId);
  const db = getPortalDb_(false);
  const conn = db.getSheetByName('CONNECTIONS');
  const existing = {};                                    // key scope|account|kind → row #
  const rows = conn.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) existing[rows[i][1] + '|' + rows[i][2] + '|' + rows[i][3]] = i + 1;

  // The registry itself is a global connection.
  upsert_(conn, existing, 'global', '', 'registry', registrySpreadsheetId, 'linked', 'Central Sheets registry');

  let imported = 0, skipped = [];
  reg.getSheets().forEach(function(sh) {
    const tab = sh.getName().trim();
    const map = REGISTRY_TAB_KINDS[tab];
    if (!map) { if (tab !== 'Staff Sheets') skipped.push(tab); return; }
    sh.getDataRange().getValues().slice(1).forEach(function(r) {
      const name = String(r[0] || '').trim();
      const link = String(r[1] || '').trim();
      if (!name) return;
      const id = extractSheetId_(link);
      const kind = map.kind || inferGlobalKind_(name);
      if (!kind) { skipped.push(tab + ':' + name); return; }
      const scope = map.scope;
      const account = scope === 'account' ? name : '';
      upsert_(conn, existing, scope, account, kind, id, id ? 'linked' : 'not connected yet', name);
      imported++;
    });
  });
  logActivity_(actor || 'system', 'importRegistry', registrySpreadsheetId, '', '', 'imported ' + imported + ' skipped ' + skipped.join('; '));
  return { imported: imported, skipped: skipped, health: connectionHealth() };
}

function upsert_(conn, existing, scope, account, kind, id, status, notes) {
  const key = scope + '|' + account + '|' + kind;
  const row = ['C' + Utilities.getUuid().slice(0, 8), scope, account, kind, id || '', status, notes || ''];
  if (existing[key]) {
    const keep = conn.getRange(existing[key], 1, 1, 7).getValues()[0];
    row[0] = keep[0];
    if (String(keep[4]) !== String(id || '')) logActivity_('registry', 'CONNECTION_CHANGE', key, keep[4], id || '', notes || '');
    conn.getRange(existing[key], 1, 1, 7).setValues([row]);
  } else {
    conn.appendRow(row);
    existing[key] = conn.getLastRow();
  }
}
function extractSheetId_(url) {
  const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : '';
}
function inferGlobalKind_(name) {
  for (let i = 0; i < GLOBAL_NAME_HINTS.length; i++) if (GLOBAL_NAME_HINTS[i][0].test(name)) return GLOBAL_NAME_HINTS[i][1];
  return null;
}

/** §6 checklist: per active account ×4, globals ×11. Missing = "not connected yet". */
function connectionHealth() {
  const rows = getPortalDb_(false).getSheetByName('CONNECTIONS').getDataRange().getValues().slice(1);
  const byKey = {};
  const accounts = {};
  rows.forEach(function(r) {
    byKey[r[1] + '|' + r[2] + '|' + r[3]] = { id: r[4], status: r[5] };
    if (r[1] === 'account' && r[2]) accounts[r[2]] = true;
  });
  const perAccount = Object.keys(accounts).sort().map(function(a) {
    const items = ACCOUNT_SHEET_KINDS.map(function(k) {
      const hit = byKey['account|' + a + '|' + k];
      return { kind: k, status: hit && hit.id ? 'linked' : 'not connected yet' };
    });
    return { account: a, linked: items.filter(function(x){ return x.status === 'linked'; }).length, of: ACCOUNT_SHEET_KINDS.length, items: items };
  });
  const globals = GLOBAL_KINDS.map(function(k) {
    const hit = byKey['global||' + k];
    return { kind: k, status: hit && hit.id ? 'linked' : 'not connected yet' };
  });
  return { perAccount: perAccount, globals: globals,
    globalsLinked: globals.filter(function(g){ return g.status === 'linked'; }).length, globalsOf: GLOBAL_KINDS.length };
}
