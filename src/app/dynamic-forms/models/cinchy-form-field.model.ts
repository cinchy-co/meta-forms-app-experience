import { Observable } from "rxjs";
import { map, startWith, isEmpty } from "rxjs/operators";

import { FormControl } from "@angular/forms";

import { CinchyColumn } from "./cinchy-column.model";
import { Form } from "./cinchy-form.model";

import { ILinkedColumnDetails } from "../interface/linked-column-details";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";
import { coerceBooleanProperty } from "@angular/cdk/coercion";


export class FormField {

  // TODO: are these fields necessary?
  formControl: FormControl;
  filteredValues: Observable<DropdownOption[]>;

  hide: boolean = false;

  linkedColumn: ILinkedColumnDetails;

  value: any;

  constructor(
      public id: number,
      public label: string,
      public caption: string,
      public childForm: Form,
      public cinchyColumn: CinchyColumn,
      public form: Form,
      public dropdownDataset?: DropdownDataset,
      linkedColumnDetails?: ILinkedColumnDetails
  ) {

    if (cinchyColumn.dataType === "Link" && dropdownDataset) {
      this.formControl = new FormControl();
      this.filteredValues = this.formControl.valueChanges.pipe(startWith(""), map(value => this._filter(value)));
    }

    this.linkedColumn = linkedColumnDetails;
  }


  autoCompleteValueMapper = (id) => {

    let selection = this.dropdownDataset?.options.find(e => e.id === id);

    if (selection)
      return selection.label;
  };


  clone(): FormField {

    const clonedField = new FormField(
      this.id,
      this.label,
      this.caption,
      this.childForm,
      this.cinchyColumn,
      this.form,
      this.dropdownDataset,
      this.linkedColumn
    );

    clonedField.hide = this.hide;
    clonedField.value = this.value;

    clonedField.formControl = this.formControl;
    clonedField.filteredValues = this.filteredValues;

    return clonedField;
  }


  isLinkedColumn(key: string): boolean {

    return coerceBooleanProperty(this.linkedColumn?.linkLabel === key);
  }


  setInitialValue(value: any) {

    if (this.cinchyColumn.dataType === "Date and Time" && !isNullOrUndefined(value)) {
      this.value = new Date(value);
    }
    else if (this.cinchyColumn.dataType === "Choice" && !isNullOrUndefined(value) && this.cinchyColumn.isMultiple) {
      let multiChoiceData = new Array();

      for (let selected of value) {
        multiChoiceData.push(selected.itemName);
      }

      this.value = multiChoiceData;
    }
    else if (value && this.cinchyColumn.dataType === "Link" && this.cinchyColumn.isMultiple && !Array.isArray(value)) {
      this.value = value?.split(",").map((item) => {

        return item.trim ? item.trim() : item;
      });
    }
    else {
      this.value = value ?? [];
    }

    this.formControl?.setValue(this.value);
  }


  private _filter (filter: string) {

    const lowercaseFilter = filter?.toLowerCase() || "";

    return this.dropdownDataset?.options.filter((option: DropdownOption) => {

      if (!lowercaseFilter || option.label?.toLowerCase().includes(lowercaseFilter)) {
        return option;
      }
    });
  }
}
