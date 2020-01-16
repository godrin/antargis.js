import { ImageUtils, SphereGeometry,MeshBasicMaterial, BackSide, Mesh } from 'three'

function addSkybox(scene) {
    ImageUtils.loadTexture('models/sky1.jpg', undefined, function (t1) {
        const skyDome = new Mesh(
            new SphereGeometry(4096, 64, 64),
            new MeshBasicMaterial({map: t1, side: BackSide, fog: false})
        );
        scene.add(skyDome);
    });
};

export default addSkybox;