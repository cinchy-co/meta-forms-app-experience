import { Component, EventEmitter, Input, Output } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faListUl } from "@fortawesome/free-solid-svg-icons";
import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";


/**
 * This section is used to create Multi choice driopdownList
 */
@Component({
    selector: "cinchy-multi-choice",
    templateUrl: "./multichoice.component.html",
    styleUrls: ["./multichoice.component.scss"]
})
export class MultichoiceComponent {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  choiceFilter: string;
  showError: boolean;
  value: Array<string>;

  faListUl = faListUl;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  ngOnInit(): void {

    this.value = Array.isArray(this.field.value) ?
      this.field.value :
      (this.field.value ? [this.field.value] : null);

    if (this.field.cinchyColumn.choiceOptions) {
      const allOptions = this.field.cinchyColumn.choiceOptions.split(",").map((option: string) => {

        return new DropdownOption(option, option);
      });

      this.onChange.emit({
        additionalPropertiesToUpdate: [
          {
            propertyName: "dropdownDataset",
            propertyValue: new DropdownDataset(allOptions)
          }
        ],
        form: this.form,
        fieldIndex: this.fieldIndex,
        newValue: this.value,
        sectionIndex: this.sectionIndex,
        targetTableName: this.targetTableName
      });
    }
  }


  resetFilter() {

    this.choiceFilter = "";
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value ?? [],
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }
}
