interface SparklinePoint {
  label: string;
  value: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  height?: number;
  stroke?: string;
  fill?: string;
}

export const Sparkline = ({
  data,
  height = 120,
  stroke = 'rgba(37, 99, 235, 1)',
  fill = 'rgba(37, 99, 235, 0.2)'
}: SparklineProps) => {
  if (!data.length) {
    return <p>Недостаточно данных для графика.</p>;
  }

  const width = Math.max(data.length * 60, 240);
  const maxValue = Math.max(...data.map((point) => point.value));
  const minValue = Math.min(...data.map((point) => point.value));
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * width;
    const normalized = (point.value - minValue) / range;
    const y = height - normalized * (height - 20) - 10;
    return `${x},${y}`;
  });

  const areaPoints = ['0,' + height, ...points, `${width},${height}`];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.8" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#sparklineGradient)"
        stroke="none"
        points={areaPoints.join(' ')}
        strokeLinejoin="round"
      />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};
