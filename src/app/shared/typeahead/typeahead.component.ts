import {Component, EventEmitter, forwardRef, Input, OnInit, Output} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR} from '@angular/forms';
import {startWith} from 'rxjs/operators';
import {IContact} from "../../models/state.model";

@Component({
  selector: 'app-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeaheadComponent),
      multi: true
    }
  ]
})
export class TypeaheadComponent implements OnInit, ControlValueAccessor {
  @Input() customPlaceholder;
  @Input() selectedOption;
  @Input() showReadOnly = true;
  @Input() showAddNewContact = true;
  @Input() charactersAfterWhichToShowList = 3;
  @Input() showToolTip = true;
  @Input() sentiment: string;

  @Input('fullList') set fullList(list: IContact[]) {  // Full list needs to have key ''fullName'
    const addNewListItem = {fullName: 'Add New Contact', id: 'addNewItem'};
    this.listWithAddNew = [...list];
    // tslint:disable-next-line:no-unused-expression
    this.showAddNewContact ? this.listWithAddNew.push(addNewListItem) : null;
  }

  @Output() addNewItemClicked = new EventEmitter();

  myControl = new FormControl();
  listWithAddNew;
  filteredOptions;
  toolTipMessage

  writeValue(value: any) {
    // Setting the full object as value because of displayFn
    this.myControl.setValue(value);
  }

  propagateChange = (_: any) => {
  }

  registerOnChange(fn) {
    this.propagateChange = fn;
  }

  registerOnTouched() {
  }

  constructor() {
  }

  ngOnInit(): void {
    this.onInputChange();
    this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown
     list of item. You have to select from the dropdown to update this field`;
  }

  onInputChange() {
    this.myControl.valueChanges.pipe(
      startWith('')).subscribe(value => {
      if (value && typeof value === 'string') {
        this.selectedOption = null;
        this.propagateChange(null);
      }
      this.filteredOptions = this._filter(value);
    });
  }

  onContactSelected(selectedOption) {
    if (selectedOption.id === 'addNewItem') {
      this.addNewItemClicked.emit();
      this.myControl.setValue('');
    } else {
      this.selectedOption = selectedOption;
      this.propagateChange(selectedOption);
    }
  }

  displayFn(contact): string {
    return contact && contact.fullName ? contact.fullName : '';
  }

  private _filter(value: any): string[] {
    if (value && this.listWithAddNew) {
      let filterValue = TypeaheadComponent.getFilterValue(value);
      // Filtering out addNewItem because multiple inputs can cause race condition
      if (this.showAddNewContact) {
        return this.listWithAddNew.filter(option => option && option.fullName
          ? option.fullName.toLowerCase().includes(filterValue) || option.id === 'addNewItem' : null);
      }
      return this.listWithAddNew.filter(option => option && option.fullName
        ? option.fullName.toLowerCase().includes(filterValue) && option.id !== 'addNewItem' : null);
    }
    return [];
  }

  static getFilterValue(value) {
    if (typeof value === 'object') {
      return value.fullName ? value.fullName.toLowerCase() : '';
    }
    return value.toLowerCase();
  }

}
