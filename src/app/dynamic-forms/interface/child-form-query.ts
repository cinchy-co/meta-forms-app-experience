import { Query } from "../models/cinchy-query.model";

export interface IChildFormQuery {
  childFormId: string;
  formId: string;
  rowId: number;
  query: Query;
}
