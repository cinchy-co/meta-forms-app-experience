import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {SidenavComponent} from './sidenav/sidenav.component';
import {RouterModule} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {CustomMaterialModule} from '../custom-material.module';
import {NgxSpinnerModule} from "ngx-spinner";


@NgModule({
  declarations: [
    SidenavComponent],
  imports: [
    BrowserModule, // Used for async pipes
    RouterModule,
    SharedModule,
    CustomMaterialModule,
    NgxSpinnerModule
  ],
  exports: [
    SidenavComponent
  ],
  providers: []
})
export class CoreModule {
}
