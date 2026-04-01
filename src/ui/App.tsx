import React, { useState, useEffect } from 'react';
import './styles/global.css';
import { useFigmaSelection } from './hooks/useFigmaSelection';
import { PluginToUIMessage, SerializedNode } from '../shared/types';

type AppState = 'idle' | 'converting' | 'converted' | 'error';

const TYPE_ICON: Record<string, string> = {
  FRAME: '▣', GROUP: '◈', TEXT: 'T', RECTANGLE: '▭',
  ELLIPSE: '◯', VECTOR: '✦', COMPONENT: '❖', INSTANCE: '◆',
};

function LayerRow({ node }: { node: SerializedNode }) {
  const icon = TYPE_ICON[node.type] ?? '·';
  return (
    <div className="layer-row">
      <span className="layer-icon">{icon}</span>
      <span className="layer-name">{node.name}</span>
      <span className="layer-type">{node.type.charAt(0) + node.type.slice(1).toLowerCase()}</span>
    </div>
  );
}

export default function App() {
  const [appState, setAppState]     = useState<AppState>('idle');
  const [prompt, setPrompt]         = useState('');
  const [convertProgress, setConvertProgress] = useState('');
  const [convertedCount, setConvertedCount]   = useState(0);
  const [error, setError]           = useState('');

  const { selectedNode, selectionError } = useFigmaSelection();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg: PluginToUIMessage = event.data?.pluginMessage;
      if (!msg) return;
      switch (msg.type) {
        case 'COMPONENTIZE_PROGRESS':
          setConvertProgress(msg.name);
          break;
        case 'COMPONENTIZE_COMPLETE':
          setConvertedCount(msg.count);
          setAppState('converted');
          break;
        case 'ERROR':
          setError(msg.message);
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
    setAppState('converting');
    parent.postMessage({ pluginMessage: { type: 'COMPONENTIZE_IN_PLACE', prompt: prompt.trim() || undefined } }, '*');
  };

  const handleReset = () => {
    setAppState('idle');
    setError('');
    setConvertProgress('');
    setConvertedCount(0);
  };

  const layers: SerializedNode[] = selectedNode?.children ?? (selectedNode ? [selectedNode] : []);
  const canConvert = !!selectedNode && appState === 'idle';

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

        {/* Selection card */}
        <div className="glass-card">
          <p className="card-label">Selection</p>

          {selectedNode ? (
            <>
              <div className="selection-header">
                <span className="sel-icon">▣</span>
                <div className="sel-meta">
                  <span className="sel-name">{selectedNode.name}</span>
                  <span className="sel-size">
                    {Math.round(selectedNode.width ?? 0)} × {Math.round(selectedNode.height ?? 0)} px
                    {layers.length > 0 && ` · ${layers.length} layer${layers.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <span className="sel-check">✓</span>
              </div>

              {layers.length > 0 && (
                <div className="layer-list">
                  {layers.slice(0, 12).map(l => <LayerRow key={l.id} node={l} />)}
                  {layers.length > 12 && (
                    <p className="layer-more">+{layers.length - 12} more layers</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">▣</span>
              <span className="empty-hint">{selectionError || 'Select a Frame in Figma'}</span>
            </div>
          )}
        </div>

        {/* Prompt card */}
        <div className="glass-card">
          <p className="card-label">Component purpose <span className="card-label-optional">(optional)</span></p>
          <textarea
            className="prompt-input"
            placeholder="e.g. Chat interface with a message input, send button, and emoji picker…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
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
