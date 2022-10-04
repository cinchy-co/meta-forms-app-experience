import {Component, Input, Output, EventEmitter, OnInit} from '@angular/core';
import {ResponseType} from './../enums/response-type.enum';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';
import { ImageType } from '../enums/imageurl-type';
import { faAlignLeft } from '@fortawesome/free-solid-svg-icons';
//#region Cinchy Dynamic Textbox Field
/**
 * This section is used to create dynamic textbox field for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-textbox',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Text' && field.cinchyColumn.textColumnMaxLength <= 500
  && field.cinchyColumn.canView)"
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
                  ngbTooltip = "{{field.caption}}"
                  placement="auto"
                  container="body"
                  matTooltipClass="tool-tip-body"
                  matTooltipPosition="above">
            info
        </mat-icon>
      </div>
      <ng-container *ngIf="!field.cinchyColumn.isViewOnly && !isDisabled && field.cinchyColumn.canEdit && showActualField">
        <input class='form-control'
               [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly  || field.label=== 'File Name' || isDisabled)"
               type="text" [(ngModel)]="field.value"
               (blur)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"
               [ngModelOptions]="{standalone: true}">
        <mat-error
          *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </ng-container>

      <label class="pre-formatted"
             *ngIf="!field.cinchyColumn.canEdit || field.cinchyColumn.isViewOnly  || field.label=== 'File Name' || isDisabled"
             [innerHTML]="field.value || '-'"></label>

      <ng-container *ngIf="showImage">
      <img [ngClass]="{
        'cinchy-images': size === '${ImageType.default}' || size === '${ImageType.medium}', 
        'cinchy-images-large' : size === '${ImageType.large}', 
        'cinchy-images-small' : size === '${ImageType.small}' 
      }" *ngIf="field.value" [src]="field.value">
        <p *ngIf="!field.value">-</p>
      </ng-container>

      <ng-container *ngIf="showLinkUrl">
        <a *ngIf="field.value" [href]="field.value">Open</a>
        <label *ngIf="!field.value" >-</label>
      </ng-container>
    </div>

  `
})
export class TextBoxDirective implements OnInit {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
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
  
  constructor() {
  }

  ngOnInit() {
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    if(this.showImage){
      this.size = this.field.cinchyColumn.dataFormatType;
    }
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === 'LinkUrl';
    this.showActualField = !this.showImage && !this.showLinkUrl;
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event.target[prop];
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
