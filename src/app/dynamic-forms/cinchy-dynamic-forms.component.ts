import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { isNullOrUndefined } from 'util';
import { ChildFormDirective } from './fields/cinchy-child-form.directive';
import { MatDialog } from '@angular/material';
import { CinchyService, QueryType } from '@cinchy-co/angular-sdk';
import { IForm } from './models/cinchy-form.model';
import { IQuery } from './models/cinchy-query.model';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { AppStateService } from '../services/app-state.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CinchyQueryService } from '../services/cinchy-query.service';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { PrintService } from './service/print/print.service';
import { IFormMetadata } from '../models/form-metadata-model';
import { IFormSectionMetadata } from '../models/form-section-metadata.model';
import { ILookupRecord } from '../models/lookup-record.model';
import { FormHelperService } from './service/form-helper/form-helper.service';
import { SearchDropdownComponent } from '../shared/search-dropdown/search-dropdown.component';
import { ConfigService } from '../config.service';

@Component({
  selector: 'cinchy-dynamic-forms',
  templateUrl: './cinchy-dynamic-forms.component.html',
  styleUrls: ['./style/style.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CinchyDynamicFormsComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('recordDropdown') dropdownComponent:SearchDropdownComponent;
  
  @Input() formId: number | string;
  @Input() formMetadata: IFormMetadata;
  @Input() formSectionsMetadata: IFormSectionMetadata[];
  @Input() addNewFromSideNav: boolean;

  @Input('lookupRecords') set lookupRecords(value: ILookupRecord[]) { this.setLookupRecords(value); }
  lookupRecordsList: ILookupRecord[];

  @Output() eventHandler = new EventEmitter<any>();
  @Output() rowUpdated = new EventEmitter<any>();
  @Output() closeAddNewDialog = new EventEmitter<any>();

  form: IForm = null;
  rowId: number | string;
  fieldsWithErrors: Array<any>;
  currentRow: ILookupRecord;
  destroy$: Subject<boolean> = new Subject<boolean>();
  isCloneForm: boolean = false;

  enableSaveBtn: boolean = false;
  formHasDataLoaded: boolean = false;
  isLoadingForm: boolean = false;

  private childDataForm = [];
  private childCinchyId = -1;
  private childFieldArray: Array<any> = [];
  private childForms: any;

  constructor(
    private _dialog: MatDialog,
    private _cinchyService: CinchyService,
    private _toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private appStateService: AppStateService,
    private cinchyQueryService: CinchyQueryService,
    private printService: PrintService,
    private _formHelperService: FormHelperService,
    private _configService: ConfigService
  ) { }

  ngOnInit() {
    this.appStateService.getSaveClickedObs().pipe(takeUntil(this.destroy$)).subscribe((saveClicked) => {
      saveClicked && this.saveForm(this.form, this.rowId);
    });

    this.appStateService.onRecordSelected().subscribe(async resp => {
      if (resp?.cinchyId == null) {
        this.rowId = null;
        this.currentRow = null;
      } else {
        const setLookupRecords = this.rowId == null;
        this.rowId = resp.cinchyId;
        if (setLookupRecords)
          this.setLookupRecords(this.lookupRecordsList);
      }
      if (resp == null || !(resp.doNotReloadForm)) {
        await this.loadForm();
      }
    });
  }

  async rowSelected(row) {
    this.currentRow = row ?? this.currentRow;
    this.appStateService.setRecordSelected(row?.id ?? this.rowId);
  }

  setLookupRecords(lookupRecords: ILookupRecord[]) {
    if (lookupRecords == null)
      return;

    this.lookupRecordsList = this.checkNoRecord(lookupRecords);
    this.currentRow = this.lookupRecordsList.find(item => item.id == this.rowId);
    this.rowUpdated.emit(this.rowId);
    this.dropdownComponent?.setSelectedOption(this.currentRow);
    this.dropdownComponent?.resetDropdown();
  }

  previousRow() {
    const currentRowIndex = this.lookupRecordsList.findIndex(item => item.id == this.rowId);
    const newIndex = currentRowIndex ? currentRowIndex - 1 : this.lookupRecordsList.length - 1;
    this.setNewRow(newIndex);
  }

  checkNoRecord(lookupRecord:ILookupRecord[]): ILookupRecord[]{
    if (lookupRecord && lookupRecord.length > 0){
      return lookupRecord;
    }
    else{
      return [{id: -1, label: 'No records available'}];
    }
  }

  nextRow() {
    const currentRowIndex = this.lookupRecordsList.findIndex(item => item.id == this.rowId);
    const newIndex = currentRowIndex == this.lookupRecordsList.length - 1 ? 0 : currentRowIndex + 1;
    this.setNewRow(newIndex);
  }

  setNewRow(newIndex) {
    const newSelectedRow = this.lookupRecordsList[newIndex];
    this.currentRow = newSelectedRow;
    this.rowSelected(newSelectedRow);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  //#region Get Form Meta Data On Change of the Library
  async ngOnChanges(changes: SimpleChanges) {
    if (changes.rowId && changes.rowId.currentValue === null) {
      this.currentRow = null;
    }
  }

  //#endregion
  //#region Edit Add Child Form Data
  async openChildForm(data) {
    if (!this.isCloneForm && (!this.rowId || this.rowId === 'null')) {
      const formvalidation = this.form.checkFormValidation();
      if (formvalidation) {
        this.saveForm(this.form, this.rowId, data);
      }
    } else {
      this.openChildDialog(data);
    }
  }

  afterChildFormEdit(eventData, childForm) {
    this.childForms = childForm;
    if (isNullOrUndefined(eventData))
      return;

    if (isNullOrUndefined(childForm.sections.MultiFields)) {
      childForm.sections.MultiFields = [];
    }

    const childResult = {};
    const childResultForLocal = {};
    const formvalidation = eventData.data.checkChildFormValidation();
    if (formvalidation.status) {
      eventData.data.sections.forEach(section => {
        if (isNullOrUndefined(section.MultiFields)) {
          section.MultiFields = [];
        }

        const fieldRow = section.MultiFields.filter(rowData => {
          if (rowData['Cinchy ID'] === eventData.id) {
            return rowData;
          }
        });

        // Check for the record is new or in edit mode
        const childFieldRow = this.childFieldArray.filter(rowData => {
          if (rowData['Cinchy ID'] === eventData.id) {
            return rowData;
          }
        });

        if (fieldRow.length > 0) {
          // if the code is in edit mode
          section.fields.forEach(element => {
            if (element.cinchyColumn.dataType === 'Link') {
              if (!isNullOrUndefined(element.dropdownDataset)) {
                let dropdownResult;
                if (element.cinchyColumn.isMultiple) {
                  const numberValueToString = typeof element.value === 'number' ? `${element.value}` : element.value;
                  // Still checking for string as it can be an array too
                  const elementValues = typeof numberValueToString === 'string' ? numberValueToString.split(',').map(_ => _.trim()) : numberValueToString;
                  dropdownResult = elementValues ? 
                    element.dropdownDataset.options.filter(option => elementValues.find(eleVal => eleVal == option.id)) : 
                    [];

                  if (!dropdownResult?.length) {
                    dropdownResult = [element.dropdownDataset.options.find(e => e.id == element.value)].filter(_ => _);
                  }
                  // CHECK FOR ELEMENT . VALUE AND IF NOT THERE then do same
                } else {
                  dropdownResult = [element.dropdownDataset.options.find(e => e.id === element.value)].filter(_ => _);
                }
                if (dropdownResult && dropdownResult.length && dropdownResult[0]) {
                  fieldRow[0][element.cinchyColumn.name] = dropdownResult.map(item => item.label).join(', ');
                } else {
                  fieldRow[0][element.cinchyColumn.name] = '';
                }
              }
            } else {
              fieldRow[0][element.cinchyColumn.name] = element.value;
            }
          });
        } else {
          // if the code is in add mode.
          section.fields.forEach(element => {
            if ((element.cinchyColumn.dataType === 'Link') && element.cinchyColumn.isMultiple) {
              if (!isNullOrUndefined(element.dropdownDataset) && element.dropdownDataset.options) {
                
                let dropdownResult;
                const numberValueToString = typeof element.value === 'number' ? `${element.value}` : element.value;
                // Still checking for string as it can be an array too
                const elementValues = typeof numberValueToString === 'string' ? numberValueToString.split(',').map(_ => _.trim()) : numberValueToString;
                dropdownResult = elementValues ? element.dropdownDataset.options.filter(option => elementValues.find(eleVal => eleVal == option.id)) : [];
                //   const dropdownResult = element.dropdownDataset.options.filter(e => element.value.find(eleVal => eleVal === e.id));
                if (dropdownResult && dropdownResult.length) {
                  childResult[element.cinchyColumn.name] = element.value;
                  childResult[element.cinchyColumn.name + ' label'] = dropdownResult.map(item => item.label).join(',');
                  childResultForLocal[element.cinchyColumn.name] = dropdownResult.map(item => item.label).join(',');
                } else {
                  childResultForLocal[element.cinchyColumn.name] = '';
                }
              } else {
                childResult[element.cinchyColumn.name] = element.value;
                childResultForLocal[element.cinchyColumn.name] = element.value;
              }
            } else if (element.cinchyColumn.dataType === 'Link' || element.cinchyColumn.dataType === 'Choice') {
              if (!isNullOrUndefined(element.dropdownDataset) && element.dropdownDataset.options) {
                const dropdownResult = element.dropdownDataset.options.find(e => e.id ===
                  element.value);
                if (!isNullOrUndefined(dropdownResult)) {
                  childResult[element.cinchyColumn.name] = dropdownResult.id;
                  childResult[element.cinchyColumn.name + ' label'] = dropdownResult.label;
                  childResultForLocal[element.cinchyColumn.name] = dropdownResult.label;
                } else {
                  childResultForLocal[element.cinchyColumn.name] = '';
                }
              } else {
                childResult[element.cinchyColumn.name] = element.value;
                childResultForLocal[element.cinchyColumn.name] = element.value;
              }
            } else if (element.cinchyColumn.dataType === 'Binary') {
              childResult[element.cinchyColumn.name] = element.value;
              childResultForLocal[element.cinchyColumn.name] = element.value;
              const keyForBinary = element.cinchyColumn.name + '_Name';
              childResult[keyForBinary] = element.cinchyColumn.FileName;
              childResultForLocal[keyForBinary] = element.cinchyColumn.FileName;
            } else {
              childResult[element.cinchyColumn.name] = element.value;
              childResultForLocal[element.cinchyColumn.name] = element.value;
            }
            if (element.cinchyColumn.dataType === 'Yes/No') {
              if (element.value === '' || isNullOrUndefined(element.value)) {
                element.value = false;
                childResult[element.cinchyColumn.name] = false;
                childResultForLocal[element.cinchyColumn.name] = false;
              }
            }
          });
          // create a random cinchy id for the local storage.
          const random = eventData.id = Math.random();
          childResultForLocal['Cinchy ID'] = random;
          childResult['Cinchy ID'] = random;
          // store child form data in local storage.
          this.childFieldArray.push(childResult);
          section.MultiFields.push(childResultForLocal);
        }

        if (childFieldRow.length > 0) {
          section.fields.forEach(element => {
            if (element.cinchyColumn.dataType === 'Link') {
              if (!isNullOrUndefined(element.dropdownDataset) && element.dropdownDataset.options) {
                const dropdownResult = element.dropdownDataset.options.find(e => e.id ===
                  element.value);
                if (!isNullOrUndefined(dropdownResult)) {
                  childFieldRow[0][element.cinchyColumn.name + ' label'] = dropdownResult.label;
                  childFieldRow[0][element.cinchyColumn.name] = dropdownResult.id;
                } else {
                  childFieldRow[0][element.cinchyColumn.name] = '';
                }
              }
            } else {
              childFieldRow[0][element.cinchyColumn.name] = element.value;
            }
          });
        }
      });
      const _cinchyid = eventData.id;
      const _childFormId = `${_cinchyid}-${eventData.childFormId}`;
      if (eventData.id < 1) { // Why there was a logic of = 1??, removing = for now
        eventData.id = null;
      }
      const insertQuery: IQuery = eventData.data.generateSaveForChildQuery(eventData.id, this.isCloneForm);

      // Generate insert query for child form
      const queryResult = {
        id: _cinchyid,
        Query: insertQuery,
        result: eventData.data,
        childFormId: _childFormId
      };
      // check query for add/edit mode
      const _query = this.childDataForm.filter(x => x.childFormId === _childFormId);
      if (_query.length > 0) { // Issue was when both child rows have same ID it was overriding it, that's why using uniquee childFormId
        _query[0].Query = insertQuery;
      } else {
        // create a collection of queries for child form
        this.childDataForm.push(queryResult);
      }
      this.childCinchyId = eventData.id;
    }
  }

  openChildDialog(data) {
    const dialogData = { ...data, rowId: this.rowId };
    const dialogRef = this._dialog.open(ChildFormDirective, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      this.afterChildFormEdit(result, data.multiFieldValues);
    });
  }

  //#endregion
  //#region 
  /**
   * Uses the metadata from Cinchy to create and load the IForm object, then it'll fill it with the form object with actual data
   * Gets called upon load, save, and row changes
   */
  async loadForm(childData?) {
    this.isCloneForm = false;
    this.childDataForm = [];
    this.formHasDataLoaded = false;
    this.enableSaveBtn = false;

    //if (this.isLoadingForm)
    //  return;
    this.isLoadingForm = true;

    try {
      let tableEntitlements = await this._cinchyService.getTableEntitlementsById(this.formMetadata.tableId).toPromise();
      this.form = await this._formHelperService.generateForm(this.formMetadata, this.rowId,tableEntitlements);
      this._formHelperService.fillWithSections(this.form, this.formSectionsMetadata);
      this.cinchyQueryService.getFormFieldsMetadata(this.formId).subscribe(
        async (formFieldsMetadata) => {

          let selectedLookupRecord = this.lookupRecordsList.find(_ => _.id == this.rowId);
         
          setTimeout(async () => {
            await this._formHelperService.fillWithFields(this.form, this.rowId as string, this.formMetadata, formFieldsMetadata, selectedLookupRecord,tableEntitlements);
            await this._formHelperService.fillWithData(this.form, this.rowId as string, selectedLookupRecord, null, null, null, this.afterChildFormEdit.bind(this));
            this.enableSaveBtn = true;
          }, 1000);

          this.isLoadingForm = false;
          this.formHasDataLoaded = true;
         
          this.spinner.hide();

          if (childData) {
            setTimeout(() => {
              childData.rowId = this.rowId;
              this.appStateService.setOpenOfChildFormAfterParentSave(childData);
            }, 500);
          }
        },
        error => {
          this.spinner.hide();
          console.error(error);
        });
    } catch (e) {
      this.spinner.hide();
      console.error(e);
    }
  }
  //#endregion

  //#region  Save Values of MetaData
  public async saveForm(formdata, _RowId, childData?) {

    // check validations for the form eg: Required, Regular expression
    const formvalidation = formdata.checkFormValidation();

    if (formvalidation.status) {
      
      // Generate dynamic query using dynamic form meta data
      this.spinner.show();
      const insertQuery: IQuery = formdata.generateSaveQuery(_RowId, this._configService.cinchyVersion, this.isCloneForm);

      // execute dynamic query
      if (insertQuery) {
        if (insertQuery.query) {
          this._cinchyService.executeCsql(insertQuery.query, insertQuery.params).subscribe(
            response => {
              this.spinner.hide();

              if (isNullOrUndefined(this.rowId) || this.rowId == 'null') {
                this.appStateService.setRecordSelected(response.queryResult._jsonResult.data[0][0], true);
                this.isCloneForm = false;
              }

              this.saveMethodLogic(this.rowId, response, childData);
              this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
              // rowId = this.saveMethodLogic(rowId, response);
              this._toastr.success('Data Saved Successfully', 'Success');
              if (this.addNewFromSideNav) {
                this.closeAddNewDialog.emit(this.rowId);
              }
              this.appStateService.hasFormChanged = false;

              // pass response to the project on data save
            },
            error => {
              console.error('Error in cinchy-dynamic-forms save method', error);
              this._toastr.error('Error while updating file data.', 'Error');
              this.spinner.hide();
            });
        } else if (insertQuery.attachedFilesInfo && insertQuery.attachedFilesInfo.length) {
          this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
        }
      } else {
        this.saveMethodLogic(this.rowId, null);
      }
    } else {
      this.fieldsWithErrors = formdata.getErrorFields();
      this._toastr.warning(formvalidation.message, 'Warning');
    }
  }

  private updateFileAndSaveFileNames(attachedFilesInfo) {
    attachedFilesInfo.forEach(async (fileDetails) => {
      const params = {
        '@p0': fileDetails.fileName
      };
      if (fileDetails.query) {
        const childCinchyId = fileDetails.childCinchyId;
        const fileQuery = `update t
                           set [${fileDetails.column}] = @p0
                           from [${fileDetails.domain}].[${fileDetails.table}] t
                           where t.[Cinchy Id] = ${childCinchyId ? childCinchyId : this.rowId} and t.[Deleted] is null`;
        const updateParams = {
          '@rowId': childCinchyId ? childCinchyId : this.rowId,
          '@fieldValue': fileDetails.value
        };
        try {
          await this._cinchyService.executeCsql(fileDetails.query, updateParams).toPromise();
          await this._cinchyService.executeCsql(fileQuery, params).toPromise();
          this._toastr.success('Saved successfully', 'Success');
          this.spinner.hide();
        } catch (e) {
          this._toastr.error('Error while updating file data.', 'Error');
          this.spinner.hide();
        }
      } else {
        const query = `update t
                       set [${fileDetails.column}] = @p0
                       from [${fileDetails.domain}].[${fileDetails.table}] t
                       where t.[Cinchy Id] = ${this.rowId} and t.[Deleted] is null`;
        await this._cinchyService.executeCsql(query, params).toPromise();
      }
    });
  }

  private async saveMethodLogic(rowId: any, response, childData?) {

    if (response && response.queryResult._jsonResult.data.length > 0) {
      rowId = response.queryResult._jsonResult.data[0][0];
    } else {
      rowId = this.rowId;
    }

    if (this.childDataForm == null || this.childDataForm.length == 0) 
      this.eventHandler.emit(rowId);

    console.log('IN SAVE OUT CHILD', this.childCinchyId);
    if (this.childCinchyId !== -1) {
      console.log('IN SAVE CHILD');
      await this.savechildForm(rowId, 0);
    } else {
      this.spinner.hide();
      if (!isNullOrUndefined(this.rowId)) {
        this.getSavedData(childData);
      }
      if (!response) {
        this._toastr.warning('No changes were made', 'Warning');
      }
    }
    this.eventHandler.emit(rowId);
    return rowId;
  }

  //#endregion
  //#region save Child Form Values
  public async savechildForm(sourceid, idx): Promise<void> {
    return new Promise((resolve, reject) => {

      if (this.childDataForm.length === 0 && !isNullOrUndefined(this.rowId)) {
        this.getSavedData();
        resolve();
        return;
      }

      if (this.childDataForm.length <= idx) {
        resolve();
        return;
      }
      
      this.spinner.show();
      const element = this.childDataForm[idx];
      if (element.Query.query) {
        element.Query.query = element.Query.query.replace('{sourceid}', sourceid);
        const params = JSON.stringify(element.Query.params).replace('{sourceid}', sourceid);
        this._cinchyService.executeCsql(element.Query.query, JSON.parse(params)).subscribe(
          async response => {
            this.spinner.hide();
            await this.savechildForm(sourceid, idx + 1);
            this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);
            if (this.childDataForm.length === (idx + 1)) {
              await this.getchildSavedData(sourceid);
              this.childDataForm = [];
              this.childCinchyId = -1;
              this._toastr.success('Child form saved successfully', 'Success');
            }
            resolve();
          },
          error => {
            this.spinner.hide();
            this._toastr.error('Error while saving child form', 'Error');
            reject(error);
          });
      } else {
        this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);
        resolve();
      }
    });
  }

  //#endregion
  //#region Get Parent Form Data After Save in Database
  public async getSavedData(childData?) {
    this.loadForm(childData);
  }

  //#endregion
  //#region Get Child Form Data After Save in Database
  public async getchildSavedData(rowID) {
    const isChild = true;
    this.spinner.show();
    const selectQuery: IQuery = this.childForms.generateSelectQuery(rowID, this.formMetadata.tableId);
    if (this.childForms.childFormParentId && this.childForms.childFormLinkId) {
      const queryToGetMatchIdFromParent = `SELECT TOP 1 ${this.childForms.childFormParentId} as 'idParent'
                                           FROM [${this.formMetadata.domainName}].[${this.formMetadata.tableName}]
                                           WHERE [Cinchy Id] = ${this.rowId}`;
      let cinchyIdForMatchFromParentResp = (await this._cinchyService.executeCsql(queryToGetMatchIdFromParent, null, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();
      let idForParentMatch = cinchyIdForMatchFromParentResp[0]['idParent'];
      if (idForParentMatch) {
        if (selectQuery.params == null) {
          selectQuery.params = {};
        }
        selectQuery.params['@parentCinchyIdMatch'] = idForParentMatch;
      }
    }
    const selectQueryResult: Object[] = (await this._cinchyService.executeCsql(
      selectQuery.query, selectQuery.params, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();
    this.spinner.hide();
    this.childForms.loadMultiRecordData(rowID, selectQueryResult);
  }

  handleFieldsEvent($event) {
    this.appStateService.hasFormChanged = this.appStateService.hasFormChanged ? this.appStateService.hasFormChanged
      : $event.Data ? $event.Data.HasChanged : true;

    // If child flattened child form
    if ($event?.Data?.Form?.isChild && $event?.Data?.Form?.flatten) {
      // If contains a record
      if ($event.Data.Form.sections?.length && $event.Data.Form.sections[0].fields?.length) {
        this.afterChildFormEdit({
          'childFormId': $event.Data.Form.id,
          'data': $event.Data.Form,
          'id': $event.Data.Form.sections[0].MultiFields?.length && $event.Data.Form.sections[0].MultiFields[$event.Data.Form.sections[0].MultiFields.length - 1]['Cinchy ID'] != null ? 
            $event.Data.Form.sections[0].MultiFields[$event.Data.Form.sections[0].MultiFields.length - 1]['Cinchy ID'] : 
            0
        }, $event.Data.Form);
      }
    }

    if ($event?.Data?.ColumnName && $event?.Data?.Form?.childFieldsLinkedToColumnName && $event?.Data?.Form?.childFieldsLinkedToColumnName[$event.Data.ColumnName]) {
      for (let linkedFormField of $event?.Data?.Form?.childFieldsLinkedToColumnName[$event.Data.ColumnName]) {
        if (linkedFormField.form.isChild && linkedFormField.form.flatten)
        {
          linkedFormField.value = $event.Data.Value;
          linkedFormField.cinchyColumn.hasChanged = true;

          this.afterChildFormEdit({
            'childFormId': linkedFormField.form.id,
            'data': linkedFormField.form,
            'id': linkedFormField.form.sections[0].MultiFields?.length && linkedFormField.form.sections[0].MultiFields[linkedFormField.form.sections[0].MultiFields.length - 1]['Cinchy ID'] != null ? 
            linkedFormField.form.sections[0].MultiFields[linkedFormField.form.sections[0].MultiFields.length - 1]['Cinchy ID'] : 
              0
          }, linkedFormField.form);
        }
      }
    }
  }

  openDeleteConfirm(data): void {
    const { domain, table, field, multiarray } = data;
    const dialogRef = this._dialog.open(MessageDialogComponent, {
      width: '400px',
      data: {
        title: 'Please confirm',
        message: 'Are you sure you want to delete this record ?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'Yes') {
        if (!isNullOrUndefined(field['Cinchy ID'])) {
          const id = field['Cinchy ID'];
          if (field['Cinchy ID'] > 0) {
            // Query to delete record by Cinchy ID
            let query = `delete
                         from [${domain}].[${table}]
                         where
                             [Cinchy Id] = ${id}
                           and [Deleted] is null`;
            this._cinchyService.executeCsql(query, null).subscribe(
              response => {
                const idx = multiarray.indexOf(field);
                if (idx > -1) {
                  multiarray.splice(idx, 1);
                  // Remove record from local collection.
                  this.childDataForm = this.childDataForm.filter(
                    x => x.id !== id
                  );
                  this.childFieldArray = this.childFieldArray.filter(
                    x => x['Cinchy ID'] !== id
                  );
                  this._toastr.success(
                    'Record deleted successfully',
                    'Success'
                  );
                }
              },
              error => {
                this.spinner.hide();
              }
            );
          } else {
            const idx = multiarray.indexOf(field);
            if (idx > -1) {
              multiarray.splice(idx, 1);
              this.childDataForm = this.childDataForm.filter(x => x.id !== id);
              this.childFieldArray = this.childFieldArray.filter(
                x => x['Cinchy ID'] !== id
              );
              this._toastr.success('Record deleted successfully', 'Success');
            }
          }
        } else {
          const idx = multiarray.indexOf(field);
          if (idx > -1) {
            multiarray.splice(idx, 1);
          }
        }
      }
    });
  }

  printCurrentForm() {
    this.printService.generatePdf(this.form, this.currentRow);
  }

  cloneFormData() {
    this.isCloneForm = true;
    this.form.rowId = null;
    this.rowId = null;
    this.childDataForm = [];

    let showWarningAboutChildFormDuplication = true;
    this.form.sections?.forEach( (section) => {
      section.fields?.forEach( (field) => {

        if (field.cinchyColumn)
          field.cinchyColumn.hasChanged = true;

        if (field.childForm != null) {
          field.childForm.rowId = null;
          field.childForm.id = -1;
          if (field.childForm.sections && field.childForm.sections[0].MultiFields) {

            if (field.childForm.childFormLinkId && field.childForm.childFormParentId)
            {
              if (!field.childForm.flatten && showWarningAboutChildFormDuplication) {
                showWarningAboutChildFormDuplication = false;
                this._toastr.warning('This cloned record contains child records that were also cloned, please ensure the field used to link is updated accordingly.', 'Warning', {timeOut: 15000, extendedTimeOut: 15000});
              }

              let childRecordsToClone = field.childForm.flatten ? 
              [field.childForm.sections[0].MultiFields[field.childForm.sections[0].MultiFields.length - 1]] :
              field.childForm.sections[0].MultiFields;

              let startingCloneRecordIdx = field.childForm.flatten ? childRecordsToClone.length - 1 : 0;
              let numOfRecordsToClone = field.childForm.flatten ? 1 : childRecordsToClone.length;

              childRecordsToClone.forEach( (childFormRecord) => {
                childFormRecord['Cinchy ID'] = Math.random();

                field.childForm.sections.forEach( (childFormSection) => {
                  childFormSection.fields?.forEach( (childFormField) => {
                    if (childFormField.cinchyColumn)
                      childFormField.cinchyColumn.hasChanged = true;

                    if (childFormField.cinchyColumn.dataType === 'Link' && childFormField['dropdownDataset'] && childFormRecord[childFormField.cinchyColumn.name]) {
                      if (childFormField.cinchyColumn.isMultiple) {
                        const fieldValueLabels = childFormRecord[childFormField.cinchyColumn.name].split(',');
                        const trimedValues = fieldValueLabels?.length ? fieldValueLabels.map(label => label.trim()) : fieldValueLabels;
      
                        let multiDropdownResult = childFormField['dropdownDataset'].options.filter(e => trimedValues.indexOf(e.label) > -1);

                        // Hack for non-flattened child forms, for whatever reason, the dropdownDataset ends up being populated with the values of the child form records
                        if (!childFormField.form.flatten && !multiDropdownResult?.length) {
                          let unflattedMultiDropdownResult = childFormField['dropdownDataset'].options.find(e => e.label == childFormRecord[childFormField.cinchyColumn.name]);
                          multiDropdownResult = unflattedMultiDropdownResult ? [unflattedMultiDropdownResult] : multiDropdownResult;
                        }

                        childFormField.value = multiDropdownResult?.length ? 
                          multiDropdownResult.map(item => item.id).join(', ') :
                          childFormRecord[childFormField.cinchyColumn.name];
                      } else {
                        let singleDropdownResult = childFormField['dropdownDataset'].options.find(e => e.label == childFormRecord[childFormField.cinchyColumn.name]);
                        childFormField.value = singleDropdownResult ? singleDropdownResult.id : childFormRecord[childFormField.cinchyColumn.name];
                      }
                    } else if (childFormField.cinchyColumn.dataType === 'Choice' && childFormField.cinchyColumn.isMultiple && childFormRecord[childFormField.cinchyColumn.name]) {
                      const fieldValueLabels = typeof childFormRecord[childFormField.cinchyColumn.name] === 'string' ? childFormRecord[childFormField.cinchyColumn.name].split(',') : childFormRecord[childFormField.cinchyColumn.name];
                      childFormField.value = fieldValueLabels?.length ? fieldValueLabels.map(label => label.trim()) : childFormRecord[childFormField.cinchyColumn.name];
                    } else {
                      childFormField.value = childFormRecord[childFormField.cinchyColumn.name] ?? null;
                    }
                  });
                });

                this.afterChildFormEdit({
                  'childFormId': field.childForm.id,
                  'data': field.childForm,
                  'id': 0
                }, field.childForm);
              });
              field.childForm.sections[0].MultiFields.splice(startingCloneRecordIdx, numOfRecordsToClone);
            }
            else 
            {
              field.childForm.sections[0].MultiFields.splice(0, field.childForm.sections[0].MultiFields.length);
            }
          };
        }
      });
    });
    this._toastr.info('The record was cloned, please save in order to create it.', 'Info', {timeOut: 15000, extendedTimeOut: 15000});
  }
}

