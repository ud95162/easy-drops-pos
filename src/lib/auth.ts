import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const COOKIE_NAME = "pos_session";
const SESSION_PAYLOAD = "authenticated";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to your environment.");
  }
  return secret;
}

/** Deterministic signed token proving a valid login. */
function sessionToken(): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(SESSION_PAYLOAD)
    .digest("hex");
}

/** Constant-time comparison to avoid timing leaks. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verify a password against POS_PASSWORD. */
export function checkPassword(password: string): boolean {
  const expected = process.env.POS_PASSWORD;
  if (!expected) {
    throw new Error("POS_PASSWORD is not set. Add it to your environment.");
  }
  return safeEqual(password, expected);
}

/** Set the login cookie (call after a successful password check). */
export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Clear the login cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** True if the current request carries a valid session cookie. */
export async function isLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return safeEqual(value, sessionToken());
}

/** Redirect to /login unless logged in. Use in protected layouts/actions. */
export async function requireAuth(): Promise<void> {
  if (!(await isLoggedIn())) {
    redirect("/login");
  }
}
