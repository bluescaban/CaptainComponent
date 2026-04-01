/// <reference types="@figma/plugin-typings" />

import { serializeNode } from './nodeSerializer';
import { buildComponents } from './componentBuilder';
import { UIToPluginMessage, PluginToUIMessage } from '../shared/types';

figma.showUI(__html__, { width: 320, height: 560, title: 'Captain Component' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(msg: PluginToUIMessage) {
  figma.ui.postMessage(msg);
}

// ─── Message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (raw: UIToPluginMessage) => {
  switch (raw.type) {
    // ── Read & serialize the currently selected frame ───────────────────────
    case 'GET_SELECTION': {
      const sel = figma.currentPage.selection;
      if (sel.length === 0) {
        send({ type: 'SELECTION_DATA', node: null, error: 'Select a frame first.' });
        return;
      }
      const node = sel[0];
      if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'GROUP') {
        send({ type: 'SELECTION_DATA', node: null, error: 'Selected layer must be a Frame, Component, or Group.' });
        return;
      }
      send({ type: 'SELECTION_DATA', node: serializeNode(node) });
      break;
    }

    // ── Persist the OpenAI API key in Figma clientStorage (per-user) ────────
    case 'SAVE_API_KEY': {
      try {
        await figma.clientStorage.setAsync('openai_api_key', raw.apiKey);
        send({ type: 'SAVE_KEY_RESULT', success: true });
      } catch {
        send({ type: 'SAVE_KEY_RESULT', success: false });
      }
      break;
    }

    // ── Load saved key back into the UI on startup ───────────────────────────
    case 'LOAD_API_KEY': {
      const key = (await figma.clientStorage.getAsync('openai_api_key')) ?? '';
      send({ type: 'LOADED_KEY', apiKey: key as string });
      break;
    }

    // ── Build all components from GPT-4o analysis result ────────────────────
    case 'BUILD_COMPONENTS': {
      try {
        await buildComponents(raw.components, (current, total, name) => {
          send({ type: 'BUILD_PROGRESS', current, total, componentName: name });
        });
        send({ type: 'BUILD_COMPLETE' });
      } catch (err) {
        send({ type: 'ERROR', message: String(err) });
      }
      break;
    }

    case 'CANCEL': {
      figma.closePlugin();
      break;
    }
  }
};

// ─── Selection change listener ────────────────────────────────────────────────

figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    send({ type: 'SELECTION_DATA', node: null });
    return;
  }
  const node = sel[0];
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'GROUP') {
    send({ type: 'SELECTION_DATA', node: serializeNode(node) });
  } else {
    send({ type: 'SELECTION_DATA', node: null });
  }
});
