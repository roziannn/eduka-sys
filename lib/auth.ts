import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
export const SESSION_COOKIE = "eduka_session";

// Menu dan button yang boleh dipakai akun ini. Dihitung sekali saat login,
// jadi perubahan hak akses baru berlaku setelah login ulang.
export type SessionSubMenu = { name: string; url: string; fns: string[] };
export type SessionMenu = {
  name: string;
  url: string;
  icon: string | null;
  subs: SessionSubMenu[];
};
export type SessionAccess = { menus: SessionMenu[] };

export type Session = {
  userId: string;
  email: string;
  role: string;
  access: SessionAccess;
};

// Batas cookie di browser sekitar 4096 byte. Lewat dari ini cookie diam-diam dibuang,
// jadi lebih baik gagal dengan pesan jelas daripada login yang tidak tersimpan.
const MAX_TOKEN_LENGTH = 3800;

export async function createSession(payload: Session) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  if (token.length > MAX_TOKEN_LENGTH) {
    throw new Error("Data hak akses terlalu besar untuk disimpan di sesi");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    // Sesi lama tanpa data akses dianggap tidak berlaku, supaya user login ulang
    if (!payload.access) return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}