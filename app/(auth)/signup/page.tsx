import Link from "next/link";
import SignupForm from "@/app/(auth)/signup/signup-form";

const Signup = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <h2>Crea il tuo account</h2>
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
