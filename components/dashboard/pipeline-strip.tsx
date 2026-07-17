import type { UserData } from "@/db/queries";
import {
  getConfigTechnicalQueueCounts,
  getOfferRevisionQueueCounts,
} from "@/db/queries";
import { canViewOffer, canViewTechnicalQueue } from "@/lib/access";
import { STATUS_CONFIG } from "@/lib/status-config";
import { cn } from "@/lib/utils";
import { ConfigurationStatus, OfferStatus, OfferStatusLabels } from "@/types";

interface PipelineStripProps {
  user: NonNullable<UserData>;
}

export async function PipelineStrip({ user }: PipelineStripProps) {
  const showOfferQueues = canViewOffer(user.role);
  const showTechnicalQueues = canViewTechnicalQueue(user.role);
  if (!showOfferQueues && !showTechnicalQueues) return null;

  const [offerCounts, configCounts] = await Promise.all([
    showOfferQueues ? getOfferRevisionQueueCounts(user) : null,
    showTechnicalQueues ? getConfigTechnicalQueueCounts(user) : null,
  ]);

  const offerCountMap = offerCounts
    ? new Map(offerCounts.map((q) => [q.status, q.count]))
    : null;
  const configCountMap = configCounts
    ? new Map(configCounts.map((q) => [q.status, q.count]))
    : null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
      <div className="space-y-3">
        {showOfferQueues && offerCountMap && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">
              Offerte
            </p>
            <div className="flex flex-wrap gap-2">
              {OfferStatus.map((status) => (
                <PipelineChip
                  key={status}
                  label={OfferStatusLabels[status]}
                  count={offerCountMap.get(status) ?? 0}
                />
              ))}
            </div>
          </div>
        )}
        {showTechnicalQueues && configCountMap && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">
              Configurazioni
            </p>
            <div className="flex flex-wrap gap-2">
              {ConfigurationStatus.map((status) => (
                <PipelineChip
                  key={status}
                  label={STATUS_CONFIG[status].label}
                  count={configCountMap.get(status) ?? 0}
                  color={STATUS_CONFIG[status].color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PipelineChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
        "text-muted-foreground",
      )}
    >
      {color && (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{label}</span>
      <span className="font-semibold text-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}
