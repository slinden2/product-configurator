"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { forgotPassword } from "@/app/actions/auth";
import InputField from "@/components/input-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Form } from "@/components/ui/form";
import { MSG } from "@/lib/messages";
import { type AuthSchema, authSchema } from "@/validation/auth-schema";

const ForgotPasswordForm = () => {
  const form = useForm<AuthSchema>({
    resolver: zodResolver(authSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: AuthSchema) => {
    const response = await forgotPassword(formData);
    if (response.success) {
      toast.success(MSG.toast.passwordResetEmailSent);
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
        <InputField<AuthSchema>
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
          autoComplete="email"
        />
        <SubmitButton isSubmitting={form.formState.isSubmitting}>
          Resetta la password
        </SubmitButton>
      </form>
    </Form>
  );
};

export default ForgotPasswordForm;
