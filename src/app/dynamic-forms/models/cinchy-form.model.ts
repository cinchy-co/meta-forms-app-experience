import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { FormSection } from "./cinchy-form-section.model";
import { FormField } from "./cinchy-form-field.model";
import { IQuery, Query } from "./cinchy-query.model";

import { IAdditionalProperty } from "../interface/additional-property";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { ILookupRecord } from "../../models/lookup-record.model";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";

import * as R from "ramda";


export class Form {

  childFieldsLinkedToColumnName: { [columnName: string]: FormField[] } = {};
  errorFields = [];
  fieldsByColumnName: { [columnName: string]: FormField } = {};
  linkedColumnElement;
  parentForm: Form;
  tableMetadata: Object;


  /**
   * Represents whether or not any values on this form have been updated by the user
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
    public readonly hasAccess: boolean,
    public readonly isChild: boolean = false,
    public readonly flatten: boolean = false,
    public readonly childFormParentId?: string,
    public readonly childFormLinkId?: string,
    public readonly childFormFilter?: string,
    public readonly childFormSort?: string,
    public readonly isClone?: boolean
  ) {}


  /**
   * Modifies the flattened child form records by either updating an existing entry that matches the given rowId or adding a new entry if no match is present
   */
  addOrModifyFlattenedChildRecord(sectionIndex: number, recordData: { [columnName: string]: any }): void {

    if (recordData["Cinchy ID"] && recordData["Cinchy ID"] > 0) {
      const existingRecordIndex = this._sections[sectionIndex].flattenedChildFormRecordValues.findIndex((existingRecordData: { [columnName: string]: any }) => {

        return (existingRecordData.rowId === recordData["Cinchy ID"]);
      });

      if (existingRecordIndex !== -1) {
        this._sections[sectionIndex].flattenedChildFormRecordValues.splice(existingRecordIndex, 1, [recordData]);
      }
      else {
        this._sections[sectionIndex].flattenedChildFormRecordValues.push(recordData);
      }
    }
    else {
      this._sections[sectionIndex].flattenedChildFormRecordValues.push(recordData);
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
      this.hasAccess,
      this.isChild,
      this.flatten,
      this.childFormParentId,
      this.childFormLinkId,
      this.childFormFilter,
      this.childFormSort,
      !markAsClean
    );

    clonedForm.rowId = null;
    clonedForm.sections = this.sections?.slice();

    clonedForm.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        // We want to save every field of the cloned record when the form is saved,
        // so we'll manually mark them as dirty
        clonedForm.updateAdditionalProperty(
          sectionIndex,
          fieldIndex,
          {
            propertyName: "hasChanged",
            propertyValue: true,
            cinchyColumn: true
          }
        );

        if (field.childForm) {
          clonedForm.updateAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              propertyName: "childForm",
              propertyValue: field.childForm.clone("-1", markAsClean)
            }
          );

