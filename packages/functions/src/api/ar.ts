import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";

const MODEL_LIBRARY: Record<string, { glb: string; usdz?: string; title: string }> = {
  chair: {
    title: "Modern Accent Chair",
    glb: "https://modelviewer.dev/shared-assets/models/Chair.glb",
    usdz: "https://modelviewer.dev/shared-assets/models/Chair.usdz",
  },
  table: {
    title: "Coffee Table",
    glb: "https://modelviewer.dev/shared-assets/models/bench.glb",
  },
  lamp: {
    title: "Floor Lamp",
    glb: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
  },
  default: {
    title: "Wishlist Item",
    glb: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  },
};

export const getARModel = onCall(async (request: CallableRequest) => {
  const { modelType } = request.data;
  const key = (modelType || "default").toLowerCase();
  const model = MODEL_LIBRARY[key] || MODEL_LIBRARY.default;

  if (!model) {
    throw new HttpsError("not-found", "Model not found");
  }

  return {
    modelType: key,
    ...model,
  };
});
