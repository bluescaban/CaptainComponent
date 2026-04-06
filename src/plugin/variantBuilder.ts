/// <reference types="@figma/plugin-typings" />

/**
 * Microsoft Fluent Design System for Web — variant generator.
 *
 * Produces 5 ComponentNode variants from the source design:
 *
 *  Theme=Light, State=Default   — source of truth, untouched
 *  Theme=Light, State=Hover     — NeutralBackground1Hover bg + accessible stroke
 *  Theme=Light, State=Selected  — Communication Tint 40 bg + Brand left bar
 *  Theme=Light, State=Disabled  — desaturated + 40% opacity
 *  Theme=Dark,  State=Default   — dark canvas bg + inverted text
 *
 * Token reference: Fluent UI Web (2024)
 * https://react.fluentui.dev/?path=/docs/theme-colors--page
 */

// ── Fluent Light Tokens ───────────────────────────────────────────────────────
const L = {
  // Backgrounds
  canvas:             rgb(0xFF, 0xFF, 0xFF), // NeutralBackground1
  canvasHover:        rgb(0xF3, 0xF2, 0xF1), // NeutralBackground1Hover
  canvasPressed:      rgb(0xED, 0xEB, 0xE9), // NeutralBackground1Pressed
  subtle:             rgb(0xFA, 0xF9, 0xF8), // NeutralBackground2
  subtleHover:        rgb(0xF3, 0xF2, 0xF1), // NeutralBackground2Hover

  // Strokes
  stroke:             rgb(0xD1, 0xCF, 0xCD), // NeutralStroke1
  strokeHover:        rgb(0x84, 0x82, 0x7E), // NeutralStroke1Hover
  strokeAccessible:   rgb(0x60, 0x5E, 0x5C), // NeutralStrokeAccessible
  strokeFocus:        rgb(0x00, 0x78, 0xD4), // StrokeFocus2 (brand)

  // Text
  textPrimary:        rgb(0x20, 0x1F, 0x1E), // NeutralForeground1
  textSecondary:      rgb(0x60, 0x5E, 0x5C), // NeutralForeground2
  textDisabled:       rgb(0xA1, 0x9F, 0x9D), // NeutralForegroundDisabled
  textOnBrand:        rgb(0xFF, 0xFF, 0xFF), // NeutralForegroundOnBrand

  // Brand
  brand:              rgb(0x00, 0x78, 0xD4), // Selected border — #0078D4
  brandHover:         rgb(0x10, 0x6E, 0xBE), // Selected border hover
  brandTint40:        rgb(0xE8, 0xF5, 0xFC), // Selected bg — #E8F5FC

  // Elevation shadow — Level 2 (inputs, cards)
  shadow2: [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.132 }, offset: { x: 0, y: 1.6 }, radius: 3.6, spread: 0, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.108 }, offset: { x: 0, y: 0.3 }, radius: 0.9, spread: 0, visible: true, blendMode: 'NORMAL' },
  ] as Effect[],
};

// ── Fluent Dark Tokens ────────────────────────────────────────────────────────
const D = {
  canvas:           rgb(0x20, 0x1F, 0x1E), // NeutralBackground1 dark
  canvasHover:      rgb(0x3B, 0x3A, 0x39), // NeutralBackground1Hover dark
  canvasElevated:   rgb(0x29, 0x28, 0x27), // NeutralBackground3 dark

  stroke:           rgb(0x60, 0x5E, 0x5C), // NeutralStroke1 dark
  strokeHover:      rgb(0x84, 0x82, 0x7E), // NeutralStroke1Hover dark

  textPrimary:      rgb(0xFF, 0xFF, 0xFF), // NeutralForeground1 dark
  textSecondary:    rgb(0xA1, 0x9F, 0x9D), // NeutralForeground2 dark
  textDisabled:     rgb(0x60, 0x5E, 0x5C), // NeutralForegroundDisabled dark

  brand:            rgb(0x47, 0x9E, 0xF5), // BrandBackground dark
  brandTint40:      rgb(0x1F, 0x3A, 0x52), // BrandBackground2 dark

  shadow2: [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.32 }, offset: { x: 0, y: 1.6 }, radius: 3.6, spread: 0, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.28 }, offset: { x: 0, y: 0.3 }, radius: 0.9, spread: 0, visible: true, blendMode: 'NORMAL' },
  ] as Effect[],
};

// ─────────────────────────────────────────────────────────────────────────────

