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
import type { OfferLineItem } from "@/validation/offer/offer-pricing-schema";

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
    extra_discount_amount: "0.00",
    show_net_total_only: false,
    delivery_date: null,
    delivery_destination: null,
    payment_terms: null,
    warranty_months: 12,
    status: "DRAFT",
    updated_at: new Date("2026-01-05T10:00:00Z"),
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
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={makeRevision()}
        editable={true}
      />,
    );

    expect(screen.getByText("Pos. 1 — Cliente offerta")).toBeInTheDocument();
    expect(screen.getByText("Pos. 2 — Cliente offerta")).toBeInTheDocument();
    expect(screen.getByText(/Prezzo non disponibile/)).toBeInTheDocument();
    expect(screen.getByText("Sconto 10%")).toBeInTheDocument();
    expect(screen.getByText("Totale scontato")).toBeInTheDocument();
    // The editable revision shows the settings controls.
    expect(screen.getByTestId("settings-card")).toBeInTheDocument();
  });

  test("hides the settings controls when the revision is not editable", () => {
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={makeRevision()}
        editable={false}
      />,
    );
    expect(screen.queryByTestId("settings-card")).not.toBeInTheDocument();
  });

  test("renders the extra discount row and the reduced net total", () => {
    const revision = {
      ...makeRevision(),
      extra_discount_amount: "40.00",
    };
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={revision}
        editable={false}
      />,
    );

    // Discounted total 540 − 40 extra discount → 500.
    const row = screen.getByText("Sconto extra");
    expect(row).toBeInTheDocument();
    expect(row.parentElement).toHaveTextContent("-40,00");
    expect(screen.getByText("Totale netto").parentElement).toHaveTextContent(
      "500,00",
    );
  });

  test("hides the extra discount row in net-total-only mode but keeps the reduced total", () => {
    const revision = {
      ...makeRevision(),
      extra_discount_amount: "40.00",
      show_net_total_only: true,
    };
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={revision}
        editable={false}
      />,
    );

    expect(screen.queryByText("Sconto extra")).not.toBeInTheDocument();
    // The net total still reflects the discount: 540 − 40 → 500.
    expect(screen.getByText("Totale netto").parentElement).toHaveTextContent(
      "500,00",
    );
  });

  test("omits the extra discount row when no discount is set", () => {
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={makeRevision()}
        editable={false}
      />,
    );
    expect(screen.queryByText("Sconto extra")).not.toBeInTheDocument();
  });

  test("renders the supply conditions list with resolved placeholders", () => {
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={makeRevision()}
        editable={false}
      />,
    );

    expect(screen.getByText("Condizioni di fornitura")).toBeInTheDocument();
    expect(screen.getByText("IVA esclusa")).toBeInTheDocument();
    expect(screen.getByText("Data di consegna:")).toBeInTheDocument();
    expect(screen.getByText("Modalità di pagamento:")).toBeInTheDocument();
    // Empty destination falls back to the customer address.
    expect(screen.getByText("Destinazione:").closest("li")).toHaveTextContent(
      "Destinazione: Via Milano 2",
    );
    expect(screen.getByText("Garanzia:").closest("li")).toHaveTextContent(
      "Garanzia: 12 mesi",
    );
  });

  test("renders stored supply conditions verbatim", () => {
    const revision = {
      ...makeRevision(),
      delivery_date: new Date("2026-09-15T00:00:00Z"),
      delivery_destination: "Cantiere di Verona",
      payment_terms: "Bonifico 60 gg",
      warranty_months: 24,
    };
    render(
      <QuoteView
        offerId={5}
        customerName="Cliente offerta"
        customerAddress="Via Milano 2"
        revision={revision}
        editable={false}
      />,
    );

    expect(
      screen.getByText("Data di consegna:").closest("li"),
    ).toHaveTextContent("Data di consegna: 15/09/2026");
    expect(screen.getByText("Destinazione:").closest("li")).toHaveTextContent(
      "Destinazione: Cantiere di Verona",
    );
    expect(
      screen.getByText("Modalità di pagamento:").closest("li"),
    ).toHaveTextContent("Modalità di pagamento: Bonifico 60 gg");
    expect(screen.getByText("Garanzia:").closest("li")).toHaveTextContent(
      "Garanzia: 24 mesi",
    );
  });
});
