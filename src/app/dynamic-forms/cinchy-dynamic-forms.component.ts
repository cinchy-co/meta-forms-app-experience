import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { Cinchy, CinchyService } from "@cinchy-co/angular-sdk";

import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";
import { isNullOrUndefined } from "util";
import isEqual from "lodash/isEqual";
import sortBy from "lodash/sortBy";
import toString from "lodash/toString";

import { ChildFormComponent } from "./fields/child-form/child-form.component";
import { ExportSettingsDialogComponent } from "./dialogs/export-settings/export-settings.component";

import { Form } from "./models/cinchy-form.model";
import { FormField } from "./models/cinchy-form-field.model";
import { FormSection } from "./models/cinchy-form-section.model";
import { IQuery, Query } from "./models/cinchy-query.model";

import { IFormFieldMetadata } from "../models/form-field-metadata.model";
import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";
import { ILookupRecord } from "../models/lookup-record.model";

import { IChildFormQuery } from "./interface/child-form-query";
import { IExportSettings } from "./interface/export-settings";
import { IFieldChangedEvent } from "./interface/field-changed-event";
import { IFindChildFormResponse } from "./interface/find-child-form-response";
import { INewEntityDialogResponse } from "./interface/new-entity-dialog-response";

import { AppStateService } from "../services/app-state.service";
import { ConfigService } from "../services/config.service";
import { CinchyQueryService } from "../services/cinchy-query.service";

import { FormHelperService } from "./service/form-helper/form-helper.service";
import { PrintService } from "./service/print/print.service";

import { SearchDropdownComponent } from "../shared/search-dropdown/search-dropdown.component";


@Component({
  selector: "cinchy-dynamic-forms",
  templateUrl: "./cinchy-dynamic-forms.component.html",
  styleUrls: ["./style/style.scss"],
  encapsulation: ViewEncapsulation.None
})
export class CinchyDynamicFormsComponent implements OnInit, OnChanges {

  @HostListener("window:beforeunload", ["$event"])
  beforeUnloadHandler($event) {

    if (this.form?.hasChanged) {
      $event.returnValue = "Are you sure you want to exit? You may have some unsaved changes";
    }
  }

  @ViewChild("recordDropdown") dropdownComponent: SearchDropdownComponent;

  @Input() formId: string;
  @Input() formMetadata: IFormMetadata;
  @Input() formSectionsMetadata: Array<IFormSectionMetadata>;

  @Input("lookupRecords") set lookupRecords(value: Array<ILookupRecord>) {

    this.setLookupRecords(value);
  }

  @Output() closeAddNewDialog = new EventEmitter<INewEntityDialogResponse>();
  @Output() onLookupRecordFilter: EventEmitter<string> = new EventEmitter<string>();


  form: Form = null;
  rowId: number;
  fieldsWithErrors: Array<any>;
  lookupRecordsList: ILookupRecord[];
  currentRow: ILookupRecord;

  canInsert: boolean;
  enableSaveBtn: boolean = false;
  filteredTableUrl: string;
  formHasDataLoaded: boolean = false;


  get lookupRecordsListPopulated(): boolean {

    return (this.lookupRecordsList?.length && this.lookupRecordsList[0].id !== -1);
  }

  /**
   * We're checking for rowId here so that the create button isn't visible if when the form
   * is already in create mode
   */
  get canCreateNewRecord(): boolean {

    return coerceBooleanProperty(this.canInsert && this._appStateService.rowId);
  }


  /**
   * Set to true when the loadForm function is currently executing, which prevents multiple sources from trying to
   * load the form simultaneously (e.g. when the lookupRecords list is populated and immediately selects a record)
   */
  private _formIsLoading: boolean = false;

  private _queuedRecordSelection: { rowId: number | null, doNotReloadForm: boolean };

