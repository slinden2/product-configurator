import React from "react";
import LoginForm from "@/app/(auth)/login/login-form";
import Link from "next/link";

const Login = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <h2>Accedi al tuo account</h2>
        <LoginForm />
        <p>
          Non hai ancora un account?{" "}
          <Link href="/signup" className="ml-2 font-bold">
            Registrati
          </Link>
        </p>
        <p>
          Hai dimenticato la password?{" "}
          <Link href="/recupera-password" className="ml-2 font-bold">
            Recupera la password
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
