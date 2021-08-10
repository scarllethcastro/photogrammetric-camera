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
uniform vec2 screenSize;

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


  // vec2 fragCoordCorrected = gl_FragCoord.xy / pixelRatio;
  // vec2 fragCoord = 2.0 * fragCoordCorrected;
  // fragCoord.x = fragCoord.x/screenSize.x;
  // fragCoord.y = fragCoord.y/screenSize.y;
  // fragCoord = fragCoord - 1.0;
  // finalColor.rgb = vec3(fragCoord.x, fragCoord.y, 0.);


  finalColor.rgb = vec3(0.,0.,0.);

  if (texCoord.z > 0.) {
    finalColor.rgb = vec3(0.,1.,0.);
  }
  if (distort_radial_vec3(texCoord, uvDistortion)) {
    finalColor.rgb += vec3(1.,0.,0.);
  }

  texCoord = M_prime_Post * texCoord;
  texCoord /= texCoord.z;

  vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);
  if (all(greaterThan(testBorder,vec2(0.)))) {
    finalColor.rgb += vec3(0.,0.,1.);
  }

  gl_FragColor =  finalColor;
}
