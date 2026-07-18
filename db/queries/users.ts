import { asc, countDistinct, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, configurations, userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { Role } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { insertActivityLog, logActivity } from "./activity";
import { QueryError } from "./errors";

export type UserData = Awaited<ReturnType<typeof getUserData>>;

export const getUserData = async () => {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  if (!data.user) {
    return null;
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, data.user.id),
    columns: {
      email: true,
      role: true,
      initials: true,
      manager_id: true,
      is_active: true,
    },
  });

  // Fail closed for profiles not yet activated by an ADMIN.
  if (!userProfile?.is_active) {
    return null;
  }

  return {
    id: data.user.id,
    email: userProfile.email,
    role: userProfile.role,
    initials: userProfile.initials,
    manager_id: userProfile.manager_id,
  };
};

export type UserWithStats = {
  id: string;
  email: string;
  role: Role;
  initials: string | null;
  manager_id: string | null;
  is_active: boolean;
  deactivated_at: Date | null;
  last_login_at: Date | null;
  configCount: number;
  lastActivity: Date | null;
};

export async function getAllUsersWithStats(): Promise<UserWithStats[]> {
  const result = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      role: userProfiles.role,
      initials: userProfiles.initials,
      manager_id: userProfiles.manager_id,
      is_active: userProfiles.is_active,
      deactivated_at: userProfiles.deactivated_at,
      last_login_at: userProfiles.last_login_at,
      configCount: countDistinct(configurations.id),
      lastActivity: max(activityLogs.created_at),
    })
    .from(userProfiles)
    .leftJoin(configurations, eq(configurations.user_id, userProfiles.id))
    .leftJoin(activityLogs, eq(activityLogs.user_id, userProfiles.id))
    .groupBy(
      userProfiles.id,
      userProfiles.email,
      userProfiles.role,
      userProfiles.initials,
      userProfiles.manager_id,
      userProfiles.is_active,
      userProfiles.deactivated_at,
      userProfiles.last_login_at,
    )
    .orderBy(asc(userProfiles.email));

  return result.map((r) => ({
    ...r,
    configCount: Number(r.configCount),
    lastActivity: r.lastActivity ?? null,
  }));
}

export async function getUserProfileById(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });
}

/**
 * First-login provisioning + last-login bookkeeping for a Supabase-authenticated
 * user, keyed by email. When no profile row exists yet, provisions an inactive
 * `SALES` profile (pending admin activation) and logs `USER_PROFILE_CREATE`; when
 * the profile exists and is active, stamps `last_login_at`. Returns only the
 * activation state the caller needs to branch on (pending-activation vs
 * deactivated vs active), keeping every profile read/write for the login path in
 * the query layer.
 */
export async function provisionUserProfileOnLogin(
  userId: string,
  email: string,
): Promise<{ is_active: boolean; deactivated_at: Date | null }> {
  const existingUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.email, email),
    columns: { is_active: true, deactivated_at: true },
  });

  if (!existingUser) {
    // First login: provision an inactive profile. The user gets no session until
    // an ADMIN activates the account from the user management area.
    await db.insert(userProfiles).values({
      id: userId,
      email,
      role: "SALES",
      is_active: false,
    });
    await logActivity({
      userId,
      action: "USER_PROFILE_CREATE",
      targetEntity: "user_profile",
      targetId: userId,
      metadata: { email, initial_role: "SALES" },
    });
    return { is_active: false, deactivated_at: null };
  }

  if (existingUser.is_active) {
    await db
      .update(userProfiles)
      .set({ last_login_at: new Date() })
      .where(eq(userProfiles.id, userId));
  }

  return {
    is_active: existingUser.is_active,
    deactivated_at: existingUser.deactivated_at,
  };
}

export async function changeUserRoleWithAudit(data: {
  userId: string;
  newRole: Role;
  changedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [targetRow] = await tx
      .select({ id: userProfiles.id, role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId));

    if (!targetRow) throw new QueryError(MSG.users.notFound);

    // Only SALES agents report to a manager; clear a stale manager_id when the
    // user moves to any other role.
    const managerPatch = data.newRole === "SALES" ? {} : { manager_id: null };
    await tx
      .update(userProfiles)
      .set({ role: data.newRole, ...managerPatch })
      .where(eq(userProfiles.id, data.userId));

    // When a user leaves the SALES_MANAGER role, detach their direct reports so
    // none remain pointing at a non-manager.
    if (
      targetRow.role === "SALES_MANAGER" &&
      data.newRole !== "SALES_MANAGER"
    ) {
      await tx
        .update(userProfiles)
        .set({ manager_id: null })
        .where(eq(userProfiles.manager_id, data.userId));
    }

    await insertActivityLog(
      {
        userId: data.changedBy,
        action: "ROLE_CHANGE",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: { from_role: targetRow.role, to_role: data.newRole },
      },
      tx,
    );
  });
}

