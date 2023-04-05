import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {TypeaheadComponent} from './typeahead/typeahead.component';
import {CustomMaterialModule} from '../custom-material.module';
import {ReactiveFormsModule} from '@angular/forms';
import {NgxMatSelectSearchModule} from 'ngx-mat-select-search';
import {SearchDropdownComponent} from './search-dropdown/search-dropdown.component';
import {ScrollingModule} from '@angular/cdk/scrolling';


@NgModule({
  declarations: [
    TypeaheadComponent,
    SearchDropdownComponent
  ],
  imports: [
    BrowserModule, // Used for async pipes
    RouterModule,
    CustomMaterialModule,
    ReactiveFormsModule,
    NgxMatSelectSearchModule,
    ScrollingModule
  ],
  exports: [
    TypeaheadComponent,
    SearchDropdownComponent
  ],
  providers: []
})
export class SharedModule {}
