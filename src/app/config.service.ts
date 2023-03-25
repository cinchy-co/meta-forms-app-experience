import {HttpClient} from "@angular/common/http";
import {Inject, Injectable} from "@angular/core";
import {forkJoin, of} from "rxjs";
import {catchError, concatMap, tap} from "rxjs/operators";
import { CinchyConfig } from "@cinchy-co/angular-sdk";

@Injectable({
  providedIn: "root",
})
export class ConfigService {

  get cinchyVersion(): string {

    return this._cinchyVersion;
  }
  private _cinchyVersion: string;


  get envConfig(): CinchyConfig {

    return this._enviornmentConfig;
  }
  private _enviornmentConfig: CinchyConfig;


  constructor(
    private http: HttpClient,
    @Inject("BASE_URL") private baseUrl: string
  ) {}


  loadConfig() {
    return forkJoin([this.getEnvironmentConfig()]);
  }

  getEnvironmentConfig() {

    const url = `${this.baseUrl}assets/config/config.json`;

    return this.http.get<any>(url)
      .pipe(
        tap(
          (configResponse) => {

            this._enviornmentConfig = configResponse;
        }),
        concatMap(
          (configResponse) => {

          return this.http.get(configResponse.cinchyRootUrl.replace(/\/$/, "") + "/healthcheck").pipe(
            catchError(err => { console.warn("Could not execute healthcheck endpoint", err); return of(null); }),
            tap(healthcheckResp => this._cinchyVersion = healthcheckResp ? healthcheckResp["version"] : null )
          );
        })
    );
  }
}
