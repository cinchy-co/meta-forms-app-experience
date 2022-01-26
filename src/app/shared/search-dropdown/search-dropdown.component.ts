import {
  AfterViewInit,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {FormControl, NG_VALUE_ACCESSOR} from '@angular/forms';
import {MatSelect} from '@angular/material/select';
import {ReplaySubject, Subject} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';
import { ILookupRecord } from 'src/app/models/lookup-record.model';


@Component({
  selector: 'app-search-dropdown',
  templateUrl: './search-dropdown.component.html',
  styleUrls: ['./search-dropdown.component.scss']
})
export class SearchDropdownComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() fullList: ILookupRecord[];

  @Input() set selectedOption(value) {
    // set initial selection
    this.selectCtrl.setValue(value);
    this.selectedOptionVal = value;
    // this.moveSelectedItemToTop(value);
  };

  /** list of list */
  list;
  /** control for the selected bank */
  public selectCtrl: FormControl = new FormControl();

  /** control for the MatSelect filter keyword */
  public filterCtrl: FormControl = new FormControl();

  /** list of list filtered by search keyword */
  public filteredlist: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  @ViewChild('singleSelect', {static: true}) singleSelect: MatSelect;

  @Output() dropdownClicked: EventEmitter<any> = new EventEmitter();

  /** Subject that emits when the component has been destroyed. */
  protected _onDestroy = new Subject<void>();

  selectedOptionVal: any;
  maxSize = 3000;

  constructor() {
  }

  ngOnInit() {
    this.list = this.fullList;
    // load the initial bank list
    this.filteredlist.next(this.list.slice());

    // listen for search field value changes
    this.filterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterlist();
      });
  }

  ngAfterViewInit() {
    this.moveSelectedItemToTop(this.selectedOptionVal);
    this.setInitialValue();
  }

  optionSelected(option) {
    this.dropdownClicked.emit(option.value);
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  /**
   * Sets the initial value after the filteredlist are loaded initially
   */
  protected setInitialValue() {
    this.filteredlist
      .pipe(take(1), takeUntil(this._onDestroy))
      .subscribe(() => {
        this.singleSelect.compareWith = (a: any, b: any) => a && b && a.id === b.id;
      });
  }

  protected filterlist() {
    if (!this.list) {
      return;
    }
    // get the search keyword
    let search = this.filterCtrl.value;
    if (!search) {
      this.filteredlist.next(this.list.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the list
    this.filteredlist.next(
      this.list.filter(item => item.fullName ? item.fullName.toLowerCase().indexOf(search) > -1 : null)
    );
  }

  moveSelectedItemToTop(selectedItem) {
    if(this.list?.length && this.list?.length > this.maxSize){
      const itemInList = this.list.find(item => item.id === selectedItem.id);
      this.list = this.list.filter(item => item.id !== selectedItem.id);
      this.list.unshift(itemInList);
      setTimeout(() => {
        this.filteredlist.next(this.list.slice());
      }, 0);
    }
  }

}
