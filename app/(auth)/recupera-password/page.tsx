import HeaderH2 from "@/components/HeaderH2";
import React from "react";
import Link from "next/link";
import ForgotPasswordForm from "@/app/(auth)/recupera-password/forgot-password-form";

const Signup = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <HeaderH2>Resetta la password</HeaderH2>
        <ForgotPasswordForm />
        <p>
          Accedi al tuo account{" "}
          <Link href="/login" className="ml-2 font-bold">
            Accedi
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Signup;
