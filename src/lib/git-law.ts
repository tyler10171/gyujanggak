// legalize-kr GitHub 연동 모듈
// https://github.com/legalize-kr/legalize-kr 저장소에서 법령 데이터를 읽어옴

import type { LawSearchResult, LawDetail, LawArticle, Amendment } from "./types";

const REPO = "legalize-kr/legalize-kr";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;
const API_BASE = `https://api.github.com/repos/${REPO}`;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

function githubHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

// --- Frontmatter 파싱 ---
interface LawMeta {
  제목: string;
  법령MST: string;
  법령ID: string;
  법령구분: string;
  소관부처: string[];
  공포일자: string;
  공포번호: string;
  시행일자: string;
  상태: string;
  출처: string;
}

function parseFrontmatter(content: string): { meta: Partial<LawMeta>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  let key = "";
  let inList = false;

  for (const line of match[1].split("\n")) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && inList && key) {
      if (!Array.isArray(meta[key])) meta[key] = [];
      (meta[key] as string[]).push(listItem[1].replace(/^['"]|['"]$/g, ""));
      continue;
    }
    const kv = line.match(/^([^\s:]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const val = kv[2].trim().replace(/^['"]|['"]$/g, "");
      if (val === "") {
        inList = true;
        meta[key] = [];
      } else {
        inList = false;
        meta[key] = val;
      }
    }
  }

  return { meta: meta as Partial<LawMeta>, body: match[2] };
}

// --- Markdown → 조문 파싱 ---
function parseArticles(body: string): LawArticle[] {
  const articles: LawArticle[] = [];
  // ##### 제N조 로 시작하는 부분을 분리
  const parts = body.split(/(?=^#{5}\s+제)/m);

  for (const part of parts) {
    const m = part.match(/^#{5}\s+(제\d+조(?:의\d+)?)\s*(?:\(([^)]+)\))?\s*\n([\s\S]*)/);
    if (m) {
      // 조문 내용에서 다음 헤더(#으로 시작)가 나오면 그 이전까지만 사용
      let content = m[3];
      const nextHeading = content.search(/^#{1,4}\s+/m);
      if (nextHeading > 0) {
        content = content.slice(0, nextHeading);
      }
      articles.push({
        articleNumber: m[1],
        articleTitle: m[2] || "",
        articleContent: content.trim(),
      });
    }
  }
  return articles;
}

// --- 유틸 ---
export function toDirName(lawName: string): string {
  return lawName.replace(/\s+/g, "");
}

function dateToCompact(d: string): string {
  // "2026-03-17" → "20260317"
  return d.replace(/-/g, "");
}

// GitHub raw content fetch
async function fetchRaw(path: string, ref = "main"): Promise<string | null> {
  // 한글 경로를 개별 세그먼트별로 인코딩
  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const url = `${RAW_BASE}/${ref}/${encodedPath}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.text();
}

// --- 검색: GitHub Tree API로 디렉토리 목록 가져오기 ---
let dirCache: string[] | null = null;
let dirCacheTime = 0;
const DIR_CACHE_TTL = 60 * 60 * 1000; // 1시간

async function getAllDirNames(): Promise<string[]> {
  if (dirCache && Date.now() - dirCacheTime < DIR_CACHE_TTL) return dirCache;

  // 1단계: main 트리에서 kr/ 의 sha를 찾음
  const rootRes = await fetch(`${API_BASE}/git/trees/main`, {
    headers: githubHeaders(),
    next: { revalidate: 3600 },
  });
  if (!rootRes.ok) return dirCache || [];
  const rootTree = await rootRes.json();
  const krEntry = (rootTree.tree as { path: string; sha: string }[]).find(
    (i) => i.path === "kr"
  );
  if (!krEntry) return dirCache || [];

  // 2단계: kr/ 트리에서 모든 디렉토리명 가져오기 (3000+개 전부)
  const krRes = await fetch(`${API_BASE}/git/trees/${krEntry.sha}`, {
    headers: githubHeaders(),
    next: { revalidate: 3600 },
  });
  if (!krRes.ok) return dirCache || [];
  const krTree = await krRes.json();

  dirCache = (krTree.tree as { path: string; type: string }[])
    .filter((i) => i.type === "tree")
    .map((i) => i.path);
  dirCacheTime = Date.now();
  return dirCache;
}

// 법령 검색 (디렉토리명 기반)
export async function searchLawsGit(
  query: string,
  page = 1,
  perPage = 20
): Promise<{ results: LawSearchResult[]; totalCount: number }> {
  const dirs = await getAllDirNames();
  const q = query.replace(/\s+/g, "").toLowerCase();

  // 디렉토리명에 쿼리가 포함된 것 필터링 (정확히 일치하는 것 우선)
  const matched = dirs
    .filter((d) => d.toLowerCase().includes(q))
    .sort((a, b) => {
      const aExact = a.toLowerCase() === q ? 0 : 1;
      const bExact = b.toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      // 짧은 이름 우선 (더 관련성 높음)
      return a.length - b.length;
    });
  const totalCount = matched.length;
  const sliced = matched.slice((page - 1) * perPage, page * perPage);

  // 상위 5개만 frontmatter를 읽고, 나머지는 디렉토리명으로 표시 (속도 최적화)
  const results: LawSearchResult[] = await Promise.all(
    sliced.map(async (dirName, idx) => {
      if (idx < 5) {
        // 상위 5개는 메타데이터 포함
        let content = await fetchRaw(`kr/${dirName}/법률.md`);
        let fileType = "법률";
        if (!content) {
          content = await fetchRaw(`kr/${dirName}/대통령령.md`);
          fileType = "대통령령";
        }
        if (content) {
          const { meta } = parseFrontmatter(content);
          return {
            lawId: dirName,
            lawName: meta.제목 || dirName,
            lawType: meta.법령구분 || fileType,
            department: Array.isArray(meta.소관부처)
              ? meta.소관부처.join(", ")
              : String(meta.소관부처 || ""),
            promulgationDate: dateToCompact(String(meta.공포일자 || "")),
            promulgationNumber: String(meta.공포번호 || ""),
            enforcementDate: dateToCompact(String(meta.시행일자 || "")),
          };
        }
      }
      return {
        lawId: dirName,
        lawName: dirName,
        lawType: "",
        department: "",
        promulgationDate: "",
        promulgationNumber: "",
        enforcementDate: "",
      };
    })
  );

  return { results, totalCount };
}

// --- 법령 본문 조회 ---
export async function getLawDetailGit(
  dirName: string,
  fileType = "법률"
): Promise<(LawDetail & { markdownBody: string; mst: string; department: string; source: string }) | null> {
  const content = await fetchRaw(`kr/${dirName}/${fileType}.md`);
  if (!content) return null;

  const { meta, body } = parseFrontmatter(content);
  const articles = parseArticles(body);

  return {
    lawId: dirName,
    lawName: meta.제목 || dirName,
    lawType: meta.법령구분 || fileType,
    articles,
    enforcementDate: dateToCompact(String(meta.시행일자 || "")),
    promulgationDate: dateToCompact(String(meta.공포일자 || "")),
    markdownBody: body,
    mst: String(meta.법령MST || ""),
    department: Array.isArray(meta.소관부처)
      ? meta.소관부처.join(", ")
      : String(meta.소관부처 || ""),
    source: meta.출처 || "",
  };
}

// --- 사용 가능한 파일 유형 목록 ---
export async function listLawFiles(dirName: string): Promise<string[]> {
  const url = `${API_BASE}/contents/kr/${encodeURIComponent(dirName)}`;
  const res = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const items = await res.json();
  return (items as { name: string }[])
    .filter((i) => i.name.endsWith(".md"))
    .map((i) => i.name.replace(".md", ""));
}

// --- 개정 연혁 (Git commits) ---
export async function getLawHistoryGit(
  dirName: string,
  fileType = "법률"
): Promise<Amendment[]> {
  const path = `kr/${dirName}/${fileType}.md`;
  const url = `${API_BASE}/commits?path=${encodeURIComponent(path)}&per_page=100`;
  const res = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const commits = await res.json();
  if (!Array.isArray(commits)) return [];

  return commits.map((c: {
    sha: string;
    commit: {
      message: string;
      author: { date: string };
    };
  }) => {
    const msg = c.commit.message;
    const subject = msg.split("\n")[0];

    // "법률: 민법 (일부개정)" → "일부개정"
    const typeMatch = subject.match(/\(([^)]+)\)$/);
    const amendmentType = typeMatch ? typeMatch[1] : "개정";

    // 커밋 본문에서 메타데이터 추출
    const dateMatch = msg.match(/공포일자:\s*(\S+)/);
    const numMatch = msg.match(/공포번호:\s*(\S+)/);
    const nameMatch = subject.match(/:\s*(.+?)\s*\(/);

    const date = dateMatch
      ? dateMatch[1].replace(/-/g, "")
      : c.commit.author.date.slice(0, 10).replace(/-/g, "");

    // 링크 추출
    const fullTextMatch = msg.match(/법령 전문:\s*(\S+)/);
    const amendTextMatch = msg.match(/제개정문:\s*(\S+)/);
    const compMatch = msg.match(/신구법비교:\s*(\S+)/);

    return {
      commitHash: c.sha,
      lawId: dirName,
      amendmentType,
      promulgationDate: date,
      promulgationNumber: numMatch ? numMatch[1] : "",
      enforcementDate: "",
      lawName: nameMatch ? nameMatch[1] : dirName,
      links: {
        fullText: fullTextMatch ? fullTextMatch[1] : undefined,
        amendment: amendTextMatch ? amendTextMatch[1] : undefined,
        comparison: compMatch ? compMatch[1] : undefined,
      },
    };
  });
}

// --- 특정 커밋 시점의 법령 조회 (비교용) ---
export async function getLawAtCommit(
  dirName: string,
  fileType: string,
  commitHash: string
): Promise<LawDetail | null> {
  const content = await fetchRaw(`kr/${dirName}/${fileType}.md`, commitHash);
  if (!content) return null;

  const { meta, body } = parseFrontmatter(content);
  const articles = parseArticles(body);

  return {
    lawId: dirName,
    lawName: meta.제목 || dirName,
    lawType: meta.법령구분 || fileType,
    articles,
    enforcementDate: dateToCompact(String(meta.시행일자 || "")),
    promulgationDate: dateToCompact(String(meta.공포일자 || "")),
  };
}
