import { ulid } from 'ulid';

/* change args to options hash */
/* ulid for page load */
/* callbacks */

var LIB_NAME = 'Footprints';

(function(fp) {

  (function(inputQueue, window, document, scriptUrl, endpointUrl, intervalWait, pageTime) {

    var basePayload = {};
    var outputQueue = [];

    /**
     * replace the push method from the snippet with one
     * that calls processQueue so we don't have to wait for the timer
     */
    fp.push = function(){
      inputQueue.push(Array.prototype.slice.call(arguments));
      processQueues();
    };

    var processQueues = function(){
      processInputQueue();
      processOutputQueue();
    }

    var processInputQueue = function() {
      trace("processing input queue");
      var cmd;
      var actionName;
      while (cmd = inputQueue.shift()) {
        actionName = cmd.shift();
        processAction(actionName, cmd);
      }
    };

    var processAction = function(actionName, args) {
      trace('processing action ', actionName, args);
      var f = actions[actionName];
      if (typeof f === "function") {
        f.apply(null, args);
      } else {
        error("Unknown function", actionName);
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
      enqueueOutput(payload);
    };

    var enqueueOutput = function(payload) {
      outputQueue.push(payload);
    }

    var processOutputQueue = function() {
      trace("processing output queue");
      var payload;
      var endingOutputQueue = [];
      try {
        while (payload = outputQueue.shift()) {
          send(payload, function(){
            endingOutputQueue.push(payload)
          });
        }
      } finally {
        outputQueue = endingOutputQueue;
      }
    };

    var send = function(payload, errCallback) {
      trace("sending event", payload)
      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", sendComplete.bind(null, payload));
      oReq.addEventListener("error", function(){
        errCallback();
        sendError.bind(null, payload);
      });
      oReq.addEventListener("abort", function(){
        errCallback()
        sendError.bind(null, payload);
      });
      oReq.open("POST", endpointUrl);
      oReq.send();
    };

    var trace = function() {
      if (debug) {
        var args = toArray(arguments);
        args.unshift(LIB_NAME + ':');
        console.log.apply(this, args);
      }
    };

    var error = function() {
      if (debug) {
        var args = toArray(arguments);
        args.unshift(LIB_NAME + ':');
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
      processQueues();
    }, intervalWait);

  })(fp.q || [],
    fp.argv[0] || (function(){ throw 'you must pass window to argv[0]'; })(),
    fp.argv[1] || (function(){ throw 'you must pass document to argv[1]'; })(),
    fp.argv[2] || (function(){ throw 'you must pass a script url to argv[2]'; })(),
    fp.argv[3] || (function(){ throw 'you must pass an endpoint url to argv[3]'; })(),
    fp.argv[4] || 1000,
    fp.pageTime || 1*new Date()
  );
})(window[LIB_NAME] = window[LIB_NAME] || {});
