"use server";
import {
  deleteWaterTank,
  insertWaterTank,
  updateWaterTank,
} from "@/db/queries";
import { waterTankSchema } from "@/validation/water-tank-schema";
import { handleSubRecordAction } from "./lib/sub-record-actions";

export const insertWaterTankAction = async (
  confId: number,
  formData: unknown
) => {
  return handleSubRecordAction({
    actionType: "insert",
    parentId: confId,
    formData: formData,
    schema: waterTankSchema,
    queryFn: insertWaterTank,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Serbatoio",
  });
};

export const editWaterTankAction = async (
  confId: number,
  waterTankId: number,
  formData: unknown
) => {
  return handleSubRecordAction({
    actionType: "edit",
    parentId: confId,
    recordId: waterTankId,
    formData: formData,
    schema: waterTankSchema,
    queryFn: updateWaterTank,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Serbatoio",
  });
};

export const deleteWaterTankAction = async (confId: number, tankId: number) => {
  return handleSubRecordAction({
    actionType: "delete",
    parentId: confId,
    recordId: tankId,
    queryFn: deleteWaterTank,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Serbatoio",
  });
};
