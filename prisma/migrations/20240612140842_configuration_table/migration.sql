-- CreateEnum
CREATE TYPE "BrushType" AS ENUM ('THREAD', 'MIXED', 'CARLITE');

-- CreateEnum
CREATE TYPE "ChemicalPumpPos" AS ENUM ('NO_PUMP', 'ABOARD', 'WASHBAY');

-- CreateEnum
CREATE TYPE "SupplySide" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('STRAIGHT_SHELF', 'BOOM', 'CABLE_CHAIN');

-- CreateEnum
CREATE TYPE "SupplyFixingType" AS ENUM ('WALL', 'FLOOR');

-- CreateEnum
CREATE TYPE "CableChainWidth" AS ENUM ('NO_CHAIN', 'L150', 'L200', 'L250', 'L300');

-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('NO_WATER', 'NETWORK', 'RECYCLED', 'DEMINERALIZED');

-- CreateEnum
CREATE TYPE "RailType" AS ENUM ('DOWELED', 'WELDED');

-- CreateTable
CREATE TABLE "configurations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brush_num" INTEGER NOT NULL,
    "brush_type" "BrushType" NOT NULL,
    "brush_color" TEXT NOT NULL,
    "has_shampoo_pump" BOOLEAN NOT NULL,
    "has_wax_pump" BOOLEAN NOT NULL,
    "has_chemical_pump" BOOLEAN NOT NULL,
    "chemical_num" INTEGER DEFAULT 0,
    "chemical_pump_pos" "ChemicalPumpPos" NOT NULL DEFAULT 'NO_PUMP',
    "has_foam" BOOLEAN NOT NULL DEFAULT false,
    "has_acid_pump" BOOLEAN NOT NULL,
    "has_hp_roof_bar" BOOLEAN NOT NULL,
    "has_chemical_roof_bar" BOOLEAN NOT NULL DEFAULT false,
    "has_high_spinners" BOOLEAN NOT NULL DEFAULT false,
    "has_low_spinners" BOOLEAN NOT NULL,
    "has_short_hp_bars" BOOLEAN NOT NULL,
    "has_long_hp_bars" BOOLEAN NOT NULL,
    "supply_side" "SupplySide" NOT NULL,
    "supply_type" "SupplyType" NOT NULL,
    "supply_fixing_type" "SupplyFixingType" NOT NULL,
    "has_post_frame" BOOLEAN NOT NULL DEFAULT false,
    "cable_chain_width" "CableChainWidth" NOT NULL DEFAULT 'NO_CHAIN',
    "has_double_supply" BOOLEAN NOT NULL,
    "water_type_1" "WaterType" NOT NULL,
    "water_type_2" "WaterType" NOT NULL DEFAULT 'NO_WATER',
    "rail_type" "RailType" NOT NULL,
    "rail_length" INTEGER NOT NULL,
    "rail_guide_num" INTEGER NOT NULL,
    "has_itecoweb" BOOLEAN NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);
