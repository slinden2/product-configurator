// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import { useDerivedFieldReset } from "./use-derived-field-reset";

afterEach(cleanup);

interface TestForm {
  derived: number;
  other: boolean;
}

/**
 * Renders a component driving `useDerivedFieldReset`. `shouldReset` is read from
 * a mutable holder so a re-render can flip it. `isDirty` is read during render
 * so react-hook-form's formState proxy subscribes and the captured value stays
 * current across re-renders. The `derived` field is registered as a real input,
 * mirroring the forms where it is a rendered field.
 */
function renderHarness(initial: { derived: number; shouldReset: boolean }) {
  const holder = { shouldReset: initial.shouldReset };
  let getValues: () => TestForm = () => ({ derived: 0, other: false });
  let latestDirty = false;

  const Child = ({ shouldReset }: { shouldReset: boolean }) => {
    useDerivedFieldReset<TestForm>(shouldReset, [
      { name: "derived", value: 0 },
    ]);
    return null;
  };

  const Harness = () => {
    const form = useForm<TestForm>({
      defaultValues: { derived: initial.derived, other: false },
    });
    getValues = form.getValues;
    latestDirty = form.formState.isDirty; // read during render to subscribe

    return (
      <FormProvider {...form}>
        <input
          type="number"
          {...form.register("derived", { valueAsNumber: true })}
        />
        <Child shouldReset={holder.shouldReset} />
      </FormProvider>
    );
  };

  const utils = render(<Harness />);
  return {
    holder,
    getValues: () => getValues(),
    isDirty: () => latestDirty,
    rerender: () => utils.rerender(<Harness />),
  };
}

describe("useDerivedFieldReset", () => {
  test("normalizes a drifted field on mount when the condition holds", () => {
    const { getValues } = renderHarness({ derived: 5, shouldReset: true });

    expect(getValues().derived).toBe(0);
  });

  test("leaves the field untouched when the condition is false", () => {
    const { getValues, isDirty } = renderHarness({
      derived: 5,
      shouldReset: false,
    });

    expect(getValues().derived).toBe(5);
    expect(isDirty()).toBe(false);
  });

  test("resets the field and marks the form dirty when the condition flips to true", () => {
    const harness = renderHarness({ derived: 5, shouldReset: false });
    expect(harness.getValues().derived).toBe(5);

    harness.holder.shouldReset = true;
    harness.rerender();

    expect(harness.getValues().derived).toBe(0);
    expect(harness.isDirty()).toBe(true);
  });

  test("does not reset again while the condition stays true across re-renders", () => {
    const harness = renderHarness({ derived: 5, shouldReset: false });

    harness.holder.shouldReset = true;
    harness.rerender();
    expect(harness.getValues().derived).toBe(0);

    // A user edit the derived field back to a value, then an unrelated re-render:
    // the reset must not fire again (effect keyed on the condition, not identity).
    harness.rerender();
    expect(harness.getValues().derived).toBe(0);
  });
});
