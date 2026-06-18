// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { STATUS_CONFIG } from "@/lib/status-config";
import { ConfigurationStatus, type ConfigurationStatusType } from "@/types";

const testCases: [ConfigurationStatusType, string, string][] =
  ConfigurationStatus.map((status) => [
    status,
    STATUS_CONFIG[status].label,
    STATUS_CONFIG[status].color,
  ]);

afterEach(cleanup);

describe("ConfigurationStatusBadge", () => {
  test.each(
    testCases,
  )("renders '%s' as '%s' with correct color", (status, expectedLabel, expectedColor) => {
    render(<ConfigurationStatusBadge status={status} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: expectedColor });
  });

  test("omits the status icon by default", () => {
    render(<ConfigurationStatusBadge status="DRAFT" />);

    const badge = screen.getByText(STATUS_CONFIG.DRAFT.label);
    expect(badge.querySelector("svg")).toBeNull();
  });

  test("renders the status icon when showIcon is set", () => {
    render(<ConfigurationStatusBadge status="DRAFT" showIcon />);

    const badge = screen.getByText(STATUS_CONFIG.DRAFT.label);
    expect(badge.querySelector("svg")).toBeInTheDocument();
  });
});
