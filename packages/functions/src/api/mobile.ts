import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

export const lookupBarcode = onCall(async (request: CallableRequest) => {
  const { barcode } = request.data;
  if (!barcode) {
    throw new HttpsError("invalid-argument", "Barcode is required");
  }

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data && data.status === 1) {
      const productName = data.product?.product_name || "Unknown Product";
      const brand = data.product?.brands || "Unknown Brand";
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
  } catch (error) {
    logger.error("Error looking up barcode:", error);
    throw new HttpsError("internal", "Failed to lookup barcode");
  }
});
