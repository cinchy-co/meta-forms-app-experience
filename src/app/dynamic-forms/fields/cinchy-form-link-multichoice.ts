import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ReplaySubject, Subject} from 'rxjs';
import {MatSelect} from '@angular/material/select';
import {take, takeUntil} from 'rxjs/operators';
import {DropdownDataset} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import {isNullOrUndefined} from "util";
import {DropdownDatasetService} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import {NgxSpinnerService} from "ngx-spinner";
import {CinchyService} from "@cinchy-co/angular-sdk";
import {DropdownOption} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import {EventCallback, IEventCallback} from "../models/cinchy-event-callback.model";
import {ResponseType} from "../enums/response-type.enum";
import * as R from 'ramda';
import { ConfigService } from 'src/app/config.service';
import { CinchyQueryService } from 'src/app/services/cinchy-query.service';
import { ToastrService } from 'ngx-toastr';
import { faShareAlt } from '@fortawesome/free-solid-svg-icons';
import { faSitemap } from '@fortawesome/free-solid-svg-icons';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'cinchy-link-multichoice',
  template: `
    <form class="dropdown-wrapper">
      <div class="full-width-element divMarginBottom linkField">
        <div class="m-b-10">
          <div class="link-labels">
          <div>
          <fa-icon [icon]="field.cinchyColumn.tableId == field.cinchyColumn.LinkTargetTableId ? faSitemap : faShareAlt"></fa-icon>
          </div>
          &nbsp;
            <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
              {{field.label}}
              {{field.cinchyColumn.isMandatory == true && (field.value == '' || field.value == null) ? '*' : ''}}
            </label>

            <mat-icon *ngIf="field.caption && field.cinchyColumn.tableId != field.cinchyColumn.LinkTargetTableId" class="info-icon"
                      [ngbTooltip] = "withcaptiont"
                      placement="auto"
                      container="body"
                      triggers="click"
                      #t="ngbTooltip"
                      (mouseenter) ="openTooltip(t)"
                      (mouseleave) = "closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <mat-icon *ngIf="!field.caption && field.cinchyColumn.tableId != field.cinchyColumn.LinkTargetTableId" class="info-icon"
                      [ngbTooltip] = "withoutcaptiont"
                      triggers="click"
                      placement="auto"
                      container="body"
                      #t="ngbTooltip"
                      (mouseenter) ="openTooltip(t)"
                      (mouseleave) = "closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
            <mat-icon *ngIf="field.caption && field.cinchyColumn.tableId == field.cinchyColumn.LinkTargetTableId" class="info-icon"
                      [ngbTooltip] = "hierarchy"
                      placement="auto"
                      container="body"
                      triggers="click"
                      #t="ngbTooltip"
                      (mouseenter) ="openTooltip(t)"
                      (mouseleave) = "closeTooltip(t)"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
          <ng-template #withcaptiont> 
             {{this.field.caption}}  <br/> <br/> From the <b> {{this.field.cinchyColumn.linkTargetColumnName}} </b> field in the <a [href]="tableSourceURL" target="_blank">  {{this.field.cinchyColumn.linkTargetTableName}}  </a> table.
          </ng-template>
          <ng-template #withoutcaptiont> 
            From the <b> {{this.field.cinchyColumn.linkTargetColumnName}} </b> field in the <a [href]="tableSourceURL" target="_blank">  {{this.field.cinchyColumn.linkTargetTableName}}  </a> table.
          </ng-template>
          <ng-template #hierarchy> 
             {{this.field.caption}}
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
  <!--        <ng-container>
          <div *ngIf="dropdownSetOptions && !isLoading">
            <angular2-multiselect [data]="dropdownSetOptions" [formControl]="myControl"
                                  [(ngModel)]="selectedValues"
                                  [settings]="dropdownSettings"
                                  (onSelect)="onItemSelect($event)"
                                  (onDeSelect)="OnItemDeSelect($event)"
                                  (onSelectAll)="onSelectAll($event)"
                                  (onDeSelectAll)="onDeSelectAll($event)">
            </angular2-multiselect>
          </div>
          </ng-container>-->
          <mat-error
            *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
            *{{field.label}} is Required.
          </mat-error>

          <ng-container *ngIf="downloadLink">
            <div *ngFor="let item of downloadableLinks" style="margin-top: 6px">
              <a *ngIf="downloadLink" [href]="item.fileUrl" [title]="'Download ' + item.fileName">
                <img *ngIf="renderImageFiles && fileNameIsImage(item.fileName)" style="height: 100px" [src]="item.fileUrl"/>
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
    </div>
  `,
  providers: [DropdownDatasetService]
})

