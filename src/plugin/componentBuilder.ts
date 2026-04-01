import { ComponentDefinition } from '../shared/types';
import { organizeByAtomicLevel } from './atomicOrganizer';

// ─── Design token palette ─────────────────────────────────────────────────────

const PALETTE = {
  light: {
    primary:       { r: 0.243, g: 0.467, b: 0.988 },
    secondary:     { r: 0.486, g: 0.278, b: 0.988 },
    destructive:   { r: 0.937, g: 0.267, b: 0.267 },
    surface:       { r: 0.973, g: 0.973, b: 0.973 },
    background:    { r: 1,     g: 1,     b: 1     },
    text:          { r: 0.102, g: 0.102, b: 0.102 },
    textSecondary: { r: 0.42,  g: 0.42,  b: 0.42  },
    border:        { r: 0.878, g: 0.878, b: 0.878 },
    disabled:      { r: 0.773, g: 0.773, b: 0.773 },
    white:         { r: 1,     g: 1,     b: 1     },
  },
  dark: {
    primary:       { r: 0.388, g: 0.573, b: 0.988 },
    secondary:     { r: 0.588, g: 0.388, b: 0.988 },
    destructive:   { r: 0.988, g: 0.388, b: 0.388 },
    surface:       { r: 0.133, g: 0.133, b: 0.133 },
    background:    { r: 0.071, g: 0.071, b: 0.071 },
    text:          { r: 0.949, g: 0.949, b: 0.949 },
    textSecondary: { r: 0.627, g: 0.627, b: 0.627 },
    border:        { r: 0.231, g: 0.231, b: 0.231 },
    disabled:      { r: 0.333, g: 0.333, b: 0.333 },
    white:         { r: 1,     g: 1,     b: 1     },
  },
} as const;

type ThemeKey = keyof typeof PALETTE;
type ColorKey = keyof (typeof PALETTE)['light'];

function solid(color: RGB, opacity = 1): SolidPaint {
  return { type: 'SOLID', color, opacity };
}

type ProgressCallback = (current: number, total: number, name: string) => void;

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function buildComponents(
  components: ComponentDefinition[],
  onProgress: ProgressCallback
): Promise<void> {
  // Pre-load fonts once
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  ]);

  // Get or create "Components" page
  let page = figma.root.children.find(p => p.name === 'Components') as PageNode | undefined;
  if (!page) {
    page = figma.createPage();
    page.name = 'Components';
  }
  figma.currentPage = page;

  // Clear existing content
  page.children.forEach(n => n.remove());

  const organized = organizeByAtomicLevel(components);
  const sections: { label: string; items: ComponentDefinition[] }[] = [
    { label: 'Atoms',     items: organized.atoms },
    { label: 'Molecules', items: organized.molecules },
    { label: 'Organisms', items: organized.organisms },
  ];

  let total = components.length;
  let current = 0;
  let pageX = 80;

  for (const section of sections) {
    if (section.items.length === 0) continue;

    const sectionFrame = figma.createFrame();
    sectionFrame.name = section.label;
    sectionFrame.layoutMode = 'VERTICAL';
    sectionFrame.primaryAxisSizingMode = 'AUTO';
    sectionFrame.counterAxisSizingMode = 'AUTO';
    sectionFrame.paddingLeft = 40;
    sectionFrame.paddingRight = 40;
    sectionFrame.paddingTop = 40;
    sectionFrame.paddingBottom = 60;
    sectionFrame.itemSpacing = 48;
    sectionFrame.fills = [solid({ r: 0.965, g: 0.965, b: 0.97 })];
    sectionFrame.cornerRadius = 16;
    sectionFrame.x = pageX;
    sectionFrame.y = 80;
    page.appendChild(sectionFrame);

    // Section heading
    const heading = figma.createText();
    heading.name = 'Heading';
    heading.fontName = { family: 'Inter', style: 'Bold' };
    heading.fontSize = 28;
    heading.characters = section.label.toUpperCase();
    heading.fills = [solid({ r: 0.35, g: 0.35, b: 0.38 })];
    sectionFrame.appendChild(heading);

    for (const def of section.items) {
      current++;
      onProgress(current, total, def.name);
      const card = await buildComponentCard(def);
      sectionFrame.appendChild(card);
    }

    pageX += sectionFrame.width + 120;
  }
}

