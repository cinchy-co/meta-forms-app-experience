import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";

import { CustomMaterialModule } from "../custom-material.module";
import { CinchyDynamicFormsModule } from "../dynamic-forms/cinchy-dynamic-forms.module";
import { SharedModule } from "../shared/shared.module";


@NgModule({
  imports: [
    BrowserModule,
    CustomMaterialModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CinchyDynamicFormsModule
  ],
  declarations: [],
  providers: [],
  exports: []
})
export class DialogsModule {}
