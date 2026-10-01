import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const SALT_ROUNDS = 10;
const SESSION_COOKIE = "sakinah_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export function isValidEmailAddress(value: string) {
  const email = value.trim();
  const atIndex = email.indexOf("@");
  const finalDotIndex = email.lastIndexOf(".");
  return email.length <= 254 &&
    !/\s/.test(email) &&
    atIndex > 0 &&
    atIndex === email.lastIndexOf("@") &&
    finalDotIndex > atIndex + 1 &&
    finalDotIndex < email.length - 1;
}

function getSessionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Authentication is not configured.");
  return new TextEncoder().encode(secret);
}

async function createSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionKey());
}

async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
) {
  await connectToDatabase();
  
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name,
  });

  await setSession(user._id.toString());
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}

export async function loginUser(email: string, password: string) {
  await connectToDatabase();
  
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  await setSession(user._id.toString());

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    userId = payload.sub ?? "";
  } catch {
    return null;
  }
  if (!isValidObjectId(userId)) return null;

  await connectToDatabase();
  const user = await User.findById(userId);
  
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}
