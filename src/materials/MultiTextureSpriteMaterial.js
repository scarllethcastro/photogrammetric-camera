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

    definePropertyUniform(this, 'size', 5);
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
    definePropertyUniform(this, 'diffuseColorGrey', true);
    definePropertyUniform(this, 'pixelRatio', 1.);
    definePropertyUniform(this, 'shadowMappingActivated', true);
    this.screenSize = new Vector2();

    // Defines
    this.defines.USE_COLOR = '';
    this.defines.EPSILON = 1e-3;
    this.defines.NUM_TEXTURES = (options.numTextures === undefined) ? 1 : options.numTextures;

    // Maximum number of textures allowed
    this.MAX_TEXTURES = options.maxTextures || 40;

    // Stores all the cameras already loaded, along with their corresponding structures
    this.allCameras = [];

    // Array of cameras and depth maps
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
          this.depthMaps[i] = null;
      }
    }
    this.textureCamerasSetDefault();

    definePropertyUniform(this, 'textureCameras', textureCameras);
    definePropertyUniform(this, 'depthMaps', depthMaps);

    // Shaders
    this.vertexShader = unrollLoops(MultiTextureSpriteMaterialVS, this.defines);
    this.fragmentShader = unrollLoops(MultiTextureSpriteMaterialFS, this.defines);
  }

  setCameraStructure(camera, index, weight) {

    let structure = {};
    structure.position = new Vector3();
    structure.preTransform = new Matrix4();
    structure.postTransform = new Matrix4();
    structure.M_prime_Pre = new Matrix3();
    structure.M_prime_Post = new Matrix3();
    structure.E_prime = new Vector3();

    camera.getWorldPosition(structure.position);
    structure.preTransform.copy(camera.matrixWorldInverse);
    structure.preTransform.setPosition(0, 0, 0);
    structure.preTransform.premultiply(camera.preProjectionMatrix);
    structure.postTransform.copy(camera.postProjectionMatrix);
    structure.postTransform.premultiply(textureMatrix);

    var elsPre = structure.preTransform.elements;
    structure.M_prime_Pre.set(
      elsPre[0], elsPre[4], elsPre[8],
      elsPre[1], elsPre[5], elsPre[9],
      elsPre[3], elsPre[7], elsPre[11]);

    var elsPost = structure.postTransform.elements;
    structure.M_prime_Post.set(
      elsPost[0], elsPost[4], elsPost[12],
      elsPost[1], elsPost[5], elsPost[13],
      elsPost[3], elsPost[7], elsPost[15]);

    if (camera.distos && camera.distos.length == 1 && camera.distos[0].isRadialDistortion) {
        structure.uvDistortion = camera.distos[0];
    } else {
        structure.uvDistortion = { C: new THREE.Vector2(), R: new THREE.Vector4() };
        structure.uvDistortion.R.w = Infinity;
    }

    structure.index = index;
    structure.weight = weight;
    
    return structure;
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
    const nbCamerasLoaded = this.allCameras.length;

    let cameraDistanceArray = [];
    for (let i = 0; i < nbCamerasLoaded; i++) {
        let textureCameraPosition = new THREE.Vector3();
        this.allCameras[i].cam.getWorldPosition(textureCameraPosition);
        cameraDistanceArray[i] = [ this.allCameras[i].cam.name, viewPosition.distanceTo(textureCameraPosition) ];
    }

    console.log('cameraDistanceArray before sorting:\n', cameraDistanceArray);

    cameraDistanceArray.sort( function(a, b) {return a[1] - b[1]} );

    console.log('cameraDistanceArray after sorting:\n', cameraDistanceArray);

    const k = this.defines.NUM_TEXTURES;
    console.log('k is ', k);
    // Prevention in the case when k + 1 > nbCamerasLoaded
    const d_kplus1 = this.decreasingFunction(cameraDistanceArray[ ((k + 1) > nbCamerasLoaded) ? (nbCamerasLoaded - 1) : k ][1]);
    console.log('d_kplus1 = ', d_kplus1);

    console.log('RESULT:\n');
    for (let i = 0; i < nbCamerasLoaded; i++) {
      let cameraName = this.allCameras[i].cam.name;
      console.log('camera: ', cameraName);
      let cameraDistance = (cameraDistanceArray.find((pair) => pair[0] == cameraName))[1];
      console.log('distance: ', cameraDistance);
      let d_i = this.decreasingFunction(cameraDistance);
      console.log('d_i: ', d_i);
      this.allCameras[i].structure.weight = d_i - d_kplus1;
      console.log('weight: ', this.allCameras[i].structure.weight);
    }
  }

  setTextureCameras(camera, texture, renderer) {
    console.log('received camera: \n', camera);

    // Add this camera to allCameras if it isn't already there (including its texture and depthMap)
    if (this.allCameras.find((c) => c.cam.name == camera.name) == undefined) {

      console.log('entered the if of undefined');
      
      let nextIndex = this.allCameras.length;
      console.log('nextindex = ', nextIndex);

      console.log('allcameras before adding new camera:\n', this.allCameras);
      
      // Add the camera
      this.allCameras[nextIndex] = {
        cam: camera,
        structure: this.setCameraStructure(camera, nextIndex, 0)
      };

      console.log('allcameras after adding new camera:\n', this.allCameras);

      // Add it's texture
      if (!texture.image.data)
        this.createImageData(texture);

      if (!this.mapArray) {
        console.log('initializing mapArray');
        const width = texture.image.width;
        const height = texture.image.height;
        this.initializeMapArray(width, height);
      }

      this.copyTexture(texture, this.mapArray, nextIndex, renderer);

      // Add it's depthMap
      // (later when the depthMapArray works)

    }

    console.log('going to update weights');
    // Update the weight of all cameras
    this.updateWeights(camera);

    console.log('going to sort cameras');
    console.log('allcameras before sorting:\n', this.allCameras);
    // Order them with respect to their weights
    this.allCameras.sort( (a,b) => b.structure.weight - a.structure.weight );
    console.log('allcameras after sorting:\n', this.allCameras);

    // Pass the best k cameras to the array textureCameras
    const nbCamerasLoaded = this.allCameras.length;
    const k = this.defines.NUM_TEXTURES;
    for (let i = 0; i < k; i++) {
      this.textureCameras[i] = this.allCameras[i % nbCamerasLoaded].structure;

      // TODO: try to use depthMapArray later
      let renderTarget = this.allCameras[i % nbCamerasLoaded].cam.renderTarget;
      if (renderTarget != undefined)
        this.depthMaps[i] = renderTarget.depthTexture;
      else
        this.depthMaps[i] = null;
    }
    console.log('depthmaps:\n', this.depthMaps);
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
      2/this.screenSize.x, 0, -1,
      0, 2/this.screenSize.y, -1,
      0, 0, 1
    );

    this.viewProjectionScreenInverse.multiply(screenInverse);
  }

  initializeTexture2DArray(width, height, array, nbFormat, format, fillingValue) {
    const depth = this.MAX_TEXTURES;
    const size = width * height;
    const totalDataSize = nbFormat * size * depth;
    const data = new Uint8Array( totalDataSize );

    for ( let i = 0; i < totalDataSize; i++ ) {
      data[i] = fillingValue;
    }

    this[array] = new THREE.DataTexture2DArray( data, width, height, depth );
    this[array].format = format;
    this[array].type = THREE.UnsignedByteType;
  }

  initializeMapArray(width, height) {
    this.initializeTexture2DArray(width, height, 'mapArray', 4, THREE.RGBAFormat, 0);
  }

  initializeDepthMapArray(width, height) {
    this.initializeTexture2DArray(width, height, 'depthMapArray', 4, THREE.RGBAFormat, 1);
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
     this.screenSize.set(width, height);
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
