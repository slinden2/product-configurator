"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { insertConfigurationAction } from "@/app/actions/insert-configuration-action";
import { addOfferLineAction } from "@/app/actions/offer-line-actions";
import BrushSection from "@/components/config-form/brush-section";
import ChemPumpSection from "@/components/config-form/chem-pump-section";
import GeneralSection from "@/components/config-form/general-section";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import MiscSection from "@/components/config-form/misc-section";
import RailSection from "@/components/config-form/rail-section";
import SupplySection from "@/components/config-form/supply-section";
import TouchSection from "@/components/config-form/touch-section";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import Fieldset from "@/components/fieldset";
import { DevFillButton } from "@/components/shared/dev-fill-button";
import SaveWarningDialog from "@/components/shared/save-warning-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
import TextareaField from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import { Form, FormDisabledContext } from "@/components/ui/form";
import { isConfigLocked } from "@/lib/access";
import { CONFIG_FIELD_LABELS } from "@/lib/configuration/field-labels";
import { makeDummyConfig } from "@/lib/dev/dummy-config";
import { MSG } from "@/lib/messages";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";
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
  origin?: ConfigOrigin;
  /**
   * Status of the offer revision owning this config (OFFER origin only). Threaded
   * into the lock check so a pre-handoff offer line stays editable while DRAFT.
   */
  offerRevisionStatus?: OfferStatusType;
  /**
   * When set, this is a new offer line: create submits to addOfferLineAction and
   * navigation returns to the offer detail.
   */
  offerId?: number;
  userRole?: Role;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  hasEngineeringBom?: boolean;
}

const ConfigForm = ({
  id,
  configuration,
  status,
  origin,
  offerRevisionStatus,
  offerId,
  userRole,
  formKey,
  onDirtyChange,
  onSaved,
  hasEngineeringBom,
}: ConfigurationFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const pendingValuesRef = useRef<ConfigSchema | null>(null);
  const router = useRouter();

  const isNewConfiguration = !id && !configuration && !status;

  const formIsDisabled =
    isPending ||
    (!isNewConfiguration &&
      isConfigLocked(status, userRole, origin, offerRevisionStatus));

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
            toast.success(MSG.toast.configSavedSubmitHint);
            form.reset(values);
            if (formKey) {
              onSaved?.(formKey);
              onDirtyChange?.(formKey, false);
            }
          } else {
            toast.error(result.error);
          }
        } else {
          // An offerId marks this as a new offer line: create the config + line in
          // one action, then land on its edit page so tanks/bays become editable.
          const result = offerId
            ? await addOfferLineAction(offerId, values)
            : await insertConfigurationAction(values);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success(
            offerId ? MSG.toast.offerLineCreated : MSG.toast.configCreated,
          );
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
    if (hasEngineeringBom && id && !onlyExemptFieldsDirty) {
      pendingValuesRef.current = values;
      setShowSaveWarning(true);
      return;
    }
    executeSubmit(values);
  }

  function handleDevFill() {
    form.reset(makeDummyConfig(), { keepDefaultValues: true });
    // Edit mode validates on mount; re-trigger so stale field errors clear.
    void form.trigger();
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
              <MiscSection />
              <Fieldset
                title="Note"
                description="Note aggiuntive per la vendita e l'ufficio tecnico"
              >
                <div className="fs-content">
                  <TextareaField<ConfigSchema>
                    name="sales_notes"
                    label={CONFIG_FIELD_LABELS.sales_notes}
                    placeholder="Inserire eventuali note commerciali"
                    disabled={userRole === "ENGINEER"}
                  />
                  {(userRole === "ENGINEER" || userRole === "ADMIN") && (
                    <TextareaField<ConfigSchema>
                      name="engineering_notes"
                      label={CONFIG_FIELD_LABELS.engineering_notes}
                      placeholder="Inserire eventuali note tecniche"
                    />
                  )}
                </div>
              </Fieldset>
              <div className="flex gap-4">
                {!isNewConfiguration && (
                  <BackButton
                    fallbackPath={
                      origin === "OFFER" ? "/offerte" : "/configurazioni"
                    }
                  />
                )}
                {!formIsDisabled && <DevFillButton onFill={handleDevFill} />}
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
      />
    </div>
  );
};

export default ConfigForm;
