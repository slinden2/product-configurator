import { describe, expect, test } from "vitest";
import {
  ConfigOrigins,
  ConfigurationStatus,
  type ConfigurationStatusType,
  type Role,
  Roles,
} from "@/types";
import {
  canTransition,
  getTransitionDirection,
  getTransitionLabel,
  isEditable,
  isWorkflowEdge,
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

describe("isWorkflowEdge", () => {
  test("is true for named edges of the matching origin", () => {
    expect(isWorkflowEdge("DRAFT", "TECH_APPROVED", "STANDALONE")).toBe(true);
    expect(isWorkflowEdge("TECH_APPROVED", "DRAFT", "STANDALONE")).toBe(true);
    expect(isWorkflowEdge("SALES_APPROVED", "IN_TECH_REVIEW", "OFFER")).toBe(
      true,
    );
    expect(isWorkflowEdge("IN_TECH_REVIEW", "TECH_APPROVED", "OFFER")).toBe(
      true,
    );
    expect(isWorkflowEdge("TECH_APPROVED", "CLOSED", "OFFER")).toBe(true);
  });

  test("is false when the edge does not exist for the origin", () => {
    expect(isWorkflowEdge("DRAFT", "TECH_APPROVED", "OFFER")).toBe(false);
    expect(isWorkflowEdge("DRAFT", "IN_TECH_REVIEW", "STANDALONE")).toBe(false);
    expect(isWorkflowEdge("IN_TECH_REVIEW", "DRAFT", "STANDALONE")).toBe(false);
    expect(
      isWorkflowEdge("IN_TECH_REVIEW", "TECH_APPROVED", "STANDALONE"),
    ).toBe(false);
    expect(
      isWorkflowEdge("TECH_APPROVED", "IN_TECH_REVIEW", "STANDALONE"),
    ).toBe(false);
    expect(
      isWorkflowEdge("IN_TECH_REVIEW", "SALES_APPROVED", "STANDALONE"),
    ).toBe(false);
  });

  test("is false for jumps with no row in the table", () => {
    expect(isWorkflowEdge("DRAFT", "SALES_APPROVED", "OFFER")).toBe(false);
    expect(isWorkflowEdge("DRAFT", "CLOSED", "STANDALONE")).toBe(false);
    expect(isWorkflowEdge("SALES_APPROVED", "TECH_APPROVED", "OFFER")).toBe(
      false,
    );
  });
});

describe("getTransitionLabel", () => {
  test.each([
    ["SALES_APPROVED", "IN_TECH_REVIEW", "Prendi in revisione tecnica"],
    ["IN_TECH_REVIEW", "SALES_APPROVED", "Rimanda a vendite"],
    ["IN_TECH_REVIEW", "TECH_APPROVED", "Approva"],
    ["TECH_APPROVED", "IN_TECH_REVIEW", "Riapri"],
    ["DRAFT", "TECH_APPROVED", "Approva"],
    ["TECH_APPROVED", "DRAFT", "Riapri"],
    ["TECH_APPROVED", "CLOSED", "Chiudi"],
    ["CLOSED", "TECH_APPROVED", "Riapri"],
  ] as const)("labels the %s -> %s edge '%s'", (from, to, expected) => {
    expect(getTransitionLabel(from, to)).toBe(expected);
  });

  test("falls back to the target status label for jumps without a row", () => {
    // A rowless pair like DRAFT -> CLOSED is not a defined edge for anyone, so
    // getTransitionLabel falls back to the target status' own label.
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

describe("isEditable", () => {
  describe("SALES_APPROVED, TECH_APPROVED and CLOSED are never editable", () => {
    const roles: Role[] = [
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ENGINEER",
      "ADMIN",
    ];

    test.each(roles)("SALES_APPROVED is not editable for %s", (role) => {
      expect(isEditable("SALES_APPROVED", role)).toBe(false);
    });

    test.each(roles)("TECH_APPROVED is not editable for %s", (role) => {
      expect(isEditable("TECH_APPROVED", role)).toBe(false);
    });

    test.each(roles)("CLOSED is not editable for %s", (role) => {
      expect(isEditable("CLOSED", role)).toBe(false);
    });
  });

  // OFFER pre-handoff (DRAFT) is a two-phase gate: editable only while the
  // offer revision is DRAFT. A missing revision status fails closed.
  describe("OFFER pre-handoff — revision is DRAFT", () => {
    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ADMIN",
    ] as const)("%s can edit DRAFT", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "DRAFT")).toBe(true);
    });

    test("ENGINEER has no offer access pre-handoff", () => {
      expect(isEditable("DRAFT", "ENGINEER", "OFFER", "DRAFT")).toBe(false);
    });
  });

  describe("OFFER pre-handoff — fail closed", () => {
    const roles: Role[] = [
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ENGINEER",
      "ADMIN",
    ];

    test.each(
      roles,
    )("%s cannot edit DRAFT when the revision is not DRAFT (SENT)", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "SENT")).toBe(false);
    });

    // The approval states lock the line configs exactly like SENT does.
    test.each(
      roles,
    )("%s cannot edit DRAFT when the revision is PENDING_APPROVAL or APPROVED_TO_SEND", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "PENDING_APPROVAL")).toBe(
        false,
      );
      expect(isEditable("DRAFT", role, "OFFER", "APPROVED_TO_SEND")).toBe(
        false,
      );
    });

    test.each(
      roles,
    )("%s cannot edit DRAFT when no revision status is supplied", (role) => {
      expect(isEditable("DRAFT", role, "OFFER")).toBe(false);
    });
  });

  describe("OFFER engineering zone (IN_TECH_REVIEW)", () => {
    test.each([
      "ENGINEER",
      "ADMIN",
    ] as const)("%s can edit IN_TECH_REVIEW regardless of revision", (role) => {
      expect(isEditable("IN_TECH_REVIEW", role)).toBe(true);
      expect(isEditable("IN_TECH_REVIEW", role, "OFFER", "SENT")).toBe(true);
    });

    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
    ] as const)("%s cannot edit IN_TECH_REVIEW", (role) => {
      expect(isEditable("IN_TECH_REVIEW", role, "OFFER", "DRAFT")).toBe(false);
    });
  });
});

