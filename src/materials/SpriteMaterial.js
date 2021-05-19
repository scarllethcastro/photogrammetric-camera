import { Uniform, ShaderMaterial, Vector2, Vector3, Vector4, Matrix3, Matrix4 } from 'three';
import { definePropertyUniform, textureMatrix } from './Material.js';
import SpriteMaterialVS from './shaders/SpriteMaterialVS.glsl';
import SpriteMaterialFS from './shaders/SpriteMaterialFS.glsl';


// M^(-1) -> this.viewProjectionInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

class SpriteMaterial extends ShaderMaterial {
  constructor() {
    super();

    this.uniforms.screenSize = new Uniform(new Vector2());
    definePropertyUniform(this, 'size', 3);
    definePropertyUniform(this, 'textureCameraPosition', new Vector3());
    definePropertyUniform(this, 'textureCameraPreTransform', new Matrix4());
    definePropertyUniform(this, 'textureCameraPostTransform', new Matrix4());
    definePropertyUniform(this, 'viewProjectionInverse', new Matrix3());
    definePropertyUniform(this, 'uvDistortion', {R: new Vector4(), C: new Vector3()});
    definePropertyUniform(this, 'map', null);
    definePropertyUniform(this, 'depthMap', null);
    definePropertyUniform(this, 'screenSize', new Vector2());
    definePropertyUniform(this, 'diffuseColorGrey', true);

    this.defines.USE_COLOR = '';

    this.vertexShader = SpriteMaterialVS;

    this.fragmentShader = SpriteMaterialFS;
  }

  setCamera(camera) {
      camera.getWorldPosition(this.textureCameraPosition);
      this.textureCameraPreTransform.copy(camera.matrixWorldInverse);
      this.textureCameraPreTransform.setPosition(0, 0, 0);
      this.textureCameraPreTransform.premultiply(camera.preProjectionMatrix);
      this.textureCameraPostTransform.copy(camera.postProjectionMatrix);
      this.textureCameraPostTransform.premultiply(textureMatrix);

      if (camera.distos && camera.distos.length == 1 && camera.distos[0].type === 'ModRad') {
          this.uvDistortion = camera.distos[0];
      } else {
          this.uvDistortion = { C: new THREE.Vector2(), R: new THREE.Vector4() };
          this.uvDistortion.R.w = Infinity;
      }
  }

  setViewCamera(camera) {
    var viewProjectionTransformMat4 = new Matrix4();
    viewProjectionTransformMat4.copy(camera.matrixWorldInverse);
    viewProjectionTransformMat4.setPosition(0, 0, 0);
    viewProjectionTransformMat4.premultiply(camera.preProjectionMatrix);
    viewProjectionTransformMat4.premultiply(camera.postProjectionMatrix);

    var viewProjectionTransform = new Matrix3();
    var els = viewProjectionTransformMat4.elements;
    viewProjectionTransform.set(els[0], els[4], els[8],
                                els[1], els[5], els[9],
                                els[3], els[7], els[11]);

    this.viewProjectionInverse.copy(viewProjectionTransform).invert();
  }


   setScreenSize(width, height) {
     this.uniforms.screenSize.value.set(width, height);
   }
}

export default SpriteMaterial;
