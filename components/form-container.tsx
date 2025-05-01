"use client";

import ConfigForm from "@/components/config-form";
import { UpdateConfigSchema } from "@/validation/config-schema";
import { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import React, { useEffect, useState } from "react";
import WaterTankForm from "./water-tank-form";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import WashBayForm from "./wash-bay-form.tsx";

interface ConfigurationFormProps {
  confId?: number;
  configuration?: UpdateConfigSchema;
  initialWaterTanks?: UpdateWaterTankSchema[];
  initialWashBays?: UpdateWashBaySchema[];
}

const FormContainer = ({
  confId,
  configuration,
  initialWaterTanks,
  initialWashBays,
}: ConfigurationFormProps) => {
  const [waterTanks, setWaterTanks] = useState<UpdateWaterTankSchema[]>(
    initialWaterTanks || []
  );
  const [washBays, setWashBays] = useState<UpdateWashBaySchema[]>(
    initialWashBays || []
  );
  const [showAddWaterTankForm, setShowAddWaterTankForm] =
    useState<boolean>(false);
  const [showAddWashBayForm, setShowAddWashBayForm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("config");

  useEffect(() => {
    setWaterTanks(initialWaterTanks || []);
  }, [initialWaterTanks]);

  useEffect(() => {
    setWashBays(initialWashBays || []);
  }, [initialWashBays]);

  const handleDeleteWaterTank = (tankId: number) => {
    const updatedWaterTanks = waterTanks.filter((wt) => wt.id !== tankId);
    setWaterTanks(updatedWaterTanks);
  };

  const handleSaveSuccess = (entityName: "Serbatoio" | "Pista") => {
    if (entityName === "Serbatoio") {
      setShowAddWaterTankForm(false);
    }

    if (entityName === "Pista") {
      setShowAddWashBayForm(false);
    }
  };

  // If no confId, it's the "New Configuration" page - only show ConfigForm
  if (!confId) {
    return <ConfigForm />;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      defaultValue="config"
      className="w-full space-y-4"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="config">Configurazione</TabsTrigger>
        <TabsTrigger value="tanks">Serbatoi</TabsTrigger>
        <TabsTrigger value="bays">Piste Lavaggio (WIP)</TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <ConfigForm id={confId} configuration={configuration} />
      </TabsContent>

      <TabsContent value="tanks" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          Gestione Serbatoi
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
              onClick={() => setShowAddWaterTankForm(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Serbatoio
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="bays" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Gestione Piste</h2>

        {/* List Existing Wash Bays */}
        {washBays.map((wb, index) => (
          <WashBayForm
            key={wb.id} // Use stable ID as key
            confId={confId}
            washBay={wb} // Pass existing tank data
            washBayIndex={index + 1}
            onDelete={handleDeleteWaterTank} // Pass the delete handler
            onSaveSuccess={handleSaveSuccess} // Pass save handler
          />
        ))}

        {/* "Add New Wash Bay" Form (Conditional) */}
        {showAddWashBayForm && (
          <WashBayForm
            confId={confId}
            onSaveSuccess={handleSaveSuccess} // Pass save handler
            // Optional: Add a cancel button specific to hiding this form
          />
        )}

        {/* Button to Add New Bay */}
        {!showAddWashBayForm && (
          <div className="flex">
            <Button
              className="ml-auto"
              variant="outline"
              onClick={() => setShowAddWashBayForm(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Pista
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default FormContainer;
