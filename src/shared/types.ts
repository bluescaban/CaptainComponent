// ─── Component definition returned by GPT-4o ─────────────────────────────────

export interface ComponentDefinition {
  name: string;
  atomicLevel: 'atom' | 'molecule' | 'organism';
  description: string;
  variants: string[];
  states: string[];
  themes: string[];
  sizes: string[];
  sourceNodeId?: string;
  properties: {
    hasIcon?: boolean;
    hasLabel?: boolean;
    cornerRadius?: number;
    typography?: string;
    colorToken?: string;
    width?: number;
    height?: number;
  };
}

export interface AnalysisResult {
  components: ComponentDefinition[];
}

// ─── Serialized Figma node (sent from plugin → UI → OpenAI) ──────────────────

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  fills?: SerializedPaint[];
  strokes?: SerializedPaint[];
  cornerRadius?: number;
  children?: SerializedNode[];
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  effects?: unknown[];
  constraints?: { horizontal: string; vertical: string };
  layoutMode?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  opacity?: number;
  visible?: boolean;
}

export interface SerializedPaint {
  type: string;
  color?: { r: number; g: number; b: number };
  opacity?: number;
}

// ─── Messages between plugin UI (iframe) and plugin controller ────────────────

export type PluginToUIMessage =
  | { type: 'SELECTION_DATA'; node: SerializedNode | null; error?: string }
  | { type: 'SAVE_KEY_RESULT'; success: boolean }
  | { type: 'LOADED_KEY'; apiKey: string }
  | { type: 'BUILD_PROGRESS'; current: number; total: number; componentName: string }
  | { type: 'BUILD_COMPLETE' }
  | { type: 'ERROR'; message: string };

export type UIToPluginMessage =
  | { type: 'GET_SELECTION' }
  | { type: 'SAVE_API_KEY'; apiKey: string }
  | { type: 'LOAD_API_KEY' }
  | { type: 'BUILD_COMPONENTS'; components: ComponentDefinition[] }
  | { type: 'CANCEL' };
