import { Component, EventEmitter, Input, Output } from "@angular/core";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { faListUl } from "@fortawesome/free-solid-svg-icons";


/**
 * This section is used to create Multi choice driopdownList
 */
@Component({
    selector: "cinchy-multi-choice",
    templateUrl: "./multichoice.component.html",
    styleUrls: ["./multichoice.component.scss"]
})
export class MultichoiceComponent {
  @Input() field: any;
  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };
  @Input() targetTableName: string;
  @Input() isDisabled: boolean;

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();
  choiceFilter: string;
  showError: boolean;
  faListUl = faListUl;
  

  constructor() {}


  async ngOnInit() {

    const choices = this.field.cinchyColumn.choiceOptions;

    let dropdownDataset = choices?.split(",") ?? null;

    this.field.dropdownDataset = dropdownDataset;

    this.field.value = Array.isArray(this.field.value) ?
      this.field.value :
      (this.field.value ? [this.field.value] : null);
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
    this.onChange.emit(callback);
  }
}
