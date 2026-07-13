"use client";

import { History, Mail, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  activateUserAction,
  assignManagerAction,
  changeUserRoleAction,
  deactivateUserAction,
  sendPasswordResetAction,
} from "@/app/actions/user-actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import type { UserWithStats } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { ASSIGNABLE_ROLES, RoleLabels } from "@/types";

interface UserRowProps {
  user: UserWithStats;
  currentUserId: string;
  managers: { id: string; email: string; isActive: boolean }[];
}

// Sentinel for the "no manager" option (Radix Select disallows empty values).
const NO_MANAGER_VALUE = "none";

const UserRow = ({ user, currentUserId, managers }: UserRowProps) => {
  const isCurrentUser = user.id === currentUserId;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [isChangingRole, startRoleChange] = useTransition();
  const [isAssigningManager, startManagerAssign] = useTransition();
  const [isActivating, startActivate] = useTransition();
  const [isDeactivating, startDeactivate] = useTransition();
  const [isResettingPassword, startPasswordReset] = useTransition();

  const handleRoleChange = (newRole: string) => {
    startRoleChange(async () => {
      try {
        const result = await changeUserRoleAction({ userId: user.id, newRole });
        if (result.success) {
          toast.success(MSG.toast.roleUpdated);
        } else {
          toast.error(result.error ?? MSG.toast.roleUpdateFailed);
        }
      } catch {
        toast.error(MSG.toast.roleUpdateFailed);
      }
    });
  };

  const handleManagerChange = (value: string) => {
    const managerId = value === NO_MANAGER_VALUE ? null : value;
    startManagerAssign(async () => {
      try {
        const result = await assignManagerAction({
          userId: user.id,
          managerId,
        });
        if (result.success) {
          toast.success(MSG.toast.managerUpdated);
        } else {
          toast.error(result.error ?? MSG.toast.managerUpdateFailed);
        }
      } catch {
        toast.error(MSG.toast.managerUpdateFailed);
      }
    });
  };

  // Only SALES agents are assigned to a manager; the pickable managers are the
  // active SALES_MANAGER users. A deactivated manager stays listed (disabled)
  // only while still assigned to this row, so the Select can render it.
  const canAssignManager = user.role === "SALES";
  const managerOptions = managers.filter(
    (m) => m.isActive || m.id === user.manager_id,
  );

  // Client mirror of the server guards: no self-deactivation, ADMIN accounts
  // are immutable.
  const canDeactivate =
    user.is_active && !isCurrentUser && user.role !== "ADMIN";

  const handleActivate = () => {
    startActivate(async () => {
      try {
        const result = await activateUserAction({ userId: user.id });
        if (result.success) {
          toast.success(MSG.toast.userActivated);
        } else {
          toast.error(result.error ?? MSG.toast.userActivateFailed);
        }
      } catch {
        toast.error(MSG.toast.userActivateFailed);
      } finally {
        setActivateConfirmOpen(false);
      }
    });
  };

  const handleDeactivate = () => {
    startDeactivate(async () => {
      try {
        const result = await deactivateUserAction({ userId: user.id });
        if (result.success) {
          toast.success(MSG.toast.userDeactivated);
        } else {
          toast.error(result.error ?? MSG.toast.userDeactivateFailed);
        }
      } catch {
        toast.error(MSG.toast.userDeactivateFailed);
      } finally {
        setDeactivateConfirmOpen(false);
      }
    });
  };

  const handlePasswordReset = () => {
    startPasswordReset(async () => {
      try {
        const result = await sendPasswordResetAction({ userId: user.id });
        if (result.success) {
          toast.success(MSG.toast.passwordResetSent);
        } else {
          toast.error(result.error ?? MSG.toast.passwordResetFailed);
        }
      } catch {
        toast.error(MSG.toast.passwordResetFailed);
      } finally {
        setResetConfirmOpen(false);
      }
    });
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-sm">{user.email}</TableCell>
        <TableCell>
          {isCurrentUser || user.role === "ADMIN" ? (
            <span className="text-sm text-muted-foreground">
              {RoleLabels[user.role]}
            </span>
          ) : (
            <Select
              value={user.role}
              disabled={isChangingRole}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {RoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell>
          {user.is_active ? (
            <Badge variant="outline">{MSG.users.statusActive}</Badge>
          ) : user.deactivated_at ? (
            <Badge variant="destructive">{MSG.users.statusDeactivated}</Badge>
          ) : (
            <Badge variant="secondary">{MSG.users.statusPending}</Badge>
          )}
        </TableCell>
        <TableCell>
          {canAssignManager ? (
            <Select
              value={user.manager_id ?? NO_MANAGER_VALUE}
              disabled={isAssigningManager || managerOptions.length === 0}
              onValueChange={handleManagerChange}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER_VALUE}>Nessuno</SelectItem>
                {managerOptions.map((manager) => (
                  <SelectItem
                    key={manager.id}
                    value={manager.id}
                    disabled={!manager.isActive}
                  >
                    {manager.isActive
                      ? manager.email
                      : `${manager.email} ${MSG.users.managerInactiveSuffix}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm">{user.initials ?? "—"}</TableCell>
        <TableCell className="text-sm">{user.configCount}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {user.lastActivity ? formatDateDDMMYYYYHHMM(user.lastActivity) : "—"}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {user.last_login_at
            ? formatDateDDMMYYYYHHMM(user.last_login_at)
            : "—"}
        </TableCell>
        <TableCell>
          <RowActionsMenu>
            {!user.is_active && (
              <DropdownMenuItem
                disabled={isActivating}
                onSelect={() => setActivateConfirmOpen(true)}
              >
                <UserCheck />
                Attiva utente
              </DropdownMenuItem>
            )}
            {canDeactivate && (
              <DropdownMenuItem
                disabled={isDeactivating}
                onSelect={() => setDeactivateConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <UserX />
                Disattiva utente
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={isResettingPassword}
              onSelect={() => setResetConfirmOpen(true)}
            >
              <Mail />
              Invia email di reimpostazione password
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/gestione/utenti/${user.id}`}>
                <History />
                Vedi attività
              </Link>
            </DropdownMenuItem>
          </RowActionsMenu>
        </TableCell>
      </TableRow>
      <ConfirmModal
        isOpen={activateConfirmOpen}
        onOpenChange={setActivateConfirmOpen}
        title={MSG.activateUserConfirm.title}
        description={
          <>
            {MSG.activateUserConfirm.body} Utente:{" "}
            <span className="font-semibold">{user.email}</span>.
          </>
        }
        confirmText={MSG.activateUserConfirm.confirm}
        confirmVariant="default"
        onConfirm={handleActivate}
        isConfirming={isActivating}
      />
      <ConfirmModal
        isOpen={deactivateConfirmOpen}
        onOpenChange={setDeactivateConfirmOpen}
        title={MSG.deactivateUserConfirm.title}
        description={
          <>
            {MSG.deactivateUserConfirm.body} Utente:{" "}
            <span className="font-semibold">{user.email}</span>.
          </>
        }
        confirmText={MSG.deactivateUserConfirm.confirm}
        confirmVariant="destructive"
        onConfirm={handleDeactivate}
        isConfirming={isDeactivating}
      />
      <ConfirmModal
        isOpen={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={MSG.passwordResetConfirm.title}
        description={
          <>
            {MSG.passwordResetConfirm.body} Destinatario:{" "}
            <span className="font-semibold">{user.email}</span>.
          </>
        }
        confirmText={MSG.passwordResetConfirm.confirm}
        confirmVariant="default"
        onConfirm={handlePasswordReset}
        isConfirming={isResettingPassword}
      />
    </>
  );
};

export default UserRow;
