import {Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef} from '@angular/core';
import {DropdownDatasetService} from '../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service';
import {DropdownDataset} from '../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset';
import {isNullOrUndefined} from 'util';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';
import {ResponseType} from '../enums/response-type.enum';
import {NgxSpinnerService} from "ngx-spinner";
import {FormControl} from "@angular/forms";
import {startWith} from "rxjs/operators";
import {AppStateService} from "../../services/app-state.service";
import {CinchyService} from "@cinchy-co/angular-sdk";
import {NumeralPipe} from "ngx-numeral";
import {DropdownOption} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import {CinchyQueryService } from 'src/app/services/cinchy-query.service';
import {ConfigService } from 'src/app/config.service';
import {ToastrService } from 'ngx-toastr';
import {ImageType } from '../enums/imageurl-type';
import {faPlus} from '@fortawesome/free-solid-svg-icons';
import {AddNewOptionDialogComponent} from 'src/app/dialogs/add-new-option-dialog/add-new-option-dialog.component';
import {DialogService} from 'src/app/services/dialog.service';
import { faShareAlt } from '@fortawesome/free-solid-svg-icons';

//#region Cinchy Dynamic Link field
/**
 * This section is used to create Link field for the cinchy.
 * Lazy loading of the dropdown is used here. Bind dropdown on click
 */
