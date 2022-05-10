import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {forkJoin, of} from 'rxjs';
import {catchError, concatMap, tap} from 'rxjs/operators';
import { CinchyConfig } from '@cinchy-co/angular-sdk';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private _enviornmentConfig: CinchyConfig;
  private _cinchyVersion: string;
  fullScreenHeight;

  constructor(private http: HttpClient, @Inject('BASE_URL') private baseUrl: string) {
    window.addEventListener('message', this.receiveMessage, false);
    this.setRowAndFormId();
  }

  setRowAndFormId() {
    let formId = this.getQueryStringValue('formId', window.location.search);
    let rowId = this.getQueryStringValue('rowId', window.location.search);
    if (!rowId) {
      formId = this.getQueryStringValue('formId', document.referrer);
      rowId = this.getQueryStringValue('rowId', document.referrer);
    }
    formId && sessionStorage.setItem('formId', formId);

    if(!sessionStorage.getItem('rowId') || rowId){
      rowId && rowId != "null" ? sessionStorage.setItem('rowId', rowId) : sessionStorage.setItem('rowId', null);
    }
    console.log('Row id config', rowId, 'session',  sessionStorage.getItem('rowId'));
  }

  getQueryStringValue(key, url) {
    return decodeURIComponent(url.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
  }

  get envConfig(): CinchyConfig {
    return this._enviornmentConfig;
  }

  get cinchyVersion(): string {
    return this._cinchyVersion;
  }

  loadConfig() {
    return forkJoin([this.getEnvironmentConfig()]);
  }

  getEnvironmentConfig() {
    const url = `${this.baseUrl}assets/config/config.json`;
    return this.http
      .get<any>(url).pipe(
        tap(configResp => {
          this._enviornmentConfig = configResp;
        }),
        concatMap(configResp => { 
          return this.http.get(configResp.cinchyRootUrl.replace(/\/$/, "") + '/healthcheck').pipe(
            catchError(err => { console.warn('Could not execute healthcheck endpoint', err); return of(null); }),
            tap(healthcheckResp => this._cinchyVersion = healthcheckResp ? healthcheckResp['version'] : null )
          );
        })
        );
  }

  receiveMessage(event) {
    if (event.data.toString().startsWith('[Cinchy][innerHeight]')) {
      this.fullScreenHeight = parseInt(event.data.toString().substring(21), 10) + 4;
      console.log('receiveMessage  IF', this.fullScreenHeight)
      localStorage.setItem('fullScreenHeight', this.fullScreenHeight.toString());
      const elements = document.getElementsByClassName('full-height-element');
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < elements.length; i++) {
        setTimeout(() => {
          if(window.location !== window.parent.location){
            elements[i]['style'].height = this.fullScreenHeight + 'px';
          }
        }, 500)
      }
    }
  }
}
