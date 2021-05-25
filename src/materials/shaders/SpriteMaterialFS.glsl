#include <distortions/radial_pars_fragment>

uniform bool diffuseColorGrey;
uniform sampler2D map;
uniform sampler2D depthMap;
uniform RadialDistortion uvDistortion;
varying mat4 vM_prime_Post;
varying mat4 vH;
varying vec4 vColor;

void main() {
  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  // p_texture = H * p_screen
  //vec4 texCoord = vM_prime_Post * vH * vec4(vec3(gl_FragCoord.xy, 1.), 0.);
  // texCoord /= texCoord.z;
  //
  // vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);
  //
  // if (all(greaterThan(testBorder,vec2(0.))))
  // {
  //   finalColor = texture2D(map, texCoord.xy);
  // } else {
  //   finalColor.rgb = vec3(0.2); // shadow color
  // }

  //////////////////////////////////////////////////////////////////////////////

  vec4 texCoord = vH * vec4(vec3(gl_FragCoord.xy, 1.), 0.);

  // Don't texture if texCoord.z < 0 (z = w in this case)
    if (texCoord.z > 0. && distort_radial_vec3(texCoord, uvDistortion)) {

      texCoord = vM_prime_Post * texCoord;
      texCoord /= texCoord.z;

      // Test if coordinates are valid, so we can texture
      vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

      if (all(greaterThan(testBorder,vec2(0.))))
      {
        finalColor = texture2D(map, texCoord.xy);
      } else {
        finalColor.rgb = vec3(0.2); // shadow color
      }
    } else {
      finalColor.rgb = vec3(0.2); // shadow color
    }


  //////////////////////////////////////////////////////////////////////////////


  // TODO: add the shadowMapping
  // vec4 uvw = textureCameraPreTransform * vec4( vPositionWorld.xyz/vPositionWorld.w - textureCameraPosition, 1.0);
  //
  // // For the shadowMapping, which is not distorted
  // vec4 uvwNotDistorted = textureCameraPostTransform * uvw;
  // uvwNotDistorted.xyz /= uvwNotDistorted.w;
  // uvwNotDistorted.xyz = ( uvwNotDistorted.xyz + 1.0 ) / 2.0;
  //
  // // If using ShadowMapMaterial:
  // // float minDist = unpackRGBAToDepth(texture2D(depthMap, uvwNotDistorted.xy));
  //
	// float minDist = texture2D(depthMap, uvwNotDistorted.xy).r;
	// float distanceCamera = uvwNotDistorted.z;
  //
  // vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);
  //
	// // ShadowMapping
  // if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && distanceCamera <= minDist + EPSILON ) {
  //
	// // Don't texture if uvw.w < 0
  //   if (uvw.w > 0. && distort_radial(uvw, uvDistortion)) {
  //
  //     uvw = textureCameraPostTransform * uvw;
  //     uvw.xyz /= uvw.w;
  //
  //     // Normalization
  //     uvw.xyz = (uvw.xyz + 1.0) / 2.0;
  //
  //     // If coordinates are valid, they will be between 0 and 1 after normalization
  //     // Test if coordinates are valid, so we can texture
  //     vec3 testBorder = min(uvw.xyz, 1. - uvw.xyz);
  //
  //     if (all(greaterThan(testBorder,vec3(0.))))
  //     {
  //       vec4 color = texture2D(map, uvw.xy);
  //       finalColor.rgb = mix(finalColor.rgb, color.rgb, color.a);
  //     } else {
  //       finalColor.rgb = vec3(0.2);
  //     }
  //   }
  // } else {
	//    finalColor.rgb = vec3(0.2); // shadow color
  // }

  // finalColor = texture2D(map, texCoord.xy);

  gl_FragColor =  finalColor;
}
