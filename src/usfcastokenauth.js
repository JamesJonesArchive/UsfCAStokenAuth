(function ($, window, angular, undefined) {
  'use strict';

  angular.module('UsfCAStokenAuth',[
    'angularLocalStorage'
  ])
  .factory('tokenAuth', ['$rootScope','$injector','storage','$window','$q','$log','$cookieStore','$cookies','$resource','$http','UsfCAStokenAuthConstant', function ($rootScope,$injector,storage,$window,$q,$log,$cookieStore,$cookies,$resource,$http,UsfCAStokenAuthConstant) {
    // Service logic
    // ...
    var service = {
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
      getStoredToken: function(appKey) {
        if ('token' in $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey]) {
          // Return the stored token
          return $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].token;
        }
        return null;
      },
      getResourceUrl: function(appKey) {
        return UsfCAStokenAuthConstant.applicationResources[appKey];
      },
      requestToken: function(appKey) {
        // Get the last 401 config in the buffer
        // var config = $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config;
        // Get the applicationResource object
        // var appKey = this.getApplicationResourceKey(config.url);
        // $rootScope[$rootScope.buffer.slice(-1)[0].config.params.service].tokenService + "/request?callback=?"
        $log.info("Requesting Token: " + $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request");
        $log.info("App ID: "+ $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId);        
        // params: { "service": $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId },
        // $window.alert("Cors problem 302");
        $log.info({ cookies: $cookies });
        
        //var deferred = $q.defer();
        //$http({
        //  method: 'POST',
        //  url: $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request",
        //  // url: $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request?service=" + encodeURIComponent($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId),
        //  withCredentials: true,
        //  responseType: "text",
        //  headers: {
        //    "Content-Type": "application/json"
        //  },
        //  data: {'service': $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId},
        //  transformResponse: function(data, headersGetter) {
        //    var headers = headersGetter();
        //    $log.info(headers);
        //    $log.info({transformedResponse: data});
        //    return { token: data };
        //  }
        //}).success(function(response) {
        //  deferred.resolve(response);
        //}).error(function(){
        //  deferred.reject('ERROR');
        //});
        //Returning the promise object
        //return deferred.promise;
        
        return $resource($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request",{},{
          'getToken': { method: 'POST', withCredentials: true, responseType: "text",  headers: { "Content-Type": "application/json"}, transformResponse: function(data, headersGetter) {
            var headers = headersGetter();
            $log.info(headers);
            $log.info({transformedResponse: data});
            return { token: data };
          } }
        }).getToken({'service': $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId}).$promise;
      
        // return $resource($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request",{},{
        //return $resource($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].tokenService + "/request?service=" + encodeURIComponent($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId),{},{
        //  'getToken': { method: 'GET', responseType: "json", withCredentials: true
        //    //params: {
        //    //  "service": $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId
        //    //}
        //    //headers: {
        //    //  // "Content-Type": "application/json",
        //    //  "Content-Type": "text/plain",
        //    //  "Accept": "application/json"
        //    //},
        //    //transformRequest: transformRequestAsFormPost
        //    //transformRequest: function(data, headersGetter) {
        //    //  // var headers = headersGetter();
        //    //  // headers[ "Content-type" ] = "text/plain; charset=utf-8";
        //    //  return JSON.stringify(data);
        //    //}
        //  }
        //  
        //  //  ,
        //  //  transformRequest: function(data, headersGetter) {
        //  //    var str = [];
        //  //    var headers = headersGetter();
        //  //    headers[ "Content-type" ] = "application/x-www-form-urlencoded; charset=utf-8";
        //  //    for(var p in data) {
        //  //      if (data.hasOwnProperty(p)){
        //  //        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));              
        //  //      }
        //  //    }
        //  //    return str.join("&");
        //  //  },
        //  //  transformResponse: function(data, headersGetter) {
        //  //    $log.info(data);
        //  //    return data;
        //  //  }
        //  //}
        //// }).getToken({ "service": encodeURI($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId) }).$promise;
        //// }).getToken(JSON.stringify({ "service": $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].applicationResources[appKey].appId })).$promise;
        //}).getToken().$promise;
      }
    };
    $rootScope.$on('event:auth-loginRequired', function() {
      $log.info($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data);
      // Temporily comment until a token can be retrieved
      $window.alert("Temporary Stop before the redirect to the tokenService!");
      $window.location.assign($rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.data.tokenService);
    });
    $rootScope.$on('event:auth-tokenRequired',function() {
      service.requestToken().then(function(data) {
        $rootScope[$rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.slice(-1)[0].config.params.service].token = data.token;
      },function(errorMessage) {
        $log.info(errorMessage);
      });
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
    $httpProvider.interceptors.push(['$rootScope', '$q', '$window','$log','UsfCAStokenAuthConstant', function($rootScope, $q, $window, $log, UsfCAStokenAuthConstant) {
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
            $rootScope.tokenAuth[UsfCAStokenAuthConstant.applicationUniqueId].buffer.push({
              config: rejection.config,
              deferred: deferred
            });
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
            // $window.alert("AppKey is "+appKey);
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
            $rootScope.$broadcast('event:auth-loginRequired');
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