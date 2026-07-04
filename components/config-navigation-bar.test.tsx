// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import type { Role } from "@/types";

// Held in variables (not JSX string literals) so Biome's a11y rule does not
// mistake the `role` component prop for the HTML/ARIA `role` attribute.
const ADMIN: Role = "ADMIN";
const ENGINEER: Role = "ENGINEER";
const SALES: Role = "SALES";

const OFFER = { offerId: 42, offerNumber: "OFF-2026-0042" };

const configListLink = () =>
  screen.queryByRole("link", { name: /Configurazioni/ });
const offerLink = () =>
  screen.queryByRole("link", { name: /Offerta OFF-2026-0042/ });

afterEach(cleanup);

describe("ConfigNavigationBar", () => {
  test("ENGINEER: configurations link only, never an offer link", () => {
    // ENGINEER has no offer access, so the page never passes an `offer`.
    render(
      <ConfigNavigationBar confId={7} activePage="config" role={ENGINEER} />,
    );

    expect(configListLink()).toHaveAttribute("href", "/configurazioni");
    expect(screen.queryByText(/Offerta/)).toBeNull();
  });

  test("ADMIN standalone config: configurations link only", () => {
    render(<ConfigNavigationBar confId={7} activePage="config" role={ADMIN} />);

    expect(configListLink()).toHaveAttribute("href", "/configurazioni");
    expect(screen.queryByText(/Offerta/)).toBeNull();
  });

  test("ADMIN offer config: both configurations and offer links", () => {
    render(
      <ConfigNavigationBar
        confId={7}
        activePage="config"
        role={ADMIN}
        offer={OFFER}
      />,
    );

    expect(configListLink()).toHaveAttribute("href", "/configurazioni");
    expect(offerLink()).toHaveAttribute("href", "/offerte/42");
  });

  test("SALES offer config: offer link only, no configurations link", () => {
    render(
      <ConfigNavigationBar
        confId={7}
        activePage="config"
        role={SALES}
        offer={OFFER}
      />,
    );

    expect(configListLink()).toBeNull();
    expect(offerLink()).toHaveAttribute("href", "/offerte/42");
  });
});
