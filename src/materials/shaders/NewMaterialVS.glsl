#include <logdepthbuf_pars_vertex>

attribute int buildingId;
varying float vIsTheOne;
uniform int textureYear;
uniform int textureNumber;

uniform float size;
#ifdef USE_PROJECTIVE_TEXTURING
uniform vec3 textureCameraPosition;
uniform mat4 textureCameraPreTransform; // Contains the rotation and the intrinsics of the camera, but not the translation
varying vec4 vPosition;
#endif
varying vec4 vColor;

bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}

void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

#ifdef USE_PROJECTIVE_TEXTURING
    mat4 m = modelMatrix;
    m[3].xyz -= textureCameraPosition;
    vPosition = textureCameraPreTransform * m * vec4(position, 1.0);
#endif
    vColor = vec4(color, 1.);

    #include <logdepthbuf_vertex>

    if (buildingId == 348188270) {
        vIsTheOne = 1.0;

        switch (textureNumber) {
            case 1989571579:
                break;
            case 1989571579:
                break;
            case 1989571579:
                break;
            case 1989571579:
                break;
        }

    } else {
        vIsTheOne = 0.0;
    }
}
