import HeaderH2 from "@/components/HeaderH2";
import React from "react";
import SignupForm from "@/app/(auth)/signup/signup-form";
import Link from "next/link";

const Signup = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <HeaderH2>Crea il tuo account</HeaderH2>
        <SignupForm />
        <p>
          Hai già un account?{" "}
          <Link href="/login" className="ml-2 font-bold">
            Accedi
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Signup;
