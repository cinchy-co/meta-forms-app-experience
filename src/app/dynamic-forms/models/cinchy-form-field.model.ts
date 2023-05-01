import { Observable } from "rxjs";
import { map, startWith, isEmpty } from "rxjs/operators";

import { FormControl } from "@angular/forms";

import { CinchyColumn } from "./cinchy-column.model";
import { Form } from "./cinchy-form.model";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";


export class FormField {

  formControl: FormControl;
  filteredValues: Observable<DropdownOption[]>;
  hide: boolean = false;

  value: any;

  constructor(
      public id: number,
      public label: string,
      public caption: string,
      public childForm: Form,
      public cinchyColumn: CinchyColumn,
      public form: Form,
      public dropdownDataset?: DropdownDataset,
      public noPreselect?: boolean
  ) {

    if (cinchyColumn.dataType === "Link" && dropdownDataset) {
      this.formControl = new FormControl();
      this.filteredValues = this.formControl.valueChanges.pipe(startWith(""), map(value => this._filter(value)));
    }
  }


  autoCompleteValueMapper = (id) => {

    let selection = this.dropdownDataset?.options.find(e => e.id === id);

    if (selection)
      return selection.label;
  };


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

    if (!isNullOrUndefined(this.formControl)) {
      this.formControl.setValue(this.value);
    }
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
