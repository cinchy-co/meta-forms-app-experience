import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { SpinnerCondition } from '../dynamic-forms/models/cinchy-spinner.model';

@Injectable()
export class SectionService {

  private subSpinner = new Subject();
  subjSpinner$ = this.subSpinner.asObservable();


  setCondition(spinnerConditions: SpinnerCondition) {
    this.subSpinner.next(spinnerConditions);
  }

}