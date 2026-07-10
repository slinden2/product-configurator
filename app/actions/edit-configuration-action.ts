"use server";

import { assertEditableInTx } from "@/app/actions/lib/assert-editable-in-tx";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { firstZodIssueMessage } from "@/app/actions/lib/first-zod-issue-message";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { revalidateConfigurationRoutes } from "@/app/actions/lib/revalidate-config-routes";
import { db } from "@/db";
import {
  deleteAllEngineeringBomItems,
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
  insertActivityLog,
  offerRevisionStatusFor,
  resetWashBayEnergyChainFields,
  resetWashBayNonEnergyChainFields,
  updateConfiguration,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { repriceOfferLine } from "@/lib/offer-revision-pricing";
import {
  configSchema,
  hasBomRelevantChanges,
} from "@/validation/config-schema";

export const editConfigurationAction = async (
  confId: number,
  formData: unknown,
) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(validation.error, MSG.db.unknown),
    };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  const configuration = await getConfigurationWithTanksAndBays(confId, user);

  // Scope is enforced by the loader: getConfigurationWithTanksAndBays runs
  // canAccessConfiguration internally and returns null for out-of-scope users.
  if (!configuration) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // Status protection: enforce editable rules per role, origin, and — for an
  // OFFER config pre-handoff — the owning revision's status (editable only while
  // the revision is DRAFT).
  const offerRevisionStatus = await offerRevisionStatusFor(configuration);
  if (
    !isEditable(
      configuration.status,
      user.role,
      configuration.origin,
      offerRevisionStatus,
    )
  ) {
    return {
      success: false as const,
      error: MSG.config.cannotEdit,
    };
  }

  try {
    const supplyTypeChangedFromEC =
      configuration.supply_type === "ENERGY_CHAIN" &&
      validation.data.supply_type !== "ENERGY_CHAIN";

    const becameEcWall =
      !(
        configuration.supply_type === "ENERGY_CHAIN" &&
        configuration.supply_fixing_type === "WALL"
      ) &&
      validation.data.supply_type === "ENERGY_CHAIN" &&
      validation.data.supply_fixing_type === "WALL";

    await db.transaction(async (tx) => {
      // Re-assert the gate under the offer FOR UPDATE lock: the isEditable
      // check above ran on a pooled read, so a concurrent revision submit can
      // freeze the pricing snapshot before this tx commits (issue #255).
      await assertEditableInTx(
        configuration,
        user.role,
        tx,
        MSG.config.cannotEdit,
      );

      await updateConfiguration(
        confId,
        { ...validation.data, user_id: configuration.user_id },
        configuration.status,
        tx,
      );

      if (supplyTypeChangedFromEC) {
        await resetWashBayEnergyChainFields(confId, tx);
      }

      if (becameEcWall) {
        await resetWashBayNonEnergyChainFields(confId, tx);
      }

      // Invalidate the engineering BOM when BOM-relevant fields changed. The offer's
      // commercial figures live on the offer revision line and are recomputed by the
      // reprice below (while the revision is DRAFT) or already frozen on a sent/accepted
      // revision — there is no separate offer snapshot to invalidate.
      if (hasBomRelevantChanges(configuration, validation.data)) {
        const ebomExists = await hasEngineeringBom(confId, tx);
        if (ebomExists) {
          await deleteAllEngineeringBomItems(confId, tx);
        }
      }

      // An OFFER line's price tracks its config. Re-price unconditionally (not
      // gated on hasBomRelevantChanges) because the surcharge drivers total_height
      // and has_omz_paint are BOM-exempt — a BOM-relevance gate would miss them.
      // Pre-handoff (config DRAFT) the revision must still be DRAFT, so a
      // frozen line fails the tx; post-handoff a frozen latest revision is the
      // by-design no-op (a DRAFT renegotiation revision still reprices).
      //
      // Deliberately NOT gated by authorizeOfferAction/canViewOffer: post-handoff
      // this path is reachable by ENGINEER (a role with no offer access), and on a
      // DRAFT renegotiation revision it writes offer_revision_lines pricing plus an
      // OFFER_LINE_REPRICE audit row. That is by design — renegotiation line pricing
      // is derived from the current engineering configs, so an engineering edit must
      // propagate (see the ENGINEER repricing seam in .claude/rules/workflow.md,
      // Offer Access). Adding an offer gate here would silently break renegotiation
      // repricing (#251).
      if (configuration.origin === "OFFER") {
        await repriceOfferLine(confId, user.id, tx, {
          requireDraft: configuration.status === "DRAFT",
        });
      }

      await insertActivityLog(
        {
          userId: user.id,
          action: "CONFIG_EDIT",
          targetEntity: "configuration",
          targetId: confId.toString(),
        },
        tx,
      );
    });
    revalidateConfigurationRoutes(confId, configuration.origin);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to edit configuration:");
  }
};
