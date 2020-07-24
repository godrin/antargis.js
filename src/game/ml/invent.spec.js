import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";
import {StateMachine} from "./state-machine";
import {MlInvent} from "./invent";

describe('MlInvent', () => {
  describe('comeHome', () => {
    it('should start with mode comeHome', () => {
      const job = new MlInvent({}, 'tool', {});

      expect(job.mode).to.equal("comeHome")
    });
    it('should start with mode comeHome', () => {
      const job = new MlInvent({}, 'tool', {});

      job.comeHome = sinon.fake.returns(true);
      job.onFrame(0);

      expect(job.comeHome).to.be.calledOnce;
    });
    it("should create a move job to come home", () => {
      const entity = {};
      entity.pushJob = sinon.spy();
      const job = new MlInvent(entity, 'tool', {});

      job.createMoveJob = sinon.fake.returns("foo");
      // run the job
      job.onFrame(0);

      expect(job.createMoveJob).to.be.calledOnce;
      expect(entity.pushJob).to.be.calledWith("foo");
      expect(job.mode).to.equal("produce")
    });
  });
  describe("produce", () => {
    it("should start with a restjob", () => {
      const entity = {
        pushJob: sinon.spy()
      };
      const house = {
        production: {tool: {wood: 1, stone: 1}},
        take: sinon.fake.returns(true),
        increaseBy:sinon.fake()
      };
      const job = new MlInvent(entity, 'tool', house);
      // jump over first state
      job.mode = "produce";
      job.createRestJob = sinon.fake.returns("foo");

      job.onFrame(0);

      expect(house.take.callCount).to.eql(2);
      expect(house.take.getCall(0).calledWithExactly("wood", 1)).to.be.true;
      expect(house.take.getCall(1).calledWithExactly("stone", 1)).to.be.true;

      expect(entity.pushJob).to.be.calledWith("foo");
      expect(job.mode).to.eql("productionFinished")
      expect(house.increaseBy).to.be.calledWith("tool",1)
    });
    it("should increase the production", () => {
      const entity = {
        pushJob: sinon.spy()
      };
      const house = {
        production: {tool: {wood: 1, stone: 1}},
        take: sinon.fake.returns(true),
        increaseBy: sinon.fake()
      };
      const job = new MlInvent(entity, 'tool', house);
      // jump over first state
      job.mode = "productionFinished";
      job.createRestJob = sinon.fake.returns("foo");

      job.onFrame(0);
      job.onFrame(0);
      job.onFrame(0);

      expect(house.increaseBy).to.be.calledWith("tool", 1);

      expect(entity.pushJob).to.not.be.called;
      expect(job.ready).to.be.true
    })
  })
});

