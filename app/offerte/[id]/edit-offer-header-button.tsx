"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateOfferHeaderAction } from "@/app/actions/offer-header-actions";
import InputField from "@/components/input-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { MSG } from "@/lib/messages";
import {
  type OfferHeaderInput,
  offerHeaderInputSchema,
} from "@/validation/offer/offer-schema";

interface EditOfferHeaderButtonProps {
  offerId: number;
  customerName: string;
  customerAddress: string | null;
  customerEmail: string | null;
  /** Working revision has left DRAFT — already-sent documents will re-export differently. */
  revisionSent: boolean;
}

/**
 * Corrects the offer's customer header. Available at any lifecycle stage — the header
 * is offer-level, not revision-scoped — so this is a plain content dialog rather than
 * a gated inline editor like the commercial-terms card.
 */
export default function EditOfferHeaderButton({
  offerId,
  customerName,
  customerAddress,
  customerEmail,
  revisionSent,
}: EditOfferHeaderButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // The DB stores blank optional fields as NULL; the form works in empty strings.
  const currentValues: OfferHeaderInput = {
    customer_name: customerName,
    customer_address: customerAddress ?? "",
    customer_email: customerEmail ?? "",
  };

  const form = useForm<OfferHeaderInput>({
    resolver: zodResolver(offerHeaderInputSchema),
    defaultValues: currentValues,
  });

  const handleOpenChange = (next: boolean) => {
    // Re-seed from the server values on open, so a cancelled edit leaves no residue.
    if (next) form.reset(currentValues);
    setOpen(next);
  };

  const onSubmit = async (formData: OfferHeaderInput) => {
    const response = await updateOfferHeaderAction(offerId, formData);
    if (response.success) {
      toast.success(MSG.toast.offerHeaderUpdated);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(response.error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Modifica dati cliente"
        onClick={() => handleOpenChange(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica dati cliente</DialogTitle>
            <DialogDescription>
              {revisionSent
                ? MSG.offer.headerEditSentWarning
                : "Correggi il nome, l'indirizzo o l'email del cliente."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <InputField<OfferHeaderInput>
                name="customer_name"
                label="Nome cliente"
                placeholder="Inserire il nome del cliente"
              />
              <InputField<OfferHeaderInput>
                name="customer_address"
                label="Indirizzo cliente"
                placeholder="Inserire l'indirizzo (facoltativo)"
              />
              <InputField<OfferHeaderInput>
                name="customer_email"
                label="Email cliente"
                placeholder="Inserire l'email (facoltativo)"
                type="email"
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Annulla
                </Button>
                <SubmitButton isSubmitting={form.formState.isSubmitting}>
                  Salva
                </SubmitButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
