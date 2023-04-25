import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation
} from "@angular/core";
import { DatePipe } from "@angular/common";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faEdit, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

import { NumeralPipe } from "ngx-numeral";

import { DataFormatType } from "../../enums/data-format-type";

import { AppStateService } from "../../../services/app-state.service";


//#region Cinchy Dynamic Child form Table
/**
 * This section is used to create the table of cinchy child form data.
 * We use keyValue pipe for creating the dynamic table from array.
 */
//#endregion
@Component({
  selector: "cinchy-childform-table",
  templateUrl: "./child-form-table.component.html",
  styleUrls: ["./child-form-table.component.scss"],
  providers: [DatePipe],
  encapsulation: ViewEncapsulation.None
})
export class ChildFormTableComponent implements OnInit, OnDestroy {
  @Input() field: any;
  @Input() rowId: any;
  @Input() hasChildTableAccess: any;
  @Output() childform = new EventEmitter<any>();
  @Output() deleteClicked = new EventEmitter<any>();
  faPlus = faPlus;
  faTrash = faTrash;
  faEdit = faEdit;
  fileNameAndValueMap = {};
  destroy$: Subject<boolean> = new Subject<boolean>();

  childFieldDictionary = {};


  constructor(private datePipe: DatePipe, private _cinchyService: CinchyService,
    private appStateService: AppStateService) {
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngOnInit() {
    this.appStateService.getOpenOfChildFormAfterParentSave().pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (this.field.childForm.name == val.title) {
        this.manageChildRecords(this.field.childForm, null, val.title, "Add", this.field.childForm);
      }
    })
    this.getFileNames();

