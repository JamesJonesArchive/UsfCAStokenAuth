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