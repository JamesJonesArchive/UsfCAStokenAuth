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
            if ($injector.has('tokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('tokenAuthConstant');
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
            if ($injector.has('tokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('tokenAuthConstant');
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
            if ($injector.has('tokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('tokenAuthConstant');
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
            if ($injector.has('tokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('tokenAuthConstant');
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
        if ($injector.has('tokenAuthConstant')) {
            var tokenAuthConstant = $injector.get('tokenAuthConstant');
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