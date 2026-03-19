"use client";

import ConfigForm from "@/components/config-form";
import { UpdateConfigSchema } from "@/validation/config-schema";
import { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import React, { useCallback, useEffect, useState } from "react";
import WaterTankForm from "./water-tank-form";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import WashBayForm from "./wash-bay-form";
import useMediaQuery from "@/hooks/use-media-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfigurationStatusType, Role } from "@/types";
import { isEditable } from "@/app/actions/lib/auth-checks";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose,
} from "@/components/ui/responsive-modal";

interface ConfigurationFormProps {
  confId?: number;
  configuration?: UpdateConfigSchema;
  confStatus?: ConfigurationStatusType;
  userRole?: Role;
  initialWaterTanks?: UpdateWaterTankSchema[];
  initialWashBays?: UpdateWashBaySchema[];
}

const TABS_CONFIG = [
  { value: "config", label: "Configurazione" },
  { value: "tanks", label: "Serbatoi" },
  { value: "bays", label: "Piste Lavaggio" },
];

const FormContainer = ({
  confId,
  configuration,
  confStatus,
  userRole,
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
  const [dirtyFormKeys, setDirtyFormKeys] = useState<Set<string>>(new Set());
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const showAddEntityButton = !!confStatus && !!userRole && isEditable(confStatus, userRole);

  useEffect(() => {
    setWaterTanks(initialWaterTanks || []);
  }, [initialWaterTanks]);

  useEffect(() => {
    setWashBays(initialWashBays || []);
  }, [initialWashBays]);

  const handleDirtyChange = useCallback((key: string, isDirty: boolean) => {
    setDirtyFormKeys((prev) => {
      const next = new Set(prev);
      isDirty ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  const handleSaved = useCallback((key: string) => {
    setDirtyFormKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Auto-switch to pending tab once all dirty forms have been saved
  useEffect(() => {
    if (dirtyFormKeys.size === 0 && pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }, [dirtyFormKeys, pendingTab]);

  const handleTabChange = (newTab: string) => {
    if (dirtyFormKeys.size > 0) {
      setPendingTab(newTab);
      setIsUnsavedModalOpen(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleSaveAndSwitch = () => {
    setIsUnsavedModalOpen(false);
    dirtyFormKeys.forEach((key) => {
      (document.getElementById(`form-${key}`) as HTMLFormElement | null)?.requestSubmit();
    });
  };

  const handleDiscardAndSwitch = () => {
    setDirtyFormKeys(new Set());
    if (pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
    setIsUnsavedModalOpen(false);
  };

  const handleDeleteWaterTank = (tankId: number) => {
    const updatedWaterTanks = waterTanks.filter((wt) => wt.id !== tankId);
    setWaterTanks(updatedWaterTanks);
  };

  const handleDeleteWashBay = (bayId: number) => {
    const updatedWashBays = washBays.filter((wb) => wb.id !== bayId);
    setWashBays(updatedWashBays);
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

  // If no confStatus, it means that the data is not ok in the db.
  if (!confStatus) {
    return <ConfigForm />;
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="config"
        className="w-full space-y-4">
        {/* Conditionally render TabsList or Select */}
        {isDesktop ? (
          // Desktop: Render horizontal tabs
          <TabsList className="w-full grid grid-cols-3">
            {TABS_CONFIG.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : (
          // Mobile: Render Select dropdown
          <div className="space-y-2 mb-6">
            <span className="block text-sm">Sezione attiva</span>
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona sezione..." />
              </SelectTrigger>
              <SelectContent>
                {TABS_CONFIG.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <TabsContent value="config">
          <ConfigForm
            id={confId}
            configuration={configuration}
            status={confStatus}
            userRole={userRole}
            formKey="config"
            onDirtyChange={handleDirtyChange}
            onSaved={handleSaved}
          />
        </TabsContent>

        <TabsContent value="tanks" className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">
            Gestione Serbatoi
          </h2>

          {/* List Existing Water Tanks */}
          {waterTanks.map((wt, index) => (
            <WaterTankForm
              key={wt.id}
              confId={confId}
              confStatus={confStatus}
              userRole={userRole}
              waterTank={wt}
              waterTankIndex={index + 1}
              onDelete={handleDeleteWaterTank}
              onSaveSuccess={handleSaveSuccess}
              formKey={wt.id?.toString() ?? `tank-${index}`}
              onDirtyChange={handleDirtyChange}
              onSaved={handleSaved}
            />
          ))}

          {/* "Add New Water Tank" Form (Conditional) */}
          {showAddWaterTankForm && (
            <WaterTankForm
              confId={confId}
              confStatus={confStatus}
              userRole={userRole}
              onSaveSuccess={handleSaveSuccess}
              formKey="new-tank"
              onDirtyChange={handleDirtyChange}
              onSaved={handleSaved}
            />
          )}

          {/* Button to Add New Tank */}
          {!showAddWaterTankForm && showAddEntityButton && (
            <div className="flex">
              <Button
                className="ml-auto"
                variant="outline"
                onClick={() => setShowAddWaterTankForm(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Serbatoio
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bays" className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Gestione Piste</h2>

          {/* Warning: energy chain config requires a gantry wash bay with chain width set */}
          {configuration?.supply_type === "ENERGY_CHAIN" &&
            !washBays.some((wb) => wb.has_gantry && wb.energy_chain_width) && (
              <p className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-2">
                Con la catena portacavi è obbligatoria almeno una pista con portale e larghezza catena configurata.
              </p>
            )}

          {/* List Existing Wash Bays */}
          {washBays.map((wb, index) => (
            <WashBayForm
              key={wb.id}
              confId={confId}
              confStatus={confStatus}
              userRole={userRole}
              supplyType={configuration?.supply_type}
              washBay={wb}
              washBayIndex={index + 1}
              onDelete={handleDeleteWashBay}
              onSaveSuccess={handleSaveSuccess}
              formKey={wb.id?.toString() ?? `bay-${index}`}
              onDirtyChange={handleDirtyChange}
              onSaved={handleSaved}
            />
          ))}

          {/* "Add New Wash Bay" Form (Conditional) */}
          {showAddWashBayForm && (
            <WashBayForm
              confId={confId}
              confStatus={confStatus}
              userRole={userRole}
              supplyType={configuration?.supply_type}
              onSaveSuccess={handleSaveSuccess}
              formKey="new-bay"
              onDirtyChange={handleDirtyChange}
              onSaved={handleSaved}
            />
          )}

          {/* Button to Add New Bay */}
          {!showAddWashBayForm && showAddEntityButton && (
            <div className="flex">
              <Button
                className="ml-auto"
                variant="outline"
                onClick={() => setShowAddWashBayForm(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Pista
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Unsaved changes confirmation modal */}
      <ResponsiveModal open={isUnsavedModalOpen} onOpenChange={setIsUnsavedModalOpen}>
        <ResponsiveModalContent side="bottom">
          <ResponsiveModalHeader className="mb-4">
            <ResponsiveModalTitle>Modifiche non salvate</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Hai modifiche non salvate. Cosa vuoi fare prima di cambiare sezione?
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="gap-2">
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline" className="sm:min-w-[100px]">
                Continua a modificare
              </Button>
            </ResponsiveModalClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDiscardAndSwitch}
              className="sm:min-w-[100px]"
            >
              Scarta modifiche
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndSwitch}
              className="sm:min-w-[100px]"
            >
              Salva
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
};

export default FormContainer;
