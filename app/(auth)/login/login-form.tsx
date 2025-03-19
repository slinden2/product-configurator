"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { LoginFormData, loginSchema } from "@/validation/auth-schema";
import { signIn } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useUser } from "@/state/user-context";

const LoginForm = () => {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const router = useRouter();
  const { setUser } = useUser();

  const onSubmit = async (formData: LoginFormData) => {
    const response = await signIn(formData);
    if (response.status === "success") {
      router.push("/configurations");
      setUser(response.user);
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
        <Button>{form.formState.isSubmitting ? <Spinner /> : "Accedi"}</Button>
      </form>
    </Form>
  );
};

export default LoginForm;
