import { APP_INITIALIZER, NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CinchyConfig, CinchyModule, CinchyService } from "@cinchy-co/angular-sdk";

import { NumeralModule } from "ngx-numeral";
import { NgxSpinnerModule } from "ngx-spinner";
import { ToastrModule } from "ngx-toastr";

import { AppComponent } from "./app.component";

import { AppRoutingModule } from "./app-routing.module";
import { CinchyDynamicFormsModule } from "./dynamic-forms/cinchy-dynamic-forms.module";
import { CoreModule } from "./core/core.module";
import { CustomMaterialModule } from "./custom-material.module";

import { ConfigService } from "./services/config.service";
import {FormWrapperComponent} from "./pages/form-wrapper/form-wrapper.component";


export function appLoadFactory(config: ConfigService) {

  return () => config.loadConfig().toPromise();
}


export function getBaseUrl() {

  return document.getElementsByTagName("base")[0].href;
}


@NgModule({
  declarations: [
    AppComponent,
    FormWrapperComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    CustomMaterialModule,
    CinchyDynamicFormsModule,
    CinchyModule.forRoot(),
    HttpClientModule,
    NgxSpinnerModule,
    MatDatepickerModule,
    MatInputModule,
    NumeralModule.forRoot(),
    ToastrModule.forRoot({
      closeButton: true,
      enableHtml: true,
      preventDuplicates: true,
      tapToDismiss: false
    })
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appLoadFactory,
      deps: [ConfigService],
      multi: true
    },
    CinchyModule,
    CinchyService,
    {
      provide: CinchyConfig,
      useFactory: (config: ConfigService) => {
        return config.envConfig;
      },
      deps: [
        ConfigService
      ]
    },
    {
      provide: "BASE_URL",
      useFactory: getBaseUrl
    }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {}
