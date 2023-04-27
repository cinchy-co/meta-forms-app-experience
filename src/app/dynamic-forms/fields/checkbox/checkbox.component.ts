import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faCheckSquare } from "@fortawesome/free-regular-svg-icons";


/**
 * This section is used to create Yes/No fields for cinchy
 */
@Component({
  selector: "cinchy-checkbox",
  templateUrl: "./checkbox.component.html",
  styleUrls: ["./checkbox.component.scss"]
})
export class CheckboxComponent implements OnChanges {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  showError: boolean;
  value: boolean;

  faCheckSquare = faCheckSquare;


  get canEdit(): boolean {

    if (this.isDisabled) {
      return false;
    }

    return (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.field) {
      this.value = coerceBooleanProperty(this.field?.value);
    }
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }
}
