import { Form } from "../models/cinchy-form.model";


/**
 * Used to encapsulated the response from Form.findChildForm
 */
export interface IFindChildFormResponse {
  /**
   * Direct reference to the child form object from the parent form
   */
  childForm: Form;

  /**
   * Relative to the parent form, the index of the field that contains this child form
   */
  fieldIndex: number;

  /**
   * Relative to the parent form, the index of the section that contains the field which contains the child form
   */
  sectionIndex: number;
}
