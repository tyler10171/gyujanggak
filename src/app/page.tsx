"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Scale, ArrowRight } from "lucide-react";
import type { LawSearchResult } from "@/lib/types";

function formatDate(date: string): string {
  if (!date || date.length !== 8) return date;
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

function getLawTypeBadge(type: string) {
  const colors: Record<string, string> = {
    법률: "bg-indigo-100 text-indigo-700",
    대통령령: "bg-amber-100 text-amber-700",
    총리령: "bg-green-100 text-green-700",
    부령: "bg-slate-100 text-slate-700",
    시행령: "bg-amber-100 text-amber-700",
    시행규칙: "bg-green-100 text-green-700",
  };
  return colors[type] || "bg-slate-100 text-slate-600";
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LawSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/law-search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults(data.results || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* 검색 영역 */}
      <div
        className={`transition-all duration-300 ${
          searched
            ? "mb-6"
            : "flex flex-col items-center justify-center min-h-[60vh]"
        }`}
      >
        {!searched && (
          <div className="text-center mb-8">
            <Scale size={48} className="mx-auto mb-4 text-indigo-600" />
            <h2 className="text-3xl font-bold mb-2">법령을 검색하세요</h2>
            <p className="text-slate-500">
              3,000여 개 대한민국 법령의 본문, 개정 연혁, 조문 비교를 한눈에
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Powered by legalize-kr (Git 기반 법령 아카이브)
            </p>
          </div>
        )}

        <div className={`flex gap-2 ${searched ? "" : "w-full max-w-2xl"}`}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="법령명을 입력하세요 (예: 민법, 근로기준법, 상법)"
            className="flex-1 border border-slate-200 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            <Search size={20} />
            {loading ? "검색 중..." : "검색"}
          </button>
        </div>
      </div>

      {/* 검색 결과 */}
      {searched && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-slate-400">검색 중...</div>
          ) : results.length > 0 ? (
            <>
              <p className="text-sm text-slate-500 mb-4">
                총 {totalCount.toLocaleString()}건의 법령이 검색되었습니다
              </p>
              <div className="space-y-3">
                {results.map((law) => (
                  <Link
                    key={law.lawId}
                    href={`/law/${encodeURIComponent(law.lawId)}`}
                    className="block bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${getLawTypeBadge(law.lawType)}`}
                          >
                            {law.lawType}
                          </span>
                          <span className="text-xs text-slate-400">
                            {law.department}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold group-hover:text-indigo-600 transition-colors">
                          {law.lawName}
                        </h3>
                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
                          <span>공포: {formatDate(law.promulgationDate)}</span>
                          <span>시행: {formatDate(law.enforcementDate)}</span>
                        </div>
                      </div>
                      <ArrowRight
                        size={18}
                        className="text-slate-300 group-hover:text-indigo-500 transition-colors mt-2"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
