import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/login", "/verify-otp", "/change-password"];
const adminRoutes = ["/hod"];

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const token = req.auth;

    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        if (token && pathname.startsWith("/login")) {
            const role = (token as any).role as string;
            const redirectUrl = role === "admin" ? "/hod/dashboard" : "/dashboard";
            return NextResponse.redirect(new URL(redirectUrl, req.url));
        }
        return NextResponse.next();
    }

    if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = (token as any).role as string;
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
        if (role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|logo.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
