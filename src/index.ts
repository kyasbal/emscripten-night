import vertexShaderCode from "./shader/sobel.vert";
import fragmentShaderCode from "./shader/sobel.frag";
function waitForVideoLoad(source: HTMLVideoElement): Promise<void> {
  return new Promise(resolve => {
    source.addEventListener("loadedmetadata", () => {
      resolve();
    });
  });
}

async function main() {
  const video = document.getElementById("source") as HTMLVideoElement;
  // ビデオの読み込みを待つ
  await waitForVideoLoad(video);
  const texSize = video.videoWidth * video.videoHeight * 4;
  const wasm = await import("../crate/pkg/emscripten_night_bg");

  // wasmの中でメモリを確保してもらう
  const sobelResultPtr = wasm.alloc(texSize);
  const segmentResultPtr = wasm.alloc(texSize);
  const memoryPtr = wasm.alloc(video.videoWidth * video.videoHeight);

  // Sobelの結果を書くためのキャンバスを作る
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl");

  /**********
  // WebGL関係の初期化の部分はじまり
  ***********/
  // bufferの初期化
  const quadVertices = new Float32Array([-1, 1, 1, 1, 1, -1, -1, -1]);
  const quadIndices = new Uint8Array([0, 1, 3, 1, 2, 3]);
  const quadVertBuf = gl.createBuffer();
  const quadIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuf);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);

  // shaderの初期化
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vertexShader, vertexShaderCode);
  gl.shaderSource(fragmentShader, fragmentShaderCode);
  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertexShader));
    throw new Error("COMPILE ERROR");
  }
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fragmentShader));
    throw new Error("COMPILE ERROR");
  }

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(shaderProgram));
    throw new Error("LINK ERROR");
  }

  const destTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, destTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    video.videoWidth,
    video.videoHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  // FBO初期化
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.bindTexture(gl.TEXTURE_2D, destTexture);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    destTexture,
    0
  );

  // textureの初期化
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.disable(gl.DEPTH_TEST);

  /**********
  // WebGL関係の初期化の部分終わり
  ***********/

  const canvas2d = document.createElement("canvas");
  canvas2d.width = video.videoWidth;
  canvas2d.height = video.videoHeight;
  document.body.appendChild(canvas2d);
  const ctx = canvas2d.getContext("2d");
  const render = () => {
    const sobelResultBuffer = new Uint8Array(
      wasm.memory.buffer,
      sobelResultPtr,
      texSize
    );

    // デモようにキャンバスを使うようにしておく
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.useProgram(shaderProgram);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "source"), 0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);

    // FBOに結びつけてテクスチャの内容を取得する
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
    gl.readPixels(
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sobelResultBuffer
    );

    // ここでwasmを使う
    wasm.process(
      sobelResultPtr,
      segmentResultPtr,
      memoryPtr,
      video.videoWidth,
      video.videoHeight
    );

    // wasmで書き終わったデータからcanvas2D用のデータを作る
    const segmentationResultBuffer = new Uint8ClampedArray(
      wasm.memory.buffer,
      segmentResultPtr,
      texSize
    );
    const imgData = new ImageData(
      segmentationResultBuffer,
      video.videoWidth,
      video.videoHeight
    );
    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(render);
  };
  render();
}

main();
