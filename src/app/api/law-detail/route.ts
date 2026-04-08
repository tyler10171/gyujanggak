import { NextRequest, NextResponse } from "next/server";
import { getLawDetailGit, getLawAtCommit, listLawFiles } from "@/lib/git-law";

export async function GET(request: NextRequest) {
  const dirName = request.nextUrl.searchParams.get("id") || "";
  const fileType = request.nextUrl.searchParams.get("type") || "법률";
  const commit = request.nextUrl.searchParams.get("commit") || "";

  if (!dirName) {
    return NextResponse.json({ error: "법령 ID가 필요합니다" }, { status: 400 });
  }

  try {
    let detail;
    if (commit) {
      detail = await getLawAtCommit(dirName, fileType, commit);
    } else {
      detail = await getLawDetailGit(dirName, fileType);
    }

    const files = await listLawFiles(dirName);
    return NextResponse.json({ detail, files });
  } catch (error) {
    console.error("Law detail error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
