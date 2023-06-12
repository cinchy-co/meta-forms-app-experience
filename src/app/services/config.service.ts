import { forkJoin, of } from "rxjs";
import { catchError, concatMap, tap } from "rxjs/operators";

import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { CinchyConfig } from "@cinchy-co/angular-sdk";

import { IframeUtil } from "../util/iframe-util";


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
  ) {

    window.addEventListener("message", this.receiveMessage, false);

    if (localStorage.getItem("fullScreenHeight")) {
      IframeUtil.setFrameHeight(localStorage.getItem("fullScreenHeight"));
    }
  }


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
          }
        ),
        concatMap(
          (configResponse) => {

            return this.http.get(configResponse.cinchyRootUrl.replace(/\/$/, "") + "/healthcheck")
              .pipe(
                catchError(
                  (error) => {

                    console.warn("Could not execute healthcheck endpoint", error);

                    return of(null);
                  }
                ),
                tap(
                  (healthcheckResp) => {

                    this._cinchyVersion = healthcheckResp ? healthcheckResp["version"] : null
                  }
                )
              );
          }
        )
      );
  }


  /**
   * Receive the screen height from the wrapping element
   */
  receiveMessage(event): void {

    if (event.data.toString().startsWith("[Cinchy][innerHeight]")) {
          const fullScreenHeight = parseInt(event.data.toString().substring(21), 10) + 4;

          IframeUtil.setFrameHeight(fullScreenHeight.toString());
    }
  }
}
