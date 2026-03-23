"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { LoginSchema, loginSchema } from "@/validation/auth-schema";
import { signIn } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LoginForm = () => {
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: LoginSchema) => {
    const response = await signIn(formData);
    if (response.success) {
      router.push("/configurations");
    } else {
      toast.error(response.error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6">
        <InputField<LoginSchema>
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
          autoComplete="email"
        />
        <InputField<LoginSchema>
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
          autoComplete="current-password"
        />
        <Button>
          {form.formState.isSubmitting ? (
            <Spinner className="text-primary-foreground" />
          ) : (
            "Accedi"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
