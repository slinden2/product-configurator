// @vitest-environment jsdom
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { ConfigurationStatusType } from "@/types";

describe("ConfigurationStatusBadge", () => {
  test.each<[ConfigurationStatusType, string, string, string]>([
    ["DRAFT", "Bozza", "bg-slate-400", "hover:bg-slate-400"],
    ["OPEN", "Aperto", "bg-green-400", "hover:bg-green-400"],
    ["LOCKED", "Bloccato", "bg-blue-400", "hover:bg-blue-400"],
    ["CLOSED", "Chiuso", "bg-rose-400", "hover:bg-rose-400"],
  ])(
    "renders '%s' as '%s' with correct classes",
    (status, expectedLabel, expectedBgClass, expectedHoverClass) => {
      render(<ConfigurationStatusBadge status={status} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedBgClass);
      expect(badge).toHaveClass(expectedHoverClass);
    }
  );
});
