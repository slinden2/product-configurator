"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { configSchema } from "@/validation/configSchema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import GeneralSection from "@/components/ConfigForm/GeneralSection";
import BrushSection from "@/components/ConfigForm/BrushSection";
import ChemPumpSection from "@/components/ConfigForm/ChemPumpSection";
import SupplySection from "@/components/ConfigForm/SupplySection";
import WaterSupplySection from "@/components/ConfigForm/WaterSupplySection";
import RailSection from "@/components/ConfigForm/RailSection";
import PanelSection from "@/components/ConfigForm/PanelSection";
import HPPumpSection from "@/components/ConfigForm/HPPumpSection";
import { DevTool } from "@hookform/devtools";
import WaterTankSection from "@/components/ConfigForm/WaterTankSection";
import WashBaySection from "@/components/ConfigForm/WashBaySection";

export type ConfigFormData = z.infer<typeof configSchema>;

const ConfigForm = () => {
  const [error, setError] = useState<string>("");

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: "Nome Cliente",
      description: "Descrizione Impianto",
      brush_num: "0",
      supply_type: "STRAIGHT_SHELF",
      supply_fixing_type: "NONE",
      supply_side: "TBD",
      water_type_1: "NETWORK",
      rail_type: "DOWELED",
      rail_length: "25",
      rail_guide_num: "0",
      panel_num: "ONE",
      panel_pos: "INTERNAL",
      water_tanks: [
        {
          type: "2500L",
          inlet_w_float_qty: "1",
          inlet_no_float_qty: "0",
          outlet_w_valve_qty: "1",
          outlet_no_valve_qty: "0",
          has_blower: false,
        },
      ],
      wash_bays: [
        {
          hp_lance_qty: "2",
          det_lance_qty: "2",
          hose_reel_qty: "2",
          pressure_washer_type: "21L/200BAR",
          pressure_washer_qty: "2",
          has_gantry: true,
          is_first_bay: true,
          has_bay_dividers: false,
        },
      ],
    },
  });

  async function onSubmit(values: ConfigFormData) {
    console.log(values);
  }

  return (
    <div>
      <DevTool control={form.control} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <GeneralSection />
          <BrushSection />
          <ChemPumpSection />
          <WaterSupplySection />
          <SupplySection />
          <RailSection />
          <PanelSection />
          <HPPumpSection />
          <WaterTankSection />
          <WashBaySection />
          <Button type="submit">Salva</Button>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;
