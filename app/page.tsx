import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionQueuesSection } from "@/components/dashboard/action-queues-section";
import { MarginCardSkeleton } from "@/components/dashboard/margin-card-skeleton";
import { MarginDecisionsCard } from "@/components/dashboard/margin-decisions-card";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { getUserData } from "@/db/queries";
import { canViewOffer } from "@/lib/access";

const Dashboard = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");

  if (
    canViewOffer(user.role) &&
    user.role !== "ADMIN" &&
    user.role !== "SALES_DIRECTOR"
  )
    redirect("/offerte");
  if (user.role === "ENGINEER") redirect("/configurazioni");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <ActionQueuesSection user={user} />

      <Suspense fallback={<MarginCardSkeleton />}>
        <MarginDecisionsCard user={user} />
      </Suspense>

      <PipelineStrip user={user} />
    </div>
  );
};

export default Dashboard;
