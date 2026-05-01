import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import dbConnect from "./lib/dbConnect";
import User from "./models/User";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                identifier: { label: "Email or Code", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                await dbConnect();

                // Allow login via Email OR Employee Code
                const user = await User.findOne({
                    $or: [
                        { email: credentials.identifier },
                        { employeeCode: credentials.identifier }
                    ]
                });

                if (!user) throw new Error("User not found");

                const isMatch = await bcrypt.compare(credentials.password as string, user.password);
                if (!isMatch) throw new Error("Invalid credentials");

                // Check if user is verified (OTP verification is now handled separately)
                if (!user.isVerified) {
                    throw new Error("Account not verified. Please complete OTP verification first.");
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    department: user.department,
                    employeeCode: user.employeeCode,
                    role: user.role || "faculty",
                    image: null
                };
            },
        }),
    ],
});