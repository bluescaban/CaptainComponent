import { useEffect, useState } from 'react';
import { SerializedNode, PluginToUIMessage } from '../../shared/types';

export function useFigmaSelection() {
  const [selectedNode, setSelectedNode] = useState<SerializedNode | null>(null);
  const [selectionError, setSelectionError] = useState<string>('');

  useEffect(() => {
    // Ask the plugin for the current selection on mount
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTION' } }, '*');

    const handler = (event: MessageEvent) => {
      const msg: PluginToUIMessage = event.data?.pluginMessage;
      if (!msg || msg.type !== 'SELECTION_DATA') return;
      if (msg.node) {
        setSelectedNode(msg.node);
        setSelectionError('');
      } else {
        setSelectedNode(null);
        setSelectionError(msg.error ?? '');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { selectedNode, selectionError };
}
