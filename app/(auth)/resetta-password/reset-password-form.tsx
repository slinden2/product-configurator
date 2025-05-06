"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { NewPasswordSchema, newPassWordSchema } from "@/validation/auth-schema";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";

const ResetPasswordForm = () => {
  const form = useForm<NewPasswordSchema>({
    resolver: zodResolver(newPassWordSchema),
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSubmit = async (formData: NewPasswordSchema) => {
    const response = await resetPassword(formData, searchParams.get("code"));
    if (response.status === "success") {
      router.push("/login");
    } else {
      console.error(response);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6">
        <InputField<NewPasswordSchema>
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
        />
        <InputField<NewPasswordSchema>
          name="confirmPassword"
          label="Password"
          placeholder="Inserire la password"
          type="password"
        />
        <Button>
          {form.formState.isSubmitting ? <Spinner /> : "Resetta la password"}
        </Button>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
