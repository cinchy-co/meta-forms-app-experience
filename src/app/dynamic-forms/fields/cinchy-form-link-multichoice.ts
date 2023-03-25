import { ReplaySubject, Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";

import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ElementRef
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatSelect } from "@angular/material/select";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { isArray, isNullOrUndefined } from "util";

import { ResponseType } from "../enums/response-type.enum";

import { EventCallback, IEventCallback } from "../models/cinchy-event-callback.model";

import { ConfigService } from "../../config.service";

import { CinchyQueryService } from "../../services/cinchy-query.service";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownDatasetService } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { ToastrService } from "ngx-toastr";

import * as R from "ramda";


@Component({
  selector: 'cinchy-link-multichoice',
  template: `
    <form class="dropdown-wrapper">
      <div class="full-width-element divMarginBottom linkField">
        <div class="m-b-10">
          <div class="link-labels">
            <div>
              <fa-icon [icon]="field.cinchyColumn.tableId == field.cinchyColumn.linkTargetTableId ? faSitemap : faShareAlt"></fa-icon>
            </div>
            &nbsp;
            <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
              {{field.label}}
              {{field.cinchyColumn.isMandatory == true && (field.value == "" || field.value == null) ? "*" : ""}}
            </label>

            <mat-icon *ngIf="field.caption && field.cinchyColumn.tableId != field.cinchyColumn.linkTargetTableId" class="info-icon"
                      [ngbTooltip]="withcaptiont"
                      placement="auto"
                      container="body"
                      triggers="click"
                      #t="ngbTooltip"
                      (mouseenter)="openTooltip(t)"
                      (mouseleave)="closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <mat-icon *ngIf="!field.caption && field.cinchyColumn.tableId != field.cinchyColumn.linkTargetTableId" class="info-icon"
                      [ngbTooltip]="withoutcaptiont"
                      triggers="click"
                      placement="auto"
                      container="body"
                      #t="ngbTooltip"
                      (mouseenter)="openTooltip(t)"
                      (mouseleave)="closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <mat-icon *ngIf="field.caption && field.cinchyColumn.tableId == field.cinchyColumn.linkTargetTableId" class="info-icon"
                      [ngbTooltip]="hierarchyWithCaption"
                      placement="auto"
                      container="body"
                      triggers="click"
                      #t="ngbTooltip"
                      (mouseenter)="openTooltip(t)"
                      (mouseleave)="closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <mat-icon *ngIf="!field.caption && field.cinchyColumn.tableId == field.cinchyColumn.linkTargetTableId" class="info-icon"
                      [ngbTooltip]="hierarchyWithoutCaption"
                      placement="auto"
                      container="body"
                      triggers="click"
                      #t="ngbTooltip"
                      (mouseenter)="openTooltip(t)"
                      (mouseleave)="closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <ng-template #withcaptiont>
              {{this.field.caption}}

              <br /> <br />

              From the <b>{{ this.field.cinchyColumn.linkTargetColumnName }}</b> field in the

              <a [href]="tableSourceURL" target="_blank">{{ this.field.cinchyColumn.linkTableDomainName }} - {{ this.field.cinchyColumn.linkTargetTableName }}</a>

              table.
            </ng-template>
            <ng-template #withoutcaptiont>
              From the <b>{{ this.field.cinchyColumn.linkTargetColumnName }}</b> field in the

              <a [href]="tableSourceURL" target="_blank">{{ this.field.cinchyColumn.linkTableDomainName }} - {{ this.field.cinchyColumn.linkTargetTableName }}</a>

              table.
            </ng-template>
            <ng-template #hierarchyWithCaption>
              {{this.field.caption}}

              <br /> <br />

              From the <b>{{ this.field.cinchyColumn.linkTargetColumnName }}</b> field in the {{this.field.cinchyColumn.linkTableDomainName}} - {{ this.field.cinchyColumn.linkTargetTableName }} table.
            </ng-template>
            <ng-template #hierarchyWithoutCaption>
              From the <b>{{ this.field.cinchyColumn.linkTargetColumnName }}</b> field in the {{ this.field.cinchyColumn.linkTableDomainName }} - {{ this.field.cinchyColumn.linkTargetTableName }} table.
            </ng-template>
          </div>

          <mat-select class="form-control" multiple #multiSelect [formControl]="myControl" *ngIf="!isLoading && !downloadLink"
                      disableOptionCentering>
            <ng-container *ngIf="dropdownSetOptions">
              <mat-option>
                <ngx-mat-select-search class="multi-search"
                                       [showToggleAllCheckbox]="true" (toggleAll)="toggleSelectAll($event)"
                                       [formControl]="multiFilterCtrl"
                                       placeholderLabel="Search..."
                                       noEntriesFoundLabel="no matching bank found">
                </ngx-mat-select-search>
              </mat-option>

              <ng-container *ngIf="filteredListMulti | async; let list">
                <ng-container *ngIf="list.length < maxLimitForMaterialSelect; else cdkOptions">
                  <mat-option class="all-options" *ngFor="let dropdownOption of list"
                              [value]="dropdownOption"
                              [title]="dropdownOption.label"
                              (click)="optionClicked(dropdownOption)">
                    {{dropdownOption.label}}
                  </mat-option>
                </ng-container>

                <ng-template #cdkOptions>
                  <cdk-virtual-scroll-viewport [itemSize]="48" [style.height.px]=4*48 [minBufferPx]="300"
                                               [maxBufferPx]="600">
                    <mat-option class="all-options" *cdkVirtualFor="let dropdownOption of filteredListMulti | async"
                                [value]="dropdownOption"
                                [title]="dropdownOption.label"
                                (click)="optionClicked(dropdownOption)">
                      {{dropdownOption.label}}
                    </mat-option>
                  </cdk-virtual-scroll-viewport>
                </ng-template>
              </ng-container>
            </ng-container>
          </mat-select>

          <mat-error *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
            *{{field.label}} is Required.
          </mat-error>

          <ng-container *ngIf="downloadLink && !rowId">
            <p>
              Files cannot be uploaded until a record exists. Please select a record or save the form to access the file selector.
            </p>
          </ng-container>

          <ng-container *ngIf="downloadLink && rowId">
            <div *ngFor="let item of downloadableLinks" style="margin-top: 6px">
              <a *ngIf="downloadLink" [href]="item.fileUrl" [title]="'Download ' + item.fileName">
                <img *ngIf="renderImageFiles && fileNameIsImage(item.fileName)" style="height: 100px" [src]="item.fileUrl" />
                <span [style.marginLeft.px]="renderImageFiles && fileNameIsImage(item.fileName) ? 12 : 0">{{item.fileName}}</span>
              </a>
              <mat-icon class="file-delete-icon" (click)="onDeleteFile(item)" title="Delete">close</mat-icon>
            </div>
            <input #fileInput multiple class='form-control'
                   *ngIf="!(field.cinchyColumn.canEdit=== false)"
                   type="file"
                   (change)="onFileSelected($event)"
                   [style.marginTop.px]="downloadableLinks ? 14 : 0">
          </ng-container>
        </div>
      </div>
    </form>

    <div *ngIf="isLoading" class="is-loading">
      <mat-spinner diameter="20"></mat-spinner>
    </div>`,
  providers: [DropdownDatasetService]
})
export class LinkMultichoice implements OnInit, OnDestroy {