describe("isEditable — STANDALONE origin", () => {
  describe.each(["ENGINEER", "ADMIN"] as const)("%s role", (role) => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", role, "STANDALONE")).toBe(true);
    });

    test("cannot edit the frozen states", () => {
      expect(isEditable("TECH_APPROVED", role, "STANDALONE")).toBe(false);
      expect(isEditable("CLOSED", role, "STANDALONE")).toBe(false);
    });

    test("the hand-off statuses are never editable", () => {
      expect(isEditable("SALES_APPROVED", role, "STANDALONE")).toBe(false);
      expect(isEditable("IN_TECH_REVIEW", role, "STANDALONE")).toBe(false);
    });
  });

  describe.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s role can never edit a standalone config", (role) => {
    test.each([
      "DRAFT",
      "IN_TECH_REVIEW",
      "TECH_APPROVED",
    ] as ConfigurationStatusType[])("not editable in %s", (status) => {
      expect(isEditable(status, role, "STANDALONE")).toBe(false);
    });
  });
});

describe("canTransition", () => {
  test("a same-status no-op is always allowed", () => {
    expect(canTransition("SALES", "DRAFT", "DRAFT")).toBe(true);
  });

  // Sales roles have no config transitions at all: approval happens on the
  // offer revision, and SALES_APPROVED is reachable only via the acceptance
  // fan-out (db/queries/offers.ts).
  describe.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s has no config transitions", (role) => {
    test("cannot hand off DRAFT -> SALES_APPROVED", () => {
      expect(canTransition(role, "DRAFT", "SALES_APPROVED")).toBe(false);
    });

    test("cannot knock a handed-off config back (SALES_APPROVED -> DRAFT)", () => {
      expect(canTransition(role, "SALES_APPROVED", "DRAFT")).toBe(false);
    });

    test("cannot touch engineering-side statuses", () => {
      expect(canTransition(role, "SALES_APPROVED", "IN_TECH_REVIEW")).toBe(
        false,
      );
      expect(canTransition(role, "IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
        false,
      );
    });
  });

  describe("ENGINEER", () => {
    test("can pull SALES_APPROVED into review and back", () => {
      expect(
        canTransition("ENGINEER", "SALES_APPROVED", "IN_TECH_REVIEW"),
      ).toBe(true);
      expect(
        canTransition("ENGINEER", "IN_TECH_REVIEW", "SALES_APPROVED"),
      ).toBe(true);
    });

    test("can approve and reopen", () => {
      expect(canTransition("ENGINEER", "IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
        true,
      );
      expect(canTransition("ENGINEER", "TECH_APPROVED", "IN_TECH_REVIEW")).toBe(
        true,
      );
    });

    test("cannot hand off a pre-handoff config (DRAFT -> SALES_APPROVED)", () => {
      expect(canTransition("ENGINEER", "DRAFT", "SALES_APPROVED")).toBe(false);
    });

    test("cannot close (ADMIN only)", () => {
      expect(canTransition("ENGINEER", "TECH_APPROVED", "CLOSED")).toBe(false);
    });
  });

  describe("ADMIN", () => {
    test("can perform the defined workflow edges, including close and reopen", () => {
      const edges: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["SALES_APPROVED", "IN_TECH_REVIEW"],
        ["IN_TECH_REVIEW", "TECH_APPROVED"],
        ["TECH_APPROVED", "CLOSED"],
        ["CLOSED", "TECH_APPROVED"],
      ];
      for (const [from, to] of edges) {
        expect(canTransition("ADMIN", from, to)).toBe(true);
      }
    });

    // The arbitrary status-jump capability was removed: ADMIN is confined to the
    // defined edges, no non-adjacent overrides.
    test("cannot make arbitrary non-adjacent jumps", () => {
      const jumps: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["DRAFT", "CLOSED"],
        ["DRAFT", "TECH_APPROVED"],
        ["SALES_APPROVED", "DRAFT"],
        ["SALES_APPROVED", "CLOSED"],
      ];
      for (const [from, to] of jumps) {
        expect(canTransition("ADMIN", from, to)).toBe(false);
      }
    });
  });
});

