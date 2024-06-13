"use client";

import React from "react";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { configSchema, selectFieldOptions } from "@/validation/configSchema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import InputField from "@/components/InputField";
import TextareaField from "@/components/TextareaField";
import SelectField from "@/components/SelectField";

export type ConfigFormData = z.infer<typeof configSchema>;

const ConfigForm = () => {
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
  });

  async function onSubmit(values: ConfigFormData) {
    console.log(values);
  }

  console.log(form);

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
          <SelectField
            name="brush_num"
            label="Numero di spazzole"
            placeholder="Selezionare il numero di spazzole"
            items={selectFieldOptions.brushNums}
          />
          <Button className="mt-2" type="submit">
            Salva
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ConfigForm;
