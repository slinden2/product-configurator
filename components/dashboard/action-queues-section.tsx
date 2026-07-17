import { ClipboardCheck, Clock, Inbox, Send } from "lucide-react";
import type { UserData } from "@/db/queries";
import {
  getConfigIntakeCount,
  getOfferRevisionQueueCounts,
} from "@/db/queries";
import { QueueCard } from "./queue-card";

interface ActionQueuesSectionProps {
  user: NonNullable<UserData>;
}

export async function ActionQueuesSection({ user }: ActionQueuesSectionProps) {
  const isAdmin = user.role === "ADMIN";

  const [queueCounts, intakeCount] = await Promise.all([
    getOfferRevisionQueueCounts(user),
    isAdmin ? getConfigIntakeCount(user) : null,
  ]);

  const countMap = new Map(queueCounts.map((q) => [q.status, q]));

  const pendingApproval = countMap.get("PENDING_APPROVAL");
  const approvedToSend = countMap.get("APPROVED_TO_SEND");
  const sent = countMap.get("SENT");

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Da gestire</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QueueCard
          title="Da approvare"
          count={pendingApproval?.count ?? 0}
          oldestDate={pendingApproval?.oldestDate ?? null}
          href="/offerte?status=in-approvazione"
          icon={ClipboardCheck}
        />
        <QueueCard
          title="Da inviare"
          count={approvedToSend?.count ?? 0}
          oldestDate={approvedToSend?.oldestDate ?? null}
          href="/offerte?status=approvata-per-invio"
          icon={Send}
        />
        <QueueCard
          title="In attesa di esito"
          count={sent?.count ?? 0}
          oldestDate={sent?.oldestDate ?? null}
          href="/offerte?status=inviata"
          highlight
          icon={Clock}
        />
        {isAdmin && intakeCount && (
          <QueueCard
            title="Da prendere in carico"
            count={intakeCount.count}
            oldestDate={intakeCount.oldestDate}
            href="/configurazioni?status=approvato-vendite"
            icon={Inbox}
          />
        )}
      </div>
    </section>
  );
}
