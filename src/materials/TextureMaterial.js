import { Uniform, ShaderMaterial, ShaderLib, Matrix4, Vector2, Vector3, Vector4, Color, Matrix3 } from 'three';
import { default as PhotogrammetricDistortion } from '../cameras/PhotogrammetricDistortion';

function pop(options, property, defaultValue) {
    if (options[property] === undefined) return defaultValue;
    const value = options[property];
    delete options[property];
    return value;
}

function popUniform(options, property, defaultValue) {
    const value = pop(options, property, defaultValue);
    if (options.uniforms[property])
        return options.uniforms[property];
    return new Uniform(value);
}

function definePropertyUniform(object, property, defaultValue) {
    object.uniforms[property] = new Uniform(object[property] || defaultValue);
    Object.defineProperty(object, property, {
        get: () => object.uniforms[property].value,
        set: (value) => {
            if (object.uniforms[property].value != value) {
                object.uniformsNeedUpdate = true;
                object.uniforms[property].value = value;
            }
        }
    });
}

class ImageMaterial extends ShaderMaterial {
    constructor(options = {}) {
        const size = pop(options, 'size', 1);
        const diffuse = pop(options, 'diffuse', new Color(0xeeeeee));

        const uvwTexturePosition = pop(options, 'uvwTexturePosition', new Vector3());
        const uvwViewPosition = pop(options, 'uvwViewPosition', new Vector3());
        const uvwTexturePreTrans = pop(options, 'uvwPreTransform', new Matrix4());
        const uvwTexturePostTrans = pop(options, 'uvwPostTransform', new Matrix4());
        const uvwViewPreTrans = pop(options, 'uvwPreTransform', new Matrix4());
        const uvwViewPostTrans = pop(options, 'uvwPostTransform', new Matrix4());
        const uvwViewInvPostTrans = pop(options, 'uvwViewInvPostTrans', new Matrix4());
        const uvDistortion = pop(options, 'uvDistortion', {});
        const textureDisto = pop(options, 'textureDisto', false);
        const viewDisto = pop(options, 'viewDisto', false);
        const textureExtrapol = pop(options, 'textureExtrapol', false);
        const viewExtrapol = pop(options, 'viewExtrapol', false);
        const distortionType = pop(options, 'distortionType', 0);
        const homography = pop(options, 'homography', new Matrix3());
        const invHomography = pop(options, 'invHomography', new Matrix3());

        const map = pop(options, 'map', null);
        const alphaMap = pop(options, 'alphaMap', null);
        const scale = pop(options, 'scale', 1);
        const borderSharpness = pop(options, 'borderSharpness', 10000);
        const diffuseColorGrey = pop(options, 'diffuseColorGrey', false);
        const debugOpacity = pop(options, 'debugOpacity', 0);

        options.vertexShader = options.vertexShader || ShaderLib.points.vertexShader;
        options.fragmentShader = options.fragmentShader || ShaderLib.points.fragmentShader;
        options.defines = options.defines || {};
        if (map) {
            options.defines.USE_MAP4 = '';
        }
        if (alphaMap) options.defines.USE_ALPHAMAP = '';
        if (options.vertexColors) options.defines.USE_COLOR = '';
        if (options.logarithmicDepthBuffer) options.defines.USE_LOGDEPTHBUF = '';
        if (pop(options, 'sizeAttenuation')) options.defines.USE_SIZEATTENUATION = '';
        if(options.color) options.defines.USE_COLOR = '';
        super(options);

        definePropertyUniform(this, 'size', size);
        definePropertyUniform(this, 'diffuse', diffuse);

        definePropertyUniform(this, 'uvwTexturePosition', uvwTexturePosition);
        definePropertyUniform(this, 'uvwViewPosition', uvwViewPosition);
        definePropertyUniform(this, 'uvwTexturePreTrans', uvwTexturePreTrans);
        definePropertyUniform(this, 'uvwViewPreTrans', uvwViewPreTrans);
        definePropertyUniform(this, 'uvwTexturePostTrans', uvwTexturePostTrans);
        definePropertyUniform(this, 'uvwViewPostTrans', uvwViewPostTrans);
        definePropertyUniform(this, 'uvwViewInvPostTrans', uvwViewInvPostTrans);
        definePropertyUniform(this, 'uvDistortion', uvDistortion);
        definePropertyUniform(this, 'textureDisto', textureDisto);
        definePropertyUniform(this, 'viewDisto', viewDisto);
        definePropertyUniform(this, 'textureExtrapol', textureExtrapol);
        definePropertyUniform(this, 'viewExtrapol', viewExtrapol);
        definePropertyUniform(this, 'distortionType', distortionType);
        definePropertyUniform(this, 'H', homography);
        definePropertyUniform(this, 'invH', invHomography);

        definePropertyUniform(this, 'opacity', this.opacity);
        definePropertyUniform(this, 'map', map);
        definePropertyUniform(this, 'alphaMap', alphaMap);
        definePropertyUniform(this, 'scale', scale);
        definePropertyUniform(this, 'borderSharpness', borderSharpness);
        definePropertyUniform(this, 'diffuseColorGrey', diffuseColorGrey);
        definePropertyUniform(this, 'debugOpacity', debugOpacity);
    }

