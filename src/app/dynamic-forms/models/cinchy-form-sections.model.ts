import {IFormField} from './cinchy-form-field.model';

export interface IFormSection {
  id: number;
  label: string;
  fields: Array<IFormField>;
  childFilter;
  childSort;
}

export class FormSection implements IFormSection {
  fields: Array<IFormField> = [];
  childFilter: string;
  childSort: string;

  constructor(public id: number, public label: string) {
  }
}
