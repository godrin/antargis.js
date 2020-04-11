import WorldLoader from './world-loader'
import {sinon, expect} from '../libs/testsetup';

describe("WorldLoader", () => {
  describe("load", () => {
    it('should run through', () => {
      const postLoad = sinon.spy();
      const data = [];
      const ops = {
        modelLoader: {},
        mixinDefs: {},
        entityTypes: {}
      };
      const world = {
        entities: [
          {},
          {postLoad}
        ]
      };

      new WorldLoader().load(world, data, ops);
      expect(postLoad).to.be.calledOnce;
    });
  });
});
