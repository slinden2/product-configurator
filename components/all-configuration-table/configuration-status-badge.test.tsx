// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { STATUS_CONFIG } from "@/lib/status-config";
import { ConfigurationStatus, type ConfigurationStatusType } from "@/types";

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
