(function ($, window, angular, undefined) {
  'use strict';

  angular.module('UsfCAStokenAuth',[
    'ngRoute',
    'ngResource',
    'ngCookies',
    'angularLocalStorage'
  ])
  .factory('tokenAuth', ['$rootScope','$injector','storage','$window','$location','$q','$log','$cookieStore','$cookies','$resource','$http','UsfCAStokenAuthConstant', function ($rootScope,$injector,storage,$window,$location,$q,$log,$cookieStore,$cookies,$resource,$http,UsfCAStokenAuthConstant) {
    var service = {
      /**
       * Checks to see if debug is turned on
       */
      isDebugEnabled: function() {
        return ("debug" in UsfCAStokenAuthConstant)?(UsfCAStokenAuthConstant.debug === true):false;
      },
      /**
       * Initializes local storage using the UsfCAStokenAuthConstant constant
       */
      initializeStorage: function() {
        var defaultValue = {};
        defaultValue[UsfCAStokenAuthConstant.applicationUniqueId] = {buffer: [], applicationResources: {}};
        storage.bind($rootScope,'tokenAuth',{defaultValue: defaultValue});
        var sessionCookie = $cookieStore.get(UsfCAStokenAuthConstant.applicationUniqueId);
        if (typeof sessionCookie === undefined) {
          // Clear localstorage and ready a new session cookie
          service.clearTokens();
          $cookieStore.put(UsfCAStokenAuthConstant.applicationUniqueId,new Date().getTime());
        } else if(service.isDebugEnabled()) {
          $log.info({ cookieValue : sessionCookie, applicationId:  UsfCAStokenAuthConstant.applicationUniqueId });
        }
        if (!(UsfCAStokenAuthConstant.applicationUniqueId in $rootScope.tokenAuth)) {
          // Add the key in case another instance of the plugin already has a different applicationUniqueID in local storage (prevent an 'undefined' error)
          $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId] = defaultValue[UsfCAStokenAuthConstant.applicationUniqueId];
        }
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
        var self = this;
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
        if(self.isDebugEnabled()) {
          $log.info({matchedAppKey: appkey});
        }
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
        return '';
      },
      /**
       * Retrieves a URL associated with a provided Application resource 'key'
       */
      getResourceUrl: function(appKey) {
        return UsfCAStokenAuthConstant.applicationResources[appKey];
      },
      /**
       * Clears the associated token connected to the provided appKey
       */
      clearToken: function(appKey) {
        if (appKey in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources) {
          if ('token' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {
            delete $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token;
          }
        }
      },
      /**
       * Clears all tokens
       */
      clearTokens: function() {
        angular.forEach($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources,function(value, appKey) {
          if ('token' in value) {
            delete $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token;
          }
        });
      },
      /**
       * Clears all local storage
       */
      clearLocalStorage: function() {
        storage.clearAll();
      },
      /**
       * Removes the session cookie if it exists
       */
      clearSessionCookie: function() {
        var sessionCookie = $cookieStore.get(UsfCAStokenAuthConstant.applicationUniqueId);
        if (typeof sessionCookie !== undefined) {
          // Removes session cookie
          $cookieStore.remove(UsfCAStokenAuthConstant.applicationUniqueId);
        }
      },
      /**
       * Returns true or false regarding if a token exists for this appKey in local storage
       */
      hasToken: function(appKey) {
        if (appKey in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources) {
          return ('token' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]);
        } else {
          return false;
        }
      },
      /**
       * Requests a 'token' from the token service referenced by the Application resource 'key'
       */
      requestToken: function(appKey) {
        var self = this;
        return $resource($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request",{},{
          'getToken': { method: 'POST', withCredentials: true, responseType: "text",  headers: { "Content-Type": "application/json"},
            transformResponse: function(data, headersGetter) {
              var headers = headersGetter();
              if(self.isDebugEnabled()) {
                $log.info(headers);
                $log.info({transformedResponse: data});
              }
              return { token: data };
            }
          }
        }).getToken({'service': $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId}).$promise;
      }
    };
    // Handles the login redirect
    $rootScope.$on('event:auth-loginRequired', function() {
      if(service.isDebugEnabled()) {
        $log.info($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data);
      }
      // Temporily comment until a token can be retrieved
      // $window.alert("Temporary Stop before the redirect to the tokenService!");
      $window.location.assign($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data.tokenService);
    });
    // Handles the unauthorized redirect
    $rootScope.$on('event:auth-unauthorizedRedirect', function() {
      $location.path(UsfCAStokenAuthConstant.unauthorizedRoute);
    });
    return service;
  }])
  /**
  * $http interceptor.
  * On 401 response (without 'ignoreAuthModule' option) stores the request
  * and broadcasts 'event:angular-auth-loginRequired'.
  */
  .config(['$httpProvider','$resourceProvider','$injector', function($httpProvider,$resourceProvider,$injector) {
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
      // Detects if debugging is enabled
      var isDebugEnabled = function() {
        return ("debug" in UsfCAStokenAuthConstant)?(UsfCAStokenAuthConstant.debug === true):false;
      };
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
        if(isDebugEnabled()) {
          $log.info({matchedAppKey: appkey});
        }
        return appkey;
      };
      /**
       * Retrieves a URL associated with a provided Application resource 'key'
       */
      var getResourceUrl = function(appKey) {
        return UsfCAStokenAuthConstant.applicationResources[appKey];
      };
      /**
       * Retrieves a stored token in local storage by the Application resource 'key'
       */
      var getStoredToken = function(appKey) {
        if ('token' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {
          // Return the stored token
          return $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token;
        }
        return '';
      };
      // The interceptor methods
      return {      
        request: function(config) {
          if (!('ignoreAuthModule' in config)) {
            config.ignoreAuthModule = false;
          }
          if(!config.ignoreAuthModule) {
            var token = '';
            if ('appKey' in config) {
              // If url is missing, pull it from the associated appKey
              if (!('url' in config)) {
                config.url = getResourceUrl(config.appKey);              
              }
              token = getStoredToken(config.appKey);
              if (token.length > 1) {
                // Add token to headers
                if ('headers' in config) {
                  if (!('X-Auth-Token' in config.headers)) {
                    config.headers['X-Auth-Token'] = token;
                  }
                } else {
                  config.headers = { 'X-Auth-Token': token };
                }
              }
            } else if('url' in config) {
              // Match the URL to an appKey
              var appKey = getApplicationResourceKey(config.url);
              if (appKey.length > 0) {
                config.appKey = appKey;
                token = getStoredToken(config.appKey);
                if (token.length > 1) {
                  // Add token to headers
                  if ('headers' in config) {
                    if (!('X-Auth-Token' in config.headers)) {
                      config.headers['X-Auth-Token'] = token;
                    }
                  } else {
                    config.headers = { 'X-Auth-Token': token };
                  }
                }                            
              }
            }
          }
          return config || $q.when(config);
        },
        requestError: function(rejection) {
          if (isDebugEnabled()) {
            // Contains the data about the error on the request.
            $log.info(rejection); 
          }
          // Return the promise rejection.
          return $q.reject(rejection);
        },
        response: function(response) {
          // $window.alert(JSON.stringify(response));  
          return response || $q.when(response);
        },                
        responseError: function(rejection) {
          if (isDebugEnabled()) {
            $log.info(rejection); // Contains the data about the error on the response.
          }
          var deferred = $q.defer();
          if (rejection.status === 401 && !rejection.config.ignoreAuthModule && 'appKey' in rejection.config) {
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
              // var appKey = getApplicationResourceKey(rejection.config.url);
              var appKey = rejection.config.appKey;
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
            if (isDebugEnabled()) {
              // This is where 302 redirect errors are
              $log.info({"Rejection" : rejection});            
            }
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
        if (tokenAuth.isDebugEnabled()) {
          $log.info(errorMessage);
        }
      },
      tokenHandler: function(data) {
        if (tokenAuth.isDebugEnabled()) {
          $log.info({ requestTokenData: data });          
        }
        $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token = data.token;
      },
      promises: {}
    };
    // Experimental Code
    //angular.forEach($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer,function(buffer) {
    //  // Get the last 401 config in the buffer
    //  var config = buffer.config;
    //  // Get the applicationResource object
    //  var appKey = tokenAuth.getApplicationResourceKey(config.url);
    //  tokenProcessing.promises[appKey] = tokenAuth.requestToken(appKey);
    //},tokenProcessing.promises);
    //$q.all(tokenProcessing.promises).then(function(results) {
    //  angular.forEach(results,function(result,appKey) {
    //    $log.info({ requestTokenData: result });          
    //    $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token = result.token;
    //  });
    //  while($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.length > 0) {
    //    $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.pop();
    //  }
    //});
    for (var i=$rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.length-1; i >=0; i--) {
      // Get the last 401 config in the buffer
      var config = $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer[i].config;
      // Get the applicationResource object
      var appKey = config.appKey;
      if (tokenAuth.isDebugEnabled()) {
        $log.info({"bufferIndex" : i, "config": config, "appKey": appKey});  
      }
      if ('appId' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey] && 'tokenService' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {        
        tokenAuth.requestToken(appKey).then(tokenProcessing.tokenHandler,tokenProcessing.error);
      }     
    }
    while($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.length > 0) {
      $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.pop();
    }
  }]);
})(jQuery, window, window.angular);