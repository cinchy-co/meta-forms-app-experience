import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SharedModule} from '../shared/shared.module';
import {CustomMaterialModule} from '../custom-material.module';
import {FormWrapperComponent} from './form-wrapper/form-wrapper.component';
import {CinchyDynamicFormsModule} from "../dynamic-forms/cinchy-dynamic-forms.module";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {NgxSpinnerModule} from "ngx-spinner";
import {CoreModule} from "../core/core.module";
import {SaveSuccessComponent} from './save-success/save-success.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';

@NgModule({
  declarations: [
    FormWrapperComponent,
    SaveSuccessComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CustomMaterialModule,
    CinchyDynamicFormsModule,
    FontAwesomeModule,
    NgxSpinnerModule,
    MatDatepickerModule,
    MatInputModule,
    CoreModule
  ],
  exports: [],
  providers: []
})
export class PagesModule {
}
