import { NextRequest, NextResponse } from "next/server";
import { isValidEmailAddress, registerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }

  const { email, password, name } = body as Record<string, unknown>;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !normalizedName ||
    !email.trim() ||
    normalizedName.length > 120 ||
    email.length > 254 ||
    password.length > 1024 ||
    !isValidEmailAddress(email)
  ) {
    return NextResponse.json({ error: "Enter a valid name, email, and password." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const user = await registerUser(email.trim(), password, normalizedName);

    return NextResponse.json(
      { user, message: "Registration successful" },
      { status: 201 }
    );
  } catch (error) {
    const duplicateEmail = (error instanceof Error && error.message === "User already exists") ||
      (typeof error === "object" && error !== null && "code" in error && error.code === 11000);
    return NextResponse.json(
      { error: duplicateEmail ? "An account with this email already exists." : "Registration is temporarily unavailable." },
      { status: duplicateEmail ? 409 : 503 }
    );
  }
}
