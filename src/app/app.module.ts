import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import {CoreModule} from './core/core.module';
import {PagesModule} from './pages/pages.module';
import {HttpClientModule} from '@angular/common/http';
import {AppRoutingModule} from './app-routing.module';
import {DialogsModule} from './dialogs/dialogs.module';
import {CustomMaterialModule} from './custom-material.module';
import {CinchyConfig, CinchyModule, CinchyService} from '@cinchy-co/angular-sdk';
import {AppComponent} from './app.component';
import {CinchyDynamicFormsModule} from "./dynamic-forms/cinchy-dynamic-forms.module";
import {NgxSpinnerModule} from "ngx-spinner";
import {AceEditorModule} from 'ng2-ace-editor';
import {NumeralModule} from "ngx-numeral";
import {ConfigService} from "./config.service";
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import {SectionService} from './services/section-service';


export function appLoadFactory(config: ConfigService) {
  return () => config.loadConfig().toPromise();
}

export function getBaseUrl() {
  return document.getElementsByTagName('base')[0].href;
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
    { provide: 'BASE_URL', useFactory: getBaseUrl },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
