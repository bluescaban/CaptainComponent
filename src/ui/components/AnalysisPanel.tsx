import React from 'react';
import { ComponentDefinition } from '../../shared/types';

interface Props {
  components: ComponentDefinition[];
}

const levelColors: Record<string, string> = {
  atom:     '#4f8ef7',
  molecule: '#7c5af4',
  organism: '#e05af4',
};

export default function AnalysisPanel({ components }: Props) {
  const atoms     = components.filter(c => c.atomicLevel === 'atom').length;
  const molecules = components.filter(c => c.atomicLevel === 'molecule').length;
  const organisms = components.filter(c => c.atomicLevel === 'organism').length;

  return (
    <div className="analysis-panel">
      <p className="analysis-title">GPT-4o identified {components.length} components</p>
      <div className="analysis-stats">
        <div className="stat" style={{ borderColor: levelColors.atom }}>
          <span className="stat-value">{atoms}</span>
          <span className="stat-label">Atoms</span>
        </div>
        <div className="stat" style={{ borderColor: levelColors.molecule }}>
          <span className="stat-value">{molecules}</span>
          <span className="stat-label">Molecules</span>
        </div>
        <div className="stat" style={{ borderColor: levelColors.organism }}>
          <span className="stat-value">{organisms}</span>
          <span className="stat-label">Organisms</span>
        </div>
      </div>
    </div>
  );
}
