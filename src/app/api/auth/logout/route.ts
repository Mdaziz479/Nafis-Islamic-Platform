import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await logoutUser();

    return NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
