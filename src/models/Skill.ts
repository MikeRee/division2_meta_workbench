interface SkillData {
  type?: string;
  name?: string;
  icon?: string;
  data?: Record<string, Record<string, string>>;
}

class Skill {
  type: string;
  name: string;
  icon: string;
  data: Record<string, Record<string, string>>;

  constructor({
    type = '',
    name = '',
    icon = '',
    data = {}
  }: SkillData = {}) {
    this.type = type;
    this.name = name;
    this.icon = icon;
    this.data = data; // Object with key-value pairs from the table
  }

}

export default Skill;
