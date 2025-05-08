"use client";

import { ConfigurationStatusType } from "@/types";
import {
  configStatusOpts,
  configStatusSchema,
  ConfigStatusSchema,
} from "@/validation/config-status.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel } from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { updateConfigStatusAction } from "@/app/actions/update-config-status-action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface StatusFormProps {
  confId: number;
  initialStatus: ConfigurationStatusType;
}

const StatusForm = ({ confId, initialStatus }: StatusFormProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm<ConfigStatusSchema>({
    resolver: zodResolver(configStatusSchema),
    defaultValues: {
      status: initialStatus,
    },
  });

  const statusValueWatch = form.watch("status");

  const handleSubmit = async (data: ConfigStatusSchema) => {
    console.log("🚀 ~ handleSubmit ~ data:", data); // DEBUG
    try {
      setIsLoading(true);
      await updateConfigStatusAction(confId, data);
      toast.success("Stato aggiornato.");
    } catch (err) {
      console.error(err);
      toast.error("Impossibile aggiornare lo stato.");
      form.resetField("status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Form {...form}>
        <fieldset disabled={isLoading}>
          <form onSubmit={form.handleSubmit((data) => console.log(data))}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center relative">
                    <span>Stato</span>
                    <Loader2
                      className={`ml-2 inline animate-spin h-6 w-6 text-primary absolute left-8 ${
                        isLoading ? "" : "hidden"
                      }`}
                    />
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.handleSubmit((data) => handleSubmit(data))();
                    }}
                    value={statusValueWatch}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {configStatusOpts.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </form>
        </fieldset>
      </Form>
    </div>
  );
};

export default StatusForm;
