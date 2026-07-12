"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { canTransition, isEditable } from "@/app/actions/lib/auth-checks";
import { updateConfigStatusAction } from "@/app/actions/update-config-status-action";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MSG } from "@/lib/messages";
import {
  getTransitionDirection,
  getTransitionLabel,
  STATUS_CONFIG,
  STATUS_PIPELINE,
} from "@/lib/status-config";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";

interface StatusControlProps {
  confId: number;
  initialStatus: ConfigurationStatusType;
  userRole: Role;
  /** Defaults to "OFFER" (the full sales+engineering machine). */
  origin?: ConfigOrigin;
  /**
   * Owning offer revision status (OFFER origin only), so the lockout-warning
   * editability prediction matches the two-phase gate.
   */
  offerRevisionStatus?: OfferStatusType;
}

/**
 * Valid target statuses a role can move to from the current status, derived from
 * the server-side `canTransition` guard (app/actions/lib/auth-checks.ts) so the
 * client buttons and the server gate cannot drift. Ordering follows
 * STATUS_PIPELINE. Every valid target is a defined STATUS_TRANSITIONS edge, so
 * they all render as action buttons (there are no arbitrary status jumps).
 */
function getValidTransitions(
  role: Role,
  currentStatus: ConfigurationStatusType,
  origin: ConfigOrigin,
): ConfigurationStatusType[] {
  return STATUS_PIPELINE.filter(
    (status) =>
      status !== currentStatus &&
      canTransition(role, currentStatus, status, origin),
  );
}

const StatusControl = ({
  confId,
  initialStatus,
  userRole,
  origin = "OFFER",
  offerRevisionStatus,
}: StatusControlProps) => {
  const [isPending, startTransition] = useTransition();
  // The transition awaiting confirmation; also drives the confirmation modal.
  const [pendingTarget, setPendingTarget] =
    useState<ConfigurationStatusType | null>(null);

  const { label } = STATUS_CONFIG[initialStatus];
  // Every valid transition is a defined workflow edge — canTransition grants no
  // arbitrary jumps to any role, ADMIN included — so they all render as buttons.
  const targets = getValidTransitions(userRole, initialStatus, origin);

  const runTransition = (target: ConfigurationStatusType) => {
    startTransition(async () => {
      try {
        const result = await updateConfigStatusAction(confId, {
          status: target,
        });
        if (result.success) {
          toast.success(MSG.toast.statusUpdated);
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        console.error(err);
        toast.error(MSG.toast.statusUpdateFailed);
      } finally {
        // Close the confirmation dialog once the action settles (success or
        // failure) — `finally` also covers early returns, matching
        // configuration-row's modal cleanup.
        setPendingTarget(null);
      }
    });
  };

  const hasControls = targets.length > 0;

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
            {targets.map((target) => {
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

            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={pendingTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setPendingTarget(null);
        }}
        title="Conferma cambio di stato"
        description={
          pendingTarget && (
            <>
              Confermi il passaggio da «{label}» a «
              {STATUS_CONFIG[pendingTarget].label}»?
              {isEditable(
                initialStatus,
                userRole,
                origin,
                offerRevisionStatus,
              ) &&
                !isEditable(
                  pendingTarget,
                  userRole,
                  origin,
                  offerRevisionStatus,
                ) &&
                " In questo stato non potrai modificare la configurazione."}
            </>
          )
        }
        onConfirm={() => {
          if (pendingTarget) runTransition(pendingTarget);
        }}
        confirmVariant="default"
        isConfirming={isPending}
      />
    </div>
  );
};

export default StatusControl;
