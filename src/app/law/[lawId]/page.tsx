"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, GitCompareArrows } from "lucide-react";
import type { LawDetail } from "@/lib/types";

function formatDate(date: string): string {
  if (!date || date.length !== 8) return date;
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

export default function LawDetailPage() {
  const params = useParams();
  const lawId = params.lawId as string;
  const [law, setLaw] = useState<LawDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/law-detail?id=${lawId}`)
      .then((r) => r.json())
      .then((data) => setLaw(data.detail))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lawId]);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">법령 조회 중...</div>;
  }

  if (!law) {
    return <div className="text-slate-400 py-12 text-center">법령을 찾을 수 없습니다</div>;
  }

  return (
    <div className="max-w-4xl">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          검색으로 돌아가기
        </Link>
      </div>

      {/* 법령 헤더 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
            {law.lawType}
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-3">{law.lawName}</h2>
        <div className="flex gap-4 text-sm text-slate-500">
          <span>공포일: {formatDate(law.promulgationDate)}</span>
          <span>시행일: {formatDate(law.enforcementDate)}</span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
          <Link
            href={`/law/${lawId}/history`}
            className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Clock size={16} />
            개정 연혁 보기
          </Link>
          <Link
            href={`/law/${lawId}/compare`}
            className="flex items-center gap-2 text-sm bg-slate-50 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <GitCompareArrows size={16} />
            조문 비교하기
          </Link>
        </div>
      </div>

      {/* 법령 본문 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold mb-4 text-lg">법령 본문</h3>

        {law.articles.length > 0 ? (
          <div className="space-y-6">
            {law.articles.map((article, i) => (
              <div key={i} className="border-b border-slate-50 pb-4 last:border-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-bold text-indigo-600 whitespace-nowrap">
                    {article.articleNumber}
                  </span>
                  {article.articleTitle && (
                    <span className="font-semibold text-sm">
                      ({article.articleTitle})
                    </span>
                  )}
                </div>
                <p className="text-sm leading-[1.8] text-slate-700 whitespace-pre-wrap pl-4">
                  {article.articleContent}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            법령 본문을 불러올 수 없습니다. API 인증키를 확인해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
