import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith } from "rxjs/operators";

import {
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
import { MatAutocomplete, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";

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

  @ViewChild("auto") autocompleteOptions: MatAutocomplete;
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


  autocompleteText: string = "";
  charactersAfterWhichToShowList = 0;
  createlinkOptionName: boolean;
  downloadLink;
  downloadableLinks;
  dropdownSetOptions: Array<DropdownOption>;
  filteredOptions;
  isCursorIn: boolean = false;
  isLoading;
  metadataQueryResult;
  showActualField: boolean;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  tableSourceURL: string;

  selectedValue: DropdownOption;

  renderImageFiles = true;

  faPlus = faPlus;
  faShareAlt = faShareAlt;
  faSitemap = faSitemap;

  private _filterChanged = new Subject<string>();


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get optionViewportScrolls(): boolean {

    return coerceBooleanProperty(
      this.charactersAfterWhichToShowList &&
      (this.autocompleteText?.length >= this.charactersAfterWhichToShowList)
    );
  }


  get tooltipMessage(): string {

    return `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown list of items. You have to select from the dropdown to update this field`;
  }


  constructor(
    private _dropdownDatasetService: DropdownDatasetService,
    private _cinchyService: CinchyService,
    private _dialogService: DialogService,
    private _appStateService: AppStateService,
    private _cinchyQueryService: CinchyQueryService,
    private _configService: ConfigService,
    private _toastr: ToastrService
  ) { }


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

    this.createlinkOptionName = this.field.cinchyColumn.createlinkOptionFormId ? true: false;

    this._appStateService.addNewEntityDialogClosed$.subscribe((value: INewEntityDialogResponse) => {

      if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]["Table"] === value.tableName) {
        this.filteredOptions = null;
        this.getListItems(true);

        this.form.updateFieldAdditionalProperty(
          this.sectionIndex,
          this.fieldIndex,
          {
            cinchyColumn: true,
            propertyName: "hasChanged",
            propertyValue: true
          }
        );
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

      this.selectedValue.label = numeralValue.format(this.field.cinchyColumn.numberFormatter);
    }
  }


  closeTooltip(tooltip: NgbTooltip): void {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  deleteDropdownVal(event: KeyboardEvent): void {

    const key = event.key;

    if ((key === "Delete" || key === "Backspace") && this.getSelectedText()) {
      this.selectedValue = this.field.dropdownDataset.options.find(item => item.id === "DELETE");
      this.autocompleteText = "";

      this.valueChanged();
    }
  }


  displayFn(option: DropdownOption): string {

    return (option?.label ?? "");
  }


  fileNameIsImage(fileName: string): boolean {

    const lowercase = fileName.toLowerCase();

    return lowercase.endsWith(".png") ||
      lowercase.endsWith(".jpg") ||
      lowercase.endsWith(".jpeg") ||
      lowercase.endsWith(".gif") ||
      lowercase.endsWith(".svg");
  }


  filterChanged(): void {

    this._filterChanged.next(this.autocompleteText);
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

    if (!this.filteredOptions?.length || updateList) {
      this.isLoading = true;

      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson;
      let tableColumnQuery: string = `select tc.[Table].[Domain].[Name] as 'Domain', tc.[Table].[Name] as 'Table', tc.[Name] as 'Column' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = ${this.field.cinchyColumn.linkTargetColumnId}`;

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

        this.field.dropdownDataset = this.getSortedList(dropdownDataset);
        this.dropdownSetOptions = this.field.dropdownDataset.options || [];

        if (this.form.rowId) {
          const emptyOption = new DropdownOption("DELETE", "", "");

          this.dropdownSetOptions.unshift(emptyOption);
        }

        this.charactersAfterWhichToShowList = this.dropdownSetOptions.length > 2000 ? 3 : 0;
        this.filteredOptions = this.dropdownSetOptions;

        if (fromLinkedField) {
          this._setValue(true);
        }
      }

      this.isLoading = false;

      if (!fromLinkedField && !updateList) {
        // this.focusAndBlurInputToShowDropdown();
      }
    }
  }


  /**
   * @returns the text that the user currently has selected, if any
   */
  getSelectedText(): string {

    if (window.getSelection) {
      return window.getSelection().toString();
    }

    return "";
  }


  getSortedList(dropdownDataset: DropdownDataset): DropdownDataset {

    let filteredOutNullSets;

    if (dropdownDataset?.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);

      return new DropdownDataset(
        filteredOutNullSets.sort((a: DropdownOption, b: DropdownOption) => {
          return (
            a.label.toLowerCase().localeCompare(b.label.toLowerCase())
          );
        })
      );
    }

    return dropdownDataset;
  }


  /**
   * Sets the selected value of the field to match that selected in the dropdown. This is necessary because the input itself
   * has its value set to a string to faciliate searching, so the value of the option being selected is merely its label.
   */
  listItemSelected(event: MatAutocompleteSelectedEvent): void {

    this.selectedValue = this.dropdownSetOptions.find((option: DropdownOption) => {

      return (option.label === event.option.value);
    });

    this.autocompleteText = this.selectedValue?.label ?? "";

    this.valueChanged();
  }


  onDeleteFile() {

    this.selectedValue = null;

    this.downloadableLinks = [];

    this.valueChanged();
  }


  onFileSelected(event: Event) {

    if ((event?.target as HTMLInputElement)?.files?.length) {
      const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId?.toString());

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
  }


  openChildDialog() {

    const newOptionDialogRef = this._dialogService.openDialog(
      AddNewEntityDialogComponent,
      {
        formId: this.field.cinchyColumn.createlinkOptionFormId,
        title: this.field.cinchyColumn.createlinkOptionName
      }
    );

    newOptionDialogRef.afterClosed().subscribe((value: INewEntityDialogResponse) => {

      if (value) {
        this._appStateService.addNewEntityDialogClosed$.next(value);
      }
    });
  }


  openTooltip(tooltip) {

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

    // Prevents the blur event from resolving if the user clicked one of the options
    if (!this.autocompleteOptions.isOpen) {
      setTimeout(() => {

        if (!this.selectedValue) {
          this.selectedValue = this.field.dropdownDataset?.options.find(item => item.id === "DELETE");
          this.autocompleteText = "";

          this.valueChanged();
        }
      }, 300);
    }
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
          propertyName: "noPreselect",
          propertyValue: false
        },
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


  /**
   * Filters the option set such that the results are only those that contain the given string in their label
   */
  private _filter(value: string): Array<DropdownOption> {

    if (value && this.dropdownSetOptions?.length) {
      const filterValue = value.toLowerCase();

      return this.dropdownSetOptions.filter((option: DropdownOption) => {

        return ((option.label?.toLowerCase) ? option.label.toLowerCase().includes(filterValue) : null);
      });
    }

    return this.dropdownSetOptions ?? [];
  }


  private _setValue(force?: boolean): void {

    if (this.field.noPreselect && !force) {
      this.selectedValue = null;
      this.autocompleteText = "";
    }
    else {
      const preselectedValArr = this.field.dropdownDataset?.options || null;

      if (preselectedValArr?.length > 1 || this.isInChildForm) {
        this.selectedValue = preselectedValArr.find(item => item.id === this.field.value);
      } else {
        this.selectedValue = preselectedValArr && preselectedValArr[0] ? { ...preselectedValArr[0] } : null;
      }

      this.autocompleteText = this.selectedValue?.label ?? "";

      this.valueChanged();

      this.checkForAttachmentUrl();
      this.checkForDisplayColumnFormatter();
    }
  }
}

