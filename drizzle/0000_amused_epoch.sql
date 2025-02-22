-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."brush_color" AS ENUM('BLUE_SILVER', 'GREEN_SILVER', 'RED', 'GREEN_BLACK');--> statement-breakpoint
CREATE TYPE "public"."brush_type" AS ENUM('THREAD', 'MIXED', 'CARLITE');--> statement-breakpoint
CREATE TYPE "public"."chemical_pump_pos" AS ENUM('ABOARD', 'WASH_BAY');--> statement-breakpoint
CREATE TYPE "public"."configuration_status" AS ENUM('DRAFT', 'OPEN', 'LOCKED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."energy_chain_width" AS ENUM('L150', 'L200', 'L250', 'L300');--> statement-breakpoint
CREATE TYPE "public"."hp_pump_15kw_outlet_type" AS ENUM('CHASSIS_WASH', 'LOW_SPINNERS', 'LOW_BARS', 'HIGH_BARS');--> statement-breakpoint
CREATE TYPE "public"."hp_pump_30kw_outlet_type" AS ENUM('CHASSIS_WASH_HORIZONTAL', 'CHASSIS_WASH_LATERAL_HORIZONTAL', 'LOW_SPINNERS_HIGH_BARS', 'LOW_MEDIUM_SPINNERS', 'HIGH_MEDIUM_SPINNERS');--> statement-breakpoint
CREATE TYPE "public"."hp_pump_omz_outlet_type" AS ENUM('HP_ROOF_BAR', 'SPINNERS', 'HP_ROOF_BAR_SPINNERS');--> statement-breakpoint
CREATE TYPE "public"."pressure_washer_type" AS ENUM('L21_150BAR', 'L21_200BAR');--> statement-breakpoint
CREATE TYPE "public"."rail_type" AS ENUM('DOWELED', 'WELDED');--> statement-breakpoint
CREATE TYPE "public"."supply_fix_type" AS ENUM('POST', 'WALL');--> statement-breakpoint
CREATE TYPE "public"."supply_side" AS ENUM('TBD', 'LEFT', 'RIGHT');--> statement-breakpoint
CREATE TYPE "public"."supply_type" AS ENUM('STRAIGHT_SHELF', 'BOOM', 'CABLE_CHAIN');--> statement-breakpoint
CREATE TYPE "public"."touch_fix_type" AS ENUM('POST', 'WALL');--> statement-breakpoint
CREATE TYPE "public"."touch_pos" AS ENUM('INTERNAL', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."water_1_pump_type" AS ENUM('BOOST_15KW', 'BOOST_22KW', 'INV_3KW_200L', 'INV_3KW_250L');--> statement-breakpoint
CREATE TYPE "public"."water_2_pump_type" AS ENUM('BOOST_15KW', 'BOOST_22KW');--> statement-breakpoint
CREATE TYPE "public"."water_tank_type" AS ENUM('L2000', 'L2000_JOLLY', 'L2500', 'L4500');--> statement-breakpoint
CREATE TYPE "public"."water_type" AS ENUM('NETWORK', 'RECYCLED', 'DEMINERALIZED');--> statement-breakpoint
CREATE TABLE "water_tanks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "water_tanks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"water_tank_type" "water_tank_type" NOT NULL,
	"inlet_w_float_qty" integer NOT NULL,
	"inlet_no_float_qty" integer NOT NULL,
	"outlet_w_valve_qty" integer NOT NULL,
	"outlet_no_valve_qty" integer NOT NULL,
	"has_blower" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"configuration_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_numbers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "part_numbers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pn" varchar(25) NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "part_numbers_pn_unique" UNIQUE("pn")
);
--> statement-breakpoint
CREATE TABLE "configurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "configurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"brush_qty" integer NOT NULL,
	"brush_type" "brush_type",
	"brush_color" "brush_color",
	"has_shampoo_pump" boolean NOT NULL,
	"has_wax_pump" boolean NOT NULL,
	"has_chemical_pump" boolean NOT NULL,
	"chemical_qty" integer,
	"chemical_pump_pos" "chemical_pump_pos",
	"has_foam" boolean NOT NULL,
	"has_acid_pump" boolean NOT NULL,
	"acid_pump_pos" "chemical_pump_pos",
	"water_1_type" "water_type" NOT NULL,
	"water_1_pump_type" "water_1_pump_type",
	"inv_pump_outlet_dosatron_qty" integer,
	"inv_pump_outlet_pw_qty" integer,
	"water_2_type" "water_type",
	"water_2_pump_type" "water_2_pump_type",
	"has_antifreeze" boolean NOT NULL,
	"supply_type" "supply_type" NOT NULL,
	"supply_fix_type" "supply_fix_type",
	"supply_side" "supply_side" NOT NULL,
	"has_post_frame" boolean NOT NULL,
	"energy_chain_width" "energy_chain_width",
	"rail_type" "rail_type" NOT NULL,
	"rail_length" integer NOT NULL,
	"rail_guide_qty" integer NOT NULL,
	"touch_qty" integer NOT NULL,
	"touch_pos" "touch_pos",
	"touch_fix_type" "touch_fix_type",
	"has_itecoweb" boolean NOT NULL,
	"has_card_reader" boolean NOT NULL,
	"is_fast" boolean NOT NULL,
	"card_qty" integer NOT NULL,
	"has_15kw_pump" boolean NOT NULL,
	"pump_outlet_1_15kw" "hp_pump_15kw_outlet_type",
	"pump_outlet_2_15kw" "hp_pump_15kw_outlet_type",
	"has_30kw_pump" boolean NOT NULL,
	"pump_outlet_1_30kw" "hp_pump_30kw_outlet_type",
	"pump_outlet_2_30kw" "hp_pump_30kw_outlet_type",
	"has_omz_pump" boolean NOT NULL,
	"pump_outlet_omz" "hp_pump_omz_outlet_type",
	"has_chemical_roof_bar" boolean NOT NULL,
	"configuration_status" "configuration_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wash_bays" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wash_bays_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"hp_lance_qty" integer NOT NULL,
	"det_lance_qty" integer NOT NULL,
	"hose_reel_qty" integer NOT NULL,
	"pressure_washer_type" "pressure_washer_type",
	"pressure_washer_qty" integer,
	"has_gantry" boolean NOT NULL,
	"is_first_bay" boolean NOT NULL,
	"has_bay_dividers" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"configuration_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" varchar NOT NULL,
	CONSTRAINT "user_profiles_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "water_tanks" ADD CONSTRAINT "water_tanks_configuration_id_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_bays" ADD CONSTRAINT "wash_bays_configuration_id_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configurations"("id") ON DELETE cascade ON UPDATE no action;
*/