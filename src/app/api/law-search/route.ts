import { NextRequest, NextResponse } from "next/server";
import { searchLaws } from "@/lib/law-api";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);

  if (!query.trim()) {
    return NextResponse.json({ results: [], totalCount: 0 });
  }

  try {
    const data = await searchLaws(query, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Law search error:", error);
    return NextResponse.json({ error: "검색 실패" }, { status: 500 });
  }
}
