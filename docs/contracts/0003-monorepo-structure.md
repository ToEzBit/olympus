# Contract 0003 — Monorepo structure

**Status:** proposed — needs Boss/architect sign-off (S1 acceptance criteria)

## Tooling

- **Package manager / workspaces:** pnpm (`pnpm-workspace.yaml`)
- **Language:** TypeScript everywhere, `strict: true` (see `tsconfig.base.json`)
- **Test runner:** vitest

## Layout

```
olympus/
├── pnpm-workspace.yaml
├── package.json                  # workspace root: scripts, shared devDeps
├── tsconfig.base.json            # shared compiler options
├── docs/
│   ├── adr/                       # architecture decisions (existing)
│   ├── notes/                     # spikes (existing)
│   └── contracts/                 # this directory — HITL-reviewed contracts
├── packages/
│   └── shared/                    # @olympus/shared — locked contracts
│       └── src/
│           ├── events.ts          # EventBus event schema
│           ├── ws-protocol.ts     # Engine<->UI WebSocket protocol
│           ├── task-store.ts      # TaskStore interface
│           ├── agent.ts           # Agent/Persona/AgentRegistry config types
│           ├── model-provider.ts  # ModelProvider interface
│           └── index.ts           # barrel export
└── apps/
    ├── engine/                     # @olympus/engine — Node process
    │   └── src/
    │       ├── index.ts            # boot: registry, EventBus, HTTP, WS
    │       ├── event-bus.ts        # EventBus (pub/sub + request/correlation)
    │       ├── event-bus.test.ts   # required unit test
    │       ├── agent-registry.ts
    │       ├── agents.config.ts    # seeded config (one agent: Apollo)
    │       ├── task-store/
    │       │   └── in-memory-task-store.ts
    │       ├── providers/
    │       │   └── claude-provider.ts
    │       ├── agent-runtime.ts    # wires registry + bus + provider + store
    │       ├── http-server.ts      # POST /command
    │       └── ws-server.ts        # broadcasts EventBus -> WS clients
    └── web/                        # @olympus/web — Next.js
        └── src/
            ├── app/
            │   ├── layout.tsx
            │   └── page.tsx        # Boss command input + Phaser mount
            ├── lib/
            │   ├── ws-client.ts
            │   ├── agent-state-store.ts       # pure reducer
            │   └── agent-state-store.test.ts  # required unit test
            └── phaser/
                ├── OfficeScene.ts
                ├── mount.ts
                └── PhaserOffice.tsx
```

## Package boundaries

- **`@olympus/shared`**: pure types, no runtime dependencies. Imported by
  both `@olympus/engine` and `@olympus/web`. This is the only package whose
  exports both apps depend on — changes here ripple to both, which is why it
  is the HITL gate.
- **`@olympus/engine`**: Node process, owns EventBus + TaskStore + AgentRegistry
  + ModelProvider implementations. No UI/React/Phaser dependencies.
- **`@olympus/web`**: Next.js app. No direct dependency on engine internals —
  only talks to the Engine over HTTP (`POST /command`) and WebSocket, using
  types from `@olympus/shared`.

## Running (once implemented)

```bash
pnpm install
pnpm --filter @olympus/engine dev   # starts Engine process (HTTP + WS)
pnpm --filter @olympus/web dev      # starts Next.js dev server
pnpm test                           # runs vitest across all packages
```

## Open questions for reviewer

- `@olympus/*` package scope — fine to keep, or prefer unscoped names
  (`shared`, `engine`, `web`)?
- Engine HTTP/WS ports — proposed defaults `3001` (HTTP) and `3002` (WS, or
  share one port with an `Upgrade` handler). To be finalized during Engine
  implementation; not a blocker for this contract review.
