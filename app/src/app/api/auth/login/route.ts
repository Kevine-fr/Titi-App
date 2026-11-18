import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { instrumenter } from "@/lib/metrics";

// Empreinte bcrypt jetable : comparée quand le compte n'existe pas, pour que
// la réponse prenne le même temps (~100 ms). Sans elle, une réponse
// instantanée trahissait qu'une adresse n'était pas un compte admin.
const EMPREINTE_FACTICE = bcrypt.hashSync("titi-compte-inexistant", 10);

export const runtime = "nodejs";

export const POST = instrumenter("/api/auth/login", async (req: Request) => {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.compare(password, EMPREINTE_FACTICE);
    // Même message qu'un mauvais mdp pour ne pas leak l'existence du compte
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const session = await getSession();
  session.adminId = user.id;
  session.adminEmail = user.email;
  await session.save();

  return NextResponse.json({ ok: true });
});
