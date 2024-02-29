import { Injectable } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { Cinchy, CinchyService, QueryType } from "@cinchy-co/angular-sdk";

import { DataFormatType } from "../../enums/data-format-type.enum";

import { CinchyColumn } from "../../models/cinchy-column.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { Form } from "../../models/cinchy-form.model";
import { IQuery } from "../../models/cinchy-query.model";

import { IFormFieldMetadata } from "../../../models/form-field-metadata.model";
import { IFormMetadata } from "../../../models/form-metadata-model";
import { IFormSectionMetadata } from "../../../models/form-section-metadata.model";
import { ILookupRecord } from "../../../models/lookup-record.model";
import { ITableEntitlements } from "../../interface/table-entitlements";

import { AppStateService } from "../../../services/app-state.service";
import { CinchyQueryService } from "../../../services/cinchy-query.service";
import { ConfigService } from "../../../services/config.service";

import { ToastrService } from "ngx-toastr";
import { isNullOrUndefined } from "util";


@Injectable({
  providedIn: "root",
})
export class FormHelperService {

  constructor(
    private _appStateService: AppStateService,
    private _cinchyService: CinchyService,
    private _cinchyQueryService: CinchyQueryService,
    private _configService: ConfigService,
    private _toastr: ToastrService
  ) {}


  /**
   * Saves the data from the given form to the table it represents, and then refreshes any link fields
   * which target that table.
   *
   * @param form The model of the *completed* form.
   *
   * TODO: Failure logic and a mechanism to roll back the view if any step fails.
   */
  async addOptionToLinkedTable(form: Form): Promise<void> {

    const formValidation = form.checkFormValidation();

    if (formValidation.isValid) {
      const insertQuery: IQuery = form.generateSaveQuery(null, this._configService.cinchyVersion, false);

      if (insertQuery) {
        this._cinchyService.executeCsql(insertQuery.query, insertQuery.params).subscribe(
          {
            next: (response: {
              queryResult: Cinchy.QueryResult,
              callbackState?: any
            }) => {

              this._appStateService.addNewEntityDialogClosed$.next({
                newRowId: response.queryResult._jsonResult.data[0][0],
                tableName: form.targetTableName
              });
            },
            error: (error) => {
              console.error("Error in cinchy-dynamic-forms save method", error);

              this._toastr.error("Error while updating file data.", "Error");
            }
          }
        );
      }
    }
  }


  async generateForm(
      formMetadata: IFormMetadata,
      rowId: number,
      tableEntitlements: ITableEntitlements,
      isChild: boolean = false,
      flatten: boolean = false,
      childFormParentId?: string,
      childFormLinkId?: string,
      childFormFilter?: string,
      childFormSort?: string,
      parentForm: Form = null
  ): Promise<Form> {

    if (!formMetadata) {
      return null;
    }

    const result = new Form(
      formMetadata.formId,
      formMetadata.formName,
      formMetadata.tableId,
      formMetadata.domainName,
      formMetadata.tableName,
      formMetadata.isAccordion,
      tableEntitlements,
      isChild,
      flatten,
      childFormParentId,
      childFormLinkId,
      childFormFilter,
      childFormSort
    );

    result.tableMetadata = JSON.parse(formMetadata.tableJson);
    result.parentForm = parentForm
    result.rowId = rowId;

    return result;
  }


  /**
   * Generates a form model for the form represented by the given ID
   *
   * TODO: There should be some kind of caching mechanism on this
   */
  async getFormById(formId: string): Promise<Form> {

    const formMetadata: IFormMetadata = await this._cinchyQueryService.getFormMetadata(formId).toPromise();
    const formSectionsMetadata: Array<IFormSectionMetadata> = await this._cinchyQueryService.getFormSectionsMetadata(formId).toPromise();
    const formFieldsMetadata: Array<IFormFieldMetadata> = await this._cinchyQueryService.getFormFieldsMetadata(formId).toPromise();

    const tableEntitlements = await this._cinchyService.getTableEntitlementsById(formMetadata.tableId).toPromise();

    const form: Form = await this.generateForm(formMetadata, null, tableEntitlements);

    form.populateSectionsFromFormMetadata(formSectionsMetadata);

    await this.fillWithFields(form, null, formMetadata, formFieldsMetadata, null, tableEntitlements);

    return form;
  }


