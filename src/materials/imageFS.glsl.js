import { default as Distortion } from '../cameras/distortions/Distortion';

export default /* glsl */`
${Distortion.chunks.shaders}

#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec3 vPosition;
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
    uniform Distos uvDistortion;
    uniform int distortionType;
    uniform sampler2D map;
    uniform float borderSharpness;
#endif

#ifdef USE_LUTCOLOR
    uniform sampler2D lutMap;
    uniform float lutMapSize;
#endif

vec4 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size) {
    float sliceSize = 1.0 / size;                  // space of 1 slice
    float slicePixelSize = sliceSize / size;       // space of 1 pixel
    float width = size - 1.0;
    float sliceInnerSize = slicePixelSize * width; // space of size pixels
    float zSlice0 = floor( texCoord.z * width);
    float zSlice1 = min( zSlice0 + 1.0, width);
    float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
    float yRange = (texCoord.y * width + 0.5) / size;
    float s0 = xOffset + (zSlice0 * sliceSize);

    return texture2D(tex, vec2( s0, yRange));
  }
    
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

        if( uvw.w > 0.){
            uvw = uvwTexturePostTrans*uvw;
            uvw.xyz /= 2. * uvw.w;
            uvw.xyz += vec3(0.5);
            vec3 border = min(uvw.xyz, 1. - uvw.xyz);

            if (all(greaterThan(border,vec3(0.)))){
                vec4 color = texture2D(map, uvw.xy);
                #ifdef USE_LUTCOLOR
                    color = sampleAs3DTexture(lutMap, color.xyz, lutMapSize);
                #endif
                color.a *= min(1., borderSharpness*min(border.x, border.y));
                diffuseColor.rgb = mix(diffuseColor.rgb, color.rgb, color.a);
            }
        }

    #endif
    vec3 outgoingLight = diffuseColor.rgb;
    gl_FragColor = vec4(outgoingLight, diffuseColor.a);
}
`;