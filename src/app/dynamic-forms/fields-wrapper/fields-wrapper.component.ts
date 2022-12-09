import { Subscription } from "rxjs";

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";

import { isNullOrUndefined } from "util";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";

import { IForm } from "../models/cinchy-form.model";
import { IFormField } from "../models/cinchy-form-field.model";
import { IFormSection } from "../models/cinchy-form-sections.model";
import { SpinnerCondition } from "../models/cinchy-spinner.model";

import { AppStateService } from "../../services/app-state.service";
import { TextFormatType } from "../enums/text-format-type.enum";


@Component({
  selector: "app-fields-wrapper",
  templateUrl: "./fields-wrapper.component.html",
  styleUrls: ["./fields-wrapper.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class FieldsWrapperComponent {
  @Input() form: IForm;
  @Input() rowId;
  @Input() isChild: boolean;
  @Input() fieldsWithErrors;
  @Input("formHasDataLoaded") set formHasDataLoaded(value: boolean) { this.setFormHasDataLoaded(value); }

  @Output() eventOccurred = new EventEmitter<any>();
  @Output() childFormOpened = new EventEmitter<any>();
  @Output() deleteDialogOpened = new EventEmitter<any>();

  _formSectionsToRenderMetadata: IFormSectionMetadata[] = [];

  _formHasDataLoaded: boolean;

  _sectionsToRender: IFormSection[];

  subscription: Subscription;
  sectionInfo: SpinnerCondition;

  constructor(
    private appStateService: AppStateService,
    private cdr: ChangeDetectorRef) {
  }


  expansionClicked(section) {
    this.appStateService.sectionClicked(section.label);
  }

  setFormHasDataLoaded(value: boolean) {
    if (value) {
      this.determineSectionsToRender();
    }
    this._formHasDataLoaded = value;
  }

  determineSectionsToRender() {
    let _newSectionsToRenderMetadata = [];
    let _newSectionsToRender = [];
    if (this.form?.sections) {
      for (let i = 0; i < this.form.sections.length; i++) {
        if (this.form.sections[i].fields) {
          let numOfFlattenedChildForms = 0;
          for (let j = 0; j < this.form.sections[i].fields.length; j++) {
            if (this.form.sections[i].fields[j].childForm?.flatten && this.form.sections[i].fields[j].childForm.sections) {
              numOfFlattenedChildForms++;
              for (let k = 0; k < this.form.sections[i].fields[j].childForm.sections.length; k++) {
                // Don't' auto expand the child column if this is an accordion form
                if (this.form.isAccordion)
                  this.form.sections[i].fields[j].childForm.sections[k].autoExpand = false;

                _newSectionsToRender.push(this.form.sections[i].fields[j].childForm.sections[k]);
                _newSectionsToRenderMetadata.push(<IFormSectionMetadata> {
                  id: this.form.sections[i].fields[j].childForm.sections[k].id,
                  name: this.form.sections[i].fields[j].childForm.sections[k].label,
                  columnsInRow: this.form.sections[i].fields[j].childForm.sections[k].columnsInRow,
                  autoExpand: this.form.sections[i].fields[j].childForm.sections[k].autoExpand
                });
              }
            }
          }
          if (this.form.sections[i].fields.length > numOfFlattenedChildForms || numOfFlattenedChildForms == 0) {
            _newSectionsToRender.push(this.form.sections[i]);
            _newSectionsToRenderMetadata.push(<IFormSectionMetadata> {
              id: this.form.sections[i].id,
              name: this.form.sections[i].label,
              columnsInRow: this.form.sections[i].columnsInRow,
              autoExpand: this.form.sections[i].autoExpand
            });
          }
        }
      }
    }
    this._formSectionsToRenderMetadata = _newSectionsToRenderMetadata;
    this._sectionsToRender = _newSectionsToRender;
    this.appStateService.setLatestRenderedSections(_newSectionsToRenderMetadata);
  }


  richTextUseJson(field: IFormField): boolean {

    return (field.cinchyColumn.textFormat !== TextFormatType.HTML);
  }


  usePlaintext(field: IFormField): boolean {

    return (field.cinchyColumn.dataType == "Text" && isNullOrUndefined(field.cinchyColumn.textFormat) && field.cinchyColumn.textColumnMaxLength <= 500)
  }


  useRichText(field: IFormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && !isNullOrUndefined(field.cinchyColumn.textFormat));
  }


  useTextarea(field: IFormField): boolean {

    return (field.cinchyColumn.dataType == "Text" && isNullOrUndefined(field.cinchyColumn.textFormat) && field.cinchyColumn.textColumnMaxLength > 500);
  }
}
