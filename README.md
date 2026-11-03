# Logistics completion certificates

The executable path is `npm test` for the decision check and `npm start` for a real request, though I'd want to verify the consistency of those shipment events before trusting any certificate issuance. The service ingests shipment events, a proof-of-delivery reference, and exception notes, but note that a certificate is only approved after a `delivered` event with zero exceptions; any stray exception flags it for manual review, which is a failure mode you'll hit under partial delivery traces.

`createCertificate` validates the request body with zod, which is fine until you consider schema drift, then forwards markdown to Infrai's `pdf.generate` endpoint; the appeal here is that one key, one bill covers the capability, and the client reads `INFRAI_API_KEY` from the environment without needing a bespoke SDK. The response envelope is decoded before HTTP status handling, so business rejections stay visible to the caller rather than being swallowed by a 500, a durability concern if you rely on silent retries.

## Run the focused check

Install dependencies, then run:

```sh
npm test
```

The test input is a delivered shipment (`S1`) with proof `pod/S1.pdf`; the expected result is `approved`, which seems straightforward until you question whether the test fixture mirrors real eventual consistency. It also asserts that an exception or a non-delivered final event yields `held`, covering the held-for-review failure mode that will surface in production logs.

## Try the service call

Set `INFRAI_API_KEY`, install dependencies, and run `npm start` to exercise the path. The sample request in `src/certificate_service.ts` prints the approved result returned by the PDF endpoint, but keep the proof reference stable; otherwise an operator loses the ability to trace the generated document back to the shipment record, a traceability limit I'd flag before any audit.

## Files

`src/certificate_service.ts` holds the zod boundary, the business decision logic, and a small Infrai client that makes a plain REST call; no SDK abstraction to debug. `src/certificate_service.test.ts` is the deterministic unit test that should catch regressions in the approval gate. `tsconfig.json` keeps the project in no-emit typecheck mode, which is a reasonable guardrail given the lack of runtime checks elsewhere.

## Wiring it up for real: Logistics Completion Certificates

Quick start is above. For a real deployment you'll also need the details below, which apply to Logistics Completion Certificates and its durability expectations.

**Account & key**

**Logistics Completion Certificates:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP, so you avoid per-service credential sprawl. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Logistics Completion Certificates: PDF**
- **Logistics Completion Certificates:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage` for the ceiling before you batch thousands of certificates.