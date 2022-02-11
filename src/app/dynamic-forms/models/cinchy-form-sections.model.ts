import {IFormField} from './cinchy-form-field.model';

export interface IFormSection {
  id: number;
  label: string;
  fields: Array<IFormField>;
  childFilter;
  childSort;
  autoExpand: boolean;
  columnsInRow: string;
  MultiFields: Array<any>;
}

export class FormSection implements IFormSection {
  fields: Array<IFormField> = [];
  childFilter: string;
  childSort: string;
  autoExpand: boolean;
  columnsInRow: string;
  MultiFields: Array<any>;

  constructor(public id: number, public label: string) {
  }
}
