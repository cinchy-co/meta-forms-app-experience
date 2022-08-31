import {AfterViewInit, Component, Input, OnInit, ViewChild} from '@angular/core';

//#region Cinchy Dynamic Calculated field
/**
 * This section is used to create Calculated field of cinchy table.
 */
//#endregion
@Component({
  selector: 'cinchy-calculated',
  template: `
    <div class="full-width-element divMarginBottom">
      <div class="link-labels">
        <label class="calculatedStyle cinchy-label" [innerHTML]="field.label"
               [title]="field.caption ? field.caption : ''">
        </label>
        <mat-icon *ngIf="field.caption" class="info-icon"
                  ngbTooltip = "{{field.caption}}"
                  placement="top"
                  matTooltipClass="tool-tip-body"
                  matTooltipPosition="above"
                  aria-label="Button that displays a tooltip when focused or hovered over">
          info
        </mat-icon>
      </div>
      <ng-container *ngIf="!isFormatted">
        <label class="pre-formatted" *ngIf="!field.cinchyColumn.dataFormatType" [innerHTML]="field.value || '-'"></label>
        <label *ngIf="field.cinchyColumn.dataFormatType === 'Currency' && field.value" [innerHTML]="(field.value | currency) || '-'"></label>
      </ng-container>

      <ace-editor *ngIf="isFormatted" #editor style="height:450px;" [(text)]="field.value">
      </ace-editor>
    </div>
  `,
})
export class CalculatedDirective implements OnInit, AfterViewInit{
  @Input() field: any;
  isFormatted: boolean;
  @ViewChild('editor') editor;

  constructor() {

  }

  ngOnInit() {
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType;
    // console.log('FIELD CALCULATED', this.field);
  }

  ngAfterViewInit() {
    if (this.isFormatted) {
      this.editor.getEditor().setOptions({
        showLineNumbers: true,
        tabSize: 4,
        theme: 'ace/theme/sqlserver',
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightGutterLine:true
      });
      this.editor.mode = 'text';
      this.editor.value = this.field.value;
      this.editor.setReadOnly(true);
    }
  }
}
