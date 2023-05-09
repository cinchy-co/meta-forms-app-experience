import { FormField } from "./cinchy-form-field.model";

import { ILookupRecord } from "../../models/lookup-record.model";


export class FormSection {

  childFilter: string;

  childSort: string;

  columnsInRow: string;

  fields: Array<FormField> = [];

  linkedColumnDetails: {
    linkedElement: FormField,
    linkLabel: string,
    linkValue?: ILookupRecord
  };

  flattenedChildFormRecordValues: Array<any>;


  constructor(
    public id: number,
    public label: string,
    public autoExpand?: boolean
  ) {}
}
