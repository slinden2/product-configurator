"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { resetPassword } from "@/app/actions/auth";
import InputField from "@/components/input-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Form } from "@/components/ui/form";
import { MSG } from "@/lib/messages";
import {
  type NewPasswordSchema,
  newPassWordSchema,
} from "@/validation/auth-schema";

const ResetPasswordForm = () => {
  const form = useForm<NewPasswordSchema>({
    resolver: zodResolver(newPassWordSchema),
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSubmit = async (formData: NewPasswordSchema) => {
    const response = await resetPassword(formData, searchParams.get("code"));
    if (response.success) {
      toast.success(MSG.toast.passwordResetSuccess);
      router.push("/login");
    } else {
      toast.error(response.error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <InputField<NewPasswordSchema>
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
          autoComplete="new-password"
        />
        <InputField<NewPasswordSchema>
          name="confirmPassword"
          label="Conferma password"
          placeholder="Confermare la password"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton isSubmitting={form.formState.isSubmitting}>
          Resetta la password
        </SubmitButton>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
