import { IFormSection } from './cinchy-form-sections.model';
import { IQuery, Query } from './cinchy-query.model';
import { isNullOrUndefined } from 'util';
import { DropdownDataset } from '../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset';
import { IDropdownOption, DropdownOption } from '../service/cinchy-dropdown-dataset/cinchy-dropdown-options';
import * as R from 'ramda';


export interface IForm {
  id: number | string;
  name: string;
  targetTableId: number;
  targetTableDomain: string;
  targetTableName: string;
  sections: Array<IFormSection>;
  rowId: number;
  hasAccess: boolean;
  isAccordion: boolean;
  isChild: boolean;
  childFormParentId?: string;
  childFormLinkId?: string;
  flatten: boolean;
  childFormFilter?: string;
  childFormSort?: string;

  generateSelectQuery(rowId: number | string, parentTableId: number): IQuery;

  loadRecordData(rowId: number | string, rowData: Array<any>): void;

  loadMultiRecordData(rowId: number | string, rowData: any, currentRowItem?, idForParentMatch?): void

  generateSaveQuery(rowID: number | string): IQuery;

  generateDeleteQuery(): IQuery;

  checkFormValidation(): any;

  checkChildFormValidation(): any;

  generateSaveForChildQuery(rowID: number | string, sourceID: number): IQuery

  getErrorFields(): Array<any>
}

export class Form implements IForm {
  rowId = null;
  sections: Array<IFormSection> = [];
  linkedColumnElement;
  errorFields = [];
  private _dropdownDatasets: { [key: number]: DropdownDataset } = {};

  constructor(
    public id: number | string,
    public name: string,
    public targetTableId: number,
    public targetTableDomain: string,
    public targetTableName: string,
    public isAccordion: boolean,
    public hasAccess: boolean,
    public isChild: boolean = false,
    public flatten: boolean = false,
    public childFormParentId?: string,
    public childFormLinkId?: string,
    public childFormFilter?: string,
    public childFormSort?: string
  ) { }

