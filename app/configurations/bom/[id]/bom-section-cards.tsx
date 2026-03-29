import AddBomItemForm from "@/app/configurations/bom/[id]/add-bom-item-form";
import { groupByTag, hasTagData } from "@/app/configurations/bom/[id]/bom-helpers";
import BOMDataTable from "@/app/configurations/bom/[id]/bom-data-table";
import EngineeringBomTable from "@/app/configurations/bom/[id]/engineering-bom-table";
import BOMCard from "@/components/bom-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineeringBomItem } from "@/db/schemas";
import { BOMItemWithDescription } from "@/lib/BOM";
import { BomTag, BomTagLabels } from "@/types";

// ── General section ─────────────────────────────────────────────────────

interface GeneralSectionProps {
  engineeringItems?: EngineeringBomItem[];
  calculatedItems?: BOMItemWithDescription[];
  confId: number;
  editable: boolean;
}

export function GeneralSection({
  engineeringItems,
  calculatedItems,
  confId,
  editable,
}: GeneralSectionProps) {
  if (engineeringItems) {
    const tagged = hasTagData(engineeringItems);
    if (tagged) {
      const tagGroups = groupByTag(engineeringItems);
      return (
        <BOMCard title="Distinta generale">
          {Array.from(tagGroups.entries()).map(([tag, items]) => (
            <TagGroup key={tag} tag={tag}>
              <EngineeringBomTable items={items} confId={confId} editable={editable} />
              {editable && (
                <AddBomItemForm confId={confId} category="GENERAL" categoryIndex={0} tag={tag} />
              )}
            </TagGroup>
          ))}
        </BOMCard>
      );
    }
    // Legacy snapshot without tags — flat list
    return (
      <BOMCard title="Distinta generale">
        <EngineeringBomTable items={engineeringItems} confId={confId} editable={editable} />
        {editable && (
          <AddBomItemForm confId={confId} category="GENERAL" categoryIndex={0} />
        )}
      </BOMCard>
    );
  }

  const tagGroups = groupByTag(calculatedItems!);
  return (
    <BOMCard title="Distinta generale">
      {Array.from(tagGroups.entries()).map(([tag, items]) => (
        <TagGroup key={tag} tag={tag}>
          <BOMDataTable items={items} />
        </TagGroup>
      ))}
    </BOMCard>
  );
}

function TagGroup({ tag, children }: { tag: BomTag; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold mb-2 px-2 text-muted-foreground uppercase tracking-wide">
        {BomTagLabels[tag]}
      </h3>
      {children}
    </div>
  );
}

// ── Grouped sub-record sections (water tanks / wash bays) ───────────────

interface SubRecordSectionProps {
  title: string;
  itemLabel: string;
  engineeringMap?: Map<number, EngineeringBomItem[]>;
  calculatedBOMs?: BOMItemWithDescription[][];
  category: "WATER_TANK" | "WASH_BAY";
  confId: number;
  editable: boolean;
}

export function SubRecordSection({
  title,
  itemLabel,
  engineeringMap,
  calculatedBOMs,
  category,
  confId,
  editable,
}: SubRecordSectionProps) {
  const entries = engineeringMap
    ? Array.from(engineeringMap.entries())
    : null;
  const count = entries ? entries.length : calculatedBOMs?.length ?? 0;

  if (count === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {title} (n. {count})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {entries
          ? entries.map(([index, items]) => (
              <BOMCard key={index} title={`${itemLabel} ${index + 1}`}>
                <EngineeringBomTable
                  items={items}
                  confId={confId}
                  editable={editable}
                />
                {editable && (
                  <AddBomItemForm
                    confId={confId}
                    category={category}
                    categoryIndex={index}
                  />
                )}
              </BOMCard>
            ))
          : calculatedBOMs!.map((bom, i) => (
              <BOMCard key={i} title={`${itemLabel} ${i + 1}`}>
                <BOMDataTable items={bom} />
              </BOMCard>
            ))}
      </CardContent>
    </Card>
  );
}
