var coax;
coax.ui = function() {
    var _button = {
        'login': undefined,
        'authorize': undefined,
        // TODO: reject
        'register': undefined,
        'reset-code-show': undefined,
        'reset': undefined,
        'logout': undefined,
        // 'settings': undefined,
        'reset-show': undefined,
        'export-show': undefined,
        'import-show': undefined,
        // TODO: back
    };
    
    var _panel = {
        'login': undefined,
        'progress': undefined,
        'authorize': undefined,
        'register': undefined,
        'registered': undefined,
        'loggedin': undefined,
        'loggedin-id': undefined,
        'id': undefined,
        'reset': undefined,
        'export': undefined,
        'import': undefined,
        'reset-code-show': undefined,
        'referrer': undefined,
    };
    
    var _input = {
        'login-user': undefined,
        'login-pass': undefined,
        'register-user': undefined,
        'register-pass': undefined,
        'registered-reset': undefined,
        'reset-user': undefined,
        'reset-pass': undefined,
        'reset-code': undefined,
        'export-code': undefined,
        'import-code': undefined,
    };
    
    var _active = [];
    
    function _clear() {
        // TODO: clear active panels
    }
    
    var _ui = {
        
        //init UI
        'init': function init() {
            
            for (var i in _button) {
                _button[i] = document.getElementById('button-' + i);
                _button[i].addEventListener('click', _ui[i]);
            }
            
            for (var i in _panel) {
                _panel[i] = document.getElementById('panel-' + i);
            }
            
            for (var i in _input) {
                _input[i] = document.getElementById('input-' + i);
            }
                
            _panel['referrer'].appendChild(
                document.createTextNode(document.referrer)
            );

            if (!coax.isRegistered()) {
                _panel['register'].style.display = 'block';
                _button['import-show'].style.display = 'inline';
            } else if (!coax.isLoggedIn()) {
                _panel['login'].style.display = 'block';
                _button['reset-show'].style.display = 'inline';
            } else if (coax.isRequestingAuthorization()) {
                _panel['authorize'].style.display = 'block';
                _button['logout'].style.display = 'inline';
                _button['export-show'].style.display = 'inline';
            } else {
                _panel['loggedin'].style.display = 'block';
                /*
                _panel['loggedin-id'].appendChild(
                    document.createTextNode(id)
                );
                _panel['id'].appendChild(
                    document.createTextNode(id)
                );*/
//                document.getElementById('settings').style.display = 'block';
            }
        },
        
        
        'login': function(){
        
            // Login
            var username = _input['login-user'].value;
            var password = _input['login-pass'].value;
            
            _input['login-user'].value = '';
            _input['login-pass'].value = '';
            
            _panel['login'].style.display = 'none';
            _panel['progress'].style.display = 'block';
            
            coax.login(username, password, function (id) {
                _panel['progress'].style.display = 'none';
                _panel['loggedin'].style.display = 'block';
                
                _panel['loggedin-id'].appendChild(
                    document.createTextNode(id)
                );
                _panel['id'].appendChild(
                    document.createTextNode(id)
                );
                
                _button['reset-show'].style.display = 'none';
                _button['export-show'].style.display = 'inline';
                _button['logout'].style.display = 'inline';
                
                if (coax.isRequestingAuthorization()) {
                    _panel['authorize'].style.display = 'block';
                }
            });
        },
        
        'authorize': function () {
            // Retrieve parameters
            var parameters = {
                'challenge': true,
                'appid': false,
                'url': false
            };
            
            /* TODO: Referrer sanity check (^https?:...)
             */
            parameters = coax.util.parseParameters(location.hash, parameters);
            var response = coax.authenticate(parameters, document.referrer);
            var responseString = '#auth'
            for (var i in response) {
                responseString += '&' + i + '=' + response[i];
            }
            /* TODO: Match url parameter against referrer and redirect to url
             * instead.
             */
            location.href = document.referrer + responseString;
        },
        
        'register': function () {
            
            var username = _input['register-user'].value;
            var password = _input['register-pass'].value;
            
            _input['register-user'].value = '';
            _input['register-pass'].value = '';
            
            _panel['register'].style.display = 'none';
            _panel['progress'].style.display = 'block';
            
            coax.register(username, password, function (id, hash) {
                _panel['progress'].style.display = 'none';
                
                _panel['loggedin'].style.display = 'block';
                _panel['loggedin-id'].appendChild(
                    document.createTextNode(id)
                );
                _panel['id'].appendChild(
                    document.createTextNode(id)
                );
                
                _panel['registered'].style.display = 'block';
                _input['registered-reset'].value = hash;
                
                _button['import-show'].style.display = 'none';
                _button['export-show'].style.display = 'inline';
                _button['logout'].style.display = 'inline';
                
                if (coax.isRequestingAuthorization()) {
                    _panel['authorize'].style.display = 'block';
                }
            });
        },
        
        'reset-show': function () {
            _panel['login'].style.display = 'none';
            _panel['reset'].style.display = 'block';
        },
        
        'reset-code-show': function() {
            _panel['reset-code-show'].style.display = 'inline';
        },
        
        'reset': function () {

            var username = _input['reset-user'].value;
            var password = _input['reset-pass'].value;
            var code = _input['reset-code'].value;
            
            _input['reset-user'].value = '';
            _input['reset-user'].value = '';
            _input['reset-user'].value = '';
            
            _panel['reset'].style.display = 'none';
            _panel['progress'].style.display = 'block';
            
            coax.reset(username, password, code, function (id, hash) {
                _panel['progress'].style.display = 'none';
                
                _panel['loggedin'].style.display = 'block';
                _panel['loggedin-id'].appendChild(
                    document.createTextNode(id)
                );
                _panel['id'].appendChild(
                    document.createTextNode(id)
                );
                
                _panel['registered'].style.display = 'block';
                _input['registered-reset'].value = hash;
                
                if (coax.isRequestingAuthorization()) {
                    _panel['authorize'].style.display = 'block';
                }
            });
        },
        
        'export-show': function () {
            _panel['login'].style.display = 'none';
            _panel['export'].style.display = 'block';
            _input['export-code'].value = coax.exportProfile();
        },
        
        /* TODO: No export button 
         * export': function () {
         *     _panel['export'].style.display = 'block';
         *     // TODO: back button
         * },
         */
         
        'import-show': function () {
            _panel['login'].style.display = 'none';
            _panel['import'].style.display = 'block';
        },
        
        'import': function () {
            // TODO: rerun init?
            var profile = _input['import-code'].value;
            coax.importProfile(profile);
        },
        
        'logout': function () {
            coax.logout();
            // TODO: clear active panels
            for (var i in _panel) {
                _panel[i].style.display = 'none';
            }
            _panel['login'].style.display = 'block';
        }
    };
    
    return _ui;
}();

window.addEventListener('load', coax.ui.init);