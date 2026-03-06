export interface ProductInfo {
  product_name: string;
  price: string;
  image_url: string;
  availability: string;
}

export async function scrapeAmazonProduct(amazonUrl: string): Promise<ProductInfo> {
  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: amazonUrl,
      goal: "Extract the product name, current price (as a dollar amount like $X.XX), the main product image URL, and availability status. Return as JSON with keys: product_name, price, image_url, availability",
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let result: ProductInfo | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "COMPLETE") {
          if (event.status === "COMPLETED" && event.resultJson) {
            result = event.resultJson as ProductInfo;
          } else {
            throw new Error(event.error || "TFWA task failed");
          }
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // skip malformed lines
        throw e;
      }
    }
  }

  if (!result) throw new Error("No result from TFWA");
  return result;
}

export function extractAsin(amazonUrl: string): string | null {
  // Match /dp/ASIN or /gp/product/ASIN
  const match = amazonUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}
