import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  approveOfferRevisionWithAudit,
  createOfferRevisionFrom,
  markOfferRevisionSentWithAudit,
  submitOfferRevisionForApprovalWithAudit,
} from "@/db/queries";
import {
  configurations,
  installationItemSettings,
  offerRevisionLines,
  offerRevisions,
  offers,
  surchargeSettings,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import {
  repriceOfferLine,
  repriceOfferLines,
} from "@/lib/offer-revision-pricing";
import {
  type ConfigOrigin,
  InstallationItemKinds,
  type Role,
  STANDARD_MACHINE_HEIGHT_MM,
} from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import {
  BLOCKED_SUPABASE_PROJECT_REFS,
  DEV_PASSWORD,
  E2E_USER_EMAIL,
} from "./seed-constants";
import { transformConfigToDbInsert } from "./transformations";

const configurationSimple: ConfigSchema = {
  name: "Cliente 1",
  description: "Tre spazzole semplice",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: true,
  has_wax_pump: true,
  has_chemical_pump: true,
  chemical_qty: 1,
  chemical_pump_pos: "ONBOARD",
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  has_chassis_wash_detergent_pump: false,
  has_chassis_wash_detergent_manual_antifreeze: false,
  supply_side: "RIGHT",
  supply_type: "BOOM",
  supply_fixing_type: "POST",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 25,
  rail_guide_qty: 1,
  anchor_type: "ZINC",
  has_15kw_pump: false,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_omz_paint: false,
  total_height: STANDARD_MACHINE_HEIGHT_MM,
  has_chemical_roof_bar: false,
  chassis_wash_sensor_type: undefined,
  has_chassis_wash_plates: false,
  has_itecoweb: true,
  has_card_reader: false,
  card_qty: 100,
  is_fast: false,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "ON_PANEL",
  touch_fixing_type: undefined,
};

const configurationComplicated: ConfigSchema = {
  name: "Cliente 2",
  description: "Tre spazzole complesso",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: "INV_3KW_200L",
  water_2_type: "RECYCLED",
  water_2_pump: "BOOST_15KW",
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 1,
  inv_pump_outlet_pw_qty: 2,
  has_shampoo_pump: true,
  has_wax_pump: true,
  has_chemical_pump: true,
  chemical_qty: 1,
  chemical_pump_pos: "WASH_BAY",
  has_foam: true,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  has_chassis_wash_detergent_pump: false,
  has_chassis_wash_detergent_manual_antifreeze: false,
  supply_side: "RIGHT",
  supply_type: "ENERGY_CHAIN",
  supply_fixing_type: "POST",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 26,
  rail_guide_qty: 2,
  anchor_type: "ZINC",
  has_15kw_pump: true,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: "CHASSIS_WASH",
  pump_outlet_2_15kw: "LOW_SPINNERS",
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: true,
  pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
  has_omz_paint: true,
  total_height: STANDARD_MACHINE_HEIGHT_MM,
  has_chemical_roof_bar: true,
  chassis_wash_sensor_type: "SINGLE_POST",
  has_chassis_wash_plates: false,
  has_itecoweb: true,
  has_card_reader: false,
  card_qty: 100,
  is_fast: false,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "EXTERNAL",
  touch_fixing_type: "POST",
};

const getWashBayComplicated = (
  id: number,
): WashBaySchema & { configuration_id: number } => ({
  configuration_id: id,
  hp_lance_qty: 2,
  det_lance_qty: 2,
  hose_reel_hp_with_post_qty: 0,
  hose_reel_hp_without_post_qty: 0,
  hose_reel_det_with_post_qty: 0,
  hose_reel_det_without_post_qty: 0,
  hose_reel_hp_det_with_post_qty: 0,
  has_gantry: true,
  energy_chain_width: "L250",
  has_shelf_extension: false,
  ec_signal_cable_qty: 1,
  ec_profinet_cable_qty: 1,
  ec_water_1_tube_qty: 2,
  ec_water_34_tube_qty: 0,
  ec_r1_1_tube_qty: 1,
  ec_r2_1_tube_qty: 1,
  ec_r2_34_inox_tube_qty: 0,
  ec_air_tube_qty: 1,
  is_first_bay: true,
  has_bay_dividers: false,
  has_weeping_lances: false,
});

const configurationFast: ConfigSchema = {
  name: "Cliente 3",
  description: "Portale fast a due spazzole",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 2,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: false,
  has_wax_pump: false,
  has_chemical_pump: false,
  chemical_qty: undefined,
  chemical_pump_pos: undefined,
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  has_chassis_wash_detergent_pump: false,
  has_chassis_wash_detergent_manual_antifreeze: false,
  supply_side: "LEFT",
  supply_type: "STRAIGHT_SHELF",
  supply_fixing_type: "WALL",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 7,
  rail_guide_qty: 1,
  anchor_type: "ZINC",
  has_15kw_pump: false,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_omz_paint: false,
  total_height: STANDARD_MACHINE_HEIGHT_MM,
  has_chemical_roof_bar: false,
  chassis_wash_sensor_type: undefined,
  has_chassis_wash_plates: false,
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: true,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "ON_PANEL",
  touch_fixing_type: undefined,
};

type SeedUser = {
  email: string;
  role: Role;
  initials: string;
  // Email of the SALES_MANAGER this user reports to (resolved to manager_id).
  managerEmail?: string;
};

// One account per role so the full workflow can be exercised. The SALES agent
// reports to the SALES_MANAGER to exercise manager-scoped visibility.
const SEED_USERS: SeedUser[] = [
  { email: "admin@itecosrl.com", role: "ADMIN", initials: "ADM" },
  { email: "engineer@itecosrl.com", role: "ENGINEER", initials: "ENG" },
  { email: "director@itecosrl.com", role: "SALES_DIRECTOR", initials: "DIR" },
  { email: "manager@itecosrl.com", role: "SALES_MANAGER", initials: "MGR" },
  {
    email: "agent@itecosrl.com",
    role: "SALES",
    initials: "AGT",
    managerEmail: "manager@itecosrl.com",
  },
];

// Owner email for each seeded configuration (aligned with confArr order).
// Config 1 is offer-owned (wrapped by the sample offer below); configs 2 and 3 are
// standalone technical configs, which per the workflow belong to ENGINEER/ADMIN.
const CONFIG_OWNER_EMAILS = [
  "agent@itecosrl.com",
  "engineer@itecosrl.com",
  "admin@itecosrl.com",
];

// Origin discriminator per seeded configuration (aligned with confArr order).
const CONFIG_ORIGINS: ConfigOrigin[] = ["OFFER", "STANDALONE", "STANDALONE"];

// The Playwright E2E account (e2e/auth.setup.ts). Role SALES matches its prior
// login-created profile. Seeded with DEV_PASSWORD like every other account.
const E2E_USER: SeedUser = {
  email: E2E_USER_EMAIL,
  role: "SALES",
  initials: "E2E",
};

function getSeedUsers(): SeedUser[] {
  return [...SEED_USERS, E2E_USER];
}

// Admin client uses the service role key — bypasses RLS, server-side only.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ prefix).
function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to seed users.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Deletes every auth user. Profiles cascade away via the user_profiles FK.
async function deleteAllAuthUsers(admin: SupabaseClient) {
  // Always re-fetch the first page: deleting shifts the list, so paging by
  // index would skip users. Loop until no users remain.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) {
      throw error;
    }
    if (data.users.length === 0) {
      break;
    }
    for (const user of data.users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        throw deleteError;
      }
    }
  }
}

