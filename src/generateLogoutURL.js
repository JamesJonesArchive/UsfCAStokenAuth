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