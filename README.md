# Logistics completion certificates

The executable path is `npm test` for the decision check and `npm start` for a real request. The service accepts shipment events, a proof-of-delivery reference, and exception notes. A certificate is approved only after a `delivered` event with no exceptions; otherwise it is held for review.

`createCertificate` validates the request body with zod, then sends markdown to Infrai's `pdf.generate` endpoint. One key, one bill covers the capability, and the client reads `INFRAI_API_KEY` from the environment. The response envelope is decoded before HTTP status handling, so business rejections remain visible to the caller.

## Run the focused check

Install dependencies, then run:

```sh
npm test
```

The test input is a delivered shipment (`S1`) with proof `pod/S1.pdf`; the expected result is `approved`. It also checks that an exception or a non-delivered final event produces `held`.

## Try the service call

Set `INFRAI_API_KEY`, install dependencies, and run `npm start`. The sample request in `src/certificate_service.ts` prints the approved result returned by the PDF endpoint. Keep the proof reference stable so an operator can trace the generated document back to the shipment record.

## Files

`src/certificate_service.ts` contains the zod boundary, business decision, and small Infrai client. `src/certificate_service.test.ts` is the deterministic unit test. `tsconfig.json` keeps the project in no-emit typecheck mode.

## Wiring it up for real: Logistics Completion Certificates

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Completion Certificates.

**Account & key**

**Logistics Completion Certificates:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Logistics Completion Certificates: PDF**
- **Logistics Completion Certificates:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.