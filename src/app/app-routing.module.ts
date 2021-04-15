import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {FormWrapperComponent} from './pages/form-wrapper/form-wrapper.component';
import {SaveSuccessComponent} from "./pages/save-success/save-success.component";


const routes: Routes = [
  {
    path: 'edit-form', // Had to change the route to keep deployment configuration same
    component: FormWrapperComponent
  },
  {
    path: 'save-success',
    component: SaveSuccessComponent
  },/*{
    path: '', redirectTo: '/deals-overview', pathMatch: 'full'
  }, {
    path: '**', component: FormWrapperComponent
  },*/
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
