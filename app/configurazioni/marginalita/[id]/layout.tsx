import { configRouteGuard } from "@/app/configurazioni/lib/config-route-guard";
import { canViewMarginReview } from "@/lib/access";

export default async function MarginReviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await configRouteGuard(
    params,
    canViewMarginReview,
    (id) => `/configurazioni/visualizza/${id}`,
  );
  return <>{children}</>;
}
