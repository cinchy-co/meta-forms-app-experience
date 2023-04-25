import { FormSection } from "./cinchy-form-section.model";
import { FormField } from "./cinchy-form-field.model";
import { IQuery, Query } from "./cinchy-query.model";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { IDropdownOption, DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";

import * as R from "ramda";


export class Form {

  childFieldsLinkedToColumnName: { [columnName: string]: FormField[] } = {};
  errorFields = [];
  fieldsByColumnName: { [columnName: string]: FormField } = {};
  linkedColumnElement;
  parentForm: Form;
  tableMetadata: Object;


  get rowId(): number {

    return this._rowId ?? null;
  }
  set rowId(value: number) {

    this._rowId = value;
  }
  private _rowId: number;


  get sections(): Array<FormSection> {

    return this._sections?.slice();
  }
  private _sections = new Array<FormSection>();


  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly targetTableId: number,
    public readonly targetTableDomain: string,
    public readonly targetTableName: string,
    public readonly isAccordion: boolean,
    public readonly hasAccess: boolean,
    public readonly isChild: boolean = false,
    public readonly flatten: boolean = false,
    public readonly childFormParentId?: string,
    public readonly childFormLinkId?: string,
    public readonly childFormFilter?: string,
    public readonly childFormSort?: string
  ) {}


  checkFormValidation() {

    let message = "";

    let validationResult = {
      status: true,
      message: message
    };

    this.errorFields = [];

    this.sections.forEach(section => {

      section.fields.forEach(element => {

        if (element.cinchyColumn.isMandatory === true && (isNullOrUndefined(element.value) || element.value === "")) {
          validationResult.status = false;
          this.errorFields.push(element.label);
        }

        if (element.cinchyColumn.validationExpression !== "" && !isNullOrUndefined(element.cinchyColumn.validationExpression)) {
          var exp = element.cinchyColumn.validationExpression;
          const regex = new RegExp(exp);
          if (!isNullOrUndefined(element.value) && element.value !== "") {
            element.value = element.value.trim();
          }
          if (!regex.test(element.value)) {
            validationResult.status = false;
            validationResult.message = `No special characters are allowed in ${element.cinchyColumn.name}`
          }
        }
      });
    });
    const isOrAre = this.errorFields && this.errorFields.length > 1 ? "are" : "is";
    validationResult.message = this.errorFields && this.errorFields.length ? `Field(s):  ${this.errorFields.join(" and ")} ${isOrAre} required`
      : validationResult.message;
    return validationResult;
  }


  checkChildFormValidation() {
    let message = "";
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
          if (!isNullOrUndefined(element.value) && element.value !== "") {
            element.value = element.value.trim();
          }
          if (!regex.test(element.value)) {
            validationResult.status = false;
            validationResult.message = `No special characters are allowed in ${element.cinchyColumn.name}`
          }
        }
      });
    });
    return validationResult;
  }


  generateDeleteQuery(): IQuery {

    let query: IQuery = new Query(
      `delete from [${this.targetTableDomain}].[${this.targetTableName}] where [Cinchy Id] = ${this.rowId} and [Deleted] is null`,
      null
    );

    return query;
  }


  generateSaveQuery(rowID, cinchyVersion?: string, forClonedForm?: boolean): IQuery {

    let i: number = 0;
    let params = {};
    let query: IQuery = null;
    let assignmentColumns: string[] = [];
    let assignmentValues: string[] = [];
    let attachedFilesInfo = [];
    this.rowId = rowID;
    let paramName: string;

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (
          field.cinchyColumn.name != null &&
          field.cinchyColumn.canEdit &&
          field.cinchyColumn.hasChanged &&
          (!field.cinchyColumn.isViewOnly || forClonedForm) &&
          !field.childForm
        ) {
          paramName = `@p${i++}`;

          switch (field.cinchyColumn.dataType) {
            case "Date and Time":
              let elementValue: any = null;

              if (!isNullOrUndefined(field.value)) {
                elementValue = field.value instanceof Date ? field.value.toLocaleDateString() : field.value;
              }

              params[paramName] = elementValue ?? "";

              // TODO: isn't this code unreachable?
              if (!paramName) {
                paramName = field.value instanceof Date ? paramName : `NULLIF(${paramName},"")`;
              }

              break;
            case "Number":
              params[paramName] = field.value ?? "";

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
              params[paramName] = field.value;

              break;
            default:
              params[paramName] = field.value ?? "";
          }

          //TODO: Return Insert Data when binary
          if (field.cinchyColumn.dataType !== "Binary") {
            assignmentColumns.push(`[${field.cinchyColumn.name}]`);
          }

          if (isNullOrUndefined(field.cinchyColumn.linkTargetColumnName) && field.cinchyColumn.dataType !== "Binary") {
            //TODO: for insert data ... because insert is giving error with parameters
            if (isNullOrUndefined(this.rowId)) {
              assignmentValues.push(`'${params[paramName]}'`);
            }
            else if ((field.cinchyColumn.dataType === "Text") && !field.value) {
              assignmentValues.push((params[paramName] != "") ? `cast(${paramName} as nvarchar(100))` : paramName);
            }
            else {
              assignmentValues.push(paramName);
            }
          }
          else if (field.cinchyColumn.dataType !== "Binary") {
            if (field.value instanceof Array || field.cinchyColumn.isMultiple) {
              let stringLinkArray = [];

              field.value.forEach(itemVal => {

                stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal);
              });

              if (isNullOrUndefined(this.rowId)) {
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
              if (field.cinchyColumn.dataType == "Link") {
                assignmentValues.push(isNullOrUndefined(this.rowId) ? `ResolveLink(${params[paramName]},'Cinchy Id')` : `ResolveLink(${paramName},'Cinchy Id')`);
              }
              else {
                if (isNullOrUndefined(field.childForm)) {
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
        const queryString =
          cinchyVersion == null || cinchyVersion.startsWith("4.") ?
            `INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")}) VALUES (${assignmentValues.join(",")}) SELECT @cinchy_row_id` :
            `CREATE TABLE #tmp([id] int) 
              INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")})
              OUTPUT INSERTED.[Cinchy Id] INTO #tmp ([id])
              VALUES (${assignmentValues.join(",")})
              SELECT x.[id] as 'id' FROM #tmp x`;

        query = new Query(queryString, params, attachedFilesInfo)
      } else {
        const assignmentSetClauses = assignmentColumns.map((value: string, index: number) => {

          return `t.${value} = ${assignmentValues[index]}`;
        });

        query = new Query(
          `update t set ${assignmentSetClauses.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t where t.[Cinchy Id] = ${this.rowId} and t.[Deleted] is null SELECT ${this.rowId}`,
          params,
          attachedFilesInfo
        );
      }
      return query;
    } else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    } else {
      return null;
    }
  }


  generateSaveForChildQuery(rowID, forClonedForm?: boolean): IQuery {

    let i: number = 0;
    let params = {};
    let query: IQuery = null;
    let assignmentColumns: string[] = [];
    let assignmentValues: string[] = [];
    //for insert values
    this.rowId = rowID;
    let paramName: string;
    let attachedFilesInfo = [];
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        if (isNullOrUndefined(element.value) && (!isNullOrUndefined(element.cinchyColumn.linkTargetColumnName))) {
          console.log("Link type cannot be null");
        } else {
          const isLinkedColumnForInsert = this.isLinkedColumn(element, section) && !rowID;
          if (element.cinchyColumn.name != null && element.cinchyColumn.canEdit
            && (!element.cinchyColumn.isViewOnly || forClonedForm) && (element.cinchyColumn.hasChanged || isLinkedColumnForInsert)) {
            if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === "string")) ||
              (element.cinchyColumn.dataType === "Choice" && element.value)
              || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
              paramName = "@p" + i.toString();
            }
            switch (element.cinchyColumn.dataType) {
              case "Date and Time":
                let date: Date;
                if (typeof element.value === "string") {
                  try {
                    date = new Date(element.value);
                  } catch { }
                } else if (element.value instanceof Date) {
                  date = element.value;
                }

                let elementValue = isNullOrUndefined(date) ? null : date instanceof Date ? date.toLocaleDateString() : null;
                if (elementValue) {
                  params[paramName] = elementValue ? elementValue : "";
                }
                paramName = date instanceof Date ? paramName : `NULLIF(${paramName},')`;
                break;
              case "Number":
                let elementValueNumber = isNullOrUndefined(element.value) ? "" : element.value;
                params[paramName] = elementValueNumber;
                break;
              //TODO: Currently For only Choice of MultiSelect (OLD now)
              case "Choice":
                if (element.value) {
                  let choiceElementValue;
                  if (element.cinchyColumn.isMultiple) {
                    const arrayElement = element.value ? element.value : [];
                    /* element.value && element.value.length && element.value.forEach(element => {
                       if (element.id !== "" && !isNullOrUndefined(element.id)) {
                         arrayElement.push(element.id.trim());
                       }

                     });*/
                    choiceElementValue = isNullOrUndefined(arrayElement) ? "" : (Array.isArray(arrayElement) ? arrayElement.join(",") : arrayElement);
                  } else {
                    choiceElementValue = element.value;
                  }
                  params[paramName] = choiceElementValue;
                }

                break;
              case "Binary":
                if (element.value && !this.rowId) {
                  params[paramName] = (element.value) ? element.value : "";

                  if (!this.rowId) {
                    assignmentColumns.push(`[${element.cinchyColumn.name}]`);
                    assignmentValues.push(`'${params[paramName]}'`);
                  }

                  attachedFilesInfo.push(this.getFileNameAndItsTable(element));
                }
                else if (this.rowId) {
                  attachedFilesInfo.push(this.getFileNameAndItsTable(element, this.rowId));
                }

                break;
              case "Link":
                if (element.value instanceof Array) {
                  let stringLinkArray = [];

                  element.value.forEach(itemVal => {

                    stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                  });

                  params[paramName] = stringLinkArray.join();
                } else if (element.cinchyColumn.isMultiple) {
                  const allValues = element.value?.split(",") ?? [];

                  let stringLinkArray = [];

                  allValues.forEach(itemVal => {

                    stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                  });

                  params[paramName] = stringLinkArray.join();
                } else {
                  if (element.value === "DELETE") {
                    params[paramName] = "";
                  } else {
                    params[paramName] = element.value ? element.value.toString() : element.value;
                  }
                }
                break;
              default:
                params[paramName] = isNullOrUndefined(element.value) ? "" : element.value;
            }
            //TODO: Return Insert Data when binary
            if (element.cinchyColumn.dataType !== "Binary") {
              if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === "string")) ||
                (element.cinchyColumn.dataType === "Choice" && element.value)
                || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
                assignmentColumns.push(`[${element.cinchyColumn.name}]`);
              }
            }
            if (isNullOrUndefined(element.cinchyColumn.linkTargetColumnName) &&
              element.cinchyColumn.dataType !== "Binary") {
              //TODO: for insert data ... because insert is giving error with parameters
              if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === "string")) ||
                (element.cinchyColumn.dataType === "Choice" && element.value)
                || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
                if (element.cinchyColumn.dataType === "Text" && !element.value) {
                  // Because empty values for text input is throwing error
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${params[paramName]}'`) :
                    assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                } else {
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${params[paramName]}'`) :
                    assignmentValues.push(paramName);
                }
              }
            } else if (element.cinchyColumn.dataType !== "Binary") {
              //TODO: code for the multi select Link
              if (element.value instanceof Array) {
                let stringLinkArray = [];

                element.value.forEach(itemVal => {

                  stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                });

                const stringifyValue = stringLinkArray.join();

                //TODO: for insert data ... because insert is giving error with parameters
                if ((element.cinchyColumn.dataType === "Link") && (!element.value || (element.value && !element.value.length))) {
                  // Because empty values for multi input is throwing error
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) :
                    assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                } else {
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) : assignmentValues.push(paramName);
                }
              } else if (element.cinchyColumn.isMultiple) {
                let stringLinkArray = [];

                element.value.forEach(itemVal => {

                  stringLinkArray = this._addLinkArrayItem(stringLinkArray, itemVal?.trim ? itemVal.trim() : itemVal)
                });

                isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringLinkArray.join(",")}'`) : assignmentValues.push(paramName);
              } else {
                //TODO: for insert data ... because insert is giving error with parameters
                if (element.cinchyColumn.dataType == "Link") {

                  if (isNullOrUndefined(this.rowId) && element.form.isChild && element.form.flatten && element.form.childFormParentId) {
                    let assignmentVal = `ResolveLink(${params[paramName]},'Cinchy Id')`;
                    let columnMetadata = element.form.tableMetadata["Columns"]?.find(_ => _.columnId == element.cinchyColumn.id);
                    if (columnMetadata && columnMetadata.primaryLinkedColumnId) {
                      let primaryLinkedColumn = element.form.parentForm.tableMetadata["Columns"]?.find(_ => _.columnId == columnMetadata.primaryLinkedColumnId);
                      if (primaryLinkedColumn) {
                        assignmentVal = `ResolveLink('${params[paramName]}','${primaryLinkedColumn.name}')`;
                      }
                    }
                    assignmentValues.push(assignmentVal);
                  } else {
                    isNullOrUndefined(this.rowId) ?
                      assignmentValues.push(`ResolveLink(${params[paramName]},'Cinchy Id')`) :
                      assignmentValues.push(`ResolveLink(${paramName},'Cinchy Id')`);
                  }

                } else {
                  if (isNullOrUndefined(element.childForm)) {
                    if (
                      (element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === "string")) ||
                      (element.cinchyColumn.dataType === "Choice" && element.value) ||
                      (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")
                    ) {
                      assignmentValues.push(paramName);
                    }
                  }
                }
              }
            }
            i++;
          }
        }
      });
    });

    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);

    if (assignmentValues && assignmentValues.length) {
      if (isNullOrUndefined(rowID)) {
        query = new Query(
          `insert into [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")}) values (${assignmentValues.join(",")})`,
          params,
          attachedFilesInfo
        );
      }
      else {
        let assignmentSetClauses: string[] = [];

        for (let j = 0; j < assignmentColumns.length; j++) {
          assignmentSetClauses.push(assignmentColumns[j] + " = " + assignmentValues[j]);
        }

        query = new Query(
          `update t set ${assignmentSetClauses.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t where t.[Cinchy Id] = ${this.rowId} and t.[Deleted] is null`,
          params,
          attachedFilesInfo
        );
      }

      return query;
    }
    else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    }
    else {
      return null;
    }
  }


  generateSelectQuery(rowId: number, parentTableId: number = 0): IQuery {

    let columnName = null;
    let fields: Array<string> = [];

    this.sections.forEach(section => {
      section.fields.forEach(element => {
        //TODO: GET The values Dynamically
        if (parentTableId === element.cinchyColumn.linkTargetTableId) {
          columnName = element.cinchyColumn.name;
        }

        if (isNullOrUndefined(element.cinchyColumn.name) || element.cinchyColumn.name == "") {
          return;
        }

        if (element.cinchyColumn.dataType === "Link") {
          //TODO: Changes for Short Name
          const splitLinkTargetColumnNames = element.cinchyColumn.linkTargetColumnName?.split(".") ?? [];
          const targetColumnForQuery = (splitLinkTargetColumnNames.map(name => `[${name}]`)).join(".");
          const labelForColumn = element.cinchyColumn.isDisplayColumn ? element.cinchyColumn.linkTargetColumnName : element.cinchyColumn.name;
          // Having sep conditions just for clarity
          if (!element.cinchyColumn.isDisplayColumn && this.isChild) {
            const col = `[${element.cinchyColumn.name}].[Cinchy Id]`
            element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
          } else if (!this.isChild) {
            const col = `[${element.cinchyColumn.name}].[Cinchy Id]`
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

    if (this.isChild && (!isNullOrUndefined(columnName) || (this.childFormParentId && this.childFormLinkId))) {
      let defaultWhere;
      if (!isNullOrUndefined(columnName)) {
        defaultWhere = `where t.[${columnName}].[Cinchy Id] = ${rowId} and t.[Deleted] is null`
      } else {
        defaultWhere = `where t.${this.childFormLinkId} = @parentCinchyIdMatch and t.[Deleted] is null`
      }
      const whereConditionWithFilter = this.childFormFilter ? 
      `${defaultWhere} AND (${this.childFormFilter})` : defaultWhere;
      const whereWithOrder = this.childFormSort ? `${whereConditionWithFilter} ${this.childFormSort}` : `${whereConditionWithFilter} Order by t.[Cinchy Id]`
      let query: IQuery = new Query(
        `select ${fields.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t ${whereWithOrder}`,
        null,
        null
      );
      return query;
    } else {
      let query: IQuery = new Query(
        `select ${fields.join(",")} from [${this.targetTableDomain}].[${this.targetTableName}] t where t.[Cinchy Id] = ${rowId} and t.[Deleted] is null Order by t.[Cinchy Id]`,
        null
      );

      return query;
    }
  }


  getErrorFields() {

    return this.errorFields;
  }


  getFileNameAndItsTable(field, childCinchyId?) {

    const [domain, table, column] = field.cinchyColumn.fileNameColumn?.split(".") ?? [];
    const query = this.rowId ? `Insert into [${domain}].[${table}] ([Cinchy Id], [${field.cinchyColumn.name}]) values(@rowId, @fieldValue)` : null;

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


  isLinkedColumn(element, section) {

    return section.LinkedColumnDetails && element.cinchyColumn.name === section.LinkedColumnDetails.linkLabel;
  }


  loadRecordData(rowId: number, rowData: any): void {

    const duplicateLabelColumns = {};

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (!field.cinchyColumn.name) {
          return;
        }

        rowData.forEach((Rowelement) => {

          //TODO: Passing array value in case of multiselect
          if (field.cinchyColumn.dataType == "Choice" && field.cinchyColumn.isMultiple == true) {
            const valueArray = Rowelement[field.cinchyColumn.name]?.split(",") ?? [];

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
            field.setInitialValue(Rowelement[field.cinchyColumn.name]);
          }

          if (field.cinchyColumn.dataType === "Link") {
            let optionArray: IDropdownOption[] = [];

            if (Rowelement[field.cinchyColumn.name]) {
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

              optionArray.push(new DropdownOption(Rowelement[field.cinchyColumn.name], Rowelement[labelForColumn + properLabelForColumn]));

              let result = new DropdownDataset(optionArray);

              Rowelement[field.cinchyColumn.name] = field.value;

              if (isNullOrUndefined(field["dropdownDataset"])) {
                field["dropdownDataset"] = result;
              }
            }
          }
        });
      });
    });

    this.rowId = rowId;
  }


  loadMultiRecordData(rowId: number, rowData: any, currentRowItem?, idForParentMatch?): void {

    this.sections.forEach((section: FormSection) => {

      let linkLabel;
      let linkValue;
      let linkedElement;
      let childFormLinkIdValue;

      section.fields.forEach((field: FormField) => {

        childFormLinkIdValue = field.cinchyColumn.childFormLinkId ? field.cinchyColumn.childFormLinkId : "";
        childFormLinkIdValue = childFormLinkIdValue.replaceAll("[", "");
        childFormLinkIdValue = childFormLinkIdValue.replaceAll("]", "");

        if (field.cinchyColumn.linkedFieldId == field.id || childFormLinkIdValue === field.cinchyColumn.name) {
          if (!rowData.length && !field["dropdownDataset"]) {
            field["dropdownDataset"] = { options: currentRowItem ? [new DropdownOption(currentRowItem.id, currentRowItem.fullName)] : [] };
          }
          this.linkedColumnElement = this.linkedColumnElement ? this.linkedColumnElement : JSON.parse(JSON.stringify(field));
          linkLabel = field.label;
          linkValue = idForParentMatch;
          linkedElement = field;
          section["LinkedColumnDetails"] = { linkedElement, linkLabel, linkValue };
        }

        if (isNullOrUndefined(field["multiFields"])) {
          section["multiFields"] = [];
        }

        if (isNullOrUndefined(field.cinchyColumn.name) || field.cinchyColumn.name == "") {
          return;
        }

        rowData.forEach(Rowelement => {
          //TODO: Passing array value in case of multiselect
          if (field.cinchyColumn.dataType == "Choice" && field.cinchyColumn.isMultiple == true) {
            const valueArray = (isNullOrUndefined(Rowelement[field.cinchyColumn.name]) ?
              [] :
              Rowelement[field.cinchyColumn.name].split(","));

            let optionArray = [];

            valueArray.forEach((element: any) => {

              if (element !== "" && !isNullOrUndefined(element)) {
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
            field.setInitialValue(Rowelement[field.cinchyColumn.name]);
          }

          if (field.cinchyColumn.dataType === "Link") {
            if (!isNullOrUndefined(Rowelement[field.cinchyColumn.name]) && Rowelement[field.cinchyColumn.name] !== "") {
              let optionArray: IDropdownOption[] = [];
              const labelForColumn = field.cinchyColumn.isDisplayColumn ? field.cinchyColumn.linkTargetColumnName : field.cinchyColumn.name;

              optionArray.push(new DropdownOption(Rowelement[field.cinchyColumn.name], Rowelement[labelForColumn + " label"]));

              let result = new DropdownDataset(optionArray);

              if (isNullOrUndefined(field["dropdownDataset"])) {
                field["dropdownDataset"] = result;
              } else {
                if (!isNullOrUndefined(field["dropdownDataset"].options)) {
                  field["dropdownDataset"].options.push(result.options[0]);
                }
              }

              if (!isNullOrUndefined(field["dropdownDataset"])) {
                let dropdownResult = field["dropdownDataset"].options.find(e => e.id === Rowelement[field.cinchyColumn.name]);
                if (!isNullOrUndefined(dropdownResult)) {
                  if (!field.cinchyColumn.isDisplayColumn) {
                    Rowelement[field.cinchyColumn.name] = dropdownResult["label"];
                  }
                }

              }
            }

            if (!field.cinchyColumn.isDisplayColumn) {
              delete Rowelement[field.cinchyColumn.name + " label"];
            }
          }
        });
      });

      section["multiFields"] = rowData;
    });

    this.rowId = rowId;
  }


  populateSectionsFromFormMetadata(metadata: Array<IFormSectionMetadata>): void {

    this._sections = metadata.map(_ => {

      let result = new FormSection(_.id, _.name);

      result.columnsInRow = _.columnsInRow;
      result.autoExpand = _.autoExpand;

      return result;
    });
  }


  updateFieldValue(sectionIndex: number, fieldIndex: number, newValue: any): void {

    if (this.sections?.length > sectionIndex && this.sections[sectionIndex].fields?.length < fieldIndex) {
      this.sections[sectionIndex].fields[fieldIndex].value = newValue;
      this.sections[sectionIndex].fields[fieldIndex].cinchyColumn.hasChanged = true;
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
