// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferWorkingRevision = vi.fn();
const mockUpdateRevisionDiscountWithAudit = vi.fn();
const mockUpdateRevisionSettingsWithAudit = vi.fn();
const mockCreateOfferRevisionFrom = vi.fn();
const mockCreateRenegotiationRevisionFrom = vi.fn();
const mockGetWorkingRevisionForSend = vi.fn();
const mockMarkOfferRevisionSentWithAudit = vi.fn();
const mockSubmitOfferRevisionForApprovalWithAudit = vi.fn();
const mockApproveOfferRevisionWithAudit = vi.fn();
const mockReturnOfferRevisionToDraftWithAudit = vi.fn();
const mockAcceptOfferRevisionWithAudit = vi.fn();
const mockUnacceptOfferRevisionWithAudit = vi.fn();
const mockRecordOfferRevisionOutcomeWithAudit = vi.fn();
const mockRepriceOfferLines = vi.fn();
const mockLoadValidatedConfiguration = vi.fn();
const mockGetConfigsForEnergyChainCheck = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferWorkingRevision: (...args: unknown[]) =>
    mockGetOfferWorkingRevision(...args),
  acceptOfferRevisionWithAudit: (...args: unknown[]) =>
    mockAcceptOfferRevisionWithAudit(...args),
  unacceptOfferRevisionWithAudit: (...args: unknown[]) =>
    mockUnacceptOfferRevisionWithAudit(...args),
  recordOfferRevisionOutcomeWithAudit: (...args: unknown[]) =>
    mockRecordOfferRevisionOutcomeWithAudit(...args),
  updateRevisionDiscountWithAudit: (...args: unknown[]) =>
    mockUpdateRevisionDiscountWithAudit(...args),
  updateRevisionSettingsWithAudit: (...args: unknown[]) =>
    mockUpdateRevisionSettingsWithAudit(...args),
  createOfferRevisionFrom: (...args: unknown[]) =>
    mockCreateOfferRevisionFrom(...args),
  createRenegotiationRevisionFrom: (...args: unknown[]) =>
    mockCreateRenegotiationRevisionFrom(...args),
  getWorkingRevisionForSend: (...args: unknown[]) =>
    mockGetWorkingRevisionForSend(...args),
  getConfigsForEnergyChainCheck: (...args: unknown[]) =>
    mockGetConfigsForEnergyChainCheck(...args),
  markOfferRevisionSentWithAudit: (...args: unknown[]) =>
    mockMarkOfferRevisionSentWithAudit(...args),
  submitOfferRevisionForApprovalWithAudit: (...args: unknown[]) =>
    mockSubmitOfferRevisionForApprovalWithAudit(...args),
  approveOfferRevisionWithAudit: (...args: unknown[]) =>
    mockApproveOfferRevisionWithAudit(...args),
  returnOfferRevisionToDraftWithAudit: (...args: unknown[]) =>
    mockReturnOfferRevisionToDraftWithAudit(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

// db.transaction simply runs the callback with a stub tx (the query helpers it would
// call are mocked above / below).
vi.mock("@/db", () => ({
  db: { transaction: (cb: (tx: unknown) => unknown) => cb({}) },
}));

vi.mock("@/lib/offer-revision-pricing", () => ({
  repriceOfferLines: (...args: unknown[]) => mockRepriceOfferLines(...args),
}));

vi.mock("@/db/load-validated-configuration", () => ({
  loadValidatedConfiguration: (...args: unknown[]) =>
    mockLoadValidatedConfiguration(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// --- Imports (after mocks) ---

import {
  acceptRevisionAction,
  approveRevisionAction,
  createRenegotiationRevisionAction,
  createRevisionAction,
  recordRevisionOutcomeAction,
  rejectRevisionAction,
  sendRevisionAction,
  setRevisionDiscountAction,
  setRevisionSettingsAction,
  submitRevisionForApprovalAction,
  unacceptRevisionAction,
} from "@/app/actions/offer-revision-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const REVISION_ID = 7;

function validSettings() {
  return {
    show_net_total_only: false,
    transport_amount: 1000,
    transport_mode: "INCLUDED" as const,
    installation_mode: "TBD" as const,
    installation_items: [
      { kind: "BASE_SYSTEM" as const, amount: 0, included: false },
      { kind: "HP_ROOF_BAR" as const, amount: 0, included: false },
    ],
  };
}

describe("setRevisionDiscountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    mockUpdateRevisionDiscountWithAudit.mockResolvedValue(undefined);
  });

  test("sets the discount and recomputes line nets", async () => {
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: true });
    expect(mockUpdateRevisionDiscountWithAudit).toHaveBeenCalledWith({
      revisionId: REVISION_ID,
      discount_pct: "10.00",
      updated_by: "u1",
    });
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a non-DRAFT revision", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("rejects an out-of-range discount", async () => {
    const result = await setRevisionDiscountAction(OFFER_ID, 50);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.invalidDiscount,
    });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });
});

