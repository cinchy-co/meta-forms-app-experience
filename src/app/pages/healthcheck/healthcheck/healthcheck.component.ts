import { Component, OnInit } from '@angular/core';
import { CinchyConfig } from '@cinchy-co/angular-sdk';
import { connectableObservableDescriptor } from 'rxjs/internal/observable/ConnectableObservable';
import { ConfigService } from 'src/app/config.service';

@Component({
  selector: 'app-healthcheck',
  templateUrl: './healthcheck.component.html',
  styleUrls: ['./healthcheck.component.scss']
})
export class HealthcheckComponent implements OnInit {
  //public healthCheck: {component:String , version: string , buildIdentifier: string} = {"component":"","version":"","buildIdentifier":""};
  public healthCheck: CinchyConfig;
  constructor( private _configService: ConfigService) { }
  
  ngOnInit(): void {
   this.getHealthCheckInfo();
  }

  getHealthCheckInfo(): void{
    this._configService.loadConfig();
    this.healthCheck = this._configService.envConfig;
    delete this.healthCheck.authority;
    delete this.healthCheck.cinchyRootUrl;
    delete this.healthCheck.clientId;
    delete this.healthCheck.redirectUri;   
  }

}
