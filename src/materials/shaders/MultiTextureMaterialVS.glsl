#include <logdepthbuf_pars_vertex>
#include <distortions/radial_pars_fragment>
#include <camera_structure_for_mesh>
#include <tests_for_texturing>

#ifdef USE_BUILDING_DATE
    attribute int buildingId;
    varying float vIsTheOne;
    varying float dontShow;
    uniform int textureYear;
    uniform int textureNumber;
    varying float vTextureNumber;
#endif

uniform float size;
varying vec4 vColor;
uniform TextureCameraForMesh textureCameras[NUM_TEXTURES];
uniform sampler2D depthMaps[NUM_TEXTURES];
varying float passShadowMapTest[NUM_TEXTURES];
varying vec4 vPosition[NUM_TEXTURES];
uniform bool shadowMappingActivated;


bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}


void main() {

    vec3 newPosition = position;
    
#ifdef USE_BUILDING_DATE
    dontShow = 0.0;

    if (buildingId == 348188270) {
        vIsTheOne = 1.0;

        switch (textureNumber) {
            case 1989571579:
                newPosition.z = 0.75 * position.z;
                break;
            case 1989571578:
                newPosition.z = 0.60 * position.z;
                break;
            case 1989571577:
                newPosition.z = 0.55 * position.z;
                break;
            case 1989571551:
                dontShow = 1.0;
                break;
            case 1989571533:
                dontShow = 1.0;
                break;
        }
    } else {
        vIsTheOne = 0.0;
    }
#endif

    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
    vColor = vec4(color, 1.);

    // // Homography

    // vec4 P = modelMatrix * vec4( position, 1.0 );
    // P.xyz = P.xyz/P.w-cameraPosition;
    // vec3 N = P.xyz;
    // mat3 fraction;
    // #pragma unroll_loop
    // for ( int i = 0; i < NUM_TEXTURES; i++ ) {
    //   fraction = mat3(N.x*textureCameras[ i ].E_prime, N.y*textureCameras[ i ].E_prime, N.z*textureCameras[ i ].E_prime) / dot(N, P.xyz);
    //   vH[ i ] = (textureCameras[ i ].M_prime_Pre + fraction) * viewProjectionScreenInverse;
    // }

    // ShadowMapping

    mat4 m = modelMatrix;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_TEXTURES; i++ ) {
      if ( shadowMappingActivated )
        shadowMapTest(m, position, textureCameras[ i ], depthMaps[ i ], passShadowMapTest[ i ]);
      else
        passShadowMapTest[ i ] = 1.0;
    }

    // Texture coordinates calculation

    #pragma unroll_loop
    mat4 m_withTranslation;
    for ( int i = 0; i < NUM_TEXTURES; i++ ) {
      m_withTranslation = m;
      m_withTranslation[3].xyz -= textureCameras[ i ].position;
      vPosition[ i ] = textureCameras[ i ].preTransform * m_withTranslation * vec4(newPosition, 1.0);
    }
    // m[3].xyz -= textureCameraPosition;
    // vPosition = textureCameraPreTransform * m * vec4(newPosition, 1.0);


    #include <logdepthbuf_vertex>
}

////////////////////////////////////////////////////////////



// uniform vec3 textureCameraPosition;
// uniform mat4 textureCameraPreTransform; // Contains the rotation and the intrinsics of the camera, but not the translation






