import React, { useState } from 'react';
import { ComponentDefinition } from '../../shared/types';

interface Props {
  components: ComponentDefinition[];
}

const levelBadge: Record<string, { label: string; color: string; bg: string }> = {
  atom:     { label: 'Atom',     color: '#2563eb', bg: '#eff6ff' },
  molecule: { label: 'Molecule', color: '#7c3aed', bg: '#f5f3ff' },
  organism: { label: 'Organism', color: '#c026d3', bg: '#fdf4ff' },
};

export default function ComponentList({ components }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="component-list">
      <p className="list-heading">Component Library Preview</p>
      {components.map(c => {
        const badge = levelBadge[c.atomicLevel] ?? levelBadge.atom;
        const isOpen = expanded === c.name;
        return (
          <div key={c.name} className="component-row">
            <button
              className="component-row-btn"
              onClick={() => setExpanded(isOpen ? null : c.name)}
            >
              <div className="component-row-left">
                <span
                  className="level-badge"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
                <span className="component-row-name">{c.name}</span>
              </div>
              <span className="chevron">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="component-detail">
                <p className="detail-desc">{c.description}</p>
                <div className="detail-tags">
                  {c.variants.map(v => (
                    <span key={v} className="tag tag-variant">{v}</span>
                  ))}
                </div>
                <div className="detail-tags">
                  {c.states.map(s => (
                    <span key={s} className="tag tag-state">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
