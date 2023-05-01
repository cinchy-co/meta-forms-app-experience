import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith } from "rxjs/operators";

import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from "@angular/core";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";

import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { AddNewOptionDialogComponent } from "../../../dialogs/add-new-option-dialog/add-new-option-dialog.component";

import { DataFormatType } from "../../enums/data-format-type";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

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
export class LinkComponent implements OnInit {

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
  toolTipMessage: string;
  updateList: boolean;

  selectedValue: DropdownOption;

  /**
   * The text displayed in the input, either as part of an active filter or the label of the current selectedValue
   */
  selectedValueText: string;

  renderImageFiles = true;

  faPlus = faPlus;
  faShareAlt = faShareAlt;
  faSitemap = faSitemap;

  private _filterChanged = new Subject<string>();


  get canEdit(): boolean {

    if (this.isDisabled) {
      return false;
    }

    return (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get optionViewportScrolls(): boolean {

    return coerceBooleanProperty(
      this.selectedValueText &&
      this.charactersAfterWhichToShowList &&
      (this.selectedValueText.length >= this.charactersAfterWhichToShowList)
    );
  }


  constructor(
    private _dropdownDatasetService: DropdownDatasetService,
    private _spinner: NgxSpinnerService,
    private _cinchyService: CinchyService,
    private _dialogService: DialogService,
    private _appStateService: AppStateService,
    private _cinchyQueryService: CinchyQueryService,
    private _configService: ConfigService,
    private _toastr: ToastrService
  ) {}


  ngOnInit(): void {

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = `${url}/Tables/${this.field.cinchyColumn.linkTargetTableId}`;

    this.setSelectedValue();

    if (this.isInChildForm && this.field.cinchyColumn.linkedFieldId) {
      this.setWhenNewRowAddedForParent();
    }

    this.createlinkOptionName = this.field.cinchyColumn.createlinkOptionFormId ? true: false;

    this._appStateService.getNewContactAdded().subscribe(value => {

      if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]["Table"] === value.tableName) {
        this.updateList = true;
        this.filteredOptions = null;
        this.getListItems();
      }
    });

    this._filterChanged.pipe(
      startWith(""),
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe({
      next: (value: string | DropdownOption) => {

        if (typeof value === "string") {
          this.filteredOptions = value ? this._filter(value) : this.dropdownSetOptions;
        }
        else {
          this.valueChanged();
        }
      }
    });
  }


  checkForAttachmentUrl() {

    this.downloadLink = coerceBooleanProperty(this.field.cinchyColumn.attachmentUrl);

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValue) {
      const replacedCinchyIdUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
      const replacedFileIdUrl = replacedCinchyIdUrl.replace("@fileid", this.selectedValue.id);
      const selectedValuesWithUrl = { fileName: this.selectedValue.label, fileUrl: replacedFileIdUrl, fileId: this.selectedValue.id };

      this.downloadableLinks = [selectedValuesWithUrl];
    }
  }


  checkForDisplayColumnFormatter() {

    if (
        this.field.cinchyColumn.isDisplayColumn &&
        this.field.cinchyColumn.numberFormatter &&
        this.selectedValue
    ) {
      const numeralValue = new NumeralPipe(this.selectedValue.label);

      this.selectedValue.label = numeralValue.format(this.field.cinchyColumn.numberFormatter);
    }
  }


