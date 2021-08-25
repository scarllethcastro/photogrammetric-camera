import {
  ShaderMaterial, ShaderChunk, Vector2, Vector3, Vector4, Matrix3, Matrix4, Box3, DataTexture2DArray, UnsignedByteType, RGBAFormat, DepthFormat, UnsignedShortType,
} from 'three';
import { pop, definePropertyUniform, textureMatrix, unrollLoops } from './Material.js';
import MultiTextureMaterialVS from './shaders/MultiTextureMaterialVS.glsl';
import MultiTextureMaterialFS from './shaders/MultiTextureMaterialFS.glsl';
import TestsForTexturing from './chunks/TestsForTexturing.glsl';


class MultiTextureMaterial extends ShaderMaterial {
  constructor(options = {}) {
    
    const size = pop(options, 'size', 5);
    const mapArray = pop(options, 'mapArray', null);
    const depthMapArray = pop(options, 'depthMapArray', null);
    const diffuseColorGrey = pop(options, 'diffuseColorGrey', true);
    const pixelRatio = pop(options, 'pixelRatio', 1.);
    const shadowMappingActivated = pop(options, 'shadowMappingActivated', true);
    const numTextures = pop(options, 'numTextures', 1);
    const maxTextures = pop(options, 'maxTextures', 40);
    const opacity = pop(options, 'opacity', 1.0);
    const sigma = pop(options, 'sigma', 0.5);
    const verbose = pop(options, 'verbose', false);
    
    // Defines
    options.defines = options.defines || {};
    options.defines.USE_COLOR = '';
    options.defines.EPSILON = 1e-3;
    options.defines.NUM_TEXTURES = numTextures;
    if (options.defines && options.defines.USE_BUILDING_DATE)
      options.defines.USE_BUILDING_DATE = '';

    super(options);

    definePropertyUniform(this, 'size', size);
    definePropertyUniform(this, 'mapArray', mapArray);
    definePropertyUniform(this, 'depthMapArray', depthMapArray);
    definePropertyUniform(this, 'diffuseColorGrey', diffuseColorGrey);
    definePropertyUniform(this, 'pixelRatio', pixelRatio);
    definePropertyUniform(this, 'shadowMappingActivated', shadowMappingActivated);
    definePropertyUniform(this, 'opacity', opacity);
    
    this.screenSize = new Vector2();
    this.sigma = sigma;
    this.verbose = verbose;

    // Maximum number of textures allowed
    this.maxTextures = maxTextures;

    // Number of textures used (k)
    this.numTextures = numTextures;

    // Stores all the cameras already loaded, along with their corresponding structures
    this.allCameras = [];

    // Array of cameras
    var textureCameras;

    this.textureCamerasSetDefault = () => {
      this.textureCameras = [];

      for (let i = 0; i < this.numTextures; i++) {
          this.textureCameras[i] = {
            position: new Vector3(),
            preTransform: new Matrix4(),
            postTransform: new Matrix4(),
            E_prime: new Vector3(),
            M_prime_Pre: new Matrix3(),
            H_prime: new Matrix3(),
            M_prime_Post: new Matrix3(),
            uvDistortion: { C: new Vector2(), R: new Vector4() },
            index: -1,
            weight: 0,
            textureYear: null,
            textureNumber: null,
          };
          this.textureCameras[i].uvDistortion.R.w = Infinity;
      }
    }
    this.textureCamerasSetDefault();

    definePropertyUniform(this, 'textureCameras', textureCameras);

    // Shaders
    this.vertexShader = unrollLoops(MultiTextureMaterialVS, this.defines);
    this.fragmentShader = unrollLoops(MultiTextureMaterialFS, this.defines);

    this.isPCMultiTextureMaterial = true;
  }

