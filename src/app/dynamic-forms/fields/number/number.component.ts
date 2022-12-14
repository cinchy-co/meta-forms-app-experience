import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from "@angular/core";
import {CurrencyPipe} from "@angular/common";

import { faHashtag } from "@fortawesome/free-solid-svg-icons";

import { ResponseType } from "../../enums/response-type.enum";

import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";

import { NumeralPipe } from "ngx-numeral";


//#region Cinchy Dynamic Number field
/**
 * This section is used to create Dynamic Number field
 */
//#endregion
@Component({
  selector: "cinchy-number",
  templateUrl: "./number.component.html",
  styleUrls: ["./number.component.scss"],
  providers: [CurrencyPipe]
})
export class NumberComponent implements OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  formattedAmount;
  showError: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  numeralValue;
  faHashtag = faHashtag;
  
  constructor(private currencyPipe: CurrencyPipe) {
  }

  ngOnInit() {
    if (this.field.cinchyColumn.numberFormatter && this.field.value) {
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.numeralValue.format(this.field.cinchyColumn.numberFormatter);
      //  this.formattedAmount = this.currencyPipe.transform(this.field.value, "$");
    } else {
      this.formattedAmount = this.field.value;
    }
  }

  transformAmount(targetTableName: string, columnName: string, event: any, prop: string) {
    this.callbackEvent(targetTableName, columnName, event, prop);
    if (this.field.cinchyColumn.numberFormatter && this.formattedAmount) {
      // this.formattedAmount = this.currencyPipe.transform(this.formattedAmount, "$");
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
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value && Number(value) ? Number(value) : value,
      "event": event,
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    }
    this.field.value = value && Number(value) ? Number(value) : value;
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }
}
