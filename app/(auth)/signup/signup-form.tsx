"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { signUp } from "@/app/actions/auth";
import InputField from "@/components/input-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { type SignupSchema, signupSchema } from "@/validation/auth-schema";

const SignupForm = () => {
  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
  });
  const router = useRouter();

  const onSubmit = async (formData: SignupSchema) => {
    const response = await signUp(formData);
    if (response.success) {
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
        <InputField<SignupSchema>
          name="email"
          label="Email"
          placeholder="Inserire la email"
          type="email"
          autoComplete="email"
        />
        <InputField<SignupSchema>
          name="password"
          label="Password"
          placeholder="Inserire la password"
          type="password"
          autoComplete="new-password"
        />
        <InputField<SignupSchema>
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
            "Registra"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SignupForm;
