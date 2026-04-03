// 법령 검색 결과
export interface LawSearchResult {
  lawId: string;
  lawName: string;
  lawType: string;
  department: string;
  promulgationDate: string;
  promulgationNumber: string;
  enforcementDate: string;
}

// 법령 본문
export interface LawDetail {
  lawId: string;
  lawName: string;
  lawType: string;
  articles: LawArticle[];
  enforcementDate: string;
  promulgationDate: string;
}

export interface LawArticle {
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

// 개정 연혁
export interface Amendment {
  lawId: string;
  amendmentType: string;
  promulgationDate: string;
  promulgationNumber: string;
  enforcementDate: string;
  lawName: string;
}

// 개정 이유
export interface RevisionReason {
  lawId: string;
  reason: string;
}

// 조문 비교
export interface ArticleComparison {
  articleNumber: string;
  oldContent: string;
  newContent: string;
  changeType: "added" | "removed" | "modified" | "unchanged";
}
