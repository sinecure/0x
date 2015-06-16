/*
 * Phase 0: Hello world?
 *          Implement basic communication between client and server
 *           ✓ Client library 
 *           ✓ Server library
 *           ✓ Communication through location.hash
 *
 * Phase 1: Make it work people!
 *          Implement login and authenticate
 *           ✓ Login / logout
 *           ✓ Authentication
 *           ✓ Separate login and authentication
 *           ✓ Prompt for authentication
 *
 * Phase 2: $passwd->null;
 *          Implement password reset
 *           ✓ Registration screen
 *           ✓ Generate salt
 *           ✓ Store password-hash in cold storage, store salt in browser
 *           ✓ XOR hash and salt before generating key
 *           ✓ Reset screen
 *           ✓ Generate new n value from old hash, old n, and new hash
 *           ✓ Export profile
 *           ✓ Import profile
 *
 * Phase 3: Forget me not
 *          Implement single-sign on session persistance
 *           - Create and sign session keys upon login
 *           - Keys time out
 *
 * Phase 4: whoami
 * TODO: Reconsider how to implement this
 *          Implement profile and per-website identities
 *           - Generate one salt per unique client
 *           ✓ User approval for each website
 *           - Updated profile export
 *
 * Phase 5: AppID
 *          Implement unique id for each client
 *           - As a way for differentiating clients
 *           - Could be unique for each user (stored in localStorage)
 *
 * Phase 6: Schizophrenia
 *          Implement support for multiple identities in the same browser
 */


var BLAKE2s, nacl, scrypt, Base58, coax;

