import { NextResponse } from "next/server";

import { cockpitSessionCookie } from "@/lib/admin/cockpit-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/moderation", request.url));
  response.cookies.set({
    name: cockpitSessionCookie.name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
