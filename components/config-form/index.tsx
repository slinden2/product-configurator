"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { insertConfigurationAction } from "@/app/actions/insert-configuration-action";
import BrushSection from "@/components/config-form/brush-section";
import ChemPumpSection from "@/components/config-form/chem-pump-section";
import GeneralSection from "@/components/config-form/general-section";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import RailSection from "@/components/config-form/rail-section";
import SupplySection from "@/components/config-form/supply-section";
import TouchSection from "@/components/config-form/touch-section";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import Fieldset from "@/components/fieldset";
import SaveWarningDialog from "@/components/shared/save-warning-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
import TextareaField from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import { Form, FormDisabledContext } from "@/components/ui/form";
import { isConfigLocked } from "@/lib/access";
import { MSG } from "@/lib/messages";
import type { ConfigurationStatusType, Role } from "@/types";
import {
  BOM_EXEMPT_FIELDS,
  type ConfigInputSchema,
  type ConfigSchema,
  configDefaults,
  configSchema,
  type UpdateConfigSchema,
} from "@/validation/config-schema";
import BackButton from "../back-button";

interface ConfigurationFormProps {
  id?: number;
  configuration?: UpdateConfigSchema;
  status?: ConfigurationStatusType;
  userRole?: Role;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  hasEngineeringBom?: boolean;
  hasOfferSnapshot?: boolean;
}

const ConfigForm = ({
  id,
  configuration,
  status,
  userRole,
  formKey,
  onDirtyChange,
  onSaved,
  hasEngineeringBom,
  hasOfferSnapshot,
}: ConfigurationFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const pendingValuesRef = useRef<ConfigSchema | null>(null);
  const router = useRouter();

  const isNewConfiguration = !id && !configuration && !status;

  const formIsDisabled =
    isPending || (!isNewConfiguration && isConfigLocked(status, userRole));

  const form = useForm<ConfigInputSchema, unknown, ConfigSchema>({
    resolver: zodResolver(configSchema, {
      error: (issue) => {
        const i = issue as { code: string; expected?: string };
        if (i.code === "invalid_type" && i.expected === "undefined") {
          return "Valore non valido.";
        }
        return undefined;
      },
    }),
    defaultValues: configuration
      ? Object.assign({}, configDefaults, configuration)
      : configDefaults,
  });

  useEffect(() => {
    if (formKey) onDirtyChange?.(formKey, form.formState.isDirty);
  }, [form.formState.isDirty, formKey, onDirtyChange]);

  // Validate on mount in edit mode so fields with stale/invalid stored values
  // show as red immediately rather than only failing on the first Save attempt.
  useEffect(() => {
    if (!isNewConfiguration) {
      void form.trigger();
    }
  }, [form, isNewConfiguration]);

  function executeSubmit(values: ConfigSchema) {
    startTransition(async () => {
      try {
        if (id) {
          if (!configuration || !("user_id" in configuration)) {
            toast.error(MSG.toast.configIncompleteUpdate);
            return;
          }
          const result = await editConfigurationAction(id, values);
          if (result.success) {
            toast.success(MSG.toast.configUpdated);
            form.reset(values);
            if (formKey) {
              onSaved?.(formKey);
              onDirtyChange?.(formKey, false);
            }
          } else {
            toast.error(result.error);
          }
        } else {
          const result = await insertConfigurationAction(values);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success(MSG.toast.configCreated);
          router.push(`/configurazioni/modifica/${result.id}`);
        }
      } catch (err) {
        if (err instanceof Error) {
          toast.error(err.message);
        }
      }
    });
  }

  function onInvalid(errors: FieldErrors<ConfigInputSchema>) {
    toast.error(MSG.toast.validationErrors);
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const el = document.querySelector<HTMLElement>(
        `[name="${firstErrorKey}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
    }
  }

  function onSubmit(values: ConfigSchema) {
    const onlyExemptFieldsDirty = Object.keys(form.formState.dirtyFields).every(
      (key) => BOM_EXEMPT_FIELDS.has(key as keyof ConfigSchema),
    );
    if (
      (hasEngineeringBom || hasOfferSnapshot) &&
      id &&
      !onlyExemptFieldsDirty
    ) {
      pendingValuesRef.current = values;
      setShowSaveWarning(true);
      return;
    }
    executeSubmit(values);
  }

  function handleSaveWarningConfirm() {
    setShowSaveWarning(false);
    if (pendingValuesRef.current) {
      const values = pendingValuesRef.current;
      pendingValuesRef.current = null;
      executeSubmit(values);
    }
  }

  return (
    <div>
      <Form {...form}>
        <form
          id={formKey ? `form-${formKey}` : undefined}
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        >
          <FormDisabledContext.Provider value={formIsDisabled}>
            <fieldset disabled={formIsDisabled}>
              <GeneralSection />
              <BrushSection />
              <ChemPumpSection />
              <WaterSupplySection />
              <SupplySection />
              <RailSection />
              <TouchSection />
              <HPPumpSection />
              <Fieldset
                title="Note"
                description="Note aggiuntive per la vendita e l'ufficio tecnico"
              >
                <div className="fs-content">
                  <TextareaField<ConfigSchema>
                    name="sales_notes"
                    label="Note commerciali"
                    placeholder="Inserire eventuali note commerciali"
                    disabled={userRole === "ENGINEER"}
                  />
                  {(userRole === "ENGINEER" || userRole === "ADMIN") && (
                    <TextareaField<ConfigSchema>
                      name="engineering_notes"
                      label="Note tecniche"
                      placeholder="Inserire eventuali note tecniche"
                    />
                  )}
                </div>
              </Fieldset>
              <div className="flex gap-4">
                {!isNewConfiguration && (
                  <BackButton fallbackPath={"/configurazioni"} />
                )}
                <Button
                  type="button"
                  className="ml-auto"
                  variant="destructive"
                  onClick={() => {
                    form.reset();
                    if (formKey) onDirtyChange?.(formKey, false);
                  }}
                  disabled={formIsDisabled}
                >
                  Annulla
                </Button>
                <SubmitButton
                  isSubmitting={isPending}
                  icon={<Save />}
                  disabled={formIsDisabled}
                >
                  Salva configurazione
                </SubmitButton>
              </div>
            </fieldset>
          </FormDisabledContext.Provider>
        </form>
      </Form>
      <SaveWarningDialog
        open={showSaveWarning}
        onOpenChange={setShowSaveWarning}
        onCancel={() => {
          pendingValuesRef.current = null;
        }}
        onConfirm={handleSaveWarningConfirm}
        hasEngineeringBom={!!hasEngineeringBom}
        hasOfferSnapshot={!!hasOfferSnapshot}
      />
    </div>
  );
};

export default ConfigForm;
