function setupAudioVisualizer() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const audioPlayer = document.getElementById('audio-player');
  const fileInput = document.getElementById('audio-file-input');
  const source = audioContext.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];

    if (file) {
      audioPlayer.src = URL.createObjectURL(file);

      audioPlayer.play().then(() => {
        console.log('Audio playback started');
        visualizeFrequencyDataWebGL(analyser);
      }).catch(err => {
        console.error('Error starting audio playback:', err);
      });
    }
  });
}

function visualizeFrequencyDataWebGL(analyser) {
  const canvas = document.getElementById('webgl-visualizer');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error('Unable to initialize WebGL. Your browser may not support it.');
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const vertexShader = document.getElementById('vertex-shader').text;
  const fragmentShader = document.getElementById('fragment-shader').text;
  const shaderProgram = initShaderProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(shaderProgram);

  // Set up attributes and uniforms
  const frequencyLoc = gl.getAttribLocation(shaderProgram, 'frequency');
  const canvasWidthLoc = gl.getUniformLocation(shaderProgram, 'canvasWidth');
  const canvasHeightLoc = gl.getUniformLocation(shaderProgram, 'canvasHeight');
  const colorLoc = gl.getUniformLocation(shaderProgram, 'color');

  // Create buffer for vertex data
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferLength), gl.STATIC_DRAW);
  gl.vertexAttribPointer(frequencyLoc, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(frequencyLoc);

  function draw() {
    analyser.getByteFrequencyData(dataArray);

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update vertex buffer with frequency data
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataArray);

    // Set uniforms
    gl.uniform1f(canvasWidthLoc, canvas.width);
    gl.uniform1f(canvasHeightLoc, canvas.height);
    gl.uniform3fv(colorLoc, [(dataArray[0] + 100) / 255.0, 0.5, 0.5]);

    gl.drawArrays(gl.POINTS, 0, bufferLength);
    requestAnimationFrame(draw);
  }

  draw();
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation failed: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

document.addEventListener('DOMContentLoaded', function () {
  setupAudioVisualizer();
});
