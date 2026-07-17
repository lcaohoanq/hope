import BrowserOnly from "@docusaurus/BrowserOnly";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

export default function HttpApiReference() {
  const specUrl = useBaseUrl("/openapi.json");

  return (
    <BrowserOnly fallback={<p>Loading HTTP API reference…</p>}>
      {() => (
        <div className="hope-http-api-reference">
          <ApiReferenceReact
            configuration={{
              url: specUrl,
              theme: "default",
              hideModels: false,
            }}
          />
        </div>
      )}
    </BrowserOnly>
  );
}