  /**
   * Contains the set of all pending updates and inserts for child form records on this form. When the form is saved,
   * these queries are run after the save resolves to ensure that the child forms are correctly updated, and then the
   * set is cleared (as those queries are no longer pending)
   */
  private _pendingChildFormQueries: Array<IChildFormQuery> = new Array<IChildFormQuery>();


  constructor(
    private _dialog: MatDialog,
    private _cinchyService: CinchyService,
    private _toastr: ToastrService,
    private _spinner: NgxSpinnerService,
    private _appStateService: AppStateService,
    private _cinchyQueryService: CinchyQueryService,
    private _printService: PrintService,
    private _formHelperService: FormHelperService,
    private _configService: ConfigService
  ) {}


  async ngOnChanges(changes: SimpleChanges): Promise<void> {

    if (changes.lookupRecords?.currentValue?.length) {
      if (this._queuedRecordSelection) {
        this._handleRecordSelection(this._queuedRecordSelection);
        this._queuedRecordSelection = null;
      }

      if (!this.formHasDataLoaded) {
        await this.loadForm();
      }
    }
  }


  ngOnInit(): void {

    // Initialize with a loading state in case the first load takes some time
    this.lookupRecordsList = [{ id: -1, label: "Loading..." }];

    this._appStateService.onRecordSelected$.subscribe(
      (record: { rowId: number | null, doNotReloadForm: boolean }) => {

        if (this.lookupRecordsListPopulated) {
          this._handleRecordSelection(record);
        }
        else {
          this._queuedRecordSelection = record;
        }

        this._updateFilteredTableUrl();
      }
    );
  }


  afterChildFormEdit(childRowId: number, targetChildForm: Form): void {

    const childFormData: IFindChildFormResponse = this.form.findChildForm(targetChildForm.id);

    const formValidation: { isValid: boolean, message: string } = childFormData.childForm.checkChildFormValidation();

    if (formValidation.isValid) {
      const insertQuery: Query = childFormData.childForm.generateSaveForChildQuery(childRowId < 0 ? null : childRowId, childFormData.childForm.isClone);

      const existingQueryIndex = this._pendingChildFormQueries?.findIndex((query: IChildFormQuery) => {

        return ((query.childFormId === targetChildForm.id) && (query.rowId === childRowId));
      });

      if (existingQueryIndex > -1) {
        this._pendingChildFormQueries[existingQueryIndex].query = insertQuery;
      }
      else {
        this._pendingChildFormQueries.push({
          childFormId: childFormData.childForm.id,
          formId: this.formId,
          rowId: childRowId,
          query: insertQuery
        });
      }
    }
  }


  checkNoRecord(lookupRecords: ILookupRecord[]): ILookupRecord[] {

    if (lookupRecords?.length > 0) {
      return lookupRecords;
    }
    else {
      return [{ id: -1, label: "No records available" }];
    }
  }


  cloneFormData(): void {

    this.form = this.form.clone();

    this._pendingChildFormQueries = new Array<IChildFormQuery>();

    this.form.restoreFormReferenceOnAllFields();
    this._appStateService.setRecordSelected(null, true);
    this._toastr.info("The record was cloned, please save in order to create it. If this field contained any child records, please ensure the field used to link them is updated accordingly.", "Info", { timeOut: 15000, extendedTimeOut: 15000 });
  }


