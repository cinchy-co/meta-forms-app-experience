import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector     : 'app-fields-wrapper',
  templateUrl  : './fields-wrapper.component.html',
  styleUrls    : ['./fields-wrapper.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FieldsWrapperComponent implements OnInit, OnChanges {
  @Input() form;
  @Input() rowId;
  @Input() formSections;
  @Input() isChild: boolean;
  @Input() fieldsWithErrors;
  @Input() hasChildTableAccess: boolean;
  @Input() formFieldMetaDatas: any = {};
  @Output() eventOccurred = new EventEmitter<any>();
  @Output() childFormOpened = new EventEmitter<any>();
  @Output() deleteDialogOpened = new EventEmitter<any>();
  public showSpinner = false;

  constructor(private appStateService: AppStateService) { } // AppState service is outside of Dynamic forms

  ngOnInit(): void {
  }

  expansionClicked(section) {
    if(this.form)
    {
      if(this.form.sections[1]){
        if(this.form.sections[1].fields.length == 0)
        {
          this.showSpinner = true;
        }
        else
        {
          this.showSpinner = false;
        }
      }
    }
    this.appStateService.sectionClicked(section.label);
  }

  ngOnChanges(): void {
    let nonExpandedIndex = null;
    let expandedIndex = null;
    if(this.form != null){
      if(this.formSections){
        this.formSections.forEach((element, index) => {
          if(nonExpandedIndex == null){
          if(element.autoExpand === false){
            nonExpandedIndex =index;
          }
        }
        if(expandedIndex == null){
          if(element.autoExpand === true){
            expandedIndex =index;
          }
        }
        });

        if(nonExpandedIndex == null){
          return;
        }
      if(this.form.sections[nonExpandedIndex]){
        if(this.form.sections[expandedIndex].fields.length == 0){
          this.form = null;
          return;
        }
      if(this.form.sections[nonExpandedIndex].fields.length == 0){
        this.showSpinner = true;
      }else{
        this.showSpinner = false;
      }
    }
    }
    }
  }
}