  generateSelectQuery(rowId: number | string, parentTableId: number = 0): IQuery {
    let columnName = null;
    let fields: Array<string> = [];
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        //TODO: GET The values Dynamically
        if (parentTableId === element.cinchyColumn.LinkTargetTableId) {
          columnName = element.cinchyColumn.name;
        }

        if (isNullOrUndefined(element.cinchyColumn.name) || element.cinchyColumn.name == '') {
          return;
        }
        if (element.cinchyColumn.dataType === 'Link') {
          //Todo: CHanges for Short Name
          const splitLinkTargetColumnNames = element.cinchyColumn.linkTargetColumnName ? element.cinchyColumn.linkTargetColumnName.split('.') : [];
          const targetColumnForQuery = (splitLinkTargetColumnNames.map(name => `[${name}]`)).join('.');
          const labelForColumn = element.cinchyColumn.IsDisplayColumn ? element.cinchyColumn.linkTargetColumnName : element.cinchyColumn.name;
          // Having sep conditions just for clarity
          if (!element.cinchyColumn.IsDisplayColumn && this.isChild) {
            // CASE WHEN CHANGE([column])=1 THEN DRAFT([column]) ELSE [column] END as 'column'
            //  fields.push('[' + element.cinchyColumn.name + '].[Cinchy Id] as \'' + element.cinchyColumn.name + '\'');
            const col = `[${element.cinchyColumn.name}].[Cinchy Id]`
            element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
          } else if (!this.isChild) {
            const col = `[${element.cinchyColumn.name}].[Cinchy Id]`
            // fields.push('[' + element.cinchyColumn.name + '].[Cinchy Id] as \'' + element.cinchyColumn.name + '\'');
            element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
          }
          const col = `[${element.cinchyColumn.name}].${targetColumnForQuery}`
          // fields.push('[' + element.cinchyColumn.name + '].' + targetColumnForQuery + ' as \'' + labelForColumn + ' label\'');
          element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${labelForColumn} label'`);
        }
        // else  if (element.cinchyColumn.dataType === 'Binary') {
        //   //Todo: CHanges for Short Name
        //   fields.push('Convert(varchar(max),[' + element.cinchyColumn.name + '])');
        // }
        else {
          //Todo: Changes for Short Name
          const col = `[${element.cinchyColumn.name}]`
          // fields.push('[' + element.cinchyColumn.name + ']');
          element.cinchyColumn.canView && fields.push(`CASE WHEN CHANGE([${element.cinchyColumn.name}])=1 THEN DRAFT(${col}) ELSE ${col} END as '${element.cinchyColumn.name}'`);
        }
        fields = R.uniq(fields);
      });
    });
    fields.push('[Cinchy ID]');

    if (this.isChild && (!isNullOrUndefined(columnName) || (this.childFormParentId && this.childFormLinkId))) {
      let defaultWhere;
      if (!isNullOrUndefined(columnName)) {
        defaultWhere = 'where t.[' + columnName + '].[Cinchy Id] = ' + rowId + ' and t.[Deleted] is null'
      } else {
        defaultWhere = 'where t.' + this.childFormLinkId + ' = @parentCinchyIdMatch and t.[Deleted] is null'
      }
      const whereConditionWithFilter = this.childFormFilter ? 
      `${defaultWhere} AND (${this.childFormFilter})` : defaultWhere;
      const whereWithOrder = this.childFormSort ? `${whereConditionWithFilter} ${this.childFormSort}` : `${whereConditionWithFilter} Order by t.[Cinchy Id]`
      let query: IQuery = new Query('select ' + fields.join(',') + ' from [' + this.targetTableDomain + '].[' + this.targetTableName + '] t ' + whereWithOrder,
        null, null);
      return query;
    } else {
      let query: IQuery = new Query('select ' + fields.join(',') + ' from [' + this.targetTableDomain + '].[' + this.targetTableName + '] t where t.[Cinchy Id] = ' + rowId + ' and t.[Deleted] is null Order by t.[Cinchy Id]', null);
      //  console.log(JSON.stringify(query));
      return query;
    }

  }

  loadRecordData(rowId: number | string, rowData: any): void {
    const duplicateLabelColumns = {};
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        if (isNullOrUndefined(element.cinchyColumn.name) || element.cinchyColumn.name == '') {
          return;
        }
        rowData.forEach(Rowelement => {
          //Todo: Passing array value in case of multiselect
          if (element.cinchyColumn.dataType == 'Choice' && element.cinchyColumn.isMultiple == true) {
            const valueArray = (isNullOrUndefined(Rowelement[element.cinchyColumn.name]) ?
              [] : Rowelement[element.cinchyColumn.name].split(','));
            let optionArray = [];
            // tslint:disable-next-line:no-shadowed-variable
            valueArray.forEach((element: any) => {
              if (element !== '' && !isNullOrUndefined(element)) {
                const value = element.trim();
                const objValues = {
                  id: value,
                  itemName: value
                };
                optionArray.push(objValues);

              }
            });
            element.setInitialValue(optionArray);
          } else {
            element.setInitialValue(Rowelement[element.cinchyColumn.name]);
          }

          if (element.cinchyColumn.dataType === 'Link') {
            //console.log('(element.cinchyColumn.dataType === \'Link\'', result);
            let optionArray: IDropdownOption[] = [];
            if (!isNullOrUndefined(Rowelement[element.cinchyColumn.name]) && Rowelement[element.cinchyColumn.name] !== '') {
              const labelForColumn = element.cinchyColumn.IsDisplayColumn ? element.cinchyColumn.linkTargetColumnName : element.cinchyColumn.name;
              let properLabelForColumn = ' label';
              if (element.cinchyColumn.IsDisplayColumn) {
                if (duplicateLabelColumns[labelForColumn] || duplicateLabelColumns[labelForColumn] === 0) {
                  duplicateLabelColumns[labelForColumn] = duplicateLabelColumns[labelForColumn] + 1;
                  properLabelForColumn = `${properLabelForColumn}${duplicateLabelColumns[labelForColumn]}`;
                } else {
                  duplicateLabelColumns[labelForColumn] = 0;
                }
              }
              optionArray.push(new DropdownOption(Rowelement[element.cinchyColumn.name], Rowelement[labelForColumn + properLabelForColumn]));
              let result = new DropdownDataset(optionArray);
              Rowelement[element.cinchyColumn.name] = element.value;
              if (isNullOrUndefined(element['dropdownDataset'])) {
                element['dropdownDataset'] = result;
              }
            }
          }
        });

      });
    });
    this.rowId = rowId;
  }

  loadMultiRecordData(rowId: number | string, rowData: any, currentRowItem?, idForParentMatch?): void {
    this.sections.forEach(section => {
      let linkLabel;
      let linkValue;
      let linkedElement;
      let childFormLinkIdValue;
      section.fields.forEach(element => {
        childFormLinkIdValue = element.cinchyColumn.childFormLinkId ? element.cinchyColumn.childFormLinkId : '';
        childFormLinkIdValue = childFormLinkIdValue.replaceAll('[', '');
        childFormLinkIdValue = childFormLinkIdValue.replaceAll(']', '');
        if (element.cinchyColumn.linkedFieldId == element.id || childFormLinkIdValue === element.cinchyColumn.name) {
          if (!rowData.length && !element['dropdownDataset']) {
            element['dropdownDataset'] = { options: currentRowItem ? [new DropdownOption(currentRowItem.id, currentRowItem.fullName)] : [] };
          }
          this.linkedColumnElement = this.linkedColumnElement ? this.linkedColumnElement : JSON.parse(JSON.stringify(element));
          linkLabel = element.label;
          linkValue = idForParentMatch;
          linkedElement = element;
          section['LinkedColumnDetails'] = { linkedElement, linkLabel, linkValue };
        }
        if (isNullOrUndefined(element['MultiFields'])) {
          section['MultiFields'] = [];
          //  section['MultiFields'] = rowData;
        }
        if (isNullOrUndefined(element.cinchyColumn.name) || element.cinchyColumn.name == '') {
          return;
        }

        rowData.forEach(Rowelement => {
          //Todo: Passing array value in case of multiselect
          if (element.cinchyColumn.dataType == 'Choice' && element.cinchyColumn.isMultiple == true) {
            const valueArray = (isNullOrUndefined(Rowelement[element.cinchyColumn.name]) ?
              [] : Rowelement[element.cinchyColumn.name].split(','));
            let optionArray = [];
            // tslint:disable-next-line:no-shadowed-variable
            valueArray.forEach((element: any) => {
              if (element !== '' && !isNullOrUndefined(element)) {
                const value = element.trim();
                const objValues = {
                  id: value,
                  itemName: value
                };
                optionArray.push(objValues);

              }
            });
            element.setInitialValue(optionArray);
          } else {
            element.setInitialValue(Rowelement[element.cinchyColumn.name]);
          }
          if (element.cinchyColumn.dataType === 'Link') {
            if (!isNullOrUndefined(Rowelement[element.cinchyColumn.name]) && Rowelement[element.cinchyColumn.name] !== '') {
              let optionArray: IDropdownOption[] = [];
              const labelForColumn = element.cinchyColumn.IsDisplayColumn ? element.cinchyColumn.linkTargetColumnName : element.cinchyColumn.name;

              optionArray.push(new DropdownOption(Rowelement[element.cinchyColumn.name], Rowelement[labelForColumn + ' label']));
              let result = new DropdownDataset(optionArray);
              //  Rowelement[element.cinchyColumn.name] = element.value;
              if (isNullOrUndefined(element['dropdownDataset'])) {
                element['dropdownDataset'] = result;
              } else {
                if (!isNullOrUndefined(element['dropdownDataset'].options)) {
                  element['dropdownDataset'].options.push(result.options[0]);
                }
              }
              if (!isNullOrUndefined(element['dropdownDataset'])) {
                let dropdownResult = element['dropdownDataset'].options.find(e => e.id ===
                  Rowelement[element.cinchyColumn.name]);
                if (!isNullOrUndefined(dropdownResult)) {
                  if (!element.cinchyColumn.IsDisplayColumn) {
                    Rowelement[element.cinchyColumn.name] = dropdownResult['label'];
                  }
                }

              }
            }
            if (!element.cinchyColumn.IsDisplayColumn) {
              delete Rowelement[element.cinchyColumn.name + ' label'];
            }
          }

        });
        //   section['MultiFields'].push(rowData);cyy

      });
      section['MultiFields'] = rowData;
    });
    this.rowId = rowId;
  }

  generateSaveQuery(rowID, isCloneData?): IQuery {
    let i: number = 0;
    let params = {};
    let query: IQuery = null;
    let assignmentColumns: string[] = [];
    let assignmentValues: string[] = [];
    let attachedFilesInfo = [];
    this.rowId = rowID;
    let paramName: string;
    let tableAliasInQuery = isNullOrUndefined(this.rowId) ? '' : ''; // use an alias if this is an update to support ResolveLink
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        //  debugger;
        if (isNullOrUndefined(element.value) && (element.cinchyColumn.dataType === 'Link' || element.cinchyColumn.dataType === 'Yes/No'
        )) {
          //todo: check for link type
        } else {
          if (element.cinchyColumn.name != null && element.cinchyColumn.dataType != 'Calculated' && element.cinchyColumn.canEdit
          && (element.cinchyColumn.hasChanged || isCloneData) && !element.cinchyColumn.isViewOnly && !element.childForm) {
            paramName = '@p' + i.toString();
            switch (element.cinchyColumn.dataType) {
              case "Date and Time":
                let elementValue = isNullOrUndefined(element.value) ? null :
                  element.value instanceof Date ? element.value.toLocaleDateString() : element.value;
                if (elementValue) {
                  params[paramName] = elementValue ? elementValue : '';
                }
                if (!paramName) {
                  paramName = element.value instanceof Date ? paramName : `NULLIF(${paramName},'')`;
                }
                break;
              case "Number":
                let elementValueNumber = isNullOrUndefined(element.value) ? '' : element.value;
                params[paramName] = elementValueNumber;
                break;
              //TODO: Currently For only Choice of MultiSelect (OLD now)
              case "Choice":
                let choiceElementValue;
                if (element.cinchyColumn.isMultiple) {
                  const arrayElement = element.value ? element.value : [];
                  /* element.value && element.value.length && element.value.forEach(element => {
                     if (element.id !== "" && !isNullOrUndefined(element.id)) {
                       arrayElement.push(element.id.trim());
                     }

                   });*/
                  choiceElementValue = isNullOrUndefined(arrayElement) ? '' : arrayElement.join(',');
                } else {
                  choiceElementValue = element.value;
                }
                params[paramName] = choiceElementValue ? choiceElementValue.toString() : ' ';
                break;
              case "Binary":
                if ((element.value && !this.rowId) || (element.value && this.rowId == "null")) {
                  params[paramName] = (element.value) ? element.value : '';
                  if (!this.rowId || this.rowId == "null") {
                    assignmentColumns.push(tableAliasInQuery + '[' + element.cinchyColumn.name + ']');
                    assignmentValues.push('\'' + params[paramName] + '\'')
                  }
                  attachedFilesInfo.push(this.getFileNameAndItsTable(element));
                  // isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                  // assignmentValues.push(paramName);
                } else if (this.rowId && this.rowId != "null") {
                  attachedFilesInfo.push(this.getFileNameAndItsTable(element));
                }

                break;
              case "Link":
                let stringLink = '';
                if (element.value instanceof Array) {
                  let stringLinkArray = [];
                  element.value.forEach(itemElement => {
                    //stringLink = element + ',0';
                    const itemToCheck = itemElement.toString ? itemElement.toString() : itemElement;
                    if (!(stringLinkArray.indexOf(itemToCheck) > -1)) {
                      stringLinkArray.push(itemToCheck);
                      stringLinkArray.push(0);
                    }
                  });
                  const joinedValue = stringLinkArray.join(',');
                  params[paramName] = joinedValue ? joinedValue.toString() : joinedValue;
                } else if (element.cinchyColumn.isMultiple) {
                  const allValues = element.value.split(',');
                  let stringLinkArray = [];
                  allValues.forEach(itemVal => {
                    //stringLink = element + ',0';
                    stringLinkArray.push(itemVal.trim ? itemVal.trim() : itemVal);
                    stringLinkArray.push(0);
                  });
                  const joinedValue = stringLinkArray.join(',');
                  params[paramName] = joinedValue ? joinedValue.toString() : joinedValue;
                } else {
                  if (element.value === 'DELETE') {
                    params[paramName] = '';
                  } else {
                    params[paramName] = element.value ? element.value.toString() : element.value;
                  }
                }
                break;
              case "Yes/No":
                params[paramName] = element.value;
                break;
              default:
                params[paramName] = element.value ? element.value : ``;
            }
            //TOdo: Return Insert Data when binary
            if (element.cinchyColumn.dataType !== 'Binary') {
              assignmentColumns.push(tableAliasInQuery + '[' + element.cinchyColumn.name + ']');
            }
            if (isNullOrUndefined(element.cinchyColumn.linkTargetColumnName) && element.cinchyColumn.dataType !== 'Binary') {
              //ToDO: for insert data ... because insert is giving error with parameters
              if ((element.cinchyColumn.dataType === 'Text') && !element.value) {
                // Because empty values for text input is throwing error
                isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                  assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
              } else {
                isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                  assignmentValues.push(paramName);
              }
            } else if (element.cinchyColumn.dataType !== 'Binary') {
              //TODO: code for the multi select Link
              if (element.value instanceof Array) {
                let stringLinkArray = [];
                element.value.forEach(itemElement => {
                  //stringLink = element + ',0';
                  // Getting duplicate keys with both string and number
                  const itemToCheck = itemElement.toString ? itemElement.toString() : itemElement;
                  if (!(stringLinkArray.indexOf(itemToCheck) > -1)) {
                    stringLinkArray.push(itemToCheck);
                    stringLinkArray.push(0);
                  }
                });
                const joinedValue = stringLinkArray.join(',');
                let stringifyValue = joinedValue ? joinedValue.toString() : joinedValue;
                //ToDO: for insert data ... because insert is giving error with parameters
                if ((element.cinchyColumn.dataType === 'Link') && (!element.value || (element.value && !element.value.length))) {
                  // Because empty values for multi input is throwing error
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) :
                    assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                } else {
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) : assignmentValues.push(paramName);
                }
              } else if (element.cinchyColumn.isMultiple) {
                const allValues = element.value.split(',');
                let stringLinkArray = [];
                allValues.forEach(itemVal => {
                  //stringLink = element + ',0';
                  stringLinkArray.push(itemVal.trim ? itemVal.trim() : itemVal);
                  stringLinkArray.push(0);
                });
                const joinedValue = stringLinkArray.join(',');
                isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${joinedValue}'`) : assignmentValues.push(paramName);
              } else {
                //ToDO: for insert data ... because insert is giving error with parameters
                if (element.cinchyColumn.dataType == "Link") {
                  isNullOrUndefined(this.rowId) ?
                    assignmentValues.push("ResolveLink(" + params[paramName] + ",'" + "Cinchy Id" + "')")
                    :
                    assignmentValues.push("ResolveLink(" + paramName + ",'" + "Cinchy Id" + "')");
                } else {
                  if (isNullOrUndefined(element.childForm)) {
                    assignmentValues.push(paramName);
                  }
                }
              }
            }
            i++;
          }
        }
      });
    });

    //query = new Query('insert into [' + this.targetTableDomain + '].[' + this.targetTableName + '] (' + assignmentColumns.join(',') + ') values (' + assignmentValues.join(',') + ') select 1', null);
    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);
    if (assignmentValues && assignmentValues.length) {
      if (!rowID || rowID == "null") {
        //Todo: Change in insert query.
        query = new Query('insert into [' + this.targetTableDomain + '].[' + this.targetTableName + '] (' + assignmentColumns.join(',') + ') values (' + assignmentValues.join(',') + ') SELECT @cinchy_row_id', params, attachedFilesInfo);
      } else {
        let assignmentSetClauses: string[] = [];
        for (let j = 0; j < assignmentColumns.length; j++) {
          assignmentSetClauses.push(assignmentColumns[j] + ' = ' + assignmentValues[j]);
        }
        query = new Query('update t set ' + assignmentSetClauses.join(',') + ' from [' + this.targetTableDomain + '].[' + this.targetTableName + '] t where t.[Cinchy Id] = ' + this.rowId + ' and t.[Deleted] is null SELECT ' + this.rowId + '', params, attachedFilesInfo);
      }
      return query;
    } else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    } else {
      return null;
    }
  }

  generateSaveForChildQuery(rowID, sourceID): IQuery {
    let i: number = 0;
    let params = {};
    let query: IQuery = null;
    let assignmentColumns: string[] = [];
    let assignmentValues: string[] = [];
    //for insert values
    this.rowId = rowID;
    let paramName: string;
    let attachedFilesInfo = [];
    let tableAliasInQuery = isNullOrUndefined(this.rowId) ? '' : ''; // use an alias if this is an update to support ResolveLink
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        if (isNullOrUndefined(element.value) && (!isNullOrUndefined(element.cinchyColumn.linkTargetColumnName))) {
          console.log('Link type cannot be null');
        } else {
          const isLinkedColumnForInsert = this.isLinkedColumn(element, section) && !rowID;
          if (element.cinchyColumn.name != null && element.cinchyColumn.dataType != 'Calculated' && element.cinchyColumn.canEdit
            && !element.cinchyColumn.isViewOnly && (element.cinchyColumn.hasChanged || isLinkedColumnForInsert)) {
            if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === 'string')) ||
              (element.cinchyColumn.dataType === "Choice" && element.value)
              || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
              paramName = '@p' + i.toString();
            }
            switch (element.cinchyColumn.dataType) {
              case "Date and Time":
                let date: Date;
                if (typeof element.value === 'string') {
                  try {
                    date = new Date(element.value);
                  } catch { }
                } else if (element.value instanceof Date) {
                  date = element.value;
                }

                let elementValue = isNullOrUndefined(date) ? null : date instanceof Date ? date.toLocaleDateString() : null;
                if (elementValue) {
                  params[paramName] = elementValue ? elementValue : '';
                }
                paramName = date instanceof Date ? paramName : `NULLIF(${paramName},'')`;
                break;
              case "Number":
                let elementValueNumber = isNullOrUndefined(element.value) ? '' : element.value;
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
                    choiceElementValue = isNullOrUndefined(arrayElement) ? '' : arrayElement.join(',');
                  } else {
                    choiceElementValue = element.value;
                  }
                  params[paramName] = choiceElementValue;
                }
                break;
              case "Binary":
                if ((element.value && !this.rowId) || (element.value && this.rowId == "null")) {
                  params[paramName] = (element.value) ? element.value : '';
                  if (!this.rowId || this.rowId == "null") {
                    assignmentColumns.push(tableAliasInQuery + '[' + element.cinchyColumn.name + ']');
                    assignmentValues.push('\'' + params[paramName] + '\'')
                  }
                  attachedFilesInfo.push(this.getFileNameAndItsTable(element));
                  // isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                  // assignmentValues.push(paramName);
                } else if (this.rowId && this.rowId != "null") {
                  attachedFilesInfo.push(this.getFileNameAndItsTable(element, this.rowId));
                }
                break;
              case "Link":
                let stringLink = '';
                if (element.value instanceof Array) {
                  let stringLinkArray = [];
                  element.value.forEach(itemElement => {
                    //stringLink = element + ',0';
                    const itemToCheck = itemElement.toString ? itemElement.toString() : itemElement;
                    if (!(stringLinkArray.indexOf(itemToCheck) > -1)) {
                      stringLinkArray.push(itemToCheck);
                      stringLinkArray.push(0);
                    }
                  });
                  const joinedValue = stringLinkArray.join(',');
                  params[paramName] = joinedValue ? joinedValue.toString() : joinedValue;
                } else if (element.cinchyColumn.isMultiple) {
                  const allValues = element.value.split(',');
                  let stringLinkArray = [];
                  allValues.forEach(itemVal => {
                    //stringLink = element + ',0';
                    stringLinkArray.push(itemVal.trim ? itemVal.trim() : itemVal);
                    stringLinkArray.push(0);
                  });
                  const joinedValue = stringLinkArray.join(',');
                  params[paramName] = joinedValue ? joinedValue.toString() : joinedValue;
                } else {
                  if (element.value === 'DELETE') {
                    params[paramName] = '';
                  } else {
                    params[paramName] = element.value ? element.value.toString() : element.value;
                  }
                }
                break;
              default:
                params[paramName] = isNullOrUndefined(element.value) ? '' : element.value;
            }
            //TOdo: Return Insert Data when binary
            if (element.cinchyColumn.dataType !== 'Binary') {
              if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === 'string')) ||
                (element.cinchyColumn.dataType === "Choice" && element.value)
                || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
                assignmentColumns.push(tableAliasInQuery + '[' + element.cinchyColumn.name + ']');
              }
            }
            if (isNullOrUndefined(element.cinchyColumn.linkTargetColumnName) &&
              element.cinchyColumn.dataType !== 'Binary') {
              //ToDO: for insert data ... because insert is giving error with parameters
              if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === 'string')) ||
                (element.cinchyColumn.dataType === "Choice" && element.value)
                || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
                if (element.cinchyColumn.dataType === 'Text' && !element.value) {
                  // Because empty values for text input is throwing error
                  isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                    assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                } else {
                  isNullOrUndefined(this.rowId) ? assignmentValues.push('\'' + params[paramName] + '\'') :
                    assignmentValues.push(paramName);
                }
              }
            } else if (element.cinchyColumn.dataType !== 'Binary') {
              //TODO: code for the multi select Link
              if (element.value instanceof Array) {
                let stringLinkArray = [];
                element.value.forEach(itemElement => {
                  // Getting duplicate keys with both string and number
                  const itemToCheck = itemElement.toString ? itemElement.toString() : itemElement;
                  if (!(stringLinkArray.indexOf(itemToCheck) > -1)) {
                    stringLinkArray.push(itemToCheck);
                    stringLinkArray.push(0);
                  }
                });
                const joinedValue = stringLinkArray.join(',');
                let stringifyValue = joinedValue ? joinedValue.toString() : joinedValue;
                //ToDO: for insert data ... because insert is giving error with parameters
                if ((element.cinchyColumn.dataType === 'Link') && (!element.value || (element.value && !element.value.length))) {
                  // Because empty values for multi input is throwing error
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) :
                    assignmentValues.push(`cast(${paramName} as nvarchar(100))`);
                } else {
                  isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${stringifyValue}'`) : assignmentValues.push(paramName);
                }
              } else if (element.cinchyColumn.isMultiple) {
                const allValues = element.value.split(',');
                let stringLinkArray = [];
                allValues.forEach(itemVal => {
                  //stringLink = element + ',0';
                  stringLinkArray.push(itemVal.trim ? itemVal.trim() : itemVal);
                  stringLinkArray.push(0);
                });
                const joinedValue = stringLinkArray.join(',');
                isNullOrUndefined(this.rowId) ? assignmentValues.push(`'${joinedValue}'`) : assignmentValues.push(paramName);
              } else {
                //ToDO: for insert data ... because insert is giving error with parameters
                if (element.cinchyColumn.dataType == "Link") {
                  isNullOrUndefined(this.rowId) ?
                    assignmentValues.push("ResolveLink(" + params[paramName] + ",'" + "Cinchy Id" + "')")
                    :
                    assignmentValues.push("ResolveLink(" + paramName + ",'" + "Cinchy Id" + "')");
                } else {
                  if (isNullOrUndefined(element.childForm)) {
                    if ((element.cinchyColumn.dataType === "Date and Time" && (element.value instanceof Date || typeof element.value === 'string')) ||
                      (element.cinchyColumn.dataType === "Choice" && element.value)
                      || (element.cinchyColumn.dataType !== "Choice" && element.cinchyColumn.dataType !== "Date and Time")) {
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

    //query = new Query('insert into [' + this.targetTableDomain + '].[' + this.targetTableName + '] (' + assignmentColumns.join(',') + ') values (' + assignmentValues.join(',') + ') select 1', null);
    const ifUpdateAttachedFilePresent = attachedFilesInfo.find(fileInfo => fileInfo.query);
    if (assignmentValues && assignmentValues.length) {
      if (isNullOrUndefined(rowID)) {
        //Todo: Change in insert query.
        query = new Query('insert into [' + this.targetTableDomain + '].[' + this.targetTableName + '] (' + assignmentColumns.join(',') + ') values (' + assignmentValues.join(',') + ')', params, attachedFilesInfo);
      } else {
        let assignmentSetClauses: string[] = [];
        for (let j = 0; j < assignmentColumns.length; j++) {
          assignmentSetClauses.push(assignmentColumns[j] + ' = ' + assignmentValues[j]);
        }
        query = new Query('update t set ' + assignmentSetClauses.join(',') + ' from [' + this.targetTableDomain + '].[' + this.targetTableName + '] t where t.[Cinchy Id] = ' + this.rowId + ' and t.[Deleted] is null', params, attachedFilesInfo);
      }
      return query;
    } else if (ifUpdateAttachedFilePresent) {
      return new Query(null, null, attachedFilesInfo);
    } else {
      return null;
    }
  }

  generateDeleteQuery(): IQuery {
    let query: IQuery = new Query('delete from [' + this.targetTableDomain + '].[' + this.targetTableName + '] where [Cinchy Id] = ' + this.rowId + ' and [Deleted] is null', null);
    return query;
  }

  // Check For the Required Field Before Save Data
  checkFormValidation() {
    let message = '';
    let validationResult = {
      status: true,
      message: ''
    };
    this.errorFields = [];
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        if (element.cinchyColumn.isMandatory === true && (isNullOrUndefined(element.value) || element.value === "")) {
          validationResult.status = false;
          this.errorFields.push(element.label);
        }

        if (element.cinchyColumn.validationExpression !== '' && !isNullOrUndefined(element.cinchyColumn.validationExpression)) {
          var exp = element.cinchyColumn.validationExpression;
          const regex = new RegExp(exp);
          if (!isNullOrUndefined(element.value) && element.value !== '') {
            element.value = element.value.trim();
          }
          if (!regex.test(element.value)) {
            validationResult.status = false;
            validationResult.message = `No special characters are allowed in ${element.cinchyColumn.name}`
          }
        }
      });
    });
    const isOrAre = this.errorFields && this.errorFields.length > 1 ? 'are' : 'is';
    validationResult.message = this.errorFields && this.errorFields.length ? `Field(s):  ${this.errorFields.join(' and ')} ${isOrAre} required`
      : validationResult.message;
    return validationResult;
  }

  checkChildFormValidation() {
    let message = '';
    let validationResult = {
      status: true,
      message: ''
    };
    this.sections.forEach(section => {
      section.fields.forEach(element => {
        if (element.cinchyColumn.isMandatory === true && (isNullOrUndefined(element.value) || element.value === "")) {
          validationResult.status = false;
          validationResult.message = `Field ${element.cinchyColumn.name} is required`;
        }

        if (element.cinchyColumn.validationExpression !== '' && !isNullOrUndefined(element.cinchyColumn.validationExpression)) {
          var exp = element.cinchyColumn.validationExpression;
          const regex = new RegExp(exp);
          if (!isNullOrUndefined(element.value) && element.value !== '') {
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

  getErrorFields() {
    return this.errorFields;
  }

  getFileNameAndItsTable(field, childCinchyId?) {
    const [domain, table, column] = field.cinchyColumn.FileNameColumn ? field.cinchyColumn.FileNameColumn.split('.') : [];
    const query = this.rowId && this.rowId != "null" ? `Insert into [${domain}].[${table}] ([Cinchy Id], [${field.cinchyColumn.name}]) values(@rowId, @fieldValue)` : null;
    return { domain, table, column, fileName: field.cinchyColumn.FileName, query, value: field.value, childCinchyId };
  }

  isLinkedColumn(element, section) {
    return section.LinkedColumnDetails && element.cinchyColumn.name === section.LinkedColumnDetails.linkLabel;
  }
}
