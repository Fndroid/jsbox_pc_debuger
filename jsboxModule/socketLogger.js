var UID = Math.floor(Math.random() * 0x10000000000).toString(16);
var PLACE_HOLDER_REGEXP = new RegExp('"@__(F|R|D)-' + UID + '-(\\d+)__@"', 'g');

var IS_NATIVE_CODE_REGEXP = /\{\s*\[native code\]\s*\}/g;
var UNSAFE_CHARS_REGEXP = /[<>\/\u2028\u2029]/g;

// Mapping of unsafe HTML and invalid JavaScript line terminator chars to their
// Unicode char counterparts which are safe to use in JavaScript strings.
var ESCAPED_CHARS = {
    '<': '\\u003C',
    '>': '\\u003E',
    '/': '\\u002F',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};

var socket, oldClear, oldError, oldInfo, oldLog, oldWarn;

function escapeUnsafeChars(unsafeChar) {
    return ESCAPED_CHARS[unsafeChar];
}

function fullSerialize(obj, options) {
    options || (options = {});

    // Backwards-compatibility for `space` as the second argument.
    if (typeof options === 'number' || typeof options === 'string') {
        options = { space: options };
    }

    var functions = [];
    var regexps = [];
    var dates = [];

    // Returns placeholders for functions and regexps (identified by index)
    // which are later replaced by their string representation.
    function replacer(key, value) {
        if (!value) {
            return value;
        }

        // If the value is an object w/ a toJSON method, toJSON is called before
        // the replacer runs, so we use this[key] to get the non-toJSONed value.
        var origValue = this[key];
        var type = typeof origValue;

        if (type === 'object') {
            if (origValue instanceof RegExp) {
                return '@__R-' + UID + '-' + (regexps.push(origValue) - 1) + '__@';
            }

            if (origValue instanceof Date) {
                return '@__D-' + UID + '-' + (dates.push(origValue) - 1) + '__@';
            }
        }

        if (type === 'function') {
            return '@__F-' + UID + '-' + (functions.push(origValue) - 1) + '__@';
        }

        return value;
    }

    var str;

    // Creates a JSON string representation of the value.
    // NOTE: Node 0.12 goes into slow mode with extra JSON.stringify() args.
    if (options.isJSON && !options.space) {
        str = JSON.stringify(obj);
    } else {
        str = JSON.stringify(obj, options.isJSON ? null : replacer, options.space);
    }

    // Protects against `JSON.stringify()` returning `undefined`, by serializing
    // to the literal string: "undefined".
    if (typeof str !== 'string') {
        return String(str);
    }

    // Replace unsafe HTML and invalid JavaScript line terminator chars with
    // their safe Unicode char counterpart. This _must_ happen before the
    // regexps and functions are serialized and added back to the string.
    if (options.unsafe !== true) {
        str = str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
    }

    if (functions.length === 0 && regexps.length === 0 && dates.length === 0) {
        return str;
    }

    // Replaces all occurrences of function, regexp and date placeholders in the
    // JSON string with their string representations. If the original value can
    // not be found, then `undefined` is used.
    return str.replace(PLACE_HOLDER_REGEXP, function (match, type, valueIndex) {
        if (type === 'D') {
            return "new Date(\"" + dates[valueIndex].toISOString() + "\")";
        }

        if (type === 'R') {
            return regexps[valueIndex].toString();
        }

        var fn = functions[valueIndex];
        var serializedFn = fn.toString();

        if (IS_NATIVE_CODE_REGEXP.test(serializedFn)) {
            throw new TypeError('Serializing native function: ' + fn.name);
        }

        return serializedFn;
    });
}

let msgQueue = []

let startTimeer = function (socket) {
    return $timer.schedule({
        interval: 0.5,
        handler: () => {
            while (msgQueue.length > 0 && socket.readyState === 1) {
                let msg = msgQueue.shift()
                socket.send(msg)
            }
        }
    })
}

module.exports.init = function (address, port = 44555, debug = true) {
    try {
        oldLog = console.log;
        oldInfo = console.info;
        oldWarn = console.warn;
        oldError = console.error;
        oldClear = console.clear;

        socket = $socket.new(`ws://${address}:${port}`);

        let timer = startTimeer(socket)

        socket.listen({
            didOpen: sock => {
                let checker = $timer.schedule({
                    interval: 1,
                    handler: () => {
                        if (msgQueue.length === 0) {
                            timer.invalidate()
                            checker.invalidate()
                        }
                    }
                })
            }
        })

        socket.open()

        console.log = function () {
            if (debug) {
                let msg = fullSerialize({ type: 'log', args: preHandleNativeObjects(arguments) })
                sendMessage(socket, msg);
            }
            oldLog.apply(console, arguments);
        }
        console.info = function () {
            if (debug) {
                let msg = fullSerialize({ type: 'info', args: preHandleNativeObjects(arguments) });
                sendMessage(socket, msg);
            }
            oldInfo.apply(console, arguments);
        }
        console.warn = function () {
            if (debug) {
                let msg = fullSerialize({ type: 'warn', args: preHandleNativeObjects(arguments) });
                sendMessage(socket, msg);
            }
            oldWarn.apply(console, arguments);
        }
        console.error = function () {
            if (debug) {
                let msg = fullSerialize({ type: 'error', args: preHandleNativeObjects(arguments) });
                sendMessage(socket, msg);
            }
            oldError.apply(console, arguments);
        }
        console.clear = function () {
            if (debug) {
                let msg = fullSerialize({ type: 'clear', args: [] });
                sendMessage(socket, msg)
            }
            oldClear.apply(console, arguments)
        }
    } catch (e) {
        console.error('JSBox版本暂不支持远程调试！')
    }
}

function preHandleNativeObjects(arguments) {
    return Array.prototype.slice.call(arguments).map(i => {
        if (/\[object NS.*?\]/.test(i.toString())) {
            return i.runtimeValue().invoke('description').rawValue().toString()
        }
        return i
    })
}

module.exports.destroy = function () {
    if (oldLog) console.log = oldLog
    if (oldInfo) console.info = oldInfo
    if (oldClear) console.clear = oldClear
    if (oldError) console.error = oldError
    if (oldWarn) console.warn = oldWarn
    if (socket) {
        socket.close()
    }
}

function sendMessage(socket, msg) {
    if (socket.readyState === 1 && msgQueue.length === 0) {
        socket.send(msg);
    } else {
        msgQueue.push(msg)
    }
}
