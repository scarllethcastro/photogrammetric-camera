#include <logdepthbuf_pars_vertex>

// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;

uniform vec3 textureCameraPosition;
uniform mat4 textureCameraPreTransform;
uniform mat4 textureCameraPostTransform;
uniform sampler2D depthMap;
uniform vec3 E_prime;
uniform mat3 M_prime_Pre;
uniform mat3 viewProjectionScreenInverse;
varying mat3 vH;
varying float passShadowMapTest;

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
    mat3 fraction = mat3(N.x*E_prime, N.y*E_prime, N.z*E_prime) / dot(N, P.xyz);
    vH = (M_prime_Pre + fraction) * viewProjectionScreenInverse;


    // ShadowMapping

    mat4 m = modelMatrix;
    m[3].xyz -= textureCameraPosition;
    vec4 uvwNotDistorted = textureCameraPostTransform * textureCameraPreTransform * m * vec4(position, 1.0);
    uvwNotDistorted.xyz /= uvwNotDistorted.w;

    // If using ShadowMapMaterial:
    // float minDist = unpackRGBAToDepth(texture2D(depthMap, uvwNotDistorted.xy));

    float minDist = texture2D(depthMap, uvwNotDistorted.xy).r;
    bool shadowMapTest;

    #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )

      float glPosition_w = uvwNotDistorted.w / 2.0;
      float glFragDepthEXT = log2(glPosition_w + 1.0) * logDepthBufFC * 0.5;
      shadowMapTest = glFragDepthEXT <= (minDist + EPSILON);

    #else

      float distanceCamera = uvwNotDistorted.z;
      shadowMapTest = distanceCamera <= (minDist + EPSILON);

    #endif

    vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);
    if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && shadowMapTest ) {
      passShadowMapTest = 1.0;
    } else {
      passShadowMapTest = 0.0;
    }

    #include <logdepthbuf_vertex>
}
