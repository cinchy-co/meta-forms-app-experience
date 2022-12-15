import { ScrollingModule } from "@angular/cdk/scrolling";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDialogModule } from "@angular/material/dialog";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSelectModule } from "@angular/material/select";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CinchyModule } from "@cinchy-co/angular-sdk";

import { AngularMultiSelectModule } from "angular2-multiselect-dropdown";

import { AceEditorModule } from "ng2-ace-editor";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { FilterPipeModule } from "ngx-filter-pipe";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { NgxSelectModule, INgxSelectOptions } from "ngx-select-ex";
import { NgxSpinnerModule } from "ngx-spinner";
import { ToastrModule } from "ngx-toastr";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { DigitOnlyModule } from "@uiowa/digit-only";

//#region Custom
import { AddRichTextLinkDialogComponent } from "./dialogs/add-rich-text-link/add-rich-text-link.component";
import { FieldsWrapperComponent } from "./fields-wrapper/fields-wrapper.component";
import { AttachFileComponent } from "./fields/attach-file/attach-file.component";
import { CalculatedComponent } from "./fields/calculated/calculated.component";
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
//#endregion

import { SharedModule } from "../shared/shared.module";

import { DatePipe } from "@angular/common";
import { KeysPipe } from "./pipes/cinchy-column-key.pipe";

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
  declarations   : [
    AddRichTextLinkDialogComponent,
    AttachFileComponent,
    CalculatedComponent,
    CheckboxComponent,
    ChildFormComponent,
    ChildFormTableComponent,
    ChoiceComponent,
    CinchyDynamicFormsComponent,
    DatetimeComponent,
    FieldsWrapperComponent,
    LinkComponent,
    LinkMultichoiceComponent,
    MessageDialogComponent,
    MultichoiceComponent,
    TextareaComponent,
    TextboxComponent,
    NumberComponent,
    RichTextComponent,
    KeysPipe
  ],
  imports: [
    BrowserModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    CinchyModule.forRoot(),
    MatCardModule,
    FilterPipeModule,
    NgxSelectModule.forRoot(CustomSelectOptions),
    NgxSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatExpansionModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut          : 5000,
      closeButton      : true,
      preventDuplicates: true
    }),
    FontAwesomeModule,
    AngularMultiSelectModule,
    DigitOnlyModule,
    ScrollingModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SharedModule,
    NgxMatSelectSearchModule,
    AceEditorModule,
    NgbModule
  ],
  exports        : [CinchyDynamicFormsComponent],
  entryComponents: [AddRichTextLinkDialogComponent, ChildFormComponent, MessageDialogComponent],
  providers      : [CinchyModule, DatePipe],
  bootstrap      : []
})
export class CinchyDynamicFormsModule {}
