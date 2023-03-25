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

  @HostListener("window:beforeunload", ["$event"])
  beforeUnloadHandler($event) {
    if (this.appStateService.hasFormChanged) {
      $event.returnValue = "Are you sure you want to exit? You may have some unsaved changes";
    }
  }


  fullScreenHeight = 400;
  loginDone;


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

    if (localStorage.getItem("fullScreenHeight")) {
      this.fullScreenHeight = parseInt(localStorage.getItem("fullScreenHeight"), 10);
      this.setHeight();
    } else {
      window.addEventListener("message", this.receiveMessage, false);
    }

    this.cinchyService.checkIfSessionValid().toPromise().then(response => {
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

    let id: string;

    if (uri) {
      id = this.getQueryStringValue("rowId", uri); 
    }

    if (id) {
      return +id;
    }

    id = sessionStorage.getItem(key);

    return (id ? parseInt(id) : null);
  }


  /**
   * Pulls the value with the target key out of the querystring
   */
  getQueryStringValue(key: string, uri: string): string {

    const idFromUri = decodeURIComponent(uri.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));

    return (idFromUri && idFromUri !== "null") ? idFromUri : null;
  }


  /**
   * Initializes the view and sets the appropriate session state
   */
  loadRoute(): void {

    if (localStorage.getItem("fullScreenHeight")) {
      this.fullScreenHeight = parseInt(localStorage.getItem("fullScreenHeight"), 10);

      console.log("Login Success!");
    }

    // This will be the second call to this function if the router catches an involuntary redirect,
    // but will be the first call if the entry URL is correctly formed and the session doesn't need
    // to refresh
    this.setRowAndFormId();

    this.loginDone = true;

    this.router.navigate(["/edit-form"], { queryParamsHandling: "merge" });
  }


  /**
   * Receive the screen height from the wrapping element
   */
  receiveMessage(event): void {

    if (event.data.toString().startsWith("[Cinchy][innerHeight]")) {
      this.fullScreenHeight = parseInt(event.data.toString().substring(21), 10) + 4;

      localStorage.setItem("fullScreenHeight", this.fullScreenHeight.toString());

      this.setHeight();
    }
  }


  /**
   * Retrieves the rowId and formId from the URL and ensures the session is up to date
   */
  setRowAndFormId() {

    const uri = window.location.search;

    this.appStateService.formId = uri ? this.getQueryStringValue("formId", uri) : sessionStorage.getItem("formId");
    this.appStateService.rowId = this.getIdFromSessionOrUri(uri, "rowId");

    sessionStorage.setItem("formId", this.appStateService.formId ? this.appStateService.formId.toString() : "");
    sessionStorage.setItem("rowId", this.appStateService.rowId ? this.appStateService.rowId.toString() : "");
  }


  setHeight() {

    const elements = document.getElementsByClassName("full-height-element");

    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {

        if (this.appStateService.iniFrame()) {
          elements[i]["style"].height = this.fullScreenHeight + "px";
        }
      }, 500);
    }
  }
}
