import { describe, expect, test } from "vitest";
import { ConfigOrigins, ConfigurationStatus, Roles } from "@/types";
import {
  getTransitionDirection,
  getTransitionLabel,
  isAdjacentTransition,
  STATUS_CONFIG,
  STATUS_PIPELINE,
  STATUS_TRANSITIONS,
} from "./status-config";

describe("STATUS_CONFIG", () => {
  test("defines a label, color and icon for every status", () => {
    for (const status of ConfigurationStatus) {
      const config = STATUS_CONFIG[status];
      expect(config.label).toBeTruthy();
      expect(config.color).toMatch(/^#/);
      // lucide-react icons are forwardRef components (typeof "object").
      expect(config.icon).toBeDefined();
    }
  });
});

describe("STATUS_PIPELINE", () => {
  test("lists every status in workflow order", () => {
    expect(STATUS_PIPELINE).toEqual([
      "DRAFT",
      "SALES_APPROVED",
      "IN_TECH_REVIEW",
      "TECH_APPROVED",
      "CLOSED",
    ]);
  });
});

describe("getTransitionDirection", () => {
  test("returns forward when the target is later in the pipeline", () => {
    expect(getTransitionDirection("DRAFT", "SALES_APPROVED")).toBe("forward");
    expect(getTransitionDirection("IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
      "forward",
    );
    expect(getTransitionDirection("DRAFT", "CLOSED")).toBe("forward");
  });

  test("returns backward when the target is earlier in the pipeline", () => {
    expect(getTransitionDirection("SALES_APPROVED", "DRAFT")).toBe("backward");
    expect(getTransitionDirection("TECH_APPROVED", "IN_TECH_REVIEW")).toBe(
      "backward",
    );
    expect(getTransitionDirection("CLOSED", "DRAFT")).toBe("backward");
  });
});

describe("isAdjacentTransition", () => {
  test("is true only for single-step moves in either direction", () => {
    expect(isAdjacentTransition("DRAFT", "SALES_APPROVED")).toBe(true);
    expect(isAdjacentTransition("SALES_APPROVED", "DRAFT")).toBe(true);
    expect(isAdjacentTransition("TECH_APPROVED", "CLOSED")).toBe(true);
  });

  test("is false for multi-step jumps", () => {
    expect(isAdjacentTransition("DRAFT", "IN_TECH_REVIEW")).toBe(false);
    expect(isAdjacentTransition("DRAFT", "CLOSED")).toBe(false);
    expect(isAdjacentTransition("SALES_APPROVED", "TECH_APPROVED")).toBe(false);
  });
});

describe("getTransitionLabel", () => {
  test.each([
    ["SALES_APPROVED", "IN_TECH_REVIEW", "Prendi in revisione tecnica"],
    ["IN_TECH_REVIEW", "SALES_APPROVED", "Rimanda a vendite"],
    ["IN_TECH_REVIEW", "TECH_APPROVED", "Approva"],
    ["TECH_APPROVED", "IN_TECH_REVIEW", "Riapri"],
    ["TECH_APPROVED", "CLOSED", "Chiudi"],
    ["CLOSED", "TECH_APPROVED", "Riapri"],
  ] as const)("labels the %s -> %s edge '%s'", (from, to, expected) => {
    expect(getTransitionLabel(from, to)).toBe(expected);
  });

  test("falls back to the target status label for non-adjacent jumps", () => {
    // No dedicated edge label exists for a DRAFT -> CLOSED jump (ADMIN only),
    // so it falls back to the target status' own label.
    expect(getTransitionLabel("DRAFT", "CLOSED")).toBe(
      STATUS_CONFIG.CLOSED.label,
    );
  });
});

describe("STATUS_TRANSITIONS", () => {
  test("every row has a non-empty label and a non-identity edge", () => {
    for (const t of STATUS_TRANSITIONS) {
      expect(t.label).toBeTruthy();
      expect(t.from).not.toBe(t.to);
    }
  });

  test("every row references only known statuses, roles and origins", () => {
    for (const t of STATUS_TRANSITIONS) {
      expect(ConfigurationStatus).toContain(t.from);
      expect(ConfigurationStatus).toContain(t.to);
      expect(t.origins.length).toBeGreaterThan(0);
      for (const role of t.roles) expect(Roles).toContain(role);
      for (const origin of t.origins) expect(ConfigOrigins).toContain(origin);
    }
  });

  test("has no duplicate (from, to) edge", () => {
    const keys = STATUS_TRANSITIONS.map((t) => `${t.from}->${t.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // Sales approval lives on the offer revision; the only route into
  // SALES_APPROVED is the acceptance fan-out, never a manual sales edge.
  test("grants no edge to any sales role", () => {
    for (const t of STATUS_TRANSITIONS) {
      expect(t.roles).not.toContain("SALES");
      expect(t.roles).not.toContain("SALES_MANAGER");
      expect(t.roles).not.toContain("SALES_DIRECTOR");
    }
  });

  test("has no edge into SALES_APPROVED except the engineer hand-back", () => {
    const intoSalesApproved = STATUS_TRANSITIONS.filter(
      (t) => t.to === "SALES_APPROVED",
    );
    expect(intoSalesApproved).toHaveLength(1);
    expect(intoSalesApproved[0].from).toBe("IN_TECH_REVIEW");
    expect(intoSalesApproved[0].roles).toEqual(["ENGINEER"]);
  });
});
