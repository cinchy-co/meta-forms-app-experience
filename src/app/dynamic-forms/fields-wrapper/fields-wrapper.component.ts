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

  constructor(private appStateService: AppStateService) { } // AppState service is outside of Dynamic forms

  ngOnInit(): void {
  }

  expansionClicked(section) {
    this.appStateService.sectionClicked(section.label);
  }

  ngOnChanges(): void {
    console.log(this.formFieldMetaDatas);
  }
}
