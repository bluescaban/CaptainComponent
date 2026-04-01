import React, { useState, useEffect } from 'react';
import './styles/global.css';
import FrameSelector from './components/FrameSelector';
import AnalysisPanel from './components/AnalysisPanel';
import ProgressBar from './components/ProgressBar';
import ComponentList from './components/ComponentList';
import { useOpenAI } from './hooks/useOpenAI';
import { useFigmaSelection } from './hooks/useFigmaSelection';
import { ComponentDefinition, PluginToUIMessage } from '../shared/types';

type AppState = 'idle' | 'analyzing' | 'analyzed' | 'building' | 'complete' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  // Seeded from .env at build time; user can still override in the input field
  const [apiKey, setApiKey]     = useState<string>(__OPENAI_API_KEY__);
  const [showKey, setShowKey]   = useState(false);
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [error, setError]       = useState('');

  const { selectedNode, selectionError } = useFigmaSelection();
  const { analyze } = useOpenAI(apiKey);

  // Listen to plugin → UI messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg: PluginToUIMessage = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'BUILD_PROGRESS':
          setProgress({ current: msg.current, total: msg.total, name: msg.componentName });
          break;
        case 'BUILD_COMPLETE':
          setAppState('complete');
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

  const handleAnalyze = async () => {
    if (!selectedNode) return;
    if (!apiKey.trim()) { setError('Enter your OpenAI API key first.'); return; }
    setError('');
    setAppState('analyzing');
    try {
      const result = await analyze(selectedNode);
      setComponents(result.components);
      setAppState('analyzed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      setAppState('error');
    }
  };

  const handleBuild = () => {
    if (components.length === 0) return;
    setAppState('building');
    setProgress({ current: 0, total: components.length, name: '' });
    parent.postMessage({ pluginMessage: { type: 'BUILD_COMPONENTS', components } }, '*');
  };

  const handleReset = () => {
    setAppState('idle');
    setComponents([]);
    setError('');
    setProgress({ current: 0, total: 0, name: '' });
  };

  const canAnalyze = !!selectedNode && !!apiKey.trim();

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-row">
          <span className="logo">⚓</span>
          <div>
            <h1 className="header-title">Captain Component</h1>
            <p className="header-sub">AI component library generator</p>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="main">

        {/* API Key */}
        <section className="section">
          <label className="label">OpenAI API Key</label>
          <div className="input-row">
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button
              className="icon-btn"
              title={showKey ? 'Hide key' : 'Show key'}
              onClick={() => setShowKey(v => !v)}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
        </section>

        {/* Frame selector */}
        <section className="section">
          <FrameSelector node={selectedNode} error={selectionError} />
        </section>

        {/* Error */}
        {error && (
          <div className="banner banner-error">⚠ {error}</div>
        )}

        {/* Analysis results */}
        {(appState === 'analyzed' || appState === 'building' || appState === 'complete') && (
          <>
            <AnalysisPanel components={components} />
            <ComponentList components={components} />
          </>
        )}

        {/* Progress bar */}
        {appState === 'building' && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label={progress.name}
          />
        )}

        {/* Success */}
        {appState === 'complete' && (
          <div className="banner banner-success">
            ✅ {components.length} components built in "Components" page!
          </div>
        )}
      </main>

      {/* ── Footer actions ───────────────────────────────────────────────────── */}
      <footer className="footer">
        {(appState === 'idle' || appState === 'error') && (
          <button
            className="btn btn-primary btn-full"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
          >
            Analyze Frame with GPT-4o
          </button>
        )}

        {appState === 'analyzing' && (
          <button className="btn btn-primary btn-full" disabled>
            <span className="spinner" /> Analyzing with GPT-4o…
          </button>
        )}

        {appState === 'analyzed' && (
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={handleReset}>Reset</button>
            <button className="btn btn-primary" onClick={handleBuild}>
              Build {components.length} Components →
            </button>
          </div>
        )}

        {appState === 'building' && (
          <button className="btn btn-primary btn-full" disabled>
            Building components…
          </button>
        )}

        {appState === 'complete' && (
          <button className="btn btn-ghost btn-full" onClick={handleReset}>
            Start Over
          </button>
        )}
      </footer>
    </div>
  );
}
