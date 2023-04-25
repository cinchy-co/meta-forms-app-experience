import { FormField } from './cinchy-form-field.model';

export class FormSection {

  autoExpand: boolean;
  childFilter: string;
  childSort: string;
  columnsInRow: string;
  fields: Array<FormField> = [];
  multiFields: Array<any>;


  constructor(
    public id: number,
    public label: string
  ) {}
}
