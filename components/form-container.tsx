import ConfigForm from "@/components/config-form";
import WaterTankForm from "@/components/water-tank-form";
import { ConfigSchema, UpdateConfigSchema } from "@/validation/config-schema";
import React from "react";

interface ConfigurationFormProps {
  id?: number;
  configuration?: UpdateConfigSchema;
}

const FormContainer = ({ id, configuration }: ConfigurationFormProps) => {
  return (
    <div>
      <ConfigForm id={id} configuration={configuration} />
    </div>
  );
};

export default FormContainer;
