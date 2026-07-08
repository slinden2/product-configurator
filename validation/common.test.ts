import { describe, expect, test } from "vitest";
import { z } from "zod";
import { generateSelectOptionsFromZodEnum } from "@/validation/common";

const Fruit = z.enum(["APPLE", "PEAR", "PLUM"]);

describe("generateSelectOptionsFromZodEnum", () => {
  test("maps every enum value to its keyed label, in enum order", () => {
    const options = generateSelectOptionsFromZodEnum(Fruit, {
      APPLE: "Mela",
      PEAR: "Pera",
      PLUM: "Prugna",
    });

    expect(options).toEqual([
      { value: "APPLE", label: "Mela" },
      { value: "PEAR", label: "Pera" },
      { value: "PLUM", label: "Prugna" },
    ]);
  });

  test("labels are keyed, not positional: label order in the map is irrelevant", () => {
    const options = generateSelectOptionsFromZodEnum(Fruit, {
      PLUM: "Prugna",
      APPLE: "Mela",
      PEAR: "Pera",
    });

    // Output order follows the enum definition; each value keeps its own label
    // regardless of the order keys appear in the label map.
    expect(options).toEqual([
      { value: "APPLE", label: "Mela" },
      { value: "PEAR", label: "Pera" },
      { value: "PLUM", label: "Prugna" },
    ]);
  });
});
