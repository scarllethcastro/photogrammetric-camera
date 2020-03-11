const chunks = {
    shaders: `
    struct Distos {
        float F;
        vec2 C;
        vec4 R;
        vec2 P;
        vec2 l;
        vec2 b;
    };

    float polynom(vec3 R, float x) {
        float x2 = x*x;
        return dot(R, vec3(x, x2, x*x2));
    }

    void radial(inout vec2 p, Distos disto, vec2 r){
        float r2 = dot(r, r);
        // the same as: p.xy = disto.C + r * (1.+polynom(disto.R.xyz, r2));
        p.xy += r*polynom(disto.R.xyz, r2);
    }

    void tangentional(inout vec2 p, Distos disto, vec2 r){
        float x2 = r.x*r.x;
        float y2 = r.y*r.y;
        float xy = r.x*r.y;
        float r2 = dot(r, r);
        p.x += disto.P.x*(2.*x2 + r2) + disto.P.y*2.*xy;
        p.y += disto.P.y*(2.*y2 + r2) + disto.P.x*2.*xy;
    }

    void fraser(inout vec2 p, Distos disto, vec2 r){
        // Radial
        radial(p.xy, disto, r);
        // Tangentional
        tangentional(p, disto, r);
        // Affine
        p.x += disto.b.x*r.x + disto.b.y*r.y;
    }

    void fisheye(inout vec2 p, Distos disto, vec2 r){
        vec2 AB = r/disto.F;
        float R = sqrt(dot(AB, AB));
        float theta = atan(R);
        float lambda = theta/R;
        vec2 P = lambda*AB;
        float r2 = dot(P, P);

        // Radial distortion and degree 1 polynomial
        vec2 rad = P;
        radial(rad, disto, rad);

        p.x = P.y*disto.l.y + P.x*disto.l.x + rad.x;
        p.y = P.x*disto.l.y + rad.y;

        // Tangential distortion
        tangentional(p, disto, P);

        // Normalization
        p = disto.C + disto.F*p;
    }

    void distortPoint(inout vec2 p, Distos disto, int type){
        vec2 r = p.xy - disto.C;
        if (type == 1) radial(p, disto, r);
        else if (type == 3) fraser(p, disto, r);
        else if (type == 4) fisheye(p, disto, r);
    }

    void homography(inout vec2 p, mat3 H){
        vec3 point = vec3(p.x, p.y, 1.);
        point = H * point;
        p = point.xy/point.z;
    }

    bool distortH(inout vec4 p, Distos disto, int distoType, bool extrapol, mat3 H){
        p /= p.w;
        vec2 r = p.xy - disto.C;
        float r2 = dot(r, r);

        if(r2 < disto.R.w){
            if (distoType > 0 && distoType < 5) distortPoint(p.xy, disto, distoType);
            else return false;
        }else if(extrapol){
            homography(p.xy, H);
        }else return false;
        return true;
    }

    const int N = 500;
    const float m_err2_max = 0.5;
    bool distort_inverseH(inout vec4 p, Distos disto, int distoType, bool extrapol, mat3 H) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float v2 = dot(v, v);

        float r2_max = disto.R.w;
        float r_max = sqrt(r2_max);
        vec2 point_rmax = normalize(v)*r_max + disto.C;
        distortPoint(point_rmax, disto, distoType);
        vec2 rd_max = point_rmax - disto.C;
        float rd2_max = dot(rd_max, rd_max);
        float ratio = r_max/sqrt(rd2_max);

        if(v2 < rd2_max){
            float rd = sqrt(v2), r = rd*ratio, r2 = r*r; // initialization of the iteration
            vec2 point = normalize(v)*r + disto.C;
            vec2 dPoint = point;
            distortPoint(dPoint, disto, distoType);
            vec2 rd_point = dPoint - disto.C;
            float rd2_point = dot(rd_point, rd_point);
            float err = rd - sqrt(rd2_point), err2 = err*err;
            for (int i = 0; i < N; i++) { // iterate max N times
                if (err2 < m_err2_max) break;
                // New estimation
                r = clamp(r + err, 0., r_max);
                vec2 point = normalize(dPoint)*r + disto.C;
                dPoint = point;
                distortPoint(dPoint, disto, distoType);
                rd_point = dPoint - disto.C;
                rd2_point = dot(rd_point, rd_point);
                err = rd - sqrt(rd2_point);
                err2 = err*err;
            }

            if (err2 > m_err2_max) return false;
            p.xy = disto.C + (r/rd)*v;

        }else if(extrapol){
            homography(p.xy, H);
        }else return false;


        return true;
    }

    // ----------------------------------------------------

    bool distort(inout vec4 p, Distos disto, int distoType, bool extrapol){
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float v2 = dot(v, v);
        vec2 point = p.xy;

        if (v2 > disto.R.w) 
            if (extrapol) point = normalize(v)*sqrt(disto.R.w) + disto.C;
            else return false;

        // Distort the point depending on the type of distortion
        if (distoType > 0 && distoType < 5) distortPoint(point, disto, distoType);
        else return false;

        if (v2 > disto.R.w){
            vec2 d = point - disto.C;
            float d2 = dot(d, d);
            p.xy = disto.C + (v*sqrt(d2))/sqrt(disto.R.w);
        }else p.xy = point;
        return true;
    }

    bool distort_inverse(inout vec4 p, Distos disto, int distoType, bool extrapol) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float v2 = dot(v, v);
        
        float r2_max = disto.R.w;
        float r_max = sqrt(r2_max);
        vec2 point_rmax = normalize(v)*r_max + disto.C;
        distortPoint(point_rmax, disto, distoType);
        vec2 rd_max = point_rmax - disto.C;
        float rd2_max = dot(rd_max, rd_max);
        float ratio = r_max/sqrt(rd2_max);

        // If we are inside the maximum radius, we want to invert
        // the function d(r) in order to find r in an iterative way:
        // r(0) = rd * ratio
        // r(n+1) = r(n) + (rd-d(r(n)))
        if(v2 < rd2_max){ 
            float rd = sqrt(v2), r0 = r_max, r1 = rd*ratio, r = r1;
            vec2 point = normalize(v)*r + disto.C;
            distortPoint(point, disto, distoType);
            vec2 r_point = point - disto.C;
            float r2_point = dot(r_point, r_point);
            float d_r0 = sqrt(rd2_max), d_r1 = sqrt(r2_point);
            float err = rd - sqrt(r2_point), err2 = err*err;
            for (int i = 0; i < N; i++) { // iterate max N times
                if (err2 < m_err2_max) break;
                r = clamp(r + (err*(r1-r0)/(d_r1-d_r0)), 0., r_max);
                r0 = r1; r1 = r;
                point = normalize(v)*r + disto.C;
                distortPoint(point, disto, distoType);
                r_point = point - disto.C;
                r2_point = dot(r_point, r_point);
                d_r0 = d_r1; d_r1 = sqrt(r2_point);
                err = rd - sqrt(r2_point), err2 = err*err;
            }

            if(err2 > m_err2_max) return false;
            p.xy = disto.C + (r/rd)*v;

        // Extrapolate with the ratio of the maximum radius
        }else if (extrapol){
            p.xy = disto.C + ratio*v;
        }else return false;
   
        return true;
    }


    bool distort_radial_inverse(inout vec4 p, Distos disto, bool extrapol) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float rd2 = dot(v, v);
        float r2_max = disto.R.w;
        float r_max = sqrt(r2_max);
        float rd_max = r_max *(1. + polynom(disto.R.xyz, r2_max));
        float rd2_max = rd_max * rd_max;
        vec3 derivative = disto.R.xyz * vec3(3.,5.,7.);
        float ratio = r_max / rd_max;
    
        // If we are inside the maximum radius
        if(rd2 < rd2_max){
            float rd = sqrt(rd2), r = rd*ratio, r2 = r*r; // initialization of the iteration
            float Pr2 = 1. + polynom(disto.R.xyz, r2);
            float err = rd - r*Pr2, err2 = err*err;
            // If we are inside the maximum radius, we want to invert
            // the function g(r) in order to find r from rd = d(r) = r*polynom(r^2)
            // in an iterative way, were:
            // r(0) = rd * ratio
            // r(n+1) = r(n) + (rd-d(r(n))) / d'(r(n))
            for (int i = 0; i < N; i++) { // iterate max N times
                if (err2 < m_err2_max) break;
                // New estimate of r such that d(r) = rd
                float D = 1. + polynom(derivative, r2); // = d'(r)
                r = clamp(r + err/D, 0., r_max);
                r2 = r*r;
                Pr2 = 1. + polynom(disto.R.xyz, r2);
                err = rd - r*Pr2;
                err2 = err*err;
            }
            if(err2 > m_err2_max) return false;
            p.xy = disto.C + (r/rd)*v;
    
        } else if (extrapol){
             p.xy = disto.C + ratio*v;
    
        } else return false;
    
        return true;
    }
`,
}

export default {
    chunks,
};