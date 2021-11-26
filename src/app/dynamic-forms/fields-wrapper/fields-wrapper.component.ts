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

    if(this.form){
      if(this.form.sections[1]){
        if(this.form.sections[0].fields.length == 0){
          this.form = null;
          return;
        }
      if(this.form.sections[1].fields.length == 0){
        this.showSpinner = true;
      }else{
        this.showSpinner = false;
      }
    }
    }
  }
}
