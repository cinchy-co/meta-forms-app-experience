import { debounceTime, take, takeUntil } from "rxjs/operators";

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatSelect } from "@angular/material/select";

import { ILookupRecord } from "src/app/models/lookup-record.model";

import { CinchyQueryService } from "../../services/cinchy-query.service";


@Component({
  selector: "app-search-dropdown",
  templateUrl: "./search-dropdown.component.html",
  styleUrls: ["./search-dropdown.component.scss"]
})
export class SearchDropdownComponent implements OnChanges, OnInit {

  @Input() items: Array<ILookupRecord>;

  @Input() set selectedOption(value) {

    this.selectCtrl.setValue(value);
  };

  @Output() dropdownClicked: EventEmitter<any> = new EventEmitter();

  /** Fires whenever a filter value resolves */
  @Output() onFilter: EventEmitter<string> = new EventEmitter<string>();

  @ViewChild("singleSelect", { static: true }) singleSelect: MatSelect;

  displayItems: Array<ILookupRecord>;

  /** control for the selected bank */
  selectCtrl: FormControl = new FormControl();

  /** control for the MatSelect filter keyword */
  filterCtrl: FormControl = new FormControl();

  placeholderText: string = "Select existing record";


  /**
   * Determines whether or not there are more records in the set than are being displayed by the control
   */
  get hasAdditionalRecords(): boolean {

    return (this.items?.length > CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT);
  }


  /**
   * Returns true is the item list only contains the placeholder item for an empty result
   */
  get noRecordsAfterFilter(): boolean {

    return (this.items?.length === 1 && this.items[0].id === -1);
  }


  constructor() {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.items) {
      this.setDisplayItems();
    }
  }


  ngOnInit() {

    // listen for search field value changes
    this.filterCtrl.valueChanges.pipe(
        debounceTime(500)
      )
      .subscribe(() => {

        this.onFilter.emit(this.filterCtrl.value);
      });
  }


  /**
   * Sets up the set of options to be displayed
   */
  setDisplayItems() {

    let displayItems = this.selectCtrl.value ? [this.selectCtrl.value] : [];

    if (this.items) {
      const resolvedItems = this.hasAdditionalRecords ? this.items.slice(0, CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT) : this.items;

      displayItems = displayItems.concat(resolvedItems.filter((item: ILookupRecord) => {

        return (item.id !== this.selectCtrl.value?.id);
      }));
    }

    this.displayItems = displayItems.slice();
  }


  /**
   * Resets the dropdown to its default state
   */
  resetDropdown() {

    this.filterCtrl.setValue(undefined);
    this.optionSelected(undefined);
  }


  optionSelected(option) {

    this.setDisplayItems();

    this.dropdownClicked.emit(option?.value);
  }
}
