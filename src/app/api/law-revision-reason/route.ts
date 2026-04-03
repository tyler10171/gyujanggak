import { NextRequest, NextResponse } from "next/server";
import { getRevisionReason } from "@/lib/law-api";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "법령 ID가 필요합니다" }, { status: 400 });
  }

  try {
    const reason = await getRevisionReason(id);
    return NextResponse.json({ reason });
  } catch (error) {
    console.error("Revision reason error:", error);
    return NextResponse.json({ error: "개정이유 조회 실패" }, { status: 500 });
  }
}
