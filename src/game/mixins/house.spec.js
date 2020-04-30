import {House} from './house'
import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";

describe('House', () => {
  describe('resourcesNeeded', () => {
    it('should work with nothing needed', () => {
      var entity = {};
      Object.assign(entity, House());
      expect(entity.resourcesNeeded()).to.eql([])
    });

    it('should work with nothing needed', () => {
      var entity = {needed: {'wood': 2}, resources: {}};
      Object.assign(entity, House());
      let result = entity.resourcesNeeded();
      console.log("RESULT", result);
      expect(result).to.eql(['wood', 'wood'])
    });
  })
});
