"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import type { Amendment } from "@/lib/types";

function formatDate(date: string): string {
  if (!date || date.length !== 8) return date;
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

function getAmendmentColor(type: string) {
  if (type.includes("제정")) return "bg-blue-500";
  if (type.includes("전부개정")) return "bg-red-500";
  if (type.includes("일부개정")) return "bg-amber-500";
  if (type.includes("타법")) return "bg-slate-400";
  return "bg-slate-400";
}

function getAmendmentBadge(type: string) {
  if (type.includes("제정")) return "bg-blue-100 text-blue-700";
  if (type.includes("전부개정")) return "bg-red-100 text-red-700";
  if (type.includes("일부개정")) return "bg-amber-100 text-amber-700";
  if (type.includes("타법")) return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

export default function HistoryPage() {
  const params = useParams();
  const lawId = params.lawId as string;
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/law-history?id=${lawId}`)
      .then((r) => r.json())
      .then((data) => setAmendments(data.amendments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lawId]);

  async function toggleReason(amendLawId: string) {
    if (expandedId === amendLawId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(amendLawId);

    if (!reasons[amendLawId]) {
      try {
        const res = await fetch(`/api/law-revision-reason?id=${amendLawId}`);
        const data = await res.json();
        setReasons((prev) => ({ ...prev, [amendLawId]: data.reason }));
      } catch {
        setReasons((prev) => ({
          ...prev,
          [amendLawId]: "개정 이유를 불러올 수 없습니다.",
        }));
      }
    }
  }

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">연혁 조회 중...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/law/${lawId}`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          법령 본문으로
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">개정 연혁</h2>

      {amendments.length > 0 ? (
        <div className="relative">
          {/* 타임라인 세로선 */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-0">
            {amendments.map((amendment, i) => (
              <div key={i} className="relative pl-12 pb-8">
                {/* 타임라인 점 */}
                <div
                  className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${getAmendmentColor(amendment.amendmentType)} ring-4 ring-white`}
                />

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${getAmendmentBadge(amendment.amendmentType)}`}
                    >
                      {amendment.amendmentType}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDate(amendment.promulgationDate)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-1">
                    {amendment.lawName}
                  </p>

                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>공포번호: {amendment.promulgationNumber}</span>
                    <span>시행일: {formatDate(amendment.enforcementDate)}</span>
                  </div>

                  {/* 개정 이유 토글 */}
                  <button
                    onClick={() => toggleReason(amendment.lawId)}
                    className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {expandedId === amendment.lawId ? (
                      <>
                        <ChevronUp size={14} />
                        개정 이유 접기
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        개정 이유 보기
                      </>
                    )}
                  </button>

                  {expandedId === amendment.lawId && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {reasons[amendment.lawId] || "로딩 중..."}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          개정 연혁 정보가 없습니다
        </div>
      )}
    </div>
  );
}