//#endregion
@Component({
  selector: 'cinchy-link',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Link' &&
    field.cinchyColumn.canView)" class="full-width-element divMarginBottom">
      <div class="m-b-10">
        <div class="link-labels">
        <div>
          <fa-icon [icon]="faShareAlt"></fa-icon>
       </div>
       &nbsp;
          <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
            <a [href]="tableSourceURL" target="_blank">{{field.label}}</a>
            {{field.cinchyColumn.isMandatory == true && (field.value == '' || field.value == null) ? '*' : ''}}
          </label>
          <span *ngIf="createlinkOptionName">
          <a (click)="manageSourceRecords(field)">
          <fa-icon [icon]="faPlus" class="plusIcon btn-dynamic-child"></fa-icon>
          </a></span>
          <mat-icon *ngIf="charactersAfterWhichToShowList" class="info-icon"
                    [matTooltip]="toolTipMessage"
                    matTooltipClass="tool-tip-body"
                    matTooltipPosition="after"
                    aria-label="Button that displays a tooltip when focused or hovered over">
            info
          </mat-icon>

          <mat-icon *ngIf="field.caption" class="info-icon"
                    [matTooltip]="field.caption"
                    matTooltipClass="tool-tip-body"
                    matTooltipPosition="after"
                    aria-label="Button that displays a tooltip when focused or hovered over">
            contact_support
          </mat-icon>
        </div>

        <ng-container
          *ngIf="field.cinchyColumn.canEdit && !field.cinchyColumn.isViewOnly && !isDisabled && !downloadLink && showActualField">
          <div class="search-input-link">
            <input type="text" [formControl]="myControl" [matAutocomplete]="auto" class="form-control" #searchInput
                   (focus)="getListItems()"
                   (keydown) = "deleteDropdownVal($event)"
                   (blur)="setToLastValueSelected($event)"/>
            <mat-icon *ngIf="field.cinchyColumn.canEdit && !field.cinchyColumn.isViewOnly && !isDisabled">search
            </mat-icon>
          </div>
          <mat-autocomplete #auto="matAutocomplete"
                            (optionSelected)="callbackEvent(targetTableName,field.cinchyColumn.name, $event.option, 'value')"
                            [displayWith]="displayFn">
            <ng-container>
              <mat-option *ngIf="isLoading" class="is-loading">
                <mat-spinner diameter="35"></mat-spinner>
              </mat-option>
              <cdk-virtual-scroll-viewport *ngIf="(charactersAfterWhichToShowList && myControl.value)
             && (myControl.value.length >= charactersAfterWhichToShowList)"
                                           [itemSize]="48" [style.height.px]=4*48>
                <ng-container>
                  <mat-option [title]="option['label']" *ngFor="let option of filteredOptions" [value]="option">
                    {{option['label']}}
                  </mat-option>
                </ng-container>
              </cdk-virtual-scroll-viewport>
              <ng-container *ngIf="!charactersAfterWhichToShowList">
                <mat-option [title]="option['label']" *ngFor="let option of filteredOptions" [value]="option">
                  {{option['label']}}
                </mat-option>
              </ng-container>
            </ng-container>
          </mat-autocomplete>
        </ng-container>
        <ng-container *ngIf="!field.cinchyColumn.canEdit || field.cinchyColumn.isViewOnly || isDisabled">
          <label class="pre-formatted" *ngIf="showActualField"
                 [innerHTML]="selectedValue && selectedValue.label ? selectedValue.label : '-'"></label>
        </ng-container>

        <ng-container *ngIf="showImage && selectedValue">
          <img class="cinchy-images" *ngIf="selectedValue.label" [src]="selectedValue.label">
          <p *ngIf="!selectedValue.label">-</p>
        </ng-container>

        <ng-container *ngIf="showLinkUrl && selectedValue">
          <a *ngIf="selectedValue.label" [href]="selectedValue.label" target="_blank">Open</a>
          <label *ngIf="!selectedValue.label">-</label>
        </ng-container>
      </div>

      <ng-container *ngIf="downloadLink">
        <div *ngFor="let item of downloadableLinks" style="margin-top: -12px">
          <a *ngIf="downloadLink" [href]="item.fileUrl" [title]="'Download ' + item.fileName">
            <img *ngIf="renderImageFiles && fileNameIsImage(item.fileName)" style="height: 100px" [src]="item.fileUrl"/>
            <span [style.marginLeft.px]="renderImageFiles && fileNameIsImage(item.fileName) ? 12 : 0">{{item.fileName}}</span>
          </a>
          <mat-icon class="file-delete-icon" (click)="onDeleteFile(item)" title="Delete">close</mat-icon>
        </div>
        <input #fileInput class='form-control'
          *ngIf="!(field.cinchyColumn.canEdit=== false) && (downloadableLinks == null || downloadableLinks.length === 0)"
          type="file"
          (change)="onFileSelected($event)"
          style="margin-top: -10px">
      </ng-container>

      <mat-error class="mat-error-move-up-10"
                 *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
        *{{field.label}} is Required.
      </mat-error>
    </div>
  `,
  providers: [DropdownDatasetService]
})
export class LinkDirective implements OnInit {
  @ViewChild('searchInput') searchInput;
  @ViewChild('fileInput') fileInput: ElementRef;
  
  @Input() field: any;
  @Input() rowId: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
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
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === 'LinkUrl';
    this.showActualField = !this.showImage && !this.showLinkUrl;
    let url = this._configService.envConfig.cinchyRootUrl;
    this.tableSourceURL = url + '/Tables/' + this.field.cinchyColumn.LinkTargetTableId;
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
      console.log('getNewContactAdded', value);
      if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]['Table'] === value.tableName) {
        this.updateList = true;
        this.filteredOptions = null;
        this.getListItems();
      }
    })
  }

  setWhenNewRowAddedForParent() {
    this.field.value = typeof this.rowId === 'string' ? +this.rowId : this.rowId;
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
      let tableColumnQuery: string = 'select tc.[Table].[Domain].[Name] as \'Domain\', tc.[Table].[Name] as \'Table\', tc.[Name] as \'Column\' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = ' + linkTargetId;
      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.FormFieldsJsonData);
      if (formFieldsJsonData && formFieldsJsonData.Columns) {
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
          const emptyOption = new DropdownOption('DELETE', '', '');
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
      this.myControl.setValue('');
      return;
    }
    
    this.myControl.valueChanges.pipe(
      startWith('')).subscribe(value => {
      if (value && typeof value !== 'object') {
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
    return contact && contact.label ? contact.label : '';
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
    if (typeof value === 'object') {
      return value.label ? value.label.split(',')[0].toLowerCase() : '';
    }
    return value.toLowerCase();
  }

  setToLastValueSelected(event) {
    setTimeout(() => {
      !this.selectedValue && this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name, {value: {}}, 'value');
       this.selectedValue ? this.myControl.setValue(this.selectedValue) : this.myControl.setValue('');
       if(this.selectedValue == null){
        const val = this.field.dropdownDataset.options.find(item => item.id === "DELETE");
        if(val){
          this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name,{value: val}, 'value');
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
            'TableName': targetTableName,
            'ColumnName': columnName,
            'Value': value,
            'Text': text,
            'Event': event,
            'HasChanged': this.field.cinchyColumn.hasChanged,
            'Form': this.field.form,
            'Field': this.field
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
      const replacedCinchyIdUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.attachmentUrl.replace('@cinchyid', this.rowId);
      const replacedFileIdUrl = replacedCinchyIdUrl.replace('@fileid', this.selectedValue.id);
      const selectedValuesWithUrl = {fileName: this.selectedValue.label, fileUrl: replacedFileIdUrl, fileId: this.selectedValue.id};
      this.downloadableLinks.push(selectedValuesWithUrl);
    }
  }

  checkForDisplayColumnFormatter() {
    if (this.field.cinchyColumn.IsDisplayColumn && this.field.cinchyColumn.numberFormatter
      && this.selectedValue && this.selectedValue.label) {
      const numeralValue = new NumeralPipe(this.selectedValue.label);
      this.selectedValue.label = numeralValue.format(this.field.cinchyColumn.numberFormatter);
    }
  }

  onFileSelected(event: any) {
    if (event?.target?.files?.length === 0) {
      return;
    }

    const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace('@cinchyid', this.rowId);
    this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
      resp => {
        this._toastr.success('File uploaded', 'Success');
        this.fileInput.nativeElement.value = '';
        this.getAndSetLatestFileValue();
      }, 
      error => {
        this._toastr.error('Could not upload the file', 'Error');
      });
  }

  getAndSetLatestFileValue() {
    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.rowId).subscribe(resp => {
      if (resp && resp.length) {
        this.field.value = resp[0].fileId;
        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace('@cinchyid', this.rowId);
        const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace('@fileid', resp[0].fileId);
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
    this.field.value = '';
    this.field.cinchyColumn.hasChanged = true;
    this.downloadableLinks = [];
  }

  manageSourceRecords(childFormData: any){
    //implement new method for add new row in source table
    let data = {
      childFormData: childFormData,
      values: null,
      title: 'Add Source-Table-Name',
      type: 'Add',
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
    return  lowercase.endsWith('.png') ||
            lowercase.endsWith('.jpg') ||
            lowercase.endsWith('.jpeg') ||
            lowercase.endsWith('.gif') ||
            lowercase.endsWith('.svg');
  }

  deleteDropdownVal(event){
    const key = event.key;
    if (key === "Delete") {
       const val = this.field.dropdownDataset.options.find(item => item.id === "DELETE");
       if(val){
        this.selectedValue = null;
        this.myControl.setValue('');
        this.callbackEvent(this.targetTableName, this.field.cinchyColumn.name,{value: val}, 'value');
       }
    }
  }
  //#endregion
}