  async fillWithFields(
      form: Form,
      rowId: number,
      formMetadata: IFormMetadata,
      formFieldsMetadata: IFormFieldMetadata[],
      selectedLookupRecord: ILookupRecord,
      tableEntitlements: ITableEntitlements
  ): Promise<void> {

    if (formFieldsMetadata?.length) {
      let tableJson = JSON.parse(formMetadata.tableJson);
      let formFields: IFormFieldMetadata[] = formFieldsMetadata.filter(_ => _.formId === form.id);

      const cellEntitlements = await this._getCellEntitlements(formMetadata.domainName, formMetadata.tableName, rowId, formFields);

      let parentChildLinkedColumns: {[columnName: string]: FormField[]} = {};
      let parentFieldsByColumn: {[columnName: string]: FormField} = {};
      let allChildForms: Form[] = [];

      let minSectionIter = 0;

      for (let i = 0; i < formFields.length; i++) {
        const columnMetadata = tableJson.Columns.find(_ => _.columnId === formFields[i].columnId);
        const columnEntitlements = tableEntitlements.columnEntitlements.find(_ => _.columnId === formFields[i].columnId);
        const columnEntitlementKey = columnEntitlements ? `entitlement-${columnEntitlements?.columnName.substring(0, 114)}` : '';
        const attachedFileName = await this._getFileName(rowId, formFields[i].fileNameColumn);

        if (columnMetadata?.dependencyColumnIds && columnMetadata?.dependencyColumnIds.length > 0){
          const parentMetadata = tableJson.Columns.find(_ => _.columnId === columnMetadata?.dependencyColumnIds[0]);

          columnMetadata.displayFormat = parentMetadata?.displayFormat;
        }

        const cinchyColumn: CinchyColumn = new CinchyColumn(
          formFields[i].columnId || null,
          formMetadata.tableId || null,
          formMetadata.tableName || null,
          formMetadata.domainName || null,
          formFields[i].columnName || null,
          formFields[i].columnType || null,
          formFields[i].overrideMandatory ? false : coerceBooleanProperty(formFields[i].columnIsMandatory),
          formFields[i].columnMaxLength || null,
          formFields[i].linkTargetColumnId || null,
          formFields[i].linkTargetColumnName || null,
          columnMetadata?.allowMultiple ?? false,
          columnMetadata?.validationExpression || null,
          columnMetadata?.minValue ?? 0,
          (isNullOrUndefined(columnEntitlements) || cellEntitlements && cellEntitlements[columnEntitlementKey] === 0) ? false : columnEntitlements.canEdit,
          columnEntitlements?.canView ?? false,
          formFields[i].createLinkOptionFormId || null,
          formFields[i].createLinkOptionName || null,
          formFields[i].linkTargetTableId || null,
          formFields[i].linkTargetTableName || null,
          formFields[i].linkTableDomainName || null,
          "#dddddd",
          formFields[i].choiceOptions || null,
          formMetadata.tableJson || null,
          <DataFormatType>formFields[i].dataFormatType || null,
          coerceBooleanProperty(formFields[i].viewOnly || formFields[i].isDisplayColumn),
          formFields[i].linkFieldId || null,
          coerceBooleanProperty(formFields[i].isDisplayColumn),
          attachedFileName || null,
          formFields[i].fileNameColumn || null,
          formFields[i].dropdownFilter || null,
          formFields[i].totalTextAreaRows ?? null,
          formFields[i].numberFormatter || null,
          formFields[i].attachmentUrl || null,
          formFields[i].uploadUrl || null,
          formFields[i].childFormParentId || null,
          formFields[i].childFormLinkId || null,
          coerceBooleanProperty(formFields[i].doNotWrap),
          columnMetadata?.displayFormat || null,
          columnMetadata?.textFormat || null
        );

        let childForm: Form = null;
        const childFormId = formFields[i].childFormId;

        if (childFormId) {
          const displayColumnId = formFields[i].displayColumn.split(',').map(_ => parseInt(_, 10));

          displayColumnId.push(formFields[i].linkFieldId);

          const childFormMetadata = await this._cinchyQueryService.getFormMetadata(childFormId).toPromise();
          const childFormSectionsMetadata = await this._cinchyQueryService.getFormSectionsMetadata(childFormId).toPromise();

          let childFormFieldsMetadata = await this._cinchyQueryService.getFormFieldsMetadata(childFormId).toPromise();

          let parentColumnNameForLinkingToChild = formFields[i].childFormParentId;
          let childFormColumnNameForLinkingToParent = formFields[i].childFormLinkId;

          // If linkFieldId is present, then override and use that link to join the child to the parent
          if (!isNullOrUndefined(formFields[i].linkFieldId)) {
            let linkField = childFormFieldsMetadata.find(field => field.formFieldId == formFields[i].linkFieldId);
            if (linkField) {
              parentColumnNameForLinkingToChild = "[Cinchy ID]";
              childFormColumnNameForLinkingToParent = `[${linkField.columnName}].[Cinchy ID]`;
            }
          }

          childFormFieldsMetadata = childFormFieldsMetadata.filter(_ => !isNullOrUndefined(displayColumnId.find(id => id === _.formFieldId)));

          if(childFormMetadata != null){
            const childTableEntitlements = await this._cinchyService.getTableEntitlementsById(childFormMetadata.tableId).toPromise();

            childForm = await this.generateForm(childFormMetadata, null, childTableEntitlements, true, formFields[i].flattenChildForm, parentColumnNameForLinkingToChild, childFormColumnNameForLinkingToParent, formFields[i].childFormFilter, formFields[i].sortChildTable, form);

            childForm.populateSectionsFromFormMetadata(childFormSectionsMetadata);

            await this.fillWithFields(childForm, rowId, childFormMetadata, childFormFieldsMetadata, selectedLookupRecord, childTableEntitlements);
            await this.fillWithData(childForm, rowId, selectedLookupRecord, formMetadata.tableName, formMetadata.domainName);

            // Override these, they will be checked later when opening up the child form
            cinchyColumn.canEdit = true;
            cinchyColumn.canView = true;

            // If flatten, we have to check the entitlements for the last record and readjust the entitlements
            if (childForm.flatten && childForm.sections?.length && childForm.childFormRowValues?.length) {
              let childFormData = childForm.childFormRowValues;
              let lastRecordId = childFormData[childFormData.length - 1]["Cinchy ID"];
              if (lastRecordId) {
              //  const childTableEntitlements = await this._cinchyService.getTableEntitlementsById(childFormMetadata.tableId).toPromise();
                const childCellEntitlements = await this._getCellEntitlements(childFormMetadata.domainName, childFormMetadata.tableName, lastRecordId, childFormFieldsMetadata);
                childForm.rowId = lastRecordId;
                if (childForm.sections) {
                  for (let x = 0; x < childForm.sections.length; x++) {
                    if (childForm.sections[x].fields?.length) {
                      for (let y = 0; y < childForm.sections[x].fields.length; y++) {
                        const childColumnEntitlements = childTableEntitlements.columnEntitlements.find(_ => _.columnId === childForm.sections[x].fields[y].cinchyColumn.id);
                        const childColumnEntitlementKey = childColumnEntitlements ? `entitlement-${childColumnEntitlements?.columnName.substring(0, 114)}` : '';

                        childForm.sections[x].fields[y].cinchyColumn.canEdit = (isNullOrUndefined(childColumnEntitlements) || childCellEntitlements && childCellEntitlements[childColumnEntitlementKey] === 0) ? false : childColumnEntitlements.canEdit;
                        childForm.sections[x].fields[y].cinchyColumn.canView = !isNullOrUndefined(childColumnEntitlements?.canView) ? childColumnEntitlements.canView : false;
                      }
                    }
                  }
                }
              }
            }

            allChildForms.push(childForm);
          }
        }

        const formField: FormField = new FormField(
          formFields[i].formFieldId,
          formFields[i].formFieldName,
          formFields[i].caption,
          childForm,
          cinchyColumn,
          form
        );

        if (!childFormId) {
          parentFieldsByColumn[cinchyColumn.name] = formField;
        }

        for (let j = minSectionIter; j < form.sections.length; j++) {
          if (form.sections[j].id === formFields[i].formSectionId) {
            minSectionIter = j;
            form.sections[j].fields.push(formField);
            break;
          }
        }
      }

      form.fieldsByColumnName = parentFieldsByColumn;

      // TODO: this should be a forEach
      for (let i = 0; i < allChildForms.length; i++) {
        if (allChildForms[i].childFormParentId && allChildForms[i].childFormLinkId) {
          let parentColName = this._parseColumnNameByChildFormLinkId(allChildForms[i].childFormParentId);
          let childColName = this._parseColumnNameByChildFormLinkId(allChildForms[i].childFormLinkId);

          if (parentColName && form.fieldsByColumnName[parentColName] && childColName && allChildForms[i].fieldsByColumnName[childColName]) {
            if (isNullOrUndefined(parentChildLinkedColumns[parentColName])) {
              parentChildLinkedColumns[parentColName] = [];
            }

            parentChildLinkedColumns[parentColName].push(allChildForms[i].fieldsByColumnName[childColName]);

            // If this is a flat child form, hide the link column otherwise it'll appear twice on the form
            if (allChildForms[i].flatten) {
              allChildForms[i].fieldsByColumnName[childColName].hide = true;
            }
          }
        }
      }

      form.childFieldsLinkedToColumnName = parentChildLinkedColumns;
    }
  }


