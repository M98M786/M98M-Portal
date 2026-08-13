/** M98M Portal — constants & schemas. The Sheet Contract: business sheets are read/written
 * ONLY via header-addressed columns and per-workflow whitelists; these tabs below are the
 * portal's OWN database spreadsheet ("M98M Portal DB"), created by setupDatabase(). */

const PORTAL_DB_NAME = 'M98M Portal DB';
const PROP_DB_ID = 'PORTAL_DB_ID';

// §7 — every Portal DB tab and its exact header row.
const DB_TABS = {
  USERS: ['email','name','role','shift','accounts_access','status','joined_at','approved_by','deactivated_at','notes','modules','tools'],
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

/* V2 access model (§8/§24 of the V2 contract): a person's screens = their role's defaults
 * PLUS the modules on their USERS row; '-key' entries subtract a default. 'team-lead' is a
 * routing-only module (loss tasks etc.), not a screen. Keys match VIEWS keys in the frontend. */
const MODULE_KEYS = {
  dashboard:'Business overview', pipeline:'Pipeline', agenda:'Daily agenda', tasks:'My tasks',
  hunting:'Product hunting', huntQueue:'Hunt approvals', listing:'My listings', cpc:'CPC research',
  keywordApprovals:'Keyword approvals', potentialCpc:'Potential CPC', advertising:'Advertising',
  wrongAds:'Wrong advertising', orders:'Orders', dispatch:'Dispatch', recheck:'Order rechecking',
  wrongOrders:'Wrong orders', returns:'Returns & INAD', cs:'Customer service', inbox:'Inbox',
  meetings:'Meetings', reports:'My reports', reportsGrid:'Reports grid', rota:'Rota & timetable',
  rules:'Rules & instructions', perf:'My performance', team:'Team performance', kpis:'Account KPIs',
  alerts:'Alerts centre', signals:'My signals', staffAdmin:'Staff & approvals', approvals:'Approvals desk',
  tools:'Tools', home:'Home', calculator:'Order earning calculator', activeListings:'Active listings (Engine)',
  'team-lead':'Team-lead duties (routing)',
};

function parseAccessCsv_(s) {
  return String(s == null ? '' : s).split(',').map(function (x) { return x.trim(); })
    .filter(function (x) { return x !== ''; });
}
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
  // §16.10 pilot gate: while this is anything but 'true', the pipeline never writes to a live
  // business sheet — intended writes are logged as SHADOW_WRITE so they can be inspected first.
  pipeline_write_external: 'false',
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
