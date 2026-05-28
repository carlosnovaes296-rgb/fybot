export interface StrategyMetricProps {
  label: string;
  value: string;
  color: string;
}

export function StrategyMetric({ label, value, color }: StrategyMetricProps) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-white/40">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
