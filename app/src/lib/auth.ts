import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = {
  adminId?: string;
  adminEmail?: string;
};

function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_PASSWORD doit faire au moins 32 caractères. Génère-le avec : openssl rand -base64 32",
    );
  }
  return {
    password,
    cookieName: "fileapp_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

/** À utiliser dans les Server Components / Layouts admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session.adminId) {
    redirect("/admin/login");
  }
  return session;
}