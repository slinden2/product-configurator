"use client";

import { ConfigurationStatusType, Role } from "@/types";
import {
  configStatusOpts,
  configStatusSchema,
  ConfigStatusSchema,
} from "@/validation/config-status-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { MSG } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface StatusFormProps {
  confId: number;
  initialStatus: ConfigurationStatusType;
  userRole: Role;
}

const ALLOWED_STATUSES: Record<Role, ConfigurationStatusType[]> = {
  SALES: ["DRAFT", "SUBMITTED"],
  ENGINEER: ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED"],
  ADMIN: ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "CLOSED"],
};

const StatusForm = ({ confId, initialStatus, userRole }: StatusFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ConfigStatusSchema>({
    resolver: zodResolver(configStatusSchema),
    defaultValues: {
      status: initialStatus,
    },
  });

  const handleSubmit = async (data: ConfigStatusSchema) => {
    try {
      setIsLoading(true);
      const result = await updateConfigStatusAction(confId, data);
      if (!result.success) {
        toast.error(result.error);
        form.setValue("status", initialStatus);
        return;
      }
      toast.success(MSG.toast.statusUpdated);
    } catch (err) {
      console.error(err);
      toast.error(MSG.toast.statusUpdateFailed);
      form.setValue("status", initialStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const userConfigStatusOpts = configStatusOpts.filter((opt) =>
    ALLOWED_STATUSES[userRole].includes(opt.value as ConfigurationStatusType),
  );

  return (
    <Form {...form}>
      <fieldset disabled={isLoading}>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center relative">
                <span>Stato</span>
                <Loader2
                  className={cn(
                    "ml-2 inline animate-spin h-6 w-6 text-primary absolute left-8",
                    !isLoading && "hidden",
                  )}
                />
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  form.handleSubmit(handleSubmit)();
                }}
                value={field.value}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {userConfigStatusOpts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </fieldset>
    </Form>
  );
};

export default StatusForm;
