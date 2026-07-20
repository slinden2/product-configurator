import {
  ClipboardCheck,
  Clock,
  FilePen,
  Inbox,
  type LucideIcon,
  Send,
  Wrench,
} from "lucide-react";
import type { UserData } from "@/db/queries";
import {
  getConfigTechnicalQueueCounts,
  getOfferRevisionQueueCounts,
} from "@/db/queries";
import { canViewOffer, canViewTechnicalQueue } from "@/lib/access";
import { configStatusToSlug, offerStatusToSlug } from "@/lib/status-slugs";
import type { ConfigurationStatusType, OfferStatusType } from "@/types";
import { QueueCard } from "./queue-card";

// One entry per dashboard queue card: which status it counts, its title/icon,
// and (via the slug helpers) which filtered list it opens — keeping card,
// count, and link filter in a single definition that cannot drift from the
// slugs the list pages parse.
const OFFER_QUEUES: {
  status: OfferStatusType;
  title: string;
  icon: LucideIcon;
  highlight?: boolean;
}[] = [
  { status: "DRAFT", title: "Bozze da completare", icon: FilePen },
  { status: "PENDING_APPROVAL", title: "Da approvare", icon: ClipboardCheck },
  { status: "APPROVED_TO_SEND", title: "Da inviare", icon: Send },
  { status: "SENT", title: "In attesa di esito", icon: Clock, highlight: true },
];

// The SALES_APPROVED bucket of the technical-queue counts is the intake queue:
// only handed-off OFFER configs can hold that status (STANDALONE configs have
// no edge into it — see STATUS_TRANSITIONS), so no separate intake query is
// needed.
const TECHNICAL_QUEUES: {
  status: ConfigurationStatusType;
  title: string;
  icon: LucideIcon;
}[] = [
  { status: "SALES_APPROVED", title: "Da prendere in carico", icon: Inbox },
  { status: "IN_TECH_REVIEW", title: "In lavorazione", icon: Wrench },
];

interface ActionQueuesSectionProps {
  user: NonNullable<UserData>;
}

export async function ActionQueuesSection({ user }: ActionQueuesSectionProps) {
  const showOfferQueues = canViewOffer(user.role);
  const showTechnicalQueues = canViewTechnicalQueue(user.role);
  if (!showOfferQueues && !showTechnicalQueues) return null;

  const [offerCounts, technicalCounts] = await Promise.all([
    showOfferQueues ? getOfferRevisionQueueCounts(user) : null,
    showTechnicalQueues ? getConfigTechnicalQueueCounts(user) : null,
  ]);

  const offerCountMap = new Map((offerCounts ?? []).map((q) => [q.status, q]));
  const technicalCountMap = new Map(
    (technicalCounts ?? []).map((q) => [q.status, q]),
  );

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Da gestire</h2>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showOfferQueues &&
          OFFER_QUEUES.map(({ status, title, icon, highlight }) => {
            const row = offerCountMap.get(status);
            return (
              <QueueCard
                key={status}
                title={title}
                count={row?.count ?? 0}
                oldestDate={row?.oldestDate ?? null}
                href={`/offerte?status=${offerStatusToSlug(status)}`}
                highlight={highlight}
                icon={icon}
              />
            );
          })}
        {showTechnicalQueues &&
          TECHNICAL_QUEUES.map(({ status, title, icon }) => {
            const row = technicalCountMap.get(status);
            return (
              <QueueCard
                key={status}
                title={title}
                count={row?.count ?? 0}
                oldestDate={row?.oldestDate ?? null}
                href={`/configurazioni?status=${configStatusToSlug(status)}`}
                icon={icon}
              />
            );
          })}
      </div>
    </section>
  );
}
