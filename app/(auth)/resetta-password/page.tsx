import HeaderH2 from "@/components/HeaderH2";
import ResetPasswordForm from "@/app/(auth)/resetta-password/reset-password-form";

const ResetPassword = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <HeaderH2>Resetta la password</HeaderH2>
        <ResetPasswordForm />
      </div>
    </section>
  );
};

export default ResetPassword;
