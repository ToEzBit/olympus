import { AgentRegistry } from "./agent-registry.js";
import { seedAgents } from "./agents.config.js";
import { AgentRuntime } from "./agent-runtime.js";
import { EventBus } from "./event-bus.js";
import { startHttpServer } from "./http-server.js";
import { ClaudeProvider } from "./providers/claude-provider.js";
import { InMemoryTaskStore } from "./task-store/in-memory-task-store.js";
import { startWsServer } from "./ws-server.js";

const HTTP_PORT = Number(process.env.ENGINE_HTTP_PORT ?? 3001);
const WS_PORT = Number(process.env.ENGINE_WS_PORT ?? 3002);

const bus = new EventBus();
const registry = new AgentRegistry(seedAgents);
const taskStore = new InMemoryTaskStore();

const runtime = new AgentRuntime({
  bus,
  registry,
  taskStore,
  providers: {
    claude: new ClaudeProvider(),
  },
});

startWsServer(WS_PORT, bus, registry);
startHttpServer(HTTP_PORT, runtime);

console.log(`Olympus engine: HTTP :${HTTP_PORT} (POST /command), WS :${WS_PORT}`);
console.log(`Seeded agents: ${registry.list().map((a) => a.persona.name).join(", ")}`);
