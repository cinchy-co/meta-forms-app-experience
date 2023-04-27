import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faFile } from "@fortawesome/free-regular-svg-icons";


//#region Cinchy Dynamic DateTime Field
/**
 * This section is used to create dynamic DateTime field for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-attach-file",
  templateUrl: "./attach-file.component.html",
  styleUrls: ["./attach-file.component.scss"]
})
export class AttachFileComponent implements OnInit {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() sectionIndex: number;
  @Input() form: Form;
  @Input() rowId: any;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  fileName;
  fileToUpload: File = null;
  showError: boolean;

  faFile = faFile;


  async ngOnInit() {

    this.fileName = this.field.cinchyColumn.fileName;
  }


  async onFileSelected(field, event) {

    this.field.cinchyColumn.hasChanged = true;

    let file = event.target.files[0];

    const value = await this.readFileAsyncEncode(file);

    // First, update the file field and ensure that the file name is correctly set on the associated cinchyColumn
    this.onChange.emit({
      additionalPropertiesToUpdate: [
        {
          cinchyColumn: true,
          propertyName: "fileName",
          propertyValue: file.name
        }
      ],
      fieldIndex: this.fieldIndex,
      form: this.form,
      newValue: value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });

    // Next, if there is an associated file name field in the same section, update it so that it matches the selection
    this.form.sections[this.sectionIndex].fields.forEach((field: FormField, fileNameFieldIndex: number) => {

      if (field.cinchyColumn.name === "File Name") {
        this.onChange.emit({
          fieldIndex: fileNameFieldIndex,
          form: this.form,
          newValue: file.name,
          sectionIndex: this.sectionIndex,
          targetColumnName: "File Name",
          targetTableName: this.targetTableName
        });
      }
    });
  }


  readFileAsyncEncode(file: File): Promise<string> {

    return new Promise((resolve, reject) => {

      let reader = new FileReader();

      reader.onloadend = () => {
        resolve(btoa(<string>reader.result));
      }
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    })
  }


  getConvertedRealFileName(codifiedValue) {

    return btoa(codifiedValue)
  }


  downloadDocument(event, doc) {

    const arrayBuffer = this.base64ToArrayBuffer(doc);

    var blob = new Blob([arrayBuffer], { type: "application/binary" });

    // Download file
    this.saveFile(blob, this.fileName);
  }


  // Convert the saved base64 text to an Array Buffer
  base64ToArrayBuffer(base64: string) {

    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    return bytes.map((byte, i) => binaryString.charCodeAt(i));
  }


  // Downloads the file
  saveFile(blob, filename) {

    if (window.navigator["msSaveOrOpenBlob"]) {
      window.navigator["msSaveOrOpenBlob"](blob, filename);
    } else {
      const a = document.createElement("a");

      document.body.appendChild(a);

      const url = window.URL.createObjectURL(blob);

      a.href = url;
      a.download = filename;
      a.click();

      setTimeout(() => {

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0)
    }
  }
}
