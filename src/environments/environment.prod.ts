import {CinchyConfig} from '@cinchy-co/angular-sdk';

// ng serve --port 3000

// EDIT FORM
// ng build --prod --base-href "/dx/edit-form/"

/*const cinchyConfig: CinchyConfig = {
  authority: 'https://cinchy.net/cinchysso',
  cinchyRootUrl: 'https://cinchy.net/Cinchy',
  clientId: 'cinchy-meta-form',
  redirectUri: 'https://cinchy.net/dx/edit-form'
};*/

/*const cinchyConfig: CinchyConfig = {
  authority: 'https://cinchy.net/cinchysso',
  cinchyRootUrl: 'https://cinchy.net/Cinchy',
  clientId: 'deals-overview',
  redirectUri: 'https://cinchy.net/dx/edit-form'
});*/

/*
  "authority": "https://pilot.cinchy.net/omnicable/cinchysso",
  "cinchyRootUrl": "https://pilot.cinchy.net/Omnicable/Cinchy",
  "clientId": "cinchy-metaforms-local",
  "redirectUri": "https://localhost:3000/edit-form",
  "version": "2.5.3"
});*/

// PROD
/*{
  "authority": "https://pilot.cinchy.net/omnicable/cinchysso",
  "cinchyRootUrl": "https://pilot.cinchy.net/Omnicable/Cinchy",
  "clientId": "deals-overview",
  "redirectUri": "https://cinchy.net/dx/edit-form",
  "version": "2.5.2"
}*/

export const environment = {
  production: true
};
