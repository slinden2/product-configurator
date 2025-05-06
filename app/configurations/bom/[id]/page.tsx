import BOMDataTable from "@/app/configurations/bom/[id]/bom-data-table";
import ExportButton from "@/app/configurations/bom/[id]/export-button";
import MetaDataTable from "@/app/configurations/bom/[id]/meta-data-table";
import BackButton from "@/components/back-button";
import BOMCard from "@/components/bom-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBOM } from "@/db/queries";
import { Edit } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

interface BOMViewProps {
  params: Promise<{ id: string }>;
}

const BOMView = async (props: BOMViewProps) => {
  const params = await props.params;
  const bom = await getBOM(parseInt(params.id));

  if (!bom) return <div>La distinta non è disponibile.</div>;

  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();
  const exportData = bom.generateExportData(
    generalBOM,
    waterTankBOMs,
    washBayBOMs
  );

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
          <ExportButton exportData={exportData} />
        </div>
      </div>
      <MetaDataTable clientName={clientName} description={description || ""} />
      <BOMCard title="Distinta generale">
        <BOMDataTable items={generalBOM} />
      </BOMCard>

      {waterTankBOMs.length > 0 && (
        <Card>
          <>
            <CardHeader>
              <CardTitle className="text-2xl">
                Serbatoi (n. {waterTankBOMs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {waterTankBOMs.map((bom, key) => (
                <Fragment key={key}>
                  <BOMCard title={`Distinta serbatoio ${key + 1}`}>
                    <BOMDataTable items={bom} />
                  </BOMCard>
                </Fragment>
              ))}
            </CardContent>
          </>
        </Card>
      )}

      {washBayBOMs.length > 0 && (
        <Card>
          <>
            <CardHeader>
              <CardTitle className="text-2xl">
                Piste (n. {washBayBOMs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {washBayBOMs.map((bom, key) => (
                <Fragment key={key}>
                  <BOMCard title={`Distinta pista ${key + 1}`}>
                    <BOMDataTable items={bom} />
                  </BOMCard>
                </Fragment>
              ))}
            </CardContent>
          </>
        </Card>
      )}
    </div>
  );
};

export default BOMView;
