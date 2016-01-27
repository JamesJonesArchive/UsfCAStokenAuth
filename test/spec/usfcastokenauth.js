'use strict';

describe('usfcastokenauth module', function () {
    var tokenAuth, storage, scope;
    
    beforeEach(function () {
        module('UsfCAStokenAuth');

        inject(function ($injector) {
            storage = $injector.get('storage');
            tokenAuth = $injector.get('tokenAuth');
            tokenAuth.initializeStorage();
        });
    });
    
    describe('when use set() && get() methods', function () {
        beforeEach(function () {
            inject(function ($rootScope) {
                scope = $rootScope.$new();

            });
        });
        
        it('get stored token using a token key that does not exist should return empty value', function () {
            expect('').toEqual(tokenAuth.getStoredToken('somekey'));
        });
        
        it('show a token exist is false for key that does not exist', function () {
            expect(tokenAuth.hasToken('somekey')).toEqual(false);
        });
        
        
    });
});


