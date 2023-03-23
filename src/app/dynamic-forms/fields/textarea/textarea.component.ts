import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";

import { DataFormatType } from "../../enums/data-format-type";
import { ResponseType } from "../../enums/response-type.enum";

import { IEventCallback, EventCallback } from "../../models/cinchy-event-callback.model";


//#region Cinchy Dynamic TextArea
/**
 * This section is used to create dynamic textarea fields for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-textarea",
  templateUrl: "./textarea.component.html",
  styleUrls: ["./textarea.component.scss"]
})
export class TextareaComponent implements AfterViewInit, OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  @ViewChild("editor") editor;
  isFormatted;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  showIFrame: boolean;
  showIFrameSandbox: boolean;
  showIFrameSandboxStrict: boolean;
  faAlignLeft = faAlignLeft;
  urlSafe: SafeResourceUrl;
  iframeHeightStyle: string = '300px;';
  
  constructor(public sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.field.cinchyColumn.dataFormatType === "JSON") {
      this.field.value = JSON.stringify(JSON.parse(this.field.value), null, 2)
    }
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType && !this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl) && this.field.cinchyColumn.dataFormatType !== "LinkUrl";
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showIFrame = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrame;
    this.showIFrameSandbox = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandbox; 
    this.showIFrameSandboxStrict = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandboxStrict;

    if ((this.showIFrame || this.showIFrameSandbox || this.showIFrameSandboxStrict)  && this.isValidHttpUrl(this.field.value) && !this.isInChildForm){
      this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.field.value);
      this.iframeHeightStyle = this.field.cinchyColumn.totalTextAreaRows && this.field.cinchyColumn.totalTextAreaRows > 0 
        ? (100 * this.field.cinchyColumn.totalTextAreaRows)+'' : '300';   
      this.isFormatted = false;   
    }else{
      this.showIFrame = false;
      this.showIFrameSandbox = false;
      this.showIFrameSandboxStrict = false;
    } 
    this.showActualField = !this.showImage && !this.showLinkUrl && !this.showIFrame && !this.showIFrameSandbox && !this.showIFrameSandboxStrict;;
  }

  ngAfterViewInit() {

    if (this.isFormatted) {
      this.editor.getEditor().setOptions({
        showLineNumbers: true,
        tabSize: 4,
        theme: "ace/theme/sqlserver",
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightGutterLine: true
      });
      switch (this.field.cinchyColumn.dataFormatType) {
        case "XML":
          this.editor.mode = "xml";
          break;
        case "Javascript":
          this.editor.mode = "javascript";
          break;
        case "CQL":
          this.editor.mode = "sqlserver";
          break;
        default:
          this.editor.mode = this.field.cinchyColumn.dataFormatType.toLowerCase();
      }
      this.editor.value = this.field.value;
      if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
        this.editor.setReadOnly(true);
      }
      this.editor.getEditor().commands.addCommand({
        name: "showOtherCompletions",
        bindKey: "Ctrl-.",
        exec: function (editor) {

        }
      })
    }
  }


  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = this.field.value;
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
