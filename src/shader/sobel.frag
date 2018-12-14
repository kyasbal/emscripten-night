precision mediump float;

varying vec2 uv;

uniform sampler2D source; 

const vec2 pixelSize = vec2(1./640.,1./360.);
const float min = 0.01;

void main(){
    float A = 0.112737;
    float B = 0.274526;
    vec3 lu = texture2D(source,uv-vec2(-1,1) * pixelSize).rgb;
    vec3 u = texture2D(source,uv-vec2(0,1) * pixelSize).rgb;
    vec3 ru = texture2D(source,uv-vec2(1,1) * pixelSize).rgb;
    vec3 l = texture2D(source,uv-vec2(-1,0) * pixelSize).rgb;
    vec3 r = texture2D(source,uv-vec2(1,0) * pixelSize).rgb;
    vec3 lb = texture2D(source,uv-vec2(-1,-1) * pixelSize).rgb;
    vec3 b = texture2D(source,uv-vec2(0,-1) * pixelSize).rgb;
    vec3 rb = texture2D(source,uv-vec2(1,-1) * pixelSize).rgb;
    vec3 x = A * lu + B * l + A * lb - (A * ru + B * r + A * rb);
    vec3 y = A * lu + B * u + A * ru - (A * lb + B * b + A * rb);
    float v = dot(x,x) + dot(y,y);
    gl_FragColor = vec4(vec3(step(min,v)),1.);
}