import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"
import MockDate from "MockDate";
import sinon from "sinon";
import fetchMock from 'fetch-mock';

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
          pageTime: '2014-02-28T00:00:00.000Z',        },
        inputQueue: [],
        outputQueue: []
      })
      expect(window.Footprints.options).to.contain({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 1000,
        pageTime: '2014-02-28T00:00:00.000Z',
        debug: false,
        successCallback: window.Footprints.noop,
        errorCallback: window.Footprints.noop,
      });
      expect(window.setInterval.calledOnce).to.eql(true);
    });

    it('allows overriding intervalWait, debug, pageTime and uniqueId', function(){
      window.Footprints.argv[3].intervalWait = 2000
      window.Footprints.argv[3].pageTime = new Date(2018, 3, 6);
      window.Footprints.argv[3].debug = true;
      var uid = window.Footprints.argv[3].uniqueId = function(){};
      init(window.Footprints);
      expect(window.Footprints.options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 2000,
        pageTime: '2018-04-06T07:00:00.000Z',
        debug: true,
        successCallback: window.Footprints.noop,
        errorCallback: window.Footprints.noop,
        uniqueId: uid
      });
      expect(window.Footprints.state.basePayload.pageTime).to.eql('2018-04-06T07:00:00.000Z');
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
      var successCallback;
      var errorCallback;

      beforeEach(function(){
        // window.Footprints.argv[3].debug = true;
        window.Footprints.argv[3].uniqueId = function(){
          return '123abc';
        }
      });

      afterEach(function(){
        fetchMock.restore();
      });

      it('sends a pageView when an action is enqueued', function(done){
        fetchMock.postOnce('http://my.domain/analytics', { eventId: '123' });
        window.Footprints.argv[3].successCallback = function(response){
          expect(response.body).to.eql('{"eventId":"123"}')
          expect(response.status).to.eql(200);
          done();
        };
        window.Footprints.argv[3].errorCallback = function(error){
          done(error);
        }
        init(window.Footprints);
        window.Footprints.push('pageView')
      });

      it('calls the error callback if the POST errors', function(done){
        window.Footprints.argv[3].successCallback = function(response){
          done(new Error());
        };
        window.Footprints.argv[3].errorCallback = function(error){
          console.log(window.Footprints.state.outputQueue);
          expect(window.Footprints.state.outputQueue).to.eql([{
            eventName: 'pageView',
            pageTime: '2014-02-28T00:00:00.000Z',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: '123abc'
          }]);
          done();
        }
        init(window.Footprints);
        window.Footprints.push('pageView')
      });

      it('make multiple successful calls', function(done){
        fetchMock.post('http://my.domain/analytics', { eventId: '123' });
        var s = window.Footprints.argv[3].successCallback = sinon.fake(function(response){
          expect(response.body).to.eql('{"eventId":"123"}')
          expect(response.status).to.eql(200);
          if(s.callCount >= 3) {
            done();
          }
        });
        window.Footprints.argv[3].errorCallback = function(error){
          done(error);
        }
        init(window.Footprints);
        window.Footprints.push('pageView')
        window.Footprints.push('pageView')
        window.Footprints.push('pageView')
      });
    })
  });
});