  async copyWindowUrl(): Promise<void> {

    try {
      await navigator.clipboard.writeText((window.location === window.parent.location) ? window.location.href : window.parent.location.href);

      this._toastr.success("Copied", "Success");
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }


  createNewRecord(): void {

    this._appStateService.setRecordSelected(null);
  }


  exportToPdf(): void {

    const dialogRef = this._dialog.open(
      ExportSettingsDialogComponent,
      {
        width: "260px",
        data: {}
      }
    );

    dialogRef.afterClosed().subscribe({
      next: async (settings: IExportSettings) => {

        if (settings) {
          await this._printService.generatePdf(this.form, this.currentRow, settings);
        }
      }
    });
  }


  /**
   * When a field has been updated, consume the event, update that field on the form, and then redistribute the form to this component's
   * ancestors.
   */
  handleFieldsEvent(event: IFieldChangedEvent): void {

    event.form.updateFieldValue(event.sectionIndex, event.fieldIndex, event.newValue);

    // flattened child form
    if (event.form.isChild && event.form.flatten && event.form.hasFields) {
      let targetCinchyId = (event.form.childFormRowValues?.length && event.form.childFormRowValues[event.form.childFormRowValues.length - 1]["Cinchy ID"]) ?
        event.form.childFormRowValues[event.form.childFormRowValues.length - 1]["Cinchy ID"] :
        -1;

      this.afterChildFormEdit(targetCinchyId, event.form);
    }

    if (event.targetColumnName && event.form.childFieldsLinkedToColumnName && event.form.childFieldsLinkedToColumnName[event.targetColumnName]) {
      event.form.childFieldsLinkedToColumnName[event.targetColumnName].forEach((field: FormField, fieldIndex: number) => {

        let childFormSectionIdx = 0;
        for (let i = 0; i < field.form.sections.length; i++) {
          let innerFieldIdx = field.form.sections[i].fields.findIndex(f => f.id == field.id);
          if (innerFieldIdx > -1) {
            childFormSectionIdx = i;
            break;
          }
        }
        field.form.updateFieldValue(childFormSectionIdx, fieldIndex, event.newValue);

        this.afterChildFormEdit(
          field.form.rowId ?? -1,
          field.form
        );
      });
    }
  }


  /**
   * Triggers the filter mechanism when the filter text changes
   *
   * @param filterText The user-entered filter text
   */
  handleOnFilter(filterText: string): void {

    this.onLookupRecordFilter.emit(filterText);
  }


  /**
   * Uses the metadata from Cinchy to create and load the Form object, then it"ll fill it with the form object with actual data
   * Gets called upon load, save, and row changes
   */
  async loadForm(
      childData?: {
        childForm: Form,
        presetValues?: { [key: string]: any },
        title: string
      }
  ): Promise<void> {

    if (!this._formIsLoading) {
      this._formIsLoading = true;

      if (this.form?.isClone) {
        this.form = this.form.clone(null, true);

        this.form.restoreFormReferenceOnAllFields();
      }

      this._pendingChildFormQueries = new Array<IChildFormQuery>();
      this.formHasDataLoaded = false;
      this.enableSaveBtn = false;

      try {
        let tableEntitlements = await this._cinchyService.getTableEntitlementsById(this.formMetadata.tableId).toPromise();

        this.canInsert = tableEntitlements.canAddRows;

        const form = await this._formHelperService.generateForm(this.formMetadata, this.rowId, tableEntitlements);

        form.populateSectionsFromFormMetadata(this.formSectionsMetadata);

        this._cinchyQueryService.getFormFieldsMetadata(this.formId).subscribe(
          {
            next: async (formFieldsMetadata: Array<IFormFieldMetadata>) => {

              if (this.lookupRecordsListPopulated) {
                const selectedLookupRecord = this.lookupRecordsList.find((record: ILookupRecord) => {

                  return (record.id === this.rowId);
                });

                await this._formHelperService.fillWithFields(form, this.rowId, this.formMetadata, formFieldsMetadata, selectedLookupRecord, tableEntitlements);

                if (selectedLookupRecord){
                  const success: boolean = await this._formHelperService.fillWithData(form, this.rowId, selectedLookupRecord, null, null);

                  if (success && form.childFieldsLinkedToColumnName?.length) {
                    // Update the value of the child fields that are linked to a parent field (only for flattened child forms)
                    for (let parentColumnName in form.childFieldsLinkedToColumnName) {
                      let linkedParentField: FormField = form.fieldsByColumnName[parentColumnName];
                      let linkedChildFields: Array<FormField> = form.childFieldsLinkedToColumnName[parentColumnName] || [];

                      for (let linkedChildField of linkedChildFields) {
                        // Skip non-flat child forms and skip if there's already a value or if it already matches the parent's value
                        if (!linkedChildField.form.flatten || linkedChildField.value || linkedParentField.value === linkedChildField.value) {
                          continue;
                        }

                        // Update the child form field's value
                        const fieldIndex: number = form.sections[0].fields.findIndex((field: FormField) => {

                          return (field.id === linkedChildField.id);
                        });

                        form.updateFieldValue(
                          0,
                          fieldIndex,
                          linkedParentField.value
                        );

                        this.afterChildFormEdit(linkedChildField.form.rowId, linkedChildField.form);
                      }
                    }
                  }
                }

                this.form = form;

                this.enableSaveBtn = true;

                this._formIsLoading = false;
                this.formHasDataLoaded = true;

                await this._spinner.hide();

                if (childData) {
                  setTimeout(() => {

                    this._appStateService.parentFormSavedFromChild$.next(childData);
                  }, 500);
                }
              }
            },
            error: (error: any) => {

              this._spinner.hide();

              this._formIsLoading = false;

              console.error(error);
            }
          }
        );
      }
      catch (error: any) {
        await this._spinner.hide();

        this._formIsLoading = false;

        console.error(error);
      }
    }
  }


  /**
   * Opens the dialog to add or edit a record in the context of a child form table. When the dialog is saved, the
   * desired values are structured and inserted into the appropriate child form and passed along for post processing
   *
   * @param data Contains a reference to the target childForm, any previous values for the target record, a title for
   *        the dialog, and whether or not the view should be restricted to only those fields specified by the form
   *        field's metadata
   */
  async openChildFormDialog(
      data: {
        childForm: Form,
        presetValues?: { [key: string]: any },
        useLimitedFields?: boolean,
        title: string
      }
  ): Promise<void> {

    data.useLimitedFields = true;

    const dialogRef = this._dialog.open(
      ChildFormComponent,
      {
        width: "500px",
        data: data
      }
    );

    dialogRef.afterClosed().subscribe(
      {
        next: (resultId: number): void => {

          if (resultId) {
            const targetChildForm: IFindChildFormResponse = this.form.findChildForm(data.childForm.id);

            const newValues: { [key: string]: any } = {
              "Cinchy ID": resultId
            };
            const childFormLinkName: string = data.childForm.getChildFormLinkName(data.childForm.childFormLinkId);

            data.childForm.sections.forEach((section: FormSection, sectionIndex: number): void => {

              section.fields.forEach((field: FormField, fieldIndex: number): void => {

                if (
                  field.cinchyColumn.hasChanged ||
                  (data.presetValues && data.presetValues["Cinchy ID"] > 0) ||
                  (field.label === childFormLinkName)
                ) {
                  if (field.cinchyColumn.isDisplayColumn) {
                    const columnLabel: string = `${field.cinchyColumn.linkTargetColumnName} label`;

                    // When a linked column value is changed, we are not able to update the display column,
                    // So if the linked column value has changed, update the display column values to "-".
                    const linkedColumnField: FormField = section.fields.find(
                      (linkedField: FormField) => {

                        return (
                          field.cinchyColumn.id === linkedField.cinchyColumn.id &&
                          !linkedField.cinchyColumn.isDisplayColumn
                        )
                      }
                    );

                    if (isEqual(sortBy(toString(linkedColumnField.value)), sortBy(toString(data.presetValues[linkedColumnField.label])))) {
                      newValues[columnLabel] = data.presetValues[columnLabel];
                    }
                    else {
                      newValues[columnLabel] = "-";
                    }
                  }
                  else {
                    newValues[field.cinchyColumn.name] = field.value;
                  }
                }
              });
            });

            targetChildForm.childForm.addOrModifyChildFormRowValue(newValues);

            this._appStateService.childRecordUpdated$.next();

            this.afterChildFormEdit(resultId, data.childForm);
          }
        }
      }
    );
  }


  /**
   * Removes any pending operations that would have affected the deleted row
   */
  onChildRowDeleted(data: {
      childForm: Form,
      rowId: number
  }): void {

    this._pendingChildFormQueries = this._pendingChildFormQueries.filter(
      (query: IChildFormQuery): boolean => {

        return ((query.childFormId !== data.childForm.id) || (query.rowId !== data.rowId));
      }
    );
  }


  rowSelected(row: ILookupRecord): void {

    this.currentRow = row ?? this.currentRow;

    this._appStateService.setRecordSelected(row?.id ?? this.rowId);
  }


  async saveChildForm(rowId: number, recursionCounter: number): Promise<void> {

    if (!this._pendingChildFormQueries.length && !isNullOrUndefined(rowId)) {
      await this.loadForm();
    }
    else if (this._pendingChildFormQueries.length > recursionCounter) {
      await this._spinner.show();

      const pendingItem: IChildFormQuery = this._pendingChildFormQueries[recursionCounter];

      if (pendingItem.query.query) {
        const queryToExecute = pendingItem.query.query.replace("{parentId}", rowId.toString());
        const params = JSON.parse(JSON.stringify(pendingItem.query.params).replace("{parentId}", rowId.toString()));

        this._cinchyService.executeCsql(queryToExecute, params).subscribe(
          {
            next: async () => {

              await this._spinner.hide();

              await this.saveChildForm(rowId, recursionCounter + 1);

              this._updateFileAndSaveFileNames(pendingItem.query.attachedFilesInfo);

              if (this._pendingChildFormQueries.length === (recursionCounter + 1)) {
                this._pendingChildFormQueries = new Array<IChildFormQuery>();

                await this.loadForm();

                this._toastr.success("Child form saved successfully", "Success");
              }
            },
            error: () => {

              this._spinner.hide();

              this._toastr.error("Error while saving child form", "Error");
            }
          }
        );
      }
      else {
        this._updateFileAndSaveFileNames(pendingItem.query.attachedFilesInfo);
      }
    }
  }


  async saveForm(
      formData: Form,
      rowId: number,
      childData?: {
        childForm: Form,
        presetValues?: { [key: string]: any },
        title: string
      }
  ): Promise<void> {

    if (formData) {
      // check validations for the form eg: Required, Regular expression
      const formValidation = formData.checkFormValidation();

      if (formValidation.isValid) {
        // Generate dynamic query using dynamic form meta data
        await this._spinner.show();
        const insertQuery: IQuery = formData.generateSaveQuery(rowId, this._configService.cinchyVersion, this.form.isClone);

        // execute dynamic query
        if (insertQuery) {
          if (insertQuery.query) {
            this._cinchyService.executeCsql(insertQuery.query, insertQuery.params).subscribe(
              (response: {
                queryResult: Cinchy.QueryResult,
                callbackState?: any
              }) => {

                this._spinner.hide();

                if (isNullOrUndefined(this.rowId)) {
                  // Technically this will also be done by the setRecordSelected handlers, but by doing it manually now we can use this immediately and won't
                  // need to wait for it to propagate
                  this.rowId = response.queryResult._jsonResult.data[0][0];

                  this._appStateService.setRecordSelected(this.rowId, true);

                  if (this.form.isClone) {
                    this.form = this.form.clone(null, true);

                    this.form.restoreFormReferenceOnAllFields();
                  }
                }

                this._saveMethodLogic(response, childData);
                this._updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);

                this._toastr.success("Data Saved Successfully", "Success");

                formData.updateRootProperty(
                  {
                    propertyName: "hasChanged",
                    propertyValue: false
                  }
                );
              },
              error => {
                console.error("Error in cinchy-dynamic-forms save method", error);

                this._toastr.error("Error while updating file data.", "Error");
                this._spinner.hide();
              });
          }
          else if (insertQuery.attachedFilesInfo && insertQuery.attachedFilesInfo.length) {
            this._updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
          }
        }
        else {
          await this._saveMethodLogic();
        }
      }
      else {
        this.fieldsWithErrors = formData.errorFields;
        this._toastr.warning(formValidation.message, "Warning");
      }
    }
  }


