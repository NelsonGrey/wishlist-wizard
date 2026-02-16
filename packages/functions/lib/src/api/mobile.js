"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupBarcode = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
exports.lookupBarcode = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { barcode } = request.data;
    if (!barcode) {
        throw new https_1.HttpsError("invalid-argument", "Barcode is required");
    }
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();
        if (data && data.status === 1) {
            const productName = ((_a = data.product) === null || _a === void 0 ? void 0 : _a.product_name) || "Unknown Product";
            const brand = ((_b = data.product) === null || _b === void 0 ? void 0 : _b.brands) || "Unknown Brand";
            return {
                found: true,
                product: {
                    title: productName,
                    price: "$0.00",
                    store: brand,
                },
            };
        }
        return { found: false };
    }
    catch (error) {
        v2_1.logger.error("Error looking up barcode:", error);
        throw new https_1.HttpsError("internal", "Failed to lookup barcode");
    }
});
//# sourceMappingURL=mobile.js.map