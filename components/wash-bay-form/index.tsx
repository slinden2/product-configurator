"use client";

import { useMemo } from "react";
import {
  deleteWashBayAction,
  editWashBayAction,
  insertWashBayAction,
} from "@/app/actions/wash-bay-actions";
import SubRecordForm from "@/components/shared/sub-record-form";
import type { ConfigurationStatusType, Role } from "@/types";
import {
  type UpdateWashBaySchema,
  washBayDefaults,
  washBaySchema,
} from "@/validation/wash-bay-schema";
import WashBayFields from "./wash-bay-fields";

interface WashBayFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  userRole?: Role;
  supplyType?: string;
  supplyFixingType?: string;
  washBay?: UpdateWashBaySchema;
  washBayIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
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
      hasEngineeringBom={props.hasEngineeringBom}
    />
  );
};

export default WashBayForm;
