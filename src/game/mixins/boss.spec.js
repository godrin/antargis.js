import {Boss} from './boss'
import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";

describe('Boss', () => {
  describe('init', () => {
    it('should initialize followers', () => {
      let entity = {};
      Object.assign(entity, Boss());
      expect(entity.followers).to.be.null;
      entity.postLoad();
      expect(entity.followers).to.eql([]);
    });

    it('should add to followers if added', () => {
      let boss = {};
      let follower = {};
      Object.assign(boss, Boss());
      boss.postLoad();
      boss.addFollower(follower);
      expect(boss.followers).to.eql([follower]);
    });
  });
  describe("dismiss", () => {
    it("should control boss when dismissing", () => {
      let boss = {};
      let follower = {boss: boss, resetJobs: sinon.spy()};
      Object.assign(boss, Boss());
      boss.postLoad();
      boss.addFollower(follower);
      expect(boss.followers).to.eql([follower]);
      boss.dismiss(follower);
      expect(follower.boss).to.be.undefined;
      expect(follower.resetJobs).to.be.calledOnce;
      expect(boss.followers).to.eql([]);
    });
  })
});
