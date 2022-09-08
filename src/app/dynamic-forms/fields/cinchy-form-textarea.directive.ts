import {Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit} from '@angular/core';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';
import {ResponseType} from '../enums/response-type.enum';
import { ImageType } from '../enums/imageurl-type';
import { faAlignLeft } from '@fortawesome/free-solid-svg-icons';

//#region Cinchy Dynamic TextArea
/**
 * This section is used to create dynamic textarea fields for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-textarea',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Text'
     && field.cinchyColumn.textColumnMaxLength > 500 && field.cinchyColumn.canView)"
         class="full-width-element divMarginBottom">
      <div class="link-labels">
      <div>
          <fa-icon [icon]="faAlignLeft"></fa-icon>
       </div>
       &nbsp;
        <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
          {{field.label}}
          {{field.cinchyColumn.isMandatory == true && (field.value == '' || field.value == null) ? '*' : ''}}
        </label>
        <mat-icon *ngIf="field.caption" class="info-icon"
                  [matTooltip]="field.caption"
                  matTooltipClass="tool-tip-body"
                  matTooltipPosition="after"
                  aria-label="Button that displays a tooltip when focused or hovered over">
          contact_support
        </mat-icon>
      </div>
      <ng-container *ngIf="!field.cinchyColumn.isViewOnly && !isDisabled && field.cinchyColumn.canEdit">
         <textarea *ngIf="!isFormatted && showActualField"
                   [rows]="field.cinchyColumn.totalTextAreaRows ? field.cinchyColumn.totalTextAreaRows : 4"
                   [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
                   class='form-control' type="text" [(ngModel)]="field.value"
                   (blur)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"
                   [ngModelOptions]="{standalone: true}">
         </textarea>

        <ace-editor *ngIf="isFormatted" #editor style="height:450px;" [(text)]="field.value"
                    (textChange)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')">
        </ace-editor>
        <mat-error
          *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </ng-container>

      <ng-container *ngIf="field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled">
        <label class="pre-formatted" *ngIf="!isFormatted && showActualField" [innerHTML]="field.value || '-'"></label>

        <ace-editor *ngIf="isFormatted" #editor style="height:450px;" [(text)]="field.value"
                    (textChange)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')">
        </ace-editor>
      </ng-container>

      <ng-container *ngIf="showImage">
        <img class="cinchy-images" *ngIf="field.value" [src]="field.value">
        <p *ngIf="!field.value">-</p>
      </ng-container>

      <ng-container *ngIf="showLinkUrl">
        <a *ngIf="field.value" [href]="field.value">Open</a>
        <label *ngIf="!field.value" >-</label>
      </ng-container>
    </div>
  `,
})
export class TextAreaDirective implements AfterViewInit, OnInit {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  @ViewChild('editor') editor;
  isFormatted;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  faAlignLeft = faAlignLeft;
  
  constructor() {
  }

  ngOnInit() {
    if (this.field.cinchyColumn.dataFormatType === 'JSON') {
      this.field.value = JSON.stringify(JSON.parse(this.field.value), null, 2)
    }
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType && !this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default) && this.field.cinchyColumn.dataFormatType !== 'LinkUrl';
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === 'LinkUrl';
    this.showActualField = !this.showImage && !this.showLinkUrl;
  }

  ngAfterViewInit() {

    if (this.isFormatted) {
      this.editor.getEditor().setOptions({
        showLineNumbers: true,
        tabSize: 4,
        theme: 'ace/theme/sqlserver',
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightGutterLine: true
      });
      switch (this.field.cinchyColumn.dataFormatType) {
        case 'XML':
          this.editor.mode = 'xml';
          break;
        case 'Javascript':
          this.editor.mode = 'javascript';
          break;
        case 'CQL':
          this.editor.mode = 'sqlserver';
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
      'TableName': targetTableName,
      'ColumnName': columnName,
      'Value': value,
      'event': event,
      'HasChanged': this.field.cinchyColumn.hasChanged,
      'Form': this.field.form,
      'Field': this.field
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion
}
