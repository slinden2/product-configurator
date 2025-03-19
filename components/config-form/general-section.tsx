import Fieldset from "@/components/fieldset";
import FieldsetContent from "@/components/fieldset-content";
import InputField from "@/components/input-field";
import TextareaField from "@/components/textarea-field";
import React from "react";

const GeneralSection = () => {
  return (
    <Fieldset title="Informazioni generali">
      <FieldsetContent>
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
      </FieldsetContent>
    </Fieldset>
  );
};

export default GeneralSection;
