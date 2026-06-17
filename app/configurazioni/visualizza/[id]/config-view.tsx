import {
  buildConfigViewModel,
  buildWashBayViewSection,
  buildWaterTankViewSection,
} from "@/lib/configuration/build-config-view-model";
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
  const sections = buildConfigViewModel(configuration);
  const tankSections = waterTanks.map((tank, i) =>
    buildWaterTankViewSection(tank, i + 1),
  );
  const baySections = washBays.map((bay, i) =>
    buildWashBayViewSection(bay, i + 1, configuration.supply_type),
  );

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <ViewSectionCard key={section.title} section={section} />
      ))}

      {tankSections.length > 0 && (
        <>
          <h2 className="pt-4 text-xl font-semibold">Serbatoi</h2>
          {tankSections.map((section) => (
            <ViewSectionCard key={section.title} section={section} />
          ))}
        </>
      )}

      {baySections.length > 0 && (
        <>
          <h2 className="pt-4 text-xl font-semibold">Piste</h2>
          {baySections.map((section) => (
            <ViewSectionCard key={section.title} section={section} />
          ))}
        </>
      )}
    </div>
  );
};

export default ConfigView;
