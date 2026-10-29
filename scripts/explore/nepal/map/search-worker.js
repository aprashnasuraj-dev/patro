import { queryPlaceLayers } from "./search-core.mjs";

let layers = Object.create(null);
const cancelled = new Set();

self.onmessage = (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === "init") {
      layers = msg.layers || Object.create(null);
      self.postMessage({ type: "result", request_id: msg.request_id, kind: "init", layer_count: Object.keys(layers).length });
      return;
    }
    if (msg.type === "cancel") {
      cancelled.add(msg.request_id);
      return;
    }
    if (msg.type !== "query") return;
    if (cancelled.delete(msg.request_id)) return;
    const matches = queryPlaceLayers(msg.query || "", layers, msg.ids || Object.keys(layers), msg.limit || 400);
    if (cancelled.delete(msg.request_id)) return;
    self.postMessage({ type: "result", request_id: msg.request_id, kind: "query", matches });
  } catch (error) {
    self.postMessage({ type: "error", request_id: msg.request_id, message: error instanceof Error ? error.message : String(error) });
  }
};
