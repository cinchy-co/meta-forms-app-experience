import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";

import { ImageType } from "../../enums/imageurl-type";
import { ResponseType } from "../../enums/response-type.enum";
import { DataFormatType } from "../../enums/data-format-type.enum";

import { IEventCallback, EventCallback } from "../../models/cinchy-event-callback.model";


//#region Cinchy Dynamic Textbox Field
/**
 * This section is used to create dynamic textbox field for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-textbox",
  templateUrl: "./textbox.component.html",
  styleUrls: ["./textbox.component.scss"]
})
export class TextboxComponent implements OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();

  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  showIFrame: boolean;
  faAlignLeft = faAlignLeft;
  urlSafe: SafeResourceUrl;
  iframeHeightStyle: string = '300px;';

  /**
   * If the field is displaying an imaged, returns the class name associated with the configured format
   */
  get imageSize(): string {

    if (this.showImage) {
      switch (this.field.cinchyColumn.dataFormatType) {
        case ImageType.small:

          return "cinchy-images-small";
        case ImageType.large:

          return "cinchy-images-large";
        case ImageType.small:
          // falls through
        case ImageType.default:

          return "cinchy-images";
        default:

          return "";
      }
    }

    return "";
  }


  constructor(public sanitizer: DomSanitizer) {}


  ngOnInit() {

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);

    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";

    this.showIFrame = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrame;

    this.showActualField = !this.showImage && !this.showLinkUrl && !this.showIFrame;

    if (this.showIFrame && this.isValidHttpUrl(this.field.value)){
      this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.field.value);
      this.iframeHeightStyle = this.field.cinchyColumn.totalTextAreaRows && this.field.cinchyColumn.totalTextAreaRows > 0 
        ? (100 * this.field.cinchyColumn.totalTextAreaRows)+ 'px;' : '300px;';
    }else{
      this.showIFrame = false;
    } 
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {

    // constant values
    const value = event.target[prop];
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value,
      "event": event,
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    }

    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);

    this.eventHandler.emit(callback);
  }
  //#endregion

  isValidHttpUrl(str: string) {
    let url;
    try {
      url = new URL(str);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }
}
