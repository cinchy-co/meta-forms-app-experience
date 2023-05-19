import { FormField } from "./cinchy-form-field.model";

import { ILookupRecord } from "../../models/lookup-record.model";


export class FormSection {

  /**
   * Whether or not this section is expanded by default
   */
  autoExpand: boolean;

  /**
   * The number of field columns to render in this section
   *
   * TODO: This should really be a number, but it comes in as a string and is currently used directly in the template
   */
  columnsInRow: string;

  /**
   * The set of fields contained in this section
   */
  fields: Array<FormField> = [];

  /**
   * The section's unique identifier
   */
  id: number;

  /**
   * Will only be set to true on a cloned section in the display set of a view when the form was extracted from a
   * flattened child form
   */
  isInFlattenedChildForm: boolean;

  /**
   * The display name for this section
   */
  label: string;

  linkedColumnDetails: {
    linkedElement: FormField,
    linkLabel: string,
    linkValue?: ILookupRecord
  };

  /**
   * If an unflattened child form is present in this section's fields, this will contain the set of key:value pairs that
   * correspond to each of the rows in that child form's table
   */
  childFormRowValues: Array<{ [key: string]: any }>;


  constructor(
    id: number,
    label: string,
    autoExpand?: boolean,
    columnsInRow?: string,
    fields?: Array<FormField>,
    linkedColumnDetails?: {
      linkedElement: FormField,
      linkLabel: string,
      linkValue?: ILookupRecord
    },
    childFormRowValues?: Array<{ [key: string]: any }>
  ) {

    this.autoExpand = autoExpand ?? false;
    this.childFormRowValues = childFormRowValues;
    this.columnsInRow = columnsInRow;
    this.fields = fields ?? new Array<FormField>();
    this.id = id;
    this.label = label;
    this.linkedColumnDetails = linkedColumnDetails;
  }


  /**
   * @returns A deep copy of this section
   */
  clone(overrideId?: number): FormSection {

    return new FormSection(
      overrideId ?? this.id,
      this.label,
      this.autoExpand,
      this.columnsInRow,
      this.fields?.slice(),
      this.linkedColumnDetails,
      this.childFormRowValues?.slice()
    );
  }
}
