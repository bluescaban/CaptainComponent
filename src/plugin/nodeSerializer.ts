import { SerializedNode, SerializedPaint } from '../shared/types';

const MAX_CHILDREN = 40;
const MAX_DEPTH = 6;

function serializePaints(paints: readonly Paint[]): SerializedPaint[] {
  return paints.map(p => {
    const out: SerializedPaint = { type: p.type };
    if (p.type === 'SOLID') {
      out.color = { r: p.color.r, g: p.color.g, b: p.color.b };
      out.opacity = p.opacity ?? 1;
    }
    return out;
  });
}

export function serializeNode(node: SceneNode, depth = 0): SerializedNode {
  const out: SerializedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ('width' in node) out.width = node.width;
  if ('height' in node) out.height = node.height;
  if ('opacity' in node) out.opacity = node.opacity;
  if ('visible' in node) out.visible = node.visible;

  if ('fills' in node && node.fills !== figma.mixed) {
    out.fills = serializePaints(node.fills as readonly Paint[]);
  }
  if ('strokes' in node) {
    out.strokes = serializePaints(node.strokes as readonly Paint[]);
  }
  if ('effects' in node) {
    out.effects = (node.effects as readonly Effect[]).map(e => ({ type: e.type }));
  }
  if ('constraints' in node) {
    out.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }
  if ('cornerRadius' in node && node.cornerRadius !== figma.mixed) {
    out.cornerRadius = node.cornerRadius as number;
  }
  if ('characters' in node) {
    out.characters = node.characters;
    if ('fontSize' in node && node.fontSize !== figma.mixed) {
      out.fontSize = node.fontSize as number;
    }
    if ('fontName' in node && node.fontName !== figma.mixed) {
      const fn = node.fontName as FontName;
      out.fontName = { family: fn.family, style: fn.style };
    }
  }
  if ('layoutMode' in node) {
    out.layoutMode = node.layoutMode;
    if (node.layoutMode !== 'NONE') {
      out.paddingLeft = node.paddingLeft;
      out.paddingRight = node.paddingRight;
      out.paddingTop = node.paddingTop;
      out.paddingBottom = node.paddingBottom;
      out.itemSpacing = node.itemSpacing;
    }
  }

  if ('children' in node && depth < MAX_DEPTH) {
    out.children = node.children
      .slice(0, MAX_CHILDREN)
      .map(child => serializeNode(child, depth + 1));
  }

  return out;
}
