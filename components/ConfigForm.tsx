"use client";

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { configSchema, selectFieldOptions } from "@/validation/configSchema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import InputField from "@/components/InputField";
import TextareaField from "@/components/TextareaField";
import SelectField from "@/components/SelectField";
import { Separator } from "@/components/ui/separator";
import CheckboxField from "@/components/CheckboxField";

export type ConfigFormData = z.infer<typeof configSchema>;

const ConfigForm = () => {
  const [error, setError] = useState<string>("");

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
  });

  const brushNum = form.watch("brush_num");
  const hasChemicalPump = form.watch("has_chemical_pump");
  const hasAcidPump = form.watch("has_acid_pump");
  const hasHPRoofBar = form.watch("has_hp_roof_bar");

  async function onSubmit(values: ConfigFormData) {
    console.log(values);
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
          <Separator className="my-4" />
          <div className="md:flex md:justify-between md:gap-4">
            <SelectField
              name="brush_num"
              label="Numero di spazzole"
              placeholder="Selezionare..."
              className="md:flex-1"
              items={selectFieldOptions.brushNums}
              fieldsToResetOnValue={{
                triggerValue: 0,
                fieldsToReset: ["brush_type", "brush_color"],
              }}
            />
            {brushNum > 0 ? (
              <>
                <SelectField
                  name="brush_type"
                  label="Tipo di setole"
                  placeholder="Selezionare..."
                  className="md:flex-1"
                  disabled={!brushNum || brushNum == 0}
                  items={selectFieldOptions.brushTypes}
                />
                <SelectField
                  name="brush_color"
                  label="Colore di setole"
                  placeholder="Selezionare..."
                  className="md:flex-1"
                  disabled={!brushNum || brushNum == 0}
                  items={selectFieldOptions.brushColors}
                />
              </>
            ) : (
              <>
                <div className="md:flex-1" />
                <div className="md:flex-1" />
              </>
            )}
          </div>
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
              fieldsToResetOnUncheck={["chemical_num", "chemical_pump_pos"]}
            />
            <CheckboxField
              name="has_acid_pump"
              label="Pompa acido"
              description="Solo per OMZ"
              containerClassName="ml-auto w-32 md:w-max"
              fieldsToResetOnUncheck={["acid_pump_pos"]}
            />
          </div>
          {hasChemicalPump && (
            <div>
              <Separator className="my-4" />
              <div className="md:flex md:gap-4">
                <div className="md:flex-1 my-4">
                  <SelectField
                    name="chemical_num"
                    label="Numero di pompe di prelavaggio"
                    placeholder="Selezionare..."
                    description="La seconda pompa serve esclusivamente per le barre di prelavaggio basse."
                    items={selectFieldOptions.chemicalNum}
                  />
                </div>
                <div className="md:flex-1 my-4">
                  <SelectField
                    name="chemical_pump_pos"
                    label="Posizione delle pompe di prelavaggio"
                    placeholder="Selezionare..."
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
          {hasAcidPump && (
            <div>
              <Separator className="my-4" />
              <SelectField
                name="acid_pump_pos"
                label="Posizione della pompa acido"
                placeholder="Selezionare..."
                items={selectFieldOptions.chemicalPumpPositions}
              />
            </div>
          )}
          <Separator className="my-4" />
          <div className="flex gap-4">
            <CheckboxField
              name="has_hp_roof_bar"
              label="Barra oscillante HP"
              fieldsToResetOnUncheck={["has_chemical_roof_bar"]}
            />
            {hasHPRoofBar && (
              <CheckboxField
                name="has_chemical_roof_bar"
                label="Barra di prelevaggio"
              />
            )}
          </div>
          <Button className="mt-2" type="submit">
            Salva
          </Button>
        </form>
      </Form>
      <p className="text-destructive">{error}</p>
    </div>
  );
};

export default ConfigForm;
