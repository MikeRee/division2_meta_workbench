export enum FormulaType {
  Percent = 'percent',
  PerSec = 'per/sec',
  Number = 'number'
}

export interface Formula {
  label: string;
  block: any;
  type: FormulaType;
  formula: string;
}
