import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatTableModule } from "@angular/material/table";
import { MatInputModule } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { FilterPipeModule } from "ngx-filter-pipe";
import { CinchyModule } from "@cinchy-co/angular-sdk";
import { NgxSelectModule, INgxSelectOptions } from "ngx-select-ex";
import { NgxSpinnerModule } from "ngx-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { MatExpansionModule } from "@angular/material/expansion";
import { ToastrModule } from "ngx-toastr";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { DigitOnlyModule } from "@uiowa/digit-only";

//#region Custom
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

//#region Pipes for the forms
import { KeysPipe } from "./pipes/cinchy-column-key.pipe";
import { AngularMultiSelectModule } from "angular2-multiselect-dropdown";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { FieldsWrapperComponent } from "./fields-wrapper/fields-wrapper.component";
import { MessageDialogComponent } from "./message-dialog/message-dialog.component";
import { SharedModule } from "../shared/shared.module";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import "brace";
import "brace/index";
import "brace/ext/language_tools";
import "brace/snippets/text";
import "brace/snippets/sql";
import "brace/snippets/html";
import "brace/snippets/sqlserver";
import "brace/snippets/javascript";
import "brace/snippets/xml";
import "brace/snippets/json";
import { AceEditorModule } from "ng2-ace-editor";
import "ace-builds/webpack-resolver";
import { DatePipe } from "@angular/common";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

window["ace"]["require"] = window["ace"]["acequire"];
//#endregion

//#region Select Dropdownlist options
const CustomSelectOptions: INgxSelectOptions = { // Check the interface for more options
  optionValueField : "id",
  optionTextField  : "label",
  keepSelectedItems: true
};
//#endregion


@NgModule({
  declarations   : [
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
    RichTextComponent,
    TextareaComponent,
    TextboxComponent,
    NumberComponent,
    KeysPipe
  ],
  imports        : [
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
  entryComponents: [ChildFormComponent, MessageDialogComponent],
  providers      : [CinchyModule, DatePipe],
  bootstrap      : []
})
export class CinchyDynamicFormsModule {}
