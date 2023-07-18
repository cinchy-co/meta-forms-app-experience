import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

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
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { DatePipe } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faEdit, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

import { MessageDialogComponent } from "../../message-dialog/message-dialog.component";

import { DataFormatType } from "../../enums/data-format-type";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { FormSection } from "../../models/cinchy-form-section.model";

import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { AppStateService } from "../../../services/app-state.service";

import { NumeralPipe } from "ngx-numeral";
import { ToastrService } from "ngx-toastr";
import { isNullOrUndefined } from "util";
import { ConfigService } from "src/app/services/config.service";
import { ChildFormService } from "../../service/child-form/child-form.service";


/**
 * Displays the records of a non-flattened child form
 */
@Component({
  selector: "cinchy-childform-table",
  templateUrl: "./child-form-table.component.html",
  styleUrls: ["./child-form-table.component.scss"],
  providers: [DatePipe],
  encapsulation: ViewEncapsulation.None
})
export class ChildFormTableComponent implements OnChanges, OnInit, OnDestroy {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() sectionIndex: number;

  @Output() childFormOpened = new EventEmitter<{
    childForm: Form,
    presetValues?: { [key: string]: any },
    title: string
  }>();
  @Output() childRowDeleted = new EventEmitter<{
    childForm: Form,
    rowId: number,
    sectionIndex: number
  }>();

  fieldSet: Array<FormField> = new Array<FormField>();
  fieldKeys: Array<string> = new Array<string>();

  displayValueSet: Array<{ [key: string]: string }>;

  fileNameAndValueMap = {};

  /**
   * A map of the name of a column in the host table to the FormField that represents its current value
   *
   * TODO: Explore the relationship between this and the fieldKeys set, as the field keys are used to
   *       retrieve values from this dictionary, but the dictionary is populated using the cinchyColumn
   *       names, so there's either no guarantee that the two values will correspond to one another or
   *       one of the two variables is unnecessary
   */
  childFieldDictionary: { [key: string]: FormField } = {};


  faEdit = faEdit;
  faPlus = faPlus;
  faTrash = faTrash;


  private _destroy$: Subject<void> = new Subject<void>();


  get childForm(): Form {

    return this.form.sections[this.sectionIndex]?.fields[this.fieldIndex]?.childForm;
  }


