import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { SectionService } from 'src/app/services/shared-service';
import { AppStateService } from '../../services/app-state.service';

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


  constructor(private appStateService: AppStateService, private shared : SectionService) {
    this.subscription =  shared.subj$.subscribe(nonexpandedSection =>{
      this.enableNonExpandedSection = nonexpandedSection;
      })  
      this.subscription =  shared.subjExpanded$.subscribe(expandedSection =>{
        this.enableExpandedSection = expandedSection;
      })     
   } // AppState service is outside of Dynamic forms

  ngOnInit(): void {
  }

  expansionClicked(section) {
    this.setSpinner();
    this.appStateService.sectionClicked(section.label);
  }

  setSpinner(){
    let nonExpandedIndex = null;
    let expandedIndex = null;
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
        if(this.formSections[nonExpandedIndex] != null){
              if(this.formSections[nonExpandedIndex]!= null){
                this.showSpinner = true;
              }else{
                this.showSpinner = false;
              }
        }
      }
  }
}
