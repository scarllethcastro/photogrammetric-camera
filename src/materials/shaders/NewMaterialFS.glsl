#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>
uniform bool diffuseColorGrey;
uniform float opacity;

#ifdef USE_BUILDING_DATE
  varying float vIsTheOne;
  varying float dontShow;
  varying float vTextureNumber;
#endif

#ifdef USE_PROJECTIVE_TEXTURING
uniform vec3 textureCameraPosition;
uniform mat4 textureCameraPreTransform; // Contains the rotation and the intrinsics of the camera, but not the translation
uniform mat4 textureCameraPostTransform;
uniform RadialDistortion uvDistortion;
uniform mat4 modelMatrix;
varying vec4 vPosition;
uniform sampler2D map;
uniform sampler2D depthMap;
#endif

varying vec4 vColor;

void main() {
  #include <logdepthbuf_fragment>

#ifdef USE_BUILDING_DATE
  if (dontShow > 0.0) {
      discard;
  }
#endif

  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

#ifdef USE_PROJECTIVE_TEXTURING
  // Project the point in the texture image
  // p' = M' * (P - C')
  // p': uvw
  // M': textureCameraPreTransform
  // P : vPositionWorld
  // C': textureCameraPosition

  vec4 uvw = vPosition;

  // For the shadowMapping, which is not distorted
  vec4 uvwNotDistorted = textureCameraPostTransform * uvw;
  uvwNotDistorted.xyz /= uvwNotDistorted.w;

  // If using ShadowMapMaterial:
  // float minDist = unpackRGBAToDepth(texture2D(depthMap, uvwNotDistorted.xy));

  float minDist = texture2D(depthMap, uvwNotDistorted.xy).r;
  bool passShadowMapTest;

  #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )

    float glPosition_w = uvwNotDistorted.w / 2.0;
    float glFragDepthEXT = log2(glPosition_w + 1.0) * logDepthBufFC * 0.5;
    passShadowMapTest = (glFragDepthEXT >= (minDist - EPSILON - 0.001)) && (glFragDepthEXT <= (minDist + EPSILON + 0.001));

	#else

    float distanceCamera = uvwNotDistorted.z;
    passShadowMapTest = distanceCamera <= (minDist + EPSILON);

	#endif

  vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);

  // ShadowMapping
  if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && passShadowMapTest ) {

    // Don't texture if uvw.w < 0
    if (uvw.w > 0. && distort_radial(uvw, uvDistortion)) {

      uvw = textureCameraPostTransform * uvw;
      uvw.xyz /= uvw.w;

      // If coordinates are valid, they will be between 0 and 1 after normalization
      // Test if coordinates are valid, so we can texture
      vec3 testBorder = min(uvw.xyz, 1. - uvw.xyz);

      if (all(greaterThan(testBorder,vec3(0.))))
      {
        vec4 color = texture2D(map, uvw.xy);
        finalColor.rgb = mix(finalColor.rgb, color.rgb, color.a);
      } else {
        finalColor.rgb = vec3(0.2);
      }
    } else {
      finalColor.rgb = vec3(0.2);
    }
  } else {
    finalColor.rgb = vec3(0.2); // shadow color
  }

#endif

  gl_FragColor =  vec4(finalColor.rgb, opacity);
}
