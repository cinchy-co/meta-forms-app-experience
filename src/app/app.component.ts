import { Subscription } from "rxjs";

import { NavigationStart, Router, RouterEvent } from "@angular/router";
import { Component, HostListener, OnDestroy, OnInit} from "@angular/core";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { AppStateService } from "./services/app-state.service";


@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnDestroy, OnInit {

  loginDone: boolean;


  private _routerEventSubscription: Subscription


  constructor(
      private router: Router,
      private cinchyService: CinchyService,
      private appStateService: AppStateService
  ) {

    this._routerEventSubscription = this.router.events.subscribe({
      next: (event: RouterEvent) => {

        // This is used if the incoming URL causes an immediate reload which would otherwise destroy the queryparams
        if (event instanceof NavigationStart && !this.loginDone) {
          this.setRowAndFormId();
        }
      }
    });
  }


  ngOnDestroy(): void {

    this._routerEventSubscription.unsubscribe();
  }


  ngOnInit(): void {

    this.cinchyService.checkIfSessionValid().toPromise().then((response: { accessTokenIsValid: boolean }) => {

      if (response.accessTokenIsValid) {
        this.loadRoute();
      } else {
        this.cinchyService.login().then(
          (success: boolean) => {

            if (success) {
              this.loadRoute();
            }
          },
          (error: any) => {

            console.error("Could not login: ", error)
          }
        );
      }
    });
  }


  /**
   * Gets the numerical rowId associated with this session regardless of its source
   */
  getIdFromSessionOrUri(uri: string, key: string): number {

    let idAsString: string;
    let idAsNumber: number;

    if (uri) {
      idAsString = this.getQueryStringValue("rowId", uri); 
    }

    if (idAsString) {
      try {
        idAsNumber = parseInt(idAsString);

        return idAsNumber;
      }
      catch (error) {
        // Since the given ID isn't valid, ignore it and move on
      }
    }

    idAsString = sessionStorage.getItem(key);

    // We are intentionally performing this action twice so that we can guarantee a fallback in cases where the given rowId is mangled
    // and cases where it is not provided in the queryParams
    if (idAsString) {
      try {
        idAsNumber = parseInt(idAsString);

        return idAsNumber;
      }
      catch (error) {
        return null;
      }
    }

    return null;
  }


  /**
   * Pulls the value with the target key out of the querystring
   */
  getQueryStringValue(key: string, uri: string): string {

    const value = decodeURIComponent(uri.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));

    // Covers the case where there is an ID stored in the session but the queryString explicitly requests to clear it
    if (value === "null") {
      sessionStorage.removeItem(key);
    }

    return (value && value !== "null") ? value : null;
  }


  /**
   * Initializes the view and sets the appropriate session state
   */
  loadRoute(): void {

    // This will be the second call to this function if the router catches an involuntary redirect,
    // but will be the first call if the entry URL is correctly formed and the session doesn't need
    // to refresh
    this.setRowAndFormId();

    this.loginDone = true;

    this.router.navigate(["/edit-form"], { queryParamsHandling: "merge" });
  }


  /**
   * Retrieves the rowId and formId from the URL and ensures the session is up to date
   */
  setRowAndFormId() {

    const uri = window.location.search;
    const parentUri = (window.location === window.parent.location) ? window.location.search : window.parent.location.search;

    // If the app is embedded, it's possible that the querystring can be passed in through the parent's queryParams, so we need to check to
    // see if the formId is present there, and then use those if that is the case. If the app is not embedded, or if the parent instead sets
    // the embedded frame's target using the querystring, then we use this window's queryParams instead
    const resolvedUri = parentUri?.includes("formId") ? parentUri : uri;

    this.appStateService.setRootFormId(resolvedUri ? this.getQueryStringValue("formId", resolvedUri) : sessionStorage.getItem("formId"));
    this.appStateService.setRecordSelected(this.getIdFromSessionOrUri(resolvedUri, "rowId"));
  }
}
