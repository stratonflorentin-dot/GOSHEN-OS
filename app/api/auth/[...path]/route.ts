import { auth } from "@/lib/auth/auth";

// Better Auth exposes a single request handler for all auth routes.
export const GET = auth.handler;
export const POST = auth.handler;
