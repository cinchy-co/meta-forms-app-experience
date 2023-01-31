import {
  debounceTime,
  distinctUntilChanged,
  startWith
} from "rxjs/operators";

import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatSelect, MatSelectChange } from "@angular/material/select";

import { faSearch } from "@fortawesome/free-solid-svg-icons";

import { ILookupRecord } from "src/app/models/lookup-record.model";

import { CinchyQueryService } from "../../services/cinchy-query.service";


@Component({
  selector: "app-search-dropdown",
  templateUrl: "./search-dropdown.component.html",
  styleUrls: ["./search-dropdown.component.scss"]
})
export class SearchDropdownComponent implements AfterViewInit, OnChanges {

  @Input() items: Array<ILookupRecord>;

  @Input() set selectedOption(value: ILookupRecord) {

    if (value) {
      this.selectedValue = value.id;
      this.selectedRecord = value;
    }
  };

  @Output() dropdownClicked: EventEmitter<any> = new EventEmitter();

  /** Fires whenever a filter value resolves */
  @Output() onFilter: EventEmitter<string> = new EventEmitter<string>();

  displayItems: Array<ILookupRecord>;

  /**
   * The ID of the active record
   */
  selectedValue: number;

  /**
   * The record associated with the selected value
   */
  selectedRecord: ILookupRecord;

  /**
   * Form control for the filter string
   */
  filterCtrl: FormControl = new FormControl();


  faSearch = faSearch;


  /**
   * Determines whether or not there are more records in the set than are being displayed by the control
   */
  get hasAdditionalRecords(): boolean {

    return (this.items?.length > CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT);
  }


  /**
   * Determines whether or not the whole list contains only a single item
   */
  get hasSingleRecord(): boolean {

    return (this.items.length === 1 && !this.filterCtrl.value);
  }


  /**
   * Returns true is the item list only contains the placeholder item for an empty result
   */
  get noRecordsAfterFilter(): boolean {

    return (this.items?.length === 1 && this.items[0].id === -1);
  }


  constructor() {}


  ngAfterViewInit() {

    // listen for search field value changes
    this.filterCtrl.valueChanges.pipe(
      startWith(""),
      distinctUntilChanged(),
      debounceTime(500),
    )
    .subscribe(() => {

      this.onFilter.emit(this.filterCtrl.value);
    });

    // Only fetch the first batch of records after the component has initialized
    this.onFilter.emit(this.filterCtrl.value);

    // DEBUG
    console.log("afterViewInit");
  }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.items) {
      this.setDisplayItems();
    }
  }


  /**
   * Determines if the given LookupRecord matches the selected value
   */
  compareFn(option: ILookupRecord, value: number): boolean {

    return (value && option.id === value);
  }


  /**
   * Runs when the user selects an item from the dropdown
   */
  onSelect(event: MatSelectChange) {

    this.setDisplayItems();

    this.selectedRecord = this.displayItems.find((value: ILookupRecord) => {

      return value.id = event.value;
    });

    this.dropdownClicked.emit(this.selectedRecord);

    // DEBUG
    console.log("-----");
    console.log(this.selectedValue);
    console.log(this.selectedRecord);
  }


  /**
   * Sets up the set of options to be displayed
   */
  setDisplayItems() {

    let displayItems = this.selectedRecord ? [this.selectedRecord] : [];

    if (this.items) {
      const resolvedItems = this.hasAdditionalRecords ? this.items.slice(0, CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT) : this.items;

      displayItems = displayItems.concat(resolvedItems.filter((item: ILookupRecord) => {

        return (item.id !== this.selectedValue);
      }));
    }

    this.displayItems = displayItems.slice();
  }


  /**
   * Resets the dropdown to its default state
   */
  resetDropdown() {

    this.filterCtrl.setValue(undefined);
    this.onSelect(undefined);
  }
}
