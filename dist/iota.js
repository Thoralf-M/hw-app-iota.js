'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _struct = require('struct');

var _struct2 = _interopRequireDefault(_struct);

var _bundle = require('iota.lib.js/lib/crypto/bundle/bundle');

var _bundle2 = _interopRequireDefault(_bundle);

var _utils = require('iota.lib.js/lib/utils/utils');

var _bip32Path = require('bip32-path');

var _bip32Path2 = _interopRequireDefault(_bip32Path);

var _input_validator = require('./input_validator');

var inputValidator = _interopRequireWildcard(_input_validator);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * IOTA API
 * @module hw-app-iota
 */

var CLA = 0x7a;
var Commands = {
  // specific timeouts:
  INS_SET_SEED: 0x01, // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_PUBKEY: 0x02, // TIMEOUT_CMD_PUBKEY
  INS_TX: 0x03, // TIMEOUT_CMD_NON_USER_INTERACTION => TIMEOUT_CMD_USER_INTERACTION (IF cur_idx == lst_idx)
  INS_SIGN: 0x04, // TIMEOUT_CMD_PUBKEY
  INS_GET_APP_CONFIG: 0x10, // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_RESET: 0xff // TIMEOUT_CMD_NON_USER_INTERACTION
};
var TIMEOUT_CMD_PUBKEY = 10000;
var TIMEOUT_CMD_NON_USER_INTERACTION = 10000;
var TIMEOUT_CMD_USER_INTERACTION = 120000;

var LEGACY_VERSION_MINOR = 5;

var EMPTY_TAG = '9'.repeat(27);

/**
 * Provides meaningful responses to error codes returned by IOTA Ledger app
 * @param {Object} error - Error statusCode
 * @returns {String} String message corresponding to error statusCode
 */
function getIOTAStatusMessage(error) {
  // no status code so must not even be communicating
  if (error.id == 'U2F_5') {
    return 'Ledger device timeout. Ensure Ledger is plugged in and IOTA app is running';
  }

  switch (error.statusCode) {
    // improve text of most common errors
    case 0x9000:
      // SW_OK
      return 'Success';
    case 0x6700:
      // SW_INCORRECT_LENGTH
      return 'Incorrect input length';
    case 0x6982:
      // SW_SECURITY_STATUS_NOT_SATISFIED
      return 'Security not satisfied (Denied by user)';
    case 0x6c00:
      // SW_INCORRECT_LENGTH_P3
      return 'Incorrect length specified in header';
    case 0x6d00:
      // SW_INS_NOT_SUPPORTED
      return 'Invalid INS command';
    case 0x6e00:
      // SW_CLA_NOT_SUPPORTED
      return 'Incorrect CLA (Wrong application opened)';
    case 0x6984:
      // SW_COMMAND_INVALID_DATA
      return 'Invalid input data';
    case 0x6985:
      // SW_COMMAND_INVALID_STATE
      return 'Invalid ledger state (Command out of order(?))';
    case 0x6986:
      // SW_APP_NOT_INITIALIZED
      return 'App has not been initialized by user';
    case 0x6987:
      // SW_BAD_SEED
      return 'Invalid seed';
    case 0x6991:
      // SW_TX_INVALID_INDEX
      return 'Invalid transaction index';
    case 0x6992:
      // SW_TX_INVALID_ORDER
      return 'Invalid transaction order (Output, Inputs, Change)';
    case 0x6993:
      // SW_TX_INVALID_META
      return 'Invalid meta transaction';
    case 0x6994:
      // SW_TX_INVALID_OUTPUT
      return 'Invalid output transaction (Output must come first)';
    case 0x69a1:
      // SW_BUNDLE_ERROR + INSECURE HASH
      return 'Insecure hash';
    case 0x69a2:
      // SW_BUNDLE_ERROR + NON-ZERO BALANCE
      return 'Non zero balance';
    case 0x69a3:
      // SW_BUNDLE_ERROR + INVALID META TX
      return 'Invalid meta transaction';
    case 0x69a4:
      // SW_BUNDLE_ERROR + INVALID ADDRESS INDEX
      return 'Invalid input address/index pair(s)';
    case 0x69a5:
      // SW_BUNDLE_ERROR + ADDRESS REUSED
      return 'Address reused';
    default:
      // UNKNOWN ERROR CODE
      return error.message;
  }
}

