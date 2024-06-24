"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import {
  configSchema,
  selectFieldOptions,
  zodEnums,
} from "@/validation/configSchema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import InputField from "@/components/InputField";
import TextareaField from "@/components/TextareaField";
import SelectField from "@/components/SelectField";
import { Separator } from "@/components/ui/separator";
import CheckboxField from "@/components/CheckboxField";
import FormSection from "@/components/FormSection";
import { DevTool } from "@hookform/devtools";

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
    },
  });

  const brushNumWatch = form.watch("brush_num");
  const hasChemicalPumpWatch = form.watch("has_chemical_pump");
  const hasAcidPumpWatch = form.watch("has_acid_pump");
  const supplyTypeWatch = form.watch("supply_type");
  const supplyFixingTypeWatch = form.watch("supply_fixing_type");
  const waterType2Watch = form.watch("water_type_2");
  const panelNumWatch = form.watch("panel_num");
  const panelPosWatch = form.watch("panel_pos");
  const hasItecowebWatch = form.watch("has_itecoweb");
  const hasCardReaderWatch = form.watch("has_card_reader");

  React.useEffect(() => {
    // Resetting card_num when itecoweb and card_reader are unchecked
    if (!hasItecowebWatch && !hasCardReaderWatch) {
      form.setValue("card_num", "");
    }
  }, [hasItecowebWatch, hasCardReaderWatch, form]);

  async function onSubmit(values: ConfigFormData) {
    console.log(values);
  }

  return (
    <div>
      {/* <DevTool control={form.control} /> */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Informazioni generali">
            <div className="space-y-4">
              <InputField
                name="name"
                label="Nome del cliente"
                placeholder="Inserire il nome del cliente"
              />
              <TextareaField
                name="description"
                label="Descrizione"
                placeholder="Inserire la descrizione"
              />
            </div>
          </FormSection>
          <FormSection title="Spazzole">
            <div className="md:flex md:justify-between md:gap-4 space-y-3 md:space-y-0">
              <div className="md:flex-1">
                <SelectField
                  name="brush_num"
                  label="Numero di spazzole"
                  items={selectFieldOptions.brushNums}
                  fieldsToResetOnValue={[
                    {
                      triggerValue: "0",
                      fieldsToReset: ["brush_type", "brush_color"],
                    },
                  ]}
                />
              </div>
              <div className="md:flex-1">
                <SelectField
                  name="brush_type"
                  label="Tipo di setole"
                  disabled={!brushNumWatch || brushNumWatch === "0"}
                  items={selectFieldOptions.brushTypes}
                />
              </div>
              <div className="md:flex-1">
                <SelectField
                  name="brush_color"
                  label="Colore di setole"
                  disabled={!brushNumWatch || brushNumWatch === "0"}
                  items={selectFieldOptions.brushColors}
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Pompe dosatrici">
            <div className="mt-4 grid grid-rows-2 grid-cols-2 md:grid-rows-1 md:grid-cols-4">
              <CheckboxField
                name="has_shampoo_pump"
                label="Pompa sapone"
                containerClassName=""
              />
              <CheckboxField
                name="has_wax_pump"
                label="Pompa cera"
                containerClassName="ml-auto md:ml-0 w-32 md:w-max"
              />
              <CheckboxField
                name="has_chemical_pump"
                label="Pompa prelavaggio"
                containerClassName="md:ml-auto"
                fieldsToResetOnUncheck={[
                  "chemical_num",
                  "chemical_pump_pos",
                  "has_foam",
                ]}
              />
              <CheckboxField
                name="has_acid_pump"
                label="Pompa acido"
                description="Solo per OMZ"
                containerClassName="ml-auto w-32 md:w-max"
                fieldsToResetOnUncheck={["acid_pump_pos"]}
              />
            </div>
            {hasChemicalPumpWatch && (
              <div>
                <Separator className="my-4" />
                <div className="md:flex md:gap-4">
                  <div className="md:flex-1 my-4">
                    <SelectField
                      name="chemical_num"
                      label="Numero di pompe di prelavaggio"
                      description="La seconda pompa serve esclusivamente per le barre di prelavaggio basse."
                      items={selectFieldOptions.chemicalNum}
                    />
                  </div>
                  <div className="md:flex-1 my-4">
                    <SelectField
                      name="chemical_pump_pos"
                      label="Posizione delle pompe di prelavaggio"
                      items={selectFieldOptions.chemicalPumpPositions}
                    />
                  </div>
                </div>
                <CheckboxField
                  name="has_foam"
                  label="Nebulizzazione con schiuma"
                />
              </div>
            )}
            {hasAcidPumpWatch && (
              <div>
                <Separator className="my-4" />
                <SelectField
                  name="acid_pump_pos"
                  label="Posizione della pompa acido"
                  items={selectFieldOptions.chemicalPumpPositions}
                />
              </div>
            )}
          </FormSection>
          <FormSection title="Alimentazione portale">
            <div className="space-y-3 md:flex md:gap-4 md:space-y-0">
              <div className="md:flex-1 space-y-2">
                <SelectField
                  name="supply_type"
                  label="Tipo di alimentazione"
                  items={selectFieldOptions.supplyTypes}
                  fieldsToResetOnValue={[
                    {
                      triggerValue: "BOOM",
                      fieldsToReset: ["has_post_frame"],
                      invertTrigger: true,
                    },
                    {
                      triggerValue: "CABLE_CHAIN",
                      fieldsToReset: ["cable_chain_width"],
                      invertTrigger: true,
                    },
                  ]}
                />
                {supplyTypeWatch === "CABLE_CHAIN" && (
                  <SelectField
                    name="cable_chain_width"
                    label="Larghezza catena"
                    items={selectFieldOptions.cableChainWidths}
                  />
                )}
              </div>
              <div className="md:flex-1 space-y-2">
                <SelectField
                  name="supply_fixing_type"
                  label="Tipo di fissaggio"
                  items={selectFieldOptions.supplyFixingTypes}
                  fieldsToResetOnValue={[
                    {
                      triggerValue: zodEnums.SupplyFixingTypeEnum.enum.POST,
                      fieldsToReset: ["has_post_frame"],
                      invertTrigger: true,
                    },
                  ]}
                />
                {supplyTypeWatch === zodEnums.SupplyTypeEnum.enum.BOOM &&
                  supplyFixingTypeWatch ===
                    zodEnums.SupplyFixingTypeEnum.enum.POST && (
                    <CheckboxField
                      name="has_post_frame"
                      label="Con telaio e coperchio"
                    />
                  )}
              </div>
              <div className="md:flex-1">
                <SelectField
                  name="supply_side"
                  label="Lato di alimentazione"
                  items={selectFieldOptions.supplySides}
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Alimentazione acqua">
            <div className="space-y-3">
              <div className="md:flex md:gap-4 md:space-y-0 space-y-2">
                <div className="md:flex-1 ">
                  <div className="space-y-2">
                    <SelectField
                      name="water_type_1"
                      label="Tipo acqua 1"
                      items={selectFieldOptions.waterTypes1}
                    />
                    <SelectField
                      name="booster_pump_1"
                      label="Pompa di rilancio"
                      items={selectFieldOptions.boosterPumps}
                    />
                  </div>
                </div>
                <div className="md:flex-1 ">
                  <div className="space-y-2">
                    <SelectField
                      name="water_type_2"
                      label="Tipo acqua 2"
                      items={selectFieldOptions.waterTypes2}
                      fieldsToResetOnValue={[
                        {
                          triggerValue:
                            zodEnums.WaterType2Enum.enum.NO_SELECTION,
                          fieldsToReset: ["booster_pump_2"],
                        },
                      ]}
                    />
                    {waterType2Watch &&
                      waterType2Watch in zodEnums.WaterType1Enum.enum && (
                        <SelectField
                          name="booster_pump_2"
                          label="Pompa di rilancio"
                          items={selectFieldOptions.boosterPumps}
                        />
                      )}
                  </div>
                </div>
                <div className="hidden md:block md:flex-1" />
              </div>
              <div className="">
                <CheckboxField
                  name="has_antifreeze"
                  label="Scarico invernale"
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Rotaie">
            <div className="space-y-2 md:flex md:space-y-0 md:gap-4">
              <div className="md:flex-1">
                <SelectField
                  name="rail_type"
                  label="Tipo di rotaie"
                  items={selectFieldOptions.railTypes}
                />
              </div>
              <div className="md:flex-1">
                <InputField
                  name="rail_length"
                  label="Lunghezza rotaie"
                  placeholder="Inserire lunghezza (7-26m)"
                />
              </div>
              <div className="md:flex-1">
                <SelectField
                  name="rail_guide_num"
                  label="Guida ruote"
                  items={selectFieldOptions.railGuideNum}
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Configurazione quadro elettrico">
            <div className="space-y-3">
              <div className="md:flex md:gap-4">
                <div className="md:flex-1">
                  <SelectField
                    name="panel_num"
                    label="Numero di pannelli"
                    items={selectFieldOptions.panelNums}
                    fieldsToResetOnValue={[
                      {
                        triggerValue: zodEnums.PanelNumEnum.enum.TWO,
                        fieldsToReset: ["panel_pos"],
                      },
                    ]}
                  />
                </div>
                <div className="md:flex-1">
                  {panelNumWatch === zodEnums.PanelNumEnum.enum.ONE && (
                    <SelectField
                      name="panel_pos"
                      label="Posizione pannello"
                      items={selectFieldOptions.panelPositions}
                      fieldsToResetOnValue={[
                        {
                          triggerValue: zodEnums.PanelPosEnum.enum.INTERNAL,
                          fieldsToReset: ["ext_panel_fixing_type"],
                        },
                      ]}
                    />
                  )}
                </div>
                <div className="md:flex-1">
                  {(panelNumWatch === zodEnums.PanelNumEnum.enum.TWO ||
                    panelPosWatch === "EXTERNAL") && (
                    <SelectField
                      name="ext_panel_fixing_type"
                      label="Fissaggio pannello esterno"
                      items={selectFieldOptions.extPanelFixingTypes}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div>
                    <CheckboxField name="has_itecoweb" label="Itecoweb" />
                  </div>
                  <div>
                    <CheckboxField
                      name="has_card_reader"
                      label="Lettore schede"
                    />
                  </div>
                </div>
                {(hasItecowebWatch || hasCardReaderWatch) && (
                  <div className="w-1/3">
                    <InputField
                      name="card_num"
                      label="Numero di schede"
                      placeholder="Inserisci numero di schede"
                    />
                  </div>
                )}
              </div>
            </div>
          </FormSection>
          <Button type="submit">Salva</Button>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;