    this.setChildFieldDictionary();
  }

  setChildFieldDictionary() {
    this.field.childForm.sections[0].fields.forEach(field => {
      this.childFieldDictionary[field.cinchyColumn.name] = field;
    });
  }


  async getFileNames() {
    const allFields = this.field.childForm.sections[0].fields;
    const binaryFields = allFields.filter(field => field.cinchyColumn.dataType === "Binary");
    const multiFields = this.field.childForm.sections[0].multiFields;
    if (multiFields && multiFields.length) {
      binaryFields.forEach(field => {
        const key = field.cinchyColumn.name;
        const fileNameColumn = field.cinchyColumn.fileNameColumn;
        multiFields.forEach(async multiField => {
          const cinchyId = multiField["Cinchy ID"];
          //const columnDetails = {domain: targetTableDomain, table: this.field.childForm.targetTableName}
          const fileName = multiField[key] ? await this.getFileName(fileNameColumn, cinchyId) : "";
          this.fileNameAndValueMap[fileName] = multiField[key];
          //  multiField[key] = fileName;
          const fileNameHeader = key + "_Name"
          multiField[fileNameHeader] = fileName;
        });
      });
    }
  }

  async getFileName(fileNameColumn, cinchyId) {
    const [domain, table, column] = fileNameColumn ? fileNameColumn.split(".") : [];
    const whereCondition = `WHERE [Cinchy Id] = ${cinchyId} AND [Deleted] IS NULL `;
    if (domain) {
      const query = `SELECT [${column}] as "fullName",
                   [Cinchy Id] as "id"
                   FROM
                   [${domain}].[${table}]
                   ${whereCondition}
               `;

      const fileNameResp = await this._cinchyService.executeCsql(query, null).toPromise();
      return fileNameResp && fileNameResp.queryResult && fileNameResp.queryResult.toObjectArray()[0] ? fileNameResp.queryResult.toObjectArray()[0]["fullName"] : null;
    }
  }

  isLinkedColumn(section, key) {
    return section["LinkedColumnDetails"] && (key == section["LinkedColumnDetails"]["linkLabel"]);
  }

  getSortedKeys(field) {
    // console.log("SORTED KEYS", Object.keys(field).sort((a: any, b: any) => a - b))
    const allFields = this.field;
    const allKeys = Object.keys(field);
    //  allKeys.sort();
    return allKeys;
  }

  deleteRow(domain, table, field, multiarray) {
    this.deleteClicked.emit({ domain, table, field, multiarray });
  }

  async manageChildRecords(childFormData: any, values: any, title: string, type: string, multiFieldValues: any) {
    if (type !== "Add") {
      //const valuesForLabels = type === "Add" ? childFormData.sections[0].multiFields[0] : values;
      const valuesForLabels = values;
      let allFields: any = this.getAllFieldsInChildForm(childFormData);
      const columnKeys = Object.keys(valuesForLabels);
      const allActualFieldsColumn = columnKeys.filter(key => {
        return allFields.find(field => field.cinchyColumn.name == key);
      })
      const domainAndTable = `[${childFormData["targetTableDomain"]}].[${childFormData["targetTableName"]}]`;
      let allSelectLabels = allActualFieldsColumn.map(columnName => columnName != "Cinchy ID" ? `editable([${columnName}]) as "entitlement-${columnName}"` : null);
      const validSelectLabels = allSelectLabels.filter(item => item);
      const cellQuery = `SELECT ${validSelectLabels.toString()} FROM ${domainAndTable} t WHERE t.[Deleted] is NULL and t.[Cinchy Id]=${valuesForLabels["Cinchy ID"]} Order by t.[Cinchy Id]`
      const cellEntitlementsResp = await this._cinchyService.executeCsql(cellQuery, null).toPromise();
      if (cellEntitlementsResp) {
        const cellEntitlements = cellEntitlementsResp.queryResult.toObjectArray()[0];
        this.updateEntitlements(cellEntitlements, childFormData, multiFieldValues);
      }
      if (valuesForLabels['Cinchy ID']) childFormData.rowId = valuesForLabels['Cinchy ID'];
    }
    let data = {
      childFormData: childFormData,
      values: values,
      title: title,
      type: type,
      multiFieldValues: multiFieldValues
    };
    this.field.cinchyColumn.hasChanged = true;
    this.childform.emit(data);
  }

  getAllFieldsInChildForm(childFormData) {
    let allFields: any = [];
    childFormData.sections.forEach(section => {
      allFields.push(section.fields);
    })
    return allFields.flat();
  }

  updateEntitlements(cellEntitlements, childFormData, multiFieldValues) {
    if (cellEntitlements) {
      const allFields = childFormData.sections[0].fields;
      allFields.forEach(field => {
        const cellColumnKey = `entitlement-${field.cinchyColumn.name}`;
        field.cinchyColumn.canEdit = cellEntitlements && cellEntitlements[cellColumnKey] === 0 ? false : field.cinchyColumn.canEdit;
      });
    }
  }

  getDisplayValue(value, section, key) {
    // let currentField = section.fields.find(field => field.label === key);
    /*    if (!currentField) {
          currentField = section.fields.find(field => {
            return field.cinchyColumn.linkTargetColumnName + " label" === key;
          });
        }
         if(this.field.childForm.name === "Customer 360 Child: Opportunities"){
            console.log("currentField", currentField, key);
         }*/
    const notDisplayColumnFields = section.fields.filter(field => !field.cinchyColumn.isDisplayColumn);
    // So that the one which is display column doesn"t match and show the name, as for display column one also
    // field.cinchyColumn.name is same
    let currentField = notDisplayColumnFields.find(field => field.cinchyColumn.name == key);
    if (!currentField) {
      currentField = section.fields.find(field => {
        return field.cinchyColumn.linkTargetColumnName + " label" === key;
      });
    }
    if (value && currentField && currentField.cinchyColumn.dataType === "Date and Time") {
      let dateFormat = currentField.cinchyColumn.displayFormat;
      dateFormat = dateFormat.replaceAll("Y", "y");
      dateFormat = dateFormat.replaceAll("D", "d");
      return this.datePipe.transform(value, dateFormat);
    } else if (typeof value === "boolean") {
      return value === true ? "Yes" : "No";
    } else if (value && currentField && currentField.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl)) {
      return `<img class="cinchy-images cinchy-images--min" src="${value}">`;
    } else if ((value || value === 0) && currentField && currentField.cinchyColumn.numberFormatter) {
      const numeralValue = new NumeralPipe(value);
      return numeralValue.format(currentField.cinchyColumn.numberFormatter);
    } else if (value && currentField && currentField.cinchyColumn.dataFormatType === "LinkUrl") {
      return `<a href="${value}" target="_blank">Open</a>`;
    }
    if (this.field.childForm.name === "Customer 360 Child: Projects") {
      //  console.log("HEADER", currentField, key);
    }
    return value;
  }

  getTableHeader(key, section) {
    // For child form all fields should be in 1 section
    const notDisplayColumnFields = section.fields.filter(field => !field.cinchyColumn.isDisplayColumn);
    // So that the one which is display column doesn"t match and show the name, as for display column one also
    // field.cinchyColumn.name is same
    let currentField = notDisplayColumnFields.find(field => field.cinchyColumn.name == key);
    if (!currentField) {
      currentField = section.fields.find(field => {
        return field.cinchyColumn.linkTargetColumnName + " label" === key;
      });
    }
    return currentField ? currentField.label : key;
  }
}
