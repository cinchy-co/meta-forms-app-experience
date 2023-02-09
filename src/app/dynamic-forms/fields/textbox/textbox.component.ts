import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";

import { ImageType } from "../../enums/imageurl-type";
import { ResponseType } from "../../enums/response-type.enum";

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
  size: any;
  faAlignLeft = faAlignLeft;
  
  constructor() {}

  ngOnInit() {
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    if(this.showImage){
      this.size = this.field.cinchyColumn.dataFormatType;
    }
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;
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
}
