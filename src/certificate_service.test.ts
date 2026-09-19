import assert from "node:assert/strict";
import { certificateDecision } from "./certificate_service.js";

const delivered = { participant: "A", shipment_id: "S1", events: [{ type: "delivered" as const, at: "2026-09-03" }], proof_of_delivery: "pod/S1.pdf", exceptions: [] };
assert.equal(certificateDecision(delivered), "approved");
assert.equal(certificateDecision({ ...delivered, exceptions: ["damaged pallet"] }), "held");
assert.equal(certificateDecision({ ...delivered, events: [{ type: "in_transit", at: "2026-09-03" }] }), "held");
console.log("certificate decision tests passed");
