import Link from "next/link";
import SignupForm from "@/app/(auth)/signup/signup-form";

const Signup = () => {
  return (
    <>
      <h2>Crea il tuo account</h2>
      <SignupForm />
      <p>
        Hai già un account?{" "}
        <Link href="/login" className="ml-2 font-bold">
          Accedi
        </Link>
      </p>
    </>
  );
};

export default Signup;
