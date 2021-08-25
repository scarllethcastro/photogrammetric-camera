#include <logdepthbuf_pars_vertex>
#include <distortions/radial_pars_fragment>
#include <camera_structure>
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
uniform TextureCamera textureCameras[NUM_TEXTURES];
varying vec3 vNewPosition;


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

    vNewPosition = newPosition;

    #include <logdepthbuf_vertex>
}