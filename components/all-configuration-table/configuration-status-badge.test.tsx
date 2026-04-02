// @vitest-environment jsdom

import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { ConfigurationStatus, type ConfigurationStatusType } from "@/types";
import { STATUS_CONFIG } from "@/lib/status-config";

const testCases: [ConfigurationStatusType, string, string][] =
  ConfigurationStatus.map((status) => [
    status,
    STATUS_CONFIG[status].label,
    STATUS_CONFIG[status].color,
  ]);

describe("ConfigurationStatusBadge", () => {
  test.each(
    testCases,
  )("renders '%s' as '%s' with correct color", (status, expectedLabel, expectedColor) => {
    render(<ConfigurationStatusBadge status={status} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: expectedColor });
  });
});
