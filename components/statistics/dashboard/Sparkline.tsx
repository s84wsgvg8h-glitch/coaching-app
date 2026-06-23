"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

export function Sparkline({
  data,
  color,
  variant = "line",
}: {
  data: number[];
  color: string;
  variant?: "line" | "bar";
}) {
  if (data.length === 0) return <div className="h-10" />;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
