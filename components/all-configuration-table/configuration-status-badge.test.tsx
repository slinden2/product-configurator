// @vitest-environment jsdom
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { ConfigurationStatus, ConfigurationStatusType } from "@/types";
import { STATUS_CONFIG } from "@/lib/status-config";

const testCases: [ConfigurationStatusType, string, string][] =
  ConfigurationStatus.map((status) => [
    status,
    STATUS_CONFIG[status].label,
    STATUS_CONFIG[status].bgClass,
  ]);

describe("ConfigurationStatusBadge", () => {
  test.each(testCases)(
    "renders '%s' as '%s' with correct classes",
    (status, expectedLabel, expectedBgClass) => {
      render(<ConfigurationStatusBadge status={status} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedBgClass);
      expect(badge).toHaveClass(`hover:${expectedBgClass}`);
    }
  );
});
