import { NextRequest, NextResponse } from "next/server";
import { getLawHistory } from "@/lib/law-api";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "법령 ID가 필요합니다" }, { status: 400 });
  }

  try {
    const amendments = await getLawHistory(id);
    return NextResponse.json({ amendments });
  } catch (error) {
    console.error("Law history error:", error);
    return NextResponse.json({ error: "연혁 조회 실패" }, { status: 500 });
  }
}
