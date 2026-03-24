import { CoreType, parseCoreType } from './CoreValue';
import { parseRecordField } from '../utils/recordParser';
import { GearType, parseGearType } from './BuildGear';

export type MinorAttribute = Record<string, number> | 'mod';

class NamedExoticGear {
  type: GearType;
  brand: string;
  name: string;
  icon: string;
  talent: string[];
  core: CoreType[];
  attribute1: Record<string, number>;
  attribute2: Record<string, number>;
  modSlots: number;
  notes: string;
  isExotic: boolean;

  static readonly FIELD_TYPES = {
    type: 'GearType',
    brand: 'string',
    name: 'string',
    icon: 'string',
    talent: 'string[]',
    core: 'CoreType[]',
    attribute1: 'Record<string, number>',
    attribute2: 'Record<string, number>',
    modSlots: 'number',
    notes: 'string',
    isExotic: 'boolean',
  } as const;

  constructor({
    type = GearType.Mask,
    brand = '',
    name = '',
    icon = '',
    talent = [],
    core = [],
    minor1 = {},
    minor2 = {},
    modSlots = 0,
    notes = '',
    isExotic = false,
  }: {
    type?: GearType | string;
    brand?: string;
    name?: string;
    icon?: string;
    talent?: string[] | string;
    core?: (CoreType | string)[] | string;
    minor1?: Record<string, number>;
    minor2?: Record<string, number>;
    modSlots?: number;
    notes?: string;
    isExotic?: boolean;
  } = {}) {
    this.type = typeof type === 'string' ? parseGearType(type) : type;
    this.brand = brand;
    this.name = name;
    this.icon = icon;
    this.talent = Array.isArray(talent) ? talent : talent ? [talent] : [];
    this.core = (Array.isArray(core) ? core : core ? [core] : []).map(parseCoreType);
    this.attribute1 = parseRecordField(minor1);
    this.attribute2 = parseRecordField(minor2);
    this.modSlots = typeof modSlots === 'number' ? modSlots : parseInt(String(modSlots)) || 0;
    this.notes = notes;
    this.isExotic = isExotic;
  }
}

export default NamedExoticGear;
