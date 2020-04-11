import {Entity} from './entity'
import {sinon, expect} from '../libs/testsetup';

describe("Entity", () => {
  describe("constructor", () => {
    it('should be creatable and mixin be included', () => {

      const heightmap = {};
      var run = false;
      const jobRun = () => {
        run = true
      };

      const ops = {
        type: "animal", entityTypes: {
          animal: {
            mixins: ["job"]
          }
        },
        mixinDefs: {
          job: {
            run: jobRun
          }
        }
      };

      const entity = new Entity(heightmap, ops);
      expect(entity).to.be.not.null;

      entity.run("foo");
      expect(run).to.be.true;
    });

    it('should be creatable if a mixin is missing', () => {
      var run = false;

      const ops = {
        type: "animal", entityTypes: {
          animal: {
            mixins: ["job"]
          }
        },
        mixinDefs: {}
      };

      const entity = new Entity(null, ops);
      expect(entity).to.be.not.null;
    });

    it("should increase the uid", () => {
      const e = new Entity(null, {entityTypes: {}});
      const e2 = new Entity(null, {entityTypes: {}});
      expect(e2.id).to.eq(e.id + 1)
    });

    it("calls postload on mixins", () => {
      const heightmap = {};
      var postLoadRan = 0;
      const postLoad = () => {
        postLoadRan += 1;
      };

      const ops = {
        type: "animal", entityTypes: {
          animal: {
            mixins: ["job", "somethingelse"]
          }
        },
        mixinDefs: {
          job: {
            postLoad: postLoad
          },
          somethingelse: {
            postLoad: postLoad
          }
        }
      };

      const entity = new Entity(heightmap, ops);

      expect(entity).to.be.not.null;

      entity.runPostLoad();
      expect(postLoadRan).to.eq(2);
    });

    it("can decide it's something or not", () => {
      var postLoadRan = 0;

      const ops = {
        type: "animal", entityTypes: {
          animal: {
            mixins: ["job", "somethingelse"]
          }
        },
        mixinDefs: {
          job: {},
          somethingelse: {}
        }
      };

      const entity = new Entity(null, ops);

      expect(entity.isA("job")).to.be.true;
      expect(entity.isA("somethingelse")).to.be.true;
      expect(entity.isA("not")).to.be.false;
    });

    it("should compute mesh position correctly according to map", () => {
      const ops = {entityTypes: {}, pos: {x: 0.5, y: 0.5}};
      const map = {
        get: () => ({
          interpolate: sinon.spy(() => 0.4)
        })
      };
      expect(map.get("rock")).to.be.an("object");
      expect(map.get("rock").interpolate).to.be.a("function");
      const entity = new Entity(map, ops);
      expect(entity.computeMeshPos()).to.eql({x: 0.5, y: 0.4, z: -0.5});
    });

  });
});
