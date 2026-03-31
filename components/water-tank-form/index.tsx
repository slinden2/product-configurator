"use client";

import React from "react";
import SubRecordForm from "@/components/shared/sub-record-form";
import WaterTankFields from "@/components/water-tank-form/water-tank-fields";
import {
  UpdateWaterTankSchema,
  waterTankDefaults,
  waterTankSchema,
} from "@/validation/water-tank-schema";
import {
  deleteWaterTankAction,
  editWaterTankAction,
  insertWaterTankAction,
} from "@/app/actions/water-tank-actions";
import { ConfigurationStatusType, Role } from "@/types";

interface WaterTankFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  userRole?: Role;
  waterTank?: UpdateWaterTankSchema;
  waterTankIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
  formKey?: string;
  onDirtyChange?: (key: string, isDirty: boolean) => void;
  onSaved?: (key: string) => void;
  hasEngineeringBom?: boolean;
}

const WaterTankForm = (props: WaterTankFormProps) => {
  return (
    <SubRecordForm
      schema={waterTankSchema}
      entityDefaults={waterTankDefaults}
      entityData={props.waterTank}
      entityName="Serbatoio"
      entityIndex={props.waterTankIndex}
      parentId={props.confId}
      parentStatus={props.confStatus}
      userRole={props.userRole}
      onDelete={props.onDelete}
      onSaveSuccess={props.onSaveSuccess}
      insertAction={insertWaterTankAction}
      editAction={editWaterTankAction}
      deleteAction={deleteWaterTankAction}
      FieldsComponent={WaterTankFields}
      formKey={props.formKey}
      onDirtyChange={props.onDirtyChange}
      onSaved={props.onSaved}
      hasEngineeringBom={props.hasEngineeringBom}
    />
  );
};

export default WaterTankForm;
