import {
  type AssemblyChild,
  getAssemblyChildren,
  getPartNumbersByArray,
} from "@/db/queries";
import { type BOMItemWithCost, enrichWithCosts } from "@/lib/BOM";
import type { BomTag } from "@/types";

const MAX_EXPLOSION_DEPTH = 10;

interface TaggedLeaf {
  bucket: "general" | "waterTank" | "washBay";
  bucketIndex: number;
  pn: string;
  description: string;
  qty: number;
  tag?: BomTag;
}

async function explodeAssy(
  pn: string,
  qty: number,
  leaves: TaggedLeaf[],
  bucket: TaggedLeaf["bucket"],
  bucketIndex: number,
  tag: BomTag | undefined,
  childrenCache: Map<string, AssemblyChild[]>,
  depth: number,
  visited: Set<string>,
): Promise<void> {
  if (depth >= MAX_EXPLOSION_DEPTH) {
    console.warn(
      `[explode-bom] depth cap (${MAX_EXPLOSION_DEPTH}) reached at PN: ${pn} — row excluded from Analisi Componenti`,
    );
    return;
  }
  if (visited.has(pn)) {
    console.warn(
      `[explode-bom] cycle detected at PN: ${pn} — row excluded from Analisi Componenti`,
    );
    return;
  }

  let children = childrenCache.get(pn);
  if (children === undefined) {
    children = await getAssemblyChildren(pn);
    childrenCache.set(pn, children);
  }

  if (children.length === 0) {
    console.warn(
      `[explode-bom] ASSY without catalog rows: ${pn} — row excluded from Analisi Componenti`,
    );
    return;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(pn);
  for (const child of children) {
    const childQty = qty * child.qty;
    if (child.pn_type === "ASSY") {
      await explodeAssy(
        child.pn,
        childQty,
        leaves,
        bucket,
        bucketIndex,
        tag,
        childrenCache,
        depth + 1,
        nextVisited,
      );
    } else {
      leaves.push({
        bucket,
        bucketIndex,
        pn: child.pn,
        description: child.description,
        qty: childQty,
        tag,
      });
    }
  }
}

type ExplodedBOMs = {
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
};

export async function explodeBomsToLeaves(
  data: ExplodedBOMs,
): Promise<ExplodedBOMs> {
  const { generalBOM, waterTankBOMs, washBayBOMs } = data;

  // Seed type cache for all top-level PNs to avoid unnecessary ASSY queries
  const allTopLevelPns = [
    ...new Set([
      ...generalBOM.map((i) => i.pn),
      ...waterTankBOMs.flat().map((i) => i.pn),
      ...washBayBOMs.flat().map((i) => i.pn),
    ]),
  ];
  const topLevelPnData = await getPartNumbersByArray(allTopLevelPns);
  const typeCache = new Map(topLevelPnData.map((p) => [p.pn, p.pn_type]));

  const childrenCache = new Map<string, AssemblyChild[]>();
  const leaves: TaggedLeaf[] = [];

  const processRow = async (
    item: BOMItemWithCost,
    bucket: TaggedLeaf["bucket"],
    bucketIndex: number,
  ) => {
    const pnType = typeCache.get(item.pn);
    if (pnType === "ASSY") {
      await explodeAssy(
        item.pn,
        item.qty,
        leaves,
        bucket,
        bucketIndex,
        item.tag,
        childrenCache,
        0,
        new Set(),
      );
    } else {
      leaves.push({
        bucket,
        bucketIndex,
        pn: item.pn,
        description: item.description,
        qty: item.qty,
        tag: item.tag,
      });
    }
  };

  for (const item of generalBOM) {
    await processRow(item, "general", 0);
  }
  for (let i = 0; i < waterTankBOMs.length; i++) {
    for (const item of waterTankBOMs[i]) {
      await processRow(item, "waterTank", i);
    }
  }
  for (let i = 0; i < washBayBOMs.length; i++) {
    for (const item of washBayBOMs[i]) {
      await processRow(item, "washBay", i);
    }
  }

  // Enrich leaves with cost from DB (single batch per bucket to keep structure)
  const generalLeaves = leaves
    .filter((l) => l.bucket === "general")
    .map((l) => ({
      pn: l.pn,
      description: l.description,
      qty: l.qty,
      _description: "",
      tag: l.tag,
    }));

  const waterTankLeaves = Array.from({ length: waterTankBOMs.length }, (_, i) =>
    leaves
      .filter((l) => l.bucket === "waterTank" && l.bucketIndex === i)
      .map((l) => ({
        pn: l.pn,
        description: l.description,
        qty: l.qty,
        _description: "",
        tag: l.tag,
      })),
  );

  const washBayLeaves = Array.from({ length: washBayBOMs.length }, (_, i) =>
    leaves
      .filter((l) => l.bucket === "washBay" && l.bucketIndex === i)
      .map((l) => ({
        pn: l.pn,
        description: l.description,
        qty: l.qty,
        _description: "",
        tag: l.tag,
      })),
  );

  const [enrichedGeneral, enrichedWaterTanks, enrichedWashBays] =
    await Promise.all([
      enrichWithCosts(generalLeaves),
      Promise.all(waterTankLeaves.map(enrichWithCosts)),
      Promise.all(washBayLeaves.map(enrichWithCosts)),
    ]);

  return {
    generalBOM: enrichedGeneral,
    waterTankBOMs: enrichedWaterTanks,
    washBayBOMs: enrichedWashBays,
  };
}
