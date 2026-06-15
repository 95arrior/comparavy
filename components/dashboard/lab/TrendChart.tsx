"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { TrendPoint, TrendItem } from "@/lib/naverDatalab";

const COLORS = ["#3f91ff", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"];

/** 데이터랩 검색 추이 라인차트(최근 12개월). 키워드별 상승/하락 칩 + 라인. */
export default function TrendChart({ series, items }: { series: TrendPoint[]; items: TrendItem[] }) {
  if (!series || series.length === 0 || items.length === 0) return null;
  const keys = items.map((i) => i.keyword);

  return (
    <div>
      {/* 상승/하락 칩 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={it.keyword} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-neutral-700">{it.keyword}</span>
            <span className={it.rising ? "text-emerald-500" : "text-neutral-400"}>{it.rising ? "↗" : "↘"}</span>
          </span>
        ))}
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v: string) => { const m = String(v).split("-")[1]; return m ? `${Number(m)}월` : v; }}
              interval={1}
              minTickGap={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
              labelFormatter={(v) => { const [y, m] = String(v).split("-"); return `${y}.${Number(m)}월`; }}
            />
            {keys.map((k, i) => (
              <Line key={k} name={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2.2} dot={false} connectNulls isAnimationActive />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
