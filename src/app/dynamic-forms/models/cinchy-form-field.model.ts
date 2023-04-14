import { Observable } from "rxjs";
import { map, startWith, isEmpty } from "rxjs/operators";

import { FormControl } from "@angular/forms";

import { ICinchyColumn } from "./cinchy-column.model";
import { IForm } from "./cinchy-form.model";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";


export interface IFormField {
  // definition
  id: number;
  label: string;
  caption: string;
  childForm: IForm;
  cinchyColumn: ICinchyColumn;
  // value
  value: any;
  formControl: FormControl;
  form: IForm;

  hide: boolean;
  // functions
  setInitialValue(value: any);
}

export class FormField implements IFormField {
  value: any;
  formControl: FormControl;
  filteredValues: Observable<DropdownOption[]>;
  hide: boolean = false;

  private _dropdownDataset: DropdownDataset;

  constructor(
      public id: number,
      public label: string,
      public caption: string,
      public childForm: IForm,
      public cinchyColumn: ICinchyColumn,
      dropdownDataset: DropdownDataset,
      public form: IForm
  ) {

    this._dropdownDataset = dropdownDataset;

    if (cinchyColumn.dataType == "Link" && !isNullOrUndefined(this._dropdownDataset)) {
      this.formControl = new FormControl();
      this.filteredValues = this.formControl.valueChanges.pipe(startWith(""), map(value => this._filter(value)));
    }
  }


  autoCompleteValueMapper = (id) => {

    let selection = this._dropdownDataset.options.find(e => e.id === id);

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
    else if (value && this.cinchyColumn.dataType === "Link" && this.cinchyColumn.isMultiple) {
      this.value = value.split(",").map((item) => {

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


  private _filter(searchTxt: string) {
    const filterValue = (typeof searchTxt.toLowerCase === "function") ? searchTxt.toLowerCase() : searchTxt;

    return this._dropdownDataset.options.filter(option => {
      if (!isNullOrUndefined(option.label) && option.label !== "") {
        if (option.label.toLowerCase().includes(filterValue)) {
          return option;
        }
      }

    });
  }
}
