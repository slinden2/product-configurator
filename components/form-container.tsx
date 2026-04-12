"use client";

import { PlusCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigForm from "@/components/config-form";
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useMediaQuery from "@/hooks/use-media-query";
import type { ConfigurationStatusType, Role } from "@/types";
import type { UpdateConfigSchema } from "@/validation/config-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import { Button } from "./ui/button";
import WashBayForm from "./wash-bay-form";
import WaterTankForm from "./water-tank-form";

interface ConfigurationFormProps {
  confId?: number;
  configuration?: UpdateConfigSchema;
  confStatus?: ConfigurationStatusType;
  userRole?: Role;
  initialWaterTanks?: UpdateWaterTankSchema[];
  initialWashBays?: UpdateWashBaySchema[];
  hasEngineeringBom?: boolean;
}

const TABS_CONFIG = [
  { value: "config", label: "Configurazione" },
  { value: "tanks", label: "Serbatoi" },
  { value: "bays", label: "Piste lavaggio" },
];

interface EntityTabContentProps {
  title: string;
  renderForms: () => React.ReactNode;
  renderAddForm: () => React.ReactNode;
  showAddForm: boolean;
  onShowAddForm: () => void;
  showAddButton: boolean;
  addButtonLabel: string;
  warning?: React.ReactNode;
}

const EntityTabContent = ({
  title,
  renderForms,
  renderAddForm,
  showAddForm,
  onShowAddForm,
  showAddButton,
  addButtonLabel,
  warning,
}: EntityTabContentProps) => (
  <>
    <h2 className="text-xl font-semibold border-b pb-2">{title}</h2>
    {warning}
    {renderForms()}
    {showAddForm && renderAddForm()}
    {!showAddForm && showAddButton && (
      <div className="flex">
        <Button className="ml-auto" variant="outline" onClick={onShowAddForm}>
          <PlusCircle className="mr-2 h-4 w-4" /> {addButtonLabel}
        </Button>
      </div>
    )}
  </>
);

const FormContainer = ({
  confId,
  configuration,
  confStatus,
  userRole,
  initialWaterTanks,
  initialWashBays,
  hasEngineeringBom,
}: ConfigurationFormProps) => {
  const [waterTanks, setWaterTanks] = useState<UpdateWaterTankSchema[]>(
    initialWaterTanks || [],
  );
  const [washBays, setWashBays] = useState<UpdateWashBaySchema[]>(
    initialWashBays || [],
  );
  const [showAddWaterTankForm, setShowAddWaterTankForm] =
    useState<boolean>(false);
  const [showAddWashBayForm, setShowAddWashBayForm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("config");
  const [dirtyFormKeys, setDirtyFormKeys] = useState<Set<string>>(new Set());
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const showAddEntityButton =
    !!confStatus && !!userRole && isEditable(confStatus, userRole);

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
      (
        document.getElementById(`form-${key}`) as HTMLFormElement | null
      )?.requestSubmit();
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
    const setter =
      entityName === "Serbatoio"
        ? setShowAddWaterTankForm
        : setShowAddWashBayForm;
    setter(false);
  };

  if (!confId || !confStatus) {
    return <ConfigForm />;
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="config"
        className="w-full space-y-4"
      >
        {isDesktop ? (
          <TabsList className="w-full grid grid-cols-3">
            {TABS_CONFIG.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : (
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
            hasEngineeringBom={hasEngineeringBom}
          />
        </TabsContent>

        <TabsContent value="tanks" className="space-y-4">
          <EntityTabContent
            title="Gestione serbatoi"
            showAddForm={showAddWaterTankForm}
            onShowAddForm={() => setShowAddWaterTankForm(true)}
            showAddButton={showAddEntityButton}
            addButtonLabel="Aggiungi serbatoio"
            renderForms={() =>
              waterTanks.map((wt, index) => (
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
                  hasEngineeringBom={hasEngineeringBom}
                />
              ))
            }
            renderAddForm={() => (
              <WaterTankForm
                confId={confId}
                confStatus={confStatus}
                userRole={userRole}
                onSaveSuccess={handleSaveSuccess}
                formKey="new-tank"
                onDirtyChange={handleDirtyChange}
                onSaved={handleSaved}
                hasEngineeringBom={hasEngineeringBom}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="bays" className="space-y-4">
          <EntityTabContent
            title="Gestione piste"
            showAddForm={showAddWashBayForm}
            onShowAddForm={() => setShowAddWashBayForm(true)}
            showAddButton={showAddEntityButton}
            addButtonLabel="Aggiungi pista"
            warning={
              configuration?.supply_type === "ENERGY_CHAIN" &&
              !washBays.some((wb) => wb.has_gantry && wb.energy_chain_width) ? (
                <p className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-2">
                  Con la catena portacavi è obbligatoria almeno una pista con
                  portale e larghezza catena configurata.
                </p>
              ) : undefined
            }
            renderForms={() =>
              washBays.map((wb, index) => (
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
                  hasEngineeringBom={hasEngineeringBom}
                />
              ))
            }
            renderAddForm={() => (
              <WashBayForm
                confId={confId}
                confStatus={confStatus}
                userRole={userRole}
                supplyType={configuration?.supply_type}
                onSaveSuccess={handleSaveSuccess}
                formKey="new-bay"
                onDirtyChange={handleDirtyChange}
                onSaved={handleSaved}
                hasEngineeringBom={hasEngineeringBom}
              />
            )}
          />
        </TabsContent>
      </Tabs>

      <ResponsiveModal
        open={isUnsavedModalOpen}
        onOpenChange={(open) => {
          setIsUnsavedModalOpen(open);
          if (!open) setPendingTab(null);
        }}
      >
        <ResponsiveModalContent side="bottom">
          <ResponsiveModalHeader className="mb-4">
            <ResponsiveModalTitle>Modifiche non salvate</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Hai modifiche non salvate. Cosa vuoi fare prima di cambiare
              sezione?
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="gap-2">
            <ResponsiveModalClose asChild>
              <Button
                type="button"
                variant="outline"
                className="sm:min-w-[100px]"
              >
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
