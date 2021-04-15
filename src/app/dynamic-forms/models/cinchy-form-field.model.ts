import { ICinchyColumn } from './cinchy-column.model';
import { FormControl } from '@angular/forms';
import { DropdownDataset } from '../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset';
import { isNullOrUndefined } from 'util';
import { IDropdownOption, DropdownOption } from '../service/cinchy-dropdown-dataset/cinchy-dropdown-options';
import { Observable } from 'rxjs';
import { map, startWith, isEmpty } from 'rxjs/operators';
import { IForm } from './cinchy-form.model';

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
  // functions
  setInitialValue(value: any);
}

export class FormField implements IFormField {
  value: any;
  formControl: FormControl;
  private dropdownDataset: DropdownDataset;
  filteredValues: Observable<DropdownOption[]>;

  constructor(public id: number, public label: string, public caption: string,
    public childForm: IForm, public cinchyColumn: ICinchyColumn, dropdownDataset: DropdownDataset) {
    this.dropdownDataset = dropdownDataset;
    if (cinchyColumn.dataType == 'Link' && !isNullOrUndefined(this.dropdownDataset)) {
      this.formControl = new FormControl();
      this.filteredValues = this.formControl.valueChanges.pipe(startWith(''), map(value => this._filter(value)));
    }
  }

  private _filter(searchTxt: string) {
    const filterValue = (typeof searchTxt.toLowerCase === 'function') ? searchTxt.toLowerCase() : searchTxt;
    return this.dropdownDataset.options.filter(option => {
      if (!isNullOrUndefined(option.label) && option.label !== '') {
        if (option.label.toLowerCase().includes(filterValue)) {
          return option;
        }
      }

    });
  }

  setInitialValue(value: any) {
    if (this.cinchyColumn.dataType == 'Date and Time' && !isNullOrUndefined(value))
      this.value = new Date(value);
    else
      this.value = value;

    if (!isNullOrUndefined(this.formControl)) {
      this.formControl.setValue(this.value);
    }
  }

  autoCompleteValueMapper = (id) => {
    let selection = this.dropdownDataset.options.find(e => e.id === id);
    if (selection)
      return selection.label;
  };
}