  async fillWithData(
      form: Form,
      targetRowId: number,
      selectedLookupRecord: ILookupRecord,
      parentTableName?: string,
      parentDomainName?: string
  ): Promise<boolean> {

    if (isNullOrUndefined(targetRowId)) {
      return false;
    }

    const selectQuery: IQuery = form.generateSelectQuery(targetRowId);

    if (isNullOrUndefined(selectQuery)) {
      return false;
    }

    try {
      if (form.isChild && form.childFormParentId && form.childFormLinkId && parentDomainName && parentTableName) {
        const queryToGetMatchIdFromParent = `
          SELECT
            ${form.childFormParentId} AS 'idParent'
          FROM [${parentDomainName}].[${parentTableName}]
          WHERE [Cinchy ID] = ${targetRowId};`;

        let cinchyIdForMatchFromParentResp = (
          await this._cinchyService.executeCsql(
            queryToGetMatchIdFromParent,
            null,
            null,
            QueryType.DRAFT_QUERY
          ).toPromise()
        ).queryResult.toObjectArray();

        let idForParentMatch = cinchyIdForMatchFromParentResp?.length ? cinchyIdForMatchFromParentResp[0]["idParent"] : null;

        if (idForParentMatch) {
          if (isNullOrUndefined(selectQuery.params)) {
            selectQuery.params = {};
          }

          selectQuery.params["@parentCinchyIdMatch"] = idForParentMatch;
        }
      }

      const selectQueryResult: Array<{ [key: string]: any }> = (
        await this._cinchyService.executeCsql(
          selectQuery.query,
          selectQuery.params,
          null,
          QueryType.DRAFT_QUERY
        ).toPromise()
      ).queryResult.toObjectArray();

      if (form.isChild) {
        form.populateChildRecordData(selectQueryResult, selectedLookupRecord);
      }
      else {
        form.loadRecordData(targetRowId, selectQueryResult);
      }

      return true;
    } catch (e) {

      if (e?.cinchyException?.message) {
        console.error(e.cinchyException.message, e);

        this._toastr.error("Error while fetching data from the table. Please make sure you have the correct entitlements to view the data.", "Error");
      }
      else {
        console.error(e);

        this._toastr.error(selectedLookupRecord ? e : "Selected row is either deleted or doesn't exist.", "Error");
      }

      return false;
    }
  }


