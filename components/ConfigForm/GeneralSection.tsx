import FormSection from "@/components/FormSection";
import InputField from "@/components/InputField";
import TextareaField from "@/components/TextareaField";
import React from "react";

const GeneralSection = () => {
  return (
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
  );
};

export default GeneralSection;