// Ensures an auth user + profile exists for every SEED_USERS entry and returns
// a map of email -> profile id. Idempotent: existing profiles are left as-is.
async function seedUsers(admin: SupabaseClient): Promise<Map<string, string>> {
  const idByEmail = new Map<string, string>();
  const seedUsersList = getSeedUsers();

  for (const seedUser of seedUsersList) {
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.email, seedUser.email),
    });

    if (existingProfile) {
      idByEmail.set(seedUser.email, existingProfile.id);
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: seedUser.email,
      password: DEV_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(
        `Failed to create auth user ${seedUser.email}: ${error?.message}`,
      );
    }

    await db.insert(userProfiles).values({
      id: data.user.id,
      email: seedUser.email,
      role: seedUser.role,
      initials: seedUser.initials,
    });

    idByEmail.set(seedUser.email, data.user.id);
  }

  // Second pass: wire manager_id now that every profile exists.
  for (const seedUser of seedUsersList) {
    if (!seedUser.managerEmail) {
      continue;
    }
    const userId = idByEmail.get(seedUser.email);
    const managerId = idByEmail.get(seedUser.managerEmail);
    if (userId && managerId) {
      await db
        .update(userProfiles)
        .set({ manager_id: managerId })
        .where(eq(userProfiles.id, userId));
    }
  }

  return idByEmail;
}

// Hard stop against running the seed (which deletes auth users and data)
// against the production database. The seed is a local-development tool only.
function assertNotProductionDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";

  for (const ref of BLOCKED_SUPABASE_PROJECT_REFS) {
    if (url.includes(ref) || databaseUrl.includes(ref)) {
      throw new Error(
        `Refusing to seed: the configured database points at the production Supabase project (${ref}). The seed is for local development only.`,
      );
    }
  }
}

