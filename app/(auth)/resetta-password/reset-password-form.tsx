"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { type NewPasswordSchema, newPassWordSchema } from "@/validation/auth-schema";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";
import { toast } from "sonner";
import { MSG } from "@/lib/messages";

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

export default ResetPasswordForm;
