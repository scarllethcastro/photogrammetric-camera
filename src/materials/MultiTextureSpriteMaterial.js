import {
  Uniform,
  ShaderMaterial,
  ShaderChunk,
  DataTexture2DArray,
  Texture, Vector2,
  Vector3,
  Vector4,
  Matrix3,
  Matrix4
} from 'three';
import { definePropertyUniform, textureMatrix, unrollLoops } from './Material.js';
import MultiTextureSpriteMaterialVS from './shaders/MultiTextureSpriteMaterialVS.glsl';
import MultiTextureSpriteMaterialFS from './shaders/MultiTextureSpriteMaterialFS.glsl';
import TestsForTexturing from './chunks/TestsForTexturing.glsl';


// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

class MultiTextureSpriteMaterial extends ShaderMaterial {
  constructor(options = {}) {
    super();

    this.uniforms.screenSize = new Uniform(new Vector2());
    definePropertyUniform(this, 'size', 3);
    definePropertyUniform(this, 'textureCameraPosition', new Vector3());
    definePropertyUniform(this, 'textureCameraPreTransform', new Matrix4());
    definePropertyUniform(this, 'textureCameraPostTransform', new Matrix4());
    definePropertyUniform(this, 'viewProjectionScreenInverse', new Matrix3());
    definePropertyUniform(this, 'M_prime_Pre', new Matrix3());
    definePropertyUniform(this, 'M_prime_Post', new Matrix3());
    definePropertyUniform(this, 'E_prime', new Vector3());
    definePropertyUniform(this, 'uvDistortion', {R: new Vector4(), C: new Vector3()});
    definePropertyUniform(this, 'map', null);
    definePropertyUniform(this, 'mapArray', null);
    definePropertyUniform(this, 'depthMap', null);
    definePropertyUniform(this, 'screenSize', new Vector2());
    definePropertyUniform(this, 'diffuseColorGrey', true);

    const whiteData = new Uint8Array(3);
    whiteData.set([255, 255, 255]);
    definePropertyUniform(this, 'defaultDepthMap', new THREE.DataTexture( whiteData, 1, 1, THREE.RGBFormat ));

    this.defines.USE_COLOR = '';
    this.defines.EPSILON = 1e-3;
    this.defines.NUM_TEXTURES = (options.numTextures === undefined) ? 1 : options.numTextures;

    var textures;
    var textureCameras;
    var depthMaps;


    this.textureAndCamerasSetDefault = () => {
      this.textures = [];
      this.textureCameras = [];
      this.depthMaps = [];

      for (let i = 0; i < this.defines.NUM_TEXTURES; i++) {
          this.textures[i] = new Texture();
          this.textureCameras[i] = {
            position: new Vector3(),
            preTransform: new Matrix4(),
            postTransform: new Matrix4(),
            E_prime: new Vector3(),
            M_prime_Pre: new Matrix3(),
            M_prime_Post: new Matrix3(),
            uvDistortion: { C: new THREE.Vector2(), R: new THREE.Vector4() }
          };
          this.textureCameras[i].uvDistortion.R.w = Infinity;
          this.depthMaps[i] = this.defaultDepthMap;
      }
    }
    this.textureAndCamerasSetDefault();

    definePropertyUniform(this, 'textures', textures);
    definePropertyUniform(this, 'textureCameras', textureCameras);
    definePropertyUniform(this, 'depthMaps', depthMaps);

    this.vertexShader = unrollLoops(MultiTextureSpriteMaterialVS, this.defines);

    this.fragmentShader = unrollLoops(MultiTextureSpriteMaterialFS, this.defines);
  }

