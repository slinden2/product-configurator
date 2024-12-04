import BOMDataTable from "@/app/configurations/bom/[id]/BOMDataTable";
import MetaDataTable from "@/app/configurations/bom/[id]/MetaDataTable";
import HeaderH2 from "@/components/HeaderH2";
import HeaderH3 from "@/components/HeaderH3";
import HeaderH4 from "@/components/HeaderH4";
import { getBOM } from "@/prisma/db";
import { Fragment } from "react";

interface BOMViewProps {
  params: { id: string };
}

const BOMView = async ({ params }: BOMViewProps) => {
  const bom = await getBOM(params.id);

  if (!bom) return <div>Unable to find BOM</div>;

  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const generalBOM = await bom.buildGeneralBOM();
  const waterTankBOMs = await bom.buildWaterTankBOM();
  const washBayBOMs = await bom.buildWashBayBOM();

  return (
    <>
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
    </>
  );
};

export default BOMView;
