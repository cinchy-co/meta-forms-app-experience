import { Form } from "../models/cinchy-form.model";

import { IAdditionalProperty } from "./additional-property";


/**
 * Contains the data associated with a field change event
 */
export interface IFieldChangedEvent {
  /**
   * Can be used to update properties directly associated with this value change, e.g. updating a cinchyColumn's file name when the value is set to a file
   */
  additionalPropertiesToUpdate?: Array<IAdditionalProperty>;

  /**
   * The form that the changed field is attached to
   */
  form: Form;

  /**
   * The index of the field in it's section's fields array
   */
  fieldIndex: number;

  /**
   * The value that the field will hold once the change resolves
   */
  newValue: any;

  /**
   * The index of the section in the form's sections array
   */
  sectionIndex: number;

  /**
   * The name of the Cinchy column associated with this field
   */
  targetColumnName?: string;

  /**
   * The name of the Cinchy table associated with this field
   */
  targetTableName?: string;
}
