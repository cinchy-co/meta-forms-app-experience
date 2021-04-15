import {Component, EventEmitter, Input, Output} from '@angular/core';
import {EventCallback, IEventCallback} from "../models/cinchy-event-callback.model";
import {ResponseType} from "../enums/response-type.enum";

//#region Cinchy Dynamic YES/NO fields (Checkbox)
/**
 * This section is used to create Yes/No fields for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-checkbox',
  template: `
    <div *ngIf="(field.cinchyColumn.dataType == 'Yes/No' && field.cinchyColumn.canView)">
      <input class="m-tb-10 mr-5" type='checkbox' [(ngModel)]="field.value" [ngModelOptions]="{standalone: true}"
             [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
             (change)="valueChanged()" [id]="field.label"/>
      <div class="checkbox-field">
        <label class="pre-formatted" [for]="field.label" [title]="field.caption ? field.caption : ''">{{field.label}}
          {{field.cinchyColumn.isMandatory == true && (field.value == '' || field.value == null) ? '*' : ''}}
        </label>
        <mat-icon *ngIf="field.caption" class="info-icon-checkbox"
                  [matTooltip]="field.caption"
                  matTooltipClass="tool-tip-body"
                  matTooltipPosition="after"
                  aria-label="Button that displays a tooltip when focused or hovered over">
          contact_support
        </mat-icon>
      </div>
      <mat-error *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
        *{{field.label}} is Required.
      </mat-error>
    </div>

  `,
})
export class CheckBoxDirective {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  showError: boolean;

  constructor() {

  }

  valueChanged() {
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      'HasChanged': this.field.cinchyColumn.hasChanged
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onChange, Data);
    this.eventHandler.emit(callback);
  }
}
