"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { insertOfferAction } from "@/app/actions/insert-offer-action";
import BackButton from "@/components/back-button";
import InputField from "@/components/input-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Form } from "@/components/ui/form";
import { MSG } from "@/lib/messages";
import {
  type OfferHeaderInput,
  offerHeaderInputSchema,
} from "@/validation/offer/offer-schema";

const OfferForm = () => {
  const form = useForm<OfferHeaderInput>({
    resolver: zodResolver(offerHeaderInputSchema),
    defaultValues: {
      customer_name: "",
      customer_address: "",
      customer_email: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (formData: OfferHeaderInput) => {
    const response = await insertOfferAction(formData);
    if (response.success) {
      toast.success(MSG.toast.offerCreated);
      router.push(`/offerte/${response.id}`);
    } else {
      toast.error(response.error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 max-w-xl"
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
        <div className="flex gap-4">
          <BackButton fallbackPath="/offerte" />
          <SubmitButton
            isSubmitting={form.formState.isSubmitting}
            className="ml-auto"
          >
            Crea offerta
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default OfferForm;
