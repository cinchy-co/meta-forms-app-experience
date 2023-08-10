import {
  BehaviorSubject,
  Observable,
  Subject
} from "rxjs";

import { Injectable } from "@angular/core";

import { Form } from "../dynamic-forms/models/cinchy-form.model";

import { INewEntityDialogResponse } from "../dynamic-forms/interface/new-entity-dialog-response";

import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";


@Injectable({
  providedIn: "root"
})
export class AppStateService {

  formMetadata: IFormMetadata;
  hasFormChanged: boolean;
  selectedOpportunityId: number;

  addNewEntityDialogClosed$ = new Subject<INewEntityDialogResponse>();
  childRecordUpdated$ = new Subject<void>();
  currentSection$ = new BehaviorSubject<string>(null);
  latestRenderedSections$ = new BehaviorSubject<IFormSectionMetadata[]>(null);

  parentFormSavedFromChild$ = new Subject<{
    childForm: Form,
    presetValues?: { [key: string]: any },
    title: string
  }>();


  /**
   * Notifies the view that an ID for the root form has been ingested so that the app can be initialized
   */
  rootFormIdSet$ = new BehaviorSubject<string>(null);

  /**
   * Notifies subscribers that a new record has been selected
   */
  onRecordSelected$ = new BehaviorSubject<{ cinchyId: number | null, doNotReloadForm: boolean }>(null);


  /**
   * The ID of the primary form, as provided by the query params when the application is bootstrapped. If there is a secondary form present,
   * either from the add new option dialog or because a child form is present, that ID is tracked independently
   */
  get formId(): string {

    return this._formId;
  }
  private _formId: string;


  /**
   * The ID of the currently-selected record on the root form in the main view container. The concept of a selected record is meaningless in the context of
   * creating a new record, and child forms will track their own selected record ID independently, if present.
   */
  get rowId(): number {

    return this._rowId;
  }
  private _rowId: number;


  setRootFormId(id: string): void {

    this._formId = id;

    this.rootFormIdSet$.next(this._formId);
  }


  setRecordSelected(cinchyId: number | null, doNotReloadForm: boolean = false): void {
    this._rowId = cinchyId;

    this.onRecordSelected$.next({ cinchyId, doNotReloadForm });

    if (cinchyId == null) {
      this.deleteConnectionQueryParams();
    }
    else {
      this.updateConnectionQueryParams(cinchyId);
    }

    // const messageJSON = {
    //   updateCinchyURLParams:
    //   {
    //     rowId: cinchyId
    //   }
    // };

    // window.parent.postMessage(JSON.stringify(messageJSON), '*');

    // Update URL with the new ID, if present
    if (window.location.search?.includes("rowId")) {
      const queryParams = window.location.search?.substr(1).split("&").map((paramString: string) => {

        const [key, value] = paramString.split("=");

        if (key === "rowId") {
          return `${key}=${cinchyId ? cinchyId.toString() : "null"}`;
        }
        else {
          return paramString;
        }
      });

      if (queryParams?.length) {
        const baseUrl = window.location.href.substr(0, window.location.href.indexOf("?"));

        window.history.replaceState(window.history.state, document.title, `${baseUrl}?${queryParams.join("&")}`);
      }
    }
    // else if (window.parent.location.search?.includes("rowId")) {
    //   const messageJSON = {
    //     updateCinchyURLParams:
    //     {
    //       rowId: cinchyId
    //     }
    //   };

    //   window.parent.postMessage(JSON.stringify(messageJSON), '*');
    // }

    sessionStorage.setItem("rowId", this._rowId ? this._rowId.toString() : "");
    sessionStorage.setItem("formId", this.formId ?? "");
  }

  updateConnectionQueryParams(id: number) {
    const messageJSON = {
      updateCinchyURLParams:
      {
        rowId: id
      }
    };
    const message = JSON.stringify(messageJSON);
    window.parent.postMessage(message, '*');

    // const existingUrl = this.getCurrentURLByRemovingLastSlash();
    // const queryParams = messageJSON['updateCinchyURLParams'];
    // const queryString = Object.keys(queryParams)
    //   .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    //   .join('&');

    // const urlWithQueryString = `${existingUrl}?${queryString}`;
    // window.history.pushState('', '', urlWithQueryString);
  }

  deleteConnectionQueryParams() {
    const messageJSON = {
      deleteCinchyURLParams:
        [
          'rowId'
        ]
    };
    const message = JSON.stringify(messageJSON);
    window.parent.postMessage(message, '*');

    const existingUrl = this.getCurrentURLByRemovingLastSlash();
    window.history.pushState('', '', existingUrl);
    sessionStorage.removeItem('rowId');
  }

  private getCurrentURLByRemovingLastSlash() {
    let existingUrl = window.location.href.split('?')[0];
    const existingUrlLength = existingUrl.length;
    const lastIndex = existingUrl.lastIndexOf('/');
    if (lastIndex !== -1 && lastIndex == (existingUrlLength - 1)) {
      existingUrl = existingUrl.substring(0, lastIndex) + existingUrl.substring(lastIndex + 1);
    }

    return existingUrl;
  }
}
