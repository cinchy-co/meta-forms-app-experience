import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject, throwError} from 'rxjs';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {CinchyService} from '@cinchy-co/angular-sdk';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  selectedOpportunityId: number;
  formId;
  rowId;
  newContactAdded$ = new Subject<any>();
  currentSection$ = new BehaviorSubject<string>(null);
  saveClicked$ = new BehaviorSubject<boolean>(null);
  childRecordUpdated$ = new Subject<boolean>();
  isFormSaved: boolean;
  hasFormChanged: boolean;
  savedParentFromChildPlus$ = new Subject<boolean>();
  metaDataOfForm: any;

  constructor(private http: HttpClient, private cinchyService: CinchyService, private router: Router) {
  }


  setSelectedOpportunityId(opportunityId) {
    this.rowId = opportunityId;
    this.selectedOpportunityId = opportunityId;
  }

  getSelectedValueById(list, selectedId, findKey){
    return list.find(item => item[findKey] === selectedId);
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
