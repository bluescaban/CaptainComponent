/// <reference types="@figma/plugin-typings" />

/**
 * Name and label inference.
 *
 * Priority order for naming:
 *   1. Frame/layer name if it's meaningful (not auto-generated)
 *   2. Largest/boldest text node inside (title-level text)
 *   3. First visible text node
 *   4. Shape/structure heuristics as a fallback label
 */

const AUTO_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Star|Polygon|Line|Arrow|Component)\s*\d*$/i;

function isMeaningfulName(name: string): boolean {
  return !AUTO_NAME_RE.test(name.trim());
}

// ─── Text node extraction ─────────────────────────────────────────────────────

interface TextInfo {
  text: string;
  fontSize: number;
  fontWeight: number; // 400 regular, 600 semibold, 700 bold
  depth: number;
}

function collectTextNodes(node: SceneNode, maxDepth = 5): TextInfo[] {
  const results: TextInfo[] = [];

  function walk(n: SceneNode, depth: number) {
    if (depth > maxDepth) return;
    if (!('visible' in n) || (n as SceneNode & { visible: boolean }).visible === false) return;

    if (n.type === 'TEXT') {
      const t = n as TextNode;
      const chars = t.characters.trim();
      if (!chars) return;

      const fontSize   = t.fontSize !== figma.mixed ? (t.fontSize as number) : 12;
      const fontWeight = getFontWeight(t);

      results.push({ text: chars.slice(0, 80), fontSize, fontWeight, depth });
    }

    if ('children' in n) {
      for (const child of n.children) walk(child, depth + 1);
    }
  }

  walk(node, 0);
  return results;
}

function getFontWeight(node: TextNode): number {
  if (node.fontName === figma.mixed) return 400;
  const style = (node.fontName as FontName).style.toLowerCase();
  if (/black|heavy/.test(style))      return 900;
  if (/extrabold|extra.bold/.test(style)) return 800;
  if (/bold/.test(style))             return 700;
  if (/semibold|semi.bold|demi/.test(style)) return 600;
  if (/medium/.test(style))           return 500;
  if (/light/.test(style))            return 300;
  if (/thin|hairline/.test(style))    return 100;
  return 400;
}

/**
 * Returns the most title-like text inside a node.
 * Prefers: larger font size → heavier weight → shallower depth.
 */
function getPrimaryText(node: SceneNode): string | null {
  const nodes = collectTextNodes(node);
  if (nodes.length === 0) return null;

  nodes.sort((a, b) => {
    if (b.fontSize !== a.fontSize) return b.fontSize - a.fontSize;
    if (b.fontWeight !== a.fontWeight) return b.fontWeight - a.fontWeight;
    return a.depth - b.depth;
  });

  return nodes[0].text;
}

/**
 * Returns text that looks like a placeholder, label, or field hint —
 * typically smaller/lighter text near the bottom of the visual hierarchy.
 */
function getSecondaryText(node: SceneNode): string | null {
  const nodes = collectTextNodes(node);
  if (nodes.length < 2) return null;

  // Secondary: smallest font, lightest weight, deepest
  const sorted = [...nodes].sort((a, b) => {
    if (a.fontSize !== b.fontSize) return a.fontSize - b.fontSize;
    if (a.fontWeight !== b.fontWeight) return a.fontWeight - b.fontWeight;
    return b.depth - a.depth;
  });

  const secondary = sorted[0];
  // Don't return the same text as primary
  const primary = getPrimaryText(node);
  if (secondary.text === primary) return nodes.length > 1 ? sorted[1]?.text ?? null : null;
  return secondary.text;
}

// ─── Structural helpers ───────────────────────────────────────────────────────

function countNodeType(node: SceneNode, type: string): number {
  let n = 0;
  function walk(nd: SceneNode) {
    if (nd.type === type) n++;
    if ('children' in nd) nd.children.forEach(walk);
  }
  walk(node);
  return n;
}

function hasImageFill(node: SceneNode): boolean {
  if ('fills' in node && node.fills !== figma.mixed) {
    if ((node.fills as readonly Paint[]).some(p => p.type === 'IMAGE')) return true;
  }
  if ('children' in node) {
    return node.children.some(c => hasImageFill(c));
  }
  return false;
}

// ─── Type detection ───────────────────────────────────────────────────────────

