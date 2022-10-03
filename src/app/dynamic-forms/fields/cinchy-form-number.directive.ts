import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {CurrencyPipe} from "@angular/common";
import {EventCallback, IEventCallback} from "../models/cinchy-event-callback.model";
import {ResponseType} from "../enums/response-type.enum";
import {NumeralPipe} from "ngx-numeral";

//#region Cinchy Dynamic Number field
/**
 * This section is used to create Dynamic Number field
 */
//#endregion
@Component({
  selector: 'cinchy-number',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Number' &&
    field.cinchyColumn.canView)" class="full-width-element divMarginBottom">
      <div class="link-labels">
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
      <ng-container *ngIf="!field.cinchyColumn.isViewOnly && !isDisabled && field.cinchyColumn.canEdit">
        <input class='form-control' digitOnly decimal="true" inputmode="numeric"
               [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
               (blur)="transformAmount(targetTableName, field.cinchyColumn.name, $event, 'value')"
               (focus)="reverseTransform()"
               type="text" [value]='formattedAmount' [(ngModel)]="formattedAmount"
               [ngModelOptions]="{standalone: true}">
        <mat-error
          *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </ng-container>
      <ng-container *ngIf="field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled">
        <label class="pre-formatted" *ngIf="!field.cinchyColumn.numberFormatter"
               [innerHTML]="field.value || '-'"></label>
        <label class="pre-formatted" *ngIf="field.cinchyColumn.numberFormatter && field.value"
               [innerHTML]="formattedAmount || '-'"></label>
      </ng-container>
    </div>

  `,
  providers: [CurrencyPipe]
})
export class NumberDirective implements OnInit {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  formattedAmount;
  showError: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  numeralValue;

  constructor(private currencyPipe: CurrencyPipe) {
  }

  ngOnInit() {
    if (this.field.cinchyColumn.numberFormatter && this.field.value) {
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.numeralValue.format(this.field.cinchyColumn.numberFormatter);
      //  this.formattedAmount = this.currencyPipe.transform(this.field.value, '$');
    } else {
      this.formattedAmount = this.field.value;
    }
  }

  transformAmount(targetTableName: string, columnName: string, event: any, prop: string) {
    this.callbackEvent(targetTableName, columnName, event, prop);
    if (this.field.cinchyColumn.numberFormatter && this.formattedAmount) {
      // this.formattedAmount = this.currencyPipe.transform(this.formattedAmount, '$');
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.numeralValue.format(this.field.cinchyColumn.numberFormatter);
    }
  }

  reverseTransform() {
    if (this.field.cinchyColumn.numberFormatter && this.formattedAmount) {
      //  this.formattedAmount = Number(this.formattedAmount.replace(/[^0-9.-]+/g, ""));
      this.formattedAmount = this.numeralValue.value();
    }
  }

  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event.target[prop];
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      'TableName': targetTableName,
      'ColumnName': columnName,
      'Value': value && Number(value) ? Number(value) : value,
      'event': event,
      'HasChanged': this.field.cinchyColumn.hasChanged,
      'Form': this.field.form,
      'Field': this.field
    }
    this.field.value = value && Number(value) ? Number(value) : value;
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }
}
