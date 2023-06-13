import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { FormSection } from "./cinchy-form-section.model";
import { FormField } from "./cinchy-form-field.model";
import { IQuery, Query } from "./cinchy-query.model";

import { IAdditionalProperty } from "../interface/additional-property";
import { IFindChildFormResponse } from "../interface/find-child-form-response";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { ILookupRecord } from "../../models/lookup-record.model";
import { ITableEntitlements } from "../interface/table-entitlements";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";

import * as R from "ramda";


export class Form {

  childFieldsLinkedToColumnName: { [columnName: string]: FormField[] } = {};
  fieldsByColumnName: { [columnName: string]: FormField } = {};

  errorFields = [];

  parentForm: Form;
  tableMetadata: Object;

  /**
   * If this is an unflattened child form, this will contain the set of key:value pairs that correspond to each
   * of the rows in that child form's table
   */
  childFormRowValues: Array<{ [key: string]: any }> = [];


  /**
   * Represents whether or not any values on this form have been updated by the user. If it is manually set
   * to false, every field in the form is marked as untouched
   */
  get hasChanged(): boolean {

    return this._hasChanged;
  }
  set hasChanged(value: boolean) {

    this._hasChanged = coerceBooleanProperty(value);

    if (!this._hasChanged) {
      this._sections?.forEach((section: FormSection) => {

        section.fields?.forEach((field: FormField) => {

          field.cinchyColumn.hasChanged = false;
        });
      });
    }
  }
  private _hasChanged: boolean = false;


  /**
   * Determines if the form has any fields
   */
  get hasFields(): boolean {

    const fieldCount = this._sections?.map((section: FormSection) => {

      return (section.fields?.length ?? 0);
    }).reduce((accumulator, currentValue: number) => {

      return (accumulator + currentValue);
    });

    return (fieldCount > 0);
  }


  /**
   * The cinchy ID of the record that is currently being displayed by this form
   */
  get rowId(): number {

    return this._rowId ?? null;
  }
  set rowId(value: number) {

    this._rowId = value;
  }
  private _rowId: number;


