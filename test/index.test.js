import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"

describe("Footprints", function(){
  var window;
  var document;

  it("succeeds", function(){
    expect(true).to.equal(true)
  });
  beforeEach(function(){
    window = global.window;
    document = global.document;
    window.Footprints = {};
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
        basePayload: {},
        inputQueue: [],
        outputQueue: []
      })
      expect(window.Footprints.options.endpointUrl).to.eql('http://my.domain/analytics');
      expect(window.Footprints.options.intervalWait).to.eql(1000);
      expect(window.Footprints.options.pageTime).to.be.an('date');
    });

    it('allows overriding intervalWait and pageTime', function(){
      window.Footprints.argv[3].intervalWait = 2000
      window.Footprints.argv[3].pageTime = new Date(2014, 2, 28);
      init(window.Footprints);
      expect(window.Footprints.options.intervalWait).to.eql(2000);
      expect(window.Footprints.options.pageTime).to.eql(new Date(2014, 2, 28));
    });

  });
});