describe("canTransition — STANDALONE origin", () => {
  describe("ENGINEER walks the two-state working/approved machine", () => {
    test("can approve and reopen (DRAFT <-> TECH_APPROVED)", () => {
      expect(
        canTransition("ENGINEER", "DRAFT", "TECH_APPROVED", "STANDALONE"),
      ).toBe(true);
      expect(
        canTransition("ENGINEER", "TECH_APPROVED", "DRAFT", "STANDALONE"),
      ).toBe(true);
    });

    test("cannot route through IN_TECH_REVIEW (not a standalone state)", () => {
      expect(
        canTransition("ENGINEER", "DRAFT", "IN_TECH_REVIEW", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition(
          "ENGINEER",
          "IN_TECH_REVIEW",
          "TECH_APPROVED",
          "STANDALONE",
        ),
      ).toBe(false);
      expect(
        canTransition(
          "ENGINEER",
          "TECH_APPROVED",
          "IN_TECH_REVIEW",
          "STANDALONE",
        ),
      ).toBe(false);
    });

    test("cannot reach the sales status", () => {
      expect(
        canTransition("ENGINEER", "DRAFT", "SALES_APPROVED", "STANDALONE"),
      ).toBe(false);
    });

    test("cannot close (ADMIN only)", () => {
      expect(
        canTransition("ENGINEER", "TECH_APPROVED", "CLOSED", "STANDALONE"),
      ).toBe(false);
    });
  });

  describe("ADMIN", () => {
    test("can perform the defined working/approved edges, including close and reopen", () => {
      const edges: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["DRAFT", "TECH_APPROVED"],
        ["TECH_APPROVED", "DRAFT"],
        ["TECH_APPROVED", "CLOSED"],
        ["CLOSED", "TECH_APPROVED"],
      ];
      for (const [from, to] of edges) {
        expect(canTransition("ADMIN", from, to, "STANDALONE")).toBe(true);
      }
    });

    // No arbitrary jumps: non-adjacent moves the table does not enumerate are
    // rejected for ADMIN too.
    test("cannot make arbitrary non-adjacent jumps", () => {
      const jumps: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["DRAFT", "CLOSED"],
        ["CLOSED", "DRAFT"],
      ];
      for (const [from, to] of jumps) {
        expect(canTransition("ADMIN", from, to, "STANDALONE")).toBe(false);
      }
    });

    test("still cannot route a standalone config through the hand-off statuses", () => {
      expect(
        canTransition("ADMIN", "DRAFT", "SALES_APPROVED", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition(
          "ADMIN",
          "SALES_APPROVED",
          "IN_TECH_REVIEW",
          "STANDALONE",
        ),
      ).toBe(false);
      expect(
        canTransition("ADMIN", "DRAFT", "IN_TECH_REVIEW", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition("ADMIN", "IN_TECH_REVIEW", "TECH_APPROVED", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition("ADMIN", "CLOSED", "IN_TECH_REVIEW", "STANDALONE"),
      ).toBe(false);
    });
  });

  describe.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s cannot transition a standalone config", (role) => {
    test("DRAFT -> TECH_APPROVED is rejected", () => {
      expect(canTransition(role, "DRAFT", "TECH_APPROVED", "STANDALONE")).toBe(
        false,
      );
    });
  });
});
