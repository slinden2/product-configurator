"use client";

import { deleteWaterTankAction } from "@/app/actions/delete-water-tank-action";
import ConfigForm from "@/components/config-form";
import { Button } from "@/components/ui/button";
import WaterTankForm from "@/components/water-tank-form";
import { UpdateConfigSchema } from "@/validation/config-schema";
import { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import React from "react";

interface WaterTankState extends UpdateWaterTankSchema {
  tempId?: string;
}

interface ConfigurationFormProps {
  confId?: number; // ID of the parent configuration
  configuration?: UpdateConfigSchema;
  existingWaterTanks: UpdateWaterTankSchema[];
}

const createDefaultWaterTank = (
  configId: number | undefined,
  tempId: string
): WaterTankState | null => {
  if (configId === undefined) {
    console.error("Cannot add a water tank without a configuration ID.");
    return null;
  }
  return {
    tempId: tempId,
    id: undefined,
    configuration_id: configId,
    type: "L2500",
    inlet_w_float_qty: 0,
    inlet_no_float_qty: 0,
    outlet_w_valve_qty: 0,
    outlet_no_valve_qty: 0,
    has_blower: false,
  };
};

const FormContainer = ({
  confId,
  configuration,
  existingWaterTanks,
}: ConfigurationFormProps) => {
  const [waterTanks, setWaterTanks] = React.useState<WaterTankState[]>(
    existingWaterTanks ? existingWaterTanks.map((tank) => ({ ...tank })) : []
  );
  const [nextTempId, setNextTempId] = React.useState(0);

  // State to track the ID (db or temp) of the tank currently being removed
  const [removingTankId, setRemovingTankId] = React.useState<
    string | number | null
  >(null);

  const addWaterTank = () => {
    const tempId = `temp-${nextTempId}`;
    const newWaterTank = createDefaultWaterTank(confId, tempId);

    if (newWaterTank === null) {
      return;
    }
    setWaterTanks((prevTanks) => [...prevTanks, newWaterTank]);
    setNextTempId((prevId) => prevId + 1);
  };

  const removeWaterTank = async (identifierToRemove: number | string) => {
    const tankToRemove = waterTanks.find(
      (tank) => (tank.tempId ?? tank.id) === identifierToRemove
    );

    if (!tankToRemove || removingTankId !== null) {
      // Prevent concurrent removals or removing non-existent
      if (removingTankId !== null)
        console.warn("Another removal is already in progress.");
      else
        console.warn("Tank to remove not found in state:", identifierToRemove);
      return;
    }

    // Check if it's a persisted tank (requires async action)
    if (typeof identifierToRemove === "number" && tankToRemove.id) {
      if (confId) {
        setRemovingTankId(identifierToRemove);
        try {
          await deleteWaterTankAction(confId, tankToRemove.id);
          setWaterTanks((prevTanks) =>
            prevTanks.filter((tank) => tank.id !== identifierToRemove)
          );
        } catch (error) {
          console.error("Failed to delete water tank from server:", error);
        } finally {
          setRemovingTankId(null); // <<< Unset loading state regardless of outcome
        }
      } else {
        console.error(
          "Cannot delete persisted tank: Parent Configuration ID is missing."
        );
        // Show error notification?
      }
    }
    // Check if it's a temporary tank (synchronous removal)
    else if (typeof identifierToRemove === "string" && tankToRemove.tempId) {
      setWaterTanks((prevTanks) =>
        prevTanks.filter((tank) => tank.tempId !== identifierToRemove)
      );
    } else {
      console.warn(
        "Could not determine how to remove tank with identifier:",
        identifierToRemove
      );
    }
  };

  return (
    <div>
      {/* Configuration Form */}
      <ConfigForm id={confId} configuration={configuration} />

      {/* Water Tanks Section */}
      <h2>Serbatoi d'acqua</h2>
      {waterTanks.length > 0 ? (
        waterTanks.map((waterTank, index) => {
          // Determine the unique ID for this tank (temp or db)
          const tankIdentifier = waterTank.tempId ?? waterTank.id;
          return (
            <WaterTankForm
              key={tankIdentifier ?? `fallback-${index}`}
              confId={waterTank.configuration_id}
              waterTank={waterTank}
              onRemove={() => removeWaterTank(tankIdentifier!)} // Pass the correct identifier
              // --- PASS LOADING STATE DOWN ---
              isRemoving={removingTankId === tankIdentifier} // Check if *this* tank is the one being removed
            />
          );
        })
      ) : (
        <p>Non ci sono serbatoi nella configurazione.</p>
      )}

      {/* Add Tank Button */}
      <Button
        variant="link"
        type="button"
        onClick={addWaterTank}
        disabled={confId === undefined || removingTankId !== null}>
        Aggiungi serbatoio
      </Button>
      {/* Optional: Hint for the user if button is disabled */}
      {confId === undefined && (
        <p style={{ color: "gray", fontSize: "0.8em" }}>
          Salva prima la configurazione per aggiungere serbatoi.
        </p>
      )}
      {removingTankId !== null && (
        <p style={{ color: "orange", fontSize: "0.8em" }}>
          Rimozione serbatoio in corso...
        </p>
      )}
    </div>
  );
};

export default FormContainer;
