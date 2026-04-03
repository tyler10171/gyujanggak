"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitCompareArrows } from "lucide-react";
import { diffWords } from "diff";
import type { Amendment, LawDetail, LawArticle } from "@/lib/types";

function formatDate(date: string): string {
  if (!date || date.length !== 8) return date;
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

interface ArticleDiff {
  articleNumber: string;
  oldContent: string;
  newContent: string;
  changeType: "added" | "removed" | "modified" | "unchanged";
}

function compareArticles(
  oldArticles: LawArticle[],
  newArticles: LawArticle[]
): ArticleDiff[] {
  const oldMap = new Map(oldArticles.map((a) => [a.articleNumber, a]));
  const newMap = new Map(newArticles.map((a) => [a.articleNumber, a]));
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const diffs: ArticleDiff[] = [];

  for (const key of allKeys) {
    const old = oldMap.get(key);
    const cur = newMap.get(key);

    if (!old && cur) {
      diffs.push({
        articleNumber: key,
        oldContent: "",
        newContent: cur.articleContent,
        changeType: "added",
      });
    } else if (old && !cur) {
      diffs.push({
        articleNumber: key,
        oldContent: old.articleContent,
        newContent: "",
        changeType: "removed",
      });
    } else if (old && cur) {
      const oldText = old.articleContent.trim();
      const newText = cur.articleContent.trim();
      diffs.push({
        articleNumber: key,
        oldContent: oldText,
        newContent: newText,
        changeType: oldText === newText ? "unchanged" : "modified",
      });
    }
  }

  return diffs;
}

function DiffText({ oldText, newText }: { oldText: string; newText: string }) {
  const changes = diffWords(oldText, newText);
  return (
    <div className="text-sm leading-relaxed">
      {changes.map((part, i) => (
        <span
          key={i}
          className={
            part.added
              ? "bg-green-100 text-green-800"
              : part.removed
                ? "bg-red-100 text-red-800 line-through"
                : ""
          }
        >
          {part.value}
        </span>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const params = useParams();
  const lawId = params.lawId as string;
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [versionA, setVersionA] = useState("");
  const [versionB, setVersionB] = useState("");
  const [lawA, setLawA] = useState<LawDetail | null>(null);
  const [lawB, setLawB] = useState<LawDetail | null>(null);
  const [diffs, setDiffs] = useState<ArticleDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyChanged, setShowOnlyChanged] = useState(true);

  useEffect(() => {
    fetch(`/api/law-history?id=${lawId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.amendments || [];
        setAmendments(list);
        if (list.length >= 2) {
          setVersionA(list[1].lawId);
          setVersionB(list[0].lawId);
        }
      })
      .catch(console.error);
  }, [lawId]);

  async function handleCompare() {
    if (!versionA || !versionB) return;
    setLoading(true);

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/law-detail?id=${versionA}`),
        fetch(`/api/law-detail?id=${versionB}`),
      ]);
      const dataA = await resA.json();
      const dataB = await resB.json();

      setLawA(dataA.detail);
      setLawB(dataB.detail);

      if (dataA.detail && dataB.detail) {
        setDiffs(compareArticles(dataA.detail.articles, dataB.detail.articles));
      }
    } catch (error) {
      console.error("Compare error:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredDiffs = showOnlyChanged
    ? diffs.filter((d) => d.changeType !== "unchanged")
    : diffs;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/law/${lawId}`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          법령 본문으로
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <GitCompareArrows size={24} className="text-indigo-600" />
        조문 비교
      </h2>

      {/* 버전 선택 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-600">
              이전 버전
            </label>
            <select
              value={versionA}
              onChange={(e) => setVersionA(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">선택하세요</option>
              {amendments.map((a, i) => (
                <option key={i} value={a.lawId}>
                  {formatDate(a.promulgationDate)} ({a.amendmentType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-600">
              이후 버전
            </label>
            <select
              value={versionB}
              onChange={(e) => setVersionB(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">선택하세요</option>
              {amendments.map((a, i) => (
                <option key={i} value={a.lawId}>
                  {formatDate(a.promulgationDate)} ({a.amendmentType})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !versionA || !versionB}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "비교 중..." : "비교하기"}
          </button>
        </div>
      </div>

      {/* 비교 결과 */}
      {diffs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 inline-block" />{" "}
                추가 ({diffs.filter((d) => d.changeType === "added").length})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-200 inline-block" />{" "}
                삭제 ({diffs.filter((d) => d.changeType === "removed").length})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-200 inline-block" />{" "}
                변경 ({diffs.filter((d) => d.changeType === "modified").length})
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="checkbox"
                checked={showOnlyChanged}
                onChange={(e) => setShowOnlyChanged(e.target.checked)}
                className="rounded"
              />
              변경된 조문만 보기
            </label>
          </div>

          <div className="space-y-3">
            {filteredDiffs.map((diff, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl p-5 shadow-sm border ${
                  diff.changeType === "added"
                    ? "border-green-200 bg-green-50"
                    : diff.changeType === "removed"
                      ? "border-red-200 bg-red-50"
                      : diff.changeType === "modified"
                        ? "border-amber-200"
                        : "border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-indigo-600">
                    {diff.articleNumber}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      diff.changeType === "added"
                        ? "bg-green-100 text-green-700"
                        : diff.changeType === "removed"
                          ? "bg-red-100 text-red-700"
                          : diff.changeType === "modified"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {diff.changeType === "added"
                      ? "신설"
                      : diff.changeType === "removed"
                        ? "삭제"
                        : diff.changeType === "modified"
                          ? "변경"
                          : "동일"}
                  </span>
                </div>

                {diff.changeType === "modified" ? (
                  <DiffText oldText={diff.oldContent} newText={diff.newContent} />
                ) : diff.changeType === "added" ? (
                  <p className="text-sm leading-relaxed text-green-800">
                    {diff.newContent}
                  </p>
                ) : diff.changeType === "removed" ? (
                  <p className="text-sm leading-relaxed text-red-800 line-through">
                    {diff.oldContent}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-600">
                    {diff.newContent}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lawA && lawB && diffs.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400">
          두 버전 간 차이가 없습니다
        </div>
      )}
    </div>
  );
}
