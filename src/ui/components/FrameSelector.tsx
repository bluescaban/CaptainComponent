import React from 'react';
import { SerializedNode } from '../../shared/types';

interface Props {
  node: SerializedNode | null;
  error: string;
}

export default function FrameSelector({ node, error }: Props) {
  return (
    <div className="frame-selector">
      <label className="label">Selected Frame</label>
      {node ? (
        <div className="frame-info">
          <span className="frame-icon">▣</span>
          <div className="frame-meta">
            <span className="frame-name">{node.name}</span>
            <span className="frame-size">
              {Math.round(node.width ?? 0)} × {Math.round(node.height ?? 0)}px
              {' · '}{node.children?.length ?? 0} layers
            </span>
          </div>
          <span className="frame-ok">✓</span>
        </div>
      ) : (
        <div className="frame-empty">
          <span className="frame-icon muted">▣</span>
          <span className="frame-hint">
            {error || 'Select a Frame in Figma to get started'}
          </span>
        </div>
      )}
    </div>
  );
}
