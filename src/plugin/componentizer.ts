/**
 * In-place componentization.
 *
 * Figma rule: ComponentNode cannot be a child of another ComponentNode.
 * Fix: depth-first traversal — each non-root child is converted, moved to the
 * Components page as a variant set, and replaced with an instance before its
 * parent is processed.
 */

import { inferName, inferSection } from './nameInference';
import { createVariantSet } from './variantBuilder';

type ProgressFn = (name: string) => void;

// ── Layout constants ──────────────────────────────────────────────────────────
const PAGE_MARGIN      = 80;   // from canvas edge to first section
const SECTION_PAD_X    = 60;   // horizontal padding inside section frame
const SECTION_PAD_TOP  = 56;   // space for the header area
const SECTION_PAD_BOT  = 48;   // bottom padding
const ITEM_GAP         = 32;   // vertical gap between component sets
const SECTION_GAP      = 80;   // vertical gap between sections
const MIN_SECTION_W    = 640;  // sections are always at least this wide

export async function componentizeInPlace(
  root: SceneNode,
  onProgress: ProgressFn
): Promise<number> {
  if (root.type !== 'FRAME' && root.type !== 'GROUP') {
    throw new Error('Please select a Frame or Group.');
  }

  const originalX      = root.x;
  const originalY      = root.y;
  const originalParent = root.parent as (BaseNode & ChildrenMixin) | null;
  const originalIndex  = originalParent
    ? [...(originalParent as any).children].indexOf(root)
    : 0;

  let count = 0;
  const componentsPage = getOrCreatePage('Components');

  // Pre-load the font once up-front so section labels render synchronously
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  async function recurse(node: FrameNode | GroupNode, isRoot: boolean): Promise<ComponentNode> {
    if ('children' in node) {
      for (const child of [...node.children]) {
        if (child.type === 'FRAME' || child.type === 'GROUP') {
          await recurse(child as FrameNode | GroupNode, false);
        }
      }
    }

    const inferredName = inferName(node);
    const sectionName  = inferSection(node);
    node.name          = inferredName;
    onProgress(inferredName);

    const compParent = node.parent;
    const compIdx    = compParent ? [...(compParent as any).children].indexOf(node) : 0;
    const compX      = node.x;
    const compY      = node.y;

    const comp = await convertNodeToComponent(node);
    count++;

    if (!isRoot) {
      const setName = comp.name;

      // Park comp on the Components page so combineAsVariants has a valid parent
      componentsPage.appendChild(comp);
      const { set, baseComp } = createVariantSet(comp, setName);

      // Place the finished ComponentSet into its section
      addSetToSection(componentsPage, set, sectionName);

      const inst = baseComp.createInstance();
      inst.x = compX;
      inst.y = compY;

      if (compParent && 'insertChild' in compParent) {
        (compParent as any).insertChild(compIdx, inst);
      } else if (compParent && 'appendChild' in compParent) {
        (compParent as any).appendChild(inst);
      }
    }

    return comp;
  }

  const rootComp    = await recurse(root as FrameNode | GroupNode, true);
  const rootSection = inferSection(rootComp as unknown as FrameNode);
  const rootSetName = rootComp.name;

  componentsPage.appendChild(rootComp);
  const { set: rootSet, baseComp: rootBase } = createVariantSet(rootComp, rootSetName);
  addSetToSection(componentsPage, rootSet, rootSection);

  const instance = rootBase.createInstance();
  instance.x = originalX;
  instance.y = originalY;

  if (originalParent && 'insertChild' in originalParent) {
    (originalParent as any).insertChild(originalIndex, instance);
  } else {
    figma.currentPage.appendChild(instance);
  }

  figma.currentPage.selection = [instance];
  return count;
}

// ─── Section frame management ─────────────────────────────────────────────────

/**
 * Find or create a named section frame on the page, then append the
 * ComponentSet as a new row inside it, resize the section to fit.
 */
function addSetToSection(
  page: PageNode,
  set: ComponentSetNode,
  sectionName: string
): void {
  let section = page.children.find(
    c => c.type === 'FRAME' && c.name === sectionName
  ) as FrameNode | undefined;

  if (!section) {
    section = buildSectionFrame(sectionName);
    positionNewSection(page, section, sectionName);
    page.appendChild(section);
  }

  // Count existing component sets already in this section
  const existingSets = section.children.filter(
    c => c.type === 'COMPONENT_SET' || c.type === 'COMPONENT'
  );

  const contentY = SECTION_PAD_TOP + existingSets.length * (getMaxHeight(existingSets) + ITEM_GAP);

  // Center the set horizontally within the section (calculated after placement)
  set.x = SECTION_PAD_X;
  set.y = contentY;
  section.appendChild(set);

  // Recalculate section size to fit all content
  resizeSectionToFit(section);
}

function buildSectionFrame(name: string): FrameNode {
  const f          = figma.createFrame();
  f.name           = name;
  f.fills          = [{ type: 'SOLID', color: { r: 0.078, g: 0.078, b: 0.078 } }]; // #141414
  f.strokes        = [{ type: 'SOLID', color: { r: 0.592, g: 0.278, b: 1.000 } }]; // #9747FF
  f.strokeWeight   = 4;
  f.strokeAlign    = 'INSIDE';
  f.cornerRadius   = 16;
  f.clipsContent   = false;
  f.resize(MIN_SECTION_W, 200);

  // Section title
  const title      = figma.createText();
  title.fontName   = { family: 'Inter', style: 'Bold' };
  title.characters = name;
  title.fontSize   = 15;
  title.fills      = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
  title.x          = SECTION_PAD_X;
  title.y          = 24;
  f.appendChild(title);

  // Divider line
  const divider    = figma.createLine();
  divider.x        = SECTION_PAD_X;
  divider.y        = 48;
  divider.resize(MIN_SECTION_W - SECTION_PAD_X * 2, 0);
  divider.strokes  = [{ type: 'SOLID', color: { r: 0.592, g: 0.278, b: 1.000 } }]; // #9747FF
  divider.strokeWeight = 1;
  f.appendChild(divider);

  return f;
}