  private async _getCellEntitlements(domainName: string, tableName: string, rowId: number, formFieldsMetadata: IFormFieldMetadata[]): Promise<Object> {

    const selectClause = formFieldsMetadata
      .filter(_ => _.columnName)
      .map(_ => ` editable([${_.columnName}]) AS 'entitlement-${_.columnName.substring(0, 114)}'`);

    const query = `
      SELECT
        ${selectClause.toString()}
      FROM [${domainName}].[${tableName}] t
      WHERE t.[Deleted] IS NULL
        AND t.[Cinchy ID]=${rowId};`;

    try {
      let response = await this._cinchyService.executeCsql(query, null).toPromise();

      return response.queryResult.toObjectArray()[0];
    } catch (e) {
      this._toastr.error('Error while checking the entitlements for the form fields. You may face issues upon saving the form.', 'Error');
    }

    return {};
  }


  private async _getFileName(rowId: number, fileNameColumn: string): Promise<string> {

    const [domain, table, column] = fileNameColumn?.split(".") || [];
    const whereCondition = `WHERE [Cinchy ID] = ${rowId} AND [Deleted] IS NULL`;

    if (domain) {
      const query = `SELECT [${column}] as 'fullName',
                       [Cinchy ID] as 'id'
                     FROM
                       [${domain}].[${table}]
                       ${whereCondition};`;

      const fileNameResp = await this._cinchyService.executeCsql(query, null, null, QueryType.DRAFT_QUERY).toPromise();

      return fileNameResp?.queryResult?.toObjectArray()[0] ? fileNameResp.queryResult.toObjectArray()[0]["fullName"] : null;
    }
  }


  private _parseColumnNameByChildFormLinkId(formLinkId: string): string {

    if (formLinkId) {
      let splitColumnNames = formLinkId.split("].[");

      if (splitColumnNames?.length > 0) {
        let colName = splitColumnNames[0].replace(/[\[\]]+/g, "");

        return colName;
      }
    }

    return null;
  }
}
