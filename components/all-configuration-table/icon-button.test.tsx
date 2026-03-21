// @vitest-environment jsdom
import React from "react";
import { vi, describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- Imports ---

import IconButton from "@/components/all-configuration-table/icon-button";
import { Edit } from "lucide-react";

// --- Setup ---

afterEach(cleanup);

// --- Tests ---

describe("IconButton", () => {
  describe("as link (linkTo provided, not disabled)", () => {
    test("renders a link with correct href and aria-label", () => {
      render(
        <IconButton
          Icon={Edit}
          linkTo="/test-path"
          title="Modifica"
          variant="ghost"
          disabled={false}
        />
      );

      const link = screen.getByRole("link", { name: "Modifica" });
      expect(link).toHaveAttribute("href", "/test-path");
    });
  });

  describe("as button (no linkTo)", () => {
    test("renders a button element, not a link", () => {
      render(
        <IconButton
          Icon={Edit}
          title="Modifica"
          variant="ghost"
          disabled={false}
        />
      );

      expect(screen.getByRole("button", { name: "Modifica" })).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("disabled with linkTo", () => {
    test("renders as disabled button, not as link", () => {
      render(
        <IconButton
          Icon={Edit}
          linkTo="/test-path"
          title="Modifica"
          variant="ghost"
          disabled={true}
        />
      );

      const button = screen.getByRole("button", { name: "Modifica" });
      expect(button).toBeDisabled();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("onClick", () => {
    test("calls handler when clicked", async () => {
      const handleClick = vi.fn();

      render(
        <IconButton
          Icon={Edit}
          title="Elimina"
          variant="ghost"
          disabled={false}
          onClick={handleClick}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    test("does not call handler when disabled", async () => {
      const handleClick = vi.fn();

      render(
        <IconButton
          Icon={Edit}
          title="Elimina"
          variant="ghost"
          disabled={true}
          onClick={handleClick}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
