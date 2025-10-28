export {};

declare global {
  interface Window {
    __GRAPH_LIGHT_MODE__?: boolean;
    __GRAPH_DATA__?: unknown;
    __GRAPH_READY__?: boolean;
    __GRAPH_LOAD_ERROR__?: string;
    __GRAPH_FILTERED_NODE_COUNT__?: number;
    __GRAPH_SELECTED_NODE__?: string | null;
  }
}

