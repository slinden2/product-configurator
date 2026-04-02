"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { type AuthSchema, authSchema } from "@/validation/auth-schema";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/app/actions/auth";
import { toast } from "sonner";
import { MSG } from "@/lib/messages";

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
        <Button>
          {form.formState.isSubmitting ? (
            <Spinner className="text-primary-foreground" />
          ) : (
            "Resetta la password"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ForgotPasswordForm;
