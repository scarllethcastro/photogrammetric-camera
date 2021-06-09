import { Uniform, Matrix4 } from 'three';

function pop(options, property, defaultValue) {
    if (options[property] === undefined) return defaultValue;
    const value = options[property];
    delete options[property];
    return value;
}

function definePropertyUniform(object, property, defaultValue) {
    object.uniforms[property] = new Uniform(object[property] || defaultValue);
    Object.defineProperty(object, property, {
        get: () => object.uniforms[property].value,
        set: (value) => {
            if (object.uniforms[property].value != value) {
                object.uniformsNeedUpdate = true;
                object.uniforms[property].value = value;
            }
        }
    });
}

// maps [-1,1]^3 to [0,1]^3
const textureMatrix = new Matrix4().set(
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1,
    0, 0, 0, 2);

// adapted from unrollLoops in WebGLProgram
function unrollLoops(string, defines) {
    // look for a for loop with an unroll_loop pragma
    // The detection of the scope of the for loop is hacky as it does not support nested scopes
    var pattern = /#pragma unroll_loop\s+for\s*\(\s*int\s+i\s*=\s*([\w\d]+);\s*i\s+<\s+([\w\d]+);\s*i\s*\+\+\s*\)\s*\{([^}]*)\}/g;
    function replace(match, start, end, snippet) {
        var unroll = '';
        start = start in defines ? defines[start] : parseInt(start, 10);
        end = end in defines ? defines[end] : parseInt(end, 10);
        for (var i = start; i < end; i++) {
            unroll += snippet.replace(/\s+i\s+/g, ` ${i} `);
        }
        return unroll;
    }
    return string.replace(pattern, replace);
}

export { pop, definePropertyUniform, textureMatrix, unrollLoops };