export class LinkMultichoice implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('multiSelect', {static: true}) multiSelect: MatSelect;
  @ViewChild('t') public tooltip: NgbTooltip;

  @Input() field: any;
  @Input() rowId: any;
  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
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

  constructor(private _dropdownDatasetService: DropdownDatasetService, private spinner: NgxSpinnerService,
              private _cinchyService: CinchyService,
              private _configService: ConfigService,
              private _cinchyQueryService: CinchyQueryService,
              private _toastr: ToastrService) {
  }

  ngOnInit(): void {
    // Below for other dropdown lib
/*    this.dropdownSettings = {
      singleSelection: false,
      text:"Select",
    //  selectAllText:'Select All',
   //   unSelectAllText:'UnSelect All',
      enableCheckAll:false,
      enableSearchFilter: true,
      lazyLoading: true,
      labelKey: 'label',
      badgeShowLimit: 2,
      position: 'bottom',
      height: '200px'
    };*/
    if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
      this.myControl.disable();
    }
    this.getListItems();
    let url = this._configService.envConfig.cinchyRootUrl;
    this.tableSourceURL = url + '/Tables/' + this.field.cinchyColumn.LinkTargetTableId;
  }

  setSelectedValue() {
    const preselectedValArr = this.field.dropdownDataset ? this.field.dropdownDataset.options : null;
    if (preselectedValArr || this.isInChildForm) {
      this.selectedValues = this.generateMultipleOptionsFromSingle();
    } else {
      this.selectedValues = preselectedValArr && preselectedValArr[0] ? {...preselectedValArr[0]} : null;
    }
  }

  generateMultipleOptionsFromSingle() {
    let selectedIds;
    if (this.field.noPreSelect) {
      return [];
    }
    if (this.field.dropdownDataset && this.field.dropdownDataset.options) {
      selectedIds = this.field.dropdownDataset.options[0].id.split ? this.field.dropdownDataset.options[0].id.split(',') : null
    }
    if (!this.field.value || (selectedIds && selectedIds.length > 1)) {
      const options = [];
      //  if(!(this.field.dropdownDataset.options && this.field.dropdownDataset.options.length > 1)){ // when value should be null, it was pre selecting first value
      let selectedIds = this.isInChildForm ? this.field.dropdownDataset.options[0].id
        : !this.field.value ? null : this.field.dropdownDataset.options[0].id;
      if (selectedIds) {
        selectedIds = typeof selectedIds === 'number' ? `${selectedIds}` : selectedIds;
        const allSelectedIds = selectedIds.split(',');
        const allLabels = this.field.dropdownDataset.options[0].label.split(',');
        allSelectedIds.forEach((id, index) => {
          const option = new DropdownOption(id, allLabels[index]);
          options.push(option);
        });
      }
      //   }
      return options;
    } else if (this.field.value) {
      const selectedValue = typeof this.field.value === 'number' ? `${this.field.value}` : this.field.value;
      const allIds = typeof selectedValue === 'string' ? selectedValue.split(',') : selectedValue;
      return this.field.dropdownDataset.options.filter(option => allIds.find(id => {
        const trimedId = id.trim ? id.trim() : id;
        return option.id == trimedId;
      }));
    }
  }

  getListItems() {
    this.bindDropdownList(this.field, this.field.cinchyColumn.linkTargetColumnId);
  }

  async bindDropdownList(dataSet: any, linkTargetId: number) {
    if (!this.dropdownListFromLinkedTable) {
      this.isLoading = true;
      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson;
      let tableColumnQuery: string = 'select tc.[Table].[Domain].[Name] as \'Domain\', tc.[Table].[Name] as \'Table\', tc.[Name] as \'Column\' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = ' + linkTargetId;
      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();
      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.FormFieldsJsonData);
      if (formFieldsJsonData && formFieldsJsonData.Columns) {
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
        /*  this.selectedValues = this.dropdownSetOptions.filter(option => {
            return this.selectedValues && this.selectedValues.find(selectedOption => selectedOption.id == option.id)
          });*/
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

  checkForAttachmentUrl(){
    this.downloadLink = !!this.field.cinchyColumn.attachmentUrl;
    if(this.field.cinchyColumn.attachmentUrl && this.selectedValues && this.selectedValues.length){
      this.downloadLink = true;
      this.downloadableLinks = [];
      this.selectedValues.forEach(listItem => {
        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace('@cinchyid', this.rowId);
        const replacedFileIdUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace('@fileid', listItem.id);
        const selectedValuesWithUrl = {fileName: listItem.label, fileUrl: replacedFileIdUrl, fileId: listItem.id };
        this.downloadableLinks.push(selectedValuesWithUrl);
      })
    }
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
      'HasChanged': this.field.cinchyColumn.hasChanged,
      'TableName': this.targetTableName,
      'ColumnName': this.field.cinchyColumn.name,
      'Value': this.field.value,
      'Text': text,
      'Event': event,
      'Form': this.field.form,
      'Field': this.field
    }
    const callback: IEventCallback = new EventCallback(ResponseType.onChange, Data);
    this.eventHandler.emit(callback);
  }

  isSelected(dropdownOption) {
    return this.selectedValues.find(item => item.id === dropdownOption.id);
  }

  remove(dropdownOption): void {
    this.selectedValues = dropdownOption === 'all' ? [] : this.selectedValues.filter(item => item.id !== dropdownOption.id);
    this.myControl.setValue(this.selectedValues);
    this.field.cinchyColumn.hasChanged = true;
    this.field.value = this.selectedValues.map(option => option.id);
  }

  ngAfterViewInit() {
   // this.setInitialValue();
  }

  ngOnDestroy() {
    this.onDestroy.next();
    this.onDestroy.complete();
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

  // Options for multi select library
  onItemSelect(item:any){
    console.log(item);
    console.log(this.selectedValues);
    this.optionClicked(item);
  }
  OnItemDeSelect(item:any){
    console.log(item);
    console.log(this.selectedValues);
    this.optionClicked(item);
  }
  onSelectAll(items: any){
    console.log(items);
  }
  onDeSelectAll(items: any){
    console.log(items);
  }

  onFileSelected(event: any) {
    if (event?.target?.files?.length === 0) {
      return;
    }

    const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace('@cinchyid', this.rowId);
    this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
      resp => {
        this.getAndSetLatestFileValue();
      }, 
      error => {
        this._toastr.error('Could not upload the file(s)', 'Error');
      });
  }

  fileNameIsImage(fileName: string) {
    const lowercase = fileName.toLowerCase();
    return  lowercase.endsWith('.png') ||
            lowercase.endsWith('.jpg') ||
            lowercase.endsWith('.jpeg') ||
            lowercase.endsWith('.gif') ||
            lowercase.endsWith('.svg');
  }

  getAndSetLatestFileValue() {
    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe(resp => {
      if (resp && resp.length) {
        this.field.value = this.field.value != null && this.field.value !== '' ? this.field.value + ', ' + resp.map(x => x.fileId).join(', ') : resp.map(x => x.fileId).join(', ');

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace('@cinchyid', this.rowId);
        if (this.selectedValues == null)
          this.selectedValues = [];
        if (this.downloadableLinks == null)
          this.downloadableLinks = [];

        resp.forEach(newFile => {
          const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace('@fileid', newFile.fileId);
          const newSelectedValue = { fileName: newFile.fileName, fileUrl: fileUrl, fileId: newFile.fileId };
          
          this.selectedValues.push(newSelectedValue);
          this.downloadableLinks.push(newSelectedValue);
        });
        this._cinchyQueryService.updateFilesInCell(this.downloadableLinks.map(x => x.fileId), this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe( resp => {
          this.fileInput.nativeElement.value = '';
          this._toastr.success('File(s) uploaded', 'Success');
        });
      }
    });
  }

  onDeleteFile(item) {
    if (item.fileId && this.field.value) {
      this.field.value = this.field.value.split(',').map(x => x.trim()).filter(x => x !== (item.fileId).toString()).join(', ');
      if (this.field.value === '') {
        this.field.value = [];
      }
      this.field.cinchyColumn.hasChanged = true;
      this.downloadableLinks = this.downloadableLinks.filter(x => x.fileId !== item.fileId);
    }
  }

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
        tooltipElement[0].addEventListener('mouseleave',this.removeTooltipElement.bind(this));
        tooltipElement[0].addEventListener('mouseenter',this.setTooltipCursor.bind(this));
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
}
