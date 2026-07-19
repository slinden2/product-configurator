// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";
import { AsyncActionButton } from "@/components/shared/async-action-button";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("AsyncActionButton", () => {
  describe("without confirm", () => {
    test("runs the action and shows the success toast on click", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      render(
        <AsyncActionButton action={action} successMsg="Fatto.">
          Esegui
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Esegui" }));

      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(toast.success).toHaveBeenCalledWith("Fatto.");
    });

    test("shows the error toast when the action returns a failed result", async () => {
      const action = vi
        .fn()
        .mockResolvedValue({ success: false, error: "Boom" });
      render(
        <AsyncActionButton action={action} successMsg="Fatto.">
          Esegui
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Esegui" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Boom"));
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe("with confirm", () => {
    const confirm = {
      title: "Sei sicuro?",
      description: "Operazione irreversibile.",
    };

    test("opens the confirm dialog instead of running the action immediately", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      render(
        <AsyncActionButton action={action} confirm={confirm}>
          Elimina
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      expect(await screen.findByText("Sei sicuro?")).toBeInTheDocument();
      expect(action).not.toHaveBeenCalled();
    });

    test("runs the action after confirming, then closes the dialog", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      render(
        <AsyncActionButton
          action={action}
          confirm={confirm}
          successMsg="Fatto."
        >
          Elimina
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
      await userEvent.click(
        await screen.findByRole("button", { name: "Conferma" }),
      );

      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(toast.success).toHaveBeenCalledWith("Fatto.");
      await waitFor(() =>
        expect(screen.queryByText("Sei sicuro?")).not.toBeInTheDocument(),
      );
    });

    test("does not run the action when cancelled", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      render(
        <AsyncActionButton action={action} confirm={confirm}>
          Elimina
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
      await userEvent.click(
        await screen.findByRole("button", { name: "Annulla" }),
      );

      await waitFor(() =>
        expect(screen.queryByText("Sei sicuro?")).not.toBeInTheDocument(),
      );
      expect(action).not.toHaveBeenCalled();
    });

    test("honors custom confirm/cancel labels", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      render(
        <AsyncActionButton
          action={action}
          confirm={{
            ...confirm,
            confirmLabel: "Procedi",
            cancelLabel: "Indietro",
          }}
        >
          Elimina
        </AsyncActionButton>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      expect(
        await screen.findByRole("button", { name: "Procedi" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Indietro" }),
      ).toBeInTheDocument();
    });
  });
});
