import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { DataFormatType } from "../../enums/data-format-type";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";


/**
 * This section is used to create dynamic textarea fields for the cinchy.
 */
@Component({
  selector: "cinchy-textarea",
  templateUrl: "./textarea.component.html",
  styleUrls: ["./textarea.component.scss"]
})
export class TextareaComponent implements AfterViewInit, OnInit {

  @ViewChild("editor") editor;

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
  @Input() sectionIndex: number;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  iframeHeightStyle: string = "300px;";
  isFormatted: boolean;
  showActualField: boolean;
  showError: boolean;
  showIframe: boolean;
  showIframeSandbox: boolean;
  showIframeSandboxStrict: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  urlSafe: SafeResourceUrl;
  value: string;

  faAlignLeft = faAlignLeft;


  get canEdit(): boolean {

    if (this.isDisabled) {
      return false;
    }

    return (this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }
  

  constructor(public sanitizer: DomSanitizer) {}


  ngOnInit(): void {

    this.value = (this.field.cinchyColumn.dataFormatType === "JSON") ? JSON.stringify(JSON.parse(this.field.value), null, 2) : this.field.value;

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showIframe = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrame;
    this.showIframeSandbox = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandbox; 
    this.showIframeSandboxStrict = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandboxStrict;

    this.isFormatted = coerceBooleanProperty(
      this.field.cinchyColumn.dataFormatType &&
      !this.showImage &&
      !this.showLinkUrl &&
      !this.showIframe &&
      !this.showIframeSandbox &&
      !this.showIframeSandboxStrict
    );
    
    if ((this.showIframe || this.showIframeSandbox || this.showIframeSandboxStrict) && this.isValidHttpUrl(this.value) && !this.isInChildForm){
      this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.field.value);
      this.iframeHeightStyle = this.field.cinchyColumn.totalTextAreaRows ? `${(100 * this.field.cinchyColumn.totalTextAreaRows)}px` : "300px";
    }
    else {
      this.showIframe = false;
      this.showIframeSandbox = false;
      this.showIframeSandboxStrict = false;
    }

    this.showActualField = !this.showImage && !this.showLinkUrl && !this.showIframe && !this.showIframeSandbox && !this.showIframeSandboxStrict;
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

      this.editor.value = this.value;

      this.editor.setReadOnly(!this.canEdit);

      this.editor.getEditor().commands.addCommand({
        name: "showOtherCompletions",
        bindKey: "Ctrl-.",
        exec: function (editor) {

        }
      })
    }
  }


  isValidHttpUrl(str: string) {

    let url;

    try {
      url = new URL(str);
    } catch (_) {
      return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.isFormatted ? this.editor.value : this.value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }
}
