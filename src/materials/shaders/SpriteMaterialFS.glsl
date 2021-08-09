#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>

uniform bool diffuseColorGrey;
uniform sampler2D map;
uniform RadialDistortion uvDistortion;
uniform mat3 M_prime_Post;
varying mat3 vH;
varying vec4 vColor;
varying float passShadowMapTest;
uniform float pixelRatio;

void main() {
  #include <logdepthbuf_fragment>

  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  // if (passShadowMapTest > 0.5) {

    vec3 texCoord = vH * vec3(gl_FragCoord.xy / pixelRatio, 1.);

    // // Don't texture if texCoord.z < 0 (z = w in this case)
    // if (texCoord.z > 0. && distort_radial_vec3(texCoord, uvDistortion)) {

    //   texCoord = M_prime_Post * texCoord;
    //   texCoord /= texCoord.z;

    //   // Test if coordinates are valid, so we can texture
    //   vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

    //   if (all(greaterThan(testBorder,vec2(0.))))
    //   {
    //     //finalColor = texture2D(map, texCoord.xy);
    //     finalColor.rgb = vec3(0.,1.,0.);
    //   } else {
    // 	   //finalColor.rgb = vec3(0.2); // shadow color
    //      finalColor.rgb = vec3(1.,0.,0.);
    //   }

    // } else {
  	//    //finalColor.rgb = vec3(0.2); // shadow color
    //    finalColor.rgb = vec3(0.,0.,1.);
    // }

  // } else {
  //    finalColor.rgb = vec3(0.2); // shadow color
  // }
  finalColor.rgb = vec3(0.,0.,0.);

  if (texCoord.z > 0.) {
    finalColor.rgb = vec3(0.,1.,0.);
  }
  if (distort_radial_vec3(texCoord, uvDistortion)) {
    finalColor.rgb += vec3(0.,0.,1.);
  }

  texCoord = M_prime_Post * texCoord;
  texCoord /= texCoord.z;

  vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);
  if (all(greaterThan(testBorder,vec2(0.)))) {
    finalColor.rgb += vec3(0.5,0.,0.);
  }

  gl_FragColor =  finalColor;
}
