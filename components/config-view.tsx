import { Fragment } from "react";
import { buildCompleteConfigViewSections } from "@/lib/configuration/build-config-view-model";
import type { UpdateConfigSchema } from "@/validation/config-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import ViewSectionCard from "./view-section-card";

interface ConfigViewProps {
  configuration: UpdateConfigSchema;
  waterTanks: UpdateWaterTankSchema[];
  washBays: UpdateWashBaySchema[];
}

/** Read-only presentation of a configuration spec plus its water tanks and wash bays. */
const ConfigView = ({
  configuration,
  waterTanks,
  washBays,
}: ConfigViewProps) => {
  const groups = buildCompleteConfigViewSections(
    configuration,
    waterTanks,
    washBays,
  );

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Fragment key={group.title ?? "config"}>
          {group.title && (
            <h2 className="pt-4 text-xl font-semibold">{group.title}</h2>
          )}
          {group.sections.map((section) => (
            <ViewSectionCard key={section.title} section={section} />
          ))}
        </Fragment>
      ))}
    </div>
  );
};

export default ConfigView;
