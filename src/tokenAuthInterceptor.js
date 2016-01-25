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
            if ($injector.has('tokenAuthConstant')) {
                var tokenAuthConstant = $injector.get('tokenAuthConstant');
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