  constructor(
    private _appStateService: AppStateService,
    private _childFormService: ChildFormService,
    private _cinchyService: CinchyService,
    //private _configService: ConfigService,
    //private _datePipe: DatePipe,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
  ) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.form) {
      this.fieldSet = this._getAllFieldsInChildForm();
      this.loadFieldKeysAndPopulateDisplayValues();
    }
  }


  ngOnDestroy(): void {

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

    this.fieldSet = this._getAllFieldsInChildForm();

    this._setChildFieldDictionary();

    this._appStateService.childRecordUpdated$.pipe(
      takeUntil(this._destroy$)
    ).subscribe({
      next: () => {

        this.loadFieldKeysAndPopulateDisplayValues();
      }
    });
  }


  /**
   * Notifies the parent to initiate adding a new record to the child form represented by this table
   */
  addChildRecord(dialogTitle: string): void {

    this._updateEntitlements();
  
    // Find lowest negative Cinchy ID (these are all new records) so that we can generate a new one
    let lowestCinchyId = 0;
    this.childForm.childFormRowValues?.forEach(rowVal => {
      if (rowVal["Cinchy ID"] < lowestCinchyId) {
        lowestCinchyId = rowVal["Cinchy ID"];
      }
    });
    lowestCinchyId--;

    this.childFormOpened.emit(
      {
        childForm: this.childForm,
        presetValues: { "Cinchy ID": lowestCinchyId },
        title: dialogTitle
      }
    );
  }


  /**
   * Determines whether or not a given cell should be displayed in the template
   */
  cellShouldBeDisplayed(key: string): boolean {

    if (!this.displayValueSet) {
      return false;
    }

    return coerceBooleanProperty(
      (key !== "Cinchy ID") &&
      (!this.field.isLinkedColumn(key)) &&
      (this.childFieldDictionary[key]?.cinchyColumn?.dataType !== "Binary")
    );
  }


  deleteRow(rowData: { [key: string]: any }): void {

    if (!rowData["Cinchy ID"]) {
      this._toastr.error("You are attempting to delete a record without a proper ID. The data may be corrupted or configured incorrectly.");
    }
    else {
      const dialogRef = this._dialog.open(
        MessageDialogComponent,
        {
          width: "400px",
          data: {
            title: "Please confirm",
            message: "Are you sure you want to delete this record?"
          }
        }
      );

      dialogRef.afterClosed().subscribe({
        next: (confirmed: boolean) => {

          if (confirmed) {
            const childFormReference = this.form.findChildForm(this.childForm.id);

            if (rowData["Cinchy ID"] > 0) {
              let query = `delete
                         from [${childFormReference.childForm.targetTableDomain}].[${childFormReference.childForm.targetTableName}]
                         where
                             [Cinchy ID] = ${rowData["Cinchy ID"]}
                         and [Deleted] IS NULL`;

              this._cinchyService.executeCsql(query, null).subscribe(
                {
                  next: () => {

                    this._deleteRowValue(rowData);

                    this.childRowDeleted.emit({
                      childForm: this.childForm,
                      rowId: rowData["Cinchy ID"],
                      sectionIndex: this.sectionIndex
                    })
                  }
                }
              );
            }
            else {
              this._deleteRowValue(rowData);
            }
          }
        }
      });
    }
  }


  /**
   * Notifies the parent to initiate editing a record from the child form represented by this table
   *
   * @param rowData Contains all of the current values of the record
   */
  editChildRecord(dialogTitle: string, rowData: { [key: string]: any }): void {

    this._updateEntitlements(rowData);

    this.childForm.rowId = rowData["Cinchy ID"];
    
    this.childFormOpened.emit(
      {
        childForm: this.childForm,
        presetValues: rowData,
        title: dialogTitle
      }
    );
  }


  getDisplayValue(rowIndex: number, key: string): string {

    return this.displayValueSet[rowIndex][key] ?? "--";
  }


  async getFileName(fileNameColumn: string, rowId: number): Promise<string> {

    const [domain, table, column] = fileNameColumn?.split(".") ?? [];

    if (domain) {
      const query = `
        SELECT
            [${column}] as 'fullName',
            [Cinchy ID] as 'id'
          FROM [${domain}].[${table}]
          WHERE [Cinchy ID] = ${rowId}
            AND [Deleted] IS NULL`;

      const fileNameResp = await this._cinchyService.executeCsql(query, null).toPromise();

      return fileNameResp?.queryResult?.toObjectArray()[0] ? fileNameResp.queryResult.toObjectArray()[0]["fullName"] : null;
    }
  }


  async getFileNames(): Promise<void> {

    const binaryFields = this.fieldSet.filter((field: FormField) => {

      return (field.cinchyColumn.dataType === "Binary")
    });

    if (this.childForm.childFormRowValues?.length) {
      binaryFields.forEach((field: FormField) => {

        const binaryFieldColumnName = field.cinchyColumn.name;
        const fileNameColumn = field.cinchyColumn.fileNameColumn;

        this.childForm.childFormRowValues.forEach(
          async (rowData: {
            childForm: Form,
            presetValues?: { [key: string]: any },
            title: string
          }) => {

            const fieldData = rowData[binaryFieldColumnName];

            if (fieldData) {
              const rowId = rowData["Cinchy ID"];
              const fileName = await this.getFileName(fileNameColumn, rowId);

              this.fileNameAndValueMap[fileName] = fieldData;

              rowData[`${binaryFieldColumnName}_Name`] = fileName;
            }
          });
        });
    }
  }


  getTableHeader(key: string): string {

    let currentField: FormField = this._childFormService.getFieldByKey(this.fieldSet, key);

    return currentField?.label || key;
  }


  /**
   * Populates the header values captured by the set of child values represented by this table and the values to display in the table
   */
  loadFieldKeysAndPopulateDisplayValues(): void {

    this.fieldKeys = this._childFormService.getFieldKeys(this.childForm);
    this.displayValueSet = this._childFormService.getDisplayValueMap(this.childForm);
  }


  private _deleteRowValue(rowData: { [key: string]: any }): void {

    const childFormRowValues = this.childForm.childFormRowValues.filter((originalRowData: { [key: string]: any }) => {

      if (originalRowData["Cinchy ID"] && rowData["Cinchy ID"]) {
        return (originalRowData["Cinchy ID"] !== rowData["Cinchy ID"]);
      }
      else if (!originalRowData["Cinchy ID"] && !rowData["Cinchy ID"]) {
        // Since we can't just compare the ID here, we need to compare everything else and see if there's a match
        const keys = Object.keys(rowData);

        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
          // We are intentionally using a weak comparison here in case there are some object references in the data
          if (originalRowData[keys[keyIndex]] != rowData[keys[keyIndex]]) {
            return true;
          }
        }

        // If all properties match,
        return false;
      }

      return true;
    });

    this.form.updateChildFormProperty(
      this.sectionIndex,
      this.fieldIndex,
      {
        propertyName: "childFormRowValues",
        propertyValue: childFormRowValues
      }
    );

    this.loadFieldKeysAndPopulateDisplayValues();

    this._toastr.success(
      "Record deleted successfully",
      "Success"
    );
  }


  /**
   * @returns A flattened set of all of the fields contained within the child form represented by this table
   */
  private _getAllFieldsInChildForm(): Array<FormField> {

    // TODO: this can be done using return flatMap when ES2019 is available (typescript ^4.5, angular ^14.0.7)
    const output = new Array<FormField>();

    this.childForm?.sections.forEach((section: FormSection) => {

      output.push(...section.fields);
    });

    return output;

    /*
      return childForm.sections.flatMap((section: FormSection) => {

        return section.fields;
      });
    */
  }


  //private _getFieldByKey(key: string): FormField {

  //  // If there is a specific display column, use that field
  //  let currentField: FormField = this.fieldSet.find((field: FormField) => {

  //    return (`${field.cinchyColumn.linkTargetColumnName} label` === key);
  //  });

  //  // Otherwise, try to find the base field
  //  if (!currentField) {
  //    currentField = this.fieldSet.find((field: FormField) => {

  //      return (field.label === key);
  //    });
  //  }

  //  // If the field name doesn't match the target, then fall back to the cinchy column
  //  if (!currentField) {
  //    currentField = this.fieldSet.find((field: FormField) => {

  //      return (field.cinchyColumn.name === key);
  //    });
  //  }

  //  return currentField;
  //}


  //private _populateDisplayValueMap(): void {

  //  const displayValueSet = new Array<{ [key: string]: string }>();

  //  this.childForm.childFormRowValues?.forEach((rowData: { [key: string]: any }, rowIndex: number) => {

  //    displayValueSet[rowIndex] = {};

  //    this.fieldKeys.forEach((key: string) => {

  //      let currentField: FormField = this._getFieldByKey(key);

  //      if (!isNullOrUndefined(rowData[key])) {
  //        if (currentField?.cinchyColumn.dataType === "Date and Time") {
  //          let dateFormat = currentField.cinchyColumn.displayFormat;

  //          // TODO: this can be done using String.replaceAll when ES2021 is available (typescript ^4.5, angular ^14.0.7)
  //          dateFormat = dateFormat.replace(new RegExp("Y", "g"), "y");
  //          dateFormat = dateFormat.replace(new RegExp("D", "g"), "d");

  //          displayValueSet[rowIndex][key] = this._datePipe.transform(rowData[key], dateFormat);
  //        }
  //        else if (typeof rowData[key] === "boolean") {
  //          displayValueSet[rowIndex][key] = (rowData[key] === true) ? "Yes" : "No";
  //        }
  //        else if (currentField?.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl)) {
  //          displayValueSet[rowIndex][key] = `<img class="cinchy-images cinchy-images--min" src="${rowData[key]}">`;
  //        }
  //        else if (currentField?.cinchyColumn.numberFormatter) {
  //          const numeralValue = new NumeralPipe(rowData[key]);

  //          displayValueSet[rowIndex][key] = numeralValue.format(currentField.cinchyColumn.numberFormatter);
  //        }
  //        else if (currentField?.cinchyColumn.dataFormatType === "LinkUrl") {
  //          displayValueSet[rowIndex][key] = `<a href="${rowData[key]}" target="_blank">Open</a>`;
  //        }
  //        else if (currentField?.cinchyColumn.dataType === "Link" && rowData[key]) {
  //          let linkDisplayValues = new Array<string>();
  //          let isFile = coerceBooleanProperty(currentField.cinchyColumn.attachmentUrl);

  //          const ids: Array<string> = currentField.cinchyColumn.isMultiple ? rowData[key] : [rowData[key]];

  //          ids?.forEach((id: string) => {

  //            currentField.dropdownDataset?.options?.forEach((option: DropdownOption) => {

  //              // TODO: We're explicitly using a double equals here because at this stage the ID may be either a number or string depending on where it was
  //              //       populated. In the future we'll need to figure out which is correct and make sunre we're using it consistently
  //              if (option.id == id) {

  //                if (isFile) {
  //                  let replacedCinchyIdUrl = currentField.cinchyColumn.attachmentUrl.replace("@cinchyid", rowData["Cinchy ID"]);
  //                  let fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", option.id);
  //                  let lowercaseFileName = option.label.toLowerCase();
  //                  let isImage = lowercaseFileName.endsWith(".png") ||
  //                    lowercaseFileName.endsWith(".jpg") ||
  //                    lowercaseFileName.endsWith(".jpeg") ||
  //                    lowercaseFileName.endsWith(".gif") ||
  //                    lowercaseFileName.endsWith(".svg");
  //                  let displayValue = isImage ? `<div class="file-image-container"><img class="cinchy-images cinchy-images--min" src="${fileUrl}"/><a href="${fileUrl}" target="_blank">${option.label}</a></div>` : `<a href="${fileUrl}" target="_blank">${option.label}</a>`;
  //                  linkDisplayValues.push(displayValue);
  //                } else {
  //                  linkDisplayValues.push(option.label);
  //                }
  //              }
  //            });
  //          });

  //          if (!linkDisplayValues.length) {
  //            linkDisplayValues = ids;
  //          }

  //          displayValueSet[rowIndex][key] = linkDisplayValues.length ? linkDisplayValues.join(", ") : null;
  //        }
  //        else if (Array.isArray(rowData[key])) {
  //          displayValueSet[rowIndex][key] = rowData[key].join(', ');
  //        }
  //        else {
  //          displayValueSet[rowIndex][key] = rowData[`${key} label`]?.toString() || rowData[key]?.toString();
  //        }
  //      }
  //    });
  //  });

  //  this.displayValueSet = displayValueSet.slice();
  //}


  private _setChildFieldDictionary(): void {

    this.form.sections.forEach((section: FormSection) => {

      section.fields.forEach(field => {

        this.childFieldDictionary[field.cinchyColumn.name] = field;
      });
    });
  }


  /**
   * Determines which fields are editable by the current user
   *
   * TODO: while fieldKeys is still tied to the row data (which may be sparsely populated), this function
   *       has the capacity to skip a number of fields and allow the user to edit fields that they don't
   *       actually have access to
   */
  private async _updateEntitlements(rowData?: { [key: string]: any }): Promise<void> {

    const domainAndTable = `[${this.childForm.targetTableDomain}].[${this.childForm.targetTableName}]`;

    const columnNames: Array<string> = this._childFormService.getFieldKeys(this.childForm).filter((key: string) => {

      // Ensure we're only using the fields that are actually present on in the table
      return (key !== "Cinchy ID" && coerceBooleanProperty(this.fieldSet.find((field: FormField) => {

        return (field.cinchyColumn.name === key);
      })));
    });

    const selectLabels = columnNames.map((key: string) => {

      return `editable([${key}]) as 'entitlement-${key}'`;
    });

    let entitlements: [{ [key: string]: 0 | 1 }];

    if ((rowData && rowData["Cinchy ID"] && rowData["Cinchy ID"] > 0)) {
      const entitlementQuery = `
          SELECT ${selectLabels.join(",")}
            FROM ${domainAndTable} t
            WHERE t.[Deleted] IS NULL
              AND t.[Cinchy ID]=${rowData["Cinchy ID"]}
            ORDER BY t.[Cinchy ID]`;

      entitlements = (await this._cinchyService.executeCsql(entitlementQuery, null).toPromise())?.queryResult.toObjectArray() as [{ [key: string]: 0 | 1 }];
    }

    this.childForm.sections.forEach((section: FormSection, sectionIndex: number) => {

      section.fields.forEach((field: FormField, fieldIndex: number) => {

        this.childForm.updateFieldAdditionalProperty(
          sectionIndex,
          fieldIndex,
          {
            cinchyColumn: true,
            propertyName: "canEdit",
            propertyValue: entitlements?.length ? entitlements[0][`entitlement-${field.cinchyColumn.name}`] : 1
          }
        );
      });
    });
  }
}
