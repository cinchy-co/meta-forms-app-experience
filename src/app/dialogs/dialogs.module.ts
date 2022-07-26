import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CustomMaterialModule} from '../custom-material.module';
import {SharedModule} from '../shared/shared.module';

import {AddNewContactDialogComponent} from './add-new-contact-dialog/add-new-contact-dialog.component';
import {AddNewOptionDialogComponent} from './add-new-option-dialog/add-new-option-dialog.component';
import {CinchyDynamicFormsModule} from "../dynamic-forms/cinchy-dynamic-forms.module";


@NgModule({
  imports: [
    BrowserModule,
    CustomMaterialModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CinchyDynamicFormsModule
  ],
  declarations: [
    AddNewContactDialogComponent,
    AddNewOptionDialogComponent
  ],
  entryComponents: [
    AddNewContactDialogComponent,
    AddNewOptionDialogComponent
  ],
  providers: [],
  exports: []
})

export class DialogsModule {
}
