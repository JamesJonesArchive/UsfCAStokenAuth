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
            /**
             * Fully reload the page, not just the route
             */
            // event.preventDefault();
            $rootScope.$evalAsync(function () {
                $window.location.assign(changeTo);
            });
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