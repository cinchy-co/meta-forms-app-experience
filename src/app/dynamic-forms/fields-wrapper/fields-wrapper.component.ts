import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { SectionService } from 'src/app/services/section-service';
import { AppStateService } from '../../services/app-state.service';
import { SpinnerCondition } from '../models/cinchy-spinner.model';

@Component({
  selector     : 'app-fields-wrapper',
  templateUrl  : './fields-wrapper.component.html',
  styleUrls    : ['./fields-wrapper.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FieldsWrapperComponent implements OnInit {
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
  subscription: Subscription;
  enableNonExpandedSection: any;
  enableExpandedSection: any = false;
  sectionInfo: SpinnerCondition;

  constructor(private appStateService: AppStateService, private shared : SectionService) {
    this.sectionInfo = new SpinnerCondition();
    this.sectionInfo.isExpanded = true;
    this.sectionInfo.isLoading = true;
    this.sectionInfo.isNonExpandedLoading = true;
    this.sectionInfo.sectionId = 0;

      this.subscription =  shared.subjSpinner$.subscribe(spinnerConditions =>{
        this.sectionInfo = spinnerConditions;
      }) 
   } // AppState service is outside of Dynamic forms

  ngOnInit(): void {
  }

  expansionClicked(section) {
    this.setSpinner();
    this.appStateService.sectionClicked(section.label);
  }

  setSpinner(){
    this.showSpinner = this.formSections?.findIndex(_ => !_.autoExpand) > -1;
  }
}