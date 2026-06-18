"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { updateConfigStatusAction } from "@/app/actions/update-config-status-action";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MSG } from "@/lib/messages";
import {
  getTransitionDirection,
  getTransitionLabel,
  isAdjacentTransition,
  STATUS_CONFIG,
  STATUS_PIPELINE,
} from "@/lib/status-config";
import type { ConfigurationStatusType, Role } from "@/types";

interface StatusControlProps {
  confId: number;
  initialStatus: ConfigurationStatusType;
  userRole: Role;
}

/**
 * Valid target statuses a role can move to from the current status. Mirrors the
 * server-side `canTransition` guard in `db/queries.ts` — keep both in sync.
 */
function getValidTransitions(
  role: Role,
  currentStatus: ConfigurationStatusType,
): ConfigurationStatusType[] {
  if (role === "ADMIN") {
    return STATUS_PIPELINE.filter((s) => s !== currentStatus);
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

const StatusControl = ({
  confId,
  initialStatus,
  userRole,
}: StatusControlProps) => {
  const [isPending, startTransition] = useTransition();
  // The transition awaiting confirmation; also drives the AlertDialog open state.
  const [pendingTarget, setPendingTarget] =
    useState<ConfigurationStatusType | null>(null);

  const { label } = STATUS_CONFIG[initialStatus];
  const validTargets = getValidTransitions(userRole, initialStatus);

  // Adjacent (±1) moves become buttons; the rest (ADMIN-only jumps) go in the
  // manual dropdown.
  const buttonTargets = validTargets.filter((t) =>
    isAdjacentTransition(initialStatus, t),
  );
  const jumpTargets = validTargets.filter(
    (t) => !isAdjacentTransition(initialStatus, t),
  );

  const runTransition = (target: ConfigurationStatusType) => {
    startTransition(async () => {
      try {
        const result = await updateConfigStatusAction(confId, {
          status: target,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(MSG.toast.statusUpdated);
      } catch (err) {
        console.error(err);
        toast.error(MSG.toast.statusUpdateFailed);
      } finally {
        setPendingTarget(null);
      }
    });
  };

  // The current user can act if there is at least one valid transition. Frozen
  // states (e.g. APPROVED for a SALES user) render the badge with no controls.
  const hasControls = buttonTargets.length > 0 || jumpTargets.length > 0;

  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Stato</span>
        <ConfigurationStatusBadge status={initialStatus} showIcon />
      </div>

      {hasControls && (
        <>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            {buttonTargets.map((target) => {
              const direction = getTransitionDirection(initialStatus, target);
              return (
                <Button
                  key={target}
                  size="sm"
                  variant={direction === "forward" ? "default" : "outline"}
                  disabled={isPending}
                  onClick={() => setPendingTarget(target)}
                >
                  {getTransitionLabel(initialStatus, target)}
                </Button>
              );
            })}

            {jumpTargets.length > 0 && (
              <Select
                value=""
                disabled={isPending}
                onValueChange={(value) =>
                  setPendingTarget(value as ConfigurationStatusType)
                }
              >
                <SelectTrigger
                  className="h-8 w-auto text-xs"
                  aria-label="Cambia stato"
                >
                  <SelectValue placeholder="Cambia stato…" />
                </SelectTrigger>
                <SelectContent>
                  {jumpTargets.map((target) => (
                    <SelectItem key={target} value={target}>
                      {STATUS_CONFIG[target].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
        </>
      )}

      <AlertDialog
        open={pendingTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setPendingTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cambio di stato</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTarget && (
                <>
                  Confermi il passaggio da «{label}» a «
                  {STATUS_CONFIG[pendingTarget].label}»?
                  {isEditable(initialStatus, userRole) &&
                    !isEditable(pendingTarget, userRole) &&
                    " Non potrai più modificare la configurazione."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                // Keep the dialog open until the action settles; runTransition
                // closes it via setPendingTarget(null).
                event.preventDefault();
                if (pendingTarget) runTransition(pendingTarget);
              }}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StatusControl;
