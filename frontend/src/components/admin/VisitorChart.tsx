'use client';

import { useState, type MouseEvent } from 'react';

export type VisitorPoint = { day: string; views: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WIDTH = 640;
const HEIGHT = 220;
const PAD = { l: 44, r: 12, t: 16, b: 28 };

export function formatVisitorDay(day: string): string {
  const [year, month, date] = day.split('-');
  const name = MONTHS[Number(month) - 1] || month;
  if (!date) return `${name} ${year}`;
  return `${Number(date)} ${name}`;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = value / pow;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return nice * pow;
}

function tickIndexes(count: number): number[] {
  if (count <= 1) return [0];
  if (count <= 8) return Array.from({ length: count }, (_, index) => index);
  const marks = new Set<number>([0, count - 1]);
  for (let step = 1; step < 5; step += 1) marks.add(Math.round((step * (count - 1)) / 5));
  return [...marks].sort((a, b) => a - b);
}

export default function VisitorChart({ points }: { points: VisitorPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;
  const peak = niceMax(points.reduce((max, point) => Math.max(max, point.views), 0));
  const yOf = (views: number) => PAD.t + innerH - (views / peak) * innerH;
  const xOf = (index: number) =>
    points.length <= 1 ? PAD.l + innerW / 2 : PAD.l + (index / (points.length - 1)) * innerW;
  const line = points.map((point, index) => `${xOf(index)},${yOf(point.views)}`).join(' ');
  const area = points.length
    ? `${PAD.l},${PAD.t + innerH} ${line} ${xOf(points.length - 1)},${PAD.t + innerH}`
    : '';
  const mid = Math.round(peak / 2);
  const yTicks = mid > 0 && mid < peak ? [0, mid, peak] : [0, peak];
  const active = hover != null ? points[hover] : null;

  function move(event: MouseEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    if (points.length === 1) {
      setHover(0);
      return;
    }
    const index = Math.round(((x - PAD.l) / innerW) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Page views over time"
        onMouseMove={move}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.l}
              x2={WIDTH - PAD.r}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD.l - 8} y={yOf(tick) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {tick}
            </text>
          </g>
        ))}
        {area ? <polygon points={area} fill="#7A9E8F" opacity="0.18" /> : null}
        {line ? <polyline points={line} fill="none" stroke="#7A9E8F" strokeWidth="2" /> : null}
        {points.length <= 31
          ? points.map((point, index) => (
              <circle key={point.day} cx={xOf(index)} cy={yOf(point.views)} r="2.5" fill="#7A9E8F" />
            ))
          : null}
        {active && hover != null ? (
          <g>
            <line
              x1={xOf(hover)}
              x2={xOf(hover)}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="#7A9E8F"
              strokeDasharray="3 3"
            />
            <circle cx={xOf(hover)} cy={yOf(active.views)} r="4" fill="#111827" />
          </g>
        ) : null}
        {tickIndexes(points.length).map((index) => {
          const edge = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle';
          return (
            <text key={points[index].day} x={xOf(index)} y={HEIGHT - 8} textAnchor={edge} fontSize="11" fill="#6b7280">
              {formatVisitorDay(points[index].day)}
            </text>
          );
        })}
      </svg>
      {active && hover != null ? (
        <p
          className="pointer-events-none absolute top-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm"
          style={{ left: `${(xOf(hover) / WIDTH) * 100}%`, transform: 'translateX(-50%)' }}
        >
          {formatVisitorDay(active.day)} · {active.views}
        </p>
      ) : null}
    </div>
  );
}
