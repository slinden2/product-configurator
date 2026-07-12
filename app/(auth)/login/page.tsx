import Link from "next/link";
import LoginForm from "@/app/(auth)/login/login-form";

const Login = () => {
  return (
    <>
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
    </>
  );
};

export default Login;
