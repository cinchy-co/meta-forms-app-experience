import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { isNullOrUndefined } from 'util';
import { ChildFormDirective } from './fields/cinchy-child-form.directive';
import { MatDialog } from '@angular/material';
import { CinchyService, QueryType } from '@cinchy-co/angular-sdk';
import { Form, IForm } from './models/cinchy-form.model';
import { DropdownDataset } from './service/cinchy-dropdown-dataset/cinchy-dropdown-dataset';
import { FormSection } from './models/cinchy-form-sections.model';
import { CinchyColumn, ICinchyColumn } from './models/cinchy-column.model';
import { IQuery } from './models/cinchy-query.model';
import { FormField } from './models/cinchy-form-field.model';
import { ResponseType } from './enums/response-type.enum';
import { EventCallback, IEventCallback } from './models/cinchy-event-callback.model';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { AppStateService } from '../services/app-state.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CinchyQueryService } from '../services/cinchy-query.service';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { PrintService } from './service/print/print.service';
import { SectionService } from '../services/section-service';
import { SpinnerCondition } from './models/cinchy-spinner.model';

@Component({
  selector     : 'cinchy-dynamic-forms',
  templateUrl  : './cinchy-dynamic-forms.component.html',
  styleUrls    : ['./style/style.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CinchyDynamicFormsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() RowId: number | string;
  @Input() FormId: number | string;
  nonExpandedSection: boolean;
  closedSectionData: boolean = false;
  openSectionData: boolean = false;
  enableSaveBtn: boolean = false;
  pendingcall: any;
  condition: SpinnerCondition = {};
  isCloneForm: boolean = false;

  @Input('allRows') set allRows(value: any) {
    this.setAllRowsData(value);
  }

  @Input() formSections;
  @Input() CallbackEventResponse: any;
  @Input() addNewFromSideNav: boolean;
  @Input('MetaData')
  MetaData: object[];

  @Input('tabId')
  tabId: any;
  @Output() EventHandler = new EventEmitter<any>();
  @Output() rowChanged = new EventEmitter<any>();
  @Output() rowUpdated = new EventEmitter<any>();
  @Output() closeAddNewDialog = new EventEmitter<any>();
  formFieldMetadataResult: any;
  private parentTableId = 0;
  form: IForm = null;
  public childDataForm = [];
  public childCinchyId = -1;
  public multiFieldValues: any;
  public childFieldArray: Array<any> = [];
  public formsData: any;
  public unique = [];
  public childForms: any;
  public tableEntitlements: any;
  currentRow;
  dropdownOfAllRows;
  destroy$: Subject<boolean> = new Subject<boolean>();
  fieldsWithErrors: Array<any>;
  hasChildTableAccess = true;
  parentTableName: string;
  parentDomain: string;
  JsonDataResp: any;
  sectionIdList = [];
  childSectionList = [];

  public formFieldMetaDatas = {};

  constructor(private _dialog: MatDialog, private _cinchyService: CinchyService,
              private _toastr: ToastrService, private spinner: NgxSpinnerService,
              private appStateService: AppStateService,
              private cinchyQueryService: CinchyQueryService,
              private printService: PrintService, private sectionService: SectionService) {
    // AppState service and CinchyQueryService is outside of Dynamic forms and is used to interact with outer world of forms
  }

  ngOnInit() {
    this.appStateService.getSaveClickedObs().pipe(takeUntil(this.destroy$)).subscribe((saveClicked) => {
      saveClicked && this.saveForm(this.form, this.RowId);
    });
  }

  async rowSelected(row) {
    this.currentRow = row ? row : this.currentRow;
    this.RowId = row ? row.id : this.RowId;
    this.rowChanged.emit(this.RowId);
    this.rowUpdated.emit(this.RowId);
    this.childDataForm = [];
    this.form = null;
    let expand=true;
    this.condition = this.initCondition();
     this.sectionService.setCondition(this.condition);
     this.getFormMetaData(expand);
  }

  setAllRowsData(allRows) {
    if (allRows) {
      this.dropdownOfAllRows = allRows;
      this.currentRow = allRows.find(item => item.id == this.RowId);
    }
  }

  previousRow() {
    const currentRowIndex = this.dropdownOfAllRows.findIndex(item => item.id == this.RowId);
    const newIndex = currentRowIndex ? currentRowIndex - 1 : this.dropdownOfAllRows.length - 1;
    this.setNewRow(newIndex);
  }

  nextRow() {
    const currentRowIndex = this.dropdownOfAllRows.findIndex(item => item.id == this.RowId);
    const newIndex = currentRowIndex == this.dropdownOfAllRows.length - 1 ? 0 : currentRowIndex + 1;
    this.setNewRow(newIndex);
  }

  setNewRow(newIndex) {
    const newSelectedRow = this.dropdownOfAllRows[newIndex];
    this.currentRow = newSelectedRow;
    this.rowSelected(newSelectedRow);
    this.condition = this.initCondition();
    this.sectionService.setCondition(this.condition);
  }

  initCondition(){
    this.condition.isExpanded = true;
    this.condition.isLoading = true;
    this.condition.isNonExpandedLoading = true;
    this.condition.sectionId = 0;
    return this.condition;
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  //#region Get Form Meta Data On Change of the Library
  async ngOnChanges(changes: SimpleChanges) {
    if (changes.RowId && changes.RowId.currentValue === null) {
      this.currentRow = null;
    }
    if (!isNullOrUndefined(this.CallbackEventResponse)) {
      this.handleCallbackResponse(this.CallbackEventResponse);
    } else {
      this.childDataForm = [];
      /* if (!isNullOrUndefined(this.RowId)) {
         this.spinner.show();
       }*/
      let expand=true;
      await this.getFormMetaData(expand);
    }
  }

  //#endregion
  //#region Edit Add Child Form Data
  async openChildForm(data) {
    if (!this.RowId || this.RowId === 'null') {
      /*  let confirmDialogRef = this._dialog.open(ConfirmSaveDialogComponent);
        confirmDialogRef.componentInstance.onSave.subscribe(async () => {
          const formvalidation = this.form.checkFormValidation();
          console.log('FORM VALID', formvalidation)
          if(formvalidation){
            await this.saveForm(this.form, this.RowId, formvalidation);
            formvalidation.status && this.openChildDialog(data);
            formvalidation.status && confirmDialogRef.close();
          }
        });*/
      const formvalidation = this.form.checkFormValidation();
      if (formvalidation) {
        this.saveForm(this.form, this.RowId, data);
      }
    } else {
      this.openChildDialog(data);
    }
  }

  openChildDialog(data) {
    const dialogData = { ...data, rowId: this.RowId };
    const dialogRef = this._dialog.open(ChildFormDirective, {
      width: '500px',
      data : dialogData
    });
    // Handle Event from child form and pass to the Project
    const sub = dialogRef.componentInstance.EventHandler.subscribe((data) => {
      // this.EventHandler.emit(data);
    });
    this.childForms = data.childFormData;
    dialogRef.afterClosed().subscribe(result => {
      if (!isNullOrUndefined(result)) {
        if (isNullOrUndefined(data.multiFieldValues.sections.MultiFields)) {
          data.multiFieldValues.sections.MultiFields = [];
        }

        const childResult = {};
        const childResultForLocal = {};
        const formvalidation = result.data.checkChildFormValidation();
        if (formvalidation.status) {
          result.data.sections.forEach(section => {
            if (isNullOrUndefined(section.MultiFields)) {
              section.MultiFields = [];
            }

            const fieldRow = section.MultiFields.filter(rowData => {
              if (rowData['Cinchy ID'] === result.id) {
                return rowData;
              }
            });

            // Check for the record is new or in edit mode
            const childFieldRow = this.childFieldArray.filter(rowData => {
              if (rowData['Cinchy ID'] === result.id) {
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
                      const elementValues = typeof numberValueToString === 'string' ? numberValueToString.split(',') : numberValueToString;
                      dropdownResult = elementValues ? element.dropdownDataset.options.filter(
                        option => elementValues.find(eleVal => eleVal === option.id)
                      ) : [];
                      // CHECK FOR ELEMENT . VALUE AND IF NOT THERE then do same
                    } else {
                      dropdownResult = [element.dropdownDataset.options.find(e => e.id === element.value)];
                    }
                    if (dropdownResult && dropdownResult.length && dropdownResult[0]) {
                      fieldRow[0][element.cinchyColumn.name] = dropdownResult.map(item => item.label).join(',');
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
                    const elementValues = typeof numberValueToString === 'string' ? numberValueToString.split(',') : numberValueToString;
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
              const random = result.id = Math.random();
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
          const _cinchyid = result.id;
          const _childFormId = `${_cinchyid}-${result.childFormId}`;
          if (result.id < 1) { // Why there was a logic of = 1??, removing = for now
            result.id = null;
          }
          const insertQuery: IQuery = result.data.generateSaveForChildQuery(result.id, '{sourceid}');
          // Generate insert query for child form
          const queryResult = {
            id         : _cinchyid,
            Query      : insertQuery,
            result     : result.data,
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
          this.childCinchyId = result.id;
        }
      } else {
        //  this.childCinchyId = -1;
      }
      // Need to perform logic to pass the output data....
    });
  }

  //#endregion
  //#region Load Meda Data For the Forms
  /**
   * using this method we load all the meta data of form.
   */
  async getFormMetaData(expand?: boolean, childData?) {
    try {
      // Get form Meta data Only when Once.
      if (isNullOrUndefined(this.formFieldMetadataResult)) {
        this.formFieldMetadataResult = this.MetaData;
      }
      const formdata = this.formFieldMetadataResult.filter(data => data.FormId === this.FormId);
      if (formdata.length > 0) {
        const tableid = formdata[0].TableId;
        this.parentTableId = formdata[0].TableId;
        // this.spinner.show();
        this.cancel(this.pendingcall);
        this.cinchyQueryService.stopRequest.next();
        this.pendingcall =  this._cinchyService.getTableEntitlementsById(tableid).subscribe(
          response => {
            this.tableEntitlements = response;
            this.nonExpandedSection= expand;
            this.getForm(this.FormId, expand, null, null, null, null, childData).then((res) => {
              this.spinner.hide();
              if(res.sections){
                for(let resSection of res.sections){
                  if(resSection.fields.length!=0){
                    this.condition.sectionId = resSection.id;
                    this.condition.isLoading = false;
                    let nonExpandedCount = 0
                    for(let forms of this.formSections){
                        if(forms.autoExpand && forms.sectionName === resSection.label){
                          this.condition.isExpanded = true;
                          this.condition.isNonExpandedLoading = true;
                        }
                        else if(!forms.autoExpand && forms.sectionName === resSection.label){
                          this.condition.isExpanded = false;
                          this.condition.isNonExpandedLoading = false;
                          nonExpandedCount++;
                          this.enableSaveBtn = true;
                        }
                    }
                    this.sectionService.setCondition(this.condition);
                    this.enableSaveBtn = (nonExpandedCount == 0 || this.enableSaveBtn) ? true :  false
                  }
                }
              }
              this.form = res;
            });
          },
          error => {
            this.spinner.hide();
            console.log(error);
          });
      } else {
        this.spinner.hide();
      }
    } catch (e) {
      console.log(e);
      this.spinner.hide();
    }

  }

  getTableEntitlements(tableid) {
    return this._cinchyService.getTableEntitlementsById(tableid);
  }

  //#endregion
  //#region Get form Values by form ID and CInchy ID and NUll for new Form
  private async getForm(FormId: number | string,  expand: boolean, displayColumns: number[] = null, isChild = false, LinkFieldId?,
                        childFilterParam?, childData?, childFormParentId?: string, childFormLinkId?: string,
                        childSortParam?: string): Promise<IForm> {
    let childFilter = childFilterParam;
    let childSort = childSortParam;

    if (FormId <= 0) {
      return null;
    }

    let [cellEntitlements, cellEntitlementsResp, childTableEntitlements] = [null, null, null];
    let formFieldMetadataQueryResult = this.formFieldMetadataResult;

    if (isChild) {
      const metaDataResp = await this.cinchyQueryService.getFormMetaData(FormId).toPromise();

      formFieldMetadataQueryResult = metaDataResp.queryResult.toObjectArray();
      const tableId = formFieldMetadataQueryResult[0].TableId;

      try {
        childTableEntitlements = await this.getTableEntitlements(tableId).toPromise();
        this.hasChildTableAccess = childTableEntitlements.accessIsDefinedForCurrentUser;
      } catch (e) {
        this._toastr.error('Child Cell entitlements failed. You may face issue while Saving', 'Error');
      }

    } else if (!isNullOrUndefined(formFieldMetadataQueryResult)) {
      formFieldMetadataQueryResult = formFieldMetadataQueryResult.filter(data => data.FormId == FormId);
    }

    const allSelectLabels = formFieldMetadataQueryResult.map(item => {
      const colName = item.ColumnName && item.ColumnName.length > 115 ? item.ColumnName.substring(0, 114) : item.ColumnName;
      return item.ColumnName ? `editable([${item.ColumnName}]) as 'entitlement-${colName}'` : null;
    });

    const validSelectLabels = allSelectLabels.filter(item => item);
    const domainAndTable = `[${formFieldMetadataQueryResult[0].Domain}].[${formFieldMetadataQueryResult[0].Table}]`;
    const cellQuery = `SELECT ${validSelectLabels.toString()}
                       FROM ${domainAndTable} t
                       WHERE t.[Deleted] is NULL
                         and t.[Cinchy Id]=${this.RowId}
                       Order by t.[Cinchy Id]`;
    try {
      cellEntitlementsResp = await this._cinchyService.executeCsql(cellQuery, null).toPromise();
      cellEntitlements = cellEntitlementsResp.queryResult.toObjectArray()[0];
    } catch (e) {
      this._toastr.error('Cell entitlements failed! You may face issue while Saving', 'Error');
    }

    if (!isChild && !this.parentTableName) {
      this.parentTableName = formFieldMetadataQueryResult[0].Table;
      this.parentDomain = formFieldMetadataQueryResult[0].Domain;
    }
    const result = new Form(formFieldMetadataQueryResult[0].FormId,
      formFieldMetadataQueryResult[0].Form, formFieldMetadataQueryResult[0].TableId,
      formFieldMetadataQueryResult[0].Domain, formFieldMetadataQueryResult[0].Table);

    this.unique = [];

    for (const formFieldMetaData of formFieldMetadataQueryResult) {
      this.formFieldMetaDatas[formFieldMetaData.FormSectionId] = (formFieldMetaData);
      const formData = this.unique.filter(x => x.FormSectionId === formFieldMetaData.FormSectionId);
      if (formData.length === 0) {
        this.unique.push(formFieldMetaData);
      }
    }

    for (const section of this.unique) {
      result.sections.push(new FormSection(section.FormSectionId, section.FormSection));
    }

    if (isNullOrUndefined(formFieldMetadataQueryResult) || formFieldMetadataQueryResult.length == 0) {
      return null;
    }

    let minSectionIter = 0;
    let resChildNew;
    const resNew = await  this.getJsonDataSection(expand);
    if(resNew.length > 0 && expand){
      this.getFormMetaData(!expand)
    }
    else if(resNew.length == 0 && expand){
      let expandedSectionAvailable = true;
      if(this.formSections){
      this.formSections.forEach(element => {
        if(element.autoExpand === true){
          expandedSectionAvailable = false;
        }
      });
      if(expandedSectionAvailable){
        this.getFormMetaData(!expand)
      }
      }
    }

    if(isChild){
       resChildNew = await  this.getJsonDataSection(expand, FormId, formFieldMetadataQueryResult[0].FormSectionId);
    }

    for (const formFieldMetadata of formFieldMetadataQueryResult) {
      if (displayColumns && displayColumns.length > 0) {
        if (displayColumns.indexOf(formFieldMetadata.FormFieldId) === -1) {
          continue;
        }
      }

        // bind Json data
                for(let jsonfield of resNew)
                  {
                    if(jsonfield.FormFieldId === formFieldMetadata.FormFieldId)
                    {
                      formFieldMetadata.JsonData = jsonfield.JsonData;
                      formFieldMetadata.FormFieldsJsonData = jsonfield.FormFieldsJsonData;
                    }
                  }
                  if(resChildNew && !formFieldMetadata.JsonData){
                    for(let jsonfield of resChildNew)
                    {
                      if(jsonfield.FormFieldId === formFieldMetadata.FormFieldId)
                      {
                        formFieldMetadata.JsonData = jsonfield.JsonData;
                        formFieldMetadata.FormFieldsJsonData = jsonfield.FormFieldsJsonData;
                      }
                    }
                  }
                  if(!formFieldMetadata.JsonData){
                    continue;
                  }
      //remove below if condition
      if(!formFieldMetadata.JsonData){
        debugger;
      }
      const tableJsonData = JSON.parse(formFieldMetadata.JsonData);
      const filterData = tableJsonData.Columns.filter(x => x.columnId === formFieldMetadata.ColumnId);
      const columnMetadata = !isNullOrUndefined(filterData[0]) ? filterData[0] : null;

      let allowMultiple = false;
      let validationExpression = null;
      let minValue = 0;
      let displayFormat = null;

      if (columnMetadata != null) {
        allowMultiple = isNullOrUndefined(columnMetadata.allowMultiple) ? false : columnMetadata.allowMultiple;
        validationExpression = isNullOrUndefined(columnMetadata.validationExpression) ? null : columnMetadata.validationExpression;
        minValue = isNullOrUndefined(columnMetadata.minValue) ? 0 : columnMetadata.minValue;
        displayFormat = columnMetadata.displayFormat;
      }

      // set entitlement canedit/canview according to the user.
      const tableEntitlements = isChild && childTableEntitlements ? childTableEntitlements : this.tableEntitlements;

      const entitlementDataForField = tableEntitlements.columnEntitlements.filter(ent =>
        ent.columnId === formFieldMetadata.ColumnId
      );

      let canEdit = true;
      let canView = true;
      let cellColumnKey;

      if (entitlementDataForField && entitlementDataForField.length) {
        const colName = entitlementDataForField[0].columnName && entitlementDataForField[0].columnName.length > 115
          ? entitlementDataForField[0].columnName.substring(0, 114) : entitlementDataForField[0].columnName;
        cellColumnKey = `entitlement-${colName}`;
      }

      if (!isChild) {
        if (entitlementDataForField.length > 0) {
          canEdit = cellEntitlements && cellEntitlements[cellColumnKey] === 0 ? false : entitlementDataForField[0].canEdit;
          canView = entitlementDataForField[0].canView;
        } else if (entitlementDataForField.length === 0 && !cellColumnKey && formFieldMetadata.ColumnName) {
          canView = false;
          canEdit = false;
        }
      }

      const col = '#dddddd';
      const attachedFileName = await this.getFileName(formFieldMetadata.FileNameColumn);
      const viewOnly = formFieldMetadata.ViewOnly || formFieldMetadata.IsDisplayColumn;
      let linkFieldId;

      if (isChild) {
        linkFieldId = formFieldMetadata.FormFieldId == LinkFieldId ? LinkFieldId : null;
      }

      const isMandatory = formFieldMetadata.overrideMandatory ? false : formFieldMetadata.ColumnIsMandatory;
      const cinchyColumn: ICinchyColumn = new CinchyColumn(formFieldMetadata.ColumnId,
        formFieldMetadata.TableId, formFieldMetadata.Table,
        formFieldMetadata.Domain,
        formFieldMetadata.ColumnName, formFieldMetadata.ColumnType,
        isMandatory, formFieldMetadata.ColumnMaxLength,
        formFieldMetadata.LinkTargetColumnId, formFieldMetadata.LinkTargetColumnNName, allowMultiple,
        validationExpression, minValue, canEdit, canView, formFieldMetadata.LinkTargetTableId,
        col, formFieldMetadata.choiceOptions, formFieldMetadata.FormFieldsJsonData, formFieldMetadata.dataFormatType, false,
        viewOnly, linkFieldId, formFieldMetadata.IsDisplayColumn, attachedFileName, formFieldMetadata.FileNameColumn,
        formFieldMetadata.dropdownFilter, formFieldMetadata.totalTextAreaRows, formFieldMetadata.numberFormatter,
        formFieldMetadata.attachmentURL, formFieldMetadata.uploadURL, childFormParentId,
        childFormLinkId, formFieldMetadata.doNotWrap, displayFormat
      );
      const dropdownDataset: DropdownDataset = null;
      const childFormId: number = formFieldMetadata.ChildFormId;
      let childForm: IForm = null;
      childFilter = isChild ? childFilterParam : formFieldMetadata.childFormFilter;
      childSort = isChild ? childSortParam : formFieldMetadata.sortChildtable;

      if (childFormId) {
        const displayColumnId = formFieldMetadata.DisplayColumn.split(',').map((item) => {
          return parseInt(item, 10);
        });

        displayColumnId.push(formFieldMetadata.LinkFieldId);
        this.enableSaveBtn = false;
        await this.getForm(childFormId, expand, displayColumnId, true,
          formFieldMetadata.LinkFieldId, childFilter, null,
          formFieldMetadata.childFormParentId, formFieldMetadata.childFormLinkId, childSort).then((res) => {
          childForm = res;
        });
      }

      const formField: FormField = new FormField(formFieldMetadata.FormFieldId,
        formFieldMetadata.FormField, formFieldMetadata.Caption, childForm, cinchyColumn, dropdownDataset);

      for (let j = minSectionIter; j < result.sections.length; j++) {
        if (result.sections[j].id === formFieldMetadata.FormSectionId) {
          minSectionIter = j;
          result.sections[j].fields.push(formField);
          result.sections[j].childFilter = childFilter;
          result.sections[j].childSort = childSort;
          break;
        }
      }
    }

    if (!isNullOrUndefined(this.RowId) && this.RowId > 0) {
      const selectQuery: IQuery = result.generateSelectQuery(this.RowId, this.parentTableId, isChild);
      // this.spinner.show();
      let currentRowItem;
      let idForParentMatch;
      if (this.dropdownOfAllRows) {
        currentRowItem = this.dropdownOfAllRows.find(item => item.id == this.RowId);
      }
      try {
        if (isChild && selectQuery.childFormParentIdInfo) {
          const queryToGetMatchIdFromParent = `Select ${selectQuery.childFormParentIdInfo.childFormParentId} as 'idParent'
                                               FROM [${this.parentDomain}].[${this.parentTableName}]
                                               WHERE [Cinchy Id] = ${this.RowId}`;
          let cinchyIdForMatchFromParentResp = (await this._cinchyService.executeCsql(queryToGetMatchIdFromParent, null, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();
          idForParentMatch = cinchyIdForMatchFromParentResp[0]['idParent'];
          if (idForParentMatch) {
            if (selectQuery.params == null) {
              selectQuery.params = {};
            }
            selectQuery.params['@parentCinchyIdMatch'] = idForParentMatch;
          }
        }

        const selectQueryResult: Object[] = (await this._cinchyService.executeCsql(selectQuery.query,
          selectQuery.params, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();

        if (!isChild) {
          result.loadRecordData(this.RowId, selectQueryResult);
        } else {
          result.loadMultiRecordData(this.RowId, selectQueryResult, currentRowItem, idForParentMatch);
        }

        setTimeout(() => {
          if (childData) {
            childData.rowId = this.RowId;
            this.appStateService.setOpenOfChildFormAfterParentSave(childData);
            // Scenario when user clicks child form + icon when Creating a new Form
            // Not opening child dialog with old data as that data is not referenced any more after save and new Form sections and fields are generated
            // So it was not adding any new row in the child table when user added a row just after save from + icon, during new insert
            // this.openChildDialog(childData);
          }
        }, 500);
      } catch (e) {
        this.spinner.hide();
        if (e && e.cinchyException && e && e.cinchyException.message) {
          console.error(e.cinchyException.message);
          this._toastr.error('Access denied on table or Error while getting table data.', 'Error');
        } else {
          const message = currentRowItem ? e : 'Selected row is either Deleted or doesn\'t exist in Cinchy';
          this._toastr.error(message, 'Error');
        }
      }
    }

    this.formsData = result;
    return result;
  }

  public cancel(pendingcall: any) {
    if(this.pendingcall != null) {
      // this.pendingcall.unsubscribe();
      // cancel the request
      this.cinchyQueryService.stopRequest.next();
      console.log('unsubscribed');    
    }
  }

    async getJsonDataSection(expand: boolean, formID?, sectionId?) {
    let jsonDataNew;
    let SectionJsonData = [];
    let sectionIds =[];
    if(formID && sectionId)
    {
      this.childSectionList.push(sectionIds);
      const JsonDataResp = await  this.cinchyQueryService.getJsonDataBySectionId(sectionId).toPromise();
      jsonDataNew = JsonDataResp.queryResult.toObjectArray();
      return SectionJsonData  = jsonDataNew;
    }
    else if(this.formSections)
    {
      for(let sectionData of this.formSections)
      {
        jsonDataNew = null;
            if(expand && sectionData.autoExpand === true && this.openSectionData === false)
            {
              if(this.sectionIdList.length ===0 )
              {
                this.sectionIdList.push(sectionData.FormSectionId);
                sectionIds.push(sectionData.FormSectionId);
                const JsonDataResp = await  this.cinchyQueryService.getJsonDataBySectionId(sectionData.FormSectionId).toPromise();
                jsonDataNew = JsonDataResp.queryResult.toObjectArray();   
              } else{
                    for(let ids of this.sectionIdList){
                      if(ids === sectionData.FormSectionId){
                        continue;
                      }
                      else{
                        sectionIds.push(sectionData.FormSectionId);
                        this.sectionIdList.push(sectionData.FormSectionId);
                        const JsonDataResp = await  this.cinchyQueryService.getJsonDataBySectionId(sectionData.FormSectionId).toPromise();
                        jsonDataNew = JsonDataResp.queryResult.toObjectArray();
                      }
                    }
              }
            }
            else if(!expand && sectionData.autoExpand === false && this.closedSectionData === false)
            {
              this.closedSectionData = true;
              const JsonDataResp = await  this.cinchyQueryService.getJsonDataByFormId().toPromise();
              jsonDataNew = JsonDataResp.queryResult.toObjectArray();
            }
            //check for data
            if(jsonDataNew)
            {
              SectionJsonData = [ ...SectionJsonData, ...jsonDataNew];
            }
      }
      this.openSectionData =  true;
    } 
    return SectionJsonData ;
  }

  async getFileName(fileNameColumn) {
    const [domain, table, column] = fileNameColumn ? fileNameColumn.split('.') : [];
    const whereCondition = `WHERE [Cinchy Id] = ${this.RowId} AND [Deleted] IS NULL `;

    if (domain) {
      const query = `SELECT [${column}] as 'fullName',
                       [Cinchy Id] as 'id'
                     FROM
                       [${domain}].[${table}]
                       ${whereCondition}
      `;

      const fileNameResp = await this._cinchyService.executeCsql(query, null, null, QueryType.DRAFT_QUERY).toPromise();
      return fileNameResp && fileNameResp.queryResult && fileNameResp.queryResult.toObjectArray()[0] ?
        fileNameResp.queryResult.toObjectArray()[0]['fullName'] : null;
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
      if(this.isCloneForm){
        _RowId = null;
        this.RowId = null;
      }
      const insertQuery: IQuery = formdata.generateSaveQuery(_RowId, this.isCloneForm);
      // execute dynamic query.
      //   console.log(JSON.stringify(insertQuery));

      if (insertQuery) {
        if (insertQuery.query) {
          this._cinchyService.executeCsql(insertQuery.query, insertQuery.params).subscribe(
            response => {
              this.spinner.hide();
              //  console.log(response);
              if (isNullOrUndefined(this.RowId) || this.RowId == 'null') {
                this.RowId = response.queryResult._jsonResult.data[0][0];
                this.isCloneForm = false;
              }
              const data = {
                id     : this.RowId,
                type   : 'rowId',
                isSaved: true
              };
              this.EventHandler.emit(data);
              console.log('childData', childData);
              this.saveMethodLogic(this.RowId, response, childData);
              this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
              // RowId = this.saveMethodLogic(RowId, response);
              this._toastr.success('Data Saved Successfully', 'Success');
              if (this.addNewFromSideNav) {
                this.closeAddNewDialog.emit(this.RowId);
              }

              this.appStateService.hasFormChanged = false;

              // pass response to the project on data save
            },
            error => {
              console.error('Error in cinchy-dynamic-forms save method', error);
              this._toastr.error('Error while updating file data.', 'Error');
              const Data = {
                Error : error,
                Method: 'Save Parent Data'
              };
              // Event Callback Response type is onError enum 4
              // let callback: IEventCallback = new EventCallback(ResponseType.onError, Data);
              // this.EventHandler.emit(callback);
              this.spinner.hide();

            });
        } else if (insertQuery.attachedFilesInfo && insertQuery.attachedFilesInfo.length) {
          this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
        }
      } else {
        this.saveMethodLogic(this.RowId, null);
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
                           where t.[Cinchy Id] = ${childCinchyId ? childCinchyId : this.RowId} and t.[Deleted] is null`;
        const updateParams = {
          '@rowId'     : childCinchyId ? childCinchyId : this.RowId,
          '@fieldValue': fileDetails.value
        };
        try {
          await this._cinchyService.executeCsql(fileDetails.query, updateParams).toPromise();
          await this._cinchyService.executeCsql(fileQuery, params).toPromise();
          this._toastr.success('Data Saved Successfully', 'Success');
          this.spinner.hide();
        } catch (e) {
          this._toastr.error('Error while updating file data.', 'Error');
          this.spinner.hide();
        }
      } else {
        const query = `update t
                       set [${fileDetails.column}] = @p0
                       from [${fileDetails.domain}].[${fileDetails.table}] t
                       where t.[Cinchy Id] = ${this.RowId} and t.[Deleted] is null`;
        await this._cinchyService.executeCsql(query, params).toPromise();
      }
    });
  }

  private saveMethodLogic(RowId: any, response, childData?) {
    if (response && response.queryResult._jsonResult.data.length > 0) {
      RowId = response.queryResult._jsonResult.data[0][0];
    } else {
      RowId = this.RowId;
    }

    // passing data by event handler
    const Data = {
      CinchyId: RowId
    };

    // Event Callback Response type is save enum 1
    const callback: IEventCallback = new EventCallback(ResponseType.onSave, Data);
    // Emit data to the user.
    // this.EventHandler.emit(callback);
    console.log('IN SAVE OUT CHILD', this.childCinchyId);
    if (this.childCinchyId !== -1) {
      console.log('IN SAVE CHILD');
      this.savechildForm(RowId, 0);
    } else {
      this.spinner.hide();
      if (!isNullOrUndefined(this.RowId)) {
        this.getSavedData(childData);
      }
      if (!response) {
        this._toastr.warning('No Form Data Changed', 'Warning');
      }
    }
    return RowId;
  }

  //#endregion
  //#region save Child Form Values
  public async savechildForm(sourceid, idx) {
    console.log('SAVE CHILD MNANUY', this.RowId, idx, this.childDataForm);

    if (this.childDataForm.length === 0 && !isNullOrUndefined(this.RowId)) {
      this.getSavedData();
    }

    if (this.childDataForm.length > idx) {
      console.log('IN ACTUAL CHILD SAVE');
      this.spinner.show();
      const element = this.childDataForm[idx];
      if (element.Query.query) {
        element.Query.query = element.Query.query.replace('{sourceid}', sourceid);
        const params = JSON.stringify(element.Query.params).replace('{sourceid}', sourceid);
        this._cinchyService.executeCsql(element.Query.query, JSON.parse(params)).subscribe(
          response => {
            this.spinner.hide();
            this.savechildForm(sourceid, idx + 1);
            this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);
            if (this.childDataForm.length === (idx + 1)) {
              this.getchildSavedData(sourceid);
              this.childDataForm = [];
              this.childCinchyId = -1;
              this._toastr.success('Child Form Data Saved Successfully', 'Success');
            }
          },
          error => {
            const Data = {
              Error : error,
              Method: 'Save Child Data'
            };
            // Event Callback Response type is onError enum 4
            this.spinner.hide();
            this._toastr.error('Error while saving Child form data.', 'Error');
            const callback: IEventCallback = new EventCallback(ResponseType.onError, Data);
            // this.EventHandler.emit(callback);
          });
      } else {
        this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);
      }
    }
  }

  //#endregion
  //#region Get Parent Form Data After Save in Database
  public async getSavedData(childData?) {
    /*    const selectQuery: IQuery = this.formsData.generateSelectQuery(this.RowId, this.parentTableId, isChild);
        const selectQueryResult: Object[] = (await this._cinchyService.executeCsql(
          selectQuery.query, selectQuery.params).toPromise()).queryResult.toObjectArray();
        this.formsData.loadRecordData(this.RowId, selectQueryResult);
        this.form = this.formsData;
        this.spinner.hide();*/
        let expand = true;
    this.getFormMetaData(expand, childData);
  }

  //#endregion
  //#region Get Child Form Data After Save in Database
  public async getchildSavedData(rowID) {
    const isChild = true;
    this.spinner.show();
    const selectQuery: IQuery = this.childForms.generateSelectQuery(rowID, this.parentTableId, isChild);
    if (isChild && selectQuery.childFormParentIdInfo) {
      const queryToGetMatchIdFromParent = `SELECT TOP 1 ${selectQuery.childFormParentIdInfo.childFormParentId} as 'idParent'
                                           FROM [${this.parentDomain}].[${this.parentTableName}]
                                           WHERE [Cinchy Id] = ${this.RowId}`;
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

  //#endregion
  //#region This method is used to handle the field event
  handleFieldsEvent($event) {
    this.appStateService.hasFormChanged = this.appStateService.hasFormChanged ? this.appStateService.hasFormChanged
      : $event.Data ? $event.Data.HasChanged : true;
    // Emit the event to the Project.
    // this.EventHandler.emit($event);
  }

  //#endregion
  //#region Handle the call back response from project.
  handleCallbackResponse(response: any) {
    //  console.log(response);
  }

  openDeleteConfirm(data): void {
    const { domain, table, field, multiarray } = data;
    const dialogRef = this._dialog.open(MessageDialogComponent, {
      width: '400px',
      data : {
        title  : 'Please confirm',
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
  }

//#endregion
}

