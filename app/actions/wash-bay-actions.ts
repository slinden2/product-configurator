"use server";
import { deleteWashBay, insertWashBay, updateWashBay } from "@/db/queries";
import { washBaySchema } from "@/validation/wash-bay-schema";
import { handleSubRecordAction } from "./lib/sub-record-actions";

export const insertWashBayAction = async (
  confId: number,
  formData: unknown
) => {
  return handleSubRecordAction({
    actionType: "insert",
    parentId: confId,
    formData: formData,
    schema: washBaySchema,
    insertQueryFn: insertWashBay,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Pista",
  });
};

export const editWashBayAction = async (
  confId: number,
  washBayId: number,
  formData: unknown
) => {
  return handleSubRecordAction({
    actionType: "edit",
    parentId: confId,
    recordId: washBayId,
    formData: formData,
    schema: washBaySchema,
    updateQueryFn: updateWashBay,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Pista",
  });
};

export const deleteWashBayAction = async (
  confId: number,
  washBayId: number
) => {
  return handleSubRecordAction({
    actionType: "delete",
    parentId: confId,
    recordId: washBayId,
    deleteQueryFn: deleteWashBay,
    revalidatePathStr: `/configurations/edit/${confId}`,
    entityName: "Pista",
  });
};