  setLookupRecords(lookupRecords: ILookupRecord[]): void {

    this.lookupRecordsList = this.checkNoRecord(lookupRecords);
  }


  /**
   * Ingests the selected record and populates the form accordingly
   */
  private async _handleRecordSelection(record: { rowId: number | null, doNotReloadForm: boolean }): Promise<void> {

    this.rowId = record?.rowId;

    if (this.rowId) {
      this.setLookupRecords(this.lookupRecordsList);

      this.currentRow = this.lookupRecordsList?.find(item => item.id === this.rowId) ?? this.currentRow ?? null;
    }
    else {
      this.currentRow = null;
    }

    if (!record?.doNotReloadForm) {
      await this.loadForm();
    }
  }


  /**
   * Runs after a save has been completed. Will complete any pending queries relevant to child forms in this view
   * and, if relevant, load the provided child form
   */
  private async _saveMethodLogic(
      response?: {
        queryResult: Cinchy.QueryResult,
        callbackState?: any
      },
      childData?: {
        childForm: Form,
        presetValues?: { [key: string]: any },
        title: string
      }
  ): Promise<void> {

    if (this._pendingChildFormQueries?.length) {
      await this.saveChildForm(this.rowId, 0);
    }
    else {
      await this._spinner.hide();

      if (!isNullOrUndefined(this.rowId) && childData) {
        await this.loadForm(childData);
      }

      if (!response) {
        this._toastr.warning("No changes were made", "Warning");
      }
    }
  }


