import { redirect } from "next/navigation";
import { getUserSession } from "@/app/actions/auth";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const response = await getUserSession();

  if (response?.data?.user) {
    redirect("/");
  }

  return <>{children}</>;
}
