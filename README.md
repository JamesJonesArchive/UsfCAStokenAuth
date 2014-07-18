UsfCAStokenAuth
===============

USF Service for CAS backed Token Authentication

## Installing via Bower
```
bower install https://github.com/jamjon3/UsfCAStokenAuth.git#0.0.1-1h
```
## Angular Version

Currently, this plugin is using Angular 1.3.0-beta.10 which has improvements
needed for angular $resource.

## Including the module

In a Yeoman angular app, that would be in the 'app.js' right above the "config" section.
To add this module 'UsfCAStokenAuth', just add it to the array of modules that looks something like:

```
angular
  .module('exampleModuleUsingPlugin', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'UsfCAStokenAuth'
  ])
```
## Wiring up services with Constants

Your token services needs to be wired up as a "constant" in your application. This is
done by defining the 'UsfCAStokenAuthConstant' with a unique id value on the 'applicationUniqueId' key
(can be any arbitrary string) along with assigning key/value pairs on the "applicationResources" key. 

In a Yeoman angular app, the constant would be placed the 'app.js' right above the "config" section. Here's
an example with a service defined as "exampleResource" and it's service URL:

```
.constant('UsfCAStokenAuthConstant',{
    'applicationUniqueId': 'f6765e988eb32cbda5dcd9ee2673c0a8',
    'applicationResources': {
        'exampleResource': 'https://somecompany.com/~jdoe/ExampleApp/services.php'
    }
})
```

This will produce a local storage binding to track tokens and their corresponding token servers with
this defined service. Of course, when you define your 'own' services, you can reference this URL conviently
while passing it into the function as 'applicationResources'.

## Handling CORS

CORS has already been activated by the plugin. You can override this in $http or $resource. This is necessary
to access the Token Server across domains, at least. Here's the settings in the plugin's config section:

```
    if ('defaults' in $resourceProvider) {
      // Only supported in 1.3.x
      $resourceProvider.defaults.stripTrailingSlashes = false;
    }
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.withCredentials = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
```

One thing to notice is the delete of the header "X-Requested-With" at the end. This will bypass "Preflight"
with an "Options" request.

## Usage

Your service URL's are stored in the constant so you can easily refer to them by the applicationResource 'key'
using a function from this plugin. You'll need to inject the 'tokenAuth' service into your service or controller
similar to:

```
angular.module('angCorstokenApp')
    .factory('exampleService',['$resource','tokenAuth', function ($resource,tokenAuth) {      
      var ExampleResource = $resource(tokenAuth.getResourceUrl('exampleResource'),{},{
          'list': {
            method: 'POST', params: {'service': 'list'},responseType: 'json', headers: { 'X-Auth-Token': tokenAuth.getStoredToken('exampleResource') }
          }
      });
  
      // Public API here
      return {
        list: function () {
          return ExampleResource.list({}).$promise;
        }
      };
    }]); 
```

There's a few things going on here. For one, 'tokenAuth' (which is a reference to this plugin's service) is available to this factory and the URL for $resource is
obtained by the 'tokenAuth.getResourceUrl' function by passing the applicationResources 'key' for the service you provided in the constant you wired up for the plugin.
This is more of a convience function but it does allow you to keep all this together with the 'tokenAuth.getStoredToken' function which uses the same
applicationResources 'key' to obtain a stored 'token' associated with the registered applicationResources 'key' you defined.

In summary, for $resource (or $http), you'll need to inject the 'tokenAuth' service into your service or controller. Then use the 'tokenAuth.getResourceUrl' for the URL
and add a headers config option using the 'tokenAuth.getStoredToken' function to pass in a token. The plugin handles the rest and stores your tokens and such.
Make sure your application has a unique 'applicationUniqueId' defined in your constant (this will keep your storage distinct from any other instances of applications using this plugin).

## Bypassing this auth module

If you have a http or resource service you want bypassed by this modules handling you can pass 'ignoreAuthModule' with a value of 'true' into the $http or $resource config. That may look something like:

```
    $http({method: 'GET', url: '/someUrl', ignoreAuthModule: true }).
        success(function(data, status, headers, config) {
          // this callback will be called asynchronously
          // when the response is available
        }).
        error(function(data, status, headers, config) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
        });

```