describe("setRevisionSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES_MANAGER" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    mockUpdateRevisionSettingsWithAudit.mockResolvedValue(undefined);
  });

  test("persists settings with the transport amount as a fixed string", async () => {
    const result = await setRevisionSettingsAction(OFFER_ID, validSettings());
    expect(result).toEqual({ success: true });
    expect(mockUpdateRevisionSettingsWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        revisionId: REVISION_ID,
        updated_by: "u1",
        settings: expect.objectContaining({ transport_amount: "1000.00" }),
      }),
    );
  });

  test("rejects a non-DRAFT revision", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "APPROVED_TO_SEND",
    });
    const result = await setRevisionSettingsAction(OFFER_ID, validSettings());
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
    expect(mockUpdateRevisionSettingsWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a negative transport amount", async () => {
    const result = await setRevisionSettingsAction(OFFER_ID, {
      ...validSettings(),
      transport_amount: -10,
    });
    expect(result.success).toBe(false);
    expect(mockUpdateRevisionSettingsWithAudit).not.toHaveBeenCalled();
  });
});

describe("submitRevisionForApprovalAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
      configIds: [11, 12],
    });
    mockRepriceOfferLines.mockResolvedValue(undefined);
    mockSubmitOfferRevisionForApprovalWithAudit.mockResolvedValue(undefined);
    // Default: no line violates the ENERGY_CHAIN invariant.
    mockGetConfigsForEnergyChainCheck.mockResolvedValue([
      {
        id: 11,
        name: "Config 11",
        supply_type: "STRAIGHT_SHELF",
        wash_bays: [],
      },
      {
        id: 12,
        name: "Config 12",
        supply_type: "ENERGY_CHAIN",
        wash_bays: [{ has_gantry: true, energy_chain_width: "L200" }],
      },
    ]);
  });

  test("reprices the lines (last DRAFT moment) then submits for approval", async () => {
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockRepriceOfferLines).toHaveBeenCalledWith(
      [11, 12],
      "u1",
      {},
      {
        audit: false,
      },
    );
    expect(mockSubmitOfferRevisionForApprovalWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "u1",
      {},
    );
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockSubmitOfferRevisionForApprovalWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a non-DRAFT revision before opening a transaction", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotSubmit });
    expect(mockGetWorkingRevisionForSend).not.toHaveBeenCalled();
    expect(mockSubmitOfferRevisionForApprovalWithAudit).not.toHaveBeenCalled();
  });

  test("refuses to submit an empty revision", async () => {
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
      configIds: [],
    });
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.cannotSendEmpty,
    });
    expect(mockRepriceOfferLines).not.toHaveBeenCalled();
    expect(mockSubmitOfferRevisionForApprovalWithAudit).not.toHaveBeenCalled();
  });

  test("checks the line configs for the ENERGY_CHAIN invariant with the tx", async () => {
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockGetConfigsForEnergyChainCheck).toHaveBeenCalledWith(
      [11, 12],
      {},
    );
  });

  test("blocks submission when a line's ENERGY_CHAIN config has no qualifying bay", async () => {
    mockGetConfigsForEnergyChainCheck.mockResolvedValue([
      {
        id: 11,
        name: "Config 11",
        supply_type: "STRAIGHT_SHELF",
        wash_bays: [],
      },
      {
        id: 12,
        name: "Impianto Catena",
        supply_type: "ENERGY_CHAIN",
        wash_bays: [{ has_gantry: true, energy_chain_width: null }],
      },
    ]);
    const result = await submitRevisionForApprovalAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineEnergyChainInvalid("Impianto Catena"),
    });
    expect(mockRepriceOfferLines).not.toHaveBeenCalled();
    expect(mockSubmitOfferRevisionForApprovalWithAudit).not.toHaveBeenCalled();
  });
});