    setCamera(textureCamera, viewCamera) {
        viewCamera.getWorldPosition(this.uvwViewPosition);
        textureCamera.getWorldPosition(this.uvwTexturePosition);

        this.uvwTexturePreTrans.copy(textureCamera.matrixWorldInverse);
        this.uvwTexturePreTrans.setPosition({x:0,y:0,z:0});
        this.uvwTexturePreTrans.premultiply(textureCamera.preProjectionMatrix);

        this.uvwViewPreTrans.copy(viewCamera.matrixWorldInverse);
        this.uvwViewPreTrans.setPosition({x:0,y:0,z:0});
        this.uvwViewPreTrans.premultiply(viewCamera.preProjectionMatrix);

        this.uvwTexturePostTrans.copy(textureCamera.postProjectionMatrix);
        this.uvwViewPostTrans.copy(viewCamera.postProjectionMatrix);
        this.uvwViewInvPostTrans = new Matrix4()
            .getInverse(viewCamera.postProjectionMatrix);

        // TODO: handle other distorsion types and arrays of distortions
        if (textureCamera.distos && textureCamera.distos.length == 1) {
            switch (textureCamera.distos[0].type){
                case 'ModRad':
                    this.uvDistortion.C = textureCamera.distos[0].C;
                    this.uvDistortion.R = textureCamera.distos[0].R;
                    this.distortionType = 1;
                    break;
                case 'ModPhgrStd':
                    this.uvDistortion.C = textureCamera.distos[0].C;
                    this.uvDistortion.R = textureCamera.distos[0].R;
                    this.uvDistortion.P = textureCamera.distos[0].P;    
                    this.uvDistortion.b = textureCamera.distos[0].b;
                    this.distortionType = 3;
                    break;
                case 'eModele_FishEye_10_5_5':
                case 'eModele_EquiSolid_FishEye_10_5_5':
                    this.uvDistortion.F = textureCamera.distos[0].F;
                    this.uvDistortion.C = textureCamera.distos[0].C;
                    this.uvDistortion.R = textureCamera.distos[0].R;
                    this.uvDistortion.P = textureCamera.distos[0].P;
                    this.distortionType = 4;
                default:
                    break;
            }
        }else{
            this.uvDistortion = {F: 0., C: new Vector2(), R: new Vector4(),
                P: new Vector2(), l: new Vector2(), b: new Vector2()};
            this.uvDistortion.R.w = Infinity;
        }
    }

    setHomography(){
        if(this.uvDistortion.R.w != Infinity){
            var r = Math.sqrt(this.uvDistortion.R.w);
            var p1 = new Vector2(this.uvDistortion.C.x, this.uvDistortion.C.y+r);
            var p2 = new Vector2(this.uvDistortion.C.x+r, this.uvDistortion.C.y);
            var p3 = new Vector2(this.uvDistortion.C.x, this.uvDistortion.C.y-r);
            var p4 = new Vector2(this.uvDistortion.C.x-r, this.uvDistortion.C.y);
            var srcPts = [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y];

            this.distortPoint(p1);
            this.distortPoint(p2);
            this.distortPoint(p3);
            this.distortPoint(p4);
            var dstPts = [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y];

            var H = this.calculateHomography(srcPts, dstPts);
            var invH = this.calculateHomography(dstPts, srcPts);
            this.H.copy(H);
            this.invH.copy(invH);
        }
    }