export function createVariantSet(
  base: ComponentNode,
  setName: string
): { set: ComponentSetNode; baseComp: ComponentNode } {
  const parent = base.parent as FrameNode | PageNode;

  const hover     = base.clone();
  const selected  = base.clone();
  const disabled  = base.clone();
  const dark      = base.clone();

  base.name      = 'Theme=Light, State=Default';
  hover.name     = 'Theme=Light, State=Hover';
  selected.name  = 'Theme=Light, State=Selected';
  disabled.name  = 'Theme=Light, State=Disabled';
  dark.name      = 'Theme=Dark, State=Default';

  const w = base.width + 24;
  hover.x    = base.x + w;
  selected.x = base.x + w * 2;
  disabled.x = base.x + w * 3;
  dark.x     = base.x + w * 4;
  hover.y = selected.y = disabled.y = dark.y = base.y;

  parent.appendChild(hover);
  parent.appendChild(selected);
  parent.appendChild(disabled);
  parent.appendChild(dark);

  applyHover(hover);
  applySelected(selected);
  applyDisabled(disabled);
  applyDark(dark);

  const set = figma.combineAsVariants([base, hover, selected, disabled, dark], parent);
  set.name = setName;

  return { set, baseComp: base };
}

// ─── Light / Hover ────────────────────────────────────────────────────────────
// NeutralBackground1Hover bg, NeutralStroke1Hover border, text unchanged.

function applyHover(comp: ComponentNode): void {
  setRootFill(comp, L.canvasHover);
  setRootStroke(comp, L.strokeHover, 1, 'INSIDE');

  walk(comp as unknown as SceneNode, (node, isRoot) => {
    if (isRoot) return;
    if (node.type === 'TEXT') return; // text color unchanged on hover
    replaceLightSurfaces(node as SceneNode, L.canvasHover, L.subtle);
  });
}

// ─── Light / Selected ─────────────────────────────────────────────────────────
// Communication Tint 40 bg + 3px Brand left bar. Fluent pattern for list rows,
// nav items, and control panel selections.

function applySelected(comp: ComponentNode): void {
  setRootFill(comp, L.brandTint40);

  // Left accent bar only (Fluent selected indicator)
  comp.strokes            = [solid(L.brand)];
  comp.strokeAlign        = 'INSIDE';
  comp.strokeTopWeight    = 0;
  comp.strokeRightWeight  = 0;
  comp.strokeBottomWeight = 0;
  comp.strokeLeftWeight   = 3;

  walk(comp as unknown as SceneNode, (node, isRoot) => {
    if (isRoot) return;
    if (node.type === 'TEXT') {
      // Ensure text reads clearly on tinted bg
      setTextIfDark(node as TextNode, L.textPrimary);
      return;
    }
    replaceLightSurfaces(node as SceneNode, L.brandTint40, L.brandTint40);
  });
}

// ─── Light / Disabled ─────────────────────────────────────────────────────────
// NeutralForegroundDisabled text, desaturated fills, 40% opacity.
// Fluent spec: disabled elements are visible but non-interactive.

function applyDisabled(comp: ComponentNode): void {
  walk(comp as unknown as SceneNode, (node) => {
    if (node.type === 'TEXT') {
      const t = node as TextNode;
      if (t.fills !== figma.mixed) {
        const fills = t.fills as readonly Paint[];
        const s = solidOf(fills);
        if (s) t.fills = [solid(desaturate(s.color))];
      }
      return;
    }
    if (!hasFills(node)) return;
    const fills = (node as GeometryMixin).fills as readonly Paint[];
    (node as GeometryMixin).fills = fills.map(p =>
      p.type === 'SOLID' ? solid(desaturate((p as SolidPaint).color)) : p
    ) as Paint[];
  });

  if (comp.strokes?.length) {
    comp.strokes = (comp.strokes as Paint[]).map(p =>
      p.type === 'SOLID' ? solid(desaturate((p as SolidPaint).color)) : p
    );
  }

  comp.opacity = (comp.opacity ?? 1) * 0.40;
}

// ─── Dark / Default ───────────────────────────────────────────────────────────
// NeutralBackground1 dark canvas, elevated child surfaces, Fluent dark text.