async function seedDb() {
  assertNotProductionDatabase();

  const shouldReset = process.argv.includes("--reset");
  const admin = createAdminSupabaseClient();

  if (shouldReset) {
    console.log("⚠️ Reset flag detected. Cleaning up existing data...");

    // Delete the offer spine before configurations: lines → revisions → offers.
    await db.delete(offerRevisionLines);
    await db.delete(offerRevisions);
    await db.delete(offers);
    await db.delete(surchargeSettings);
    await db.delete(installationItemSettings);
    await db.delete(waterTanks);
    await db.delete(washBays);
    await db.delete(configurations);

    await db.execute(
      sql`ALTER SEQUENCE surcharge_settings_id_seq RESTART WITH 1`,
    );
    await db.execute(
      sql`ALTER SEQUENCE installation_item_settings_id_seq RESTART WITH 1`,
    );
    await db.execute(sql`ALTER SEQUENCE water_tanks_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE wash_bays_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE configurations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE offers_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE offer_revisions_id_seq RESTART WITH 1`);
    await db.execute(
      sql`ALTER SEQUENCE offer_revision_lines_id_seq RESTART WITH 1`,
    );

    console.log("🧹 Deleting all auth users (profiles cascade)...");
    await deleteAllAuthUsers(admin);

    console.log("✅ Database cleared.");
  }

  const confArr = [
    configurationSimple,
    configurationComplicated,
    configurationFast,
  ];

  console.log("🌱 Seeding users...");
  const userIdByEmail = await seedUsers(admin);

  console.log("🌱 Starting seeding...");

  // Capture the offer-owned configuration's id so the sample offer can wrap it.
  let offerConfigId: number | undefined;

  for (const [index, conf] of confArr.entries()) {
    const ownerId = userIdByEmail.get(CONFIG_OWNER_EMAILS[index]);
    if (!ownerId) {
      throw new Error(
        `Owner ${CONFIG_OWNER_EMAILS[index]} not found for configuration "${conf.name}".`,
      );
    }

    const dbData = transformConfigToDbInsert(conf, ownerId);
    const [inserted] = await db
      .insert(configurations)
      .values({ ...dbData, origin: CONFIG_ORIGINS[index] })
      .returning({ id: configurations.id });

    if (conf === configurationComplicated && inserted) {
      await db.insert(washBays).values(getWashBayComplicated(inserted.id));
    }

    if (CONFIG_ORIGINS[index] === "OFFER" && inserted) {
      offerConfigId = inserted.id;
    }
  }

  // Pricing settings must exist before the offer so its lines can be priced from the
  // live BOM (repriceOfferLine reads these).
  console.log("🌱 Seeding surcharge settings...");
  await db
    .insert(surchargeSettings)
    .values([
      { kind: "HEIGHT", price: "1500.00" },
      { kind: "PAINT", price: "1200.00" },
    ])
    .onConflictDoNothing({ target: surchargeSettings.kind });

  console.log("🌱 Seeding installation item settings...");
  // Real default prices are set by admins via /gestione/installazione.
  await db
    .insert(installationItemSettings)
    .values(InstallationItemKinds.map((kind) => ({ kind, price: "0.00" })))
    .onConflictDoNothing({ target: installationItemSettings.kind });

  // A sample offer with a revision series: Rev 1 SENT (frozen as-quoted) and Rev 2
  // DRAFT (the working revision, clone-forwarded from Rev 1) — exercises the real
  // clone-forward + send path so the history UI has browsable data.
  console.log("🌱 Seeding sample offer (Rev 1 SENT → Rev 2 DRAFT)...");
  const agentId = userIdByEmail.get("agent@itecosrl.com");
  const managerId = userIdByEmail.get("manager@itecosrl.com");
  if (agentId && managerId && offerConfigId !== undefined) {
    const [offer] = await db
      .insert(offers)
      .values({
        offer_number: "OFF-2026-0001",
        customer_name: "Cliente 1",
        user_id: agentId,
      })
      .returning({ id: offers.id });

    const [revision] = await db
      .insert(offerRevisions)
      .values({
        offer_id: offer.id,
        revision_no: 1,
        status: "DRAFT",
        discount_pct: "10.00",
      })
      .returning({ id: offerRevisions.id });

    await db.insert(offerRevisionLines).values({
      offer_revision_id: revision.id,
      configuration_id: offerConfigId,
      position: 0,
      quantity: 1,
      // Placeholder pricing — repriceOfferLine recomputes from the live BOM below.
      list_price: "0.00",
      net_price: "0.00",
    });

    await db.transaction(async (tx) => {
      // Walk Rev 1 through the real lifecycle: price from the live BOM while DRAFT, the
      // agent submits it for approval, the manager approves it, then it freezes as SENT.
      // Clone it forward into an editable Rev 2 and price that too.
      await repriceOfferLine(offerConfigId, agentId, tx, { audit: false });
      await submitOfferRevisionForApprovalWithAudit(
        offer.id,
        revision.id,
        agentId,
        tx,
      );
      await approveOfferRevisionWithAudit(offer.id, revision.id, managerId, tx);
      await markOfferRevisionSentWithAudit(offer.id, revision.id, agentId, tx);

      const { configIds } = await createOfferRevisionFrom(
        offer.id,
        1,
        agentId,
        tx,
      );
      await repriceOfferLines(configIds, agentId, tx, { audit: false });
    });
  }
}

await seedDb();
