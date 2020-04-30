import Animal from './animal'
import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";

describe("Animal", () => {
  describe("noJob", () => {
    it("should push a move job", () => {
      const pushJob = sinon.spy();
      const setMesh = sinon.spy();
      const animal = Object.assign({
          pushJob,
          setMesh,
          pos: new Vector2(10, 10)
        },
        Animal());
      animal.shouldWalk = () => true;
      animal.onNoJob(1);

      expect(pushJob).to.have.been.calledOnce;
      expect(setMesh).to.have.been.calledWith("walk");
    });

    it("should eat", () => {
      const pushJob = sinon.spy();
      const setMesh = sinon.spy();
      const playAnimation = sinon.spy();
      const animal = Object.assign({
          pushJob,
          setMesh,
          playAnimation,
          pos: new Vector2(10, 10)
        },
        Animal());
      animal.shouldWalk = () => false;
      animal.onNoJob(1);

      expect(pushJob).to.not.have.been.calledOnce;
      expect(setMesh).to.not.have.been.calledOnce;
      expect(playAnimation).to.have.been.calledWith("eat");
    });

    it("should decide on walk about 50%", () => {
      var walk = 0, all = 0;
      var animal = Animal();
      for (; all < 1000; all++) {
        if (animal.shouldWalk()) {
          walk += 1;
        }
      }
      var amount = walk * 1.0 / all;
      expect(amount).to.be.above(0.4);
      expect(amount).to.be.below(0.6);
    });
  });
});
