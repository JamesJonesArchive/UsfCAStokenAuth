/**
 * USF Service for CAS backed Token Authentication
 * @version v0.0.1-1d - 2014-06-26 * @link https://github.com/jamjon3/UsfCAStokenAuth
 * @author James Jones <jamjon3@gmail.com>
 * @license Lesser GPL License, http://www.gnu.org/licenses/lgpl.html
 */(function (window, angular, undefined) {
  'use strict';

  angular.module('UsfCAStokenAuth',[
    'angularLocalStorage'
  ])
  .factory('tokenAuth', ['$rootScope','$injector','storage','$window','$q','$log','$cookieStore','$cookies','$resource','applicationResources', function ($rootScope,$injector,storage,$window,$q,$log,$cookieStore,$cookies,$resource,applicationResources) {
    // Service logic
    // ...
    var service = {
      initializeStorage: function() {
        storage.bind($rootScope,'tokenAuth',{defaultValue: {buffer: [], applicationResources: {}}});
        angular.forEach(applicationResources,function(value, key) {
          if (!(key in $rootScope.tokenAuth.applicationResources)) {
            $rootScope.tokenAuth.applicationResources[key] = {
              url: value
            };
          }
        });        
      },
      getApplicationResourceKey: function(url) {
        var keepGoing = true;
        var appkey = "";
        angular.forEach(applicationResources,function(value, key) {
          if (keepGoing) {
            if (url === value) {
              appkey = key;
              keepGoing = false;
            }
          }
        });
        return appkey;
      },
      requestToken: function(appKey) {
        // Get the last 401 config in the buffer
        // var config = $rootScope.tokenAuth.buffer.slice(-1)[0].config;
        // Get the applicationResource object
        // var appKey = this.getApplicationResourceKey(config.url);
        // $rootScope[$rootScope.buffer.slice(-1)[0].config.params.service].tokenService + "/request?callback=?"
        $log.info("Requesting Token: " + $rootScope.tokenAuth.applicationResources[appKey].tokenService + "/request");
        $log.info("App ID: "+ $rootScope.tokenAuth.applicationResources[appKey].appId);        
        // params: { "service": $rootScope.tokenAuth.applicationResources[appKey].appId },
        // $window.alert("Cors problem 302");
        $log.info({ cookies: $cookies });
        return $resource($rootScope.tokenAuth.applicationResources[appKey].tokenService + "/request",{},{
          'getToken': { method: 'POST', responseType: "json", withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            }
          }
          //  ,
          //  transformRequest: function(data, headersGetter) {
          //    var str = [];
          //    var headers = headersGetter();
          //    headers[ "Content-type" ] = "application/x-www-form-urlencoded; charset=utf-8";
          //    for(var p in data) {
          //      if (data.hasOwnProperty(p)){
          //        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));              
          //      }
          //    }
          //    return str.join("&");
          //  },
          //  transformResponse: function(data, headersGetter) {
          //    $log.info(data);
          //    return data;
          //  }
          //}
        }).getToken({ "service": $rootScope.tokenAuth.applicationResources[appKey].appId }).$promise;
      }
    };
    $rootScope.$on('event:auth-loginRequired', function() {
      $log.info($rootScope.tokenAuth.buffer.slice(-1)[0].config.data);
      // Temporily comment until a token can be retrieved
      $window.alert("Temporary Stop before the redirect to the tokenService!");
      $window.location.assign($rootScope.tokenAuth.buffer.slice(-1)[0].config.data.tokenService);
    });
    $rootScope.$on('event:auth-tokenRequired',function() {
      service.requestToken().then(function(data) {
        //$window.alert("This is the Token response");
        //$window.alert(JSON.stringify(data));
        $rootScope[$rootScope.tokenAuth.buffer.slice(-1)[0].config.params.service].token = data.token;
        //$window.alert("This is the end of the Token response");
      },function(errorMessage) {
        $log.info(errorMessage);
        //$window.alert("This is the Token error response");
        //$window.alert(errorMessage);
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
    $httpProvider.interceptors.push(['$rootScope', '$q', '$window','$log','applicationResources', function($rootScope, $q, $window, $log,applicationResources) {
      
      var getApplicationResourceKey = function(url) {
        var keepGoing = true;
        var appkey = "";
        angular.forEach(applicationResources,function(value, key) {
          if (keepGoing) {
            if (url === value) {
              appkey = key;
              keepGoing = false;
            }
          }
        });
        return appkey;
      };
      
      return {      
        request: function(config) {
          return config || $q.when(config);
        },
        requestError: function(rejection) {
          $log.info(rejection); // Contains the data about the error on the request.
          
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
          // if (rejection.status === 401 && !rejection.config.ignoreAuthModule) {
          // alert(JSON.stringify(rejection.config));
          if (rejection.status === 401 && !rejection.config.ignoreAuthModule) {
            // $window.alert(rejection.config.url);
            //var url = rejection.config.url;
            //var params = rejection.config.params;
            // Passing the tokenService URL into the config data to be added to the buffer
            rejection.config.data = rejection.data;
            $rootScope.tokenAuth.buffer.push({
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
              $rootScope.tokenAuth.applicationResources[appKey][key] = value;
              // $window.alert(JSON.stringify($rootScope.tokenAuth.applicationResources[appKey]));
            });
            $rootScope.$broadcast('event:auth-loginRequired');
            return deferred.promise;
          } else {
            // This is where 302 redirect errors are
            $log.info(rejection);
            $window.alert("Rejection status is " + rejection.status);
            
            return deferred.promise;
          }
          // otherwise, default behaviour
          return $q.reject(rejection);
        }
        
      };
    }]);
  }])
  .run(['$rootScope', '$log', '$window', 'storage','tokenAuth','applicationResources', function($rootScope, $log, $window, storage, tokenAuth,applicationResources) {
    tokenAuth.initializeStorage();
    if ($rootScope.tokenAuth.buffer.length) {
      // Get the last 401 config in the buffer
      var config = $rootScope.tokenAuth.buffer.slice(-1)[0].config;      
      // Get the applicationResource object
      var appKey = tokenAuth.getApplicationResourceKey(config.url);
      if ('appId' in $rootScope.tokenAuth.applicationResources[appKey] && 'tokenService' in $rootScope.tokenAuth.applicationResources[appKey] && !('token' in $rootScope.tokenAuth.applicationResources[appKey])) {        
        tokenAuth.requestToken(appKey).then(function(data) {
          //$window.alert("This is the Token response");
          //$window.alert(JSON.stringify(data));
          data.$promise.then(function(tokenobj) {
            $log.info({ tokenobj: tokenobj });  
          });
          $log.info({ requestTokenData: data });          
          $rootScope.tokenAuth.applicationResources[appKey].token = data.token;
          $rootScope.tokenAuth.buffer.pop();
          // $window.location.reload();
          //$window.alert("This is the end of the Token response");
        },function(errorMessage) {
          $window.alert("Cors problem 302");
          $log.info(errorMessage);
          //$window.alert("This is the Token error response");
          //$window.alert(errorMessage);
        });
      }      
    }
  }]);
})(window, window.angular);