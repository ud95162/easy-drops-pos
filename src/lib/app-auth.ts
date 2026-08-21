import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

// Auth for storefront/app shoppers (AppUser). Separate from the POS cashier
// login. Uses JWT bearer tokens suitable for the mobile app.

const SECRET = process.env.AUTH_SECRET || "app-dev-secret-change-me";
const TOKEN_TTL = "30d";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Resolve the AppUser from a request's Authorization: Bearer <token> header. */
export async function getUserFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  return prisma.appUser.findUnique({ where: { id: userId } });
}

export function publicUser(u: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
}) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address };
}
