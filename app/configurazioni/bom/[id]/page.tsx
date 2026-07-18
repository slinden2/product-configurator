import { notFound, redirect } from "next/navigation";
import { prepareBOMPageData } from "@/app/configurazioni/bom/[id]/bom-helpers";
import {
  GeneralSection,
  SubRecordSection,
} from "@/app/configurazioni/bom/[id]/bom-section-cards";
import ExportButton from "@/app/configurazioni/bom/[id]/export-button";
import RegenerateButton from "@/app/configurazioni/bom/[id]/regenerate-button";
import SnapshotButton from "@/app/configurazioni/bom/[id]/snapshot-button";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import DetailsCard from "@/components/shared/details-card";
import { getBOM, getUserData, offerRefFor } from "@/db/queries";
import { canViewBom, canViewOffer } from "@/lib/access";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import ExportCostsButton from "./export-costs-button";

interface BOMViewProps {
  params: Promise<{ id: string }>;
}

const BOMView = async (props: BOMViewProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");
  // Page-authoritative auth (doctrine #102): the page runs its own role check
  // before any data access (layout guards don't gate concurrent page fetches).
  // Role-disallowed → the read-only view, which enforces its own scope.
  if (!canViewBom(user.role)) redirect(`/configurazioni/visualizza/${confId}`);

  // getBOM runs the scoped fetch (auth + ownership) → null when out of scope.
  const bom = await getBOM(confId, user);
  if (!bom) notFound();
  const { configuration } = bom;

  const [pageData, offer] = await Promise.all([
    prepareBOMPageData(confId, bom, user.role),
    canViewOffer(user.role)
      ? offerRefFor({ id: confId, origin: configuration.origin })
      : null,
  ]);
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
    ebomCreatedAt,
    ebomRulesVersion,
  } = pageData;

  return (
    <div className="space-y-6">
      <ConfigNavigationBar
        confId={confId}
        activePage="bom"
        role={user.role}
        offer={offer}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="inline-block">Distinta</h1>
        <div className="flex flex-wrap items-center gap-2">
          {!hasEbom && editable && <SnapshotButton confId={confId} />}
          {hasEbom && editable && <RegenerateButton confId={confId} />}
          <ExportButton exportData={exportData} />
          <ExportCostsButton confId={confId} user={user} />
        </div>
      </div>

      <DetailsCard clientName={clientName} description={description} />

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
