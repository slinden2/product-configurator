"use client";

import React from "react";
import SubRecordForm from "@/components/shared/sub-record-form";
import {
  UpdateWashBaySchema,
  washBayDefaults,
  washBaySchema,
} from "@/validation/wash-bay-schema";
import {
  deleteWashBayAction,
  editWashBayAction,
  insertWashBayAction,
} from "@/app/actions/wash-bay-actions";
import WashBayFields from "./wash-bay-fields";
import { ConfigurationStatusType, Role } from "@/types";

interface WashBayFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  userRole?: Role;
  supplyType?: string;
  washBay?: UpdateWashBaySchema;
  washBayIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
}

const WashBayForm = (props: WashBayFormProps) => {
  const FieldsWithSupplyType = () => (
    <WashBayFields supplyType={props.supplyType} />
  );

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
    />
  );
};

export default WashBayForm;
