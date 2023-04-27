import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { IDropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";

import { faListUl } from "@fortawesome/free-solid-svg-icons";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";


//#region Cinchy Dynamic Choice Field
/**
 * This section is used to create choice field.
 */
//#endregion
@Component({
  selector: "cinchy-choice",
  templateUrl: "./choice.component.html",
  styleUrls: ["./choice.component.scss"]
})
export class ChoiceComponent implements OnInit {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  choiceFilter: string;
  showError: boolean;
  value: string;
  options: Array<DropdownOption>;

  faListUl = faListUl;


  get canEdit(): boolean {

    if (this.isDisabled) {
      return false;
    }

    return (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  async ngOnInit() {

    const choices = this.field.cinchyColumn.choiceOptions;
    const splitFromInvertedCommas = choices?.split(`"`) ?? [];

    let allOptions = [];
    let optionsInSubString = [];

    if (splitFromInvertedCommas.length === 1) {
      allOptions = choices?.split(",") ?? null;
    }
    else {
      splitFromInvertedCommas.forEach(option => {

        if (option && (option[0] === "," || option[option.length - 1] === ",")) {
          optionsInSubString = option.split(",");
          allOptions = [...allOptions, ...optionsInSubString];
        }
        else if (option) {
          allOptions.push(option);
        }
      })
    }

    allOptions = allOptions.filter(n => n);

    this.options = allOptions.slice();

    this.onChange.emit({
      additionalPropertiesToUpdate: [
        {
          propertyName: "dropdownDataset",
          propertyValue: new IDropdownDataset(allOptions)
        }
      ],
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value,
      sectionIndex: this.sectionIndex,
      targetTableName: this.targetTableName
    });
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


  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event.value;
    this.field.value = event.value;
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value,
      "event": event,
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.onChange.emit(callback);
  }
}
