import { configRouteGuard } from "@/app/configurazioni/lib/config-route-guard";
import { canViewOffer } from "@/lib/access";

export default async function OffertaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await configRouteGuard(
    params,
    canViewOffer,
    (id) => `/configurazioni/bom/${id}`,
  );
  return <>{children}</>;
}
