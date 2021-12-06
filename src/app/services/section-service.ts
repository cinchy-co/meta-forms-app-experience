import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class SectionService {

  private sub = new Subject();
  subj$ = this.sub.asObservable();

  private subj = new Subject();
  subjExpanded$ = this.subj.asObservable();

  setNonExpanded(value: boolean) {
    this.sub.next(value);
  }

  setExpanded(value: boolean) {
    this.subj.next(value);
  }

}