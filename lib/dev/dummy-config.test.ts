import { describe, expect, it } from "vitest";
import { configDefaults, configSchema } from "@/validation/config-schema";
import { DUMMY_CONFIG_SCENARIOS, makeDummyConfig } from "./dummy-config";

describe("DUMMY_CONFIG_SCENARIOS", () => {
  it.each(
    DUMMY_CONFIG_SCENARIOS.map((s) => [s.key, s] as const),
  )("scenario %s composes into a valid configuration", (_key, scenario) => {
    // supply_side is one of the free-randomized fields in makeDummyConfig,
    // so scenarios don't set it; pin it here like the generator does.
    const result = configSchema.safeParse({
      ...configDefaults,
      name: "Scenario test",
      supply_side: "TBD",
      ...scenario.values(),
    });
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });
});

describe("makeDummyConfig", () => {
  it("always produces a configuration that passes configSchema", () => {
    for (let i = 0; i < 100; i++) {
      const result = configSchema.safeParse(makeDummyConfig());
      expect(result.error?.issues).toBeUndefined();
      expect(result.success).toBe(true);
    }
  });

  it("produces distinguishable names across calls", () => {
    const names = new Set(
      Array.from({ length: 20 }, () => makeDummyConfig().name),
    );
    expect(names.size).toBeGreaterThan(1);
  });
});
