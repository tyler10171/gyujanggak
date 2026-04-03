"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Clock, BookMarked } from "lucide-react";

const navItems = [
  { href: "/", label: "법령 검색", icon: Search },
  { href: "/recent", label: "최근 본 법령", icon: Clock },
  { href: "/bookmarks", label: "관심 법령", icon: BookMarked },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#1a1f2e] text-slate-400 flex flex-col z-50">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">규장각</h1>
        <p className="text-xs mt-1 text-slate-500">대한민국 법령 아카이브</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-600">
        v1.0.0
      </div>
    </aside>
  );
}
