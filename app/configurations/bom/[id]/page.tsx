import { prepareBOMPageData } from "@/app/configurations/bom/[id]/bom-helpers";
import {
  GeneralSection,
  SubRecordSection,
} from "@/app/configurations/bom/[id]/bom-section-cards";
import ExportButton from "@/app/configurations/bom/[id]/export-button";
import MetaDataTable from "@/app/configurations/bom/[id]/meta-data-table";
import RegenerateButton from "@/app/configurations/bom/[id]/regenerate-button";
import SnapshotButton from "@/app/configurations/bom/[id]/snapshot-button";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import { getBOM, getConfiguration, getUserData } from "@/db/queries";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import ExportCostsButton from "./export-costs-button";
import { notFound, redirect } from "next/navigation";

interface BOMViewProps {
  params: Promise<{ id: string }>;
}

const BOMView = async (props: BOMViewProps) => {
  const params = await props.params;
  const confId = parseInt(params.id);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const bom = await getBOM(confId);
  if (!bom) notFound();

  const configuration = await getConfiguration(confId);
  if (!configuration) notFound();

  const {
    clientName,
    description,
    generalBOM,
    waterTankBOMs,
    washBayBOMs,
    hasEbom,
    editable,
    ebomGrouped,
    exportData,
    exportCostsData,
    ebomCreatedAt,
    ebomRulesVersion,
  } = await prepareBOMPageData(confId, bom, configuration, user.role);

  return (
    <div className="space-y-6">
      <ConfigNavigationBar confId={confId} activePage="bom" />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="inline-block">Distinta</h1>
        <div className="flex flex-wrap items-center gap-2">
          {!hasEbom && editable && <SnapshotButton confId={confId} />}
          {hasEbom && editable && <RegenerateButton confId={confId} />}
          <ExportButton exportData={exportData} />
          <ExportCostsButton exportData={exportCostsData} user={user} />
        </div>
      </div>

      <MetaDataTable clientName={clientName} description={description || ""} />

      {hasEbom && ebomCreatedAt && (
        <p className="text-sm text-muted-foreground">
          Distinta di commessa generata il{" "}
          {formatDateDDMMYYYYHHMM(ebomCreatedAt)}
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
