# Web JSON — Universal API Response Viewer

A mobile-friendly API tool for fetching JSON, JavaScript, HTML, plain text and other HTTP response bodies, then downloading the complete body as a TXT file.

## Features
- GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS
- Optional JSON request headers and body
- Raw response preserved for TXT download; JSON can be pretty-printed in the viewer
- HTTP status, response time, content type, response size and response headers
- Copy response and one-tap TXT download
- Responsive dark UI
- Server-side fetch to avoid browser CORS restrictions

## Deploy on Koyeb
1. In Koyeb, create a **Web Service** and select this GitHub repository.
2. Choose **Buildpack** as the build method.
3. Set the run command to `npm start` (Koyeb should also detect the package start script).
4. The service listens on the `PORT` environment variable.
5. Deploy and open the generated public URL.

## Security notes
- This app blocks localhost and common private IP ranges in API URLs. It is intended for personal use; do not treat it as a hardened public API proxy.
- Anyone who can access a public deployment may use its fetch endpoint. Add authentication or restrict access before sharing it widely.
- Do not enter secrets on a deployment you do not control. Request headers are not persisted by this app, but may be visible to the server operator.
- Redirects are not followed automatically. If the API returns a redirect, use its destination URL directly.
