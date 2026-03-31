import { waterTankSchema } from "@/validation/water-tank-schema";
import { describe, test, expect } from "vitest";

describe("waterTankSchema", () => {
  describe("Type requirement", () => {
    test("should fail when type is undefined", () => {
      const result = waterTankSchema.safeParse({
        type: undefined,
        outlet_w_valve_qty: 1,
        outlet_no_valve_qty: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const typeError = result.error.issues.find(
          (issue) => issue.path[0] === "type",
        );
        expect(typeError).toBeDefined();
      }
    });

    test.each([
      "L2000",
      "L2000_JOLLY",
      "L2500",
      "L4500",
    ])("should pass with valid type '%s'", (type) => {
      expect(() =>
        waterTankSchema.parse({
          type,
          outlet_w_valve_qty: 1,
          outlet_no_valve_qty: 0,
        }),
      ).not.toThrow();
    });
  });

  describe("Outlet minimum requirement (at least 1 total)", () => {
    test("should fail when all outlets are 0", () => {
      const result = waterTankSchema.safeParse({
        type: "L2000",
        outlet_w_valve_qty: 0,
        outlet_no_valve_qty: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const outletErrors = result.error.issues.filter((issue) =>
          String(issue.path[0]).startsWith("outlet"),
        );
        expect(outletErrors.length).toBeGreaterThan(0);
        expect(outletErrors[0].message).toBe("Inserisci almeno una uscita.");
      }
    });

    test("should pass when outlet_w_valve_qty is 1", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2500",
          outlet_w_valve_qty: 1,
          outlet_no_valve_qty: 0,
        }),
      ).not.toThrow();
    });

    test("should pass when outlet_no_valve_qty is 1", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L4500",
          outlet_w_valve_qty: 0,
          outlet_no_valve_qty: 1,
        }),
      ).not.toThrow();
    });

    test("should pass when total outlets sum to more than 1", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2000_JOLLY",
          outlet_w_valve_qty: 2,
          outlet_no_valve_qty: 2,
        }),
      ).not.toThrow();
    });
  });

  describe("Quantity limits (max 2 per field)", () => {
    test("should fail when outlet_w_valve_qty exceeds max of 2", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2000",
          outlet_w_valve_qty: 3,
          outlet_no_valve_qty: 0,
        }),
      ).toThrow();
    });

    test("should fail when inlet_w_float_qty exceeds max of 2", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2000",
          inlet_w_float_qty: 3,
          outlet_w_valve_qty: 1,
        }),
      ).toThrow();
    });

    test("should fail when inlet_no_float_qty is negative", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2000",
          inlet_no_float_qty: -1,
          outlet_w_valve_qty: 1,
        }),
      ).toThrow();
    });
  });

  describe("has_blower flag", () => {
    test("should pass with has_blower true", () => {
      expect(() =>
        waterTankSchema.parse({
          type: "L2000",
          outlet_w_valve_qty: 1,
          has_blower: true,
        }),
      ).not.toThrow();
    });

    test("should default has_blower to false", () => {
      const result = waterTankSchema.parse({
        type: "L2000",
        outlet_w_valve_qty: 1,
      });
      expect(result.has_blower).toBe(false);
    });
  });
});
