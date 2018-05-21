import { describe, it } from "mocha";
import { expect } from "chai";
import { init } from "../src/index.js"

describe("Footprints", function(){
  var window;

  it("succeeds", function(){
    expect(true).to.equal(true)
  });
  beforeEach(function(){
    window = global.window;
    window.Footprints = {};
  });

  describe('configure', function() {
    it('raises an error if argv is not present', function(){
      expect(function(){
        init(window.Footprints)
      }).to.throw('use must set Footprints.argv');
    });
  });
});

