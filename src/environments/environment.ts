import {CinchyConfig} from '@cinchy-co/angular-sdk';

// ng serve --port 3000

// PROD LOCAL
/*const cinchyConfig: CinchyConfig = {
  authority: 'https://cinchy.net/cinchysso',
  cinchyRootUrl: 'https://cinchy.net/Cinchy',
  clientId: 'deals-sheet',
  redirectUri: 'https://localhost:3000/edit-form'
};*/

/*
const cinchyConfig: CinchyConfig = {
  authority: 'http://pilot.cinchy.co/reformulary/cinchysso',
  cinchyRootUrl: 'http://pilot.cinchy.co/reformulary/Cinchy/',
  clientId: 'edit-form-local',
  redirectUri: 'http://localhost:3000/edit-form'
};
*/

/*
const cinchyConfig: CinchyConfig = {
  authority: 'http://pilot.cinchy.co/iq/cinchysso',
  cinchyRootUrl: 'http://pilot.cinchy.co/iq/Cinchy',
  clientId: 'dynamic-forms-local',
  redirectUri: 'http://localhost:4200/'
};
*/

/*
// QA LOCAL
const cinchyConfig: CinchyConfig = {
  // The url of your Cinchy IdentityServer
  authority: 'http://qa.cinchy.co/cinchy-4.7_buildno-1816-ci/cinchysso',
  // The root url of your Cinchy instance
  cinchyRootUrl: 'http://qa.cinchy.co/cinchy-4.7_BuildNo-1816-CI/Cinchy',  // The redirect url after logging in
  // The client id for your applet
  clientId: 'deals-sheet',
  redirectUri: 'http://localhost:4200/deals-overview'
};
*/


// Actual Prod
/*const cinchyConfig: CinchyConfig = {
  authority: 'https://cinchy.net/cinchysso',
  cinchyRootUrl: 'https://cinchy.net/Cinchy',
  clientId: 'deals-overview',
  redirectUri: 'https://cinchy.net/dx/deals-overview/deals-overview'
};*/

/*const cinchyConfig: CinchyConfig = {
  authority: 'http://pilot.cinchy.co/rbc/cinchysso',
  cinchyRootUrl: 'http://pilot.cinchy.co/RBC/Cinchy',
  clientId: 'dynamic-form',
  redirectUri: 'http://localhost:3000/'
};*/

/*
const cinchyConfig: CinchyConfig = {
  authority: 'http://pilot.cinchy.co/transfer_pricing/cinchysso',
  cinchyRootUrl: 'http://pilot.cinchy.co/Transfer_Pricing/Cinchy/',
  clientId: 'dynamic-forms-local',
  redirectUri: 'http://localhost:4200/'
};
*/

export const environment = {
  production: false
};