describe("approveRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "m1", role: "SALES_MANAGER" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "PENDING_APPROVAL",
    });
    mockApproveOfferRevisionWithAudit.mockResolvedValue(undefined);
  });

  test("a manager approves a pending revision (scope already gated by the fetch)", async () => {
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockApproveOfferRevisionWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "m1",
      {},
    );
  });

  test("a director may approve", async () => {
    mockGetUserData.mockResolvedValue({ id: "d1", role: "SALES_DIRECTOR" });
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
  });

  test("a SALES agent cannot approve (even own)", async () => {
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.unauthorizedApprove,
    });
    expect(mockApproveOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockApproveOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockApproveOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the revision is not PENDING_APPROVAL", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    const result = await approveRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotApprove });
    expect(mockApproveOfferRevisionWithAudit).not.toHaveBeenCalled();
  });
});

describe("rejectRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "m1", role: "SALES_MANAGER" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "PENDING_APPROVAL",
    });
    mockReturnOfferRevisionToDraftWithAudit.mockResolvedValue(undefined);
  });

  test("a manager hands a pending revision back to DRAFT", async () => {
    const result = await rejectRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockReturnOfferRevisionToDraftWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "m1",
      "PENDING_APPROVAL",
      {},
    );
  });

  test("a manager un-approves an APPROVED_TO_SEND revision", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "APPROVED_TO_SEND",
    });
    const result = await rejectRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockReturnOfferRevisionToDraftWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "m1",
      "APPROVED_TO_SEND",
      {},
    );
  });

  test("a SALES agent cannot reject", async () => {
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    const result = await rejectRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.unauthorizedApprove,
    });
    expect(mockReturnOfferRevisionToDraftWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the revision is neither pending nor approved", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    const result = await rejectRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.cannotReturnToDraft,
    });
    expect(mockReturnOfferRevisionToDraftWithAudit).not.toHaveBeenCalled();
  });
});

describe("sendRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "APPROVED_TO_SEND",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "APPROVED_TO_SEND",
      configIds: [11, 12],
    });
    mockMarkOfferRevisionSentWithAudit.mockResolvedValue(undefined);
  });

  test("freezes an approved revision as sent without re-pricing", async () => {
    const result = await sendRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    // Lines were already priced at submit — send must not re-price.
    expect(mockRepriceOfferLines).not.toHaveBeenCalled();
    expect(mockMarkOfferRevisionSentWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "u1",
      {},
    );
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await sendRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockMarkOfferRevisionSentWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await sendRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockGetWorkingRevisionForSend).not.toHaveBeenCalled();
  });

  test("rejects a revision that is not APPROVED_TO_SEND", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    const result = await sendRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotSend });
    expect(mockGetWorkingRevisionForSend).not.toHaveBeenCalled();
    expect(mockMarkOfferRevisionSentWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the in-tx read shows it left APPROVED_TO_SEND", async () => {
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
      configIds: [11],
    });
    const result = await sendRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotSend });
    expect(mockMarkOfferRevisionSentWithAudit).not.toHaveBeenCalled();
  });
});

