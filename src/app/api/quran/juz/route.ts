import { getJuzService } from "@/services/quran/juz-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getJuzService().listJuzs();
  return Response.json(result, { status: result.status === "success" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}