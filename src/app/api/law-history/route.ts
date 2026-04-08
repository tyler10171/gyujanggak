import { NextRequest, NextResponse } from "next/server";
import { getLawHistoryGit } from "@/lib/git-law";

export async function GET(request: NextRequest) {
  const dirName = request.nextUrl.searchParams.get("id") || "";
  const fileType = request.nextUrl.searchParams.get("type") || "법률";

  if (!dirName) {
    return NextResponse.json({ error: "법령 ID가 필요합니다" }, { status: 400 });
  }

  try {
    const amendments = await getLawHistoryGit(dirName, fileType);
    return NextResponse.json({ amendments });
  } catch (error) {
    console.error("Law history error:", error);
    return NextResponse.json({ error: "연혁 조회 실패" }, { status: 500 });
  }
}
