"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getARModel = void 0;
const https_1 = require("firebase-functions/v2/https");
const MODEL_LIBRARY = {
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
exports.getARModel = (0, https_1.onCall)(async (request) => {
    const { modelType } = request.data;
    const key = (modelType || "default").toLowerCase();
    const model = MODEL_LIBRARY[key] || MODEL_LIBRARY.default;
    if (!model) {
        throw new https_1.HttpsError("not-found", "Model not found");
    }
    return Object.assign({ modelType: key }, model);
});
//# sourceMappingURL=ar.js.map