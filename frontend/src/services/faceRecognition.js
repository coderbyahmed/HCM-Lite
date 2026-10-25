const MODEL_URL = `${import.meta.env.BASE_URL}models`;
let modelLoadPromise;
let faceApiPromise;

const getFaceApi = () => {
  if (!faceApiPromise) {
    faceApiPromise = import('@vladmandic/face-api');
  }
  return faceApiPromise;
};

export const loadFaceRecognitionModels = async () => {
  if (!modelLoadPromise) {
    modelLoadPromise = getFaceApi()
      .then((faceapi) =>
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
      )
      .catch((error) => {
        modelLoadPromise = null;
        throw error;
      });
  }
  await modelLoadPromise;
};

export const captureFaceDescriptor = async (video) => {
  const faceapi = await getFaceApi();
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('Camera is not ready. Wait for the video to start, then try again.');
  }

  const faces = await faceapi
    .detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.6 })
    )
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  if (faces.length === 0) {
    throw new Error('No face was detected. Face the camera and improve the lighting.');
  }
  if (faces.length !== 1) {
    throw new Error('More than one face was detected. Only the employee should be visible.');
  }
  if (faces[0].detection.score < 0.7) {
    throw new Error('The face is unclear. Move closer and improve the lighting.');
  }
  const { width, height } = faces[0].detection.box;
  if (width < 110 || height < 110) {
    throw new Error('Move closer to the camera so your face is clearly visible.');
  }

  return Array.from(faces[0].descriptor);
};
