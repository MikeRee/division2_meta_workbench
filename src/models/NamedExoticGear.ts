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
  attribute1: Record<string, number> | null;
  attribute2: Record<string, number> | null;
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
    attribute1: 'Record<string, number> | null',
    attribute2: 'Record<string, number> | null',
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
    attribute1,
    attribute2,
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
    attribute1?: Record<string, number> | null;
    attribute2?: Record<string, number> | null;
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
    const raw1 = attribute1 !== undefined ? attribute1 : {};
    const raw2 = attribute2 !== undefined ? attribute2 : {};
    this.attribute1 = raw1 === null ? null : parseRecordField(raw1);
    this.attribute2 = raw2 === null ? null : parseRecordField(raw2);
    this.modSlots = typeof modSlots === 'number' ? modSlots : parseInt(String(modSlots)) || 0;
    this.notes = notes;
    this.isExotic = isExotic;
  }
}

export default NamedExoticGear;
