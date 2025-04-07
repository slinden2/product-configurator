import ResetPasswordForm from "@/app/(auth)/resetta-password/reset-password-form";

const ResetPassword = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <h2>Resetta la password</h2>
        <ResetPasswordForm />
      </div>
    </section>
  );
};

export default ResetPassword;
