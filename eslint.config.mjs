import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// `eslint-config-next/core-web-vitals` exports a flat config array (including
// TypeScript rules); this wrapper just guards the shape for older exports.
export default Array.isArray(nextCoreWebVitals)
  ? nextCoreWebVitals
  : [nextCoreWebVitals];
