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
import { ConfigurationStatusType } from "@/types";

interface WashBayFormProps {
  confId: number;
  confStatus: ConfigurationStatusType;
  washBay?: UpdateWashBaySchema;
  washBayIndex?: number;
  onDelete?: (tankId: number) => void;
  onSaveSuccess: (entityName: "Serbatoio" | "Pista") => void;
}

const WashBayForm = (props: WashBayFormProps) => {
  return (
    <SubRecordForm
      schema={washBaySchema}
      entityDefaults={washBayDefaults}
      entityData={props.washBay}
      entityName="Pista"
      entityIndex={props.washBayIndex}
      parentId={props.confId}
      parentStatus={props.confStatus}
      onDelete={props.onDelete}
      onSaveSuccess={props.onSaveSuccess}
      insertAction={insertWashBayAction}
      editAction={editWashBayAction}
      deleteAction={deleteWashBayAction}
      FieldsComponent={WashBayFields}
    />
  );
};

export default WashBayForm;
