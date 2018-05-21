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
});

