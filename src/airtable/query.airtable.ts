export class QueryAirtable {
  fields?: string[];
  filterByFormula?: string;
  constructor(fields?: string[], filterByFormula?: string) {
    this.fields = fields;
    this.filterByFormula = filterByFormula;
  }
}