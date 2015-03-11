UsfCAStokenAuth
===============

USF Service for CAS backed Token Authentication

## Installing via Bower
```
bower install https://github.com/jamjon3/UsfCAStokenAuth.git#0.0.29 --save
```
## Angular Version

Currently, this plugin is using Angular ~1.3.11.

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
    },
    'unauthorizedRoute': '/unauthorized',
    'logoutRoute': '/logout',
    'loginRoute': '/login',
    'debug': false
})
```

This will produce a local storage binding to track tokens and their corresponding token servers with
this defined service. Of course, when you define your 'own' services, you can reference this URL conviently
while passing it into the function as 'applicationResources'.

Note: You can turn debugging on by setting the 'debug' key to true which will send debugging output to the console log

## Handling Unauthorized Requests

You may find the certain requests are not authorized. You need to wire this to a view to let the end user know.
In the example constants above, the 'unauthorizedRoute' is defined as 'unauthorized'. That means you'll need
to create a route for it and wire it into your routes.

In Yeoman, you can do that by typing:

```
yo angular:route unauthorized
```

You'll need to edit your view and anything you want in the controller it creates. Before the redirect,
'authorizedError' and 'unauthorizedRole' will be updated in the $rootScope so you can access it
in the view and such (if desired).

## Handling Login Requests

Optional: If you specify a 'loginRoute', you will be redirected to that route on your first login. In the
example constants above, the 'loginRoute' is defined as 'login'. That means you'll need to create a route
for it and wire it into your routes. Note: You can bypass using this and just allow the first tokenAuth
protected service trigger a login (if you don't care to redirect to a route, it will simply refresh the current page).

In Yeoman, you can do that by typing:

```
yo angular:route login
```

The plugin injects a function in the root scope you can access with a logout button called 'tokenAuthLogin'.
This function needs to be called on clicking the button. That can look something like this in the code:

```
<button class="btn btn-sm" ng-click="tokenAuthLogin()">Login</button>
```

..or..

```
<a ng-href="" ng-click="tokenAuthLogin()">Login</a>
```

IMPORTANT: This function simply redirects to the route you specified. You're controller on that route will need to have
a token protected function that will trigger the actual login.

## Handling Logout Requests

You'll need a route to handle logout. You create the route and tell the pluging where to go after it clears
it's session(s) with the token server(s). In the example constants above, the 'logoutRoute' is defined as 'logout'.
That means you'll need to create a route for it and wire it into your routes.

In Yeoman, you can do that by typing:

```
yo angular:route logout
```

The plugin injects a function in the root scope you can access with a logout button called 'tokenAuthLogout'.
This function needs to be called on clicking the button. That can look something like this in the code:

```
<button class="btn btn-sm" ng-click="tokenAuthLogout()">Logout</button>
```

..or..

```
<a ng-href="" ng-click="tokenAuthLogout()">Logout</a>
```

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
            method: 'POST', params: {'service': 'list'},responseType: 'json' }
          },
          'listAgain': {
            method: 'POST', params: {'service': 'list'},responseType: 'json',tokenKey: 'exampleResource', url:'https://somecompany.com/~jdoe/ExampleApp/servicesOther.php' }
          }
      });
      var ExampleHttp1 = $http({ url: tokenAuth.getResourceUrl('exampleResource'), method: 'POST', params: {'service': 'list'},responseType: 'json' })
      var ExampleHttp2 = $http({ url: 'https://somecompany.com/~jdoe/ExampleApp/services.php', method: 'POST', params: {'service': 'list'},responseType: 'json' })
      var ExampleHttp3 = $http({ tokenKey: 'exampleResource', method: 'POST', params: {'service': 'list'},responseType: 'json' })
      var ExampleHttp4 = $http({ url: 'https://somecompany.com/~jdoe/ExampleApp/servicesOther.php', tokenKey: 'exampleResource', method: 'POST', params: {'service': 'list'},responseType: 'json' })
      // Public API here
      return {
        list: function () {
          return ExampleResource.list({}).$promise;
        },
        exampleHttp1: function() {
          return ExampleHttp1;
        }
        exampleHttp2: function() {
          return ExampleHttp2;
        }
        exampleHttp3: function() {
          return ExampleHttp3;
        }
        exampleHttp4: function() {
          return ExampleHttp4;
        }
      };
    }]); 
```

There's a few things going on here. For one, 'tokenAuth' (which is a reference to this plugin's service) can be made available to this factory for accessing the 'getResourceUrl' function.
In the 'list' method of 'ExampleResource' and 'ExampleHttp1' the URL for $resource and $http examples are obtained by the 'tokenAuth.getResourceUrl' function by passing the applicationResources 'key' for
the service you provided in the constant you wired up for the plugin.

The 'ExampleHttp2' is using an explicit url _but_ that url matches the value of the 'exampleResource' key and will be handled by the plugin similarly to 'ExampleResource' and 'ExampleHttp1'.

The 'ExampleHttp3' does not specify the URL but does specify an 'tokenKey'. The 'tokenKey' will be used to match the URL value and provide it to the $http service.

The 'ExampleHttp4' is a hybrid. Specifying the 'tokenKey' associates it with the token associated with it. The URL can be something different you know shares that token but is a different url. This allows you to have URL variations associated with the same token.

Finally, the 'listAgain' method of 'ExampleResource' uses the hybrid using both an explicit URL and 'tokenKey' associated with that token.

In summary, for $resource (or $http), you'll need to inject the 'tokenAuth' service into your service or controller to use the convience method. Then you can use the 'tokenAuth.getResourceUrl' for the URL but you can use different combinations.
The plugin handles the rest and stores your tokens and such. Make sure your application has a unique 'applicationUniqueId' defined in your constant (this will keep your storage distinct from any other instances of applications using this plugin).

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

## Handling the browser session

The plugin creates a session cookie that will persist as long as the browser window is open. You can clear it using the 'tokenAuth.sessionLogout()' function. This will cause the application to clear out all tokens on reload
which will make the user login again. This is useful to use on a "Logout" button as it will trigger the clearing of local storage tokens and begin a new session.

## Extra convienence methods of the plugin

```
tokenAuth.clearToken('myAppKey');
```
The 'clearToken' method will clear the associated token connected to the provided tokenKey.

```
tokenAuth.clearTokens();
```
The 'clearTokens' method will clear all tokens on all tokenKeys.

```
tokenAuth.hasToken('myAppKey');
```
The 'hasToken' method will return 'true' or 'false' if a token is currently stored corresponding to the provided tokenKey.

```
tokenAuth.clearLocalStorage();
```
The 'clearLocalStorage' method clears ALL local storage

```
tokenAuth.sessionLogout();
```
The 'sessionLogout' method clears out any existing session cookie and does a logout on the token server

```
tokenAuth.isLoggedIn();
```
The 'isLoggedIn' method return true or false on the global login condition based on the existence of the session cookie

```
tokenAuth.getResourceUrl('myAppKey');
```
The 'getResourceUrl' method looks up the URL associated with the provided AppKey and returns it.

```
tokenAuth.isDebugEnabled();
```
The 'isDebugEnabled' method checks to see if debugging is turned on in the constants declation for the plugin.