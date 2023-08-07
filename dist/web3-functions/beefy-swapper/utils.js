"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidChainId = exports.sanitizeError = exports.errorToString = exports.sanitizeValue = exports.valueToString = exports.isErrorLike = exports.sanitizeText = exports.fetchSettings = exports.getSecrets = exports.getContextWithUserArgs = void 0;
const ethers_1 = require("ethers");
const string_replace_all_1 = __importDefault(require("string-replace-all"));
const blockchain_addressbook_1 = require("blockchain-addressbook");
function getContextWithUserArgs(context) {
    const generic = context.userArgs;
    if (!generic.swapper || typeof generic.swapper !== 'string') {
        throw new Error('swapper is required');
    }
    if (!generic.targetToken || typeof generic.targetToken !== 'string') {
        throw new Error('targetToken is required');
    }
    return Object.assign(Object.assign({}, context), { userArgs: {
            swapper: generic.swapper,
            targetToken: generic.targetToken,
        } });
}
exports.getContextWithUserArgs = getContextWithUserArgs;
function getSecrets(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const oneInchApiUrl = yield context.secrets.get('ONE_INCH_API_URL');
        if (!oneInchApiUrl) {
            throw new Error('Secret ONE_INCH_API_URL is required');
        }
        return {
            oneInchApiUrl,
        };
    });
}
exports.getSecrets = getSecrets;
function fetchSettings(swapperAddress, swapperInterface, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const swapperContract = new ethers_1.Contract(swapperAddress, swapperInterface, provider);
        const settings = yield swapperContract.settings();
        if (settings && 'gasPriceLimit' in settings && 'threshold' in settings) {
            return settings;
        }
        throw new Error('Error fetching settings');
    });
}
exports.fetchSettings = fetchSettings;
function sanitizeText(message, secrets) {
    return Object.entries(secrets).reduce((newMessage, [key, value]) => {
        return (0, string_replace_all_1.default)(newMessage, value, `{secret:${key}}`);
    }, message);
}
exports.sanitizeText = sanitizeText;
function isErrorLike(value) {
    return typeof value === 'object' && value !== null && 'message' in value;
}
exports.isErrorLike = isErrorLike;
function valueToString(value) {
    if (typeof value === 'string') {
        return value;
    }
    else if (value === null) {
        return 'null';
    }
    else if (typeof value === 'undefined') {
        return 'undefined';
    }
    else if (isErrorLike(value)) {
        return errorToString(value);
    }
    return JSON.stringify(value);
}
exports.valueToString = valueToString;
function sanitizeValue(value, secrets) {
    return sanitizeText(valueToString(value), secrets);
}
exports.sanitizeValue = sanitizeValue;
function errorToString(error, includeStack = true) {
    if (includeStack && error.stack) {
        return `${error.message}\n${error.stack}`;
    }
    return `${error.message}`;
}
exports.errorToString = errorToString;
function sanitizeError(error, secrets, includeStack = true) {
    return sanitizeText(errorToString(error, includeStack), secrets);
}
exports.sanitizeError = sanitizeError;
function isValidChainId(chainId) {
    return chainId in blockchain_addressbook_1.addressBookByChainId;
}
exports.isValidChainId = isValidChainId;
