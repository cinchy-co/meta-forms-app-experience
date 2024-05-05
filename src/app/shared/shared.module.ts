import { NgModule } from "@angular/core";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { RouterModule } from "@angular/router";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { CustomMaterialModule } from "../custom-material.module";

import { SearchDropdownComponent } from "./search-dropdown/search-dropdown.component";


@NgModule({
  declarations: [
    SearchDropdownComponent
  ],
  imports: [
    BrowserModule, // Used for async pipes
    CustomMaterialModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ScrollingModule
  ],
  exports: [
    SearchDropdownComponent
  ],
  providers: []
})
export class SharedModule {}
