import { FormField } from "../models/cinchy-form-field.model";

import { ILookupRecord } from "../../models/lookup-record.model";


/**
 * Describes a form field which is mapped directly to a column on a different table
 *
 * TODO: determine if it's necessary to have the field, label, and value separated in this manner now that we've moved this
 *       data down to the field level. If it's not part of the FormSection then a lot of the logic surrounding this entity is
 *       probably superfluous.
 */
export interface ILinkedColumnDetails {
  linkedField: FormField,
  linkLabel: string,
  linkValue?: ILookupRecord
}