  closeTooltip(tooltip) {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  deleteDropdownVal(event) {

    const key = event.key;

    if ((key === "Delete" || key === "Backspace") && this.getSelectedText()) {
      this.selectedValue = this.field.dropdownDataset.options.find(item => item.id === "DELETE");

      this.valueChanged();
    }
  }


  displayFn(option: DropdownOption): string {

    return (option?.label ?? "");
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

    this._filterChanged.next(this.selectedValueText);
  }

  focusAndBlurInputToShowDropdown() {

    setTimeout(() => {
      this.searchInput.nativeElement.blur();

      setTimeout(() => {
        this.searchInput.nativeElement.focus()
      }, 100)
    }, 0)
  }


  getAndSetLatestFileValue() {

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


  getFilterValue(value) {

    if (typeof value === "object") {
      return value.label?.split(",")[0].toLowerCase() ?? "";
    }
    return value.toLowerCase();
  }


  async getListItems(fromLinkedField?: boolean): Promise<void> {

    if (!this.filteredOptions) {
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
          this.updateList
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
          this.setSelectedValue();
        }
      }

      this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown
        list of items. You have to select from the dropdown to update this field`;

      this.isLoading = false;

      if (!fromLinkedField && !this.updateList) {
        this.focusAndBlurInputToShowDropdown();
      }

      this.updateList = false;
    }
  }


  getSelectedText() {

    if (window.getSelection) {
      return window.getSelection().toString();
    }

    return "";
  }


  getSortedList(dropdownDataset) {

    let filteredOutNullSets;

    if (dropdownDataset?.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);

      return {
        options: filteredOutNullSets.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
      }
    }

    return dropdownDataset;
  }


  manageSourceRecords(childFormData: any) {

    //implement new method for add new row in source table
    let data = {
      childFormData: childFormData,
      values: null,
      title: "Add Source-Table-Name",
      type: "Add",
      multiFieldValues: childFormData
    };
    this.field.cinchyColumn.hasChanged = true;
    this.openChildDialog();
  }


  onDeleteFile(item) {

    this.field.value = "";
    this.field.cinchyColumn.hasChanged = true;
    this.downloadableLinks = [];
  }


  onFileSelected(event: Event) {

    if ((event?.target as HTMLInputElement)?.files?.length === 0) {
      return;
    }

    const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId?.toString());

    this._cinchyQueryService.uploadFiles(Array.from((event?.target as HTMLInputElement)?.files), uploadUrl)?.subscribe(
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


  openChildDialog() {

    const createLinkOptionFormId = this.field.cinchyColumn.createlinkOptionFormId;
    const createLinkOptionName = this.field.cinchyColumn.createlinkOptionName;
    const newOptionDialogRef = this._dialogService.openDialog(AddNewOptionDialogComponent, {
      createLinkOptionFormId,
      createLinkOptionName
    });

    this._spinner.hide();

    newOptionDialogRef.afterClosed().subscribe(newContactAdded => {
      newContactAdded && this._appStateService.newContactAdded(newContactAdded)
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


  removeTooltipElement() {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  setSelectedValue(): void {

    if (this.field.noPreselect) {
      this.selectedValue = null;
    }
    else {
      const preselectedValArr = this.field.dropdownDataset?.options || null;

      if (preselectedValArr?.length > 1 || this.isInChildForm) {
        this.selectedValue = preselectedValArr.find(item => item.id === this.field.value);
      } else {
        this.selectedValue = preselectedValArr && preselectedValArr[0] ? {...preselectedValArr[0]} : null;
      }

      this.selectedValueText = this.selectedValue?.label || "";

      this.valueChanged();

      this.checkForAttachmentUrl();
      this.checkForDisplayColumnFormatter();
    }
  }


  setToLastValueSelected() {

    setTimeout(() => {

      if (!this.selectedValue) {
        this.selectedValue = this.field.dropdownDataset?.options.find(item => item.id === "DELETE");
        this.selectedValueText = this.selectedValue?.label || "";

        this.valueChanged();
      }
    }, 300);
  }


  setTooltipCursor() {

    this.isCursorIn = true;
  }


  setWhenNewRowAddedForParent() {

    this.field.value = typeof this.form.rowId === "string" ? +this.form.rowId : this.form.rowId;
    this.getListItems(true);
    this.field.noPreselect = false;
    this.isDisabled = true;
    this.field.cinchyColumn.hasChanged = true;
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.selectedValue?.id || null,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _filter(value: any): DropdownOption[] {

    if (value && this.dropdownSetOptions) {
      const filterValue = this.getFilterValue(value);

      // Filtering out addNewItem because multiple inputs can cause race condition
      return this.dropdownSetOptions.filter((option) => {

        return ((option?.label?.toLowerCase) ? option.label.toLowerCase().includes(filterValue) : null);
      });
    }

    return [];
  }
}