export async function activateUserWithAudit(data: {
  userId: string;
  activatedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Lock the row so a concurrent activation cannot double-log the audit entry.
    const [targetRow] = await tx
      .select({ id: userProfiles.id, is_active: userProfiles.is_active })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId))
      .for("update");

    if (!targetRow) throw new QueryError(MSG.users.notFound);
    if (targetRow.is_active) {
      throw new QueryError(MSG.users.alreadyActive);
    }

    await tx
      .update(userProfiles)
      .set({ is_active: true, deactivated_at: null })
      .where(eq(userProfiles.id, data.userId));

    await insertActivityLog(
      {
        userId: data.activatedBy,
        action: "USER_ACTIVATE",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: {},
      },
      tx,
    );
  });
}

export async function deactivateUserWithAudit(data: {
  userId: string;
  deactivatedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Lock the row so a concurrent deactivation cannot double-log the audit
    // entry. Re-reading `role` inside the lock closes the TOCTOU window with a
    // concurrent role change.
    const [targetRow] = await tx
      .select({
        id: userProfiles.id,
        role: userProfiles.role,
        is_active: userProfiles.is_active,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId))
      .for("update");

    if (!targetRow) throw new QueryError(MSG.users.notFound);
    // ADMIN accounts are immutable via the UI (same stance as role changes),
    // so the admin count can never silently decrease.
    if (targetRow.role === "ADMIN") {
      throw new QueryError(MSG.users.cannotDeactivateAdmin);
    }
    // Also rejects pending (never-activated) profiles: deactivating them would
    // silently overwrite the "In attesa" state.
    if (!targetRow.is_active) {
      throw new QueryError(MSG.users.alreadyInactive);
    }

    await tx
      .update(userProfiles)
      .set({ is_active: false, deactivated_at: new Date() })
      .where(eq(userProfiles.id, data.userId));

    // Terminate the user's live sessions in the same transaction. Clearing
    // `is_active` alone does not revoke an issued Supabase session: the refresh
    // token keeps minting access tokens, because GoTrue knows nothing about this
    // flag. Deleting the `auth.sessions` rows is exactly what a global sign-out
    // does (`auth.refresh_tokens` cascades), so the refresh token stops working.
    //
    // GoTrue exposes no admin "log out by user id" endpoint, and banning the
    // auth user is the wrong tool: `signInWithPassword` then fails with
    // `user_banned` even for a *wrong* password, which would leak account
    // enumeration and preempt the deactivated-account message in `signIn`.
    //
    // Already-issued access tokens stay valid until they expire; that window is
    // harmless because `getUserData` fails closed on `is_active` and the table
    // carries no RLS write policy.
    await tx.execute(
      sql`delete from auth.sessions where user_id = ${data.userId}::uuid`,
    );

    await insertActivityLog(
      {
        userId: data.deactivatedBy,
        action: "USER_DEACTIVATE",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: {},
      },
      tx,
    );
  });
}

export async function assignManagerWithAudit(data: {
  userId: string;
  managerId: string | null;
  changedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Re-read AND lock the target row inside the transaction. Selecting `role`
    // here (not just `manager_id`) and locking with `FOR UPDATE` closes the
    // TOCTOU window: a concurrent `changeUserRoleWithAudit` UPDATE on this row
    // blocks until we commit, so the role invariant validated below still holds
    // at the moment of the write.
    const [targetRow] = await tx
      .select({
        id: userProfiles.id,
        role: userProfiles.role,
        manager_id: userProfiles.manager_id,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId))
      .for("update");

    if (!targetRow) throw new QueryError(MSG.users.notFound);

    // Only SALES agents report to a manager. Re-validate inside the locked
    // transaction so a manager_id can never land on a non-SALES profile and
    // leak that user's configs into a manager's scope.
    if (targetRow.role !== "SALES") {
      throw new QueryError(MSG.users.invalidManager);
    }

    // The manager must still exist and be an active SALES_MANAGER at write
    // time; lock it too so a concurrent demotion or deactivation cannot
    // interleave.
    if (data.managerId !== null) {
      const [managerRow] = await tx
        .select({
          id: userProfiles.id,
          role: userProfiles.role,
          is_active: userProfiles.is_active,
        })
        .from(userProfiles)
        .where(eq(userProfiles.id, data.managerId))
        .for("update");

      if (
        !managerRow ||
        managerRow.role !== "SALES_MANAGER" ||
        !managerRow.is_active
      ) {
        throw new QueryError(MSG.users.invalidManager);
      }
    }

    await tx
      .update(userProfiles)
      .set({ manager_id: data.managerId })
      .where(eq(userProfiles.id, data.userId));

    await insertActivityLog(
      {
        userId: data.changedBy,
        action: "MANAGER_ASSIGN",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: {
          from_manager: targetRow.manager_id,
          to_manager: data.managerId,
        },
      },
      tx,
    );
  });
}
