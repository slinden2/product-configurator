import BOMDataTable from "@/app/configurations/bom/[id]/BOMDataTable";
import { getBOM } from "@/prisma/db";

interface BOMViewProps {
  params: { id: string };
}

const BOMView = async ({ params }: BOMViewProps) => {
  const bom = await getBOM(params.id);

  if (!bom) return <div>Unable to find BOM</div>;

  const generalBOM = await bom.buildGeneralBOM();
  const waterTankBOMs = await bom.buildWaterTankBOM();
  const washBayBOMs = await bom.buildWashBayBOM();

  return (
    <>
      <h2>Distinta</h2>
      <BOMDataTable items={generalBOM} />
      {waterTankBOMs.length > 0 && (
        <>
          <h2>Serbatoi (n. {waterTankBOMs.length})</h2>
          {waterTankBOMs.map((bom, key) => (
            <BOMDataTable key={key} items={bom} />
          ))}
        </>
      )}
      {washBayBOMs.length > 0 && (
        <>
          <h2>Piste (n. {washBayBOMs.length})</h2>
          {washBayBOMs.map((bom, key) => (
            <BOMDataTable key={key} items={bom} />
          ))}
        </>
      )}
    </>
  );
};

export default BOMView;
