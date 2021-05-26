#include <distortions/radial_pars_fragment>

uniform bool diffuseColorGrey;
uniform sampler2D map;
uniform sampler2D depthMap;
uniform RadialDistortion uvDistortion;
varying mat3 vM_prime_Post;
varying mat3 vH;
varying vec4 vColor;

void main() {
  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Not considering distortion
  //////////////////////////////////////////////////////////////////////////////


  // //p_texture = H * p_screen
  vec3 texCoord = vM_prime_Post * vH * vec3(gl_FragCoord.xy, 1.);
  texCoord /= texCoord.z;
  //
  // vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);
  //
  // if (all(greaterThan(testBorder,vec2(0.))))
  // {
  //   finalColor = texture2D(map, texCoord.xy);
  // }

  //////////////////////////////////////////////////////////////////////////////
  // Considering distortion
  //////////////////////////////////////////////////////////////////////////////

  // vec3 texCoord = vH * vec3(gl_FragCoord.xy, 1.);
  //
  // vec2 testBefore = texCoord.xy;
  // if (distort_radial_vec3(texCoord, uvDistortion)) {
  //   vec2 testAfter = texCoord.xy;
  //   if (testBefore.x >= testAfter.x - 0.01 && testBefore.x <= testAfter.x + 0.01 && testBefore.y >= testAfter.y - 0.01 && testBefore.y <= testAfter.y + 0.01) {
  //     finalColor = vec4(1.,0.,0.,1.);
  //   }
  //   //finalColor = vec4(testBefore.x - testAfter.x, testBefore.y - testAfter.y, 0., 1.);
  // }


  // // Don't texture if texCoord.z < 0 (z = w in this case)
  // if (texCoord.z > 0. && distort_radial_vec3(texCoord, uvDistortion)) {
  //
  //   texCoord = vM_prime_Post * texCoord;
  //   texCoord /= texCoord.z;
  //
  //   // if (texCoord1.x >= texCoord.x - 0.001 && texCoord1.x <= texCoord.x + 0.001 && texCoord1.y >= texCoord.y - 0.001 && texCoord1.y <= texCoord.y + 0.001) {
  //   //   finalColor = vec4(1.,0.,0.,1.);
  //   // }
  //
  //   // Test if coordinates are valid, so we can texture
  //   vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);
  //
  //   if (all(greaterThan(testBorder,vec2(0.))))
  //   {
  //     finalColor = texture2D(map, texCoord.xy);
  //   }
  //  }

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
