import { default as Distortion } from '../cameras/distortions/Distortion';

export default /* glsl */`
${Distortion.chunks.shaders}
#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec3 vPosition;
    varying float vValid;
#endif

#ifdef USE_COLOR
    varying vec3 vColor;
#endif

uniform float size;

#ifdef USE_MAP4
    uniform vec3 uvwViewPosition;
    uniform mat4 uvwViewPreTrans;
    uniform mat4 uvwViewPostTrans;
    uniform Distos uvDistortion;
    uniform int distortionType;
    uniform bool viewDisto;
    uniform bool viewExtrapol;
#endif

void main() {
    #ifdef USE_COLOR
        vColor.xyz = color.xyz;
    #endif

    #ifdef USE_MAP4
        vPosition = position;
        bool paintDebug = true;
        // "uvwPreTransform * m" is equal to :
        // "camera.preProjectionMatrix * camera.matrixWorldInverse * modelMatrix"
        // but more stable when both the texturing and viewing cameras have large
        // coordinate values
        mat4 m = modelMatrix;
        m[3].xyz -= uvwViewPosition;
        vec4 uvw = uvwViewPreTrans * m * vec4(vPosition, 1.);

        if(viewDisto){
            if (distortionType == 1){
                paintDebug = distort_radial(uvw, uvDistortion, viewExtrapol);
            }else{
                paintDebug = distort_fisheye(uvw, uvDistortion, viewExtrapol);
            }
        }

        gl_Position = uvwViewPostTrans * uvw;
        
        vValid = paintDebug ? 1. : 0.;
    #else 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #endif

    if(size > 0.){
        gl_PointSize = size;
    }
    else{
        gl_PointSize = clamp(-size/gl_Position.w, 3.0, 10.0);
    }
}
`;
