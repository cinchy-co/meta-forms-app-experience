import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { FormWrapperComponent } from "./pages/form-wrapper/form-wrapper.component";


const routes: Routes = [
  {
    path: "",
    redirectTo: "edit-form",
    pathMatch: "full"
  },
  {
    path: "edit-form",
    component: FormWrapperComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      {
        relativeLinkResolution: "legacy"
      }
    )
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {}
