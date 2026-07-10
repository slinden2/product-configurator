import ResetPasswordForm from "@/app/reimposta-password/reset-password-form";

// Deliberately outside the (auth) route group: that layout redirects any
// authenticated user to "/", which would strip the recovery "?code=" before an
// already-logged-in user could complete a reset. This route stays reachable
// while logged in. The password-reset middleware allow-list already covers it.
const ResetPassword = () => {
  return (
    <section className="flex h-screen justify-center">
      <div className="w-2/3 flex flex-col gap-4">
        <h2>Reimposta la password</h2>
        <ResetPasswordForm />
      </div>
    </section>
  );
};

export default ResetPassword;