/**
 * Class for the interaction with the Ledger IOTA application.
 *
 * @example
 * import Iota from "hw-app-iota";
 * const iota = new Iota(transport);
 */

var Iota = function () {
  function Iota(transport) {
    (0, _classCallCheck3.default)(this, Iota);

    this.transport = transport;
    this.security = 0;
    this.pathArray = undefined;
    transport.decorateAppAPIMethods(this, ['setActiveSeed', 'getAddress', 'signTransaction', 'getAppVersion'], 'IOT');
  }

  /**
   * Prepares the IOTA seed to be used for subsequent calls
   *
   * @param {String} path - String representation of the BIP32 path. At most 5 levels.
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveSeed("44'/4218'/0'/0/0", 2);
   **/


  (0, _createClass3.default)(Iota, [{
    key: 'setActiveSeed',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(path) {
        var security = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        var pathArray, appConfig;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (_bip32Path2.default.validateString(path)) {
                  _context.next = 2;
                  break;
                }

                throw new Error('Invalid BIP32 path string');

              case 2:
                pathArray = _bip32Path2.default.fromString(path).toPathArray();

                if (!(!pathArray || pathArray.length < 2 || pathArray.length > 5)) {
                  _context.next = 5;
                  break;
                }

                throw new Error('Invalid BIP32 path length');

              case 5:
                if (inputValidator.isSecurity(security)) {
                  _context.next = 7;
                  break;
                }

                throw new Error('Invalid security level provided');

              case 7:

                this.pathArray = pathArray;
                this.security = security;

                // query the version everytime
                _context.next = 11;
                return this._getAppConfig();

              case 11:
                appConfig = _context.sent;

                if (!(appConfig.app_version_minor < LEGACY_VERSION_MINOR)) {
                  _context.next = 19;
                  break;
                }

                // use legacy structs
                this._createPubkeyInput = this._createPubkeyInputLegacy;
                this._createTxInput = this._createTxInputLegacy;

                _context.next = 17;
                return this._setSeed();

              case 17:
                _context.next = 21;
                break;

              case 19:
                _context.next = 21;
                return this._reset(true);

              case 21:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function setActiveSeed(_x2) {
        return _ref.apply(this, arguments);
      }

      return setActiveSeed;
    }()

    /**
     * Generates an address index-based.
     * The result depends on the initalized seed and security level.
     * @param {Integer} index - Index of the address
     * @param {Object} [options]
     * @param {Boolean} [options.checksum=false] - Append 9 tryte checksum
     * @param {Boolean} [options.display=false] - Display generated address on display
     * @returns {Promise<String>} Tryte-encoded address
     * @example
     * iota.getAddress(0, { checksum: true });
     **/

  }, {
    key: 'getAddress',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(index) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var address;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (this.security) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('Seed not yet initalized');

              case 2:
                if (inputValidator.isIndex(index)) {
                  _context2.next = 4;
                  break;
                }

                throw new Error('Invalid Index provided');

              case 4:

                options.checksum = options.checksum || false;
                options.display = options.display || false;

                _context2.next = 8;
                return this._publicKey(index, options.display);

              case 8:
                address = _context2.sent;

                if (!options.checksum) {
                  _context2.next = 11;
                  break;
                }

                return _context2.abrupt('return', (0, _utils.addChecksum)(address));

              case 11:
                return _context2.abrupt('return', address);

              case 12:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getAddress(_x4) {
        return _ref2.apply(this, arguments);
      }

      return getAddress;
    }()

    /**
     * Returns an array of raw transaction data (trytes) including the signatures.
     *
     * @param {Object[]} transfers - Transfer objects
     * @param {String} transfers[].address - Tryte-encoded address of recipient, with or without the 9 tryte checksum
     * @param {Integer} transfers[].value - Value to be transferred
     * @param {String} transfers[].tag - Tryte-encoded tag. Maximum value is 27 trytes.
     * @param {Object[]} inputs - Inputs used for funding the transfer
     * @param {String} inputs[].address - Tryte-encoded source address, with or without the 9 tryte checksum
     * @param {Integer} inputs[].balance - Balance of that input
     * @param {String} inputs[].keyIndex - Index of the address
     * @param {Object} [remainder] - Destination for sending the remainder value (of the inputs) to.
     * @param {String} remainder.address - Tryte-encoded address, with or without the 9 tryte checksum
     * @param {Integer} remainder.keyIndex - Index of the address
     * @returns {Promise<String[]>} Transaction trytes of 2673 trytes per transaction
     */

  }, {
    key: 'signTransaction',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(transfers, inputs, remainder) {
        var balance, payment, trytes;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (this.security) {
                  _context3.next = 2;
                  break;
                }

                throw new Error('Seed not yet initalized');

              case 2:
                if (inputValidator.isTransfersArray(transfers)) {
                  _context3.next = 4;
                  break;
                }

                throw new Error('Invalid transfers array provided');

              case 4:
                if (inputValidator.isInputsArray(inputs)) {
                  _context3.next = 6;
                  break;
                }

                throw new Error('Invalid inputs array provided');

              case 6:

                // filter unnecessary inputs
                inputs = inputs.filter(function (input) {
                  return input.balance > 0;
                });

                if (!(inputs.length < 1)) {
                  _context3.next = 9;
                  break;
                }

                throw new Error('At least one input required');

              case 9:
                if (!(transfers.length > 1 || inputs.length > 2)) {
                  _context3.next = 11;
                  break;
                }

                throw new Error('Unsupported number of transfers or inputs');

              case 11:
                balance = inputs.reduce(function (a, i) {
                  return a + i.balance;
                }, 0);
                payment = transfers.reduce(function (a, t) {
                  return a + t.value;
                }, 0);

                if (!(balance === payment)) {
                  _context3.next = 17;
                  break;
                }

                // ignore the remainder, if there is no change
                remainder = undefined;
                _context3.next = 19;
                break;

              case 17:
                if (remainder) {
                  _context3.next = 19;
                  break;
                }

                throw new Error('Remainder object required');

              case 19:
                if (!remainder) {
                  _context3.next = 23;
                  break;
                }

                if (inputValidator.isRemainderObject(remainder)) {
                  _context3.next = 22;
                  break;
                }

                throw new Error('Invalid remainder object provided');

              case 22:

                remainder = {
                  address: remainder.address,
                  value: balance - payment,
                  keyIndex: remainder.keyIndex
                };

              case 23:
                _context3.next = 25;
                return this._signTransaction(transfers, inputs, remainder);

              case 25:
                trytes = _context3.sent;
                _context3.next = 28;
                return this._reset(true);

              case 28:
                return _context3.abrupt('return', trytes);

              case 29:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function signTransaction(_x5, _x6, _x7) {
        return _ref3.apply(this, arguments);
      }

      return signTransaction;
    }()

    /**
     * Retrieves version information about the installed application.
     *
     * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
     **/

  }, {
    key: 'getAppVersion',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
        var config;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this._getAppConfig();

              case 2:
                config = _context4.sent;
                return _context4.abrupt('return', '' + config.app_version_major + '.' + config.app_version_minor + '.' + config.app_version_patch);

              case 4:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getAppVersion() {
        return _ref4.apply(this, arguments);
      }

      return getAppVersion;
    }()

    ///////// Private methods should not be called directly! /////////

  }, {
    key: '_addSeedFields',
    value: function _addSeedFields(struct) {
      return struct.word8('security').word32Ule('pathLength').array('pathArray', this.pathArray.length, 'word32Ule');
    }
  }, {
    key: '_initSeedFields',
    value: function _initSeedFields(struct) {
      var fields = struct.fields;
      fields.security = this.security;
      fields.pathLength = this.pathArray.length;
      fields.pathArray = this.pathArray;
    }
  }, {
    key: '_setSeed',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
        var setSeedInStruct;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                setSeedInStruct = new _struct2.default();

                this._addSeedFields(setSeedInStruct);

                setSeedInStruct.allocate();
                this._initSeedFields(setSeedInStruct);

                _context5.next = 6;
                return this._sendCommand(Commands.INS_SET_SEED, 0, 0, setSeedInStruct.buffer(), TIMEOUT_CMD_NON_USER_INTERACTION);

              case 6:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function _setSeed() {
        return _ref5.apply(this, arguments);
      }

      return _setSeed;
    }()
  }, {
    key: '_createPubkeyInputLegacy',
    value: function _createPubkeyInputLegacy(index) {
      var struct = new _struct2.default();
      struct = struct.word32Ule('index');

      struct.allocate();

      struct.fields.index = index;

      return struct;
    }
  }, {
    key: '_createPubkeyInput',
    value: function _createPubkeyInput(index) {
      var struct = new _struct2.default();
      this._addSeedFields(struct);
      struct = struct.word32Ule('index');

      struct.allocate();

      this._initSeedFields(struct);
      struct.fields.index = index;

      return struct;
    }
  }, {
    key: '_publicKey',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(index, display) {
        var pubkeyInStruct, response, pubkeyOutStruct;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                pubkeyInStruct = this._createPubkeyInput(index);
                _context6.next = 3;
                return this._sendCommand(Commands.INS_PUBKEY, display ? 0x01 : 0x00, 0, pubkeyInStruct.buffer(), TIMEOUT_CMD_PUBKEY);

              case 3:
                response = _context6.sent;
                pubkeyOutStruct = new _struct2.default().chars('address', 81);

                pubkeyOutStruct.setBuffer(response);

                return _context6.abrupt('return', pubkeyOutStruct.fields.address);

              case 7:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _publicKey(_x8, _x9) {
        return _ref6.apply(this, arguments);
      }

      return _publicKey;
    }()
  }, {
    key: '_sign',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(index) {
        var signInStruct, response, signOutStruct;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                signInStruct = new _struct2.default().word32Ule('index');


                signInStruct.allocate();
                signInStruct.fields.index = index;

                _context7.next = 5;
                return this._sendCommand(Commands.INS_SIGN, 0, 0, signInStruct.buffer(), TIMEOUT_CMD_PUBKEY);

              case 5:
                response = _context7.sent;
                signOutStruct = new _struct2.default().chars('signature', 243).word8Sle('fragmentsRemaining');

                signOutStruct.setBuffer(response);

                return _context7.abrupt('return', {
                  signature: signOutStruct.fields.signature,
                  fragmentsRemaining: signOutStruct.fields.fragmentsRemaining
                });

              case 9:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _sign(_x10) {
        return _ref7.apply(this, arguments);
      }

      return _sign;
    }()
  }, {
    key: '_createTxInputLegacy',
    value: function _createTxInputLegacy(address, address_idx, value, tag, tx_idx, tx_len, time) {
      var struct = new _struct2.default();
      struct = struct.chars('address', 81).word32Ule('address_idx').word64Sle('value').chars('tag', 27).word32Ule('tx_idx').word32Ule('tx_len').word32Ule('time');

      struct.allocate();

      var fields = struct.fields;
      fields.address = address;
      fields.address_idx = address_idx;
      fields.value = value;
      fields.tag = tag;
      fields.tx_idx = tx_idx;
      fields.tx_len = tx_len;
      fields.time = time;

      return struct;
    }
  }, {
    key: '_createTxInput',
    value: function _createTxInput(address, address_idx, value, tag, tx_idx, tx_len, time) {
      var struct = new _struct2.default();
      if (tx_idx == 0) {
        this._addSeedFields(struct);
      }
      struct = struct.chars('address', 81).word32Ule('address_idx').word64Sle('value').chars('tag', 27).word32Ule('tx_idx').word32Ule('tx_len').word32Ule('time');

      struct.allocate();

      if (tx_idx == 0) {
        this._initSeedFields(struct);
      }
      var fields = struct.fields;
      fields.address = address;
      fields.address_idx = address_idx;
      fields.value = value;
      fields.tag = tag;
      fields.tx_idx = tx_idx;
      fields.tx_len = tx_len;
      fields.time = time;

      return struct;
    }
  }, {
    key: '_transaction',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(address, address_idx, value, tag, tx_idx, tx_len, time) {
        var txInStruct, timeout, response, txOutStruct;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                txInStruct = this._createTxInput(address, address_idx, value, tag, tx_idx, tx_len, time);
                timeout = TIMEOUT_CMD_NON_USER_INTERACTION;

                if (tx_idx == tx_len) {
                  timeout = TIMEOUT_CMD_USER_INTERACTION;
                }

                _context8.next = 5;
                return this._sendCommand(Commands.INS_TX, tx_idx == 0 ? 0x00 : 0x80, 0, txInStruct.buffer(), timeout);

              case 5:
                response = _context8.sent;
                txOutStruct = new _struct2.default().word8('finalized').chars('bundleHash', 81);

                txOutStruct.setBuffer(response);

                return _context8.abrupt('return', {
                  finalized: txOutStruct.fields.finalized,
                  bundleHash: txOutStruct.fields.bundleHash
                });

              case 9:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function _transaction(_x11, _x12, _x13, _x14, _x15, _x16, _x17) {
        return _ref8.apply(this, arguments);
      }

      return _transaction;
    }()
  }, {
    key: '_getSignatureFragments',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(index) {
        var signature, result;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                signature = '';

              case 1:
                if (!true) {
                  _context9.next = 10;
                  break;
                }

                _context9.next = 4;
                return this._sign(index);

              case 4:
                result = _context9.sent;

                signature += result.signature;

                if (result.fragmentsRemaining) {
                  _context9.next = 8;
                  break;
                }

                return _context9.abrupt('break', 10);

              case 8:
                _context9.next = 1;
                break;

              case 10:
                return _context9.abrupt('return', signature.match(/.{2187}/g));

              case 11:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function _getSignatureFragments(_x18) {
        return _ref9.apply(this, arguments);
      }

      return _getSignatureFragments;
    }()
  }, {
    key: '_addSignatureFragmentsToBundle',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(bundle) {
        var i, address, signatureFragments, j, tx;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                i = 0;

              case 1:
                if (!(i < bundle.bundle.length)) {
                  _context10.next = 21;
                  break;
                }

                if (!(bundle.bundle[i].value >= 0)) {
                  _context10.next = 4;
                  break;
                }

                return _context10.abrupt('continue', 18);

              case 4:
                address = bundle.bundle[i].address;
                _context10.next = 7;
                return this._getSignatureFragments(i);

              case 7:
                signatureFragments = _context10.sent;


                bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

                // set the signature fragments for all successive meta transactions
                j = 1;

              case 10:
                if (!(j < this.security)) {
                  _context10.next = 18;
                  break;
                }

                if (!(++i >= bundle.bundle.length)) {
                  _context10.next = 13;
                  break;
                }

                return _context10.abrupt('return');

              case 13:
                tx = bundle.bundle[i];

                if (tx.address === address && tx.value === 0) {
                  tx.signatureMessageFragment = signatureFragments.shift();
                }

              case 15:
                j++;
                _context10.next = 10;
                break;

              case 18:
                i++;
                _context10.next = 1;
                break;

              case 21:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function _addSignatureFragmentsToBundle(_x19) {
        return _ref10.apply(this, arguments);
      }

      return _addSignatureFragmentsToBundle;
    }()
  }, {
    key: '_signBundle',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(bundle, addressKeyIndices) {
        var finalized, bundleHash, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, tx, keyIndex, result;

        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                finalized = false;
                bundleHash = '';
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context11.prev = 5;
                _iterator = (0, _getIterator3.default)(bundle.bundle);

              case 7:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context11.next = 18;
                  break;
                }

                tx = _step.value;
                keyIndex = addressKeyIndices[tx.address] ? addressKeyIndices[tx.address] : 0;
                _context11.next = 12;
                return this._transaction(tx.address, keyIndex, tx.value, tx.obsoleteTag, tx.currentIndex, tx.lastIndex, tx.timestamp);

              case 12:
                result = _context11.sent;

                finalized = result.finalized;
                bundleHash = result.bundleHash;

              case 15:
                _iteratorNormalCompletion = true;
                _context11.next = 7;
                break;

              case 18:
                _context11.next = 24;
                break;

              case 20:
                _context11.prev = 20;
                _context11.t0 = _context11['catch'](5);
                _didIteratorError = true;
                _iteratorError = _context11.t0;

              case 24:
                _context11.prev = 24;
                _context11.prev = 25;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 27:
                _context11.prev = 27;

                if (!_didIteratorError) {
                  _context11.next = 30;
                  break;
                }

                throw _iteratorError;

              case 30:
                return _context11.finish(27);

              case 31:
                return _context11.finish(24);

              case 32:
                if (finalized) {
                  _context11.next = 34;
                  break;
                }

                throw new Error('Bundle not finalized');

              case 34:
                if (!(bundleHash !== bundle.bundle[0].bundle)) {
                  _context11.next = 36;
                  break;
                }

                throw new Error('Wrong bundle hash');

              case 36:
                _context11.next = 38;
                return this._addSignatureFragmentsToBundle(bundle);

              case 38:
                return _context11.abrupt('return', bundle);

              case 39:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this, [[5, 20, 24, 32], [25,, 27, 31]]);
      }));

      function _signBundle(_x20, _x21) {
        return _ref11.apply(this, arguments);
      }

      return _signBundle;
    }()
  }, {
    key: '_hasDuplicateAddresses',
    value: function _hasDuplicateAddresses(transfers, inputs, remainder) {
      var set = new _set2.default();
      transfers.forEach(function (t) {
        return set.add(t.address);
      });
      inputs.forEach(function (i) {
        return set.add(i.address);
      });
      if (remainder && set.has(remainder.address)) {
        return true;
      }

      return set.length === transfers.length + inputs.length;
    }
  }, {
    key: '_signTransaction',
    value: function () {
      var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(transfers, inputs, remainder) {
        var _this = this;

        var timestamp, bundle, addressKeyIndices, bundleTrytes;
        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                // remove checksums
                transfers.forEach(function (t) {
                  return t.address = (0, _utils.noChecksum)(t.address);
                });
                inputs.forEach(function (i) {
                  return i.address = (0, _utils.noChecksum)(i.address);
                });
                if (remainder) {
                  remainder.address = (0, _utils.noChecksum)(remainder.address);
                }

                if (!this._hasDuplicateAddresses(transfers, inputs, remainder)) {
                  _context12.next = 5;
                  break;
                }

                throw new Error('transaction must not contain duplicate addresses');

              case 5:

                // pad transfer tags
                transfers.forEach(function (t) {
                  return t.tag = t.tag ? t.tag.padEnd(27, '9') : EMPTY_TAG;
                });
                // set correct security level
                inputs.forEach(function (i) {
                  return i.security = _this.security;
                });

                // use the current time
                timestamp = Math.floor(Date.now() / 1000);
                bundle = new _bundle2.default();


                transfers.forEach(function (t) {
                  return bundle.addEntry(1, t.address, t.value, t.tag, timestamp, -1);
                });
                inputs.forEach(function (i) {
                  return bundle.addEntry(i.security, i.address, -i.balance, EMPTY_TAG, timestamp, i.keyIndex);
                });
                if (remainder) {
                  bundle.addEntry(1, remainder.address, remainder.value, EMPTY_TAG, timestamp, remainder.keyIndex);
                }
                bundle.addTrytes([]);
                bundle.finalize();

                // map internal addresses to their index
                addressKeyIndices = {};

                inputs.forEach(function (i) {
                  return addressKeyIndices[i.address] = i.keyIndex;
                });
                if (remainder) {
                  addressKeyIndices[remainder.address] = remainder.keyIndex;
                }

                // sign the bundle on the ledger
                _context12.next = 19;
                return this._signBundle(bundle, addressKeyIndices);

              case 19:
                bundle = _context12.sent;


                // compute and return the corresponding trytes
                bundleTrytes = [];

                bundle.bundle.forEach(function (tx) {
                  return bundleTrytes.push((0, _utils.transactionTrytes)(tx));
                });
                return _context12.abrupt('return', bundleTrytes.reverse());

              case 23:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function _signTransaction(_x22, _x23, _x24) {
        return _ref12.apply(this, arguments);
      }

      return _signTransaction;
    }()
  }, {
    key: '_getAppConfig',
    value: function () {
      var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13() {
        var response, getAppConfigOutStruct;
        return _regenerator2.default.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _context13.next = 2;
                return this._sendCommand(Commands.INS_GET_APP_CONFIG, 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

              case 2:
                response = _context13.sent;
                getAppConfigOutStruct = new _struct2.default().word8('app_flags').word8('app_version_major').word8('app_version_minor').word8('app_version_patch');

                getAppConfigOutStruct.setBuffer(response);

                return _context13.abrupt('return', {
                  app_flags: getAppConfigOutStruct.fields.app_flags,
                  app_version_major: getAppConfigOutStruct.fields.app_version_major,
                  app_version_minor: getAppConfigOutStruct.fields.app_version_minor,
                  app_version_patch: getAppConfigOutStruct.fields.app_version_patch
                });

              case 6:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function _getAppConfig() {
        return _ref13.apply(this, arguments);
      }

      return _getAppConfig;
    }()
  }, {
    key: '_reset',
    value: function () {
      var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14() {
        var partial = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return this._sendCommand(Commands.INS_RESET, partial ? 1 : 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

              case 2:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function _reset() {
        return _ref14.apply(this, arguments);
      }

      return _reset;
    }()
  }, {
    key: '_sendCommand',
    value: function () {
      var _ref15 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15(ins, p1, p2, data, timeout) {
        var transport, smsg, statusCodeStr;
        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                transport = this.transport;
                _context15.prev = 1;

                transport.setExchangeTimeout(timeout);
                _context15.next = 5;
                return transport.send(CLA, ins, p1, p2, data);

              case 5:
                return _context15.abrupt('return', _context15.sent);

              case 8:
                _context15.prev = 8;
                _context15.t0 = _context15['catch'](1);

                // set the message according to the status code
                smsg = getIOTAStatusMessage(_context15.t0);

                _context15.t0.message = 'Ledger device: ' + smsg;
                if (_context15.t0.statusCode) {
                  // add hex status code if present
                  statusCodeStr = _context15.t0.statusCode.toString(16);

                  _context15.t0.message += ' (0x' + statusCodeStr + ')';
                }
                throw _context15.t0;

              case 14:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this, [[1, 8]]);
      }));

      function _sendCommand(_x26, _x27, _x28, _x29, _x30) {
        return _ref15.apply(this, arguments);
      }

      return _sendCommand;
    }()
  }]);
  return Iota;
}();

exports.default = Iota;