import {Component, Input, Output, EventEmitter, OnInit} from '@angular/core';
import {ResponseType} from './../enums/response-type.enum';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';

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
      <img [ngClass]="{'cinchy-images': size === 'ImageUrl (medium)', 'cinchy-imagesLarge' : size === 'ImageUrl (large)', 'cinchy-imagesSmall' : size === 'ImageUrl (small)' }" *ngIf="field.value" [src]="field.value">
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

  constructor() {

  }

  ngOnInit() {
    this.showImage = this.field.cinchyColumn.dataFormatType === 'ImageUrl (small)' || this.field.cinchyColumn.dataFormatType === 'ImageUrl (medium)' || this.field.cinchyColumn.dataFormatType === 'ImageUrl (large)';
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
      'HasChanged': this.field.cinchyColumn.hasChanged
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion
}
