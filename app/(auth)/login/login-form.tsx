"use client";

import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/InputField";
import CheckboxField from "@/components/CheckboxField";
import { LoginFormData, loginSchema } from "@/validation/authSchema";
import { redirect } from "next/navigation";

const initialState = {
  success: "",
  apiError: "",
  errors: {
    email: "",
    password: "",
  },
};

const LoginForm = () => {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (formData: LoginFormData) => {
    const response = await login(formData);
    if (response.success) {
      redirect("/configurations");
    } else {
      console.error(response);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6">
        <InputField
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
        />
        <InputField
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
        />
        <CheckboxField name="rememberme" label="Ricordami" />
        <Button>{form.formState.isSubmitting ? <Spinner /> : "Accedi"}</Button>
      </form>
    </Form>
  );
};

export default LoginForm;
