"use client";

import ConfigForm from "@/components/config-form";
import { UpdateConfigSchema } from "@/validation/config-schema";
import { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import React, { useEffect } from "react";
import WaterTankForm from "./water-tank-form";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";

interface ConfigurationFormProps {
  confId?: number;
  configuration?: UpdateConfigSchema;
  initialWaterTanks?: UpdateWaterTankSchema[];
}

const FormContainer = ({
  confId,
  configuration,
  initialWaterTanks,
}: ConfigurationFormProps) => {
  const [waterTanks, setWaterTanks] = React.useState<UpdateWaterTankSchema[]>(
    initialWaterTanks || []
  );
  const [showAddWaterTankForm, setShowAddWaterTankForm] =
    React.useState<boolean>(false);

  useEffect(() => {
    setWaterTanks(initialWaterTanks || []);
  }, [initialWaterTanks]);

  const handleDeleteWaterTank = (tankId: number) => {
    const updatedWaterTanks = waterTanks.filter((wt) => wt.id !== tankId);
    setWaterTanks(updatedWaterTanks);
  };

  const handleSaveSuccess = () => {
    setShowAddWaterTankForm(false);
  };

  return (
    <>
      <ConfigForm id={confId} configuration={configuration} />
      {/* Water Tanks */}
      {confId && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">
            Serbatoi Acqua
          </h2>

          {/* List Existing Water Tanks */}
          {waterTanks.map((wt, index) => (
            <WaterTankForm
              key={wt.id} // Use stable ID as key
              confId={confId}
              waterTank={wt} // Pass existing tank data
              waterTankIndex={index + 1}
              onDelete={handleDeleteWaterTank} // Pass the delete handler
              onSaveSuccess={handleSaveSuccess} // Pass save handler
            />
          ))}

          {/* "Add New Water Tank" Form (Conditional) */}
          {showAddWaterTankForm && (
            <WaterTankForm
              confId={confId}
              onSaveSuccess={handleSaveSuccess} // Pass save handler
              // Optional: Add a cancel button specific to hiding this form
            />
          )}

          {/* Button to Add New Tank */}
          {!showAddWaterTankForm && (
            <div className="flex">
              <Button
                className="ml-auto"
                variant="outline"
                onClick={() => setShowAddWaterTankForm(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Serbatoio
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FormContainer;
