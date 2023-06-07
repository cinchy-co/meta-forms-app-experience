import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith } from "rxjs/operators";

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";

import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { AddNewEntityDialogComponent } from "../../../dialogs/add-new-entity-dialog/add-new-entity-dialog.component";

import { DataFormatType } from "../../enums/data-format-type";

import { IFieldChangedEvent } from "../../interface/field-changed-event";
import { INewEntityDialogResponse } from "../../interface/new-entity-dialog-response";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { AppStateService } from "../../../services/app-state.service";
import { CinchyQueryService } from "../../../services/cinchy-query.service";
import { ConfigService } from "../../../services/config.service";
import { DialogService } from "../../../services/dialog.service";

import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";

import { isNullOrUndefined } from "util";

import { NumeralPipe } from "ngx-numeral";
import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";


/**
 * This section is used to create Link field for the cinchy.
 * Lazy loading of the dropdown is used here. Bind dropdown on click
 */
@Component({
  selector: "cinchy-link",
  templateUrl: "./link.component.html",
  styleUrls: ["./link.component.scss"],
  providers: [DropdownDatasetService]
})
export class LinkComponent implements OnChanges, OnInit {

  @ViewChild("searchInput") searchInput;
  @ViewChild("fileInput") fileInput: ElementRef;
  @ViewChild("t") public tooltip: NgbTooltip;

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() formFieldMetadataResult: any;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
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
  @Output() childform = new EventEmitter<any>();


  // TODO: Add proper types to these
  downloadLink;
  downloadableLinks;
  metadataQueryResult;

  charactersAfterWhichToShowList: number = 0;
  createlinkOptionName: boolean;
  filteredOptions: Array<DropdownOption>;
  isCursorIn: boolean = false;
  isLoading: boolean = false;
  showActualField: boolean;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  tableSourceURL: string;

  autocompleteText: string;
  selectedValue: DropdownOption;

  clearOption = new DropdownOption("", "");

  renderImageFiles = true;

  faPlus = faPlus;
  faShareAlt = faShareAlt;
  faSitemap = faSitemap;


  private _filterChanged = new Subject<string>();


  get canAdd(): boolean {

    return coerceBooleanProperty(this.field.cinchyColumn.createlinkOptionFormId);
  }


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get searchCharacterLimitMet(): boolean {

    return coerceBooleanProperty(
      !isNullOrUndefined(this.charactersAfterWhichToShowList) &&
      (this.autocompleteText?.length >= this.charactersAfterWhichToShowList)
    );
  }


  get tooltipText(): string {

    return this.charactersAfterWhichToShowList ?
      `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown list of items. You have to select from the dropdown to update this field` :
      "";
  }


