import { default as Distortion } from '../cameras/distortions/Distortion';

export default /* glsl */`
${Distortion.chunks.shaders}
#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec4 vUvw;
#endif

#ifdef USE_COLOR
    varying vec3 vColor;
#endif

uniform bool diffuseColorGrey;
uniform vec3 diffuse;
uniform float opacity;

#ifdef USE_MAP4
    uniform mat4 uvwViewPostTrans;
    uniform mat4 uvwViewInvPostTrans;
    uniform Distos uvDistortion;
    uniform int distortionType;
    uniform bool viewDisto;
    uniform bool viewExtrapol;

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
        vec4 uvw = vUvw;
        bool paintDebug = false;
        if(viewDisto){
            uvw = uvwViewInvPostTrans*uvw;

            if (distortionType == 1) distort_radial_inverse(uvw, uvDistortion, viewExtrapol);
            else distort_fisheye_inverse(uvw, uvDistortion, viewExtrapol);
            uvw = uvwViewPostTrans*uvw;
        }

        uvw.xyz /= 2.*uvw.w;
        uvw.xyz += vec3(0.5);
        vec3 border = min(uvw.xyz, 1. - uvw.xyz);

        if (all(greaterThan(border,vec3(0.)))){
            vec4 color = texture2D(map, uvw.xy);
            color.a *= min(1., borderSharpness*min(border.x, border.y));
            diffuseColor.rgb = mix(diffuseColor.rgb, color.rgb, color.a); 
        }
        
        vec3 outgoingLight = diffuseColor.rgb;
        gl_FragColor = vec4(outgoingLight, diffuseColor.a);
    #endif 
}
`;