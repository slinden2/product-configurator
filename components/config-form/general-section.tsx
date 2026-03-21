import Fieldset from "@/components/fieldset";
import InputField from "@/components/input-field";
import TextareaField from "@/components/textarea-field";
import { ConfigSchema } from "@/validation/config-schema";
import React from "react";

const GeneralSection = () => {
  return (
    <Fieldset
      title="Informazioni generali"
      description="Compila i dati del cliente e la descrizione dell'impianto">
      <div className="fs-content">
        <InputField<ConfigSchema>
          name="name"
          label="Nome del cliente"
          placeholder="Inserire il nome del cliente"
        />
        <TextareaField<ConfigSchema>
          name="description"
          label="Descrizione"
          placeholder="Inserire la descrizione"
        />
      </div>
    </Fieldset>
  );
};

export default GeneralSection;
