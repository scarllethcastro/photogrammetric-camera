import { default as RadialDistortion } from '../cameras/distortions/RadialDistortion';

export default /* glsl */`
${RadialDistortion.chunks.radial_shaders}
#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec3 vPosition;
    varying float vValid;
#endif
#ifdef USE_COLOR
    varying vec3 vColor;
#endif
uniform bool diffuseColorGrey;
uniform vec3 diffuse;
uniform float opacity;
#ifdef USE_MAP4
    uniform mat4 modelMatrix;
    uniform vec3 uvwTexturePosition;
    uniform mat4 uvwTexturePreTrans;
    uniform mat4 uvwTexturePostTrans;
    uniform RadialDistortion uvDistortion;
    uniform bool textureDisto;
    uniform bool textureExtrapol;
    uniform sampler2D map;
    uniform float borderSharpness;
    uniform float debugOpacity;
#endif
    
void main() {
    vec4 diffuseColor = vec4(diffuse, opacity);
    #ifdef USE_COLOR
        diffuseColor.rgb *= vColor;
    #endif
    if (diffuseColorGrey) {
        diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.333333)));
    }
    #ifdef USE_MAP4
        // "uvwPreTransform * m" is equal to :
        // "camera.preProjectionMatrix * camera.matrixWorldInverse * modelMatrix"
        // but more stable when both the texturing and viewing cameras have large
        // coordinate values
        mat4 m = modelMatrix;
        m[3].xyz -= uvwTexturePosition;
        vec4 uvw = uvwTexturePreTrans * m * vec4(vPosition, 1.);
        bool paintDebug = true;

        vec2 v = uvw.xy/uvw.w - uvDistortion.C;
        float r = dot(v, v)/uvDistortion.R.w;
        vec4 debugColor = vec4(vec3(1.), fract(clamp(r*r*r*r*r,0.,1.)));

        if( uvw.w > 0.){
            if (textureDisto) paintDebug = distort_radial(uvw, 
                uvDistortion, textureExtrapol);
            uvw = uvwTexturePostTrans * uvw;
            uvw.xyz /= 2. * uvw.w;
            uvw.xyz += vec3(0.5);
            vec3 border = min(uvw.xyz, 1. - uvw.xyz);
            if (all(greaterThan(border,vec3(0.)))){
                vec4 color = texture2D(map, uvw.xy);
                color.a *= min(1., borderSharpness*min(border.x, border.y));
                diffuseColor.rgb = mix(diffuseColor.rgb, color.rgb, color.a);
            }else if(paintDebug){
                diffuseColor.rgb = mix(diffuseColor.rgb, fract(uvw.xyz), 0.4*debugOpacity);
            }
            //if(vPaintDebugView == 0.) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.333333), debugOpacity);
            if(vValid < 0.99) discard;
      	    diffuseColor.rgb = mix(diffuseColor.rgb, debugColor.rgb, debugColor.a);
        }
    #endif
    vec3 outgoingLight = diffuseColor.rgb;
    gl_FragColor = vec4(outgoingLight, diffuseColor.a);
}
`;