  setCameraStructure(camera, index, weight) {

    let structure = {};
    structure.position = new Vector3();
    structure.preTransform = new Matrix4();
    structure.postTransform = new Matrix4();
    structure.M_prime_Pre = new Matrix3();
    structure.H_prime = new Matrix3();
    structure.M_prime_Post = new Matrix3();
    structure.E_prime = new Vector3();

    camera.getWorldPosition(structure.position);
    structure.preTransform.copy(camera.matrixWorldInverse);
    structure.preTransform.setPosition(0, 0, 0);
    structure.preTransform.premultiply(camera.preProjectionMatrix);
    structure.postTransform.copy(camera.postProjectionMatrix);
    structure.postTransform.premultiply(textureMatrix);

    if (camera.distos && camera.distos.length == 1 && camera.distos[0].isRadialDistortion) {
        structure.uvDistortion = camera.distos[0];
    } else {
        structure.uvDistortion = { C: new Vector2(), R: new Vector4() };
        structure.uvDistortion.R.w = Infinity;
    }

    structure.index = index;
    structure.weight = weight;

    if (camera.year && camera.number) {
        structure.textureYear = camera.year;
        structure.textureNumber = camera.number;
    } else {
        structure.textureYear = null;
        structure.textureNumber = null;
    }
    
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
        
    const position = new Vector3( 0, 0, index );
    const box = new Box3( new Vector3( 0, 0, 0 ), new Vector3( width-1, height-1, 0 ) );
    renderer.copyTextureToTexture3D(box, position, texture, texture2DArray);
  }

  decreasingFunction(d) {
    return 1./(this.sigma * this.sigma + d * d);
  }

  updateWeights(mainCamera) {

    let viewPosition = new Vector3();
    mainCamera.getWorldPosition(viewPosition);
    const nbCamerasLoaded = this.allCameras.length;

    if (nbCamerasLoaded == 1) {

      this.allCameras[0].structure.weight = 1.0;

    } else {

      let cameraDistanceArray = [];
      for (let i = 0; i < nbCamerasLoaded; i++) {
          let textureCameraPosition = new Vector3();
          this.allCameras[i].cam.getWorldPosition(textureCameraPosition);
          cameraDistanceArray[i] = [ this.allCameras[i].cam.name, viewPosition.distanceTo(textureCameraPosition) ];
      }

      cameraDistanceArray.sort( function(a, b) {return a[1] - b[1]} );

      const k = this.numTextures;
      
      // Prevention in the case when k + 1 > nbCamerasLoaded
      const d_kplus1 = this.decreasingFunction(cameraDistanceArray[ ((k + 1) > nbCamerasLoaded) ? (nbCamerasLoaded - 1) : k ][1]);
      if (this.verbose) {
        console.log('cameraDistanceArray after sorting:\n', cameraDistanceArray);
        console.log('k is ', k);
        console.log('d_kplus1 = ', d_kplus1);
        console.log('RESULT:\n');
      }
      
      for (let i = 0; i < nbCamerasLoaded; i++) {
        let cameraName = this.allCameras[i].cam.name;
        let cameraDistance = (cameraDistanceArray.find((pair) => pair[0] == cameraName))[1];
        let d_i = this.decreasingFunction(cameraDistance);
        this.allCameras[i].structure.weight = d_i - d_kplus1;

        if (this.verbose) {
          console.log('camera: ', cameraName);
          console.log('distance: ', cameraDistance);
          console.log('d_i: ', d_i);
          console.log('weight: ', this.allCameras[i].structure.weight);
        }
      }
    }    
  }

  sortAndUpdateTextureCameras() {
    this.allCameras.sort( (a,b) => b.structure.weight - a.structure.weight );

    // Pass the best k cameras to the array textureCameras
    const nbCamerasLoaded = this.allCameras.length;
    const k = this.numTextures;
    for (let i = 0; i < k; i++) {
      this.textureCameras[i] = this.allCameras[i % nbCamerasLoaded].structure;
    }
  }

