import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import { IFormMetadata } from '../models/form-metadata-model';
import { IFormSectionMetadata } from '../models/form-section-metadata.model';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  formMetadata: IFormMetadata;
  hasFormChanged: boolean;
  selectedOpportunityId: number;

  formId: string;
  rowId: number;

  childRecordUpdated$ = new Subject<boolean>();
  currentSection$ = new BehaviorSubject<string>(null);
  lastRecordSelect$ = new BehaviorSubject<{ cinchyId: number | null, doNotReloadForm: boolean }>(null);
  latestRenderedSections$ = new BehaviorSubject<IFormSectionMetadata[]>(null);
  newContactAdded$ = new Subject<any>();
  saveClicked$ = new BehaviorSubject<boolean>(null);
  savedParentFromChildPlus$ = new Subject<boolean>();


  getChildRecordUpdateState(): Observable<boolean> {

    return this.childRecordUpdated$.asObservable();
  }


  getCurrentSectionClicked(): Observable<any> {

    return this.currentSection$.asObservable();
  }


  getLatestRenderedSections(): Observable<IFormSectionMetadata[]> {

    return this.latestRenderedSections$.asObservable();
  }


  getNewContactAdded(): Observable<any> {

    return this.newContactAdded$.asObservable();
  }


  getOpenOfChildFormAfterParentSave(): Observable<any> {

    return this.savedParentFromChildPlus$.asObservable();
  }


  getSaveClickedObs(): Observable<any> {

    return this.saveClicked$.asObservable();
  }


  iniFrame() {

    return window.location !== window.parent.location;
  }


  newContactAdded(contact) {

    this.newContactAdded$.next(contact);
  }


  onRecordSelected(): Observable<{ cinchyId: number | null, doNotReloadForm: boolean }> {

    return this.lastRecordSelect$.asObservable();
  }


  saveClicked(sectionName) {

    this.saveClicked$.next(sectionName);
  }


  sectionClicked(sectionName) {

    this.currentSection$.next(sectionName);
  }


  setChildRecordUpdateState(isUpdated) {

    this.childRecordUpdated$.next(isUpdated);
  }


  setOpenOfChildFormAfterParentSave(childData) {

    return this.savedParentFromChildPlus$.next(childData);
  }


  setLatestRenderedSections(sections: IFormSectionMetadata[]) {

    this.latestRenderedSections$.next(sections);
  }


  setRecordSelected(cinchyId: number | null, doNotReloadForm: boolean = false): void {

    this.lastRecordSelect$.next({ cinchyId, doNotReloadForm });
  }
}
