import { NextRequest, NextResponse } from "next/server";
import { isValidEmailAddress, loginUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > 254 ||
    password.length > 1024 ||
    !isValidEmailAddress(email)
  ) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const user = await loginUser(email.trim(), password);

    return NextResponse.json(
      { user, message: "Login successful" },
      { status: 200 }
    );
  } catch (error) {
    const invalidCredentials = error instanceof Error && error.message === "Invalid credentials";
    return NextResponse.json(
      { error: invalidCredentials ? "Invalid credentials" : "Authentication is temporarily unavailable." },
      { status: invalidCredentials ? 401 : 503 }
    );
  }
}
