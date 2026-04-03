import { XMLParser } from "fast-xml-parser";
import type {
  LawSearchResult,
  LawDetail,
  LawArticle,
  Amendment,
} from "./types";

const LAW_API_OC = process.env.LAW_API_OC || "";
const BASE_URL = "https://www.law.go.kr/DRF";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) =>
    ["law", "조문단위", "개정문", "항", "호"].includes(name),
});

function parseXml(text: string) {
  return xmlParser.parse(text);
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "#text" in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>)["#text"]);
  }
  return String(val);
}

// 법령 검색
export async function searchLaws(
  query: string,
  page: number = 1
): Promise<{ results: LawSearchResult[]; totalCount: number }> {
  const url = `${BASE_URL}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=XML&query=${encodeURIComponent(query)}&display=20&page=${page}`;

  const res = await fetch(url);
  const text = await res.text();
  const parsed = parseXml(text);

  const root = parsed?.LawSearch || parsed?.lawSearch || parsed;
  const totalCount = parseInt(toStr(root?.totalCnt) || "0", 10);

  let laws = root?.law || [];
  if (!Array.isArray(laws)) laws = laws ? [laws] : [];

  const results: LawSearchResult[] = laws.map(
    (item: Record<string, unknown>) => ({
      lawId: toStr(item["법령일련번호"]),
      lawName: toStr(item["법령명한글"]),
      lawType: toStr(item["법령구분명"]),
      department: toStr(item["소관부처명"]),
      promulgationDate: toStr(item["공포일자"]),
      promulgationNumber: toStr(item["공포번호"]),
      enforcementDate: toStr(item["시행일자"]),
    })
  );

  return { results, totalCount };
}

// 법령 본문 조회
export async function getLawDetail(
  lawId: string
): Promise<LawDetail | null> {
  const url = `${BASE_URL}/lawService.do?OC=${LAW_API_OC}&target=law&type=XML&MST=${lawId}`;

  const res = await fetch(url);
  const text = await res.text();
  if (!text.trim()) return null;
  const parsed = parseXml(text);

  const root = parsed?.법령 || parsed?.Law || parsed;
  if (!root) return null;

  const info = root?.기본정보 || {};

  // 조문 파싱 - 조문여부가 "조문"인 것만 (전문, 편, 장, 절 제외)
  const articleList = root?.조문?.조문단위 || [];
  const rawArticles = Array.isArray(articleList) ? articleList : articleList ? [articleList] : [];

  const articles: LawArticle[] = rawArticles
    .filter((a: Record<string, unknown>) => toStr(a["조문여부"]) === "조문")
    .map((a: Record<string, unknown>) => {
      const num = toStr(a["조문번호"]);
      return {
        articleNumber: `제${num}조`,
        articleTitle: toStr(a["조문제목"]),
        articleContent: toStr(a["조문내용"]).trim(),
      };
    });

  return {
    lawId,
    lawName: toStr(info["법령명_한글"]) || toStr(root["법령명"]) || "",
    lawType: toStr(info["법종구분"]) || "",
    articles,
    enforcementDate: toStr(info["시행일자"]) || "",
    promulgationDate: toStr(info["공포일자"]) || "",
  };
}

// 개정 연혁 조회 - 조문 내 개정 날짜를 추출하여 타임라인 구성
export async function getLawHistory(
  lawId: string
): Promise<Amendment[]> {
  // 먼저 법령 본문에서 기본정보와 조문 내 개정 이력 추출
  const url = `${BASE_URL}/lawService.do?OC=${LAW_API_OC}&target=law&type=XML&MST=${lawId}`;

  const res = await fetch(url);
  const text = await res.text();
  if (!text.trim()) return [];

  const parsed = parseXml(text);
  const root = parsed?.법령 || parsed?.Law || parsed;
  if (!root) return [];

  const info = root?.기본정보 || {};
  const lawName = toStr(info["법령명_한글"]) || "";

  // 조문에서 <개정 YYYY.M.D> 패턴 추출
  const amendmentDates = new Map<string, Set<string>>();
  const articleList = root?.조문?.조문단위 || [];
  const rawArticles = Array.isArray(articleList) ? articleList : articleList ? [articleList] : [];

  for (const a of rawArticles) {
    const content = toStr(a["조문내용"]);
    // 패턴: <개정 2005.3.31>, [전문개정 2011.3.7], [제목개정 2022.12.27]
    const matches = content.matchAll(/(?:<|[\[【])(?:개정|전문개정|제목개정|신설)\s*(\d{4}\.\d{1,2}\.\d{1,2})(?:>|[\]】])/g);
    for (const m of matches) {
      const date = m[1];
      const type = content.includes("전문개정") && m[0].includes("전문개정")
        ? "전문개정"
        : content.includes("제목개정") && m[0].includes("제목개정")
          ? "제목개정"
          : content.includes("신설") && m[0].includes("신설")
            ? "신설"
            : "일부개정";
      if (!amendmentDates.has(date)) amendmentDates.set(date, new Set());
      amendmentDates.get(date)!.add(type);
    }
  }

  // 현행 법령 정보도 추가
  const currentDate = toStr(info["공포일자"]);
  const currentType = toStr(info["제개정구분"]) || "일부개정";
  if (currentDate) {
    const formattedDate = `${currentDate.slice(0, 4)}.${parseInt(currentDate.slice(4, 6))}.${parseInt(currentDate.slice(6, 8))}`;
    if (!amendmentDates.has(formattedDate)) amendmentDates.set(formattedDate, new Set());
    amendmentDates.get(formattedDate)!.add(currentType);
  }

  // 날짜순 정렬 (최신순)
  const amendments: Amendment[] = Array.from(amendmentDates.entries())
    .sort(([a], [b]) => {
      const da = new Date(a.replace(/\./g, "-"));
      const db = new Date(b.replace(/\./g, "-"));
      return db.getTime() - da.getTime();
    })
    .map(([date, types]) => {
      const dateNorm = date.replace(/\./g, "").padEnd(8, "0");
      return {
        lawId,
        amendmentType: Array.from(types).join(", "),
        promulgationDate: dateNorm.length >= 8
          ? dateNorm.slice(0, 8)
          : dateNorm,
        promulgationNumber: "",
        enforcementDate: "",
        lawName,
      };
    });

  return amendments;
}

// 개정 이유 조회 - 법령 본문 내 <제개정이유> 태그에서 추출
export async function getRevisionReason(
  lawId: string
): Promise<string> {
  const url = `${BASE_URL}/lawService.do?OC=${LAW_API_OC}&target=law&type=XML&MST=${lawId}`;

  const res = await fetch(url);
  const text = await res.text();
  if (!text.trim()) return "개정 이유 정보가 없습니다.";

  // CDATA 내용을 합쳐서 텍스트 추출
  const reasonMatch = text.match(/<제개정이유내용>([\s\S]*?)<\/제개정이유내용>/);
  if (!reasonMatch) return "개정 이유 정보가 없습니다.";

  const reasonRaw = reasonMatch[1];
  // CDATA 블록에서 텍스트만 추출
  const cdataContents = [...reasonRaw.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
    .map((m) => m[1])
    .join("")
    .trim();

  return cdataContents || "개정 이유 정보가 없습니다.";
}