function resizeSectionToFit(section: FrameNode): void {
  const sets = section.children.filter(
    c => c.type === 'COMPONENT_SET' || c.type === 'COMPONENT'
  ) as SceneNode[];

  if (sets.length === 0) return;

  // Find the widest set
  const maxW = sets.reduce((m, s) => Math.max(m, s.width), 0);

  // Required section width: content + generous padding on both sides
  const sectionW = Math.max(MIN_SECTION_W, maxW + SECTION_PAD_X * 2);

  // Center each set horizontally
  for (const s of sets) {
    s.x = Math.round((sectionW - s.width) / 2);
  }

  // Update divider width to match
  const divider = section.children.find(c => c.type === 'LINE') as LineNode | undefined;
  if (divider) {
    divider.x = SECTION_PAD_X;
    divider.resize(sectionW - SECTION_PAD_X * 2, 0);
  }

  // Total height: header + all sets stacked with gaps + bottom padding
  let totalH = SECTION_PAD_TOP;
  for (let i = 0; i < sets.length; i++) {
    sets[i].y = totalH;
    totalH += sets[i].height + (i < sets.length - 1 ? ITEM_GAP : 0);
  }
  totalH += SECTION_PAD_BOT;

  section.resize(sectionW, totalH);
}

function getMaxHeight(nodes: readonly SceneNode[]): number {
  return nodes.reduce((m, n) => Math.max(m, n.height), 0);
}

// ─── Section positioning on the canvas ───────────────────────────────────────

const SECTION_ORDER = [
  'Button','Input','Toggle','Checkbox','Radio','Dropdown',
  'Badge','Avatar','Icon',
  'Card','List Item',
  'Navigation','Tab','Header','Footer',
  'Modal','Alert','Tooltip','Component',
];

function positionNewSection(page: PageNode, section: FrameNode, sectionName: string): void {
  const myRank = rankOf(sectionName);

  const siblings = page.children
    .filter(c => c.type === 'FRAME' && c !== section)
    .map(c => ({ node: c as FrameNode, rank: rankOf(c.name) }))
    .sort((a, b) => a.rank - b.rank);

  let y = PAGE_MARGIN;
  for (const s of siblings) {
    if (s.rank < myRank) {
      y = Math.max(y, s.node.y + s.node.height + SECTION_GAP);
    }
  }

  section.x = PAGE_MARGIN;
  section.y = y;

  // Push lower-ranked sections down to make room
  for (const s of siblings) {
    if (s.rank >= myRank) {
      const needed = y + section.height + SECTION_GAP;
      if (s.node.y < needed) s.node.y = needed;
    }
  }
}

function rankOf(name: string): number {
  const i = SECTION_ORDER.indexOf(name);
  return i === -1 ? SECTION_ORDER.length : i;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreatePage(name: string): PageNode {
  const existing = figma.root.children.find(p => p.name === name) as PageNode | undefined;
  if (existing) return existing;
  const page = figma.createPage();
  page.name = name;
  return page;
}

async function convertNodeToComponent(node: FrameNode | GroupNode): Promise<ComponentNode> {
  const parent = node.parent;
  if (!parent || !('insertChild' in parent)) return node as unknown as ComponentNode;

  const index = (parent as any).children.indexOf(node);

  const comp     = figma.createComponent();
  comp.name      = node.name;
  comp.x         = node.x;
  comp.y         = node.y;
  comp.resize(node.width, node.height);
  comp.opacity   = node.opacity;
  comp.blendMode = node.blendMode;

  if (node.type === 'FRAME') {
    comp.fills   = JSON.parse(JSON.stringify(node.fills));
    comp.strokes = JSON.parse(JSON.stringify(node.strokes));
    comp.effects = JSON.parse(JSON.stringify(node.effects));

    if (node.cornerRadius !== figma.mixed) {
      comp.cornerRadius = node.cornerRadius as number;
    } else {
      comp.topLeftRadius     = node.topLeftRadius;
      comp.topRightRadius    = node.topRightRadius;
      comp.bottomLeftRadius  = node.bottomLeftRadius;
      comp.bottomRightRadius = node.bottomRightRadius;
    }

    comp.layoutMode = node.layoutMode;
    if (node.layoutMode !== 'NONE') {
      comp.primaryAxisSizingMode = node.primaryAxisSizingMode;
      comp.counterAxisSizingMode = node.counterAxisSizingMode;
      comp.primaryAxisAlignItems = node.primaryAxisAlignItems;
      comp.counterAxisAlignItems = node.counterAxisAlignItems;
      comp.paddingLeft           = node.paddingLeft;
      comp.paddingRight          = node.paddingRight;
      comp.paddingTop            = node.paddingTop;
      comp.paddingBottom         = node.paddingBottom;
      comp.itemSpacing           = node.itemSpacing;
    }

    comp.clipsContent = node.clipsContent;
    comp.strokeWeight = node.strokeWeight;
    comp.strokeAlign  = node.strokeAlign;
  } else {
    comp.fills = [];
  }

  for (const child of [...node.children]) {
    comp.appendChild(child);
  }

  (parent as any).insertChild(index, comp);
  node.remove();

  return comp;
}