describe("createRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    // Latest revision is frozen (SENT) → a new working revision may be cloned.
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    mockCreateOfferRevisionFrom.mockResolvedValue({
      revisionId: 99,
      revisionNo: 3,
      configIds: [21],
    });
    mockRepriceOfferLines.mockResolvedValue(undefined);
  });

  test("clones forward from the latest revision by default and reprices", async () => {
    const result = await createRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true, data: { revisionNo: 3 } });
    // The default source (latest) is resolved inside createOfferRevisionFrom under
    // the offer row lock, so the action passes `undefined` straight through.
    expect(mockCreateOfferRevisionFrom).toHaveBeenCalledWith(
      OFFER_ID,
      undefined,
      "u1",
      {},
    );
    expect(mockRepriceOfferLines).toHaveBeenCalledWith(
      [21],
      "u1",
      {},
      {
        audit: false,
      },
    );
  });

  test("clones from an earlier revision when reverting", async () => {
    await createRevisionAction(OFFER_ID, 1);
    expect(mockCreateOfferRevisionFrom).toHaveBeenCalledWith(
      OFFER_ID,
      1,
      "u1",
      {},
    );
  });

  test("surfaces the working-revision guard error", async () => {
    mockCreateOfferRevisionFrom.mockRejectedValue(
      new QueryError(MSG.offer.workingRevisionExists, 409),
    );
    const result = await createRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.workingRevisionExists,
    });
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await createRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockCreateOfferRevisionFrom).not.toHaveBeenCalled();
  });
});

describe("createRenegotiationRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "d1", role: "SALES_DIRECTOR" });
    // Latest revision is the in-force accepted one → a renegotiation may open.
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "ACCEPTED",
    });
    mockCreateRenegotiationRevisionFrom.mockResolvedValue({
      revisionId: 99,
      revisionNo: 3,
      configIds: [21, 22],
    });
    mockRepriceOfferLines.mockResolvedValue(undefined);
  });

  test("creates the renegotiation revision and re-prices its lines in-tx", async () => {
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true, data: { revisionNo: 3 } });
    expect(mockCreateRenegotiationRevisionFrom).toHaveBeenCalledWith(
      OFFER_ID,
      "d1",
      {},
    );
    expect(mockRepriceOfferLines).toHaveBeenCalledWith(
      [21, 22],
      "d1",
      {},
      {
        audit: false,
      },
    );
  });

  test("ADMIN may open a renegotiation", async () => {
    mockGetUserData.mockResolvedValue({ id: "a1", role: "ADMIN" });
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true, data: { revisionNo: 3 } });
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
  ] as const)("rejects %s (management decision, not a sales one)", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "s1", role });
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.renegotiationUnauthorized,
    });
    expect(mockCreateRenegotiationRevisionFrom).not.toHaveBeenCalled();
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockCreateRenegotiationRevisionFrom).not.toHaveBeenCalled();
  });

  test("surfaces the not-accepted guard error", async () => {
    mockCreateRenegotiationRevisionFrom.mockRejectedValue(
      new QueryError(MSG.offer.renegotiationNotAccepted, 409),
    );
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.renegotiationNotAccepted,
    });
  });

  test("surfaces the open-working-revision guard error", async () => {
    mockCreateRenegotiationRevisionFrom.mockRejectedValue(
      new QueryError(MSG.offer.workingRevisionExists, 409),
    );
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.workingRevisionExists,
    });
  });

  test("returns notFound for an offer out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await createRenegotiationRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockCreateRenegotiationRevisionFrom).not.toHaveBeenCalled();
  });
});

