import BOMDataTable from "@/app/configurations/bom/[id]/BOMDataTable";
import MetaDataTable from "@/app/configurations/bom/[id]/MetaDataTable";
import BackButton from "@/components/BackButton";
import HeaderH2 from "@/components/HeaderH2";
import HeaderH3 from "@/components/HeaderH3";
import HeaderH4 from "@/components/HeaderH4";
import { Button } from "@/components/ui/button";
import { getBOM } from "@/prisma/db";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

interface BOMViewProps {
  params: Promise<{ id: string }>;
}

const BOMView = async (props: BOMViewProps) => {
  const params = await props.params;
  const bom = await getBOM(params.id);

  if (!bom) return <div>Unable to find BOM</div>;

  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();

  return (
    <div className="space-y-6">
      <HeaderH2>Distinta</HeaderH2>
      <MetaDataTable clientName={clientName} description={description || ""} />
      <HeaderH3>Distinta generale</HeaderH3>
      <BOMDataTable items={generalBOM} />
      {waterTankBOMs.length > 0 && (
        <>
          <HeaderH3>Serbatoi (n. {waterTankBOMs.length})</HeaderH3>
          {waterTankBOMs.map((bom, key) => (
            <Fragment key={key}>
              <HeaderH4>{`Distinta serbatoio ${key + 1}`}</HeaderH4>
              <BOMDataTable items={bom} />
            </Fragment>
          ))}
        </>
      )}
      {washBayBOMs.length > 0 && (
        <>
          <HeaderH3>Piste (n. {washBayBOMs.length})</HeaderH3>
          {washBayBOMs.map((bom, key) => (
            <Fragment key={key}>
              <HeaderH4>{`Distinta pista ${key + 1}`}</HeaderH4>
              <BOMDataTable items={bom} />
            </Fragment>
          ))}
        </>
      )}
      <div className="space-x-6">
        <BackButton fallbackPath={"/configurations"} />
        <Link href={`/configurations/edit/${params.id}`}>
          <Button variant="default" size="icon">
            <Pencil />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default BOMView;
