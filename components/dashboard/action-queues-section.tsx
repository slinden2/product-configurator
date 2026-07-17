import {
  ClipboardCheck,
  Clock,
  FilePen,
  Inbox,
  Send,
  Wrench,
} from "lucide-react";
import type { UserData } from "@/db/queries";
import {
  getConfigIntakeCount,
  getConfigTechnicalQueueCounts,
  getOfferRevisionQueueCounts,
} from "@/db/queries";
import { canViewOffer, canViewTechnicalQueue } from "@/lib/access";
import { QueueCard } from "./queue-card";

interface ActionQueuesSectionProps {
  user: NonNullable<UserData>;
}

export async function ActionQueuesSection({ user }: ActionQueuesSectionProps) {
  const showOfferQueues = canViewOffer(user.role);
  const showTechnicalQueues = canViewTechnicalQueue(user.role);
  if (!showOfferQueues && !showTechnicalQueues) return null;

  const [queueCounts, intakeCount, technicalCounts] = await Promise.all([
    showOfferQueues ? getOfferRevisionQueueCounts(user) : null,
    showTechnicalQueues ? getConfigIntakeCount(user) : null,
    showTechnicalQueues ? getConfigTechnicalQueueCounts(user) : null,
  ]);

  const countMap = new Map((queueCounts ?? []).map((q) => [q.status, q]));

  const draft = countMap.get("DRAFT");
  const pendingApproval = countMap.get("PENDING_APPROVAL");
  const approvedToSend = countMap.get("APPROVED_TO_SEND");
  const sent = countMap.get("SENT");
  const inTechReview = technicalCounts?.find(
    (q) => q.status === "IN_TECH_REVIEW",
  );

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Da gestire</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showOfferQueues && (
          <>
            <QueueCard
              title="Bozze da completare"
              count={draft?.count ?? 0}
              oldestDate={draft?.oldestDate ?? null}
              href="/offerte?status=bozza"
              icon={FilePen}
            />
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
          </>
        )}
        {showTechnicalQueues && intakeCount && (
          <>
            <QueueCard
              title="Da prendere in carico"
              count={intakeCount.count}
              oldestDate={intakeCount.oldestDate}
              href="/configurazioni?status=approvato-vendite"
              icon={Inbox}
            />
            <QueueCard
              title="In lavorazione"
              count={inTechReview?.count ?? 0}
              oldestDate={inTechReview?.oldestDate ?? null}
              href="/configurazioni?status=in-revisione-tecnica"
              icon={Wrench}
            />
          </>
        )}
      </div>
    </section>
  );
}