coax = (function() {
    'use strict';
    
    var _profile = {
        'registered': false,
        'n': undefined,
        'id': ''
    };
    
    var _session = {
        'loggedIn': false,
        'id': '',
        'timestamp': 0,
        'keys':  {
            'publicKey': undefined,
            'secretKey': undefined,
            'signature': ''
        },
    };
    
    function _init() {

        _loadProfile();
        if (_profile.registered) {
            _loadSession();
        }
    }

    /* TODO: At some point the profile should be connected to the email 
     * of the user. Storing and loading a profile would load the email-key
     * from localStorage.getItem(email). To enable multiple users of the 
     * same browser.
     */
    function _storeProfile() {
        var encoded = {
            'n': nacl.util.encodeBase64(_profile.n),
            'id': _profile.id
        };
        localStorage.setItem('profile', JSON.stringify(encoded));
    }
    
    function _loadProfile() {
        var profile = localStorage.getItem('profile');
        if (typeof profile === 'string') {
            profile = JSON.parse(profile);
            _profile.n = nacl.util.decodeBase64(profile.n);
            _profile.registered = true;
        }
    }
    
    function _storeSession() {
        var session = {
            'timestamp': _session.timestamp,
            'id': _session.id,
            'keys': {
                'publicKey': nacl.util.encodeBase64(
                    _session.keys.publicKey
                ),
                'secretKey': nacl.util.encodeBase64(
                    _session.keys.secretKey
                ),
                'signature': _session.keys.signature
            },
            'profile': _profile.id
        };
        localStorage.setItem('session', JSON.stringify(session));
    }
    
    function _loadSession() {
        var session = localStorage.getItem('session');
        if (typeof session === 'string') {
            session = JSON.parse(session);
            if (session.timestamp + 5 * 60 * 1000 > Date.now()) {
                _session.timestamp = session.timestamp;
                _session.id = session.id;
                _session.keys.publicKey = nacl.util.decodeBase64(
                    session.keys.publicKey
                );
                _session.keys.secretKey = nacl.util.decodeBase64(
                    session.keys.secretKey
                );
                _session.keys.signature = session.keys.signature;
                
                _profile.id = session.profile;
                
                _session.loggedIn = true;
            }
        }
    }
    
    function _createSession(seed) {
        // Generate master keys
        for (var i = 0; i < seed.length; i++) {
    	    seed[i] ^= _profile.n[i];
    	}
        var master =  nacl.sign.keyPair.fromSeed(seed);
        _profile.id = _coax.crypto.generateID(master.publicKey);
        
        // Generate and sign session keys
        _session.keys = nacl.sign.keyPair();
        _session.id = _coax.crypto.generateID(_session.keys.publicKey);
        _session.timestamp = Date.now();
        _session.keys.signature = nacl.util.encodeBase64(
            nacl.sign.detached(
                nacl.util.decodeUTF8(
                    _profile.id + 
                    _session.id +
                    _session.timestamp
                ),
                master.secretKey
            )
        );
        
        // Attempt to erase master secret key
        var x = nacl.randomBytes(master.secretKey.length);
        for (var i = 0; i < master.secretKey.length; i++) {
            master.secretKey[i] ^= x[i];
        }
        delete master.secretKey;
        
        // TODO: Store session
        _storeSession();
        
        _session.loggedIn = true;
    }
    
    var _coax = {
        
        'register': function (email, key, callback) {
            _coax.crypto.generateHash(key, email, function (hash) {
                // TODO: consider revising to generateId style checksum
                var reset = Base58.encode(hash);
                
                // Create n-value
                _profile.n = nacl.randomBytes(hash.length);
                _profile.registered = true;
                // TODO: UPDATE! store profile
                _storeProfile();
                
                // Create session
                _createSession(hash);
                
                callback(_profile.id, reset);
            });
        },
        
        'isRegistered': function () {
            return _profile.registered;
        },

        // TODO: Update
        'reset': function (email, key, _hash, callback) {
            // TODO: Sanity check
            _hash = Base58.decode(_hash);
            _coax.crypto.generateHash(key, email, function (hash) {
                
                var reset = Base58.encode(hash);
                
                // Derive new n-value
                for (var i = 0; i < hash.length; i++) {
                    _profile.n[i] ^= _hash[i] ^ hash[i];
                }
                _storeProfile();
                
                // Create session
                _createSession(hash);
                
                callback(_profile.id, reset);
            });
        },
        
        'importProfile': function (profile) {
            profile = JSON.parse(profile);
            profile.n = nacl.util.decodeBase64(profile.n);
            _profile = profile;
            _storeProfile();
        },
        
        'exportProfile': function () {
            var profile = {
                'n': nacl.util.encodeBase64(_profile.n),
                'id': _profile.id
            };
            profile = JSON.stringify(profile);
            return profile;
        },
        
        'login': function (email, key, callback) {
            _coax.crypto.generateHash(key, email, function (hash) {
                
                // Create session
                _createSession(hash);

    		    callback(_profile.id);
            });
        },
        
        'logout': function () {
            localStorage.removeItem('session');
        },
        
        'isLoggedIn': function () {
            return _session.loggedIn;
        },
        
        'authenticate': function (parameters, referrer) {
            // TODO: Add more parameters to sign (TS, session keys, etc.)
            // probably want to hash all the inputs individually before 
            // signing to prevent signature forging. This really needs further 
            // thought. Consider challenge=''.
            // TODO: sanity check
            var timestamp = Date.now();
            var message = parameters.challenge + 
//                    parameters.url +
//                    referrer +
                    timestamp + 
                    _profile.id + 
                    _session.id +
                    _session.keys.signature + 
                    _session.timestamp
            message = nacl.util.decodeUTF8(message);
            var signature = nacl.sign.detached(message, _session.keys.secretKey);
            var response = {
                'id': _profile.id,
                'now': timestamp,
                'response': nacl.util.encodeBase64(signature),
                'key': _session.id,
                'timestamp': _session.timestamp,
                'signature': _session.keys.signature,
            }
            return response;
            
            // remember confused deputy problem.
        },
        
        'isRequestingAuthorization': function () {
            return location.hash && location.hash.match(/^#auth&/);
        },
        
        'getId': function () {
            return _session.id;
        },
        
        'crypto': {
            
            // Adapted from miniLock.crypto.getKeyPair, but for signing.
            'generateHash': function (key, salt, callback) {
            	var keyHash = new BLAKE2s(32);
            	keyHash.update(nacl.util.decodeUTF8(key));
            	salt = nacl.util.decodeUTF8(salt);
            	scrypt(
            	    keyHash.digest(), 
            	    salt, 
            	    17, 
            	    8, 
            	    32, 
            	    1000, 
	                function(hash) {
		                callback(nacl.util.decodeBase64(hash));
	                },
	                'base64'
                );
            },
            
            /* Corresponds exactly to miniLock.crypto.getMiniLockID, but
             * uses Base64 instead.
             * Though Base58 is better from a human readability perspective,
             * the signing keys are not meant for reading and the client does 
             * not have to include the Base58 library. This reduces the 
             * code base and therefore the attack surface.
             */
            'generateID': function (key) {
                if (key.length !== 32) {
            		throw new Error('miniLock.crypto.getMiniLockID: ' +
            		                'invalid public key size');
            	}
    	        var id = new Uint8Array(33);
            	for (var i = 0; i < key.length; i++) {
            		id[i] = key[i];
            	}
            	var hash = new BLAKE2s(1);
            	hash.update(key);
            	id[32] = hash.digest()[0];
            	return nacl.util.encodeBase64(id);
            },
            
            'sign': function () {
                
            },
            
            'verify': function () {
                
            }
        },
        
        'util': {
            'parseParameters': function (string, parameters) {
                var result = {};
                if (typeof string == 'string' && typeof parameters == 'object') {
                    for (var i in parameters) {
                        var match = string.match('&' + i + '=([^&]+)');
                        if (match != null) {
                            result[i] = match[1];
                        } else if (parameters[i]) {
                            throw "Missing mandatory parameter";
                        }
                    }
                    return result;
                } else {
                    throw "Incorrect parameter types";
                }
            }

        }
    };
    
    _init();
    return _coax;
})();