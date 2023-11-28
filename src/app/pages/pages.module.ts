import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { CinchyDynamicFormsModule } from "../dynamic-forms/cinchy-dynamic-forms.module";
import { CoreModule } from "../core/core.module";
import { CustomMaterialModule } from '../custom-material.module';
import { SharedModule } from '../shared/shared.module';

import { FormWrapperComponent } from './form-wrapper/form-wrapper.component';

import { NgxSpinnerModule } from "ngx-spinner";


@NgModule({
  declarations: [
    FormWrapperComponent
  ],
  imports: [
    BrowserModule,
    CoreModule,
    SharedModule,
    CinchyDynamicFormsModule,
    CustomMaterialModule,
    FontAwesomeModule,
    FormsModule,
    NgxSpinnerModule,
    ReactiveFormsModule
  ],
  exports: [],
  providers: []
})
export class PagesModule {}