describe("acceptRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
      configIds: [11, 12],
    });
    mockLoadValidatedConfiguration.mockResolvedValue({
      configuration: { name: "C" },
      status: "DRAFT",
      origin: "OFFER",
      waterTanks: [],
      washBays: [],
    });
    mockAcceptOfferRevisionWithAudit.mockResolvedValue(undefined);
  });

  test("accepts a SENT revision and fans out each line config", async () => {
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    // Each line config snapshot is loaded for the as-sold freeze.
    expect(mockLoadValidatedConfiguration).toHaveBeenCalledTimes(2);
    expect(mockAcceptOfferRevisionWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "u1",
      {
        11: { configuration: { name: "C" }, waterTanks: [], washBays: [] },
        12: { configuration: { name: "C" }, waterTanks: [], washBays: [] },
      },
      expect.anything(),
    );
  });

  test("manager may accept a report's offer (scope enforced by the fetch)", async () => {
    mockGetUserData.mockResolvedValue({ id: "m1", role: "SALES_MANAGER" });
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockAcceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the working revision is not SENT", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotAccept });
    expect(mockAcceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects an empty revision", async () => {
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
      configIds: [],
    });
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.cannotSendEmpty,
    });
    expect(mockAcceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("propagates an already-accepted QueryError from the helper", async () => {
    mockAcceptOfferRevisionWithAudit.mockRejectedValue(
      new QueryError(MSG.offer.alreadyAccepted, 409),
    );
    const result = await acceptRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.alreadyAccepted,
    });
  });
});

describe("unacceptRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "a1", role: "ADMIN" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "ACCEPTED",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "ACCEPTED",
      configIds: [11, 12],
    });
    mockUnacceptOfferRevisionWithAudit.mockResolvedValue(undefined);
  });

  test("ADMIN undoes an accepted revision back to SENT", async () => {
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: true });
    expect(mockUnacceptOfferRevisionWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "a1",
      expect.anything(),
    );
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("rejects %s (undo is ADMIN-only)", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "s1", role });
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.cannotUnaccept,
    });
    expect(mockUnacceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockUnacceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockUnacceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the working revision is not ACCEPTED", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
      configIds: [11],
    });
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.cannotUnaccept });
    expect(mockUnacceptOfferRevisionWithAudit).not.toHaveBeenCalled();
  });

  test("propagates the engineering-started guard error from the helper", async () => {
    mockUnacceptOfferRevisionWithAudit.mockRejectedValue(
      new QueryError(MSG.offer.unacceptEngineeringStarted, 409),
    );
    const result = await unacceptRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.unacceptEngineeringStarted,
    });
  });
});

describe("recordRevisionOutcomeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
    });
    mockGetWorkingRevisionForSend.mockResolvedValue({
      id: REVISION_ID,
      status: "SENT",
      configIds: [11],
    });
    mockRecordOfferRevisionOutcomeWithAudit.mockResolvedValue(undefined);
  });

  test("records REJECTED on a SENT revision", async () => {
    const result = await recordRevisionOutcomeAction(OFFER_ID, "REJECTED");
    expect(result).toEqual({ success: true });
    expect(mockRecordOfferRevisionOutcomeWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "u1",
      "REJECTED",
      expect.anything(),
    );
  });

  test("records EXPIRED on a SENT revision", async () => {
    const result = await recordRevisionOutcomeAction(OFFER_ID, "EXPIRED");
    expect(result).toEqual({ success: true });
    expect(mockRecordOfferRevisionOutcomeWithAudit).toHaveBeenCalledWith(
      OFFER_ID,
      REVISION_ID,
      "u1",
      "EXPIRED",
      expect.anything(),
    );
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await recordRevisionOutcomeAction(OFFER_ID, "REJECTED");
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockRecordOfferRevisionOutcomeWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the working revision is not SENT", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: REVISION_ID,
      status: "DRAFT",
    });
    const result = await recordRevisionOutcomeAction(OFFER_ID, "REJECTED");
    expect(result).toEqual({
      success: false,
      error: MSG.offer.cannotRecordOutcome,
    });
    expect(mockRecordOfferRevisionOutcomeWithAudit).not.toHaveBeenCalled();
  });
});
