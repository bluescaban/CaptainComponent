/// <reference types="@figma/plugin-typings" />

// ─── Text extraction ──────────────────────────────────────────────────────────

function collectTexts(node: SceneNode, maxDepth = 4): string[] {
  const texts: string[] = [];
  function walk(n: SceneNode, depth: number) {
    if (depth > maxDepth) return;
    if (n.type === 'TEXT' && n.characters.trim()) {
      texts.push(n.characters.trim());
    }
    if ('children' in n) {
      for (const child of n.children) walk(child, depth + 1);
    }
  }
  walk(node, 0);
  return texts;
}

function countType(node: SceneNode, type: string): number {
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
    return (node.fills as readonly Paint[]).some(p => p.type === 'IMAGE');
  }
  if ('children' in node) {
    return node.children.some(c => hasImageFill(c));
  }
  return false;
}

// ─── Heuristic type detection ─────────────────────────────────────────────────

function detectType(node: FrameNode | GroupNode): string {
  const w = node.width;
  const h = node.height;
  const texts = collectTexts(node);
  const textCount = countType(node, 'TEXT');
  const hasChildren = 'children' in node && node.children.length > 0;

  const cornerRadius = node.type === 'FRAME' && node.cornerRadius !== figma.mixed
    ? (node.cornerRadius as number)
    : 0;

  const name = node.name.toLowerCase();

  // ── Explicit name hints ──────────────────────────────────────────────────
  if (/\b(btn|button)\b/.test(name))    return 'Button';
  if (/\b(input|field|textfield|text.field)\b/.test(name)) return 'Input';
  if (/\b(card)\b/.test(name))          return 'Card';
  if (/\b(nav|navbar|navigation|menu)\b/.test(name)) return 'Navigation';
  if (/\b(modal|dialog|popup|overlay)\b/.test(name)) return 'Modal';
  if (/\b(header)\b/.test(name))        return 'Header';
  if (/\b(footer)\b/.test(name))        return 'Footer';
  if (/\b(badge|tag|chip|pill)\b/.test(name)) return 'Badge';
  if (/\b(avatar|profile.pic|user.pic)\b/.test(name)) return 'Avatar';
  if (/\b(icon)\b/.test(name))          return 'Icon';
  if (/\b(toggle|switch)\b/.test(name)) return 'Toggle';
  if (/\b(checkbox|check.box)\b/.test(name)) return 'Checkbox';
  if (/\b(radio)\b/.test(name))         return 'Radio';
  if (/\b(dropdown|select)\b/.test(name)) return 'Dropdown';
  if (/\b(toast|snack|alert|notification)\b/.test(name)) return 'Alert';
  if (/\b(tab)\b/.test(name))           return 'Tab';
  if (/\b(list|listitem|list.item)\b/.test(name)) return 'List Item';
  if (/\b(tooltip)\b/.test(name))       return 'Tooltip';

  // ── Shape / structure heuristics ─────────────────────────────────────────

  // Icon: very small square, no text
  if (w <= 32 && h <= 32 && textCount === 0) return 'Icon';

  // Avatar: small square/circle frame
  if (w <= 64 && h <= 64 && Math.abs(w - h) < 8 && textCount === 0) return 'Avatar';

  // Badge: tiny frame with a short text
  if (w <= 80 && h <= 32 && textCount === 1 && texts[0] && texts[0].length <= 15) return 'Badge';

  // Button: small wide frame with text, rounded corners or solid fill
  if (w <= 280 && h <= 60 && textCount <= 2 && cornerRadius >= 4) return 'Button';
  if (w <= 280 && h <= 60 && textCount === 1 && hasChildren) return 'Button';

  // Input / text field: wider than tall, single text, no solid fill background
  if (w > h * 2 && h <= 56 && textCount <= 2) return 'Input';

  // Toggle / switch: small wide frame, no or minimal text
  if (w <= 60 && h <= 36 && textCount === 0) return 'Toggle';

  // Navigation: wide and short, multiple text items
  if (w > 200 && h <= 80 && textCount >= 3) return 'Navigation';

  // Header: very wide and relatively short
  if (w > 300 && h <= 100 && w / h > 4) return 'Header';

  // Footer: same shape as header
  if (w > 300 && h <= 100 && w / h > 4 && /foot/.test(name)) return 'Footer';

  // Card: medium frame with image + text
  if (hasImageFill(node) && textCount >= 1) return 'Card';

  // Modal: large square-ish frame
  if (w >= 280 && h >= 200 && w / h < 3) return 'Modal';

  // List item: wide and short, typically 1-2 text nodes
  if (w > 200 && h <= 80 && textCount <= 3 && !hasImageFill(node)) return 'List Item';

  return 'Component';
}

// ─── Section grouping (for the Components page) ───────────────────────────────

const SECTION_ORDER = [
  'Button', 'Input', 'Toggle', 'Checkbox', 'Radio', 'Dropdown',
  'Badge', 'Avatar', 'Icon',
  'Card', 'List Item',
  'Navigation', 'Tab', 'Header', 'Footer',
  'Modal', 'Alert', 'Tooltip',
  'Component',
];

export function inferSection(node: FrameNode | GroupNode): string {
  return detectType(node);
}

export function sectionOrder(section: string): number {
  const idx = SECTION_ORDER.indexOf(section);
  return idx === -1 ? SECTION_ORDER.length : idx;
}

// ─── Name generation ──────────────────────────────────────────────────────────

const AUTO_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Star|Polygon|Line|Arrow|Component)\s*\d+$/i;

export function inferName(node: FrameNode | GroupNode): string {
  // Respect names the designer set intentionally
  if (!AUTO_NAME_RE.test(node.name.trim())) return node.name;

  const type = detectType(node);
  const texts = collectTexts(node, 3);
  const primary = texts[0] ? capitalize(texts[0].slice(0, 40)) : '';

  if (primary) return `${type} / ${primary}`;
  return type;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