// ─── Component card (label + theme rows) ─────────────────────────────────────

async function buildComponentCard(def: ComponentDefinition): Promise<FrameNode> {
  const card = figma.createFrame();
  card.name = def.name;
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'AUTO';
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.paddingTop = 24;
  card.paddingBottom = 24;
  card.itemSpacing = 20;
  card.fills = [solid({ r: 1, g: 1, b: 1 })];
  card.cornerRadius = 12;
  card.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.06 },
    offset: { x: 0, y: 2 },
    radius: 8,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];

  // Title row
  const title = figma.createText();
  title.name = 'Title';
  title.fontName = { family: 'Inter', style: 'Bold' };
  title.fontSize = 15;
  title.characters = def.name;
  title.fills = [solid({ r: 0.1, g: 0.1, b: 0.1 })];
  card.appendChild(title);

  if (def.description) {
    const desc = figma.createText();
    desc.name = 'Description';
    desc.fontName = { family: 'Inter', style: 'Regular' };
    desc.fontSize = 11;
    desc.characters = def.description;
    desc.fills = [solid({ r: 0.55, g: 0.55, b: 0.58 })];
    card.appendChild(desc);
  }

  // One row per theme
  const themes: ThemeKey[] = (def.themes ?? ['Light']).map(t =>
    t.toLowerCase() === 'dark' ? 'dark' : 'light'
  );

  for (const theme of themes) {
    const themeLabel = figma.createText();
    themeLabel.name = `${theme} Label`;
    themeLabel.fontName = { family: 'Inter', style: 'Medium' };
    themeLabel.fontSize = 10;
    themeLabel.characters = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    themeLabel.fills = [solid({ r: 0.6, g: 0.6, b: 0.63 })];
    card.appendChild(themeLabel);

    const grid = buildVariantGrid(def, theme);
    card.appendChild(grid);
  }

  return card;
}

// ─── Variant grid (variants × states) ────────────────────────────────────────

function buildVariantGrid(def: ComponentDefinition, theme: ThemeKey): FrameNode {
  const colors = PALETTE[theme];
  const grid = figma.createFrame();
  grid.name = `${theme === 'dark' ? 'Dark' : 'Light'} Grid`;
  grid.layoutMode = 'HORIZONTAL';
  grid.primaryAxisSizingMode = 'AUTO';
  grid.counterAxisSizingMode = 'AUTO';
  grid.itemSpacing = 12;
  grid.paddingLeft = theme === 'dark' ? 16 : 0;
  grid.paddingRight = theme === 'dark' ? 16 : 0;
  grid.paddingTop = theme === 'dark' ? 16 : 0;
  grid.paddingBottom = theme === 'dark' ? 16 : 0;
  grid.cornerRadius = theme === 'dark' ? 8 : 0;
  grid.fills = theme === 'dark' ? [solid(colors.background)] : [];

  const variants = def.variants.length > 0 ? def.variants : ['Default'];
  const states   = def.states.length   > 0 ? def.states   : ['Default'];

  for (const variant of variants) {
    const col = figma.createFrame();
    col.name = variant;
    col.layoutMode = 'VERTICAL';
    col.primaryAxisSizingMode = 'AUTO';
    col.counterAxisSizingMode = 'AUTO';
    col.itemSpacing = 6;
    col.fills = [];

    // Variant label
    const vLabel = figma.createText();
    vLabel.name = 'Variant Label';
    vLabel.fontName = { family: 'Inter', style: 'Medium' };
    vLabel.fontSize = 9;
    vLabel.characters = variant;
    vLabel.fills = [solid(theme === 'dark' ? colors.textSecondary : { r: 0.55, g: 0.55, b: 0.6 })];
    col.appendChild(vLabel);

    for (const state of states) {
      const comp = buildSingleComponent(def, variant, state, theme);
      col.appendChild(comp);
    }

    grid.appendChild(col);
  }

  return grid;
}

