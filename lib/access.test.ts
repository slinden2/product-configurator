import { describe, expect, test } from "vitest";
import {
  canAccessAllConfigs,
  canAccessAllOffers,
  canApproveRevision,
  canExportOfferRevision,
  canManageStandaloneConfigs,
  canRenegotiateOffer,
  canViewBom,
  canViewMarginReview,
  canViewOffer,
  isConfigLocked,
} from "@/lib/access";
import type { OfferStatusType, Role } from "@/types";

describe("canApproveRevision", () => {
  test.each([
    "SALES_MANAGER",
    "SALES_DIRECTOR",
    "ADMIN",
  ] as const)("%s may approve a revision", (role) => {
    expect(canApproveRevision(role)).toBe(true);
  });

  test.each([
    "SALES",
    "ENGINEER",
  ] as Role[])("%s may not approve a revision", (role) => {
    expect(canApproveRevision(role)).toBe(false);
  });
});

describe("canViewOffer", () => {
  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
    "ADMIN",
  ] as const)("%s may view offers", (role) => {
    expect(canViewOffer(role)).toBe(true);
  });

  test("ENGINEER has no offer access", () => {
    expect(canViewOffer("ENGINEER")).toBe(false);
  });
});

describe("canExportOfferRevision", () => {
  test.each([
    "SENT",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
  ] as const)("%s (frozen) is exportable", (status) => {
    expect(canExportOfferRevision(status)).toBe(true);
  });

  test.each([
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED_TO_SEND",
  ] as OfferStatusType[])("%s (open working state) is not exportable", (status) => {
    expect(canExportOfferRevision(status)).toBe(false);
  });
});

describe("canViewBom", () => {
  test.each(["ENGINEER", "ADMIN"] as const)("%s may view the BOM", (role) => {
    expect(canViewBom(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as Role[])("%s may not view the BOM", (role) => {
    expect(canViewBom(role)).toBe(false);
  });
});

describe("canManageStandaloneConfigs", () => {
  test.each([
    "ENGINEER",
    "ADMIN",
  ] as const)("%s owns the technical config area", (role) => {
    expect(canManageStandaloneConfigs(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as Role[])("%s does not (sales work from offers)", (role) => {
    expect(canManageStandaloneConfigs(role)).toBe(false);
  });
});

describe("canRenegotiateOffer — 'a renegotiation is created ... by canRenegotiateOffer roles (ADMIN / SALES_DIRECTOR)' (workflow.md)", () => {
  test.each([
    "ADMIN",
    "SALES_DIRECTOR",
  ] as const)("%s may open a renegotiation revision", (role) => {
    expect(canRenegotiateOffer(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "ENGINEER",
  ] as Role[])("%s may not open a renegotiation revision", (role) => {
    expect(canRenegotiateOffer(role)).toBe(false);
  });
});

describe("canAccessAllConfigs — 'SALES_DIRECTOR / ENGINEER / ADMIN = all' config scope (workflow.md)", () => {
  test.each([
    "ADMIN",
    "ENGINEER",
    "SALES_DIRECTOR",
  ] as const)("%s sees every configuration", (role) => {
    expect(canAccessAllConfigs(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
  ] as Role[])("%s is scoped, not all-access", (role) => {
    expect(canAccessAllConfigs(role)).toBe(false);
  });
});

describe("canAccessAllOffers — 'SALES_DIRECTOR / ADMIN all' offers; ENGINEER excluded entirely (workflow.md)", () => {
  test.each([
    "ADMIN",
    "SALES_DIRECTOR",
  ] as const)("%s sees every offer", (role) => {
    expect(canAccessAllOffers(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "ENGINEER",
  ] as Role[])("%s is not offer all-access", (role) => {
    expect(canAccessAllOffers(role)).toBe(false);
  });
});

describe("isConfigLocked — fails closed on missing inputs", () => {
  test("an unknown status locks the config", () => {
    expect(isConfigLocked(undefined, "ADMIN", "OFFER", "DRAFT")).toBe(true);
  });

  test("an unknown role locks the config", () => {
    expect(isConfigLocked("DRAFT", undefined, "OFFER", "DRAFT")).toBe(true);
  });

  test("delegates to isEditable when both inputs are present", () => {
    expect(isConfigLocked("DRAFT", "ADMIN", "OFFER", "DRAFT")).toBe(false);
    expect(isConfigLocked("DRAFT", "ADMIN", "OFFER")).toBe(true);
  });
});

describe("canViewMarginReview", () => {
  test.each([
    "ADMIN",
    "SALES_DIRECTOR",
  ] as const)("%s may view the margin page", (role) => {
    expect(canViewMarginReview(role)).toBe(true);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "ENGINEER",
  ] as Role[])("%s may not view the margin page", (role) => {
    expect(canViewMarginReview(role)).toBe(false);
  });
});