  constructor(
    private _appStateService: AppStateService,
    private _cinchyQueryService: CinchyQueryService,
    private _cinchyService: CinchyService,
    private _configService: ConfigService,
    private _dialogService: DialogService,
    private _dropdownDatasetService: DropdownDatasetService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _spinner: NgxSpinnerService,
    private _toastr: ToastrService
  ) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnInit(): void {

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = `${url}/Tables/${this.field.cinchyColumn.linkTargetTableId}`;

    this._setValue();

    if (this.isInChildForm && this.field.cinchyColumn.linkedFieldId) {
      this.setWhenNewRowAddedForParent();
    }

    this._appStateService.addNewEntityDialogClosed$.subscribe((value: INewEntityDialogResponse) => {

      if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]["Table"] === value.tableName) {
        this.filteredOptions = null;
        this.getListItems(true);
      }
    });

    this._filterChanged.pipe(
      startWith(""),
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe({
      next: (value: string) => {

        this.filteredOptions = this._filter(value);
      }
    });
  }


  checkForAttachmentUrl(): void {

    this.downloadLink = coerceBooleanProperty(this.field.cinchyColumn.attachmentUrl);

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValue) {
      const replacedCinchyIdUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
      const replacedFileIdUrl = replacedCinchyIdUrl.replace("@fileid", this.selectedValue.id);
      const selectedValuesWithUrl = { fileName: this.selectedValue.label, fileUrl: replacedFileIdUrl, fileId: this.selectedValue.id };

      this.downloadableLinks = [selectedValuesWithUrl];
    }
  }


  checkForDisplayColumnFormatter(): void {

    if (
        this.field.cinchyColumn.isDisplayColumn &&
        this.field.cinchyColumn.numberFormatter &&
        this.selectedValue
    ) {
      const numeralValue = new NumeralPipe(this.selectedValue.label);
      const stringValue = numeralValue.format(this.field.cinchyColumn.numberFormatter);

      this.selectedValue.label = stringValue;
      this.autocompleteText = stringValue;
    }
  }


  clearSelectedValue(event: KeyboardEvent): void {

    const key = event.key;

    // At this point in the lifecycle, NgModel has not resolved, so we force it to detect changes so that we can accurately
    // read the current state of this.autocompleteText
    this._changeDetectorRef.detectChanges();

    if (key === "Delete" || (key === "Backspace" && this.autocompleteText?.length === 0)) {
      this.autocompleteText = '';
      this.selectedValue = this.clearOption;

      this.valueChanged();
      this.filterChanged();
    }
  }


  closeTooltip(tooltip): void {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  fileNameIsImage(fileName: string) {

    const lowercase = fileName.toLowerCase();

    return lowercase.endsWith(".png") ||
      lowercase.endsWith(".jpg") ||
      lowercase.endsWith(".jpeg") ||
      lowercase.endsWith(".gif") ||
      lowercase.endsWith(".svg");
  }


  filterChanged(): void {

    this._filterChanged.next(this.autocompleteText || null);
  }


  getAndSetLatestFileValue(): void {

    this._cinchyQueryService.getFilesInCell(
      this.field.cinchyColumn.name,
      this.field.cinchyColumn.domainName,
      this.field.cinchyColumn.tableName,
      this.form.rowId
    ).subscribe(
      {
        next: (resp) => {

          if (resp?.length) {

            this.selectedValue = new DropdownOption(resp[0].fileId?.toString(), resp[0].fileName);

            const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
            const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", resp[0].fileId?.toString());

            this.downloadableLinks = [
              {
                fileName: resp[0].fileName,
                fileUrl: fileUrl,
                fileId: resp[0].fileId
              }
            ];

            this.valueChanged();
          }
        }
      }
    );
  }


  async getListItems(updateList: boolean, fromLinkedField?: boolean): Promise<void> {

    if (
        !this.field.dropdownDataset?.options?.length ||
        this.field.dropdownDataset?.isDummy ||
        (!this.filteredOptions?.length && !this.autocompleteText && this.searchCharacterLimitMet)
    ) {
      this.isLoading = true;

      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson;
      let tableColumnQuery: string = `select tc.[Table].[Domain].[Name] as 'Domain', tc.[Table].[Name] as 'Table', tc.[Name] as 'Column' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy ID] = ${this.field.cinchyColumn.linkTargetColumnId}`;

      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.formFieldsJsonData);

      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }

      if (!isNullOrUndefined(this.field.cinchyColumn.linkTargetColumnId)) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(
          this.field.cinchyColumn.linkTargetColumnId,
          this.field.label,
          currentFieldJson,
          this.field.cinchyColumn.dropdownFilter,
          this.form.rowId,
          updateList
        );

        this.form.updateFieldAdditionalProperty(
          this.sectionIndex,
          this.fieldIndex,
          {
            propertyName: "dropdownDataset",
            propertyValue: this.getSortedList(dropdownDataset)
          }
        );

        this.charactersAfterWhichToShowList = this.field.dropdownDataset?.options?.length > 2000 ? 3 : 0;
        this.filteredOptions = this._filter(this.autocompleteText);

        if (fromLinkedField) {
          this._setValue();
        }
      }

      this.isLoading = false;
    }
  }


  /**
   * Removes options with empty labels from the given dataset, and then sorts the remaining options by label
   */
  getSortedList(dropdownDataset: DropdownDataset): DropdownDataset {

    if (dropdownDataset?.options?.length) {
      return new DropdownDataset(
        dropdownDataset.options.filter((option: DropdownOption) => {

          return coerceBooleanProperty(option.label);
        }).sort((a: DropdownOption, b: DropdownOption) => {

          var lblA = a.label?.toString()?.toLocaleLowerCase() ?? '';
          var lblB = b.label?.toString()?.toLocaleLowerCase() ?? '';
          return (lblA.localeCompare(lblB));
        }),
        dropdownDataset.isDummy
      );
    }

    return dropdownDataset;
  }


  onDeleteFile(): void {

    this.selectedValue = null;
    this.autocompleteText = "";

    this.downloadableLinks = [];

    this.valueChanged();
  }


  onFileSelected(event: Event): void {

    if ((event?.target as HTMLInputElement)?.files?.length) {
      if (this.form.rowId) {
        const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId.toString());

        this._cinchyQueryService.uploadFiles(Array.from((event.target as HTMLInputElement).files), uploadUrl).subscribe(
          {
            next: () => {

              this._toastr.success("File uploaded", "Success");
              this.fileInput.nativeElement.value = "";
              this.getAndSetLatestFileValue();
            },
            error: () => {

              this._toastr.error("Could not upload the file", "Error");
            }
          }
        );
      }
      else {
        console.error("No rowId was provided, so attempting to upload the selected file will result in an error");
      }
    }
    else {
      console.warn("The application attempted to upload an empty file set.");
      console.warn(event);
    }
  }


  /**
   * Resolves the selectedValue when the user selects an option from the autocomplete
   */
  onOptionSelected(option: DropdownOption): void {

    // We don't need to explicitly set autocompleteText because the value of the selected option already does that
    this.selectedValue = option;

    this.valueChanged();
  }


  openNewOptionDialog(): void {

    const newOptionDialogRef = this._dialogService.openDialog(AddNewEntityDialogComponent, {
      createLinkOptionFormId: this.field.cinchyColumn.createlinkOptionFormId,
      createLinkOptionName: this.field.cinchyColumn.createlinkOptionName
    });

    this._spinner.hide();

    newOptionDialogRef.afterClosed().subscribe((value: INewEntityDialogResponse) => {

      if (value) {
        this._appStateService.addNewEntityDialogClosed$.next(value);
      }
    });
  }


  openTooltip(tooltip: NgbTooltip): void {

    tooltip.open();

    this.tooltip = tooltip;

    if (tooltip.isOpen()) {
      const tooltipElement = document.getElementsByTagName("ngb-tooltip-window");

      if (tooltipElement[0]) {
        tooltipElement[0].addEventListener("mouseleave", this.removeTooltipElement.bind(this));
        tooltipElement[0].addEventListener("mouseenter", this.setTooltipCursor.bind(this));
      }
    }
  }


  removeTooltipElement(): void {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  setToLastValueSelected(): void {

    this.autocompleteText = this.selectedValue?.label || "";
  }


  setTooltipCursor(): void {

    this.isCursorIn = true;
  }


  setWhenNewRowAddedForParent(): void {

    this.form.updateFieldValue(
      this.sectionIndex,
      this.fieldIndex,
      this.form.rowId,
      [
        {
          propertyName: "hasChanged",
          propertyValue: true
        }
      ]
    );

    this.isDisabled = true;
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.selectedValue?.id || null,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _filter(value: string): DropdownOption[] {

    if (this.field.dropdownDataset?.options?.length && this.searchCharacterLimitMet) {
      if (value) {
        // This is outside of the loop for performance reasons
        const lowercaseFilterValue = value.toLowerCase();

        return this.field.dropdownDataset.options.filter((option: DropdownOption) => {

          return option.label?.toLowerCase()?.includes(lowercaseFilterValue);
        });
      }
      else {
        return this.field.dropdownDataset.options;
      }
    }

    return [];
  }


  /**
   * Sets the initial value of the control based on the field's value.
   *
   * @param fromGetListItems Used to ensure we won't get an infinite loop if getListItems isn't able to populate dataset
   */
  private _setValue(fromGetListItems?: boolean): void {

    const dataset: Array<DropdownOption> = this.field.dropdownDataset?.options || null;

    // If the dataset isn't populated yet, we won't be able to get the correct value, so we'll try to
    // populate it and then try again
    if (!dataset?.length && !fromGetListItems) {
      this.getListItems(true, true);
    }
    else {
      if (this.field.value) {
        // Handles the case where there is a placeholder element (e.g. "Loading...")
        if (dataset?.length === 1) {
          this.selectedValue = { ...dataset[0] };
        }
        // Otherwise, searches the dataset for the option that matches the current selection
        else if (dataset?.length > 1) {
          this.selectedValue = dataset.find((option: DropdownOption) => {

            // TODO: We're explicitly using a double equals here because at this stage the ID may be either a number or string depending on where it was
            //       populated. In the future we'll need to figure out which is correct and make sunre we're using it consistently
            return (option.id == this.field.value);
          });
        }
        // If the field has a value but the dataset for some reason does not, use the previously-selected value, if any
        else {
          this.selectedValue = this.selectedValue ?? null;
        }
      }
      // If the field doesn't have a value, clear the selected value
      else {
        this.selectedValue = null;
      }

      this.autocompleteText = this.selectedValue?.label || "";

      this.valueChanged();

      this.checkForAttachmentUrl();
      this.checkForDisplayColumnFormatter();
    }
  }
}
