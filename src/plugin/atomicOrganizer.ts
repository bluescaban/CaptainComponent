import { ComponentDefinition } from '../shared/types';

export interface OrganizedComponents {
  atoms: ComponentDefinition[];
  molecules: ComponentDefinition[];
  organisms: ComponentDefinition[];
}

export function organizeByAtomicLevel(components: ComponentDefinition[]): OrganizedComponents {
  return {
    atoms: components.filter(c => c.atomicLevel === 'atom'),
    molecules: components.filter(c => c.atomicLevel === 'molecule'),
    organisms: components.filter(c => c.atomicLevel === 'organism'),
  };
}
