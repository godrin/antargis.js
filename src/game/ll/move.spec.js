import {Move} from './move'
import {Vector2} from "../vector2";
import {expect, sinon} from '../../libs/testsetup'

describe("Move", () => {
  describe("simple movement", () => {
    it("should move an entity", () => {
      const fromPos = new Vector2(2, 3);
      const toPos = new Vector2(2, 4);
      const entity = {
        pos: fromPos,
        updateMeshPos: sinon.spy()
      };
      // default speed is 1
      const job = new Move(entity, toPos);
      job.onFrame(0.1);
      expect(entity.updateMeshPos).to.be.calledOnce;
      expect(entity.pos).to.eql(new Vector2(2, 3.1))
      expect(job.ready).to.be.false
    })

    it("should stop if reach distance is reached",()=>{
      const fromPos = new Vector2(2, 3);
      const toPos = new Vector2(2, 4);
      const entity = {
        pos: fromPos,
        updateMeshPos: sinon.spy()
      };
      // default speed is 1
      const job = new Move(entity, toPos,0.5);
      job.onFrame(1);
      expect(entity.updateMeshPos).to.be.calledOnce;
      expect(entity.pos).to.eql(new Vector2(2, 3.5))
      expect(job.ready).to.be.true
    })
  })
});
