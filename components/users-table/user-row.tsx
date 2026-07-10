"use client";

import { History, Mail, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  activateUserAction,
  assignManagerAction,
  changeUserRoleAction,
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
import type { Role } from "@/types";

interface UserRowProps {
  user: UserWithStats;
  currentUserId: string;
  managers: { id: string; email: string }[];
}

const ASSIGNABLE_ROLES: Role[] = [
  "ENGINEER",
  "SALES",
  "SALES_MANAGER",
  "SALES_DIRECTOR",
];

const RoleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  ENGINEER: "Ingegnere",
  SALES: "Commerciale",
  SALES_MANAGER: "Responsabile vendite",
  SALES_DIRECTOR: "Direttore vendite",
};

// Sentinel for the "no manager" option (Radix Select disallows empty values).
const NO_MANAGER_VALUE = "none";

const UserRow = ({ user, currentUserId, managers }: UserRowProps) => {
  const isCurrentUser = user.id === currentUserId;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      const result = await changeUserRoleAction({ userId: user.id, newRole });
      if (result.success) {
        toast.success(MSG.toast.roleUpdated);
      } else {
        toast.error(result.error ?? MSG.toast.roleUpdateFailed);
      }
    });
  };

  const handleManagerChange = (value: string) => {
    const managerId = value === NO_MANAGER_VALUE ? null : value;
    startTransition(async () => {
      const result = await assignManagerAction({ userId: user.id, managerId });
      if (result.success) {
        toast.success(MSG.toast.managerUpdated);
      } else {
        toast.error(result.error ?? MSG.toast.managerUpdateFailed);
      }
    });
  };

  // Only SALES agents are assigned to a manager; the pickable managers are the
  // SALES_MANAGER users.
  const canAssignManager = user.role === "SALES";

  const handleActivate = () => {
    startTransition(async () => {
      const result = await activateUserAction({ userId: user.id });
      if (result.success) {
        toast.success(MSG.toast.userActivated);
      } else {
        toast.error(result.error ?? MSG.toast.userActivateFailed);
      }
      setActivateConfirmOpen(false);
    });
  };

  const handlePasswordReset = () => {
    startTransition(async () => {
      const result = await sendPasswordResetAction({ userId: user.id });
      if (result.success) {
        toast.success(MSG.toast.passwordResetSent);
      } else {
        toast.error(result.error ?? MSG.toast.passwordResetFailed);
      }
      setResetConfirmOpen(false);
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
              defaultValue={user.role}
              disabled={isPending}
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
          ) : (
            <Badge variant="secondary">{MSG.users.statusPending}</Badge>
          )}
        </TableCell>
        <TableCell>
          {canAssignManager ? (
            <Select
              value={user.manager_id ?? NO_MANAGER_VALUE}
              disabled={isPending || managers.length === 0}
              onValueChange={handleManagerChange}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER_VALUE}>Nessuno</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.email}
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
                disabled={isPending}
                onSelect={() => setActivateConfirmOpen(true)}
              >
                <UserCheck />
                Attiva utente
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => setResetConfirmOpen(true)}
            >
              <Mail />
              Invia email di reset password
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
        isConfirming={isPending}
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
        isConfirming={isPending}
      />
    </>
  );
};

export default UserRow;
