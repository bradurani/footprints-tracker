// import { Promise } from 'promise-polyfill';
// import 'isomorphic-fetch';
import { factory, detectPrng } from 'ulid';

var prng = detectPrng(true); // pass `true` to allow insecure
var ulid = factory(prng);

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
    footprints.options = (function(opts){
      if(typeof opts.endpointUrl == 'undefined'){
        throw LIB_NAME.toUpperCase() + ": you must pass the option endpointUrl";
      }

      // set default values for optional arguments
      opts.intervalWait = opts.intervalWait || DEFAULT_INTERVAL_WAIT;
      opts.debug = opts.debug || false;
      opts.pageTime = (opts.pageTime || new Date()).toISOString();
      opts.successCallback = opts.successCallback || footprints.noop;
      opts.errorCallback = opts.errorCallback || footprints.noop;
      opts.uniqueId = opts.uniqueId || ulid;
      return opts;
    })(footprints.argv[3]);

    footprints.state.basePayload.pageTime = footprints.options.pageTime;

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
    errorCallback,
    uniqueId
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
      payload['eventTime'] = new Date().toISOString();
      payload['eventId'] = uniqueId();
      payload['eventName'] = eventName;
      enqueueOutput(payload);
    };

    var enqueueOutput = function(payload) {
      outputQueue.push(payload);
    }

    var processOutputQueue = function() {
      trace("processing output queue");
      var payload;
      while (payload = outputQueue.pop()) {
        send(payload);
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
        if (response.status >= 200 && response.status < 300) {
          return response
        } else {
          var error = new Error(response.statusText)
          error.response = response
          throw error
        }
      }).then(sendComplete.bind(null, payload))
        .catch(function(e){
          sendError(payload, e)
        });
    };

    var sendComplete = function(payload, response) {
      successCallback(response);
      trace('Event Sent', payload);
    };

    var sendError = function(payload, e) {
      enqueueOutput(payload);
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
    footprints.options.errorCallback,
    footprints.options.uniqueId
  );

  var toArray = function(args) {
    return [].slice.call(args);
  };

  var clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}

if(window[LIB_NAME]){
  init(window[LIB_NAME] = window[LIB_NAME] || {});
}
