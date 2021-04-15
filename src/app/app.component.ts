import {ActivatedRoute, Router} from '@angular/router';
import {ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {MediaMatcher} from '@angular/cdk/layout';
import {CinchyService} from '@cinchy-co/angular-sdk';
import {CinchyQueryService} from "./services/cinchy-query.service";
import {AppStateService} from "./services/app-state.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler($event) {
    if (this.appStateService.hasFormChanged) {
      $event.returnValue = "Are you sure you want to exit? You may have some unsaved changes";
    }
  }

  fullScreenHeight = 400;
  loginDone;

  constructor(private router: Router, changeDetectorRef: ChangeDetectorRef, media: MediaMatcher,
              private cinchyService: CinchyService, private cinchyQueryService: CinchyQueryService,
              private appStateService: AppStateService, private activatedRoute: ActivatedRoute) {
    this.setRowAndFormId();
  }

  setRowAndFormId() {
    let formId = this.getQueryStringValue('formId', window.location.search);
    let rowId = this.getQueryStringValue('rowId', window.location.search);
    if (!rowId) {
      formId = this.getQueryStringValue('formId', document.referrer);
      rowId = this.getQueryStringValue('rowId', document.referrer);
    }
    if(!sessionStorage.getItem('formId') || formId){
      formId && sessionStorage.setItem('formId', formId);
    }

    if(!sessionStorage.getItem('rowId') || rowId){
      rowId && rowId != "null" ? sessionStorage.setItem('rowId', rowId) : sessionStorage.setItem('rowId', null);
    }
    console.log('Row Id app', rowId, 'session',  sessionStorage.getItem('rowId'));

  }

  getQueryStringValue(key, url) {
    return decodeURIComponent(url.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
  }

  ngOnInit(): void {
    if (localStorage.getItem('fullScreenHeight')) {
      this.fullScreenHeight = parseInt(localStorage.getItem('fullScreenHeight'), 10);
      this.setHeight();
    }else{
      window.addEventListener('message', this.receiveMessage, false);
    }
    this.cinchyService.checkIfSessionValid().toPromise().then(response => {
      if (response.accessTokenIsValid) {
        this.loadRoute();
      } else {
        this.cinchyService.login().then(success => {
          if (success) {
            this.loadRoute();
          }
        }, error => {
          console.error('Could not login: ', error)
        });
      }
    });
  }

  loadRoute() {
    if (localStorage.getItem('fullScreenHeight')) {
      this.fullScreenHeight = parseInt(localStorage.getItem('fullScreenHeight'), 10);
      console.log('Login Success!');
    }
    if (!sessionStorage.getItem('rowId')) {
      this.setRowAndFormId();
    }
    this.setFormAndRowIdsAndNavigate();
    this.loginDone = true;
  }

  setFormAndRowIdsAndNavigate() {
    const {formId, rowId} = sessionStorage;
    this.appStateService.formId = formId;
    this.appStateService.rowId = rowId;
    this.router.navigate(['/edit-form'], {queryParamsHandling: "merge"});
  }

  setHeight() {
    console.log('set height  IF', this.fullScreenHeight)
    const elements = document.getElementsByClassName('full-height-element');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {
        if(this.appStateService.iniFrame()){
          elements[i]['style'].height = this.fullScreenHeight + 'px';
        }
      }, 500)
    }
  }

// get Full Screen height of screen
  receiveMessage(event) {
    if (event.data.toString().startsWith('[Cinchy][innerHeight]')) {
      this.fullScreenHeight = parseInt(event.data.toString().substring(21), 10) + 4;
      localStorage.setItem('fullScreenHeight', this.fullScreenHeight.toString());
      const elements = document.getElementsByClassName('full-height-element');
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < elements.length; i++) {
        setTimeout(() => {
          if(this.appStateService.iniFrame()){
            elements[i]['style'].height = this.fullScreenHeight + 'px';
          }
        }, 500)
      }
    }
  }
}
