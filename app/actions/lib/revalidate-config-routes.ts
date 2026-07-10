import { revalidatePath } from "next/cache";
import type { ConfigOrigin } from "@/types";

/**
 * Revalidate every route that renders a configuration's spec/detail data, so the
 * client router cache never serves a stale detail surface after a mutation.
 *
 * Centralizing this prevents future misses as more config detail routes gain
 * server-rendered, state-dependent UI. Call from every config-mutating action.
 *
 * An OFFER line config also surfaces on its offer detail page, so that route is
 * revalidated only for OFFER-origin configs.
 *
 * The admin dashboard (`/`) renders per-status configuration counts, so it is
 * revalidated too.
 */
export function revalidateConfigurationRoutes(
  confId: number,
  origin: ConfigOrigin,
) {
  revalidatePath("/");
  revalidatePath("/configurazioni");
  revalidatePath(`/configurazioni/modifica/${confId}`);
  revalidatePath(`/configurazioni/visualizza/${confId}`);
  revalidatePath(`/configurazioni/bom/${confId}`);
  revalidatePath(`/configurazioni/marginalita/${confId}`);
  if (origin === "OFFER") {
    revalidatePath("/offerte/[id]", "page");
  }
}
