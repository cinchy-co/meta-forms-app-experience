import { APP_INITIALIZER, NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CinchyConfig, CinchyModule, CinchyService } from "@cinchy-co/angular-sdk";

import { AceEditorModule } from "ng2-ace-editor";
import { NumeralModule } from "ngx-numeral";
import { NgxSpinnerModule } from "ngx-spinner";

import { AppRoutingModule } from "./app-routing.module";
import { CoreModule } from "./core/core.module";
import { CustomMaterialModule } from "./custom-material.module";
import { DialogsModule } from "./dialogs/dialogs.module";
import { PagesModule } from "./pages/pages.module";
import {CinchyDynamicFormsModule} from "./dynamic-forms/cinchy-dynamic-forms.module";

import { ConfigService } from "./services/config.service";
import { SectionService } from "./services/section-service";

import { AppComponent } from "./app.component";


export function appLoadFactory(config: ConfigService) {

  return () => config.loadConfig().toPromise();
}

export function getBaseUrl() {

  return document.getElementsByTagName("base")[0].href;
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    CoreModule,
    PagesModule,
    DialogsModule,
    CustomMaterialModule,
    CinchyDynamicFormsModule,
    CinchyModule.forRoot(),
    NgxSpinnerModule,
    AceEditorModule,
    MatDatepickerModule,
    MatInputModule,
    NumeralModule.forRoot()
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
    SectionService,
    {
      provide: CinchyConfig,
      useFactory: (config: ConfigService) => {
        return config.envConfig;
      },
      deps: [ConfigService]
    },
    { provide: "BASE_URL", useFactory: getBaseUrl },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
