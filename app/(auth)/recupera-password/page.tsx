import Link from "next/link";
import ForgotPasswordForm from "@/app/(auth)/recupera-password/forgot-password-form";

const ForgotPassword = () => {
  return (
    <>
      <h2>Recupera la password</h2>
      <ForgotPasswordForm />
      <p>
        Accedi al tuo account{" "}
        <Link href="/login" className="ml-2 font-bold">
          Accedi
        </Link>
      </p>
    </>
  );
};

export default ForgotPassword;