function detectType(node: FrameNode | GroupNode): string {
  const name = node.name.toLowerCase();
  const w = node.width;
  const h = node.height;
  const textCount = countNodeType(node, 'TEXT');
  const cornerRadius = node.type === 'FRAME' && node.cornerRadius !== figma.mixed
    ? (node.cornerRadius as number) : 0;
  const primaryText = getPrimaryText(node) ?? '';

  // ── 1. Frame name keywords (designer-set, high confidence) ───────────────
  if (/\b(btn|button)\b/.test(name))                       return 'Button';
  if (/\b(input|field|textfield|text.field|search)\b/.test(name)) return 'Input';
  if (/\b(card)\b/.test(name))                             return 'Card';
  if (/\b(nav|navbar|navigation|menu|sidebar)\b/.test(name)) return 'Navigation';
  if (/\b(modal|dialog|popup|overlay|drawer)\b/.test(name)) return 'Modal';
  if (/\b(header|top.bar|appbar|titlebar)\b/.test(name))   return 'Header';
  if (/\b(footer|bottom.bar|bottom.nav)\b/.test(name))     return 'Footer';
  if (/\b(badge|tag|chip|pill|label)\b/.test(name))        return 'Badge';
  if (/\b(avatar|profile.pic|user.pic|pfp)\b/.test(name))  return 'Avatar';
  if (/\b(icon)\b/.test(name))                             return 'Icon';
  if (/\b(toggle|switch)\b/.test(name))                    return 'Toggle';
  if (/\b(checkbox|check.box)\b/.test(name))               return 'Checkbox';
  if (/\b(radio)\b/.test(name))                            return 'Radio';
  if (/\b(dropdown|select|picker)\b/.test(name))           return 'Dropdown';
  if (/\b(toast|snack|alert|notification|banner)\b/.test(name)) return 'Alert';
  if (/\b(tab)\b/.test(name))                              return 'Tab';
  if (/\b(list.?item|row|cell)\b/.test(name))              return 'List Item';
  if (/\b(tooltip|popover|hint)\b/.test(name))             return 'Tooltip';
  if (/\b(table)\b/.test(name))                            return 'Table';
  if (/\b(progress|loader|spinner)\b/.test(name))          return 'Progress';
  if (/\b(stepper|wizard)\b/.test(name))                   return 'Stepper';

  // ── 2. Primary text content keywords ─────────────────────────────────────
  const pt = primaryText.toLowerCase();
  if (/^(submit|send|save|ok|confirm|apply|done|next|continue|sign.?in|log.?in|sign.?up)/.test(pt)) return 'Button';
  if (/^(search|type here|enter|write|message|placeholder)/.test(pt)) return 'Input';

  // ── 3. Shape/structure heuristics ────────────────────────────────────────
  if (w <= 32 && h <= 32 && textCount === 0)                return 'Icon';
  if (w <= 64 && h <= 64 && Math.abs(w - h) < 8 && textCount === 0) return 'Avatar';
  if (w <= 80 && h <= 32 && textCount === 1 && primaryText.length <= 15) return 'Badge';
  if (h <= 60 && w <= 320 && textCount <= 2 && cornerRadius >= 4) return 'Button';
  if (w > h * 2 && h <= 56 && textCount <= 2)               return 'Input';
  if (w <= 60 && h <= 36 && textCount === 0)                 return 'Toggle';
  if (w > 200 && h <= 80 && textCount >= 3)                  return 'Navigation';
  if (w > 300 && h <= 100 && w / h > 4)                      return 'Header';
  if (hasImageFill(node) && textCount >= 1)                  return 'Card';
  if (w >= 280 && h >= 200 && w / h < 3)                     return 'Modal';
  if (w > 200 && h <= 80 && textCount <= 3)                  return 'List Item';

  return 'Component';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Infer a descriptive name for a component node.
 *
 * Uses (in priority order):
 *   1. The frame's own name if it was set by the designer
 *   2. Title-level text inside + type prefix
 *   3. Type label alone
 */
export function inferName(node: FrameNode | GroupNode): string {
  if (isMeaningfulName(node.name)) return titleCase(node.name);

  const type    = detectType(node);
  const primary = getPrimaryText(node);

  if (primary && primary.length <= 48) {
    return `${type} / ${titleCase(primary)}`;
  }

  return type;
}

/**
 * Infer a section label (used only as fallback — the calling code uses the
 * root frame name as the section name to keep children grouped together).
 */
export function inferSection(node: FrameNode | GroupNode): string {
  return detectType(node);
}

/**
 * Extract the primary (title) and secondary (subtitle/hint) text from a node,
 * useful for annotating components on the Components page.
 */
export function inferLabels(node: FrameNode | GroupNode): { primary: string | null; secondary: string | null } {
  return {
    primary:   getPrimaryText(node),
    secondary: getSecondaryText(node),
  };
}

function titleCase(s: string): string {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
