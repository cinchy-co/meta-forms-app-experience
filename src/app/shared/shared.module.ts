import { NgModule } from "@angular/core";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { RouterModule } from "@angular/router";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { CustomMaterialModule } from "../custom-material.module";

import { SearchDropdownComponent } from "./search-dropdown/search-dropdown.component";
import { TypeaheadComponent } from "./typeahead/typeahead.component";


@NgModule({
  declarations: [
    SearchDropdownComponent,
    TypeaheadComponent
  ],
  imports: [
    BrowserModule, // Used for async pipes
    CustomMaterialModule,
    NgxMatSelectSearchModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ScrollingModule
  ],
  exports: [
    TypeaheadComponent,
    SearchDropdownComponent
  ],
  providers: []
})
export class SharedModule {}