    /* Reference: https://github.com/jlouthan/perspective-transform/blob/master/dist/perspective-transform.js */
    calculateHomography(srcPts, dstPts){
        var r1 = [srcPts[0], srcPts[1], 1, 0, 0, 0, -1*dstPts[0]*srcPts[0], -1*dstPts[0]*srcPts[1]];
        var r2 = [0, 0, 0, srcPts[0], srcPts[1], 1, -1*dstPts[1]*srcPts[0], -1*dstPts[1]*srcPts[1]];
        var r3 = [srcPts[2], srcPts[3], 1, 0, 0, 0, -1*dstPts[2]*srcPts[2], -1*dstPts[2]*srcPts[3]];
        var r4 = [0, 0, 0, srcPts[2], srcPts[3], 1, -1*dstPts[3]*srcPts[2], -1*dstPts[3]*srcPts[3]];
        var r5 = [srcPts[4], srcPts[5], 1, 0, 0, 0, -1*dstPts[4]*srcPts[4], -1*dstPts[4]*srcPts[5]];
        var r6 = [0, 0, 0, srcPts[4], srcPts[5], 1, -1*dstPts[5]*srcPts[4], -1*dstPts[5]*srcPts[5]];
        var r7 = [srcPts[6], srcPts[7], 1, 0, 0, 0, -1*dstPts[6]*srcPts[6], -1*dstPts[6]*srcPts[7]];
        var r8 = [0, 0, 0, srcPts[6], srcPts[7], 1, -1*dstPts[7]*srcPts[6], -1*dstPts[7]*srcPts[7]];
        var matA = [r1, r2, r3, r4, r5, r6, r7, r8];
        var matB = dstPts;
        var matC;
        try{
            matC = numeric.inv(numeric.dotMMsmall(numeric.transpose(matA), matA));
        }catch(e){
            console.log(e);
            return new Matrix3().fromArray([1,0,0,0,1,0,0,0]);
        }
        var matD = numeric.dotMMsmall(matC, numeric.transpose(matA));
        var matX = numeric.dotMV(matD, matB);
        var res = numeric.dotMV(matA, matX);
        matX[8] = 1;

        var H = new Matrix3().fromArray(matX).transpose();
        return H;
    }

    radial(p, r){
        var r2 = r.x*r.x + r.y*r.y;
        var R = this.uvDistortion.R.toArray(); R.pop();
        var radial = r2 * PhotogrammetricDistortion.polynom(R, r2);
        p.x += radial * r.x;
        p.y += radial * r.y;
    }

    tangentional(p, r){
        var x2 = r.x*r.x;
        var y2 = r.y*r.y;
        var xy = r.x*r.y;
        var r2 = x2 + y2;
        p.x += this.uvDistortion.P.x*(2.*x2 + r2) + this.uvDistortion.P.y*2.*xy;
        p.y += this.uvDistortion.P.y*(2.*y2 + r2) + this.uvDistortion.P.x*2.*xy;
    }

    fraser(p, r){
        // Radial part
        this.radial(p, r);
        // Tangentional
        this.tangentional(p, r);
        // Afine
        p.x += this.uvDistortion.b.x*r.x + this.uvDistortion.b.y*r.y;
    }

    fisheye(p, r){
        // Apply N normalization
        var A = r.x / this.uvDistortion.F;
        var B = r.y / this.uvDistortion.F;
        var R = Math.sqrt(A*A + B*B);
        var theta = Math.atan(R);
        var lambda = theta/R;
        var x = lambda*A;
        var y = lambda*B;

        // Radial distortion and degree 1 polynomial
        var rad = new Vector2(x, y);
        this.radial(rad, rad);

        p.x = y*this.uvDistortion.l.y + x*this.uvDistortion.l.x + rad.x;
        p.y = x*this.uvDistortion.l.y + rad.y;

        // Tangential distortion
        this.tangentional(p, new Vector2(x, y));

        // Normalization
        p.x = this.uvDistortion.C.x + this.uvDistortion.F*p.x;
        p.y = this.uvDistortion.C.y + this.uvDistortion.F*p.y;
    }

    distortPoint(p){
        var x = p.x - this.uvDistortion.C.x;
        var y = p.y - this.uvDistortion.C.y;
        var r = new Vector2(x, y);
        if (this.distortionType == 1) this.radial(p, r);
        if (this.distortionType == 2) this.tangentional(p, r);
        else if (this.distortionType == 3) this.fraser(p, r);
        else if (this.distortionType == 4) this.fisheye(p, r);
    }
}

export default ImageMaterial;
