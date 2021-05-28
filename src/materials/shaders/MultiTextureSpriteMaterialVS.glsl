#include <distortions/radial_pars_fragment>
#include <camera_structure>

// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;

uniform TextureCamera textureCameras[NUM_TEXTURES];

// uniform vec3 textureCameraPosition;
// uniform mat4 textureCameraPreTransform;
// uniform mat4 textureCameraPostTransform;
// uniform sampler2D depthMap;
uniform mat3 viewProjectionScreenInverse;
varying mat3 vH[NUM_TEXTURES];
// varying float passShadowMapTest;


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


    // // ShadowMapping
    //
    // mat4 m = modelMatrix;
    // m[3].xyz -= textureCameraPosition;
    // vec4 uvwNotDistorted = textureCameraPostTransform * textureCameraPreTransform * m * vec4(position, 1.0);
    // uvwNotDistorted.xyz /= uvwNotDistorted.w;
    //
    // // If using ShadowMapMaterial:
    // // float minDist = unpackRGBAToDepth(texture2D(depthMap, uvwNotDistorted.xy));
    //
    // float minDist = texture2D(depthMap, uvwNotDistorted.xy).r;
    // float distanceCamera = uvwNotDistorted.z;
    // vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);
    // if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && distanceCamera <= minDist + EPSILON ) {
    //   passShadowMapTest = 1.0;
    // } else {
    //   passShadowMapTest = 0.0;
    // }
}
