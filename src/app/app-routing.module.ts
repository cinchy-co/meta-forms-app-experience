import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { FormWrapperComponent } from "./pages/form-wrapper/form-wrapper.component";


const routes: Routes = [
  {
    path: "**",
    component: FormWrapperComponent
  }
];


@NgModule({
  imports: [
    RouterModule.forRoot(
      routes
    )
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {}
