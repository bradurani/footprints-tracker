import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"
import MockDate from "MockDate";
import sinon from "sinon";
import fetchMock from 'fetch-mock';

describe("Footprints", function(){
  var window;
  var footprints;

  beforeEach(function(){
    window = global.window;
    footprints = window.Footprints = {};
    window.setInterval = sinon.fake();
    MockDate.set('2014-02-28T00:00:00.000Z');
  });
  afterEach(function(){
    MockDate.reset();
  });

  describe('performSetup', function() {
    it('raises an error if options is not present', function(){
      expect(function(){
        init(footprints)
      }).to.throw('FOOTPRINTS: your snippet must set Footprints.options');
    });

    describe('with options', function(){
      var options;

      beforeEach(function(){
        options = window.Footprints.options = {};
      });

      it('raises an error if options.endpointUrl is not present', function(){
        expect(function(){
          init(footprints)
        }).to.throw('FOOTPRINTS: you must pass the option endpointUrl');
      });
    });
  });

  describe('with valid configuration', function(){
    var options;

    beforeEach(function(){
      options = {
        endpointUrl: 'http://my.domain/analytics'
      }
      footprints = window.Footprints = {
        options: options
      };
    });

    it('initializes with empty state', function(){
      init(footprints);
      expect(footprints.state).to.eql({
        basePayload: {
          pageTime: '2014-02-28T00:00:00.000Z',        },
        inputQueue: [],
        outputQueue: []
      })
      expect(options).to.contain({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 1000,
        pageTime: '2014-02-28T00:00:00.000Z',
        debug: false,
        successCallback: footprints.noop,
        errorCallback: footprints.noop,
      });
      expect(window.setInterval.calledOnce).to.eql(true);
    });

    it('allows overriding intervalWait, debug, pageTime and uniqueId', function(){
      options.intervalWait = 2000
      options.pageTime = new Date(2018, 3, 6);
      options.debug = true;
      var uid = options.uniqueId = function(){};
      init(footprints);
      expect(options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 2000,
        pageTime: '2018-04-06T07:00:00.000Z',
        debug: true,
        successCallback: footprints.noop,
        errorCallback: footprints.noop,
        uniqueId: uid
      });
      expect(footprints.state.basePayload.pageTime).to.eql('2018-04-06T07:00:00.000Z');
    });

    it('copy footprints.q to state.inputQueue', function(){
      footprints.q = [['pageView']]
      init(footprints);
      expect(footprints.state.inputQueue).to.eql([['pageView']]);
    });

    it('overwrites footprints.push with a new version', function(){
      var f = footprints.push = function(){};
      init(footprints);
      expect(footprints.push).to.be.a('function');
      expect(footprints.push).not.to.equal(f);
    });

    describe('with xhr', function(){
      var successCallback;
      var errorCallback;

      beforeEach(function(){
        // options.debug = true;
        options.uniqueId = function(){
          return '123abc';
        }
      });

      afterEach(function(){
        fetchMock.restore();
      });

      it('sends a pageView when an action is enqueued', function(done){
        fetchMock.postOnce('http://my.domain/analytics', { eventId: '123' });
        options.successCallback = function(response){
          expect(response.body).to.eql('{"eventId":"123"}')
          expect(response.status).to.eql(200);
          done();
        };
        options.errorCallback = function(error){
          done(error);
        }
        init(footprints);
        footprints.push('pageView')
      });

      it('calls the error callback if the POST errors', function(done){
        fetchMock.postOnce('http://my.domain/analytics', 403);
        options.successCallback = function(response){
          done(new Error());
        };
        options.errorCallback = function(error){
          expect(footprints.state.outputQueue).to.eql([{
            eventName: 'pageView',
            pageTime: '2014-02-28T00:00:00.000Z',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: '123abc'
          }]);
          done();
        }
        init(footprints);
        footprints.push('pageView')
      });

      it('make multiple successful calls', function(done){
        fetchMock.post('http://my.domain/analytics', { eventId: '123' });
        var s = options.successCallback = sinon.fake(function(response){
          expect(response.body).to.eql('{"eventId":"123"}')
          expect(response.status).to.eql(200);
          if(s.callCount >= 3) {
            done();
          }
        });
        options.errorCallback = function(error){
          done(error);
        }
        init(footprints);
        footprints.push('pageView')
        footprints.push('pageView')
        footprints.push('pageView')
      });

      it('fails on non-200 error code', function(done){
        fetchMock.post('http://my.domain/analytics', 404);
        options.successCallback = function(response){
          done(new Error());
        };
        options.errorCallback = function(error){
          expect(footprints.state.outputQueue).to.eql([{
            eventName: 'pageView',
            pageTime: '2014-02-28T00:00:00.000Z',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: '123abc'
          }]);
          done();
        }
        init(footprints);
        footprints.push('pageView')
      });

      it('a failed page retries when another is enqueued', function(done){
        fetchMock.post('http://my.domain/analytics', { status: 401, body: '1'}, { overwriteRoutes: false, repeat: 1})
        fetchMock.post('http://my.domain/analytics', { status: 401, body: '2'}, { overwriteRoutes: false, repeat: 1})
        fetchMock.post('http://my.domain/analytics', { status: 500, body: '3'}, { overwriteRoutes: false, repeat: 1})
        fetchMock.post('http://my.domain/analytics', { eventId: '123', body: '4'}, { overwriteRoutes: false, repeat: 1});
        fetchMock.post('http://my.domain/analytics', { eventId: '123', body: '5'}, { overwriteRoutes: false, repeat: 1});
        fetchMock.post('http://my.domain/analytics', { eventId: '123', body: '6'}, { overwriteRoutes: false, repeat: 1});
        var suc = options.successCallback = sinon.fake(function(response){
          expect(JSON.parse(response.body).eventId).to.eql('123');
          expect(response.status).to.eql(200);
          if(suc.callCount == 3){
            expect(err.callCount).to.eql(3)
            expect(fetchMock.done()).to.be.true;
            done();
          }
        });
        var err = options.errorCallback = sinon.fake(function(error){});
        init(footprints);
        setTimeout(function(){
          footprints.push('pageView', 1);
        }, 100);
        setTimeout(function(){
          footprints.push('pageView', 2);
        }, 200);
        setTimeout(function(){
          footprints.push('pageView', 3);
        }, 300);
      });

      it('retries several enqueued at once', function(done){
        fetchMock.post('http://my.domain/analytics', { status: 401 }, { overwriteRoutes: false, repeat: 1, name: 1})
        fetchMock.post('http://my.domain/analytics', { status: 401 }, { overwriteRoutes: false, repeat: 1, name: 2})
        fetchMock.post('http://my.domain/analytics', { status: 500 }, { overwriteRoutes: false, repeat: 1, name: 3})
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: 4});
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: 5});
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: 6});
        var suc = options.successCallback = sinon.fake(function(response){
          expect(JSON.parse(response.body).eventId).to.eql('123');
          expect(response.status).to.eql(200);
          if(suc.callCount == 3){
            expect(err.callCount).to.eql(3)
            expect(fetchMock.done()).to.be.true;
            done();
          }
        });
        var err = options.errorCallback = sinon.fake(function(error){});
        init(footprints);
        footprints.push('pageView', 1);
        footprints.push('pageView', 2);
        footprints.push('pageView', 3);
        setTimeout(function(){
          footprints.processQueues();
        }, 100);
      });

      it('retries with a mixture of sync and async', function(done){
        fetchMock.post('http://my.domain/analytics', { status: 401 }, { overwriteRoutes: false, repeat: 1, name: '1'})
        fetchMock.post('http://my.domain/analytics', { status: 401 }, { overwriteRoutes: false, repeat: 1, name: '2'})
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: '3'});
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: '4'});
        fetchMock.post('http://my.domain/analytics', { eventId: '123' }, { overwriteRoutes: false, repeat: 1, name: '5'});
        var suc = options.successCallback = sinon.fake(function(response){
          expect(JSON.parse(response.body).eventId).to.eql('123');
          expect(response.status).to.eql(200);
          if(suc.callCount == 3){
            expect(err.callCount).to.eql(2)
            expect(fetchMock.done()).to.be.true;
            done();
          }
        });
        var err = options.errorCallback = sinon.fake(function(error){});
        init(footprints);
        footprints.push('pageView', 1);
        footprints.push('pageView', 2);
        setTimeout(function(){
          footprints.push('pageView', 3);
        }, 100)
      });

      it('succeeds with scattered timing', function(done){
        fetchMock.post('http://my.domain/analytics', { status: 401 });
        var suc = options.successCallback = sinon.fake(function(response){
          expect(response.status).to.eql(200);
          if(suc.callCount == 7){
            done();
          }
        });
        var err = options.errorCallback = sinon.fake(function(error){});
        init(footprints);
        footprints.push('pageView', 1);
        footprints.push('pageView', 2);
        setTimeout(function(){
          footprints.push('pageView', 3);
          footprints.push('pageView', 4);
          setTimeout(function(){
            footprints.push('pageView', 5);
            footprints.push('pageView', 6);
          }, 100);
        }, 100);
        setTimeout(function(){
          fetchMock.post('http://my.domain/analytics', 200, { overwriteRoutes: true });
          footprints.push('pageView', 7);
        }, 300);
      });

      describe('user',function(done){
        it('sends a pageView payload with the default format', function(){

        });
      });
    });
  });
});
