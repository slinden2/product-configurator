"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/input-field";
import { SignupSchema, signupSchema } from "@/validation/auth-schema";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/actions/auth";

const SignupForm = () => {
  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: SignupSchema) => {
    const response = await signUp(formData);
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
        <InputField<SignupSchema>
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
        />
        <InputField<SignupSchema>
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
        />
        <InputField<SignupSchema>
          name="confirmPassword"
          label="Password"
          placeholder="Inserire la password"
          type="password"
        />
        <Button>
          {form.formState.isSubmitting ? <Spinner /> : "Registra"}
        </Button>
      </form>
    </Form>
  );
};

export default SignupForm;
