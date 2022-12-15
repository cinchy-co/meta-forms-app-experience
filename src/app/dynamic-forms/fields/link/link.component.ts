import { startWith } from "rxjs/operators";

import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FormControl } from "@angular/forms";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";

import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { AddNewOptionDialogComponent } from "../../../dialogs/add-new-option-dialog/add-new-option-dialog.component";

import { ImageType } from "../../enums/imageurl-type";
import { ResponseType } from "../../enums/response-type.enum";

import { IEventCallback, EventCallback } from "../../models/cinchy-event-callback.model";

import { ConfigService } from "../../../config.service";

import { AppStateService } from "../../../services/app-state.service";
import { DialogService } from "../../../services/dialog.service";
import { CinchyQueryService } from "../../../services/cinchy-query.service";

import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";

import { isNullOrUndefined } from "util";

import { NumeralPipe } from "ngx-numeral";
import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";


//#region Cinchy Dynamic Link field
/**
 * This section is used to create Link field for the cinchy.
 * Lazy loading of the dropdown is used here. Bind dropdown on click
 */
//#endregion
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
  @Input() field: any;
  @Input() rowId: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isInChildForm: boolean;
  @Input() isDisabled: boolean;
  @Input() formFieldMetadataResult: any;
  @Output() eventHandler = new EventEmitter<any>();
  @Output() childform = new EventEmitter<any>();
  faPlus = faPlus;
  createlinkOptionName: boolean;
  myControl = new FormControl();
  dropdownSetOptions;
  filteredOptions;
  charactersAfterWhichToShowList = 0;
  selectedValue;
  toolTipMessage;
  metadataQueryResult;
  isLoading;
  showError;
  updateList: boolean;
  downloadLink;
  downloadableLinks;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  tableSourceURL: any;

  renderImageFiles = true;

  faShareAlt = faShareAlt;
  faSitemap = faSitemap;
  isCursorIn: boolean = false;

  constructor(private _dropdownDatasetService: DropdownDatasetService, private spinner: NgxSpinnerService,
              private _cinchyService: CinchyService,
              private dialogService: DialogService,
              private _appStateService: AppStateService,
              private _cinchyQueryService: CinchyQueryService,
              private _configService: ConfigService,
              private _toastr: ToastrService) { // AppStateService is not part of Dynamic forms and is specific to this project
  }

  ngOnInit(): void {
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;
    let url = this._configService.envConfig.cinchyRootUrl;
    this.tableSourceURL = url + "/Tables/" + this.field.cinchyColumn.LinkTargetTableId;
    if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
      this.myControl.disable();
      this.setSelectedValue();
    } else {
      this.setSelectedValue();
    }
    if (this.isInChildForm && this.field.cinchyColumn.linkedFieldId) {
      this.setWhenNewRowAddedForParent();
    }
    if (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly && !this.isDisabled) {
      this.onInputChange();
    }

    this.createlinkOptionName = this.field.cinchyColumn.createlinkOptionFormId ? true: false;
    // Below code is SPECIFIC to this Project ONLY
    this._appStateService.getNewContactAdded().subscribe(value => {
      console.log("getNewContactAdded", value);
      if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]["Table"] === value.tableName) {
        this.updateList = true;
        this.filteredOptions = null;
        this.getListItems();
      }
    })
  }

  setWhenNewRowAddedForParent() {
    this.field.value = typeof this.rowId === "string" ? +this.rowId : this.rowId;
    this.getListItems(true);
    this.field.noPreSelect = false;
    this.isDisabled = true;
    this.field.cinchyColumn.hasChanged = true;
  }

  getListItems(fromLinkedField?) {
    this.bindDropdownList(this.field, this.field.cinchyColumn.linkTargetColumnId, fromLinkedField);
  }

  //#region Bind Link type (DropdownList) on click
  /**
   * @param dataSet dataset of the link type
   * @param linkTargetId (Taget Column ID) of link table
   */
  async bindDropdownList(dataSet: any, linkTargetId: number, fromLinkedField?: boolean) {
    if (!this.filteredOptions) {
      this.isLoading = true;
      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson;
      let tableColumnQuery: string = "select tc.[Table].[Domain].[Name] as \"Domain\", tc.[Table].[Name] as \"Table\", tc.[Name] as \"Column\" from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = " + linkTargetId;
      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.formFieldsJsonData);
      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }
      if (!isNullOrUndefined(linkTargetId)) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(linkTargetId, dataSet.label,
          currentFieldJson, this.field.cinchyColumn.dropdownFilter, this.rowId, this.updateList);
        dropdownDataset = this.getSortedList(dropdownDataset);
        dataSet.dropdownDataset = dropdownDataset;
        this.dropdownSetOptions = dropdownDataset ? dropdownDataset.options : [];
        this.onInputChange();
        if(this.rowId && this.rowId !== "null"){
          const emptyOption = new DropdownOption("DELETE", "", "");
          this.dropdownSetOptions.unshift(emptyOption);
        }
        this.charactersAfterWhichToShowList = this.dropdownSetOptions.length > 2000 ? 3 : 0;
        this.filteredOptions = this.dropdownSetOptions;
        fromLinkedField && this.setSelectedValue();
      }
      this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown
     list of item. You have to select from the dropdown to update this field`;
      this.isLoading = false;
      if (!fromLinkedField && !this.updateList) {
        this.focusAndBlurInputToShowDropdown();
      }
      this.updateList = false;
    }
  }

  focusAndBlurInputToShowDropdown() {
    setTimeout(() => {
      this.searchInput.nativeElement.blur();
      setTimeout(() => {
        this.searchInput.nativeElement.focus()
      }, 100)
    }, 0)
  }

  getSortedList(dropdownDataset) {
    let filteredOutNullSets;
    if (dropdownDataset && dropdownDataset.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);
      return {
        options: filteredOutNullSets.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
      }
    }
    return dropdownDataset;
  }

  onInputChange() {
    if (this.isLoading) {
      this.myControl.setValue("");
      return;
    }
    
    this.myControl.valueChanges.pipe(
      startWith("")).subscribe(value => {
      if (value && typeof value !== "object") {
        this.selectedValue = null;
        this.filteredOptions = value ? this._filter(value) : this.filteredOptions;
      } else if (!(value && value.label)) {
        this.filteredOptions = this.dropdownSetOptions;
      }
    });
  }

  setSelectedValue() {
    if (this.field.noPreSelect) {
      this.selectedValue = null;
      this.field.value = null;
      return null;
    }
    const preselectedValArr = this.field.dropdownDataset ? this.field.dropdownDataset.options : null;
    if (preselectedValArr && (preselectedValArr.length > 1 || this.isInChildForm)) {
      this.selectedValue = preselectedValArr.find(item => item.id === this.field.value);
    } else {
      this.selectedValue = preselectedValArr && preselectedValArr[0] ? {...preselectedValArr[0]} : null;
    }
    this.selectedValue && this.myControl.setValue(this.selectedValue);
    this.field.value = this.selectedValue ? this.selectedValue.id : null;
    this.checkForAttachmentUrl();
    this.checkForDisplayColumnFormatter();
  }

  displayFn(contact): string {
    return contact?.label ?? "";
  }

  private _filter(value: any): string[] {
    if (value && this.dropdownSetOptions) {
      const filterValue = this.getFilterValue(value);
      // Filtering out addNewItem because multiple inputs can cause race condition
      return this.dropdownSetOptions.filter(option => option && option.label && option.label.toLowerCase
        ? option.label.toLowerCase().includes(filterValue) : null);
    }
    return [];
  }

  getFilterValue(value) {
    if (typeof value === "object") {
      return value.label ? value.label.split(",")[0].toLowerCase() : "";
    }
    return value.toLowerCase();
  }

  setToLastValueSelected(event) {
    setTimeout(() => {
      !this.selectedValue && this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name, {value: {}}, "value");
       this.selectedValue ? this.myControl.setValue(this.selectedValue) : this.myControl.setValue("");
       if(this.selectedValue == null){
        const val = this.field.dropdownDataset.options.find(item => item.id === "DELETE");
        if(val){
          this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name,{value: val}, "value");
        }
       }
      }, 300)
  }

  //#endregion
  //#region pass callback event to the project On change of link (dropdown)
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    if(Object.keys(event.value).length > 0){
        // constant values
        /*const value = event[0].value;
        const text = event[0].text;*/
        this.field.cinchyColumn.hasChanged = event.value.id !== this.field.value;
        this.selectedValue = event.value;
        this.field.value = event.value.id;
        const value = event.value.id;
        const text = event.value.label;
        const Data = {
          "TableName": targetTableName,
          "ColumnName": columnName,
          "Value": value,
          "Text": text,
          "Event": event,
          "hasChanged": this.field.cinchyColumn.hasChanged,
          "Form": this.field.form,
          "Field": this.field
        }
        // pass calback event
        const callback: IEventCallback = new EventCallback(ResponseType.onChange, Data);
        this.eventHandler.emit(callback);
    }
  }

  checkForAttachmentUrl() {
    this.downloadLink = !!this.field.cinchyColumn.attachmentUrl;
    if (this.field.cinchyColumn.attachmentUrl && this.selectedValue) {
      this.downloadLink = true;
      this.downloadableLinks = [];
      const replacedCinchyIdUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.rowId);
      const replacedFileIdUrl = replacedCinchyIdUrl.replace("@fileid", this.selectedValue.id);
      const selectedValuesWithUrl = {fileName: this.selectedValue.label, fileUrl: replacedFileIdUrl, fileId: this.selectedValue.id};
      this.downloadableLinks.push(selectedValuesWithUrl);
    }
  }

  checkForDisplayColumnFormatter() {
    if (this.field.cinchyColumn.isDisplayColumn && this.field.cinchyColumn.numberFormatter
      && this.selectedValue && this.selectedValue.label) {
      const numeralValue = new NumeralPipe(this.selectedValue.label);
      this.selectedValue.label = numeralValue.format(this.field.cinchyColumn.numberFormatter);
    }
  }

  onFileSelected(event: any) {
    if (event?.target?.files?.length === 0) {
      return;
    }

    const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.rowId);
    this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
      resp => {
        this._toastr.success("File uploaded", "Success");
        this.fileInput.nativeElement.value = "";
        this.getAndSetLatestFileValue();
      }, 
      error => {
        this._toastr.error("Could not upload the file", "Error");
      });
  }

  getAndSetLatestFileValue() {
    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe(resp => {
      if (resp && resp.length) {
        this.field.value = resp[0].fileId;
        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.rowId);
        const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", resp[0].fileId);
        this.downloadableLinks = [
          { 
            fileName: resp[0].fileName, 
            fileUrl: fileUrl, 
            fileId: resp[0].fileId 
          }
        ];
      } 
    });
  }

  onDeleteFile(item) {
    this.field.value = "";
    this.field.cinchyColumn.hasChanged = true;
    this.downloadableLinks = [];
  }

  manageSourceRecords(childFormData: any){
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

  openChildDialog() {
    const createLinkOptionFormId = this.field.cinchyColumn.createlinkOptionFormId;
    const createLinkOptionName = this.field.cinchyColumn.createlinkOptionName;
    const newOptionDialogRef = this.dialogService.openDialog(AddNewOptionDialogComponent, {
      createLinkOptionFormId,
      createLinkOptionName
    });
    this.spinner.hide();
    newOptionDialogRef.afterClosed().subscribe(newContactAdded => {
      newContactAdded && this._appStateService.newContactAdded(newContactAdded)
    });
  }

  fileNameIsImage(fileName: string) {
    const lowercase = fileName.toLowerCase();
    return  lowercase.endsWith(".png") ||
            lowercase.endsWith(".jpg") ||
            lowercase.endsWith(".jpeg") ||
            lowercase.endsWith(".gif") ||
            lowercase.endsWith(".svg");
  }
  //#endregion


removeTooltipElement(){
  this.isCursorIn = false;
  this.tooltip.close(); 
}

setTooltipCursor(){
  this.isCursorIn = true;
}

openTooltip(tooltip){
  tooltip.open();
  this.tooltip = tooltip;
  if(tooltip.isOpen()) {
    const tooltipElement = document.getElementsByTagName("ngb-tooltip-window");
    if(tooltipElement[0]){
      tooltipElement[0].addEventListener("mouseleave",this.removeTooltipElement.bind(this));
      tooltipElement[0].addEventListener("mouseenter",this.setTooltipCursor.bind(this));
  }
 }
}

closeTooltip(tooltip){
  setTimeout(() => {
    if(tooltip.isOpen() &&  !this.isCursorIn) {
      tooltip.close();
    }
  }, 100);

}

deleteDropdownVal(event){
  const key = event.key;
  if (key === "Delete" || key === "Backspace") {
    const text= this.getSelectedText();
    const val = this.field.dropdownDataset.options.find(item => item.id === "DELETE");
    if (text!=""){
      this.selectedValue = null;
      this.myControl.setValue("");
      this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name,{value: val}, "value");
    }
  }
}

getSelectedText() {
  if (window.getSelection) {
      return window.getSelection().toString();
  }
  return "";
}

}
