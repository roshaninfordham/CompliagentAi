# /src/imports Directory

Reference documentation files for the CompliAgent project. These are **developer reference only** -- they are NOT imported into the running React application.

---

## Files

### `compliagent-blueprint.md`

**The full architecture blueprint** for the CompliAgent system. Consult this file when:

- Planning Unlink SDK integration (exact method signatures and flow sequences)
- Designing smart contracts for Monad deployment (Solidity contract specs)
- Implementing the backend Express/Fastify server
- Understanding the x402 protocol flow in detail
- Planning the affiliate settlement (3-party commission split) implementation
- Reviewing the deployment plan and infrastructure requirements

**Key sections to reference:**
- Flow 1: x402 Agent Data Purchase (step-by-step with code)
- Flow 2: Affiliate Settlement (3-party split with ZK verification)
- Smart contract interfaces (ComplianceRegistry, AuditProofStore)
- Unlink SDK method catalog (burner.create, transfer.shielded, proof.generate)
- API endpoint specifications
- Deployment checklist

### `compliagent-dashboard.md`

**The dashboard UI specification** that was used to build the frontend. Consult this file when:

- Modifying page layouts to understand the original design intent
- Adding new UI components that should match the established patterns
- Reviewing the badge/status systems and their color codes
- Understanding the mock data schema requirements
- Checking which features were "must-have" vs "nice-to-have"

**Key sections to reference:**
- Page-by-page component hierarchy
- Badge system specifications (compliance, privacy, agent status)
- Mock data structure definitions
- Color palette and typography guidelines
- Responsive behavior requirements

---

## How These Files Were Used

These documents served as the spec for building the frontend MVP. The implementation in `/src/app/components/` follows these specs closely but with some simplifications for the hackathon timeline:

| Blueprint Feature              | Implementation Status          | Notes                           |
|-------------------------------|-------------------------------|---------------------------------|
| x402 agent purchase flow       | Simulated in AgentDemo.tsx    | Replace with real SDK calls     |
| Affiliate settlement flow      | Simulated in AgentDemo.tsx    | Replace with real SDK calls     |
| ZK compliance stamps           | Mocked (random hex hashes)   | Replace with Unlink SDK proofs  |
| Shielded transfers             | UI complete, data mocked     | Replace with Unlink SDK calls   |
| Smart contract integration     | Not yet deployed             | Deploy to Monad Testnet         |
| Selective disclosure audits    | UI complete, logic mocked    | Wire to real ZK aggregation     |
| WebSocket live feed            | Simulated with setInterval   | Replace with real Monad events  |
