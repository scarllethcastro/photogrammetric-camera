#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;
uniform TextureCamera textureCameras[NUM_TEXTURES];
uniform sampler2D depthMaps[NUM_TEXTURES];
uniform mat3 viewProjectionScreenInverse;
varying mat3 vH[NUM_TEXTURES];
varying float passShadowMapTest[NUM_TEXTURES];
uniform bool shadowMappingActivated;


void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(color, 1.);

    // Homography

    vec4 P = modelMatrix * vec4( position, 1.0 );
    P.xyz = P.xyz/P.w-cameraPosition;
    vec3 N = P.xyz;
    mat3 fraction;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_TEXTURES; i++ ) {
      fraction = mat3(N.x*textureCameras[ i ].E_prime, N.y*textureCameras[ i ].E_prime, N.z*textureCameras[ i ].E_prime) / dot(N, P.xyz);
      vH[ i ] = (textureCameras[ i ].M_prime_Pre + fraction) * viewProjectionScreenInverse;
    }

    // ShadowMapping

    mat4 m = modelMatrix;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_TEXTURES; i++ ) {
      if ( shadowMappingActivated )
        shadowMapTest(m, position, textureCameras[ i ], depthMaps[ i ], passShadowMapTest[ i ]);
      else
        passShadowMapTest[ i ] = 1.0;
    }
}
