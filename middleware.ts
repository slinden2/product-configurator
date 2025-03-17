import { withAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return withAuth(request);
}

export const config = {
  matcher: ["/configurations/:path*", "/users/:path*"],
};
