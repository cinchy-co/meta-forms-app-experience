import {Component, Input, Output, EventEmitter, OnInit} from '@angular/core';
import {ResponseType} from '../enums/response-type.enum';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';

import {DatePipe} from "@angular/common";
import {MAT_DATE_FORMATS} from '@angular/material/core';
import { FormControl } from '@angular/forms';
import * as _moment from 'moment';
import { Moment } from 'moment';
import { MY_FORMATS } from './cinchy-my-format';

const moment =  _moment;
//#region Cinchy Dynamic DateTime Field
/**
 * This section is used to create dynamic DateTime field for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-datetime',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Date and Time'
  && field.cinchyColumn.canView)"
         class="full-width-element divMarginBottom relative-pos">
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
      <ng-container *ngIf="!field.cinchyColumn.isViewOnly && !isDisabled && field.cinchyColumn.canEdit">
        <mat-form-field class='form-control'>
            <input matInput
             [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
             (dateChange)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"
             (dateInput)="checkForDate()"
             [matDatepicker]="picker3" [value]="datenew">
             <mat-datepicker-toggle   matSuffix [for]="picker3"></mat-datepicker-toggle>
             <mat-datepicker  #picker3></mat-datepicker>
           </mat-form-field>
        <mat-error
          *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </ng-container>
      <label class="pre-formatted" *ngIf="field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled" [innerHTML]="(field.value | date) || '-' "></label>
    </div>

  `,
  providers: [{provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},],
})
export class DateTimeDirective implements OnInit {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  preSelectedDate;
  datenew = new FormControl(moment());
  showError;

  constructor(private datePipe: DatePipe,) {

  }

  ngOnInit() {
    this.preSelectedDate = this.field.value ? new Date(this.field.value) : '';
    this.datenew = this.preSelectedDate;
  }

  checkForDate(){
    if(!this.datenew){
      this.field.cinchyColumn.hasChanged = true;
    }
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event[prop];
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      'TableName': targetTableName,
      'ColumnName': columnName,
      'Value': value,
      'event': event,
      'HasChanged': this.field.cinchyColumn.hasChanged
    };
    let selctedDate = value ? value : this.datenew;
    this.field.value = this.datePipe.transform(selctedDate, 'MM-dd-yyyy');
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion
}
