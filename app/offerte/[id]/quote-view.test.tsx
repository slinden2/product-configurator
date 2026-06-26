// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(cleanup);

// lib/offer (imported transitively) reaches @/db/queries; stub it so the test
// never pulls the real database client.
vi.mock("@/db/queries", () => ({
  getPriceCoefficientsByArray: vi.fn(),
}));

vi.mock("@/app/actions/offer-revision-actions", () => ({
  setRevisionDiscountAction: vi.fn(),
  setRevisionSettingsAction: vi.fn(),
}));

vi.mock("@/components/offer/offer-settings-card", () => ({
  default: () => <div data-testid="settings-card" />,
}));

import QuoteView from "@/app/offerte/[id]/quote-view";
import type { OfferLineItem } from "@/validation/offer-schema";

const bomItem: OfferLineItem = {
  pn: "GEN-01",
  description: "Frame",
  qty: 1,
  coefficient: 3,
  list_price: 600,
  line_total: 600,
  tag: "FRAME",
  category: "GENERAL",
  category_index: 0,
};

// Minimal revision shape — QuoteView only reads these fields.
function makeRevision() {
  return {
    id: 7,
    discount_pct: "10.00",
    transport_amount: "0.00",
    transport_mode: "SEPARATE",
    installation_mode: "TBD",
    installation_items: [],
    show_net_total_only: false,
    status: "DRAFT",
    lines: [
      {
        id: 1,
        position: 0,
        quantity: 1,
        list_price: "600.00",
        net_price: "540.00",
        pricing_snapshot: [bomItem],
        configuration: {
          id: 11,
          name: "Bus",
          status: "DRAFT",
          origin: "OFFER",
        },
      },
      {
        id: 2,
        position: 1,
        quantity: 1,
        list_price: "0.00",
        net_price: "0.00",
        pricing_snapshot: null,
        configuration: {
          id: 12,
          name: "Truck",
          status: "DRAFT",
          origin: "OFFER",
        },
      },
    ],
    // biome-ignore lint/suspicious/noExplicitAny: minimal test double for the revision shape
  } as any;
}

describe("QuoteView", () => {
  test("renders a per-line breakdown, the unavailable state, and discounted totals", () => {
    render(<QuoteView offerId={5} revision={makeRevision()} editable={true} />);

    expect(screen.getByText("Pos. 1 — Bus")).toBeInTheDocument();
    expect(screen.getByText("Pos. 2 — Truck")).toBeInTheDocument();
    expect(screen.getByText(/Prezzo non disponibile/)).toBeInTheDocument();
    expect(screen.getByText("Sconto 10%")).toBeInTheDocument();
    expect(screen.getByText("Totale scontato")).toBeInTheDocument();
    // The editable revision shows the settings controls.
    expect(screen.getByTestId("settings-card")).toBeInTheDocument();
  });

  test("hides the settings controls when the revision is not editable", () => {
    render(
      <QuoteView offerId={5} revision={makeRevision()} editable={false} />,
    );
    expect(screen.queryByTestId("settings-card")).not.toBeInTheDocument();
  });
});
