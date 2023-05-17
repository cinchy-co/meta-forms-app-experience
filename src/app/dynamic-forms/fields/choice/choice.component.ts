import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";

import { faListUl } from "@fortawesome/free-solid-svg-icons";

import { ResponseType } from "../../enums/response-type.enum";

import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";


//#region Cinchy Dynamic Choice Field
/**
 * This section is used to create choice field.
 */
//#endregion
@Component({
  selector: "cinchy-choice",
  templateUrl: "./choice.component.html",
  styleUrls: ["./choice.component.scss"]
})
export class ChoiceComponent implements OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;

  @Output() eventHandler = new EventEmitter<any>();

  choiceFilter: string;
  showError: boolean;
  faListUl = faListUl;
  
  constructor() {}

  async ngOnInit() {

    const [dataSet, linkTargetId] = [this.field, this.field.cinchyColumn.linkTargetColumnId];
    const choices = this.field.cinchyColumn.choiceOptions;
    const splitFromInvertedCommas = choices?.split(`"`) ?? [];

    let allOptions = [];
    let optionsInSubString = "";

    if (splitFromInvertedCommas.length === 1) {
      allOptions = choices?.split(",") ?? null;
    }
    else { // Doing when option have , between them
      splitFromInvertedCommas.forEach(option => {

        if (option && (option[0] === "," || option[option.length - 1] === ",")) {
          optionsInSubString = option.split(",");
          allOptions = [...allOptions, ...optionsInSubString];
        }
        else if (option) {
          allOptions.push(option);
        }
      })
    }
    allOptions = allOptions.filter(n => n)
    dataSet.dropdownDataset = allOptions;
    this.field.dropdownDataset = allOptions;
  }

  public changeFilter() {
    this.choiceFilter = "";
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event.value;
    this.field.value = event.value;
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
}
