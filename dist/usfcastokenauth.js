/**
 * USF Service for CAS backed Token Authentication
 * @version v1.0.0 - 2016-01-26
 * @link https://github.com/jamjon3/UsfCAStokenAuth
 * @author James Jones <jamjon3@gmail.com>
 * @license Apache 2.0 License, https://opensource.org/licenses/Apache-2.0
 */
(function ( window, angular, undefined ) {
angular.module('UsfCAStokenAuth', [
    'ngRoute',
    'ngResource',
    'ngCookies',
    'angularLocalStorage'
])
.factory('tokenAuth', ['$rootScope','$rootElement','storage','$cookies','$log','$q','$location','$injector','$resource','$window','$filter','$http', function($rootScope,$rootElement,storage,$cookies,$log,$q,$location,$injector,$resource,$window,$filter,$http) {
    var service = {
        /**
         * Initializes local storage 
         */
        initializeStorage: function() {
            var defaultValue = {};
            defaultValue[service.getAppName()] = {buffer: [], applicationResources: {}};
            storage.bind($rootScope,'tokenAuth',{defaultValue: defaultValue});
            if (!(service.getAppName() in $rootScope.tokenAuth)) {
                // Add the key in case another instance of the plugin already has a different application name in local storage (prevent an 'undefined' error)
                $rootScope.tokenAuth[service.getAppName()] = defaultValue[service.getAppName()];
            }
            var sessionCookie = $cookies.get(service.getAppName());
            if (typeof sessionCookie === "undefined") {
                // Clear localstorage when session cookie doesn't exist
                service.clearTokens();
            }
            if(service.isDebugEnabled()) {
                // Log the sessionCookie
                sessionCookie = $cookies.get(service.getAppName());
                $log.info({ cookieValue : sessionCookie, appName:  service.getAppName() });
            }
            
        },
        /**
         * Retrieves a stored token in local storage by the Application resource 'key'
         * @param {String} tokenKey
         * @returns {String}
         */
        getStoredToken: function(tokenKey) {
            if(tokenKey in $rootScope.tokenAuth[service.getAppName()].applicationResources) {
                if ('token' in $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey]) {
                    // Return the stored token
                    return $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey].token;
                }
            }
            return '';
        },
        /**
         * Removes the session cookie if it exists and does a logout on all token servers
         */
        sessionLogout: function() {
            if (service.isLoggedIn()) {
                // Removes session cookie
                $cookies.remove(service.getAppName());
                var promises = [];
                var tokenServices = [];
                angular.forEach($rootScope.tokenAuth[service.getAppName()].applicationResources,function(value) {
                    if ('tokenService' in value) {
                        if (tokenServices.indexOf(value.tokenService) === -1) {
                            tokenServices.push(value.tokenService);
                        }
                    }
                });
                if(service.isDebugEnabled()) {
                    $log.info({tokenServices: tokenServices});
                }
                angular.forEach(tokenServices,function(value) {
                    var logoutUrl = $filter('tokenAuth_generateLogoutURL')(value);
                    if(service.isDebugEnabled()) {
                        $log.info("Adding promise for: " + logoutUrl);
                    }
                    promises.push($http({method: 'GET', url: logoutUrl }));
                });
                $q.all(promises).then(function(data){
                    service.clearTokens();
                    $location.path(service.getLogoutRoute());
                });
            }
        },
        /**
         * Returns true or false regarding if a token exists for this tokenKey in local storage
         * @param {String} tokenKey
         * @returns {Boolean}
         */
        hasToken: function(tokenKey) {
            if (tokenKey in $rootScope.tokenAuth[service.getAppName()].applicationResources) {
                return ('token' in $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey]);
            } else {
                return false;
            }
        },
        /**
         * Requests a 'token' from the token service referenced by the Application resource 'key'
         * @param {String} tokenKey
         * @returns {Promise}
         */
        requestToken: function(tokenKey) {
            var self = this;
            return $resource($rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey].tokenService + "/request",{},{
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
            }).getToken({'service': $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey].appId}).$promise;
        },
        /**
         * Clears all tokens
         */
        clearTokens: function() {
            angular.forEach($rootScope.tokenAuth[service.getAppName()].applicationResources,function(value, tokenKey) {
                if ('token' in value) {
                    delete $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey].token;
                }
            });
        },
        /**
         * Clears the associated token connected to the provided tokenKey
         * @param {String} tokenKey
         */
        clearToken: function(tokenKey) {
            if (tokenKey in $rootScope.tokenAuth[service.getAppName()].applicationResources) {
                if ('token' in $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey]) {
                    delete $rootScope.tokenAuth[service.getAppName()].applicationResources[tokenKey].token;
                }
            }
        },
        /**
         * Clears all local storage
         */
        clearLocalStorage: function() {
            storage.clearAll();
        },
        /**
         * Returns the route for logging out
         * @returns {String}
         */
        getLogoutRoute: function() {
            if ($injector.has('UsfCAStokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
                if('logoutRoute' in tokenAuthConstant) {
                    return tokenAuthConstant.logoutRoute;
                }
            }
            return '/logout';
        },
        /**
         * Returns the route for logging in
         * @returns {String}
         */
        getLoginRoute: function() {
            if ($injector.has('UsfCAStokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
                if('loginRoute' in tokenAuthConstant) {
                    return tokenAuthConstant.loginRoute;
                }
            }
            return '/login';
        },
        /**
         * Returns the route for unauthorized access
         * @returns {String}
         */
        getUnauthorizedRoute: function() {
            if ($injector.has('UsfCAStokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
                if('unauthorizedRoute' in tokenAuthConstant) {
                    return tokenAuthConstant.unauthorizedRoute;
                }
            }
            return '/unauthorized';
        },
        /**
         * Retrieves the main module name
         * @returns string
         */
        getAppName: function() {
            return $rootElement.attr('ng-app');
        },
        /**
         * Checks to see if debug is turned on
         */
        isDebugEnabled: function() {
            if ($injector.has('UsfCAStokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
                if('debug' in tokenAuthConstant) {
                    return tokenAuthConstant.debug;
                }
            }
            return false;
        },
        /**
         * Returns the global login state true or false based on the global session cookie
         */
        isLoggedIn: function() {            
            var sessionCookie = $cookies.get(service.getAppName());
            if(service.isDebugEnabled()) {
                $log.info({sessionCookie: sessionCookie});
                $log.info({isLoggedIn: (typeof sessionCookie !== "undefined")});
            }
            return (typeof sessionCookie !== "undefined");
        }
    };
    // Handles the login redirect
    $rootScope.$on('event:auth-loginRequired', function() {
        if(service.isDebugEnabled()) {
            $log.info($rootScope.tokenAuth[service.getAppName()].buffer.slice(-1)[0].config.data);
        }
        // Temporily comment until a token can be retrieved
        // $window.alert("Temporary Stop before the redirect to the tokenService!");
        $window.location.assign($rootScope.tokenAuth[service.getAppName()].buffer.slice(-1)[0].config.data.tokenService);
    });
    // Handles the unauthorized redirect
    $rootScope.$on('event:auth-unauthorizedRedirect', function() {
        $location.path(service.getUnauthorizedRoute());
    });
    // Handles the logout and redirect to logout page
    $rootScope.$on('event:tokenAuthLogout', function() {
        service.sessionLogout();
    });
    // Handles the login by redirecting to login page
    $rootScope.$on('event:tokenAuthLogin',function() {
        // Reload the page or route in the logged in state with the cookie now present
        if ($injector.has('UsfCAStokenAuthConstant')) {
            var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
            if('loginRoute' in tokenAuthConstant) {
                $location.path(tokenAuthConstant.loginRoute);
            } else {
                $window.location.reload();
            }
        } else {
            $window.location.reload();
        }
    });
    return service;
}]);
angular.module('UsfCAStokenAuth')
.filter('tokenAuth_generateLogoutURL', function () {
    return function (tokenServiceUrl) {
        return {
            getRootAuthTransfer: function(url) {
              var lastSlashIndex = url.lastIndexOf("/");
              if (lastSlashIndex > url.indexOf("/") + 1) { // if not in http://
                return url.substr(0, lastSlashIndex); // cut it off
              } else {
                return url;
              } 
            }
        }.getRootAuthTransfer(tokenServiceUrl) + "/logout";
    };
});
angular.module('UsfCAStokenAuth')
.filter('tokenAuth_queryStringParams', function () {
    return function (url) {        
        return {
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
        }.getParams(url.substring( url.indexOf('?') + 1 ));
    };
});
angular.module('UsfCAStokenAuth')
.filter('tokenAuth_filterTokenRequestBuffer',[ function () {
    return function (buffer,applicationResources) {
        var newbuffer = [];
        var tokenKeys = [];
        angular.forEach(buffer,function(b, i) {
            // Get the last 401 config in the buffer
            var config = b.config;
            // Get the applicationResource object
            var tokenKey = config.tokenKey;
            if ('appId' in applicationResources[tokenKey] && 'tokenService' in applicationResources[tokenKey] && tokenKeys.indexOf(tokenKey) === -1) {
                tokenKeys.push(tokenKey);
                newbuffer.push(b);
            }
        });
        return newbuffer;
    };
}]);
angular.module('UsfCAStokenAuth')
.factory('tokenAuth_interceptor',['$rootScope', '$q','$log','$filter','$rootElement','$injector', function($rootScope, $q, $log, $filter, $rootElement, $injector) {
    var tokenFunctions = {
        /**
         * Retrieves a stored token in local storage by the Application resource 'key'
         * @param {String} tokenKey
         * @returns {String}
         */
        getStoredToken: function(tokenKey) {
            if(tokenKey in $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources) {
                if ('token' in $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources[tokenKey]) {
                    // Return the stored token
                    return $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources[tokenKey].token;
                }
            }
            return '';
        },
        /**
         * Checks to see if debug is turned on
         */
        isDebugEnabled: function() {
            if ($injector.has('UsfCAStokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
                if('debug' in tokenAuthConstant) {
                    return tokenAuthConstant.debug;
                }
            }
            return false;
        },
        /**
         * Retrieves the main module name
         * @returns string
         */
        getAppName: function() {
            return $rootElement.attr('ng-app');
        }
    };
    // The interceptor methods
    return {
        request: function(config) {
            if ('tokenKey' in config) {
                var token = tokenFunctions.getStoredToken(config.tokenKey);
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
            return config || $q.when(config);
        },
        requestError: function(rejection) {
            if (tokenFunctions.isDebugEnabled()) {
                // Contains the data about the error on the request.
                $log.info(rejection); 
            }
            // Return the promise rejection.
            return $q.reject(rejection);
        },
        response: function(response) {
            return response || $q.when(response);
        },                
        responseError: function(rejection) {
            if (tokenFunctions.isDebugEnabled()) {
                $log.info(rejection); // Contains the data about the error on the response.
            }
            var deferred = $q.defer();
            if (rejection.status === 401 && 'tokenKey' in rejection.config) {
                // Passing the tokenService URL into the config data to be added to the buffer
                rejection.config.data = rejection.data;
                if ('authorizedError' in rejection.data) {
                    // The role is not authorized
                    $rootScope.authorizedError = rejection.data.authorizedError;
                    $rootScope.unauthorizedRole = rejection.data.role;
                    // Triggers the redirect to unauthorized route
                    $rootScope.$broadcast('event:auth-unauthorizedRedirect');  
                } else {
                    // Push the rejection onto the buffer
                    $rootScope.tokenAuth[tokenFunctions.getAppName()].buffer.push({
                        config: rejection.config,
                        deferred: deferred
                    });
                    // Gets the list of passed parameters as a hash
                    var params = $filter('tokenAuth_queryStringParams')(rejection.data.tokenService);
                    var tokenKey = rejection.config.tokenKey;
                    if(!(tokenKey in $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources)) {
                        // The tokenKey needs to be added to the applicationResources
                        $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources[tokenKey] = {};
                    }
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
                        $rootScope.tokenAuth[tokenFunctions.getAppName()].applicationResources[tokenKey][key] = value;
                    }); 
                    // Triggers the redirect to login
                    $rootScope.$broadcast('event:auth-loginRequired');              
                }
                return deferred.promise;
            } else {
                if (tokenFunctions.isDebugEnabled()) {
                    // This is where 302 redirect errors are
                    $log.info({"Rejection" : rejection});            
                }
                return $q.reject(rejection);
            }
            // otherwise, default behaviour
            return $q.reject(rejection);
        }
    };
}]);
angular.module('UsfCAStokenAuth')
.config(['$httpProvider','$resourceProvider', function($httpProvider,$resourceProvider) {
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
    $httpProvider.interceptors.push('tokenAuth_interceptor');
}])
.run(['$rootScope', '$log', '$window', '$location', '$cookies', '$injector', '$q', '$filter','tokenAuth', function($rootScope, $log, $window, $location, $cookies, $injector, $q, $filter, tokenAuth) {
    tokenAuth.initializeStorage();
    /**
     * Cause a full page load on specific route changes.
     */
    $rootScope.$on('$locationChangeStart', function(event, changeTo, changeFrom) {
        var nextPath = $location.path();
        var matchingPaths = [ tokenAuth.getLogoutRoute() ];
        if ($injector.has('UsfCAStokenAuthConstant')) {
            var tokenAuthConstant = $injector.get('UsfCAStokenAuthConstant');
            if('loginRoute' in tokenAuthConstant) {
                matchingPaths.push(tokenAuthConstant.loginRoute);
            }
        }
        if (tokenAuth.isDebugEnabled()) {
            $log.info("$locationChangeStart interception");
            $log.info({ nextPath: nextPath, matchingPaths: matchingPaths });
            $log.info({ authenticated: tokenAuth.isLoggedIn() });
        }      
        if (changeTo === changeFrom) {
            return;
        } else if (matchingPaths.indexOf(nextPath) !== -1) {
            if (tokenAuth.isDebugEnabled()) {
                $log.info("$locationChangeStart path matched on: " + nextPath + " which is " + changeTo);
            }
            // event.preventDefault();
            $rootScope.$evalAsync(function () {
                $window.location.assign(changeTo);
            });
            // $window.location.reload(true);
        //} else if (!tokenAuth.isLoggedIn() && ('loginRoute' in UsfCAStokenAuthConstant)?(UsfCAStokenAuthConstant.loginRoute !== nextPath):false) {
            //  $rootScope.$evalAsync(function () {
            //    $location.path(UsfCAStokenAuthConstant.loginRoute);
        //  });
        }
    });
    // Add the logout function in the root scope with the redirect to the logout rounte
    $rootScope.tokenAuthLogout = function() {
        // Triggers the redirect to logout
        $rootScope.$broadcast('event:tokenAuthLogout');
    };    
    // Add the logout function in the root scope with the redirect to the logout rounte
    $rootScope.tokenAuthLogin = function() {
        // Triggers the redirect to logout
        $rootScope.$broadcast('event:tokenAuthLogin');
    };
    $rootScope.isTokenAuth = function() {
        // Returns the plugin state of the associated session cookie
        return tokenAuth.isLoggedIn();
    };
    var promises = {};
    // Get a filtered list from the buffer unique by tokenKey that matches applicationResources with an appId and tokenServer
    angular.forEach($filter('tokenAuth_filterTokenRequestBuffer')($rootScope.tokenAuth[tokenAuth.getAppName()].buffer,$rootScope.tokenAuth[tokenAuth.getAppName()].applicationResources),function(buffer, i) {
        promises[buffer.config.tokenKey] = tokenAuth.requestToken(buffer.config.tokenKey);
    });
    $q.all(promises).then(function(results) {
        angular.forEach(results,function(result,tokenKey) {
            if (tokenAuth.isDebugEnabled()) {
                $log.info({ requestTokenData: result }); 
            }
            $rootScope.tokenAuth[tokenAuth.getAppName()].applicationResources[tokenKey].token = result.token;
        });
        // Flush the buffer
        $rootScope.tokenAuth[tokenAuth.getAppName()].buffer.length = 0;
        // User is now logged in so set the sessionCookie if it doesn't exist
        var sessionCookie = $cookies.get(tokenAuth.getAppName());
        if (typeof sessionCookie === "undefined") {
            // Ready a new session cookie
            $cookies.put(tokenAuth.getAppName(),new Date().getTime());
            // Reload the page or route in the logged in state with the cookie now present
            $rootScope.$broadcast('event:tokenAuthLogin');
        }
    }, function (errorMessage) {
        if (tokenAuth.isDebugEnabled()) {
            $log.info(errorMessage);
        }
    });
}]);
})( window, window.angular );