import Fieldset from "@/components/Fieldset";
import FieldsetContent from "@/components/FieldsetContent";
import InputField from "@/components/InputField";
import TextareaField from "@/components/TextareaField";
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
