import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CustomMaterialModule} from "../custom-material.module";
import {SharedModule} from "../shared/shared.module";

import { AddNewEntityDialogComponent } from "./add-new-entity-dialog/add-new-entity-dialog.component";
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
    AddNewEntityDialogComponent
  ],
  entryComponents: [
    AddNewEntityDialogComponent
  ],
  providers: [],
  exports: []
})

export class DialogsModule {
}