  setTextureCameras(camera, texture, renderer) {
    if (this.verbose) {
      console.log('received camera: \n', camera);
      console.log('allcameras now:\n', this.allCameras.map(c => c.cam.name));
    }

    // Add this camera to allCameras if it isn't already there (including its texture and depthMap)
    if (this.allCameras.find((c) => c.cam.name == camera.name) == undefined) {

      if (this.verbose)
        console.log('entered the if of undefined');
      
      let nextIndex = this.allCameras.length;
      if (this.verbose)
        console.log('nextindex = ', nextIndex);

      // Add the camera
      this.allCameras[nextIndex] = {
        cam: camera,
        structure: this.setCameraStructure(camera, nextIndex, 0)
      };

      if (this.verbose)
        console.log('allcameras after adding new camera:\n', this.allCameras);

      // Add it's texture
      if (!texture.image.data)
        this.createImageData(texture);

      if (!this.mapArray) {
        if (this.verbose)
          console.log('initializing mapArray');
        const width = texture.image.width;
        const height = texture.image.height;
        this.initializeMapArray(width, height);
      }

      this.copyTexture(texture, this.mapArray, nextIndex, renderer);

    } else {
      if (this.verbose)
        console.log('found camera:\n', this.allCameras.find((c) => c.cam.name == camera.name));
    }

    if (this.verbose)
      console.log('going to update weights');
    // Update the weight of all cameras
    this.updateWeights(camera);

    if (this.verbose)
      console.log('going to sort cameras');
    // Order them with respect to their weights
    this.sortAndUpdateTextureCameras();

    if (this.verbose)
      console.log('allcameras after sorting:\n', this.allCameras);
  }

  setViewCamera(camera) {
    camera.updateMatrixWorld(); // the matrixWorldInverse should be up to date

    if (this.allCameras.length > 0) {
      this.updateWeights(camera);
      this.sortAndUpdateTextureCameras();
    }
  }

  setDepthMap(camera, renderer) {

    const cam = this.allCameras.find( c => c.cam.name == camera.name );
    if (cam == undefined)
      return;

    if (!camera.renderTarget)
      return;

    if (!this.depthMapArray) {
      if (this.verbose)
        console.log('initializing depthMapArray');
      const width = camera.renderTarget.width;
      const height = camera.renderTarget.height;
      this.initializeDepthMapArray(width, height);
    }

    const index = cam.structure.index;

    this.copyTexture(camera.renderTarget.depthTexture, this.depthMapArray, index, renderer);
  }

  initializeTexture2DArray(width, height, array, nbFormat, format, type, fillingValue) {
    const depth = this.maxTextures;
    const size = width * height;
    const totalDataSize = nbFormat * size * depth;
    var data;
    if (array == 'mapArray')
      data = new Uint8Array( totalDataSize );
    else if (array == 'depthMapArray')
      data = new Uint16Array( totalDataSize );

    for ( let i = 0; i < totalDataSize; i++ ) {
      data[i] = fillingValue;
    }

    this[array] = new DataTexture2DArray( data, width, height, depth );
    this[array].format = format;
    this[array].type = type;

    if (array == 'depthMapArray')
      this[array].unpackAlignment = 4;
  }

  initializeMapArray(width, height) {
    this.initializeTexture2DArray(width, height, 'mapArray', 4, RGBAFormat, UnsignedByteType, 0);
  }

  initializeDepthMapArray(width, height) {
    this.initializeTexture2DArray(width, height, 'depthMapArray', 4, DepthFormat, UnsignedShortType, 1);
  }

  getTexturingCameras() {
    var texCameras = [];
    const numCamerasLoaded = this.allCameras.length;
    const numTextures = this.numTextures;

    if (numCamerasLoaded == 0)
      return [];
    else if (numCamerasLoaded <= numTextures)
      this.allCameras.forEach( c => texCameras.push(c.cam) );
    else {
      for (let i = 0; i < numTextures; i++) {
        texCameras.push(this.allCameras[i].cam);
      }
    }
    return texCameras;
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
    mat3 H_prime;
    mat3 M_prime_Post;
    RadialDistortion uvDistortion;
    int index;
    float weight;
    int textureYear;
    int textureNumber;

};
`;

ShaderChunk["tests_for_texturing"] = TestsForTexturing;

export default MultiTextureMaterial;
