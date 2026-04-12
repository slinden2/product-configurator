"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { signIn } from "@/app/actions/auth";
import InputField from "@/components/input-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { type LoginSchema, loginSchema } from "@/validation/auth-schema";

const LoginForm = () => {
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: LoginSchema) => {
    const response = await signIn(formData);
    if (response.success) {
      router.push("/configurazioni");
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
