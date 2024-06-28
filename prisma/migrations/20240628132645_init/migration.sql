-- CreateEnum
CREATE TYPE "BrushType" AS ENUM ('THREAD', 'MIXED', 'CARLITE');

-- CreateEnum
CREATE TYPE "BrushColor" AS ENUM ('BLUE_SILVER', 'GREEN_SILVER', 'RED', 'GREEN_BLACK');

-- CreateEnum
CREATE TYPE "ChemicalPumpPos" AS ENUM ('ABOARD', 'WASH_BAY');

-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('NETWORK', 'RECYCLED', 'DEMINERALIZED');

-- CreateEnum
CREATE TYPE "Water1PumpType" AS ENUM ('BOOST_15KW', 'BOOST_22KW', 'INV_3KW_200L', 'INV_3KW_250L');

-- CreateEnum
CREATE TYPE "Water2PumpType" AS ENUM ('BOOST_15KW', 'BOOST_22KW');

-- CreateEnum
CREATE TYPE "SupplySide" AS ENUM ('TBD', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('STRAIGHT_SHELF', 'BOOM', 'CABLE_CHAIN');

-- CreateEnum
CREATE TYPE "SupplyFixingType" AS ENUM ('NONE', 'POST', 'WALL');

-- CreateEnum
CREATE TYPE "CableChainWidth" AS ENUM ('L150', 'L200', 'L250', 'L300');

-- CreateEnum
CREATE TYPE "RailType" AS ENUM ('DOWELED', 'WELDED');

-- CreateEnum
CREATE TYPE "TouchPos" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "TouchFixingType" AS ENUM ('POST', 'WALL');

-- CreateEnum
CREATE TYPE "HpPump15kwOutletType" AS ENUM ('CHASSIS_WASH', 'LOW_SPINNERS', 'LOW_BARS', 'HIGH_BARS');

-- CreateEnum
CREATE TYPE "HpPump30kwOutletType" AS ENUM ('CHASSIS_WASH', 'LOW_SPINNERS_HIGH_BARS', 'LOW_HIGH_SPINNERS');

-- CreateEnum
CREATE TYPE "HpPumpOMZOutletType" AS ENUM ('HP_ROOF_BAR', 'SPINNERS', 'HP_ROOF_BAR_SPINNERS');

-- CreateEnum
CREATE TYPE "WaterTankType" AS ENUM ('L2000', 'L2000_JOLLY', 'L2500', 'L4500');

-- CreateEnum
CREATE TYPE "PressureWasherType" AS ENUM ('L21_150BAR', 'L21_200BAR');

-- CreateTable
CREATE TABLE "configurations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brush_qty" INTEGER NOT NULL,
    "brush_type" "BrushType",
    "brush_color" "BrushColor",
    "has_shampoo_pump" BOOLEAN NOT NULL,
    "has_wax_pump" BOOLEAN NOT NULL,
    "has_chemical_pump" BOOLEAN NOT NULL,
    "chemical_qty" INTEGER,
    "chemical_pump_pos" "ChemicalPumpPos",
    "has_foam" BOOLEAN NOT NULL,
    "has_acid_pump" BOOLEAN NOT NULL,
    "acid_pump_pos" "ChemicalPumpPos",
    "water_1_type" "WaterType" NOT NULL,
    "water_1_pump" "Water1PumpType",
    "water_2_type" "WaterType",
    "water_2_pump" "Water2PumpType",
    "has_antifreeze" BOOLEAN NOT NULL,
    "supply_type" "SupplyType" NOT NULL,
    "supply_fixing_type" "SupplyFixingType" NOT NULL,
    "supply_side" "SupplySide" NOT NULL,
    "has_post_frame" BOOLEAN NOT NULL,
    "cable_chain_width" "CableChainWidth",
    "rail_type" "RailType" NOT NULL,
    "rail_length" INTEGER NOT NULL,
    "rail_guide_qty" INTEGER NOT NULL,
    "touch_qty" INTEGER NOT NULL,
    "touch_pos" "TouchPos",
    "touch_fixing_type" "TouchFixingType",
    "has_itecoweb" BOOLEAN NOT NULL,
    "has_card_reader" BOOLEAN NOT NULL,
    "is_fast" BOOLEAN NOT NULL,
    "card_qty" INTEGER NOT NULL,
    "has_15kw_pump" BOOLEAN NOT NULL,
    "pump_outlet_1_15kw" "HpPump15kwOutletType",
    "pump_outlet_2_15kw" "HpPump15kwOutletType",
    "has_30kw_pump" BOOLEAN NOT NULL,
    "pump_outlet_1_30kw" "HpPump30kwOutletType",
    "pump_outlet_2_30kw" "HpPump30kwOutletType",
    "has_omz_pump" BOOLEAN NOT NULL,
    "pump_outlet_omz" "HpPumpOMZOutletType",
    "has_chemical_roof_bar" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_tanks" (
    "id" SERIAL NOT NULL,
    "type" "WaterTankType" NOT NULL,
    "inlet_w_float_qty" INTEGER NOT NULL,
    "inlet_no_float_qty" INTEGER NOT NULL,
    "outlet_w_valve_qty" INTEGER NOT NULL,
    "outlet_no_valve_qty" INTEGER NOT NULL,
    "has_blower" BOOLEAN NOT NULL,
    "configurationId" INTEGER NOT NULL,

    CONSTRAINT "water_tanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wash_bays" (
    "id" SERIAL NOT NULL,
    "hp_lance_qty" INTEGER NOT NULL,
    "det_lance_qty" INTEGER NOT NULL,
    "hose_reel_qty" INTEGER NOT NULL,
    "pressure_washer_type" "PressureWasherType" NOT NULL,
    "pressure_washer_qty" INTEGER,
    "has_gantry" BOOLEAN NOT NULL,
    "is_first_bay" BOOLEAN NOT NULL,
    "has_bay_dividers" BOOLEAN NOT NULL,
    "configurationId" INTEGER NOT NULL,

    CONSTRAINT "wash_bays_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "water_tanks" ADD CONSTRAINT "water_tanks_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_bays" ADD CONSTRAINT "wash_bays_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
