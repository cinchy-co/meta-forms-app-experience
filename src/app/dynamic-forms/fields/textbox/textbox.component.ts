import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { DataFormatType } from "../../enums/data-format-type";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";
import { coerceBooleanProperty } from "@angular/cdk/coercion";


/**
 * This section is used to create dynamic textbox field for the cinchy.
 */
@Component({
  selector: "cinchy-textbox",
  templateUrl: "./textbox.component.html",
  styleUrls: ["./textbox.component.scss"]
})
export class TextboxComponent implements OnChanges, OnInit {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();


  iframeHeightStyle: string = "300px;";
  showActualField: boolean;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showIframe: boolean;
  showIframeSandbox: boolean;
  showIframeSandboxStrict: boolean;
  urlSafe: SafeResourceUrl;
  value: string;

  faAlignLeft = faAlignLeft;


  get canEdit(): boolean {

    if (this.isDisabled) {
      return false;
    }

    return (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  /**
   * If the field is displaying an imaged, returns the class name associated with the configured format
   */
  get imageSize(): string {

    if (this.showImage) {
      switch (this.field.cinchyColumn.dataFormatType) {
        case DataFormatType.ImageUrlSmall:

          return "cinchy-images-small";
        case DataFormatType.ImageUrlLarge:

          return "cinchy-images-large";
        case DataFormatType.ImageUrlSmall:
          // falls through
        case DataFormatType.ImageUrl:

          return "cinchy-images";
        default:
          return "";
      }
    }

    return "";
  }


  constructor(public sanitizer: DomSanitizer) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.field) {
      this.value = this.field?.value;
    }
  }


  ngOnInit(): void {

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);

    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";

    this.showIframe = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrame;

    this.showIframeSandbox = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandbox; 
    this.showIframeSandboxStrict = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandboxStrict;

    if ((this.showIframe || this.showIframeSandbox || this.showIframeSandboxStrict) && this.isValidHttpUrl(this.value) && !this.isInChildForm) {
      this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.value);

      this.iframeHeightStyle = (this.field.cinchyColumn?.totalTextAreaRows > 0) ? (100 * this.field.cinchyColumn.totalTextAreaRows).toString() : "300";      
    }else{
      this.showIframe = false;
      this.showIframeSandbox = false;
      this.showIframeSandboxStrict = false;
    } 

    this.showActualField = (!this.showImage && !this.showLinkUrl && !this.showIframe && !this.showIframeSandbox && !this.showIframeSandboxStrict);
  }


  isValidHttpUrl(str: string) {

    let url;

    try {
      url = new URL(str);
    } catch (error) {
      return false;
    }

    return (url.protocol === "http:" || url.protocol === "https:");
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }
}
