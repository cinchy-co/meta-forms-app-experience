import { Subscription } from "rxjs";

import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";

import { IFormSectionMetadata } from "../../models/form-section-metadata.model";

import { TextFormatType } from "../enums/text-format-type.enum";

import { IFieldChangedEvent } from "../interface/field-changed-event";

import { Form } from "../models/cinchy-form.model";
import { FormField } from "../models/cinchy-form-field.model";
import { FormSection } from "../models/cinchy-form-section.model";
import { SpinnerCondition } from "../models/cinchy-spinner.model";

import { AppStateService } from "../../services/app-state.service";

import { isNullOrUndefined } from "util";


@Component({
  selector: "app-fields-wrapper",
  templateUrl: "./fields-wrapper.component.html",
  styleUrls: ["./fields-wrapper.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class FieldsWrapperComponent {

  @Input() form: Form;
  @Input() isChild: boolean;
  @Input() fieldsWithErrors;

  @Input()
  get formHasDataLoaded(): boolean {

    return this._formHasDataLoaded;
  }
  set formHasDataLoaded(value: boolean) {

    if (value) {
      this.determineSectionsToRender();
    }

    this._formHasDataLoaded = value;
  }
  private _formHasDataLoaded: boolean;


  @Output() onChange = new EventEmitter<IFieldChangedEvent>();
  @Output() childRowDeleted = new EventEmitter<{
    childForm: Form,
    rowId: number,
    sectionIndex: number
  }>();
  @Output() childFormOpened = new EventEmitter<any>();


  subscription: Subscription;
  sectionInfo: SpinnerCondition;


  constructor(
    private _appStateService: AppStateService,
  ) {}


  determineSectionsToRender() {

    this.form?.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        if (field.childForm?.flatten && field.childForm.sections) {
          this.form.updateFieldAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              propertyName: "childForm",
              propertyValue: field.childForm.flattenForm()
            }
          );
        }
      });
    });
  }


  onPanelExpanded(section: FormSection): void {

    this._appStateService.currentSection$.next(section.label);
  }


  richTextUseJson(field: FormField): boolean {

    return (field.cinchyColumn.textFormat !== TextFormatType.HTML);
  }


  usePlaintext(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && isNullOrUndefined(field.cinchyColumn.textFormat) && field.cinchyColumn.textColumnMaxLength <= 500)
  }


  useRichText(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && !isNullOrUndefined(field.cinchyColumn.textFormat));
  }


  useTextarea(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && isNullOrUndefined(field.cinchyColumn.textFormat) && field.cinchyColumn.textColumnMaxLength > 500);
  }
}
