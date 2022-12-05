import { Component, EventEmitter, Input, Output } from '@angular/core';

import { faCheckSquare } from '@fortawesome/free-regular-svg-icons';

import { EventCallback, IEventCallback } from "../../models/cinchy-event-callback.model";
import { ResponseType } from "../../enums/response-type.enum";


//#region Cinchy Dynamic YES/NO fields (Checkbox)
/**
 * This section is used to create Yes/No fields for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-checkbox',
  templateUrl: "./checkbox.component.html",
  styleUrls: ["./checkbox.component.scss"]
})
export class CheckboxComponent {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  showError: boolean;
  faCheckSquare = faCheckSquare;

  constructor() {

  }

  valueChanged() {
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      'TableName': this.targetTableName,
      'ColumnName': this.field.cinchyColumn.name,
      'Value': this.field.value,
      'event': event,
      'HasChanged': this.field.cinchyColumn.hasChanged,
      'Form': this.field.form,
      'Field': this.field
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onChange, Data);
    this.eventHandler.emit(callback);
  }
}