  setCamera(camera, index) {
      camera.getWorldPosition(this.textureCameras[index].position);
      this.textureCameras[index].preTransform.copy(camera.matrixWorldInverse);
      this.textureCameras[index].preTransform.setPosition(0, 0, 0);
      this.textureCameras[index].preTransform.premultiply(camera.preProjectionMatrix);
      this.textureCameras[index].postTransform.copy(camera.postProjectionMatrix);
      this.textureCameras[index].postTransform.premultiply(textureMatrix);

      var elsPre = this.textureCameras[index].preTransform.elements;
      this.textureCameras[index].M_prime_Pre.set(
        elsPre[0], elsPre[4], elsPre[8],
        elsPre[1], elsPre[5], elsPre[9],
        elsPre[3], elsPre[7], elsPre[11]);

      var elsPost = this.textureCameras[index].postTransform.elements;
      this.textureCameras[index].M_prime_Post.set(
        elsPost[0], elsPost[4], elsPost[12],
        elsPost[1], elsPost[5], elsPost[13],
        elsPost[3], elsPost[7], elsPost[15]);

      if (camera.distos && camera.distos.length == 1 && camera.distos[0].isRadialDistortion) {
          this.textureCameras[index].uvDistortion = camera.distos[0];
      } else {
          this.textureCameras[index].uvDistortion = { C: new THREE.Vector2(), R: new THREE.Vector4() };
          this.textureCameras[index].uvDistortion.R.w = Infinity;
      }
  }

  setTextureCameras(cameras, maps) {
    let numCameras = cameras.length;
    this.defines.NUM_TEXTURES = numCameras;
    this.textureAndCamerasSetDefault();
    for (let i = 0; i < numCameras; i++) {
      this.textures[i] = maps[i];
      this.setCamera(cameras[i], i);
      this.depthMaps[i] = cameras[i].renderTarget.depthTexture;
    }
  }

  setE_Primes(cameraPosition) {
    for (let i = 0; i < this.defines.NUM_TEXTURES; i++) {
      this.textureCameras[i].E_prime.subVectors(cameraPosition, this.textureCameras[i].position).applyMatrix3(this.textureCameras[i].M_prime_Pre);
    }
  }

  setViewCamera(camera) {
    camera.updateMatrixWorld(); // the matrixWorldInverse should be up to date
    this.setE_Primes(camera.position);

    var viewProjectionTransformMat4 = new Matrix4();
    viewProjectionTransformMat4.copy(camera.matrixWorldInverse);
    viewProjectionTransformMat4.setPosition(0, 0, 0);
    viewProjectionTransformMat4.premultiply(camera.preProjectionMatrix);
    viewProjectionTransformMat4.premultiply(camera.postProjectionMatrix);

    var els = viewProjectionTransformMat4.elements;

    this.viewProjectionScreenInverse.set(
      els[0], els[4], els[8],
      els[1], els[5], els[9],
      els[3], els[7], els[11]).invert();

    const screenInverse = new Matrix3().set(
      2/this.uniforms.screenSize.value.x, 0, -1,
      0, 2/this.uniforms.screenSize.value.y, -1,
      0, 0, 1
    );

    this.viewProjectionScreenInverse.multiply(screenInverse);
  }

  initializeMapArray(width, height) {

    const depth = this.defines.NUM_TEXTURES;
    const size = width * height;
    const totalDataSize = 4 * size * depth;
    const data = new Uint8Array( totalDataSize );

    for ( let i = 0; i < totalDataSize; i++ ) {
      data[i] = 0;
    }

    this.mapArray = new THREE.DataTexture2DArray( data, width, height, depth );
    this.mapArray.format = THREE.RGBAFormat;
    this.mapArray.type = THREE.UnsignedByteType;
  }

  setDepthMaps(texture) {
    for (let i = 0; i < this.defines.NUM_TEXTURES; i++)
      this.depthMaps[i] = texture;
  }

   setScreenSize(width, height) {
     this.uniforms.screenSize.value.set(width, height);
   }
}

ShaderChunk["camera_structure"] = `
struct TextureCamera {

    vec3 position;
    mat4 preTransform;
    mat4 postTransform;
    vec3 E_prime;
    mat3 M_prime_Pre;
    mat3 M_prime_Post;
    RadialDistortion uvDistortion;

};
`;

ShaderChunk["tests_for_texturing"] = TestsForTexturing;

export default MultiTextureSpriteMaterial;
