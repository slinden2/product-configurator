"use client";

import { useMemo } from "react";
import {
  deleteWashBayAction,
  editWashBayAction,
  insertWashBayAction,
} from "@/app/actions/wash-bay-actions";
import SubRecordForm from "@/components/shared/sub-record-form";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import {
  type UpdateWashBaySchema,
  washBayDefaults,
  washBaySchema,
} from "@/validation/wash-bay-schema";
import WashBayFields from "./wash-bay-fields";

interface WashBayFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  origin?: ConfigOrigin;
  offerRevisionStatus?: OfferStatusType;
  userRole?: Role;
  supplyType?: ConfigSchema["supply_type"];
  supplyFixingType?: ConfigSchema["supply_fixing_type"];
  washBay?: UpdateWashBaySchema;
  washBayIndex?: number;
  onDelete?: (bayId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  onSubmitFailed?: (key: string) => void;
  hasEngineeringBom?: boolean;
}

const WashBayForm = (props: WashBayFormProps) => {
  const FieldsWithSupplyType = useMemo(() => {
    function Fields() {
      return (
        <WashBayFields
          supplyType={props.supplyType}
          supplyFixingType={props.supplyFixingType}
        />
      );
    }
    return Fields;
  }, [props.supplyType, props.supplyFixingType]);

  return (
    <SubRecordForm
      schema={washBaySchema}
      entityDefaults={washBayDefaults}
      entityData={props.washBay}
      entityName="Pista"
      entityIndex={props.washBayIndex}
      parentId={props.confId}
      parentStatus={props.confStatus}
      parentOrigin={props.origin}
      offerRevisionStatus={props.offerRevisionStatus}
      userRole={props.userRole}
      onDelete={props.onDelete}
      onSaveSuccess={props.onSaveSuccess}
      insertAction={insertWashBayAction}
      editAction={editWashBayAction}
      deleteAction={deleteWashBayAction}
      FieldsComponent={FieldsWithSupplyType}
      formKey={props.formKey}
      onDirtyChange={props.onDirtyChange}
      onSaved={props.onSaved}
      onSubmitFailed={props.onSubmitFailed}
      hasEngineeringBom={props.hasEngineeringBom}
    />
  );
};

export default WashBayForm;
