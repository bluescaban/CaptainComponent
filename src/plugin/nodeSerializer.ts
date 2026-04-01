import { SerializedNode } from '../shared/types';

const MAX_CHILDREN = 12;
const MAX_DEPTH = 3;

// Convert RGB to a compact hex string instead of 3 floats
function toHex(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function serializeNode(node: SceneNode, depth = 0): SerializedNode {
  const out: SerializedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ('width' in node)   out.width  = Math.round(node.width);
  if ('height' in node)  out.height = Math.round(node.height);

  // Only include opacity if non-default
  if ('opacity' in node && node.opacity !== 1) out.opacity = node.opacity;

  // Skip invisible nodes entirely from children (handled below)
  // Just record the first solid fill color compactly
  if ('fills' in node && node.fills !== figma.mixed) {
    const solid = (node.fills as readonly Paint[]).find(p => p.type === 'SOLID') as SolidPaint | undefined;
    if (solid) out.fills = [{ type: 'SOLID', color: { r: solid.color.r, g: solid.color.g, b: solid.color.b } }];
  }

  if ('cornerRadius' in node && node.cornerRadius !== figma.mixed && (node.cornerRadius as number) > 0) {
    out.cornerRadius = node.cornerRadius as number;
  }

  // Text nodes: just the content + font size
  if ('characters' in node) {
    out.characters = node.characters.slice(0, 80); // cap long text
    if ('fontSize' in node && node.fontSize !== figma.mixed) {
      out.fontSize = node.fontSize as number;
    }
  }

  // Auto layout
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    out.layoutMode = node.layoutMode;
    out.paddingLeft   = node.paddingLeft;
    out.paddingRight  = node.paddingRight;
    out.paddingTop    = node.paddingTop;
    out.paddingBottom = node.paddingBottom;
    out.itemSpacing   = node.itemSpacing;
  }

  if ('children' in node && depth < MAX_DEPTH) {
    out.children = node.children
      .filter(c => c.visible !== false)  // skip hidden layers
      .slice(0, MAX_CHILDREN)
      .map(child => serializeNode(child, depth + 1));
  }

  return out;
}