  /**
   * Returns a shallow copy of the sections contained within this form. Because it is not referential, this set should be considered read-only
   * unless the whole set is being replaced. Any mutation done directly on the array will not persist.
   *
   * To modify values on or underneath the set, use the Form model's mutator functions.
   */
  get sections(): Array<FormSection> {

    return this._sections?.slice();
  }
  protected set sections(value: Array<FormSection>) {

    this._sections = value.slice();
  }
  private _sections = new Array<FormSection>();


  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly targetTableId: number,
    public readonly targetTableDomain: string,
    public readonly targetTableName: string,
    public readonly isAccordion: boolean,
    public readonly tableEntitlements: ITableEntitlements,
    public readonly isChild: boolean = false,
    public readonly flatten: boolean = false,
    public readonly childFormParentId?: string,
    public readonly childFormLinkId?: string,
    public readonly childFormFilter?: string,
    public readonly childFormSort?: string,
    public readonly isClone?: boolean,
    private _childFormRowValues?: Array<{ [key: string]: any }>
  ) {

    this.childFormRowValues = _childFormRowValues?.slice();
  }


  /**
   * Modifies the flattened child form records by either updating an existing entry that matches the given rowId or adding a new entry if no match is present
   */
  addOrModifyChildFormRowValue(sectionIndex: number, rowData: { [columnName: string]: any }): void {

    if (rowData["Cinchy ID"] && rowData["Cinchy ID"] > 0) {
      const existingRowIndex = this.childFormRowValues.findIndex((existingRecordData: { [columnName: string]: any }) => {

        return (existingRecordData.rowId === rowData["Cinchy ID"]);
      });

      if (existingRowIndex !== -1) {
        this.childFormRowValues.splice(existingRowIndex, 1, [rowData]);
      }
      else {
        this.childFormRowValues.push(rowData);
      }
    }
    else {
      this.childFormRowValues.push(rowData);
    }
  }


  checkFormValidation(): {
    status: boolean,
    message: string
  } {

    let validationResult = {
      status: true,
      message: ""
    };

    this.errorFields = [];

    this.sections.forEach(section => {

      section.fields.forEach(element => {

        if (element.cinchyColumn.isMandatory === true && (isNullOrUndefined(element.value) || element.value === "")) {
          validationResult.status = false;

          this.errorFields.push(element.label);
        }

        if (element.cinchyColumn.validationExpression) {
          var exp = element.cinchyColumn.validationExpression;
          const regex = new RegExp(exp);

          element.value = element.value?.trim() ?? "";

          if (!regex.test(element.value)) {
            validationResult.status = false;
            validationResult.message = `No special characters are allowed in ${element.cinchyColumn.name}`
          }
        }
      });
    });

    const isOrAre = (this.errorFields?.length) > 1 ? "are" : "is";

    validationResult.message = this.errorFields?.length ? `Field(s): ${this.errorFields.join(" and ")} ${isOrAre} required` : validationResult.message;

    return validationResult;
  }


  checkChildFormValidation(): {
      status: boolean,
      message: string
  } {

    let validationResult = {
      status: true,
      message: ""
    };

    this.sections.forEach(section => {

      section.fields.forEach(element => {

        if (element.cinchyColumn.isMandatory === true && (isNullOrUndefined(element.value) || element.value === "")) {
          validationResult.status = false;
          validationResult.message = `Field ${element.cinchyColumn.name} is required`;
        }

        if (element.cinchyColumn.validationExpression !== "" && !isNullOrUndefined(element.cinchyColumn.validationExpression)) {
          var exp = element.cinchyColumn.validationExpression;

          const regex = new RegExp(exp);

          element.value = element.value?.trim() ?? "";

          if (!regex.test(element.value)) {
            validationResult.status = false;
            validationResult.message = `No special characters are allowed in ${element.cinchyColumn.name}`
          }
        }
      });
    });

    return validationResult;
  }


  /**
   * @param overrideId If provided, will update the formId of the clone to match this value.
   * @param markAsClean If true, will return a form with all fields considered to be untouched
   * 
   * @returns A deep copy of this form
   */
  clone(overrideId?: string, markAsClean?: boolean): Form {

    const clonedForm = new Form(
      overrideId ?? this.id,
      this.name,
      this.targetTableId,
      this.targetTableDomain,
      this.targetTableName,
      this.isAccordion,
      this.tableEntitlements,
      this.isChild,
      this.flatten,
      this.childFormParentId,
      this.childFormLinkId,
      this.childFormFilter,
      this.childFormSort,
      !markAsClean,
      this.childFormRowValues
    );

    clonedForm.rowId = null;
    clonedForm.sections = this.sections;

    clonedForm.fieldsByColumnName = {};
    clonedForm.childFieldsLinkedToColumnName = this.childFieldsLinkedToColumnName;

    clonedForm.errorFields = this.errorFields;

    clonedForm.parentForm = this.parentForm;
    clonedForm.tableMetadata = JSON.parse(JSON.stringify(this.tableMetadata));

    clonedForm.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        clonedForm.fieldsByColumnName[field.cinchyColumn.name] = field;

        if (!markAsClean) {
          // We want to save every field of the cloned record when the form is saved,
          // so we'll manually mark them as dirty
          clonedForm.updateFieldAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              propertyName: "hasChanged",
              propertyValue: true,
              cinchyColumn: true
            }
          );
        }

        if (field.childForm) {
          clonedForm.updateFieldAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              propertyName: "childForm",
              propertyValue: field.childForm.clone("-1", markAsClean)
            }
          );
        }
      });
    });

    clonedForm.restoreFormReferenceOnAllFields();

    return clonedForm;
  }


  /**
   * Searches the form's fields to find a reference to a specific child forn
   */
  findChildForm(targetChildFormId: string): IFindChildFormResponse {

    if (this._sections?.length) {
      for (let sectionIndex = 0; sectionIndex < this._sections.length; sectionIndex++) {
        if (this._sections[sectionIndex].fields?.length) {
          for (let fieldIndex = 0; fieldIndex < this._sections[sectionIndex].fields.length; fieldIndex++) {
            if (this._sections[sectionIndex].fields[fieldIndex].childForm?.id === targetChildFormId) {
              return {
                childForm: this._sections[sectionIndex].fields[fieldIndex].childForm,
                fieldIndex: fieldIndex,
                sectionIndex: sectionIndex
              };
            }
          }
        }
      }
    }

    return null;
  }


  generateDeleteQuery(): IQuery {

    let query: IQuery = new Query(
      `DELETE
        FROM [${this.targetTableDomain}].[${this.targetTableName}]
        WHERE [Cinchy ID] = ${this.rowId}
          AND [Deleted] IS NULL`,
      null
    );

    return query;
  }


  generateSaveQuery(rowID: number, cinchyVersion?: string, forClonedForm?: boolean): IQuery {

    let query: IQuery = null;

    let assignmentColumns: string[] = [];
    let assignmentValues: string[] = [];
    let attachedFilesInfo = [];

    let paramName: string;
    let paramNumber: number = 0;
    let params: { [key: string]: any } = {};

    this.rowId = rowID;

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (
          field.cinchyColumn.name &&
          field.cinchyColumn.canEdit &&
          field.cinchyColumn.hasChanged &&
          (!field.cinchyColumn.isViewOnly || forClonedForm) &&
          !field.childForm
        ) {
          paramName = `@p${paramNumber++}`;

          switch (field.cinchyColumn.dataType) {
            case "Date and Time":
              let elementValue: any = null;

              if (!isNullOrUndefined(field.value)) {
                elementValue = field.value instanceof Date ? field.value.toLocaleDateString() : field.value;
              }

              params[paramName] = elementValue ?? "";

              break;
            case "Choice":
              params[paramName] = (field.cinchyColumn.isMultiple ? (field.value ?? []).join(",") : field.value) ?? "";

              break;
            case "Binary":
              if (field.value && isNullOrUndefined(this.rowId)) {
                params[paramName] = field.value ?? "";

                assignmentColumns.push(`[${field.cinchyColumn.name}]`);
                assignmentValues.push(`'${params[paramName]}'`);
                attachedFilesInfo.push(this.getFileNameAndItsTable(field));
              }
              else if (this.rowId) {
                attachedFilesInfo.push(this.getFileNameAndItsTable(field));
              }

              break;
            case "Link":
              if (field.value instanceof Array || field.cinchyColumn.isMultiple) {
                let stringLinkArray = [];

                field.value.forEach(itemVal => {

                  stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                });

                params[paramName] = stringLinkArray.join(",") || null;
              }
              else {
                if (field.value === "DELETE") {
                  params[paramName] = "";
                }
                else {
                  params[paramName] = field.value?.toString();
                }
              }

              break;
            case "Yes/No":
              params[paramName] = field.value || false;

              break;
            default:
              params[paramName] = field.value ?? "";
          }

          if (field.cinchyColumn.dataType !== "Binary") {
            assignmentColumns.push(`[${field.cinchyColumn.name}]`);

            if (isNullOrUndefined(field.cinchyColumn.linkTargetColumnName)) {
              if (isNullOrUndefined(this.rowId)) {
                assignmentValues.push(`'${params[paramName]}'`);
              }
              else if ((field.cinchyColumn.dataType === "Text") && !field.value) {
                assignmentValues.push((params[paramName] !== "") ? `cast(${paramName} as nvarchar(100))` : paramName);
              }
              else {
                assignmentValues.push(paramName);
              }
            }
            else {
              if (field.value instanceof Array || field.cinchyColumn.isMultiple) {
                if (isNullOrUndefined(this.rowId)) {
                  let stringLinkArray = [];

                  field.value.forEach(itemVal => {

                    stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal);
                  });

                  assignmentValues.push(`'${stringLinkArray.join(",")}'`);
                }
                else if (field.cinchyColumn.dataType === "Link" && !field.value?.length) {
                  assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                }
                else {
                  assignmentValues.push(paramName);
                }
              }
              else {
                if (field.cinchyColumn.dataType === "Link") {
                  assignmentValues.push(`ResolveLink(${isNullOrUndefined(this.rowId) ? params[paramName] : paramName},'Cinchy ID')`);
                }
                else if (isNullOrUndefined(field.childForm)) {
                  assignmentValues.push(paramName);
                }
              }
            }
          }
        }
      });
    });

    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);

    if (assignmentValues?.length) {
      if (!this.rowId) {
        let queryString: string;

        if (isNullOrUndefined(cinchyVersion) || cinchyVersion.startsWith("4.")) {
          queryString = `
            INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(", ")})
              VALUES (${assignmentValues.join(", ")})
              SELECT @cinchy_row_id`;
        }
        else {
          queryString = `
            CREATE TABLE #tmp([id] int) 
              INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(", ")})
              OUTPUT INSERTED.[Cinchy ID] INTO #tmp ([id])
              VALUES (${assignmentValues.join(", ")})
              SELECT x.[id] as 'id' FROM #tmp x`;
        }

        query = new Query(queryString, params, attachedFilesInfo)
      }
      else {
        const assignmentSetClauses = assignmentColumns.map((value: string, index: number) => {

          return `t.${value} = ${assignmentValues[index]}`;
        });

        query = new Query(
          `UPDATE t
            SET ${assignmentSetClauses.join(", ")}
            FROM [${this.targetTableDomain}].[${this.targetTableName}] t
            WHERE t.[Cinchy ID] = ${this.rowId}
              AND t.[Deleted] IS NULL
            SELECT ${this.rowId}`,
          params,
          attachedFilesInfo
        );
      }

      return query;
    }
    else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    }

    return null;
  }


  generateSaveForChildQuery(rowId: number, forClonedForm?: boolean): IQuery {

    let query: IQuery = null;

    let assignmentColumns = new Array<string>();
    let assignmentValues = new Array<string>();
    let attachedFilesInfo = [];
    let foundLinkedColumn = false;

    let paramName: string;
    let paramNumber: number = 0;
    let params: { [key: string]: any } = {};

    this.rowId = rowId;

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        const isLinkedColumnForInsert = coerceBooleanProperty(
          !this.rowId &&
            (field.cinchyColumn.dataType === "Link" ||
              `[${field.label}]` === this.childFormLinkId)
        );

        if (
            field.cinchyColumn.canEdit &&
            field.cinchyColumn.name &&
            (!field.cinchyColumn.isViewOnly || forClonedForm) &&
            (field.cinchyColumn.hasChanged || isLinkedColumnForInsert)
        ) {
          paramName = `@p${paramNumber++}`;

          switch (field.cinchyColumn.dataType) {
            case "Date and Time":
              try {
                params[paramName] = field.value ?
                  ( ((field.value instanceof Date) ? field.value : new Date(field.value))?.toLocaleString() ?? null ) :
                  null;
              }
              catch (error) {
                // Do nothing
              }

              break;
            case "Choice":
              params[paramName] = (field.cinchyColumn.isMultiple ? (field.value ?? []).join(",") : field.value) ?? "";

              break;
            case "Binary":
              if (field.value && isNullOrUndefined(this.rowId)) {
                params[paramName] = field.value ?? "";

                assignmentColumns.push(`[${field.cinchyColumn.name}]`);
                assignmentValues.push(`'${params[paramName]}'`);
                attachedFilesInfo.push(this.getFileNameAndItsTable(field));
              }
              else if (this.rowId) {
                attachedFilesInfo.push(this.getFileNameAndItsTable(field));
              }

              break;
            case "Link":
              if (field.value && field.cinchyColumn.isMultiple) {
                let stringLinkArray = [];

                field.value.forEach(itemVal => {

                  stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                });

                params[paramName] = stringLinkArray.join(",") || null;
              }
              else {
                if (field.value === "DELETE") {
                  params[paramName] = "";
                }
                else {
                  params[paramName] = field.value?.toString();
                }
              }

              break;
            case "Yes/No":
              params[paramName] = field.value || false;

              break;
            default:
              params[paramName] = field.value ?? "";
          }

          if (field.cinchyColumn.dataType !== "Binary") {
            assignmentColumns.push(`[${field.cinchyColumn.name}]`);

            if (isNullOrUndefined(field.cinchyColumn.linkTargetColumnName)) {
              if (isNullOrUndefined(this.rowId)) {
                assignmentValues.push(`${paramName}`);
              }
              else if ((field.cinchyColumn.dataType === "Text") && !field.value) {
                assignmentValues.push((params[paramName] !== "") ? `cast(${paramName} as nvarchar(100))` : paramName);
              }
              else {
                assignmentValues.push(paramName);
              }
            }
            else {
              if (field.value && field.cinchyColumn.isMultiple) {
                if (isNullOrUndefined(this.rowId)) {
                  let stringLinkArray = [];

                  field.value.forEach(itemVal => {

                    stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal);
                  });

                  assignmentValues.push(`'${stringLinkArray.join(",")}'`);
                }
                else if (field.cinchyColumn.dataType === "Link" && !field.value?.length) {
                  assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                }
                else {
                  assignmentValues.push(paramName);
                }
              }
              else {
                if (field.cinchyColumn.dataType === "Link") {
                  foundLinkedColumn ||= field.cinchyColumn.linkTargetTableId === this.parentForm.targetTableId;
                  if (isNullOrUndefined(this.rowId)) {
                    if (field.form.isChild && field.form.flatten && field.form.childFormParentId) {
                      let childFormAssignmentValue = `ResolveLink(${paramName},'Cinchy ID')`;

                      const columnMetadata = field.form.tableMetadata["Columns"]?.find((column: { columnId: number }) => {

                        return (column.columnId === field.cinchyColumn.id);
                      });

                      if (columnMetadata?.primaryLinkedColumnId) {
                        const primaryLinkedColumn = field.form.parentForm.tableMetadata["Columns"]?.find((column: { columnId: number }) => {

                          return (column.columnId === field.cinchyColumn.id);
                        });

                        if (primaryLinkedColumn) {
                          childFormAssignmentValue = `ResolveLink(${paramName},'${primaryLinkedColumn.name}')`;
                        }
                      }

                      assignmentValues.push(childFormAssignmentValue);
                    }
                    else {
                      if (params[paramName]) {
                        assignmentValues.push(`ResolveLink(${paramName},'Cinchy ID')`);
                      } else {
                        assignmentValues.push("NULL");
                      }
                    }
                  }
                  else {
                    if (params[paramName]) {
                      assignmentValues.push(`ResolveLink(${paramName},'Cinchy ID')`);
                    } else {
                      assignmentValues.push("NULL");
                    }
                  }
                }
                else {
                  assignmentValues.push(paramName);
                }
              }
            }
          }
        }
      });
    });

    // Link child record to parent table if linked field is not displayed in the form
    if (!foundLinkedColumn) {
      this.tableMetadata["Columns"]?.forEach((column: { columnType: string, linkedTableId: number, name: string }) => {
        if (
          column.columnType === "Link" &&
          column.linkedTableId === this.parentForm.targetTableId
        ) {
          paramName = `@p${paramNumber++}`;
          assignmentColumns.push(`[${column.name}]`);
          assignmentValues.push(`ResolveLink(${paramName},'Cinchy ID')`);
          params[paramName] = this.parentForm.rowId.toString();
        }
      });
    }

    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);

    if (assignmentValues?.length) {
      // TODO: Due to CIN-02087, if the user has not explicitly included the linked field in the form and populated it as part of filling out the data,
      //       this query will resolve and create the record in the child table, but it will not link that record back to the parent form
      if (!this.rowId) {
        query = new Query(
          `INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(", ")})
            VALUES (${assignmentValues.join(", ")}); SELECT 1;`,
          params,
          attachedFilesInfo
        );
      }
      else {
        const assignmentSetClauses = assignmentColumns.map((value: string, index: number) => {

          return `t.${value} = ${assignmentValues[index]}`;
        });

        query = new Query(
          `UPDATE t
            SET ${assignmentSetClauses.join(", ")}
            FROM [${this.targetTableDomain}].[${this.targetTableName}] t
            WHERE t.[Cinchy ID] = ${this.rowId}
              AND t.[Deleted] IS NULL; SELECT 1;`,
          params,
          attachedFilesInfo
        );
      }

      return query;
    }
    else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    }

    return null;
  }


  generateSelectQuery(rowId: number): IQuery {

    let fields: Array<string> = [];

    this.sections.forEach(section => {
      section.fields.forEach(element => {

        if (isNullOrUndefined(element.cinchyColumn.name) || element.cinchyColumn.name === "") {
          return;
        }

        if (element.cinchyColumn.dataType === "Link") {
          //TODO: Changes for Short Name
          const splitLinkTargetColumnNames = element.cinchyColumn.linkTargetColumnName?.split(".") ?? [];
          const targetColumnForQuery = (splitLinkTargetColumnNames.map(name => `[${name}]`)).join(".");
          const labelForColumn = element.cinchyColumn.isDisplayColumn ? element.cinchyColumn.linkTargetColumnName : element.cinchyColumn.name;
          // Having sep conditions just for clarity
          if (!element.cinchyColumn.isDisplayColumn && this.isChild) {
            const col = `[${element.cinchyColumn.name}].[Cinchy ID]`
            element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
          } else if (!this.isChild) {
            const col = `[${element.cinchyColumn.name}].[Cinchy ID]`
            element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
          }
          const col = `[${element.cinchyColumn.name}].${targetColumnForQuery}`
          element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${labelForColumn} label'`);
        }
        else {
          //TODO: Changes for Short Name
          const col = `[${element.cinchyColumn.name}]`
          element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
        }
        fields = R.uniq(fields);
      });
    });
    fields.push("[Cinchy ID]");

    if (this.isChild) {
      
      const defaultWhere = `where t.${this.childFormLinkId} = @parentCinchyIdMatch and t.[Deleted] is null`;

      const whereConditionWithFilter = this.childFormFilter ? 
      `${defaultWhere} AND (${this.childFormFilter})` : defaultWhere;

      const whereWithOrder = this.childFormSort ? `${whereConditionWithFilter} ${this.childFormSort}` : `${whereConditionWithFilter} Order by t.[Cinchy ID]`;

      let query: IQuery = new Query(
        `select ${fields.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t ${whereWithOrder}`,
        null,
        null
      );

      return query;
    } else {
      let query: IQuery = new Query(
        `select ${fields.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t where t.[Cinchy ID] = ${rowId} and t.[Deleted] is null Order by t.[Cinchy ID]`,
        null
      );

      return query;
    }
  }


  getFileNameAndItsTable(field: FormField, childCinchyId?: number): {
    childCinchyId: number,
    column: string,
    domain: string,
    fileName: string,
    query: string,
    table: string,
    value: any
  } {

    const [domain, table, column]: [string, string, string] = field.cinchyColumn.fileNameColumn?.split(".") ?? [];
    const query = this.rowId ? `Insert into [${domain}].[${table}] ([Cinchy ID], [${field.cinchyColumn.name}]) values(@rowId, @fieldValue)` : null;

    return {
      domain,
      table,
      column,
      fileName: field.cinchyColumn.fileName,
      query,
      value: field.value,
      childCinchyId
    };
  }


  loadRecordData(rowId: number, allRowData: Array<{ [key: string]: any }>): void {

    const duplicateLabelColumns = {};

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (field.cinchyColumn.name) {
          allRowData.forEach((rowData: { [key: string]: any }) => {

          //TODO: Passing array value in case of multiselect
          if (field.cinchyColumn.dataType === "Choice" && field.cinchyColumn.isMultiple === true) {
            const valueArray = rowData[field.cinchyColumn.name]?.split(",") ?? [];

            let optionArray = [];

            valueArray.forEach((element: any) => {

              if (element) {
                const value = element.trim();
                const objValues = {
                  id: value,
                  itemName: value
                };

                optionArray.push(objValues);
              }
            });

            field.setInitialValue(optionArray);
          } else {
            field.setInitialValue(rowData[field.cinchyColumn.name]);
          }

          if (field.cinchyColumn.dataType === "Link") {
            let optionArray: Array<DropdownOption> = new Array<DropdownOption>();

            if (rowData[field.cinchyColumn.name]) {
              const labelForColumn = field.cinchyColumn.isDisplayColumn ? field.cinchyColumn.linkTargetColumnName : field.cinchyColumn.name;

              let properLabelForColumn = " label";

              if (field.cinchyColumn.isDisplayColumn) {
                if (duplicateLabelColumns[labelForColumn] || duplicateLabelColumns[labelForColumn] === 0) {
                  duplicateLabelColumns[labelForColumn] = duplicateLabelColumns[labelForColumn] + 1;
                  properLabelForColumn = `${properLabelForColumn}${duplicateLabelColumns[labelForColumn]}`;
                } else {
                  duplicateLabelColumns[labelForColumn] = 0;
                }
              }

              optionArray.push(new DropdownOption(rowData[field.cinchyColumn.name], rowData[labelForColumn + properLabelForColumn]));

              let result = new DropdownDataset(optionArray, true);

              rowData[field.cinchyColumn.name] = field.value;

              if (isNullOrUndefined(field.dropdownDataset)) {
                field.dropdownDataset = result;
              }
            }
          }
        });
        }
      });
    });

    // TODO: determine if this is relevant or necessary
    this.rowId = rowId;
  }


  /**
   * After retrieving the records from a child form's table, process the row data into a form
   * that the application can digest.
   */
  populateChildRecordData(
      selectQueryResult: Array<{ [key: string]: any }>,
      preselectedRecord?: ILookupRecord
  ): void {

    this.childFormRowValues = selectQueryResult.slice();

    this.sections.forEach((section: FormSection) => {

      let childFormLinkIdValue: string;

      section.fields.forEach((field: FormField) => {

        if (field.cinchyColumn.name) {
          childFormLinkIdValue = field.cinchyColumn.childFormLinkId || "";
          childFormLinkIdValue = childFormLinkIdValue.replace(new RegExp("[\[]", "g"), "");
          childFormLinkIdValue = childFormLinkIdValue.replace(new RegExp("[\]]", "g"), "");

          if (field.cinchyColumn.linkedFieldId === field.id || childFormLinkIdValue === field.cinchyColumn.name) {
            if (!this.childFormRowValues.length && !field.dropdownDataset) {
              field.dropdownDataset = new DropdownDataset(preselectedRecord ? [new DropdownOption(preselectedRecord.id.toString(), preselectedRecord.label)] : [], true);
            }

            field.linkedColumn = {
              linkedField: field,
              linkLabel: field.label
            };
          }

          this.childFormRowValues.forEach((rowData: { [key: string]: any }) => {
            let linkColumnLabelKey = `${(field.cinchyColumn.isDisplayColumn ? field.cinchyColumn.linkTargetColumnName : field.cinchyColumn.name)} label`;

            if (field.cinchyColumn.dataType === "Link" && field.cinchyColumn.isMultiple) {
              
              let linkIds: Array<string> = !isNullOrUndefined(rowData[field.cinchyColumn.name]) ?
                rowData[field.cinchyColumn.name].split(",").map(x => x.trim()) :
                [];

              let linkLabels: Array<string> = !isNullOrUndefined(rowData[linkColumnLabelKey]) ?
                rowData[linkColumnLabelKey].split(",").map(x => x.trim()) :
                [];

              rowData[field.cinchyColumn.name] = linkIds;
              rowData[linkColumnLabelKey] = linkLabels;
            }

            if (field.cinchyColumn.dataType === "Choice" && field.cinchyColumn.isMultiple === true) {
              let choiceValues: Array<string> = !isNullOrUndefined(rowData[field.cinchyColumn.name]) ?
                rowData[field.cinchyColumn.name].split(",") :
                [];

              let optionArray = [];
              choiceValues.forEach((value: string) => {         
                if (isNullOrUndefined(value))
                  return;

                optionArray.push({
                  id: value.trim(),
                  itemName: value.trim()
                });
              });

              field.setInitialValue(optionArray);
              rowData[field.cinchyColumn.name] = choiceValues;
            } else {
              field.setInitialValue(rowData[field.cinchyColumn.name]);
            }

            if (field.cinchyColumn.dataType === "Link") {

              if (rowData[field.cinchyColumn.name]) {
                let linkIds = Array.isArray(rowData[field.cinchyColumn.name]) ?
                  rowData[field.cinchyColumn.name] :
                  [rowData[field.cinchyColumn.name]];

                let linkLabels = Array.isArray(rowData[linkColumnLabelKey]) ?
                  rowData[linkColumnLabelKey] :
                  [rowData[linkColumnLabelKey]];

                let optionArray: DropdownOption[] = [];
                for (let i = 0; i < linkIds.length; i++) {
                  optionArray.push(new DropdownOption(linkIds[i], linkLabels[i]));
                }

                if (isNullOrUndefined(field.dropdownDataset?.options) || field.dropdownDataset.options.length === 0) {
                  field.dropdownDataset = new DropdownDataset(optionArray, true);
                } else {
                  optionArray.forEach(opt => {
                    if (field.dropdownDataset.options.filter(x => x.id == opt.id).length === 0) {
                      field.dropdownDataset.options.push(opt);
                    }
                  });
                }
              }

              if (!field.cinchyColumn.isDisplayColumn) {
                delete rowData[linkColumnLabelKey];
              }
            }
          });
        }
      });
    });
  }


  /**
   * Generates sections for this form based on the given metadata
   */
  populateSectionsFromFormMetadata(metadata: Array<IFormSectionMetadata>): void {

    this._sections = metadata.map((sectionMetadata: IFormSectionMetadata) => {

      let result = new FormSection(
        sectionMetadata.id,
        sectionMetadata.name,
        sectionMetadata.autoExpand,
        sectionMetadata.columnsInRow
      );

      return result;
    });
  }


  /**
   * Ensures that every field's form value correctly points to this form
   */
  restoreFormReferenceOnAllFields(): void {

    this._sections?.forEach((section: FormSection) => {

      section.fields?.forEach((field: FormField) => {

        field.form = this;
      });
    });
  }


  /**
   * Updates a specific property on the root of the given field's child form
   */
  updateChildFormProperty(sectionIndex: number, fieldIndex: number, property: IAdditionalProperty): void {

    if (
        this._sections?.length > sectionIndex &&
        this._sections[sectionIndex].fields?.length > fieldIndex &&
        this._sections[sectionIndex].fields[fieldIndex].childForm
    ) {
      this._sections[sectionIndex].fields[fieldIndex].childForm.updateRootProperty(property);
    }
  }


  /**
   * Updates a specific property of a field
   */
  updateFieldAdditionalProperty(sectionIndex: number, fieldIndex: number, property: IAdditionalProperty): void {

    if (this._sections?.length > sectionIndex && this._sections[sectionIndex].fields?.length > fieldIndex) {
      if (property.cinchyColumn) {
        this._sections[sectionIndex].fields[fieldIndex].cinchyColumn[property.propertyName] = property.propertyValue;
      }
      else {
        this._sections[sectionIndex].fields[fieldIndex][property.propertyName] = property.propertyValue;
      }
    }
  }


  /**
   * Updates the value of the given field and marks it as touched. If any additional properties are provided, those properties will be updated on
   * the same field after the value has been updated.
   */
  updateFieldValue(sectionIndex: number, fieldIndex: number, newValue: any, additionalPropertiesToUpdate?: Array<IAdditionalProperty>): void {

    if (this._sections?.length > sectionIndex && this._sections[sectionIndex].fields?.length > fieldIndex) {
      // Since we don't store the field's original value, we will mark it as changed if the current value is different from the
      // value immediately prior, or if the field has already been marked as changed
      const valueIsDifferent = (newValue !== this._sections[sectionIndex].fields[fieldIndex].value);

      this.hasChanged = this.hasChanged || valueIsDifferent;

      this._sections[sectionIndex].fields[fieldIndex].cinchyColumn.hasChanged = this._sections[sectionIndex].fields[fieldIndex].cinchyColumn.hasChanged || valueIsDifferent;
      this._sections[sectionIndex].fields[fieldIndex].value = newValue;

      additionalPropertiesToUpdate?.forEach((property: IAdditionalProperty) => {

        this.updateFieldAdditionalProperty(sectionIndex, fieldIndex, property);
      });
    }
  }


  /**
   * Updates a specific property on the main form object. Should be used in place of directly assigning any value
   */
  updateRootProperty(property: IAdditionalProperty): void {

    this[property.propertyName] = property.propertyValue;
  }


  /**
   * Updates a specific property of a section
   */
  updateSectionProperty(sectionIndex: number, property: IAdditionalProperty): void {

    if (this._sections?.length > sectionIndex) {
      this._sections[sectionIndex][property.propertyName] = property.propertyValue;
    }
  }


  /**
   * Adds an item to a link array, which takes the form of the value followed by a 0 element. Will not add the value
   * if it is falsey or if it is already in the set.
   */
  private _addLinkArrayItem(set: Array<any>, value: string): Array<any> {

    if (value && !set.includes(value)) {
      return (set || []).concat([value, 0]);
    }

    return set;
  }
}
