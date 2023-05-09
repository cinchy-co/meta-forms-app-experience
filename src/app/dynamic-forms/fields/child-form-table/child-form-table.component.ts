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

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { AppStateService } from "../../../services/app-state.service";
import { FormSection } from "../../models/cinchy-form-section.model";
import { coerceBooleanProperty } from "@angular/cdk/coercion";


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

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() hasChildTableAccess: any;
  @Input() sectionIndex: number;

  @Output() childformOpened = new EventEmitter<{
    childForm: Form,
    presetValues?: { [key: string]: any },
    title: string
  }>();
  @Output() deleteClicked = new EventEmitter<any>();


  fileNameAndValueMap = {};

  childFieldDictionary = {};


  faEdit = faEdit;
  faPlus = faPlus;
  faTrash = faTrash;

  _destroy$: Subject<void> = new Subject<void>();


  get childForm(): Form {

    return this.form.sections[this.sectionIndex]?.fields[this.fieldIndex]?.childForm;
  }


  /**
   * In this context, we assume that child forms are always flattened, so there's no reason to consider any other
   * sections, if present
   **/
  get section(): FormSection {

    return this.childForm?.sections[0];
  }


  constructor(
    private _datePipe: DatePipe,
    private _cinchyService: CinchyService,
    private _appStateService: AppStateService
  ) {}


  ngOnDestroy() {

    this._destroy$.next();
    this._destroy$.complete();
  }


  ngOnInit(): void {

    this._appStateService.parentFormSavedFromChild$
      .pipe(
        takeUntil(this._destroy$)
      ).subscribe(
        {
          next: (data: {
              childForm: Form,
              presetValues?: { [key: string]: any },
              title: string
          }) => {

            if (this.childForm.name === data.title) {
              this.addChildRecord(data.title);
            }
          }
        }
      );

    this.getFileNames();

    this._setChildFieldDictionary();
  }


  /**
   * Notifies the parent to initiate adding a new record to the child form represented by this table
   */
  addChildRecord(dialogTitle: string): void {

    this.childformOpened.emit(
      {
        childForm: this.childForm,
        title: dialogTitle
      }
    );
  }


  deleteRow(domain, table, field, multiarray) {

    this.deleteClicked.emit({ domain, table, field, multiarray });
  }


  /**
   * Notifies the parent to initiate editing a record from the child form represented by this table
   *
   * @param recordData Contains all of the current values of the record
   */
  editChildRecord(dialogTitle: string, recordData: { [key: string]: any }): void {

    // DEBUG
    console.log("-- EDIT -----");
    console.log(this.childForm);
    console.log(dialogTitle);
    console.log(recordData);

    this._updateEntitlements(recordData);

    this.childForm.updateAdditionalProperty(
      this.sectionIndex,
      this.fieldIndex,
      {
        propertyName: "rowId",
        propertyValue: recordData["Cinchy ID"]
      }
    );

    this.childformOpened.emit(
      {
        childForm: this.childForm,
        presetValues: recordData,
        title: dialogTitle
      }
    );
  }


  async getFileNames() {

    const binaryFields = this.section.fields.filter((field: FormField) => {

      return (field.cinchyColumn.dataType === "Binary")
    });

    if (this.section.flattenedChildFormRecordValues?.length) {
      binaryFields.forEach((field: FormField) => {

        const binaryFieldColumnName = field.cinchyColumn.name;
        const fileNameColumn = field.cinchyColumn.fileNameColumn;

        this.section.flattenedChildFormRecordValues.forEach(
          async (recordData: {
            childForm: Form,
            presetValues?: { [key: string]: any },
            title: string
          }) => {

            const fieldData = recordData[binaryFieldColumnName];

            if (fieldData) {
              const cinchyId = recordData["Cinchy ID"];
              const fileName = await this.getFileName(fileNameColumn, cinchyId);

              this.fileNameAndValueMap[fileName] = fieldData;

              recordData[`${binaryFieldColumnName}_Name`] = fileName;
            }
          });
        });
    }
  }


  async getFileName(fileNameColumn, cinchyId) {

    const [domain, table, column] = fileNameColumn?.split(".") ?? [];

    if (domain) {
      const query = `
        SELECT
            [${column}] as 'fullName',
            [Cinchy Id] as 'id'
          FROM [${domain}].[${table}]
          WHERE [Cinchy Id] = ${cinchyId}
            AND [Deleted] IS NULL`;

      const fileNameResp = await this._cinchyService.executeCsql(query, null).toPromise();

      return fileNameResp?.queryResult?.toObjectArray()[0] ? fileNameResp.queryResult.toObjectArray()[0]["fullName"] : null;
    }
  }


  isLinkedColumn(section, key) {

    return section.linkedColumnDetails && (key === section.linkedColumnDetails.linkLabel);
  }


  getSortedKeys(field: FormField): Array<string> {

    return (field ? Object.keys(field).sort() : []);
  }


  getDisplayValue(value, section, key) {

    const notDisplayColumnFields = section.fields.filter(field => !field.cinchyColumn.isDisplayColumn);

    // So that the one which is display column doesn"t match and show the name, as for display column one also
    // field.cinchyColumn.name is same
    let currentField = notDisplayColumnFields.find(field => field.cinchyColumn.name === key);

    if (!currentField) {
      currentField = section.fields.find(field => {
        return field.cinchyColumn.linkTargetColumnName + " label" === key;
      });
    }

    if (value && currentField?.cinchyColumn.dataType === "Date and Time") {
      let dateFormat = currentField.cinchyColumn.displayFormat;

      dateFormat = dateFormat.replaceAll("Y", "y");
      dateFormat = dateFormat.replaceAll("D", "d");

      return this._datePipe.transform(value, dateFormat);
    }
    else if (typeof value === "boolean") {
      return value === true ? "Yes" : "No";
    }
    else if (value && currentField && currentField.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl)) {
      return `<img class="cinchy-images cinchy-images--min" src="${value}">`;
    }
    else if ((value || value === 0) && currentField && currentField.cinchyColumn.numberFormatter) {
      const numeralValue = new NumeralPipe(value);
      return numeralValue.format(currentField.cinchyColumn.numberFormatter);
    }
    else if (value && currentField?.cinchyColumn.dataFormatType === "LinkUrl") {
      return `<a href="${value}" target="_blank">Open</a>`;
    }

    return value;
  }


  getTableHeader(key, section) {

    // For child form all fields should be in 1 section
    const notDisplayColumnFields = section.fields.filter(field => !field.cinchyColumn.isDisplayColumn);

    // So that the one which is display column doesn"t match and show the name, as for display column one also
    // field.cinchyColumn.name is same
    let currentField = notDisplayColumnFields.find(field => field.cinchyColumn.name === key);

    if (!currentField) {
      currentField = section.fields.find(field => {

        return field.cinchyColumn.linkTargetColumnName + " label" === key;
      });
    }

    return currentField ? currentField.label : key;
  }


  /**
   * @returns A flattened set of all of the fields contained within the child form represented by this table
   */
  private _getAllFieldsInChildForm(): Array<FormField> {

    // TODO: this can be done using return flatMap when ES2019 is available (typescript ^4.5, angular ^14.0.7
    const output = new Array<FormField>();

    this.childForm.sections.forEach((section: FormSection) => {

      output.push(...section.fields);
    });

    return output;

    /*
      return childForm.sections.flatMap((section: FormSection) => {

        return section.fields;
      });
    */
  }


  private _setChildFieldDictionary() {

    this.section.fields.forEach(field => {

      this.childFieldDictionary[field.cinchyColumn.name] = field;
    });
  }


  private async _updateEntitlements(recordData: { [key: string]: any }): Promise<void> {

    const domainAndTable = `[${this.childForm.targetTableDomain}].[${this.childForm.targetTableName}]`;
    const fieldSet = this._getAllFieldsInChildForm();

    const columnNames: Array<string> = Object.keys(recordData).filter((key: string) => {

      // Ensure we're only using the fields that are actually present on in the table
      return (key !== "Cinchy ID" && coerceBooleanProperty(fieldSet.find((field: FormField) => {

        return (field.cinchyColumn.name === key);
      })));
    });

    const selectLabels = columnNames.map((key: string) => {

      return `editable([${key}]) as 'entitlement-${key}'`;
    });

    const entitlementQuery = `
        SELECT ${selectLabels.join(",")}
          FROM ${domainAndTable} t
          WHERE t.[Deleted] is NULL
            AND t.[Cinchy Id]=${recordData["Cinchy ID"]}
          ORDER BY t.[Cinchy Id]`;

    const entitlements = (await this._cinchyService.executeCsql(entitlementQuery, null).toPromise())?.queryResult.toObjectArray();

    if (entitlements) {
      this.section.fields.forEach((field: FormField, fieldIndex: number) => {

        if (!entitlements[`entitlement-${field.cinchyColumn.name}`]) {
          this.childForm.updateAdditionalProperty(
            0,
            fieldIndex,
            {
              cinchyColumn: true,
              propertyName: "canEdit",
              propertyValue: false
            }
          );
        }
      });
    }
  }
}
