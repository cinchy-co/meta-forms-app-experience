import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {EventCallback, IEventCallback} from "../models/cinchy-event-callback.model";
import {ResponseType} from "../enums/response-type.enum";
import {DropdownDataset} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import {isNullOrUndefined} from "util";
import {DropdownDatasetService} from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { faListUl } from '@fortawesome/free-solid-svg-icons';

//#region Cinchy Dynamic Choice Field
/**
 * This section is used to create choice field.
 */
//#endregion
@Component({
  selector: 'cinchy-choice',
  template: `
    <!-- Chioice field For ShowCase Make it Multi-Select-->
    <div *ngIf=" field.dropdownDataset">
      <div class="full-width-element divMarginBottom">
        <div class="link-labels">
        <div>
          <fa-icon [icon]="faListUl"></fa-icon>
        </div>
         &nbsp;
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
        <mat-form-field class="full-width-element divMarginBottom" *ngIf="field.cinchyColumn.canEdit && !field.cinchyColumn.isViewOnly && !isDisabled">
          <mat-select class="single-select form-control" [(ngModel)]="field.value"
                      [disabled]="(field.cinchyColumn.canEdit=== false || field.cinchyColumn.isViewOnly || isDisabled)"
                      (selectionChange)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"
                      [ngModelOptions]="{standalone: true}">
            <mat-option [value]=""> </mat-option>
            <mat-option *ngFor="let dropdownOption of field.dropdownDataset| filterBy: choiceFilter"
                        [value]="dropdownOption">
              {{dropdownOption}}
            </mat-option>

          </mat-select>
        </mat-form-field>
        <ng-container *ngIf="!field.cinchyColumn.canEdit || field.cinchyColumn.isViewOnly || isDisabled">
          <label class="font-14" [innerHTML]="field.value ? field.value : '-'"></label>
        </ng-container>
      </div>
      <!-- isMandatory Validator-->
      <mat-error class="mat-error-move-up-19"
                 *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
        *{{field.label}} is Required.
      </mat-error>
    </div>
  `,
})
// tslint:disable-next-line: no-unused-expression
export class ChoiceDirective implements OnInit {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;

  @Output() eventHandler = new EventEmitter<any>();
  choiceFilter: string;
  showError: boolean;
  faListUl = faListUl;
  
  constructor() {
  }

  async ngOnInit() {
    const [dataSet, linkTargetId] = [this.field, this.field.cinchyColumn.linkTargetColumnId];
    const choices = this.field.cinchyColumn.choiceOptions;
    const splitFromInvertedCommas = choices.split('"');
    let allOptions = [];
    let optionsInSubString = "";
    if (splitFromInvertedCommas.length === 1) {
      allOptions = choices ? choices.split(',') : null;
    } else { // Doing when option have , between them
      splitFromInvertedCommas.forEach(option => {
        if (option && (option[0] === ',' || option[option.length - 1] === ',')) {
          optionsInSubString = option.split(',');
          allOptions = [...allOptions, ...optionsInSubString];
        } else if (option) {
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
