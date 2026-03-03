interface StatusImmunityData {
  statusEffect?: string;
  requiredPercent?: string;
}

/**
 * StatusImmunity model for status effect immunity requirements
 */
class StatusImmunity {
  statusEffect: string;
  requiredPercent: string;

  constructor({ statusEffect, requiredPercent }: StatusImmunityData) {
    this.statusEffect = statusEffect || '';
    this.requiredPercent = requiredPercent || '';
  }

  /**
   * Creates a StatusImmunity from a CSV row
   * @param {any[]} row - CSV row data [Status Effect, Required %]
   * @returns {StatusImmunity}
   */
  static fromCSVRow(row: any[]): StatusImmunity {
    return new StatusImmunity({
      statusEffect: row[0] || '',
      requiredPercent: row[1] || ''
    });
  }

}

export default StatusImmunity;
