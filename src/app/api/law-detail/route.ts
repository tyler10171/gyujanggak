import { NextRequest, NextResponse } from "next/server";
import { getLawDetail } from "@/lib/law-api";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "법령 ID가 필요합니다" }, { status: 400 });
  }

  try {
    const detail = await getLawDetail(id);
    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Law detail error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
