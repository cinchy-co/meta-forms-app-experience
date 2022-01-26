import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import { IFormMetadata } from '../models/form-metadata-model';
import { IFormSectionMetadata } from '../models/form-section-metadata.model';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  selectedOpportunityId: number;
  formId;
  rowId;
  newContactAdded$ = new Subject<any>();
  latestRenderedSections$ = new BehaviorSubject<IFormSectionMetadata[]>(null);
  currentSection$ = new BehaviorSubject<string>(null);
  saveClicked$ = new BehaviorSubject<boolean>(null);
  childRecordUpdated$ = new Subject<boolean>();
  isFormSaved: boolean;
  hasFormChanged: boolean;
  savedParentFromChildPlus$ = new Subject<boolean>();
  formMetadata: IFormMetadata;

  constructor() { }

  setLatestRenderedSections(sections: IFormSectionMetadata[]){
    this.latestRenderedSections$.next(sections);
  }

  getLatestRenderedSections(): Observable<IFormSectionMetadata[]> {
    return this.latestRenderedSections$.asObservable();
  }

  newContactAdded(contact){
    this.newContactAdded$.next(contact);
  }

  getNewContactAdded(): Observable<any> {
    return this.newContactAdded$.asObservable();
  }

  sectionClicked(sectionName) {
    this.currentSection$.next(sectionName);
  }

  getCurrentSectionClicked(): Observable<any> {
    return this.currentSection$.asObservable();
  }

  saveClicked(sectionName) {
    this.saveClicked$.next(sectionName);
  }

  getSaveClickedObs(): Observable<any> {
    return this.saveClicked$.asObservable();
  }

  setChildRecordUpdateState(isUpdated) {
    this.childRecordUpdated$.next(isUpdated);
  }

  getChildRecordUpdateState(): Observable<boolean> {
    return this.childRecordUpdated$.asObservable();
  }

  setOpenOfChildFormAfterParentSave(childData) {
    return this.savedParentFromChildPlus$.next(childData);
  }

  getOpenOfChildFormAfterParentSave(): Observable<any> {
    return this.savedParentFromChildPlus$.asObservable();
  }

  iniFrame() {
    return window.location !== window.parent.location;
  }
}
