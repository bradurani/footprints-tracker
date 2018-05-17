import { ulid } from 'ulid';

/* change args to options hash */
/* ulid for page load */
/* callbacks */

var LIB_NAME = 'Footprints';

(function(fp) {
  var moo = '';
  (function(queue, window, document, scriptUrl, endpointUrl, intervalWait, pageTime, basePayload) {

    var processQueue = function(q) {
      trace("processing queue");
      var cmd;
      var actionName;
      while (cmd = queue.shift()) {
        actionName = cmd.shift();
        processAction(actionName, cmd);
      }
    };

    var processAction = function(actionName, args) {
      try {
        trace('processing', actionName, args);
        var f = actions[actionName];
        if (typeof f === "function") {
          f.apply(null, args);
        } else {
          error("Unknown function", actionName);
        }
      } catch (err) {
        error(err);
      }
    };

    var toArray = function(args) {
      return Array.prototype.slice.call(args);
    };

    /* needed? */
    var now = function() {
      return 1 * new Date();
    };

    var clone = function(obj) {
      return JSON.parse(JSON.stringify(obj));
    };

    var setBasePayload = function(key, value){
      basePayload[key] = value;
    }

    var fire = function(eventName) {
      var payload = clone(basePayload);
      payload['eventTime'] = now();
      payload['eventId'] = ulid();
      payload['eventName'] = eventName;
      send(payload);
    };

    var send = function(payload) {
      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", sendComplete.bind(null, payload));
      oReq.addEventListener("error", sendError.bind(null, payload));
      oReq.addEventListener("abort", sendError.bind(null, payload));
      oReq.open("POST", endpointUrl);
      oReq.send();
    };

    var trace = function() {
      if (debug) {
        var args = toArray(arguments);
        args.unshift(LIB_NAME + ': ');
        console.log.apply(this, args);
      }
    };

    var error = function() {
      if (debug) {
        var args = toArray(arguments);
        args.unshift(LIB_NAME + ': ');
        console.error.apply(this, args);
      }
    };

    var sendError = function(payload, e) {
      error('Event Failed', e, payload);
    };

    var sendComplete = function(payload, e) {
      trace('Event Sent', payload);
    };

    var actions = {
      pageView: function() {
        fire('pageView');
      },
      user: function(userId, name, email) {
        setBasePayload('userId', userId);
        setBasePayload('name', name);
        setBasePayload('email', email);
      },
      debug: function(b) {
        debug = b;
      }
    };

    var debug = false;

    window.setInterval(function() {
      processQueue();
    }, intervalWait);
  })(fp.q || [],
    fp.argv[0] || (function(){ throw 'you must pass window to argv[0]'; })(),
    fp.argv[1] || (function(){ throw 'you must pass document to argv[1]'; })(),
    fp.argv[2] || (function(){ throw 'you must pass a script url to argv[2]'; })(),
    fp.argv[3] || (function(){ throw 'you must pass an endpoint url to argv[3]'; })(),
    fp.argv[4] || 1000,
    fp.pageTime || 1*new Date(),
    {}
  );
})(window[LIB_NAME] = window[LIB_NAME] || {});
