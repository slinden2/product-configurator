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
import { ConfigurationStatusType } from "@/types";

interface WaterTankFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  waterTank?: UpdateWaterTankSchema;
  waterTankIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
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
      onDelete={props.onDelete}
      onSaveSuccess={props.onSaveSuccess}
      insertAction={insertWaterTankAction}
      editAction={editWaterTankAction}
      deleteAction={deleteWaterTankAction}
      FieldsComponent={WaterTankFields}
    />
  );
};

export default WaterTankForm;
