import { Uniform, ShaderMaterial, ShaderChunk, Vector2, Vector3, Vector4, Matrix3, Matrix4 } from 'three';
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
    definePropertyUniform(this, 'depthMapArray', null);
    definePropertyUniform(this, 'depthMap', null);
    definePropertyUniform(this, 'screenSize', new Vector2());
    definePropertyUniform(this, 'diffuseColorGrey', true);
    definePropertyUniform(this, 'pixelRatio', 1.);
    

    this.defines.USE_COLOR = '';
    this.defines.EPSILON = 1e-3;
    this.defines.NUM_TEXTURES = (options.numTextures === undefined) ? 1 : options.numTextures;

    let textureIndexes = [];
    let textureWeights = [];
    for (let i = 0; i < this.defines.NUM_TEXTURES; i++) {
      textureIndexes[i] = 0;
      textureWeights[i] = 1.;
    }
    definePropertyUniform(this, 'textureIndexes', textureIndexes);
    definePropertyUniform(this, 'textureWeights', textureWeights);

    this.MAX_TEXTURES = options.MAX_TEXTURES || 40;
    this.nbTexturesUsed = 0;
    this.textureNameToIndex = {};
    this.allCameras = [];

    const whiteData = new Uint8Array(3);
    whiteData.set([255, 255, 255]);
    definePropertyUniform(this, 'defaultDepthMap', new THREE.DataTexture( whiteData, 1, 1, THREE.RGBFormat ));

    var textureCameras;
    var depthMaps;

    this.textureCamerasSetDefault = () => {
      this.textureCameras = [];
      this.depthMaps = [];

      for (let i = 0; i < this.defines.NUM_TEXTURES; i++) {
          this.textureCameras[i] = {
            position: new Vector3(),
            preTransform: new Matrix4(),
            postTransform: new Matrix4(),
            E_prime: new Vector3(),
            M_prime_Pre: new Matrix3(),
            M_prime_Post: new Matrix3(),
            uvDistortion: { C: new THREE.Vector2(), R: new THREE.Vector4() },
            index: -1,
            weight: 0
          };
          this.textureCameras[i].uvDistortion.R.w = Infinity;
          this.depthMaps[i] = this.defaultDepthMap;
      }
    }
    this.textureCamerasSetDefault();

    definePropertyUniform(this, 'textureCameras', textureCameras);
    definePropertyUniform(this, 'depthMaps', depthMaps);

    this.vertexShader = unrollLoops(MultiTextureSpriteMaterialVS, this.defines);

    this.fragmentShader = unrollLoops(MultiTextureSpriteMaterialFS, this.defines);
  }

  setCamera(cameraObj, index) {
      let camera = cameraObj.cam;
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

      this.textureCameras[index].index = cameraObj.index;
      this.textureCameras[index].weight = cameraObj.weight;
  }

  setTextureCameras(cameras, mapsIndexes, cameraWeights) {
    let numCameras = cameras.length;
    if (numCameras != this.defines.NUM_TEXTURES) {
      console.error('Number of cameras passed to MultiTextureSpriteMaterial.setTextureCameras() is different from NUM_TEXTURES defined in initialization.');
    }
    if (numCameras != mapsIndexes.length || numCameras != cameraWeights.length || mapsIndexes.length != cameraWeights.length) {
      console.error('cameras.length, mapsIndexes.length and cameraWeights.length must coincide in function MultiTextureSpriteMaterial.setTextureCameras().');
    }
    for (let i = 0; i < numCameras; i++) {
      this.setCamera( { cam: cameras[i], index: this.textureNameToIndex[cameras[i].name], weight: cameraWeights[i] }, i );
      this.depthMaps[i] = cameras[i].renderTarget.depthTexture;
    }
    this.textureIndexes = mapsIndexes;
    this.textureWeights = cameraWeights;
  }

  createImageData(texture) {
    var canvas2d = document.getElementById('canvas2d'),
    ctx = canvas2d.getContext('2d');
    const w = texture.image.width;
    const h = texture.image.height;
    canvas2d.width = w;
    canvas2d.height = h;
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(texture.image, 0, 0, w, h*-1); // draw the im
    ctx.restore();
    texture.image = ctx.getImageData(0, 0, w, h);
    texture.flipY = false;
  }

  copyTexture(texture, texture2DArray, index, renderer) {
      const width = texture2DArray.image.width;
      const height = texture2DArray.image.height;
      if (width != texture.image.width || height != texture.image.height) {
          console.error("texture and texture2DArray dimensions width and height don't match.");
          return;
      }
          
      const position = new THREE.Vector3( 0, 0, index );
      const box = new THREE.Box3( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( width-1, height-1, 0 ) );
      renderer.copyTextureToTexture3D(box, position, texture, texture2DArray);
  }

  decreasingFunction(d) {
    const sigma = 0.5;
    return 1./(sigma*sigma + d*d);
  }

  updateWeights(mainCamera) {

    let viewPosition = new THREE.Vector3();
    mainCamera.getWorldPosition(viewPosition);
    console.log('viewPosition: ', viewPosition);
    const nbCamerasLoaded = this.allCameras.length;

    let cameraDistanceArray = [];
    for (let i = 0; i < nbCamerasLoaded; i++) {
        let textureCameraPosition = new THREE.Vector3();
        this.allCameras[i].cam.getWorldPosition(textureCameraPosition);
        cameraDistanceArray[i] = [ this.allCameras[i].cam.name, viewPosition.distanceTo(textureCameraPosition) ];
    }

    cameraDistanceArray.sort( function(a, b) {return a[1] - b[1]} );
    console.log('cameraDistanceArray sorted:\n', cameraDistanceArray);

    const k = this.defines.NUM_TEXTURES;
    // Prevention in the case when k + 1 > nbCamerasLoaded
    const d_kplus1 = this.decreasingFunction(cameraDistanceArray[ ((k + 1) > nbCamerasLoaded) ? (nbCamerasLoaded - 1) : k ][1]);

    for (let i = 0; i < nbCamerasLoaded; i++) {
      let cameraName = this.allCameras[i].cam.name;
      let cameraDistance = (cameraDistanceArray.find((pair) => pair[0] == cameraName))[1];
      let d_i = this.decreasingFunction(cameraDistance);
      this.allCameras[i].weight = d_i - d_kplus1;
    }
  }

  newSetTextureCameras(camera, texture, renderer) {
    console.log('Trying to set camera ', camera.name);

    // Add this camera to allCameras if it isn't already there (including texture and depthMap)
    if (this.allCameras.find((c) => c.cam.name == camera.name) == undefined) {
      
      let nextIndex = this.nbTexturesUsed;  // TODO: verify that this is the same of this.allCameras.length and change it
      
      console.log('Adding camera ' + camera.name + ' at index ' + nextIndex);

      // Add the camera
      this.allCameras[nextIndex] = {
        cam: camera,
        index: nextIndex,
        weight: 0           // Will be recalculated just after
      };

      // Add it's texture
      if (!texture.image.data)
        this.createImageData(texture);

      if (!this.mapArray) {
        const width = texture.image.width;
        const height = texture.image.height;
        this.initializeMapArray(width, height);
      }

      this.copyTexture(texture, this.mapArray, nextIndex, renderer);
      this.nbTexturesUsed++;

      // Add it's depthMap
      // (later when the depthMapArray works)

    }

    // update the weight of all cameras
    this.updateWeights(camera);

    // order them with relation to their weights
    this.allCameras.sort( (a,b) => b.weight - a.weight );
    console.log('allCameras inside material:\n', this.allCameras);

    // pass the best k cameras to the array textureCameras
    const nbCamerasLoaded = this.allCameras.length;
    const k = this.defines.NUM_TEXTURES;
    for (let i = 0; i < k; i++) {
      this.setCamera(this.allCameras[i % nbCamerasLoaded], i);
      this.depthMaps[i] = this.allCameras[i % nbCamerasLoaded].cam.renderTarget.depthTexture;  // TODO: try to use depthMapArray later
      this.textureIndexes[i] = this.allCameras[i % nbCamerasLoaded].index;
      this.textureWeights[i] = this.allCameras[i % nbCamerasLoaded].weight;
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

    const depth = this.MAX_TEXTURES;
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

  initializeDepthMapArray(width, height) {
    const depth = this.MAX_TEXTURES;
    const size = width * height;
    const totalDataSize = 3 * size * depth;
    const whiteData = new Uint8Array( totalDataSize );

    for ( let i = 0; i < totalDataSize; i++ ) {
      whiteData[i] = 1;
    }

    this.depthMapArray = new THREE.DataTexture2DArray( whiteData, width, height, depth );
    this.depthMapArray.format = THREE.RGBFormat;
    this.depthMapArray.type = THREE.UnsignedByteType;
  }

  setDepthMaps(depthMapArray) {
    switch (depthMapArray.length) {
      case 1:
        for (let i = 0; i < this.defines.NUM_TEXTURES; i++)
          this.depthMaps[i] = depthMapArray[0];
        break;

      case this.defines.NUM_TEXTURES:
        for (let i = 0; i < this.defines.NUM_TEXTURES; i++)
          this.depthMaps[i] = depthMapArray[i];
        break;

      default:
        console.error('Number of depthMaps passed to MultiTextureSpriteMaterial.setDepthMaps() should be equal to NUM_TEXTURES defined in initialization or 1.');
        break;
    }
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
    int index;
    float weight;

};
`;

ShaderChunk["tests_for_texturing"] = TestsForTexturing;

export default MultiTextureSpriteMaterial;
