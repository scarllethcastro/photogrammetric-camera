#include <logdepthbuf_pars_vertex>
#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

precision highp sampler2DArray;
uniform float size;
varying vec4 vColor;
uniform TextureCamera textureCameras[NUM_TEXTURES];
uniform sampler2DArray depthMapArray;
uniform mat3 viewProjectionScreenInverse;
varying vec3 n;
varying vec4 passShadowMapTest[NUM_TEXTURES_BY_FOUR];
uniform bool shadowMappingActivated;


bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}


void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(color, 1.);

    // Homography

    vec4 P = modelMatrix * vec4( position, 1.0 );
    P.xyz = P.xyz/P.w-cameraPosition;
    vec3 N = P.xyz;
    n = transpose(viewProjectionScreenInverse) * N / dot(N, P.xyz);

    // ShadowMapping

    mat4 m = modelMatrix;
    int index;
    int coordinate;
    float shadowTest = 0.0;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_TEXTURES; i++ ) {

      index = i / 4;
      coordinate = int(mod( float( i ) , 4.0));

      if ( shadowMappingActivated )
        shadowMapTest(false, vec4(0.), m, position, textureCameras[ i ], depthMapArray, shadowTest);
      else
        shadowTest = 1.0;

      if (coordinate == 0)
        passShadowMapTest[ index ].x = shadowTest;
      else if (coordinate == 1)
        passShadowMapTest[ index ].y = shadowTest;
      else if (coordinate == 2)
        passShadowMapTest[ index ].z = shadowTest;
      else
        passShadowMapTest[ index ].w = shadowTest;
    }

    #include <logdepthbuf_vertex>
}