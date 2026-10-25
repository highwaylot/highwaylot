import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import App, { setPrerenderData } from "./App.jsx";

export { GUIDE_CATALOG, MAKE_BASE_PRICE, slugify, isGuideCarModel, classifyGuideBodyTypes } from "./App.jsx";

export function render(url, data) {
  setPrerenderData(data);
  const helmetContext = {};
  const html = renderToString(
    <React.StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
  return { html, helmet: helmetContext.helmet };
}
