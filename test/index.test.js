import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"
import MockDate from "MockDate";
import sinon from "sinon";

describe("Footprints", function(){
  var window;
  var document;

  beforeEach(function(){
    window = global.window;
    window.setInterval = sinon.fake();
    document = global.document;
    window.Footprints = {};
    MockDate.set('2014-02-28T00:00:00.000Z');
  });
  afterEach(function(){
    MockDate.reset();
  });

  describe('performSetup', function() {
    it('raises an error if argv is not present', function(){
      expect(function(){
        init(window.Footprints)
      }).to.throw('FOOTPRINTS: your snippet must set Footprints.argv');
    });

    describe('with argv', function(){
      beforeEach(function(){
        window.Footprints.argv = [];
      });

      it("raises an error if argv does not contain window", function(){
        expect(function(){
          init(window.Footprints)
        }).to.throw('FOOTPRINTS: you must pass window in argv[0]');
      });

      it("raises an error if argv does not contain document", function(){
        window.Footprints.argv.push(window);
        expect(function(){
          init(window.Footprints)
        }).to.throw('FOOTPRINTS: you must pass document in argv[1]');
      });

      it("raises an error if argv does not contain scriptUrl", function(){
        window.Footprints.argv.push(window);
        window.Footprints.argv.push(document);
        expect(function(){
          init(window.Footprints)
        }).to.throw('FOOTPRINTS: you must pass scriptUrl in argv[2]');
      });

      it("raises an error if argv does not contain options", function(){
        window.Footprints.argv.push(window);
        window.Footprints.argv.push(document);
        window.Footprints.argv.push('http://my.host/script.js');
        expect(function(){
          init(window.Footprints)
        }).to.throw('FOOTPRINTS: you must pass options in argv[3]');
      });

      it('raises an error if options.endpointUrl is not present', function(){
        window.Footprints.argv.push(window);
        window.Footprints.argv.push(document);
        window.Footprints.argv.push('http://my.host/script.js');
        window.Footprints.argv.push({});
        expect(function(){
          init(window.Footprints)
        }).to.throw('FOOTPRINTS: you must pass the option endpointUrl');
      });
    });
  });

  describe('with valid configuration', function(){
    beforeEach(function(){
      window.Footprints = {
        argv: [window, document, 'http://my.domain/script.js', {
          endpointUrl: 'http://my.domain/analytics'
        }]
      };
    });

    it('initializes with empty state', function(){
      init(window.Footprints);
      expect(window.Footprints.state).to.eql({
        basePayload: {
          pageTime: new Date('2014-02-28')
        },
        inputQueue: [],
        outputQueue: []
      })
      expect(window.Footprints.options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 1000,
        pageTime: new Date('2014-02-28'),
        debug: false,
        successCallback: window.Footprints.noop,
        errorCallback: window.Footprints.noop,
        abortCallback: window.Footprints.noop
      });
      expect(window.setInterval.calledOnce);
    });

    it('allows overriding intervalWait, debug and pageTime', function(){
      window.Footprints.argv[3].intervalWait = 2000
      window.Footprints.argv[3].pageTime = new Date(2018, 3, 6);
      window.Footprints.argv[3].debug = true;
      init(window.Footprints);
      expect(window.Footprints.options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 2000,
        pageTime: new Date(2018, 3, 6),
        debug: true,
        successCallback: window.Footprints.noop,
        errorCallback: window.Footprints.noop,
        abortCallback: window.Footprints.noop
      });
      expect(window.Footprints.state.basePayload.pageTime).to.eql(new Date(2018, 3, 6));
    });

    it('copy footprints.q to state.inputQueue', function(){
      window.Footprints.q = [['pageView']]
      init(window.Footprints);
      expect(window.Footprints.state.inputQueue).to.eql([['pageView']]);
    });

    it('overwrites footprints.push with a new version', function(){
      var f = window.Footprints.push = function(){};
      init(window.Footprints);
      expect(window.Footprints.push).to.be.a('function');
      expect(window.Footprints.push).not.to.equal(f);
    });

    describe('with xhr', function(){
      var server;
      var request;
      var successCallback;
      var errorCallback;
      var abortCallback;

      beforeEach(function(){
        server = sinon.fakeServer.create();
        successCallback = sinon.spy();
        errorCallback = sinon.spy();
        abortCallback = sinon.spy();
        window.Footprints.argv[3].successCallback = successCallback;
        window.Footprints.argv[3].errorCallback = errorCallback;
        window.Footprints.argv[3].abortCallback = abortCallback;
      });

      afterEach(function(){
        server.restore();
      });

      it('sends a pageView when an action is enqueued', function(){
        server.respondWith('POST', 'http://my.domain/analytics',
          [200, { 'Content-Type': 'application/json' }, '{ eventId: 123 }']);
        init(window.Footprints);
        window.Footprints.push('pageView')
        window.Footprints.push('pageView');
        expect(successCallback.calledWith({ eventId: '123' }));
        expect(errorCallback.notCalled);
        expect(abortCallback.notCalled);
      });
    })
  });
});
