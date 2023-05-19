import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {FormWrapperComponent} from "./pages/form-wrapper/form-wrapper.component";
import {SaveSuccessComponent} from "./pages/save-success/save-success.component";


const routes: Routes = [
  {
    path: "",
    redirectTo: "edit-form",
    pathMatch: "full"
  },
  {
    path: "edit-form",
    component: FormWrapperComponent
  },
  {
    path: "save-success",
    component: SaveSuccessComponent
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
