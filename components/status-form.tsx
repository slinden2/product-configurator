"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateConfigStatusAction } from "@/app/actions/update-config-status-action";
import { MSG } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { ConfigurationStatusType, Role } from "@/types";
import {
  type ConfigStatusSchema,
  configStatusOpts,
  configStatusSchema,
} from "@/validation/config-status-schema";
import { Form, FormField, FormItem, FormLabel } from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface StatusFormProps {
  confId: number;
  initialStatus: ConfigurationStatusType;
  userRole: Role;
}

function getValidTransitions(
  role: Role,
  currentStatus: ConfigurationStatusType,
): ConfigurationStatusType[] {
  if (role === "ADMIN") {
    return configStatusOpts
      .map((o) => o.value as ConfigurationStatusType)
      .filter((s) => s !== currentStatus);
  }
  if (role === "SALES") {
    if (currentStatus === "DRAFT") return ["SUBMITTED"];
    if (currentStatus === "SUBMITTED") return ["DRAFT"];
    return [];
  }
  // ENGINEER
  const transitions: Record<
    ConfigurationStatusType,
    ConfigurationStatusType[]
  > = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["DRAFT", "IN_REVIEW"],
    IN_REVIEW: ["SUBMITTED", "APPROVED"],
    APPROVED: ["IN_REVIEW"],
    CLOSED: [],
  };
  return transitions[currentStatus] ?? [];
}

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

  const validTargets = getValidTransitions(userRole, initialStatus);
  const currentLabel =
    configStatusOpts.find((o) => o.value === initialStatus)?.label ??
    initialStatus;

  if (validTargets.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Stato</p>
        <p className="text-sm text-muted-foreground">{currentLabel}</p>
      </div>
    );
  }

  const selectableOpts = configStatusOpts.filter(
    (opt) =>
      opt.value === initialStatus ||
      validTargets.includes(opt.value as ConfigurationStatusType),
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
                  {selectableOpts.map((opt) => (
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
