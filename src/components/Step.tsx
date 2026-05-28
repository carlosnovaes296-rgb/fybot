export interface StepProps {
  number: string;
  title: string;
  desc: string;
}

export function Step({ number, title, desc }: StepProps) {
  return (
    <div className="flex gap-4">
      <span className="text-blue-500 font-mono font-bold">{number}</span>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-white/40 leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}
