import { ulid } from 'ulid';
import { Promise } from 'promise-polyfill';
import 'isomorphic-fetch';

/* ulid allow insecure */
/* ulid for page load */
/* lint for semicolons */

var LIB_NAME = 'Footprints';
var DEFAULT_INTERVAL_WAIT = 1000;

export function init(footprints){

  footprints.state = {
    basePayload: {},
    inputQueue: footprints.q || [],
    outputQueue: []
  };

  footprints.noop = function(){};

  (function performSetup(){

    // validate required argvs
    if (typeof footprints.argv == 'undefined'){
      throw LIB_NAME.toUpperCase() + ": your snippet must set " + LIB_NAME + ".argv";
    }
    ['window', 'document', 'scriptUrl', 'options'].forEach(function(name, index){
      if(typeof footprints.argv[index] == 'undefined'){
        throw LIB_NAME.toUpperCase() + ": you must pass " + name + " in argv[" + index + "]";
      }
    });

    // validate options
    footprints.options = footprints.argv[3];
    if(typeof footprints.options.endpointUrl == 'undefined'){
      throw LIB_NAME.toUpperCase() + ": you must pass the option endpointUrl";
    }

    // set default values for optional arguments
    footprints.options.intervalWait = footprints.options.intervalWait || DEFAULT_INTERVAL_WAIT;
    footprints.options.debug = footprints.options.debug || false;
    footprints.options.pageTime  = footprints.options.pageTime || new Date();
    footprints.state.basePayload.pageTime = footprints.options.pageTime;
    footprints.options.successCallback = footprints.options.successCallback || footprints.noop;
    footprints.options.errorCallback = footprints.options.errorCallback || footprints.noop;

    // replace the push method from the snippet with one
    // that calls processQueue so we don't have to wait for the timer
    footprints.push = function(){
      footprints.state.inputQueue.push(toArray(arguments));
      footprints.processQueues();
    };

    // set a timer to process retries periodicaly
    window = footprints.argv[0];
    window.setInterval(function(){
      if(typeof footprints.processQueue === 'function'){
        footprints.processQueues();
      }
    }, footprints.options.intervalWait);
  })();

  (function run(
    inputQueue,
    outputQueue,
    basePayload,
    debug,
    endpointUrl,
    successCallback,
    errorCallback
  ) {

    var processQueues = footprints.processQueues = function(){
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

    var setBasePayload = function(key, value){
      basePayload[key] = value;
    }

    var fire = function(eventName) {
      var payload = clone(basePayload);
      payload['eventTime'] = new Date();
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
          send(payload);
        }
      } finally {
        outputQueue = endingOutputQueue;
      }
    };

    var send = function(payload) {
      trace("sending event", payload)
      fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(function(response){
        sendComplete(payload, response);
      }).catch(function(e){
        sendError(payload, e)
      });
    };

    var sendComplete = function(payload, response) {
      successCallback(response);
      trace('Event Sent', payload);
    };

    var sendError = function(payload, e) {
      errorCallback(e)
      error('Event Failed', e, payload);
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
  })(footprints.state.inputQueue,
    footprints.state.outputQueue,
    footprints.state.basePayload,
    footprints.options.debug,
    footprints.options.endpointUrl,
    footprints.options.successCallback,
    footprints.options.errorCallback
  );

  var toArray = function(args) {
    return [].slice.call(args);
  };

  var clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

}

// init(window[LIB_NAME] = window[LIB_NAME] || {});
