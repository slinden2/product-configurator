import { redirect } from "next/navigation";
import type React from "react";
import { getUserData } from "@/db/queries";
import { canViewOffer } from "@/lib/access";

/**
 * Offer-area guard. Offers are a sales-and-admin workspace; ENGINEER has no offer
 * access and is redirected to the home page (they have no offer area at all).
 */
export default async function OfferteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (!canViewOffer(user.role)) redirect("/");
  return <>{children}</>;
}
