import {Component, EventEmitter, Input, Output} from '@angular/core';
import {EventCallback, IEventCallback} from "../models/cinchy-event-callback.model";
import {ResponseType} from "../enums/response-type.enum";

//#region Cinchy Dynamic Multi Choice
/**
 * This section is used to create Multi choice driopdownList
 */
//#endregion
@Component({
    selector: 'cinchy-muliti-choice',
    template: `
      <!-- Chioice field For ShowCase Make it Multi-Select-->
      <div *ngIf=" field.dropdownDataset">
        <mat-form-field class="full-width-element divMarginBottom">
          <div class="link-labels">
            <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
              {{field.label}}
              {{field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null) ? '*' :''}}
            </label>
            <mat-icon *ngIf="field.caption" class="info-icon"
                      ngbTooltip = "{{field.caption}}"
                      [closeDelay]="5000"
                      placement="auto"
                      container="body"
                      matTooltipClass="tool-tip-body"
                      matTooltipPosition="above">
              info
            </mat-icon>
          </div>
          <mat-select multiple [(ngModel)]="field.value" class="form-control"
                      [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
                      (selectionChange)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"
                      [ngModelOptions]="{standalone: true}" (openedChange)="changeFilter()">

            <input matInput type="search" placeholder="Search {{field.label}}" class="form-control"
                   [(ngModel)]="choiceFilter" [ngModelOptions]="{standalone: true}">

            <mat-option *ngFor="let dropdownOption of field.dropdownDataset| filterBy: choiceFilter"
                        [value]="dropdownOption">
              {{dropdownOption}}
            </mat-option>

          </mat-select>
        </mat-form-field>
        <!-- isMandatory Validator-->
        <mat-error *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </div>
    `,
})
export class MultiChoiceDirective {
  @Input() field: any;
  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };
  @Input() targetTableName: string;
  @Input() isDisabled: boolean;

  @Output() eventHandler = new EventEmitter<any>();
  choiceFilter: string;
  showError: boolean;

  constructor() {
  }

  async ngOnInit() {
    const [dataSet, linkTargetId] = [this.field, this.field.cinchyColumn.linkTargetColumnId];
    const choices = this.field.cinchyColumn.choiceOptions;
    let dropdownDataset = choices ? choices.split(',') : null;
    dataSet.dropdownDataset = dropdownDataset;
    this.field.dropdownDataset = dropdownDataset;
    this.field.value = Array.isArray(this.field.value) ? this.field.value
      : this.field.value ? [this.field.value] : null;
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
}