  @ViewChild("fileInput") fileInput: ElementRef;
  @ViewChild("multiSelect", { static: true }) multiSelect: MatSelect;
  @ViewChild("t") public tooltip: NgbTooltip;

  @Input() field: any;
  @Input() rowId: any;
  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };
  @Input() targetTableName: string;
  @Input() isInChildForm: boolean;
  @Input() isDisabled: boolean;

  @Output() eventHandler = new EventEmitter<any>();

  myControl = new FormControl();
  multiFilterCtrl: FormControl = new FormControl();
  filteredListMulti: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  onDestroy = new Subject<void>();
  charactersAfterWhichToShowList = 0;
  allSelected = false;
  selectedValues = [];
  dropdownSetOptions;
  filteredOptions;
  selectedValue;
  toolTipMessage;
  metadataQueryResult;
  isLoading;
  showError;
  dropdownListFromLinkedTable;
  dropdownSettings;
  maxLimitForMaterialSelect = 4000;
  downloadLink;
  downloadableLinks;
  tableSourceURL: any;

  renderImageFiles = true;
  faShareAlt = faShareAlt;
  faSitemap = faSitemap;
  isCursorIn: boolean = false;


  constructor(
    private _dropdownDatasetService: DropdownDatasetService,
    private _cinchyService: CinchyService,
    private _configService: ConfigService,
    private _cinchyQueryService: CinchyQueryService,
    private _toastr: ToastrService
  ) { }


  ngOnDestroy() {

    this.onDestroy.next();
    this.onDestroy.complete();
  }


  ngOnInit(): void {

    if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
      this.myControl.disable();
    }

    this.getListItems();

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = url + "/Tables/" + this.field.cinchyColumn.linkTargetTableId;
  }


  async bindDropdownList(dataSet: any, linkTargetId: number) {

    if (!this.dropdownListFromLinkedTable) {
      this.isLoading = true;
      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson;

      let tableColumnQuery: string = "select tc.[Table].[Domain].[Name] as 'Domain', tc.[Table].[Name] as 'Table', tc.[Name] as 'Column' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = " + linkTargetId;

      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.FormFieldsJsonData);

      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }

      if (!isNullOrUndefined(linkTargetId)) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(linkTargetId, dataSet.label, currentFieldJson, this.field.cinchyColumn.dropdownFilter, this.rowId);

        this.dropdownListFromLinkedTable = true;

        dropdownDataset = this.getSortedList(dropdownDataset);
        dataSet.dropdownDataset = dropdownDataset;

        this.dropdownSetOptions = dropdownDataset ? dropdownDataset.options : [];
        this.charactersAfterWhichToShowList = this.dropdownSetOptions.length > this.maxLimitForMaterialSelect ? 3 : 0;
        this.setFilteredOptions();
        this.setSelectedValue();

        if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect && this.selectedValues) {
          this.dropdownSetOptions = this.selectedValues.concat(this.dropdownSetOptions);

          this.dropdownSetOptions = R.uniqBy((item) => {
            return item.id;
          }, this.dropdownSetOptions)

          this.filteredListMulti.next(this.dropdownSetOptions.slice());
        }

        this.selectedValues && this.myControl.setValue(this.selectedValues);
        this.checkForAttachmentUrl();
      }

      this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown
     list of item. You have to select from the dropdown to update this field`;

      this.isLoading = false;
    }
  }


  checkForAttachmentUrl() {

    this.downloadLink = !!this.field.cinchyColumn.attachmentUrl;

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValues?.length) {
      this.downloadLink = true;
      this.downloadableLinks = [];

      this.selectedValues.forEach(listItem => {
        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.rowId);
        const replacedFileIdUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", listItem.id);
        const selectedValuesWithUrl = { fileName: listItem.label, fileUrl: replacedFileIdUrl, fileId: listItem.id };
        this.downloadableLinks.push(selectedValuesWithUrl);
      })
    }
  }


  closeTooltip(tooltip) {

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


  protected filterMulti() {

    if (!this.dropdownSetOptions) {
      return;
    }
    // get the search keyword
    let search = this.multiFilterCtrl.value;
    if (!search) {
      this.filteredListMulti.next(this.dropdownSetOptions.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the lis
    this.filteredListMulti.next(
      this.dropdownSetOptions.filter(item => item.label.toLowerCase().indexOf(search) > -1)
    );
  }


  generateMultipleOptionsFromSingle() {

    let selectedIds;

    if (this.field.noPreSelect) {
      return [];
    }

    if (this.field.dropdownDataset && this.field.dropdownDataset.options) {
      selectedIds = this.field.dropdownDataset.options[0].id.split ? this.field.dropdownDataset.options[0].id.split(",") : null
    }

    if (!this.field.value || (selectedIds && selectedIds.length > 1)) {
      const options = [];

      let selectedIds = this.isInChildForm ? this.field.dropdownDataset.options[0].id
        : !this.field.value ? null : this.field.dropdownDataset.options[0].id;

      if (selectedIds) {
        selectedIds = typeof selectedIds === "number" ? `${selectedIds}` : selectedIds;
        const allSelectedIds = selectedIds.split(",");
        const allLabels = this.field.dropdownDataset.options[0].label.split(",");

        allSelectedIds.forEach((id, index) => {
          const option = new DropdownOption(id, allLabels[index]);
          options.push(option);
        });
      }

      return options;
    } else if (this.field.value) {
      const selectedValue = typeof this.field.value === "number" ? `${this.field.value}` : this.field.value;
      const allIds = typeof selectedValue === "string" ? selectedValue.split(",") : selectedValue;

      return this.field.dropdownDataset.options.filter(option => allIds.find(id => {
        const trimedId = id.trim ? id.trim() : id;
        return option.id == trimedId;
      }));
    }
  }


  getAndSetLatestFileValue() {

    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe(resp => {
      if (resp?.length) {
        this.field.value = (this.field.value ?? []).concat(resp.map(x => x.fileId));

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.rowId);

        this.selectedValues = this.selectedValues ?? [];
        this.downloadableLinks = this.downloadableLinks ?? [];

        resp.forEach(newFile => {
          const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", newFile.fileId);
          const newSelectedValue = { fileName: newFile.fileName, fileUrl: fileUrl, fileId: newFile.fileId };

          this.selectedValues.push(newSelectedValue);
          this.downloadableLinks.push(newSelectedValue);
        });
        this._cinchyQueryService.updateFilesInCell(this.downloadableLinks.map(x => x.fileId), this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe(resp => {
          this.fileInput.nativeElement.value = null;
          this._toastr.success("File(s) uploaded", "Success");
        });
      }
    });
  }


  getListItems() {

    this.bindDropdownList(this.field, this.field.cinchyColumn.linkTargetColumnId);
  }


  getSortedList(dropdownDataset) {

    let filteredOutNullSets;

    if (dropdownDataset && dropdownDataset.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);

      return {
        options: filteredOutNullSets.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
      }
    }

    return filteredOutNullSets;
  }


  isSelected(dropdownOption) {

    return this.selectedValues.find(item => item.id === dropdownOption.id);
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


  onDeleteFile(item) {

    if (item.fileId && this.field.value) {
      this.field.value = this.field.value.filter((fileId: string) => {

        return (fileId !== item.fileId?.toString());
      });

      this.field.cinchyColumn.hasChanged = true;
      this.downloadableLinks = this.downloadableLinks.filter(x => x.fileId !== item.fileId);
    }
  }


  onFileSelected(event: any) {

    if (event?.target?.files?.length === 0) {
      return;
    }

    const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.rowId);

    this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
      {
        error: () => {

          this._toastr.error("Could not upload the file(s)", "Error");
        },
        next: () => {

          this.getAndSetLatestFileValue();
        }
      }
    );
  }


  optionClicked(dropdownOption) {

    const alreadyExistInSelected = this.selectedValues.find(item => item.id === dropdownOption.id);
    if (alreadyExistInSelected) {
      dropdownOption.selected = false;
      this.selectedValues = this.selectedValues.filter(item => item.id !== dropdownOption.id);
    } else {
      dropdownOption.selected = true;
      this.selectedValues.push(dropdownOption);
    }
    this.myControl.patchValue(this.selectedValues);
    this.field.cinchyColumn.hasChanged = true;
    this.field.value = this.selectedValues.map(option => option.id);
    const text = this.field.cinchyColumn.label;
    const Data = {
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "TableName": this.targetTableName,
      "ColumnName": this.field.cinchyColumn.name,
      "Value": this.field.value.join(", "),
      "Text": text,
      "Event": event,
      "Form": this.field.form,
      "Field": this.field
    }
    const callback: IEventCallback = new EventCallback(ResponseType.onChange, Data);
    this.eventHandler.emit(callback);
  }


  remove(dropdownOption): void {

    this.selectedValues = dropdownOption === "all" ? [] : this.selectedValues.filter(item => item.id !== dropdownOption.id);
    this.myControl.setValue(this.selectedValues);
    this.field.cinchyColumn.hasChanged = true;
    this.field.value = this.selectedValues.map(option => option.id);
  }


  removeTooltipElement() {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  setFilteredOptions(dropdownOptions?) {

    this.filteredOptions = dropdownOptions ? dropdownOptions : this.dropdownSetOptions;
    this.myControl.setValue([]);
    // load the initial list
    this.filteredListMulti.next(this.dropdownSetOptions.slice());
    if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect) {
      this.charactersAfterWhichToShowList = 2;
    }
    this.multiFilterCtrl.valueChanges
      .pipe(takeUntil(this.onDestroy))
      .subscribe(() => {
        this.filterMulti();
      });
  }


  /**
   * Sets the initial value after the fileteredItems are loaded initially
   */
  protected setInitialValue() {

    this.filteredListMulti
      .pipe(take(1), takeUntil(this.onDestroy))
      .subscribe(() => {
        this.multiSelect.compareWith = (a, b) => {
          return a && b && a.id && b.id && a.id === b.id;
        };
      });
  }


  setSelectedValue() {

    const preselectedValArr = this.field.dropdownDataset ? this.field.dropdownDataset.options : null;

    if (preselectedValArr || this.isInChildForm) {
      this.selectedValues = this.generateMultipleOptionsFromSingle();
    } else {
      this.selectedValues = preselectedValArr && preselectedValArr[0] ? { ...preselectedValArr[0] } : null;
    }
  }


  setTooltipCursor() {

    this.isCursorIn = true;
  }


  toggleSelectAll(selectAllValue) {

    this.filteredListMulti.pipe(take(1), takeUntil(this.onDestroy))
      .subscribe(val => {
        if (selectAllValue) {
          this.selectedValues = val;
        } else {
          this.selectedValues = [];
        }
        this.myControl.patchValue(this.selectedValues);
        this.field.cinchyColumn.hasChanged = true;
        this.field.value = this.selectedValues.map(option => option.id);
      });
  }
}
