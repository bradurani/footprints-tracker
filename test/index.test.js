import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"
import MockDate from "MockDate";
import sinon from "sinon";
import fetchMock from 'fetch-mock';
import { matchRequest } from './helper.js'

describe("Footprints", function(){
  var window;
  var footprints;

  beforeEach(function(){
    window = global.window;
    document.referer = 'http://bar.com';
    document.title = 'Happy Web Page';
    window.location.path = '/foo';
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
        endpointUrl: 'http://my.domain/analytics',
      }
      footprints = window.Footprints = {
        options: options
      };
    });

    it('creates a random pageId', function(){
      init(footprints);
      expect(footprints.options.pageId).to.be.a.string;
      expect(footprints.state.basePayload.pageId).to.eql(footprints.options.pageId);
    });

    it('initializes with empty state', function(){
      var uid = options.uniqueIdFunc = function(){ return '111'; };
      init(footprints);
      expect(footprints.state).to.eql({
        basePayload: {
          pageTime: '2014-02-28T00:00:00.000Z',
          pageId: '111',
        },
        inputQueue: [],
        outputQueue: []
      })
      expect(options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 5000,
        pageTime: '2014-02-28T00:00:00.000Z',
        pageId: '111',
        debug: false,
        readyCallback: footprints.noop,
        successCallback: footprints.noop,
        uniqueIdFunc: uid,
        errorCallback: footprints.noop,
      });
      expect(footprints.state.basePayload).to.eql({
        pageTime: '2014-02-28T00:00:00.000Z',
        pageId: '111'
      })
      expect(window.setInterval.calledOnce).to.eql(true);
      expect(footprints.initialized).to.eql(true);
    });

    it('only initializes once', function(){
      footprints.initialized = true;
      init(footprints);
      expect(window.setInterval.called).to.eql(false);
    });

    it('allows overriding intervalWait, debug, pageTime, pageId and uniqueId', function(){
      var uid = options.uniqueIdFunc = function(){ return '111'; };
      options.intervalWait = 2000
      options.pageTime = new Date(2018, 3, 6);
      options.debug = true;
      options.pageId = '222';
      init(footprints);
      expect(options).to.eql({
        endpointUrl: 'http://my.domain/analytics',
        intervalWait: 2000,
        pageId: '222',
        pageTime: '2018-04-06T07:00:00.000Z',
        debug: true,
        successCallback: footprints.noop,
        errorCallback: footprints.noop,
        readyCallback: footprints.noop,
        uniqueIdFunc: uid
      });
      expect(footprints.state.basePayload).to.eql({
        pageTime: '2018-04-06T07:00:00.000Z',
        pageId: '222'
      })
      expect(window.setInterval.calledOnce).to.eql(true);
    });

    it('copy footprints.q to state.inputQueue', function(){
      footprints.q = [['pageView']]
      init(footprints);
      expect(footprints.state.inputQueue).to.equal(footprints.q);
    });

    it('overwrites footprints.push with a new version', function(){
      var f = footprints.push = function(){};
      init(footprints);
      expect(footprints.push).to.be.a('function');
      expect(footprints.push).not.to.equal(f);
    });

    it('calls the readyCallback after init', function(done){
      var r = options.readyCallback = function(){
        done();
      }
      init(footprints);
    });

    describe('with xhr', function(){
      var successCallback;
      var errorCallback;

      beforeEach(function(){
        // options.debug = true;
        options.uniqueIdFunc = function(){
          return 'abc123';
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

      it('sends pageView on init when action is enqueued in the temp queue', function(done){
        fetchMock.postOnce('http://my.domain/analytics', { eventId: '123' });
        options.successCallback = function(response){
          expect(response.body).to.eql('{"eventId":"123"}')
          expect(response.status).to.eql(200);
          done();
        };
        options.errorCallback = function(error){
          done(error);
        }
        // temp queue and push method set-up like the snippet
        var fp = footprints;
        fp.push = function(){
          (fp.q = fp.q||[]).push([].slice.call(arguments))
        };
        window.Footprints.push('pageView');
        init(footprints);
      });

      it('calls the error callback if the POST errors', function(done){
        fetchMock.postOnce('http://my.domain/analytics', 403);
        options.successCallback = function(response){
          done(new Error());
        };
        options.errorCallback = function(error){
          expect(footprints.state.outputQueue).to.eql([{
            eventName: 'pageView',
            pageId: 'abc123',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            pageTime: '2014-02-28T00:00:00.000Z',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123'
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
            pageId: 'abc123',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123'
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

      describe('pageView', function(){
        it('sends a pageView payload with the default format', function(done){
          fetchMock.postOnce(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'pageView',
          }), 200);
          options.successCallback = function(response){
            expect(response.status).to.eql(200);
            done();
          };
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.push('pageView')
        });

        it('sends a pageView with name', function(done){
          fetchMock.postOnce(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            name: 'Toonspeak',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'pageView',
          }), 200);
          options.successCallback = function(response){
            expect(response.status).to.eql(200);
            done();
          };
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.push('pageView', 'Toonspeak');
        });

        it('sends a pageView with name and properties', function(done){
          fetchMock.postOnce(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            category: 'clothing',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            name: 'Toonspeak',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'pageView'
          }), 200);
          options.successCallback = function(response){
            expect(response.status).to.eql(200);
            done();
          };
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.push('pageView', 'Toonspeak', { category: 'clothing' });
        });
      });

      describe('context',function(done){
        it('sends a pageView payload with the user attributes', function(done){
          fetchMock.post(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            userId: 1,
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com',
            url: window.location.href,
            path: window.location.path,
            referer: document.referer,
            title: document.title,
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'pageView'
          }), 200);
          var s = options.successCallback = sinon.fake(function(response){
            expect(response.status).to.eql(200);
            if(s.callCount >= 3) {
              done();
            }
          });
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.push('context', {
            userId: 1,
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com'
          });
          footprints.push('pageView')
          footprints.push('pageView')
          footprints.push('pageView')
        });
      });

      describe('user', function(){
        it('sends a track with user', function(done){
          fetchMock.post(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com',
            properties: { contact_name: 'Jane Doe' },
            key: 'project.directory.contact.created',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'track'
          }), 200, { name: 'created' });
          options.successCallback = function(response){
            expect(response.status).to.eql(200);
            done();
          };
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.user({
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com'
          });
          footprints.push('track', 'project.directory.contact.created', {
            properties: { contact_name: 'Jane Doe' }
          });
        })

        it('sends a track with user with id', function(done){
          fetchMock.post(matchRequest('http://my.domain/analytics', {
            pageTime: '2014-02-28T00:00:00.000Z',
            pageId: 'abc123',
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com',
            userId: '123456',
            properties: { contact_name: 'Jane Doe' },
            key: 'project.directory.contact.created',
            eventTime: '2014-02-28T00:00:00.000Z',
            eventId: 'abc123',
            eventName: 'track'
          }), 200, { name: 'created' });
          options.successCallback = function(response){
            expect(response.status).to.eql(200);
            done();
          };
          options.errorCallback = function(error){
            done(error);
          }
          init(footprints);
          footprints.user('123456', {
            userName: 'Brad Urani',
            userEmail: 'bradurani@gmail.com'
          });
          footprints.push('track', 'project.directory.contact.created', {
            properties: { contact_name: 'Jane Doe' }
          });
        })

        describe('track',function(done){
          it('sends a track with context', function(done){
            fetchMock.post(matchRequest('http://my.domain/analytics', {
              pageTime: '2014-02-28T00:00:00.000Z',
              pageId: 'abc123',
              userId: 1,
              userName: 'Brad Urani',
              userEmail: 'bradurani@gmail.com',
              properties: { contact_name: 'Jane Doe' },
              key: 'project.directory.contact.created',
              eventTime: '2014-02-28T00:00:00.000Z',
              eventId: 'abc123',
              eventName: 'track'
            }), 200, { name: 'created' });
            fetchMock.post(matchRequest('http://my.domain/analytics', {
              pageTime: '2014-02-28T00:00:00.000Z',
              pageId: 'abc123',
              userId: 1,
              userName: 'Brad Urani',
              userEmail: 'bradurani@gmail.com',
              properties: { contact_name: 'Jane Door', state: 'DE' },
              key: 'project.directory.contact.updated',
              eventTime: '2014-02-28T00:00:00.000Z',
              eventId: 'abc123',
              eventName: 'track'
            }), 200, { name: 'updated' });
            fetchMock.post(matchRequest('http://my.domain/analytics', {
              pageTime: '2014-02-28T00:00:00.000Z',
              pageId: 'abc123',
              userId: 1,
              userName: 'Brad Urani',
              userEmail: 'bradurani@gmail.com',
              properties: { contact_name: 'Jane Door', state: 'DE' },
              key: 'project.directory.contact.deleted',
              eventTime: '2014-02-28T00:00:00.000Z',
              eventId: 'abc123',
              eventName: 'track'
            }), 200, { name: 'deleted' });
            var s = options.successCallback = sinon.fake(function(response){
              expect(response.status).to.eql(200);
              if(s.callCount >= 3) {
                done();
              }
            });
            options.errorCallback = function(error){
              done(error);
            }
            init(footprints);
            footprints.push('context', {
              userId: 1,
              userName: 'Brad Urani',
              userEmail: 'bradurani@gmail.com'
            });
            footprints.push('track', 'project.directory.contact.created', {
              properties: { contact_name: 'Jane Doe' }
            });
            footprints.push('track', 'project.directory.contact.updated', {
              properties: { contact_name: 'Jane Door', state: 'DE' }
            });
            footprints.push('track', 'project.directory.contact.deleted', {
              properties: { contact_name: 'Jane Door', state: 'DE' }
            });
          });
        });
      });
    });
  });
});
