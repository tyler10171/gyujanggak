"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, GitCompareArrows, ExternalLink } from "lucide-react";
import type { LawDetail } from "@/lib/types";

function formatDate(date: string): string {
  if (!date || date.length !== 8) return date;
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

interface ExtendedDetail extends LawDetail {
  markdownBody?: string;
  mst?: string;
  department?: string;
  source?: string;
}

export default function LawDetailPage() {
  const params = useParams();
  const lawId = decodeURIComponent(params.lawId as string);
  const [law, setLaw] = useState<ExtendedDetail | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState("법률");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/law-detail?id=${encodeURIComponent(lawId)}&type=${encodeURIComponent(activeFile)}`)
      .then((r) => r.json())
      .then((data) => {
        setLaw(data.detail);
        if (data.files) setFiles(data.files);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lawId, activeFile]);

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
          {law.department && (
            <span className="text-xs text-slate-400">{law.department}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold mb-3">{law.lawName}</h2>
        <div className="flex gap-4 text-sm text-slate-500">
          <span>공포일: {formatDate(law.promulgationDate)}</span>
          <span>시행일: {formatDate(law.enforcementDate)}</span>
        </div>

        {/* 파일 유형 탭 */}
        {files.length > 1 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            {files.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                  activeFile === f
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
          <Link
            href={`/law/${encodeURIComponent(lawId)}/history?type=${encodeURIComponent(activeFile)}`}
            className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Clock size={16} />
            개정 연혁 보기
          </Link>
          <Link
            href={`/law/${encodeURIComponent(lawId)}/compare?type=${encodeURIComponent(activeFile)}`}
            className="flex items-center gap-2 text-sm bg-slate-50 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <GitCompareArrows size={16} />
            조문 비교하기
          </Link>
          {law.source && (
            <a
              href={law.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm bg-slate-50 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ExternalLink size={16} />
              법제처 원문
            </a>
          )}
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
                <div className="text-sm leading-[1.8] text-slate-700 whitespace-pre-wrap pl-4">
                  {article.articleContent}
                </div>
              </div>
            ))}
          </div>
        ) : law.markdownBody ? (
          <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap text-sm leading-[1.8]">
            {law.markdownBody}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            법령 본문을 불러올 수 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
