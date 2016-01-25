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