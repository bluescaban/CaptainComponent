import React from 'react';

interface Props {
  current: number;
  total: number;
  label: string;
}

export default function ProgressBar({ current, total, label }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-wrap">
      <div className="progress-header">
        <span className="progress-label">{label || 'Building…'}</span>
        <span className="progress-count">{current} / {total}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-pct">{pct}%</span>
    </div>
  );
}
