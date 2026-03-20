import {
  buildEbomCostExportData,
  buildEbomExportData,
  getBomRulesVersion,
  getEarliestCreatedAt,
  groupEbomByCategory,
} from "@/app/configurations/bom/[id]/bom-helpers";
import {
  GeneralSection,
  SubRecordSection,
} from "@/app/configurations/bom/[id]/bom-section-cards";
import ExportButton from "@/app/configurations/bom/[id]/export-button";
import MetaDataTable from "@/app/configurations/bom/[id]/meta-data-table";
import RegenerateButton from "@/app/configurations/bom/[id]/regenerate-button";
import SnapshotButton from "@/app/configurations/bom/[id]/snapshot-button";
import BackButton from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  getBOM,
  getConfiguration,
  getEngineeringBomItems,
  getUserData,
  hasEngineeringBom,
} from "@/db/queries";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { Edit } from "lucide-react";
import Link from "next/link";
import ExportCostsButton from "./export-costs-button";
import { isEditable } from "@/app/actions/lib/auth-checks";

interface BOMViewProps {
  params: Promise<{ id: string }>;
}

const BOMView = async (props: BOMViewProps) => {
  const user = await getUserData();

  if (!user) {
    return <div>Utente non trovato.</div>;
  }

  const params = await props.params;
  const confId = parseInt(params.id);
  const bom = await getBOM(confId);

  if (!bom) return <div>La distinta non è disponibile.</div>;

  const configuration = await getConfiguration(confId);
  if (!configuration) return <div>Configurazione non trovata.</div>;

  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();

  const hasEbom = await hasEngineeringBom(confId);
  const ebomItems = hasEbom ? await getEngineeringBomItems(confId) : [];
  const activeEbomItems = ebomItems.filter((i) => !i.is_deleted);

  const editable = isEditable(configuration.status, user.role);

  // Group engineering BOM items by category
  const ebomGrouped = groupEbomByCategory(ebomItems);

  // Build export data from either engineering or calculated BOM
  const exportData = hasEbom
    ? buildEbomExportData(activeEbomItems)
    : bom.generateExportData(generalBOM, waterTankBOMs, washBayBOMs);

  const exportCostsData = hasEbom
    ? await buildEbomCostExportData(activeEbomItems)
    : await bom.generateCostExportData(generalBOM, waterTankBOMs, washBayBOMs);

  const ebomCreatedAt = getEarliestCreatedAt(ebomItems);
  const ebomRulesVersion = getBomRulesVersion(ebomItems);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath={"/configurations"} />
          <h1 className="inline-block">Distinta</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/configurations/edit/${params.id}`}>
              <Edit />
              <span>Modifica</span>
            </Link>
          </Button>
          {!hasEbom && editable && <SnapshotButton confId={confId} />}
          {hasEbom && editable && <RegenerateButton confId={confId} />}
          <ExportButton exportData={exportData} />
          <ExportCostsButton exportData={exportCostsData} user={user} />
        </div>
      </div>

      <MetaDataTable
        clientName={clientName}
        description={description || ""}
      />

      {hasEbom && ebomCreatedAt && (
        <p className="text-sm text-muted-foreground">
          Distinta ingegneria generata il{" "}
          {ebomCreatedAt.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {ebomRulesVersion && <> — regole v{ebomRulesVersion}</>}
          {ebomRulesVersion && ebomRulesVersion !== BOM_RULES_VERSION && (
            <span className="text-yellow-600 dark:text-yellow-500">
              {" "}
              (versione corrente: v{BOM_RULES_VERSION})
            </span>
          )}
        </p>
      )}

      <GeneralSection
        engineeringItems={hasEbom ? ebomGrouped.general : undefined}
        calculatedItems={hasEbom ? undefined : generalBOM}
        confId={confId}
        editable={editable}
      />

      <SubRecordSection
        title="Serbatoi"
        itemLabel="Distinta serbatoio"
        engineeringMap={hasEbom ? ebomGrouped.waterTanks : undefined}
        calculatedBOMs={hasEbom ? undefined : waterTankBOMs}
        category="WATER_TANK"
        confId={confId}
        editable={editable}
      />

      <SubRecordSection
        title="Piste"
        itemLabel="Distinta pista"
        engineeringMap={hasEbom ? ebomGrouped.washBays : undefined}
        calculatedBOMs={hasEbom ? undefined : washBayBOMs}
        category="WASH_BAY"
        confId={confId}
        editable={editable}
      />
    </div>
  );
};

export default BOMView;
