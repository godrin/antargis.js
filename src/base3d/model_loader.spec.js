import { expect } from 'chai'
import sinon from 'sinon'
import Models from './model_loader'
import _ from 'lodash'

global._ = _;
global.THREE = {};

describe('models', () => {
    it.skip("should cache loaded models", async () => {
        const jsonLoader = {load: sinon.spy()};
        const mesh = "meshType";
        const Meshes = {meshType: {}};
        const loadingManager = {};
        const models = new Models({jsonLoader: jsonLoader}, loadingManager, Meshes);
        models.loadCached = sinon.stub().returns(true)
        const result = models.load(mesh);
        expect(result).to.be.true
        expect(true).to.be.true;
        expect(models.loadCached.called).to.be.true;
    })

    it.skip("should load obj files", ()=> {
        const objLoader = {load: sinon.spy()};
        const Meshes = {someName: {}};
        const models = new Models({objLoader},null, Meshes);
        models.loadImage = sinon.mock().returns(new Promise(_.identity))

        const result=models.loadObj("someName")

        expect(result).to.be.a("Promise")
    })


    it.skip("should load obj files", ()=> {
        const jsonLoader = {load: sinon.spy()};
        const Meshes = {someName: {}};
        const models = new Models({jsonLoader},null, Meshes);
        models.loadImage = sinon.mock().returns(new Promise(_.identity))

        const result=models.loadJSON("someName","none")

        expect(result).to.be.a("Promise")
    })
});