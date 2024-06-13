-- CreateEnum
CREATE TYPE "BrushType" AS ENUM ('THREAD', 'MIXED', 'CARLITE');

-- CreateEnum
CREATE TYPE "BrushColor" AS ENUM ('BLUE_SILVER', 'GREEN_SILVER', 'RED', 'GREEN_BLACK');

-- CreateEnum
CREATE TYPE "ChemicalPumpPos" AS ENUM ('ABOARD', 'WASH_BAY');

-- CreateEnum
CREATE TYPE "SupplySide" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('STRAIGHT_SHELF', 'BOOM', 'CABLE_CHAIN');

-- CreateEnum
CREATE TYPE "SupplyFixingType" AS ENUM ('WALL', 'FLOOR');

-- CreateEnum
CREATE TYPE "CableChainWidth" AS ENUM ('L150', 'L200', 'L250', 'L300');

-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('NETWORK', 'RECYCLED', 'DEMINERALIZED');

-- CreateEnum
CREATE TYPE "RailType" AS ENUM ('DOWELED', 'WELDED');

-- CreateTable
CREATE TABLE "configurations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brush_num" INTEGER NOT NULL,
    "brush_type" "BrushType" NOT NULL,
    "brush_color" "BrushColor" NOT NULL,
    "has_shampoo_pump" BOOLEAN NOT NULL,
    "has_wax_pump" BOOLEAN NOT NULL,
    "has_chemical_pump" BOOLEAN NOT NULL,
    "chemical_num" INTEGER,
    "chemical_pump_pos" "ChemicalPumpPos",
    "has_foam" BOOLEAN,
    "has_acid_pump" BOOLEAN NOT NULL,
    "has_hp_roof_bar" BOOLEAN NOT NULL,
    "has_chemical_roof_bar" BOOLEAN,
    "has_high_spinners" BOOLEAN NOT NULL,
    "has_low_spinners" BOOLEAN NOT NULL,
    "has_short_hp_bars" BOOLEAN NOT NULL,
    "has_long_hp_bars" BOOLEAN NOT NULL,
    "supply_side" "SupplySide" NOT NULL,
    "supply_type" "SupplyType" NOT NULL,
    "supply_fixing_type" "SupplyFixingType" NOT NULL,
    "has_post_frame" BOOLEAN,
    "cable_chain_width" "CableChainWidth",
    "has_double_supply" BOOLEAN NOT NULL,
    "water_type_1" "WaterType" NOT NULL,
    "water_type_2" "WaterType",
    "rail_type" "RailType" NOT NULL,
    "rail_length" INTEGER NOT NULL,
    "rail_guide_num" INTEGER NOT NULL,
    "has_itecoweb" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);
