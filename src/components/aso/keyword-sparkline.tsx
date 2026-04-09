interface DataPoint {
  date: string;
  position: number | null;
}

interface KeywordSparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
}

export default function KeywordSparkline({
  data,
  width = 80,
  height = 30,
}: KeywordSparklineProps) {
  // Only use points with a valid position (ranked in top 100)
  const ranked = data.filter((d) => d.position !== null) as {
    date: string;
    position: number;
  }[];

  if (ranked.length < 2) return null;

  const positions = ranked.map((d) => d.position);
  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const range = maxPos - minPos || 1;

  // Higher position = worse rank, so we invert the Y axis
  const toX = (i: number) => (i / (ranked.length - 1)) * width;
  const toY = (pos: number) => ((pos - minPos) / range) * (height - 4) + 2;

  const points = ranked
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.position).toFixed(1)}`)
    .join(' ');

  const first = ranked[0].position;
  const last = ranked[ranked.length - 1].position;
  // Lower position number = better rank
  const improved = last < first;
  const same = last === first;
  const color = same ? '#6b7280' : improved ? '#22c55e' : '#ef4444';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={toX(ranked.length - 1)} cy={toY(last)} r="2" fill={color} />
    </svg>
  );
}
