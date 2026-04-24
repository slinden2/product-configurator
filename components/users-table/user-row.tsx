"use client";

import { History, Mail } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  changeUserRoleAction,
  sendPasswordResetAction,
} from "@/app/actions/user-actions";
import { Button } from "@/components/ui/button";
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
}

const ASSIGNABLE_ROLES: Role[] = ["ENGINEER", "SALES"];

const RoleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  ENGINEER: "Ingegnere",
  SALES: "Commerciale",
};

const UserRow = ({ user, currentUserId }: UserRowProps) => {
  const isCurrentUser = user.id === currentUserId;

  const handleRoleChange = async (newRole: string) => {
    const result = await changeUserRoleAction({ userId: user.id, newRole });
    if (result.success) {
      toast.success(MSG.toast.roleUpdated);
    } else {
      toast.error(result.error ?? MSG.toast.roleUpdateFailed);
    }
  };

  const handlePasswordReset = async () => {
    const result = await sendPasswordResetAction({ userId: user.id });
    if (result.success) {
      toast.success(MSG.toast.passwordResetSent);
    } else {
      toast.error(result.error ?? MSG.toast.passwordResetFailed);
    }
  };

  return (
    <TableRow>
      <TableCell className="text-sm">{user.email}</TableCell>
      <TableCell>
        {isCurrentUser || user.role === "ADMIN" ? (
          <span className="text-sm text-muted-foreground">
            {RoleLabels[user.role]}
          </span>
        ) : (
          <Select defaultValue={user.role} onValueChange={handleRoleChange}>
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
      <TableCell className="text-sm">{user.initials ?? "—"}</TableCell>
      <TableCell className="text-sm">{user.configCount}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {user.lastActivity ? formatDateDDMMYYYYHHMM(user.lastActivity) : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {user.last_login_at ? formatDateDDMMYYYYHHMM(user.last_login_at) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title="Invia email di reset password"
            onClick={handlePasswordReset}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Vedi attività" asChild>
            <Link href={`/gestione/utenti/${user.id}`}>
              <History className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default UserRow;
