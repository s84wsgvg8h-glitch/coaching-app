import {
  DEMO_ATHLETE_1,
  DEMO_ATHLETE_2,
  DEMO_ATHLETE_3,
  DEMO_COACH_ID,
  DEMO_PENDING_1,
} from "@/lib/demo/constants";
import {
  DEMO_EXERCISE_BENCH,
  DEMO_EXERCISE_DEAD,
  DEMO_EXERCISE_SQUAT,
  DEMO_PROGRAM_BLOCK,
  DEMO_PROGRAM_DAY,
  DEMO_PROGRAM_WEEK,
  generateDemoProgramYear,
  getDemoAthleteMaxes,
} from "@/lib/demo/demoProgramGenerator";

export {
  DEMO_EXERCISE_BENCH,
  DEMO_EXERCISE_DEAD,
  DEMO_EXERCISE_SQUAT,
  DEMO_PROGRAM_BLOCK,
  DEMO_PROGRAM_DAY,
  DEMO_PROGRAM_WEEK,
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function dateDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function datetimeDaysFromNow(days: number, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const DEMO_MERCH_HOODIE = "demo-merch-001";
const DEMO_MERCH_TEE = "demo-merch-002";
const DEMO_GROUP = "demo-group-001";
const DEMO_COMPETITION_1 = "demo-comp-001";
const DEMO_COMPETITION_2 = "demo-comp-002";

const demoAthleteMaxes = getDemoAthleteMaxes();

const profiles = [
  {
    id: DEMO_COACH_ID,
    full_name: "Demo Coach",
    role: "coach",
    coach_id: null,
    organization_id: null,
    business_name: "Limitless Demo Team",
    intake_completed_at: isoDaysAgo(120),
    lidnummer: null,
    betaling_prijs: null,
    betaling_dag: null,
    created_at: isoDaysAgo(365),
  },
  {
    id: DEMO_ATHLETE_1,
    full_name: "Sophie van Dijk",
    role: "atleet",
    coach_id: DEMO_COACH_ID,
    organization_id: null,
    intake_completed_at: isoDaysAgo(90),
    geboortedatum: "1998-03-14",
    lidnummer: "LC-1042",
    betaling_prijs: 129,
    betaling_dag: 1,
    current_max_squat: demoAthleteMaxes[DEMO_ATHLETE_1].current_max_squat,
    current_max_bench: demoAthleteMaxes[DEMO_ATHLETE_1].current_max_bench,
    current_max_deadlift: demoAthleteMaxes[DEMO_ATHLETE_1].current_max_deadlift,
    bodyweight_goal_kg: 71,
    bodyweight_goal_date: dateDaysFromNow(60),
    created_at: isoDaysAgo(200),
  },
  {
    id: DEMO_ATHLETE_2,
    full_name: "Noah Bakker",
    role: "atleet",
    coach_id: DEMO_COACH_ID,
    organization_id: null,
    intake_completed_at: isoDaysAgo(60),
    geboortedatum: "1996-07-22",
    lidnummer: "LC-1088",
    betaling_prijs: 149,
    betaling_dag: 15,
    current_max_squat: demoAthleteMaxes[DEMO_ATHLETE_2].current_max_squat,
    current_max_bench: demoAthleteMaxes[DEMO_ATHLETE_2].current_max_bench,
    current_max_deadlift: demoAthleteMaxes[DEMO_ATHLETE_2].current_max_deadlift,
    bodyweight_goal_kg: 91,
    bodyweight_goal_date: dateDaysFromNow(45),
    created_at: isoDaysAgo(150),
  },
  {
    id: DEMO_ATHLETE_3,
    full_name: "Emma Jansen",
    role: "atleet",
    coach_id: DEMO_COACH_ID,
    organization_id: null,
    intake_completed_at: isoDaysAgo(45),
    geboortedatum: "2001-01-24",
    lidnummer: "LC-1103",
    betaling_prijs: 129,
    betaling_dag: 1,
    current_max_squat: demoAthleteMaxes[DEMO_ATHLETE_3].current_max_squat,
    current_max_bench: demoAthleteMaxes[DEMO_ATHLETE_3].current_max_bench,
    current_max_deadlift: demoAthleteMaxes[DEMO_ATHLETE_3].current_max_deadlift,
    bodyweight_goal_kg: 64,
    bodyweight_goal_date: dateDaysFromNow(90),
    created_at: isoDaysAgo(100),
  },
  {
    id: DEMO_PENDING_1,
    full_name: "Lucas Vermeer",
    role: "pending",
    coach_id: DEMO_COACH_ID,
    organization_id: null,
    intake_completed_at: null,
    created_at: isoDaysAgo(2),
  },
];

const demoProgramTables = generateDemoProgramYear();
const {
  program_blocks,
  program_weeks,
  program_days,
  program_exercises,
  athlete_exercise_sets,
  athlete_day_checkins,
} = demoProgramTables;

const athlete_bw_logs = athlete_day_checkins
  .slice(-120)
  .map((checkin, index) => ({
    id: `demo-bw-${index + 1}`,
    athlete_id: checkin.athlete_id,
    bw: Number(checkin.bw),
    logged_at: checkin.updated_at,
  }));

const merch_items = [
  {
    id: DEMO_MERCH_HOODIE,
    title: "Limitless Hoodie",
    description:
      "Premium hoodie met comfortabele pasvorm en minimalistisch Limitless design.",
    price: 49.95,
    cost_price: 22,
    image_url: null,
    image_urls: [],
    buy_url: null,
    material_info: "80% katoen, 20% polyester",
    size_guide_text: "Valt normaal — bij twijfel één maat groter.",
    delivery_time_text: "5-7 werkdagen",
    return_policy_override: null,
    sizes: ["S", "M", "L", "XL"],
    stock_by_size: { S: 12, M: 8, L: 5, XL: 3 },
    color_variants: [
      { name: "Zwart", value: "#111827" },
      { name: "Navy", value: "#1e3a8a" },
    ],
    collection: "Teamwear",
    status: "live",
    active: true,
    featured: true,
    limited: false,
    preorder: false,
    preorder_target: null,
    preorder_closes_at: null,
    go_live_at: null,
    archived_at: null,
    sort_order: 0,
    created_at: isoDaysAgo(40),
    updated_at: isoDaysAgo(3),
  },
  {
    id: DEMO_MERCH_TEE,
    title: "Meet Day Tee",
    description: "Lightweight performance tee voor wedstrijddag.",
    price: 29.95,
    cost_price: 11,
    image_url: null,
    image_urls: [],
    buy_url: null,
    material_info: "100% polyester performance stof",
    size_guide_text: "Athletic fit — kies je normale maat.",
    delivery_time_text: "3-5 werkdagen",
    return_policy_override: null,
    sizes: ["S", "M", "L", "XL", "One size"],
    stock_by_size: { S: 20, M: 15, L: 10, XL: 6, "One size": 0 },
    color_variants: [{ name: "Wit", value: "#ffffff" }],
    collection: "Meet day",
    status: "live",
    active: true,
    featured: false,
    limited: true,
    preorder: false,
    preorder_target: null,
    preorder_closes_at: null,
    go_live_at: null,
    archived_at: null,
    sort_order: 1,
    created_at: isoDaysAgo(25),
    updated_at: isoDaysAgo(5),
  },
];

const merch_orders = [
  {
    id: "demo-order-001",
    athlete_id: DEMO_ATHLETE_1,
    merch_item_id: DEMO_MERCH_HOODIE,
    size: "M",
    color: "Zwart",
    amount_cents: 4995,
    currency: "eur",
    status: "paid",
    fulfillment_status: "new",
    stripe_session_id: null,
    customer_note: null,
    coach_note: null,
    discount_code: null,
    discount_cents: 0,
    pickup_method: "training",
    created_at: isoDaysAgo(2),
    paid_at: isoDaysAgo(2),
    fulfilled_at: null,
    updated_at: isoDaysAgo(2),
  },
  {
    id: "demo-order-002",
    athlete_id: DEMO_ATHLETE_2,
    merch_item_id: DEMO_MERCH_TEE,
    size: "L",
    color: "Wit",
    amount_cents: 2995,
    currency: "eur",
    status: "paid",
    fulfillment_status: "shipped",
    stripe_session_id: null,
    customer_note: "Graag ophalen bij training",
    coach_note: null,
    discount_code: null,
    discount_cents: 0,
    pickup_method: "training",
    created_at: isoDaysAgo(5),
    paid_at: isoDaysAgo(5),
    fulfilled_at: null,
    updated_at: isoDaysAgo(1),
  },
];

const merch_collections = [
  {
    id: "demo-collection-teamwear",
    coach_id: DEMO_COACH_ID,
    name: "Teamwear",
    description: "Teamkleding en clubwear voor training en wedstrijd.",
    cover_url: null,
    sort_order: 0,
    visible: true,
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(3),
  },
  {
    id: "demo-collection-meetday",
    coach_id: DEMO_COACH_ID,
    name: "Meet day",
    description: "Alles voor wedstrijddag en competities.",
    cover_url: null,
    sort_order: 1,
    visible: true,
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(3),
  },
  {
    id: "demo-collection-accessoires",
    coach_id: DEMO_COACH_ID,
    name: "Accessoires",
    description: "Caps, bags en andere extras.",
    cover_url: null,
    sort_order: 2,
    visible: true,
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(3),
  },
  {
    id: "demo-collection-limited",
    coach_id: DEMO_COACH_ID,
    name: "Limited edition",
    description: "Beperkte drops en exclusieve items.",
    cover_url: null,
    sort_order: 3,
    visible: true,
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(3),
  },
  {
    id: "demo-collection-concepten",
    coach_id: DEMO_COACH_ID,
    name: "Concepten",
    description: "Items in ontwikkeling — nog niet live.",
    cover_url: null,
    sort_order: 4,
    visible: false,
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(3),
  },
];

const merch_discounts: Array<Record<string, unknown>> = [];

const merch_shop_settings = [
  {
    id: "demo-shop-settings-001",
    coach_id: DEMO_COACH_ID,
    pickup_at_training: true,
    default_shipping_cents: 495,
    return_policy:
      "30 dagen retourrecht. Product moet ongebruikt en in originele staat zijn.",
    currency: "EUR",
    stock_alerts: true,
    new_order_notifications: true,
    created_at: isoDaysAgo(120),
    updated_at: isoDaysAgo(3),
  },
];

const merch_order_events: Array<Record<string, unknown>> = [
  {
    id: "demo-order-event-001",
    order_id: "demo-order-001",
    event_type: "order_placed",
    payload: {},
    created_at: isoDaysAgo(2),
  },
  {
    id: "demo-order-event-002",
    order_id: "demo-order-001",
    event_type: "payment_received",
    payload: {},
    created_at: isoDaysAgo(2),
  },
];

const coach_todos = [
  {
    id: "demo-todo-001",
    coach_id: DEMO_COACH_ID,
    title: "Programma review — Sophie",
    completed: false,
    completed_at: null,
    due_at: isoDaysAgo(-1),
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(1),
    athlete_id: DEMO_ATHLETE_1,
    auto_key: null,
    kind: null,
    kanban_status: "todo",
  },
  {
    id: "demo-todo-002",
    coach_id: DEMO_COACH_ID,
    title: "Video feedback Noah — squat depth",
    completed: false,
    completed_at: null,
    due_at: isoDaysAgo(0),
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(0),
    athlete_id: DEMO_ATHLETE_2,
    auto_key: null,
    kind: null,
    kanban_status: "doing",
  },
  {
    id: "demo-todo-003",
    coach_id: DEMO_COACH_ID,
    title: "Lucas goedkeuren als atleet",
    completed: false,
    completed_at: null,
    due_at: null,
    created_at: isoDaysAgo(1),
    updated_at: isoDaysAgo(1),
    athlete_id: DEMO_PENDING_1,
    auto_key: null,
    kind: "approval",
    kanban_status: "todo",
  },
];

const wedstrijden = [
  {
    id: DEMO_COMPETITION_1,
    naam: "IPF Classic Nationals",
    start_date: dateDaysFromNow(14),
    end_date: dateDaysFromNow(16),
    created_at: isoDaysAgo(60),
  },
  {
    id: DEMO_COMPETITION_2,
    naam: "Regional Cup Utrecht",
    start_date: dateDaysFromNow(45),
    end_date: dateDaysFromNow(45),
    created_at: isoDaysAgo(30),
  },
  {
    id: "demo-comp-003",
    naam: "Club Mock Meet",
    start_date: dateDaysAgo(10),
    end_date: dateDaysAgo(10),
    created_at: isoDaysAgo(40),
  },
];

const athlete_competitions = [
  {
    id: "demo-ac-001",
    athlete_id: DEMO_ATHLETE_1,
    competition_id: DEMO_COMPETITION_1,
    wedstrijden_id: DEMO_COMPETITION_1,
    created_at: isoDaysAgo(10),
    coach_notes: "Opener squat 130kg",
    goals: "9/9 attempts, PR total",
  },
  {
    id: "demo-ac-002",
    athlete_id: DEMO_ATHLETE_2,
    competition_id: DEMO_COMPETITION_2,
    wedstrijden_id: DEMO_COMPETITION_2,
    created_at: isoDaysAgo(5),
    coach_notes: null,
    goals: "Bench PR",
  },
];

const messages = [
  {
    id: "demo-msg-001",
    sender_id: DEMO_ATHLETE_1,
    recipient_id: DEMO_COACH_ID,
    group_id: null,
    content: "Coach, squat voelt goed vandaag. Mag ik 2,5kg extra volgende week?",
    message_type: "text",
    created_at: isoDaysAgo(0),
    read_at: null,
    media_url: null,
    reply_to_id: null,
  },
  {
    id: "demo-msg-002",
    sender_id: DEMO_COACH_ID,
    recipient_id: DEMO_ATHLETE_1,
    group_id: null,
    content: "Top Sophie! Ja, +2,5kg op de top set is prima.",
    message_type: "text",
    created_at: isoDaysAgo(0),
    read_at: isoDaysAgo(0),
    media_url: null,
    reply_to_id: null,
  },
  {
    id: "demo-msg-003",
    sender_id: DEMO_ATHLETE_2,
    recipient_id: DEMO_COACH_ID,
    group_id: null,
    content: "Video squat is geüpload — kun je even naar die depth kijken?",
    message_type: "text",
    created_at: isoDaysAgo(1),
    read_at: null,
    media_url: null,
    reply_to_id: null,
  },
  {
    id: "demo-msg-004",
    sender_id: DEMO_COACH_ID,
    recipient_id: null,
    group_id: DEMO_GROUP,
    content: "Team: mock meet volgende week woensdag om 19:00!",
    message_type: "text",
    created_at: isoDaysAgo(2),
    read_at: null,
    media_url: null,
    reply_to_id: null,
  },
];

const chat_groups = [
  {
    id: DEMO_GROUP,
    name: "Limitless Demo Team",
    description: "Teamgroep voor demo",
    avatar_url: null,
    admins_only: false,
    created_by: DEMO_COACH_ID,
    created_at: isoDaysAgo(100),
  },
];

const chat_group_members = [
  {
    group_id: DEMO_GROUP,
    user_id: DEMO_COACH_ID,
    role: "admin",
    joined_at: isoDaysAgo(100),
  },
  {
    group_id: DEMO_GROUP,
    user_id: DEMO_ATHLETE_1,
    role: "member",
    joined_at: isoDaysAgo(90),
  },
  {
    group_id: DEMO_GROUP,
    user_id: DEMO_ATHLETE_2,
    role: "member",
    joined_at: isoDaysAgo(90),
  },
  {
    group_id: DEMO_GROUP,
    user_id: DEMO_ATHLETE_3,
    role: "member",
    joined_at: isoDaysAgo(80),
  },
];

const chat_read_state: Array<Record<string, unknown>> = [];
const chat_group_read_states: Array<Record<string, unknown>> = [];
const chat_conversation_settings: Array<Record<string, unknown>> = [];

const video_reviews = [
  {
    id: "demo-vr-001",
    athlete_id: DEMO_ATHLETE_1,
    coach_id: DEMO_COACH_ID,
    exercise_name: "Competition Squat",
    lift: "squat",
    video_url: "/app-screenshots/athlete-program-detail.png",
    thumbnail_url: null,
    set_number: 1,
    caption: "Depth check — mock meet prep",
    reference_video_url: null,
    reference_video_title: null,
    feedback_media: [],
    coach_feedback: null,
    status: "pending",
    created_at: isoDaysAgo(1),
    updated_at: isoDaysAgo(1),
  },
  {
    id: "demo-vr-002",
    athlete_id: DEMO_ATHLETE_2,
    coach_id: DEMO_COACH_ID,
    exercise_name: "Competition Squat",
    lift: "squat",
    video_url: "/app-screenshots/athlete-program-detail.png",
    thumbnail_url: null,
    set_number: 2,
    caption: "Squat depth review",
    reference_video_url: null,
    reference_video_title: null,
    feedback_media: [],
    coach_feedback: "Dieper zakken — knieën iets meer naar buiten.",
    status: "reviewed",
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(1),
  },
];

const coach_calendar_events = [
  {
    id: "demo-cal-001",
    coach_id: DEMO_COACH_ID,
    event_type: "activity",
    title: "Check-in Sophie",
    location: "Limitless Gym",
    video_url: null,
    start_at: datetimeDaysFromNow(0, 10, 0),
    end_at: datetimeDaysFromNow(0, 10, 45),
    all_day: false,
    invitees: "Sophie van Dijk",
    notes: "Squat week review + mock meet planning",
    created_at: isoDaysAgo(5),
    updated_at: isoDaysAgo(1),
  },
  {
    id: "demo-cal-002",
    coach_id: DEMO_COACH_ID,
    event_type: "activity",
    title: "Video feedback Noah",
    location: null,
    video_url: "https://meet.google.com/demo",
    start_at: datetimeDaysFromNow(1, 14, 0),
    end_at: datetimeDaysFromNow(1, 14, 30),
    all_day: false,
    invitees: "Noah Bakker",
    notes: null,
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(1),
  },
];

const athlete_calendar_events = [
  {
    id: "demo-ath-cal-001",
    athlete_id: DEMO_ATHLETE_1,
    title: "Mock meet — club",
    start_at: datetimeDaysFromNow(14, 9, 0),
    end_at: datetimeDaysFromNow(14, 17, 0),
    all_day: false,
    notes: "Weeg-in 08:00",
    created_at: isoDaysAgo(10),
    updated_at: isoDaysAgo(2),
  },
];

const coach_athlete_notes = [
  {
    id: "demo-can-001",
    coach_id: DEMO_COACH_ID,
    athlete_id: DEMO_ATHLETE_1,
    notes:
      "Mock meet over 2 weken. Squat opener 130kg. Bench volume iets teruggeschroefd.",
    updated_at: isoDaysAgo(1),
  },
  {
    id: "demo-can-002",
    coach_id: DEMO_COACH_ID,
    athlete_id: DEMO_ATHLETE_2,
    notes: "Focus op squat depth. Deadlift PR poging volgende mesocycle.",
    updated_at: isoDaysAgo(3),
  },
];

const coach_invite_links = [
  {
    id: "demo-invite-001",
    coach_id: DEMO_COACH_ID,
    token: "demo-invite-limitless",
    label: "Demo uitnodiging",
    active: true,
    created_at: isoDaysAgo(30),
    expires_at: null,
  },
];

const athlete_injuries: Array<Record<string, unknown>> = [];

const athlete_exercise_videos = [
  {
    id: "demo-aev-001",
    athlete_id: DEMO_ATHLETE_1,
    program_exercise_id: "demo-sophie-b3-w11-d1-ex1",
    set_number: 1,
    video_url: "/app-screenshots/athlete-program-detail.png",
    video_path: "demo/sophie-squat-set1.mp4",
    file_name: "squat-set1.mp4",
    caption: "Competition squat — depth check",
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(2),
  },
  {
    id: "demo-aev-002",
    athlete_id: DEMO_ATHLETE_1,
    program_exercise_id: "demo-sophie-b3-w11-d1-ex2",
    set_number: 2,
    video_url: "/app-screenshots/athlete-chat.png",
    video_path: "demo/sophie-bench-set2.mp4",
    file_name: "bench-set2.mp4",
    caption: "Bench press — top set",
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(3),
  },
  {
    id: "demo-aev-003",
    athlete_id: DEMO_ATHLETE_1,
    program_exercise_id: "demo-sophie-b3-w11-d3-ex1",
    set_number: 1,
    video_url: "/app-screenshots/00-home.png",
    video_path: "demo/sophie-dead-set1.mp4",
    file_name: "deadlift-set1.mp4",
    caption: "Deadlift — lockout",
    created_at: isoDaysAgo(5),
    updated_at: isoDaysAgo(5),
  },
];

const limitless_athletes = [
  {
    id: "demo-la-001",
    full_name: "Sophie van Dijk",
    birth_date: "1998-03-14",
    member_number: "LC-1042",
    competition_member_status: "groen",
    student_status: "groen",
    membership_type: "wedstrijd lid",
    coach_id: DEMO_COACH_ID,
    created_at: isoDaysAgo(200),
  },
  {
    id: "demo-la-002",
    full_name: "Noah Bakker",
    birth_date: "1996-07-22",
    member_number: "LC-1088",
    competition_member_status: "groen",
    student_status: "groen",
    membership_type: "wedstrijd lid",
    coach_id: DEMO_COACH_ID,
    created_at: isoDaysAgo(150),
  },
  {
    id: "demo-la-003",
    full_name: "Emma Jansen",
    birth_date: "2001-01-24",
    member_number: "LC-1103",
    competition_member_status: "groen",
    student_status: "groen",
    membership_type: "wedstrijd lid",
    coach_id: DEMO_COACH_ID,
    created_at: isoDaysAgo(100),
  },
];

const app_settings = [
  {
    id: 1,
    maintenance_mode: false,
    maintenance_message: null,
    welcome_message: "Welkom in de Limitless demo omgeving.",
    feature_flags: {
      enableMerch: true,
      enableAiChat: true,
      enableExerciseLibrary: true,
      enableCompetitionCalendar: true,
    },
    email_templates: {},
    updated_at: isoDaysAgo(1),
    updated_by: DEMO_COACH_ID,
  },
];

const system_banners: Array<Record<string, unknown>> = [];

const exercise_library: Array<Record<string, unknown>> = [
  {
    id: "demo-ex-lib-001",
    name: "Competition Squat",
    category: "Squat",
    video_url: null,
    created_at: isoDaysAgo(200),
  },
  {
    id: "demo-ex-lib-002",
    name: "Pause Bench Press",
    category: "Bench",
    video_url: null,
    created_at: isoDaysAgo(200),
  },
];

const knowledge_articles: Array<Record<string, unknown>> = [
  {
    id: "demo-kb-001",
    title: "RPE schalen uitleggen",
    content: "Rate of Perceived Exertion helpt atleten autoreguleren.",
    category: "Training",
    created_at: isoDaysAgo(100),
  },
];

const TABLE_DATA: Record<string, Array<Record<string, unknown>>> = {
  profiles,
  program_blocks,
  program_weeks,
  program_days,
  program_exercises,
  athlete_exercise_sets,
  athlete_day_checkins,
  athlete_bw_logs,
  athlete_exercise_videos,
  merch_items,
  merch_orders,
  merch_collections,
  merch_discounts,
  merch_shop_settings,
  merch_order_events,
  coach_todos,
  wedstrijden,
  athlete_competitions,
  messages,
  chat_groups,
  chat_group_members,
  chat_read_state,
  chat_group_read_states,
  chat_conversation_settings,
  video_reviews,
  coach_calendar_events,
  athlete_calendar_events,
  coach_athlete_notes,
  athlete_injuries,
  limitless_athletes,
  app_settings,
  system_banners,
  exercise_library,
  knowledge_articles,
  admin_knowledge_chunks: [],
  chat_poll_votes: [],
  push_subscriptions: [],
  coach_invite_links,
  intake_form_templates: [],
  athlete_intake_responses: [],
  meet_attempt_plans: [],
  athlete_checklist_templates: [],
  competition_checklist_templates: [],
  athlete_ai_chat_logs: [],
  program_macrocycles: [],
  coach_organizations: [],
};

let demoStore: Record<string, Array<Record<string, unknown>>> | null = null;

function initDemoStore() {
  if (!demoStore) {
    demoStore = Object.fromEntries(
      Object.entries(TABLE_DATA).map(([table, rows]) => [
        table,
        rows.map((row) => ({ ...row })),
      ]),
    );
  }
  return demoStore;
}

export function resetDemoStore() {
  demoStore = null;
}

export function mutateDemoTable(
  table: string,
  mutator: (rows: Array<Record<string, unknown>>) => Array<Record<string, unknown>>,
) {
  const store = initDemoStore();
  if (!store[table]) {
    store[table] = [];
  }
  store[table] = mutator(store[table].map((row) => ({ ...row })));
}

export function getDemoTableData(table: string): Array<Record<string, unknown>> {
  const store = initDemoStore();
  const rows = store[table];
  if (!rows) return [];
  return rows.map((row) => ({ ...row }));
}

export function resolveDemoRelation(
  table: string,
  foreignId: unknown,
): Record<string, unknown> | null {
  if (!foreignId || typeof foreignId !== "string") return null;
  const rows = getDemoTableData(table);
  return rows.find((row) => row.id === foreignId) || null;
}

export function cloneDemoRow(row: Record<string, unknown>) {
  return structuredClone(row);
}
