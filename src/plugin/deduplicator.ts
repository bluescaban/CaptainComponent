/// <reference types="@figma/plugin-typings" />

/**
 * Detects structurally identical frames so Captain Component only creates
 * one component per unique design — not one per list-item repetition.
 *
 * Two frames are considered duplicates when they share:
 *   - The same node type
 *   - Similar dimensions (within 4px tolerance)
 *   - Identical text content (all visible text nodes, order-independent)
 *   - The same child-type signature (e.g. [FRAME, TEXT, VECTOR])
 *
 * We intentionally ignore fill colors and exact positions so that themed
 * or shifted copies of the same list row are still caught.
 */

export interface Fingerprint {
  key: string;
}

/** Collect all visible text content from a node tree, sorted for order-independence. */
function collectTexts(node: SceneNode): string[] {
  const texts: string[] = [];
  function walk(n: SceneNode) {
    if ('visible' in n && !(n as SceneNode & { visible: boolean }).visible) return;
    if (n.type === 'TEXT') {
      const chars = (n as TextNode).characters.trim();
      if (chars) texts.push(chars);
    }
    if ('children' in n) (n.children as readonly SceneNode[]).forEach(walk);
  }
  walk(node);
  return texts.sort();
}

/** Top-level child type list — captures structural shape without content. */
function childTypeSignature(node: SceneNode): string {
  if (!('children' in node)) return '';
  return (node.children as readonly SceneNode[])
    .map(c => c.type)
    .join(',');
}

/** Round to nearest N to absorb minor size variations between list items. */
function snap(v: number, to = 4): number {
  return Math.round(v / to) * to;
}

export function fingerprint(node: FrameNode | GroupNode): Fingerprint {
  const texts   = collectTexts(node as unknown as SceneNode);
  const textKey = texts.join('|');
  const childSig = childTypeSignature(node as unknown as SceneNode);
  const w = snap(node.width);
  const h = snap(node.height);

  const key = `${node.type}:${w}x${h}:${childSig}:${textKey}`;
  return { key };
}

/**
 * Returns true if this node looks like a repeated item:
 *   - Its fingerprint matches a previously seen frame
 *   - It has meaningful text content OR a non-trivial child structure
 *     (prevents false-positives on empty spacers/dividers)
 */
export class DuplicateTracker {
  private seen = new Map<string, ComponentNode>();

  /**
   * Compute and return the fingerprint key for a node BEFORE it is converted
   * (i.e. while it still exists in the document). Returns null if the node is
   * too trivial to deduplicate (empty spacer, single-child wrapper, etc.).
   */
  getKey(node: FrameNode | GroupNode): string | null {
    const texts = collectTexts(node as unknown as SceneNode);
    const childCount = 'children' in node ? node.children.length : 0;
    if (texts.length === 0 && childCount <= 1) return null;
    return fingerprint(node).key;
  }

  /**
   * Check whether a fingerprint key has already been seen.
   * Returns the existing ComponentNode if so, null if this is the first occurrence.
   */
  check(key: string): ComponentNode | null {
    return this.seen.get(key) ?? null;
  }

  /**
   * Register a newly created component against a pre-computed key.
   * Must be called with the key obtained BEFORE the source node was removed.
   */
  register(key: string, comp: ComponentNode): void {
    this.seen.set(key, comp);
  }
}
