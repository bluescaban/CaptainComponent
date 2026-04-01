/// <reference types="@figma/plugin-typings" />

/**
 * Generates 4 variants from the original component without destroying its design.
 *
 * Light/Default  — original unchanged (source of truth)
 * Dark/Default   — root bg inverted to dark, text inverted to light
 * Dark/Hover     — same as dark + border replaced with #40B8FD
 * Light/Disabled — original + desaturated fills + 40% opacity
 *
 * Everything else (corner radius, padding, layout, shadows, icon colors,
 * image fills, accent colors) is preserved from the original.
 */

// Reference border colors from the spec — only used for the hover stroke
const HOVER_BORDER: RGB = { r: 0.251, g: 0.722, b: 0.992 }; // #40B8FD

export function createVariantSet(
  base: ComponentNode,
  setName: string
): { set: ComponentSetNode; baseComp: ComponentNode } {
  const parent = base.parent as FrameNode | PageNode;

  const dark     = base.clone();
  const hover    = base.clone();
  const disabled = base.clone();

  base.name     = 'Theme=Light, State=Default';
  dark.name     = 'Theme=Dark, State=Default';
  hover.name    = 'Theme=Dark, State=Hover';
  disabled.name = 'Theme=Light, State=Disabled';

  const w = base.width + 24;
  dark.x     = base.x + w;
  hover.x    = base.x + w * 2;
  disabled.x = base.x + w * 3;
  dark.y = hover.y = disabled.y = base.y;

  parent.appendChild(dark);
  parent.appendChild(hover);
  parent.appendChild(disabled);

  // Light stays exactly as-is
  applyDark(dark);
  applyHover(hover);
  applyDisabled(disabled);

  const set = figma.combineAsVariants([base, dark, hover, disabled], parent);
  set.name = setName;

  return { set, baseComp: base };
}

// ─── Dark: flip clearly-light fills to dark equivalents, light text ───────────

function applyDark(comp: ComponentNode): void {
  walk(comp as unknown as SceneNode, (node, isRoot) => {
    if (node.type === 'TEXT') {
      flipTextToDark(node as TextNode);
      return;
    }
    if (!('fills' in node) || (node as GeometryMixin).fills === figma.mixed) return;
    const fills = (node as GeometryMixin).fills as readonly Paint[];
    const solid = fills.find(p => p.type === 'SOLID') as SolidPaint | undefined;
    if (!solid) return;

    if (isRoot) {
      // Root background: invert to dark
      (node as GeometryMixin).fills = [solidPaint(invertToNearBlack(solid.color))];
      // Carry the original border but keep it; don't change stroke color
    } else if (luminance(solid.color) > 0.6) {
      // Child light fills → darken proportionally
      (node as GeometryMixin).fills = [solidPaint(invertToNearBlack(solid.color))];
    }
    // Dark fills, accent colors, gradients etc. are left alone
  });
}

// ─── Hover: dark variant + replace/add spec border color ─────────────────────

function applyHover(comp: ComponentNode): void {
  applyDark(comp);
  // Replace root stroke with spec hover color; preserve weight/align from original
  const existingWeight = comp.strokeWeight !== figma.mixed ? (comp.strokeWeight as number) : 1;
  comp.strokes      = [solidPaint(HOVER_BORDER)];
  comp.strokeWeight = existingWeight || 1;
  comp.strokeAlign  = 'INSIDE';
}

// ─── Disabled: desaturate fills + dim opacity, keep structure ────────────────

function applyDisabled(comp: ComponentNode): void {
  walk(comp as unknown as SceneNode, (node) => {
    if (node.type === 'TEXT') {
      const t = node as TextNode;
      if (t.fills !== figma.mixed) {
        const fills = t.fills as readonly Paint[];
        const solid = fills.find(p => p.type === 'SOLID') as SolidPaint | undefined;
        if (solid) t.fills = [solidPaint(desaturate(solid.color))];
      }
      return;
    }
    if (!('fills' in node) || (node as GeometryMixin).fills === figma.mixed) return;
    const fills = (node as GeometryMixin).fills as readonly Paint[];
    const newFills = fills.map(p => {
      if (p.type === 'SOLID') return solidPaint(desaturate((p as SolidPaint).color));
      return p;
    });
    (node as GeometryMixin).fills = newFills as Paint[];
  });

  // Dim the strokes too
  if (comp.strokes && comp.strokes.length > 0) {
    comp.strokes = (comp.strokes as Paint[]).map(p => {
      if (p.type === 'SOLID') return solidPaint(desaturate((p as SolidPaint).color));
      return p;
    });
  }

  comp.opacity = (comp.opacity ?? 1) * 0.45;
}

// ─── Color math ───────────────────────────────────────────────────────────────

/**
 * Inverts a clearly-light color to a dark equivalent while keeping
 * the same relative lightness difference from black.
 */
function invertToNearBlack(c: RGB): RGB {
  const lum = luminance(c);
  // Map lightness: 1.0 → 0.08 (near-black), 0.6 → 0.12, keeping hue
  const darkBase = 0.08;
  const scale    = darkBase / Math.max(lum, 0.01);
  return {
    r: Math.min(1, c.r * scale * 1.05),
    g: Math.min(1, c.g * scale * 1.05),
    b: Math.min(1, c.b * scale * 1.10), // slight blue tint for depth
  };
}

function flipTextToDark(node: TextNode): void {
  if (node.fills === figma.mixed) return;
  const fills = node.fills as readonly Paint[];
  const solid = fills.find(p => p.type === 'SOLID') as SolidPaint | undefined;
  if (!solid) return;
  const lum = luminance(solid.color);
  // Only flip dark text — leave light text (already ok on dark bg) alone
  if (lum < 0.5) {
    node.fills = [solidPaint({ r: 0.96, g: 0.96, b: 0.97 })];
  }
}

function desaturate(c: RGB): RGB {
  const lum = luminance(c);
  return {
    r: c.r * 0.25 + lum * 0.75,
    g: c.g * 0.25 + lum * 0.75,
    b: c.b * 0.25 + lum * 0.75,
  };
}

function luminance({ r, g, b }: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function solidPaint(color: RGB): SolidPaint {
  return { type: 'SOLID', color } as SolidPaint;
}

// ─── Tree walker ──────────────────────────────────────────────────────────────

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