  private _updateFileAndSaveFileNames(attachedFilesInfo): void {

    attachedFilesInfo.forEach(async (fileDetails) => {
      const params = {
        "@p0": fileDetails.fileName
      };

      if (fileDetails.query) {
        const childCinchyId = fileDetails.childCinchyId;
        const fileQuery = `
          UPDATE t
          SET t.[${fileDetails.column}] = @p0
          FROM [${fileDetails.domain}].[${fileDetails.table}] t
          WHERE t.[Cinchy ID] = ${childCinchyId ? childCinchyId : this.rowId}
            AND t.[Deleted] IS NULL`;
        const updateParams = {
          "@rowId": childCinchyId ? childCinchyId : this.rowId,
          "@fieldValue": fileDetails.value
        };

        try {
          await this._cinchyService.executeCsql(fileDetails.query, updateParams).toPromise();
          await this._cinchyService.executeCsql(fileQuery, params).toPromise();

          this._toastr.success("Saved successfully", "Success");

          await this._spinner.hide();
        } catch (e) {
          this._toastr.error("Error while updating file data.", "Error");

          await this._spinner.hide();
        }
      } else {
        const query = `UPDATE t
                       SET t.[${fileDetails.column}] = @p0
                       FROM [${fileDetails.domain}].[${fileDetails.table}] t
                       WHERE t.[Cinchy ID] = ${this.rowId}
                        AND t.[Deleted] IS NULL;`;

        await this._cinchyService.executeCsql(query, params).toPromise();
      }
    });
  }


  /**
   * Adds the current row information to the querystring of the table URL
   */
  private _updateFilteredTableUrl(): void {

    this.filteredTableUrl = this._appStateService.rowId ? `${this.formMetadata.tableUrl}?viewId=0&fil[Cinchy%20Id].Op=Equals&fil[Cinchy%20Id].Val=${this._appStateService.rowId}` : "";
  }
}
