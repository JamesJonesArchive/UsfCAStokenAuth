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
        'exampleResource': 'https://dev.it.usf.edu/~james/ExampleApp/services.php'
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
    $resourceProvider.defaults.stripTrailingSlashes = false;
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.withCredentials = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
```

One thing to notice is the delete of the header "X-Requested-With" at the end. This will bypass "Preflight"
with an "Options" request.