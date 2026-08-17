import type { ReactElement } from 'react';

function getScoreColor(score: number): string {
  if (score < 40) return 'text-red-500';
  if (score <= 70) return 'text-yellow-500';
  return 'text-emerald-500';
}

function getScoreStroke(score: number): string {
  if (score < 40) return 'stroke-red-500';
  if (score <= 70) return 'stroke-yellow-500';
  return 'stroke-emerald-500';
}

function getScoreTrack(score: number): string {
  if (score < 40) return 'stroke-red-100';
  if (score <= 70) return 'stroke-yellow-100';
  return 'stroke-emerald-100';
}

export function ScoreCircle(props: {
  readonly score: number;
  readonly label?: string;
  readonly size?: 'sm' | 'lg';
}): ReactElement {
  const score = Math.round(Math.min(100, Math.max(0, props.score)));
  const isSm = props.size === 'sm';
  const radius = isSm ? 16 : 40;
  const viewBox = isSm ? '0 0 40 40' : '0 0 100 100';
  const cx = isSm ? 20 : 50;
  const strokeWidth = isSm ? 3 : 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${isSm ? 'h-10 w-10' : 'h-24 w-24'}`}>
        <svg className={`${isSm ? 'h-10 w-10' : 'h-24 w-24'} -rotate-90`} viewBox={viewBox}>
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={getScoreTrack(score)}
          />
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getScoreStroke(score)} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${getScoreColor(score)} ${isSm ? 'text-xs' : 'text-2xl'}`}>
            {score}
          </span>
        </div>
      </div>
      {!isSm && props.label ? (
        <span className="text-xs font-medium text-slate-500">{props.label}</span>
      ) : null}
    </div>
  );
}

export function ScoreTrend(props: {
  readonly current: number;
  readonly previous?: number;
}): ReactElement | null {
  if (props.previous === undefined) return null;
  const diff = props.current - props.previous;
  if (diff > 0) {
    return (
      <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (diff < 0) {
    return (
      <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <span className="h-3.5 w-3.5 text-slate-400">—</span>;
}