          if (field.childForm.sections[0].flattenedChildFormRecordValues) {
            if (field.childForm.childFormLinkId && field.childForm.childFormParentId) {
              let childRecordsToClone = field.childForm.flatten ?
                [field.childForm.sections[0].flattenedChildFormRecordValues[field.childForm.sections[0].flattenedChildFormRecordValues.length - 1]] :
                field.childForm.sections[0].flattenedChildFormRecordValues;

              let startingCloneRecordIdx = field.childForm.flatten ? childRecordsToClone.length - 1 : 0;
              let numOfRecordsToClone = field.childForm.flatten ? 1 : childRecordsToClone.length;

              childRecordsToClone.forEach((childRecord: any) => {

                childRecord["Cinchy ID"] = Math.random();

                field.childForm.sections?.forEach((childSection: FormSection, childSectionIndex: number) => {

                  childSection.fields?.forEach((childField: FormField, childFieldIndex: number) => {

                    clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.updateAdditionalProperty(
                      childSectionIndex,
                      childFieldIndex,
                      {
                        propertyName: "hasChanged",
                        propertyValue: true,
                        cinchyColumn: true
                      }
                    );

                    if (childField.cinchyColumn.dataType === "Link" && childRecord[childField.cinchyColumn.name] && childField.dropdownDataset) {
                      if (childField.cinchyColumn.isMultiple) {
                        const fieldValueLabels = childRecord[childField.cinchyColumn.name].split(",").map((label: string) => {

                          return label?.trim();
                        });

                        let multiDropdownResult = childField.dropdownDataset.options?.filter(e => fieldValueLabels.indexOf(e.label) > -1);

                        // Hack for non-flattened child forms, for whatever reason, the dropdownDataset ends up being populated with the values of the child form records
                        if (!field.childForm.flatten && !multiDropdownResult?.length) {
                          let unflattenedMultiDropdownResult = childField.dropdownDataset.options.find(e => e.label === childRecord[childField.cinchyColumn.name]);

                          multiDropdownResult = unflattenedMultiDropdownResult ? [unflattenedMultiDropdownResult] : multiDropdownResult;
                        }

                        clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.updateFieldValue(
                          childSectionIndex,
                          childFieldIndex,
                          multiDropdownResult?.length ? multiDropdownResult.map(item => item.id).join(", ") : childRecord[childField.cinchyColumn.name]
                        );
                      }
                      else {
                        const linkedRecord = childField.dropdownDataset?.options.find((option: DropdownOption) => {

                          return (option.label === childRecord[childField.cinchyColumn.name]);
                        });

                        clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.updateFieldValue(
                          childSectionIndex,
                          childFieldIndex,
                          linkedRecord?.id || childRecord[childField.cinchyColumn.name]
                        );
                      }
                    }
                    else if (childField.cinchyColumn.dataType === "Choice" && childField.cinchyColumn.isMultiple && childRecord[childField.cinchyColumn.name]) {
                      let fieldValueLabels: Array<string>;

                      if (typeof childRecord[childField.cinchyColumn.name] === "string") {
                        fieldValueLabels = childRecord[childField.cinchyColumn.name].split(",").map((label: string) => {

                          return label?.trim();
                        });
                      }
                      else {
                        fieldValueLabels = childRecord[childField.cinchyColumn.name];
                      }

                      clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.updateFieldValue(
                        childSectionIndex,
                        childFieldIndex,
                        fieldValueLabels?.length ? fieldValueLabels : childRecord[childField.cinchyColumn.name]
                      );
                    }
                    else {
                      clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.updateFieldValue(
                        childSectionIndex,
                        childFieldIndex,
                        childRecord[childField.cinchyColumn.name] ?? null
                      );
                    }
                  });
                });
              });

              clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.sections[0].flattenedChildFormRecordValues.splice(startingCloneRecordIdx, numOfRecordsToClone);
            }
          }
          else {
            clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.sections[0].flattenedChildFormRecordValues.splice(0, clonedForm.sections[sectionIndex].fields[fieldIndex].childForm.sections[0].flattenedChildFormRecordValues.length);
          }
        }
      });
    });

    return clonedForm;
  }


  /**
   * Reutrns a copy of this form with all of the sections merged into a single section
   */
  flattenForm(overrideSectionId?: number, overrideSectionLabel?: string): Form {

    const newSection = new FormSection(
      overrideSectionId ?? this.sections[0]?.id ?? -1,
      overrideSectionLabel ?? this.sections[0]?.label ?? `Fields for ${this.name || "this form"}`,
      this.isAccordion ? false : this.sections[0].autoExpand
    );

    this._sections?.forEach((section: FormSection) => {

      section.fields?.forEach((field: FormField) => {

        newSection.fields.push(
          new FormField(
            field.id,
            field.label,
            field.caption,
            field.childForm,
            field.cinchyColumn,
            field.form,
            field.dropdownDataset,
            field.noPreselect
          )
        );
      });
    });

    const outputForm = new Form(
      this.id,
      this.name,
      this.targetTableId,
      this.targetTableDomain,
      this.targetTableName,
      this.isAccordion,
      this.hasAccess,
      this.isChild,
      true,
      this.childFormParentId,
      this.childFormLinkId,
      this.childFormFilter,
      this.childFormSort,
      this.isClone
    );

    outputForm.sections = [newSection];

    outputForm.restoreFormReferenceOnAllFields();

    return outputForm;
  }


  generateDeleteQuery(): IQuery {

    let query: IQuery = new Query(
      `DELETE
        FROM [${this.targetTableDomain}].[${this.targetTableName}]
        WHERE [Cinchy Id] = ${this.rowId}
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
                  assignmentValues.push(`ResolveLink(${isNullOrUndefined(this.rowId) ? params[paramName] : paramName},'Cinchy Id')`);
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
            INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")})
              VALUES (${assignmentValues.join(",")})
              SELECT @cinchy_row_id`;
        }
        else {
          queryString = `
            CREATE TABLE #tmp([id] int) 
              INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")})
              OUTPUT INSERTED.[Cinchy Id] INTO #tmp ([id])
              VALUES (${assignmentValues.join(",")})
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
            SET ${assignmentSetClauses.join(",")}
            FROM [${this.targetTableDomain}].[${this.targetTableName}] t
            WHERE t.[Cinchy Id] = ${this.rowId}
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

    let paramName: string;
    let paramNumber: number = 0;
    let params: { [key: string]: any } = {};

    this.rowId = rowId;

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (isNullOrUndefined(field.value) && field.cinchyColumn.linkTargetColumnName) {
          throw new Error("Link type cannot be null");
        }

        const isLinkedColumnForInsert = !this.rowId && this.isLinkedColumn(field, section);

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
                params[paramName] = ((field.value instanceof Date) ? field.value : new Date(field.value))?.toLocaleString();
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
                  if (isNullOrUndefined(this.rowId)) {
                    if (field.form.isChild && field.form.flatten && field.form.childFormParentId) {
                      let childFormAssignmentValue = `ResolveLink(${params[paramName]},'Cinchy Id')`;

                      const columnMetadata = field.form.tableMetadata["Columns"]?.find((column: { columnId: number }) => {

                        return (column.columnId === field.cinchyColumn.id);
                      });

                      if (columnMetadata?.primaryLinkedColumnId) {
                        const primaryLinkedColumn = field.form.parentForm.tableMetadata["Columns"]?.find((column: { columnId: number }) => {

                          return (column.columnId === field.cinchyColumn.id);
                        });

                        if (primaryLinkedColumn) {
                          childFormAssignmentValue = `ResolveLink('${params[paramName]}','${primaryLinkedColumn.name}')`;
                        }
                      }

                      assignmentValues.push(childFormAssignmentValue);
                    }
                    else {
                      assignmentValues.push(`ResolveLink(${params[paramName]},'Cinchy Id')`);
                    }
                  }
                  else {
                    assignmentValues.push(`ResolveLink(${paramName},'Cinchy Id')`);
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

    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);

    if (assignmentValues?.length) {
      if (!this.rowId) {
        query = new Query(
          `INSERT INTO [${this.targetTableDomain}].[${this.targetTableName}] (${assignmentColumns.join(",")})
            VALUES (${assignmentValues.join(",")})`,
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
            SET ${assignmentSetClauses.join(",")}
            FROM [${this.targetTableDomain}].[${this.targetTableName}] t
            WHERE t.[Cinchy Id] = ${this.rowId}
              AND t.[Deleted] IS NULL`,
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


  generateSelectQuery(rowId: number, parentTableId: number = -1): IQuery {

    let columnName = null;
    let fields: Array<string> = [];

    this.sections.forEach(section => {
      section.fields.forEach(element => {
        //TODO: GET The values Dynamically
        if (parentTableId === element.cinchyColumn.linkTargetTableId) {
          columnName = element.cinchyColumn.name;
        }

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


  isLinkedColumn(field: FormField, section: FormSection): boolean {

    return coerceBooleanProperty(section.linkedColumnDetails && (field.cinchyColumn.name === section.linkedColumnDetails.linkLabel));
  }


  loadRecordData(rowId: number, rowData: any): void {

    const duplicateLabelColumns = {};

    this.sections.forEach((section: FormSection) => {

      section.fields.forEach((field: FormField) => {

        if (field.cinchyColumn.name) {
          rowData.forEach((Rowelement) => {

          //TODO: Passing array value in case of multiselect
          if (field.cinchyColumn.dataType === "Choice" && field.cinchyColumn.isMultiple === true) {
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
            let optionArray: DropdownOption[] = [];

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


  populateChildRecordData(rowId: number, rowData: any, preselectedRecord?: ILookupRecord): void {

    this.sections.forEach((section: FormSection) => {

      let childFormLinkIdValue;

      section.fields.forEach((field: FormField) => {

        childFormLinkIdValue = field.cinchyColumn.childFormLinkId ? field.cinchyColumn.childFormLinkId : "";
        childFormLinkIdValue = childFormLinkIdValue.replaceAll("[", "");
        childFormLinkIdValue = childFormLinkIdValue.replaceAll("]", "");

        if (field.cinchyColumn.linkedFieldId === field.id || childFormLinkIdValue === field.cinchyColumn.name) {
          if (!rowData.length && !field.dropdownDataset) {
            field.dropdownDataset = new DropdownDataset(preselectedRecord ? [new DropdownOption(preselectedRecord.id.toString(), preselectedRecord.label)] : []);
          }

          this.linkedColumnElement = this.linkedColumnElement ? this.linkedColumnElement : JSON.parse(JSON.stringify(field));

          section.linkedColumnDetails = {
            linkedElement: field,
            linkLabel: field.label
          };
        }

        if (isNullOrUndefined(section.flattenedChildFormRecordValues)) {
          section.flattenedChildFormRecordValues = [];
        }

        if (isNullOrUndefined(field.cinchyColumn.name) || field.cinchyColumn.name === "") {
          return;
        }

        rowData.forEach(Rowelement => {
          //TODO: Passing array value in case of multiselect
          if (field.cinchyColumn.dataType === "Choice" && field.cinchyColumn.isMultiple === true) {
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
              let optionArray: DropdownOption[] = [];
              const labelForColumn = field.cinchyColumn.isDisplayColumn ? field.cinchyColumn.linkTargetColumnName : field.cinchyColumn.name;

              optionArray.push(new DropdownOption(Rowelement[field.cinchyColumn.name], Rowelement[labelForColumn + " label"]));

              let result = new DropdownDataset(optionArray);

              if (isNullOrUndefined(field.dropdownDataset)) {
                field.dropdownDataset = result;
              } else {
                if (!isNullOrUndefined(field.dropdownDataset.options)) {
                  field.dropdownDataset.options.push(result.options[0]);
                }
              }

              if (!isNullOrUndefined(field.dropdownDataset)) {
                let dropdownResult = field.dropdownDataset.options.find(e => e.id === Rowelement[field.cinchyColumn.name]);
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

      section.flattenedChildFormRecordValues = rowData;
    });

    // TODO: determine if this is relevant or necessary
    this.rowId = rowId;
  }


  /**
   * Generates sections for this form based on the given metadata
   */
  populateSectionsFromFormMetadata(metadata: Array<IFormSectionMetadata>): void {

    this._sections = metadata.map(_ => {

      let result = new FormSection(_.id, _.name);

      result.columnsInRow = _.columnsInRow;
      result.autoExpand = _.autoExpand;

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
   * Updates a specific property of a field
   */
  updateAdditionalProperty(sectionIndex: number, fieldIndex: number, property: IAdditionalProperty): void {

    if (this.sections?.length > sectionIndex && this.sections[sectionIndex].fields?.length < fieldIndex) {
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

        this.updateAdditionalProperty(sectionIndex, fieldIndex, property);
      });
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
