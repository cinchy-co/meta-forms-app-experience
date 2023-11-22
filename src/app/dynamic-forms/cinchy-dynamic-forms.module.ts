import { ScrollingModule } from "@angular/cdk/scrolling";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { DatePipe } from "@angular/common";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CinchyModule } from "@cinchy-co/angular-sdk";
import { CustomMaterialModule } from "../custom-material.module";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { DigitOnlyModule } from "@uiowa/digit-only";

import { AngularMultiSelectModule } from "angular2-multiselect-dropdown";

import { AceEditorModule } from "ng2-ace-editor";

import { FilterPipeModule } from "ngx-filter-pipe";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { NgxSelectModule, INgxSelectOptions } from "ngx-select-ex";
import { NgxSpinnerModule } from "ngx-spinner";
import { ToastrModule } from "ngx-toastr";

import { AddRichTextImageDialogComponent } from "./dialogs/add-rich-text-image/add-rich-text-image.component";
import { AddRichTextLinkDialogComponent } from "./dialogs/add-rich-text-link/add-rich-text-link.component";
import { ExportSettingsDialogComponent } from "./dialogs/export-settings/export-settings.component";

import { FieldsWrapperComponent } from "./fields-wrapper/fields-wrapper.component";
import { AttachFileComponent } from "./fields/attach-file/attach-file.component";
import { CheckboxComponent } from "./fields/checkbox/checkbox.component";
import { ChildFormComponent } from "./fields/child-form/child-form.component";
import { ChildFormTableComponent} from "./fields/child-form-table/child-form-table.component";
import { ChoiceComponent } from "./fields/choice/choice.component";
import { DatetimeComponent } from "./fields/datetime/datetime.component";
import { LinkComponent } from "./fields/link/link.component";
import { LinkMultichoiceComponent } from "./fields/link-multichoice/link-multichoice.component";
import { MultichoiceComponent } from "./fields/multichoice/multichoice.component";
import { NumberComponent } from "./fields/number/number.component";
import { RichTextComponent } from "./fields/rich-text/rich-text.component";
import { TextboxComponent } from "./fields/textbox/textbox.component";
import { TextareaComponent } from "./fields/textarea/textarea.component";
import { CinchyDynamicFormsComponent } from "./cinchy-dynamic-forms.component";

import { KeysPipe } from "./pipes/cinchy-column-key.pipe";

import { SharedModule } from "../shared/shared.module";

import { MessageDialogComponent } from "./message-dialog/message-dialog.component";

import "brace";
import "brace/index";
import "brace/ext/language_tools";
import "brace/snippets/text";
import "brace/snippets/html";
import "brace/snippets/javascript";
import "brace/snippets/json";
import "brace/snippets/sql";
import "brace/snippets/sqlserver";
import "ace-builds/webpack-resolver";
import "brace/snippets/xml";

window["ace"]["require"] = window["ace"]["acequire"];


//#region Select Dropdownlist options
// Check the interface for more options
const CustomSelectOptions: INgxSelectOptions = {
  optionValueField : "id",
  optionTextField  : "label",
  keepSelectedItems: true
};
//#endregion



@NgModule({
  declarations: [
    AddRichTextImageDialogComponent,
    AddRichTextLinkDialogComponent,
    AttachFileComponent,
    CheckboxComponent,
    ChildFormComponent,
    ChildFormTableComponent,
    ChoiceComponent,
    CinchyDynamicFormsComponent,
    DatetimeComponent,
    ExportSettingsDialogComponent,
    FieldsWrapperComponent,
    KeysPipe,
    LinkComponent,
    LinkMultichoiceComponent,
    MessageDialogComponent,
    MultichoiceComponent,
    NumberComponent,
    RichTextComponent,
    TextareaComponent,
    TextboxComponent
  ],
  imports: [
    CinchyModule.forRoot(),
    AceEditorModule,
    AngularMultiSelectModule,
    BrowserAnimationsModule,
    BrowserModule,
    CustomMaterialModule,
    DigitOnlyModule,
    FilterPipeModule,
    FontAwesomeModule,
    FormsModule,
    NgbModule,
    NgxMatSelectSearchModule,
    NgxSelectModule.forRoot(CustomSelectOptions),
    NgxSpinnerModule,
    ReactiveFormsModule,
    ScrollingModule,
    SharedModule,
    ToastrModule.forRoot({
      timeOut          : 5000,
      closeButton      : true,
      preventDuplicates: true
    })
  ],
  exports: [
    CinchyDynamicFormsComponent
  ],
  providers: [
    CinchyModule,
    DatePipe
  ],
  bootstrap: []
})
export class CinchyDynamicFormsModule {}