function applyDark(comp: ComponentNode): void {
  setRootFill(comp, D.canvas);

  // Reset to uniform stroke so we never hit the "Cannot unwrap symbol" error
  // that occurs when individual stroke weights are active and strokeWeight is set.
  comp.strokeTopWeight    = 1;
  comp.strokeRightWeight  = 1;
  comp.strokeBottomWeight = 1;
  comp.strokeLeftWeight   = 1;
  comp.strokes            = [solid(D.stroke)];
  comp.strokeAlign        = 'INSIDE';
  comp.effects            = D.shadow2;

  walk(comp as unknown as SceneNode, (node, isRoot) => {
    if (isRoot) return;

    if (node.type === 'TEXT') {
      flipTextDark(node as TextNode);
      return;
    }

    if (!hasFills(node)) return;
    const fills = (node as GeometryMixin).fills as readonly Paint[];
    const s = solidOf(fills);
    if (!s) return;

    const lum = luminance(s.color);
    if (lum > 0.85) {
      // Near-white surfaces → NeutralBackground3 dark (slightly elevated)
      (node as GeometryMixin).fills = [solid(D.canvasElevated)];
    } else if (lum > 0.5) {
      // Mid-light surfaces → canvas hover dark
      (node as GeometryMixin).fills = [solid(D.canvasHover)];
    }
    // Dark fills, accent colors, images, gradients — untouched
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setRootFill(comp: ComponentNode, color: RGB): void {
  if (hasFills(comp as unknown as SceneNode)) {
    comp.fills = [solid(color)];
  }
}

function setRootStroke(comp: ComponentNode, color: RGB, weight: number, align: 'INSIDE' | 'OUTSIDE' | 'CENTER'): void {
  // Reset individual weights first — Figma throws "Cannot unwrap symbol"
  // if strokeWeight is set while individual weights are active.
  comp.strokeTopWeight    = weight;
  comp.strokeRightWeight  = weight;
  comp.strokeBottomWeight = weight;
  comp.strokeLeftWeight   = weight;
  comp.strokes            = [solid(color)];
  comp.strokeAlign        = align;
}

function replaceLightSurfaces(node: SceneNode, replacement: RGB, subtleReplacement: RGB): void {
  if (!hasFills(node)) return;
  const fills = (node as GeometryMixin).fills as readonly Paint[];
  const s = solidOf(fills);
  if (!s) return;
  const lum = luminance(s.color);
  if (lum > 0.96) {
    (node as GeometryMixin).fills = [solid(replacement)];
  } else if (lum > 0.85) {
    (node as GeometryMixin).fills = [solid(subtleReplacement)];
  }
}

// Selected text tokens
const SEL_TEXT_PRI: RGB = rgb(0x24, 0x24, 0x24); // #242424
const SEL_TEXT_SEC: RGB = rgb(0x60, 0x5E, 0x5C); // #605E5C

function setTextIfDark(node: TextNode, _color: RGB): void {
  if (node.fills === figma.mixed) return;
  const fills = node.fills as readonly Paint[];
  const s = solidOf(fills);
  if (!s) return;
  const lum = luminance(s.color);
  if (lum < 0.15) {
    // Very dark / black text → primary selected text color
    node.fills = [solid(SEL_TEXT_PRI)];
  } else if (lum < 0.5) {
    // Mid-tone / secondary text
    node.fills = [solid(SEL_TEXT_SEC)];
  }
}

function flipTextDark(node: TextNode): void {
  if (node.fills === figma.mixed) return;
  const fills = node.fills as readonly Paint[];
  const s = solidOf(fills);
  if (!s) return;
  const lum = luminance(s.color);
  if (lum < 0.2) {
    node.fills = [solid(D.textPrimary)];   // dark text → white
  } else if (lum < 0.55) {
    node.fills = [solid(D.textSecondary)]; // mid text → #A19F9D
  }
}

function hasFills(node: SceneNode): boolean {
  return 'fills' in node && (node as GeometryMixin).fills !== figma.mixed;
}

function solidOf(fills: readonly Paint[]): SolidPaint | undefined {
  return fills.find(p => p.type === 'SOLID') as SolidPaint | undefined;
}

function solid(color: RGB): SolidPaint {
  return { type: 'SOLID', color } as SolidPaint;
}

function rgb(r: number, g: number, b: number): RGB {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function luminance({ r, g, b }: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function desaturate(c: RGB): RGB {
  const lum = luminance(c);
  return { r: c.r * 0.2 + lum * 0.8, g: c.g * 0.2 + lum * 0.8, b: c.b * 0.2 + lum * 0.8 };
}

function walk(
  node: SceneNode,
  cb: (n: SceneNode, isRoot: boolean) => void,
  isRoot = true
): void {
  cb(node, isRoot);
  if ('children' in node) {
    for (const child of node.children) walk(child, cb, false);
  }
}
