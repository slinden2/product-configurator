"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { AuthSchema, authSchema } from "@/validation/auth-schema";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/app/actions/auth";

const ForgotPasswordForm = () => {
  const form = useForm<AuthSchema>({
    resolver: zodResolver(authSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: AuthSchema) => {
    const response = await forgotPassword(formData);
    if (response.status === "success") {
      alert("Email per resettare la password inviata.");
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
        <InputField<AuthSchema>
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
        />
        <Button>
          {form.formState.isSubmitting ? <Spinner /> : "Resetta la password"}
        </Button>
      </form>
    </Form>
  );
};

export default ForgotPasswordForm;
