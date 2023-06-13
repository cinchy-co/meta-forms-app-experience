import { FormField } from "./cinchy-form-field.model";

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


  constructor(
    id: number,
    label: string,
    autoExpand?: boolean,
    columnsInRow?: string,
    fields?: Array<FormField>
  ) {

    this.autoExpand = autoExpand ?? false;
    this.columnsInRow = columnsInRow;
    this.fields = fields ?? new Array<FormField>();
    this.id = id;
    this.label = label;
  }


  /**
   * @returns A deep copy of this section
   */
  clone(overrideId?: number): FormSection {

    const clonedSection = new FormSection(
      overrideId ?? this.id,
      this.label,
      this.autoExpand,
      this.columnsInRow,
      this.fields?.slice()
    );

    clonedSection.isInFlattenedChildForm = this.isInFlattenedChildForm;

    return clonedSection;
  }
}