// ─── Single component instance ────────────────────────────────────────────────

function buildSingleComponent(
  def: ComponentDefinition,
  variant: string,
  state: string,
  theme: ThemeKey
): ComponentNode {
  const colors = PALETTE[theme];
  const comp = figma.createComponent();
  comp.name = `${def.name}/${variant}/${state}`;

  const isDisabled = state === 'Disabled';
  const isLoading  = state === 'Loading';
  const isFocused  = state === 'Focused';
  const v = variant.toLowerCase();

  // ── Fill & text color per variant ────────────────────────────────────────
  let fillColor: ColorKey = 'primary';
  let textColorVal: RGB = colors.white;
  let useStroke = false;

  switch (v) {
    case 'secondary':   fillColor = 'secondary';   break;
    case 'destructive': fillColor = 'destructive';  break;
    case 'ghost':
    case 'tertiary':
      fillColor = 'surface';
      textColorVal = colors.text;
      useStroke = v === 'ghost';
      break;
    default:
      fillColor = 'primary';
  }

  if (isDisabled) {
    fillColor = 'disabled';
    textColorVal = colors.textSecondary;
    useStroke = false;
  }

  const stateOpacity = state === 'Hover' ? 0.88 : state === 'Active' ? 0.76 : 1;

  // ── Layout ────────────────────────────────────────────────────────────────
  comp.layoutMode = 'HORIZONTAL';
  comp.primaryAxisSizingMode = 'AUTO';
  comp.counterAxisSizingMode = 'AUTO';
  comp.paddingLeft = 16;
  comp.paddingRight = 16;
  comp.paddingTop = 10;
  comp.paddingBottom = 10;
  comp.itemSpacing = 6;
  comp.primaryAxisAlignItems = 'CENTER';
  comp.counterAxisAlignItems = 'CENTER';
  comp.cornerRadius = def.properties.cornerRadius ?? 8;

  // ── Fill ──────────────────────────────────────────────────────────────────
  comp.fills = (v === 'ghost')
    ? []
    : [solid(colors[fillColor], stateOpacity)];

  // ── Stroke ────────────────────────────────────────────────────────────────
  if (useStroke) {
    comp.strokes = [solid(isDisabled ? colors.disabled : colors[fillColor])];
    comp.strokeWeight = 1.5;
    comp.strokeAlign = 'INSIDE';
  }

  // ── Focus ring ────────────────────────────────────────────────────────────
  if (isFocused) {
    comp.effects = [{
      type: 'DROP_SHADOW',
      color: { ...colors.primary, a: 0.45 },
      offset: { x: 0, y: 0 },
      radius: 0,
      spread: 3,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }

  comp.opacity = isDisabled ? 0.5 : 1;

  // ── Loading spinner ───────────────────────────────────────────────────────
  if (isLoading) {
    const spinner = figma.createEllipse();
    spinner.name = 'Spinner';
    spinner.resize(14, 14);
    spinner.fills = [];
    spinner.strokes = [solid(textColorVal)];
    spinner.strokeWeight = 2;
    spinner.dashPattern = [6, 6];
    comp.appendChild(spinner);
  }

  // ── Label ─────────────────────────────────────────────────────────────────
  if (def.properties.hasLabel !== false) {
    const label = figma.createText();
    label.name = 'Label';
    label.fontName = { family: 'Inter', style: 'Medium' };
    label.fontSize = 13;
    label.characters = isLoading ? 'Loading…' : def.name;
    label.fills = [solid(textColorVal)];
    comp.appendChild(label);
  }

  // ── State label (below, for identification) ───────────────────────────────
  const stateBadge = figma.createText();
  stateBadge.name = 'State';
  stateBadge.fontName = { family: 'Inter', style: 'Regular' };
  stateBadge.fontSize = 8;
  stateBadge.characters = state;
  stateBadge.fills = [solid({ r: 0.7, g: 0.7, b: 0.73 })];
  // Note: adding state badge as a sibling via the column, not inside the component
  // — we just keep state info in the component name.

  return comp;
}
