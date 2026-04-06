import React, { useState, useEffect } from 'react';
import './styles/global.css';
import { useFigmaSelection } from './hooks/useFigmaSelection';
import { PluginToUIMessage, SerializedNode } from '../shared/types';

type AppState = 'idle' | 'converting' | 'converted' | 'error';

/** Recursively collect every Frame/Group node that will become a component. */
function collectConvertible(node: SerializedNode, depth = 0): SerializedNode[] {
  const results: SerializedNode[] = [];
  if (node.type === 'FRAME' || node.type === 'GROUP') {
    results.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      results.push(...collectConvertible(child, depth + 1));
    }
  }
  return results;
}

function ComponentRow({ node, active }: { node: SerializedNode; active: boolean }) {
  return (
    <div className={`comp-row ${active ? 'comp-row-active' : ''}`}>
      <span className="comp-row-icon">❖</span>
      <div className="comp-row-meta">
        <span className="comp-row-name">{node.name}</span>
        <span className="comp-row-detail">
          {node.type === 'FRAME' ? 'Frame' : 'Group'}
          {node.width != null && ` · ${Math.round(node.width)}×${Math.round(node.height ?? 0)}`}
          {node.children ? ` · ${node.children.length} layers` : ''}
        </span>
      </div>
      <span className="comp-row-badge">5 variants</span>
    </div>
  );
}

export default function App() {
  const [appState, setAppState]               = useState<AppState>('idle');
  const [prompt, setPrompt]                   = useState('');
  const [convertProgress, setConvertProgress] = useState('');
  const [convertedCount, setConvertedCount]   = useState(0);
  const [activeNode, setActiveNode]           = useState('');
  const [error, setError]                     = useState('');

  const { selectedNode, selectionError } = useFigmaSelection();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg: PluginToUIMessage = event.data?.pluginMessage;
      if (!msg) return;
      switch (msg.type) {
        case 'COMPONENTIZE_PROGRESS':
          setConvertProgress(msg.name);
          setActiveNode(msg.name);
          break;
        case 'COMPONENTIZE_COMPLETE':
          setConvertedCount(msg.count);
          setActiveNode('');
          setAppState('converted');
          break;
        case 'ERROR':
          setError(msg.message);
          setActiveNode('');
          setAppState('error');
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConvert = () => {
    if (!selectedNode) return;
    setError('');
    setConvertProgress('');
    setConvertedCount(0);
    setActiveNode('');
    setAppState('converting');
    parent.postMessage({ pluginMessage: { type: 'COMPONENTIZE_IN_PLACE', prompt: prompt.trim() || undefined } }, '*');
  };

  const handleReset = () => {
    setAppState('idle');
    setError('');
    setConvertProgress('');
    setConvertedCount(0);
    setActiveNode('');
  };

  const convertible = selectedNode ? collectConvertible(selectedNode) : [];
  const canConvert   = !!selectedNode && appState === 'idle';

  return (
    <div className="app">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        <span className="logo">⚓</span>
        <div>
          <h1 className="header-title">Captain Component</h1>
          <p className="header-sub">Figma component generator</p>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="main">

        {/* Selection summary */}
        {selectedNode ? (
          <div className="glass-card">
            <div className="selection-header">
              <span className="sel-icon">▣</span>
              <div className="sel-meta">
                <span className="sel-name">{selectedNode.name}</span>
                <span className="sel-size">
                  {Math.round(selectedNode.width ?? 0)} × {Math.round(selectedNode.height ?? 0)} px
                </span>
              </div>
              <span className="sel-check">✓</span>
            </div>
          </div>
        ) : (
          <div className="glass-card">
            <div className="empty-state">
              <span className="empty-icon">▣</span>
              <span className="empty-hint">{selectionError || 'Select a Frame in Figma'}</span>
            </div>
          </div>
        )}

        {/* Components to be created */}
        <div className="glass-card">
          <div className="comp-list-header">
            <p className="card-label">Components to create</p>
            {convertible.length > 0 && (
              <span className="comp-count-badge">{convertible.length}</span>
            )}
          </div>

          {convertible.length > 0 ? (
            <div className="comp-list">
              {convertible.map(n => (
                <ComponentRow
                  key={n.id}
                  node={n}
                  active={appState === 'converting' && activeNode === n.name}
                />
              ))}
            </div>
          ) : (
            <p className="comp-list-empty">
              {selectedNode ? 'No convertible frames found inside selection.' : 'No selection.'}
            </p>
          )}
        </div>

        {/* Prompt */}
        <div className="glass-card">
          <p className="card-label">
            Purpose&nbsp;<span className="card-label-optional">(optional)</span>
          </p>
          <textarea
            className="prompt-input"
            placeholder="e.g. Chat interface with a message input, send button, and emoji picker…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            disabled={appState === 'converting'}
          />
        </div>

        {/* Error */}
        {error && appState === 'error' && (
          <div className="banner-error">⚠ {error}</div>
        )}

        {/* Success */}
        {appState === 'converted' && (
          <div className="banner-success">
            ✓ {convertedCount} component{convertedCount !== 1 ? 's' : ''} created in Components page
          </div>
        )}

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="footer">
        {(appState === 'idle' || appState === 'error') && (
          <button className="btn-convert" onClick={handleConvert} disabled={!canConvert}>
            Convert to Components
          </button>
        )}

        {appState === 'converting' && (
          <div className="converting-state">
            <div className="spinner" />
            <span>{convertProgress ? `Converting: ${convertProgress}` : 'Converting…'}</span>
          </div>
        )}

        {appState === 'converted' && (
          <button className="btn-ghost" onClick={handleReset}>Convert Another</button>
        )}
      </footer>

    </div>
  );
}
