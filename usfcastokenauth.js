/**
 * USF Service for CAS backed Token Authentication
 * @version v0.0.1-2p - 2014-07-25 * @link https://github.com/jamjon3/UsfCAStokenAuth
 * @author James Jones <jamjon3@gmail.com>
 * @license Lesser GPL License, http://www.gnu.org/licenses/lgpl.html
 */(function ($, window, angular, undefined) {
  'use strict';

  angular.module('UsfCAStokenAuth',[
    'ngRoute',
    'angularLocalStorage'
  ])
  .factory('tokenAuth', ['$rootScope','$injector','storage','$window','$q','$log','$cookieStore','$cookies','$resource','$http','UsfCAStokenAuthConstant', function ($rootScope,$injector,storage,$window,$q,$log,$cookieStore,$cookies,$resource,$http,UsfCAStokenAuthConstant) {
    var service = {
      /**
       * Initializes local storage using the UsfCAStokenAuthConstant constant
       */
      initializeStorage: function() {
        var defaultValue = {};
        defaultValue[UsfCAStokenAuthConstant.applicationUniqueId] = {buffer: [], applicationResources: {}};
        storage.bind($rootScope,'tokenAuth',{defaultValue: defaultValue});
        angular.forEach(UsfCAStokenAuthConstant.applicationResources,function(value, key) {
          if (!(key in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources)) {
            $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[key] = {
              url: value
            };
          }
        });        
      },
      /**
       * Retrieves the Application resource 'key' from the UsfCAStokenAuthConstant using the URL as the matching value
       */
      getApplicationResourceKey: function(url) {
        var keepGoing = true;
        var appkey = "";
        angular.forEach(UsfCAStokenAuthConstant.applicationResources,function(value, key) {
          if (keepGoing) {
            if (url === value) {
              appkey = key;
              keepGoing = false;
            }
          }
        });
        return appkey;
      },
      /**
       * Retrieves a stored token in local storage by the Application resource 'key'
       */
      getStoredToken: function(appKey) {
        if ('token' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {
          // Return the stored token
          return $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token;
        }
        return null;
      },
      /**
       * Retrieves a URL associated with a provided Application resource 'key'
       */
      getResourceUrl: function(appKey) {
        return UsfCAStokenAuthConstant.applicationResources[appKey];
      },
      /**
       * Requests a 'token' from the token service referenced by the Application resource 'key'
       */
      requestToken: function(appKey) {
        return $resource($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request",{},{
          'getToken': { method: 'POST', withCredentials: true, responseType: "text",  headers: { "Content-Type": "application/json"},
            transformResponse: function(data, headersGetter) {
              var headers = headersGetter();
              $log.info(headers);
              $log.info({transformedResponse: data});
              return { token: data };
            }
          }
        }).getToken({'service': $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId}).$promise;
      }
    };
    // Handles the login redirect
    $rootScope.$on('event:auth-loginRequired', function() {
      $log.info($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data);
      // Temporily comment until a token can be retrieved
      // $window.alert("Temporary Stop before the redirect to the tokenService!");
      $window.location.assign($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data.tokenService);
    });
    // Handles the unauthorized redirect
    $rootScope.$on('event:auth-unauthorizedRedirect', function() {
      $window.location.path(UsfCAStokenAuthConstant.unauthorizedRoute);
    });
    return service;
  }])
  /**
  * $http interceptor.
  * On 401 response (without 'ignoreAuthModule' option) stores the request
  * and broadcasts 'event:angular-auth-loginRequired'.
  */
  .config(['$httpProvider','$resourceProvider','$injector','UsfCAStokenAuthConstant', function($httpProvider,$resourceProvider,$injector) {
    /**
     * Application will have to use CORS for interacting with the
     * CAS Token Service, at least. These settings do just that
     */
    if ('defaults' in $resourceProvider) {
      // Only supported in 1.3.x
      $resourceProvider.defaults.stripTrailingSlashes = false;
    }
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.withCredentials = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    /**
     * This is the interceptor needed to handle response errors
     */
    $httpProvider.interceptors.push(['$rootScope', '$q', '$window','$location','$log','UsfCAStokenAuthConstant', function($rootScope, $q, $window, $location, $log, UsfCAStokenAuthConstant) {
      // Function for getting the resourceKey by url
      var getApplicationResourceKey = function(url) {
        var keepGoing = true;
        var appkey = "";
        angular.forEach(UsfCAStokenAuthConstant.applicationResources,function(value, key) {
          if (keepGoing) {
            if (url === value) {
              appkey = key;
              keepGoing = false;
            }
          }
        });
        return appkey;
      };
      // The interceptor methods
      return {      
        request: function(config) {
          return config || $q.when(config);
        },
        requestError: function(rejection) {
          // Contains the data about the error on the request.
          $log.info(rejection); 
          // Return the promise rejection.
          return $q.reject(rejection);
        },
        response: function(response) {
          // $window.alert(JSON.stringify(response));  
          return response || $q.when(response);
        },                
        responseError: function(rejection) {
          $log.info(rejection); // Contains the data about the error on the response.
          var deferred = $q.defer();
          if (rejection.status === 401 && !rejection.config.ignoreAuthModule) {
            // Passing the tokenService URL into the config data to be added to the buffer
            rejection.config.data = rejection.data;
            if ('authorizedError' in rejection.data) {
              // The role is not authorized
              $rootScope.authorizedError = rejection.data.authorizedError;
              $rootScope.unauthorizedRole = rejection.data.role;
              // Triggers the redirect to unauthorized route
              $rootScope.$broadcast('event:auth-unauthorizedRedirect');  
            } else {
              $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.push({
                config: rejection.config,
                deferred: deferred
              });
              // Gets the list of passed parameters as a hash
              var params = {
                getParams: function(queryString) {                                    
                  var params = {}, queries, temp, i, l;
                  // Split into key/value pairs
                  queries = queryString.split("&");
                  // Convert the array of strings into an object
                  for ( i = 0, l = queries.length; i < l; i++ ) {
                    temp = queries[i].split('=');
                    params[temp[0]] = decodeURIComponent(temp[1]);
                  }
                  return params;                                                                        
                }
              }.getParams(rejection.data.tokenService.substring( rejection.data.tokenService.indexOf('?') + 1 ));
              var appKey = getApplicationResourceKey(rejection.config.url);
              // Populates local storage with the appId and the tokenService URL
              angular.forEach({
                "appId": params.service, 
                "tokenService": {
                  removeLogin: function(url) {
                    var lastSlashIndex = url.lastIndexOf("/");
                    if (lastSlashIndex > url.indexOf("/") + 1) { // if not in http://
                      return url.substr(0, lastSlashIndex); // cut it off
                    } else {
                      return url;
                    }                                    
                  }
                }.removeLogin(rejection.data.tokenService.substring(0,rejection.data.tokenService.indexOf("?")))
              },function(value, key) {
                $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey][key] = value;
              });
              // Triggers the redirect to login
              $rootScope.$broadcast('event:auth-loginRequired');              
            }
            return deferred.promise;
          } else {
            // This is where 302 redirect errors are
            $log.info({"Rejection" : rejection});            
            return deferred.promise;
          }
          // otherwise, default behaviour
          return $q.reject(rejection);
        }
        
      };
    }]);
  }])
  .run(['$rootScope', '$log', '$window', 'storage','tokenAuth', 'UsfCAStokenAuthConstant', function($rootScope, $log, $window, storage, tokenAuth, UsfCAStokenAuthConstant) {
    tokenAuth.initializeStorage();
    var tokenProcessing = {
      error: function(errorMessage) {
        // $window.alert("Cors problem 302");
        $log.info(errorMessage);
      },
      tokenHandler: function(data) {
        $log.info({ requestTokenData: data });          
        $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token = data.token;
      }
    };
    for (var i=$rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.length-1; i >=0; i--) {
      // Get the last 401 config in the buffer
      var config = $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer[i].config;
      // Get the applicationResource object
      var appKey = tokenAuth.getApplicationResourceKey(config.url);
      if ('appId' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey] && 'tokenService' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {        
        tokenAuth.requestToken(appKey).then(tokenProcessing.tokenHandler,tokenProcessing.error);
      }     
    }
    while($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.length > 0) {
      $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.pop();
    }
  }]);
})(jQuery, window, window.angular);