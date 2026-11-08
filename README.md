# Slack Bot

![Frontal Banner](banner.jpg)

**A demo Slack bot built on Open Channel Protocol. Clone it, run it, and see how OCP turns any agent into a live connection to whatever channel you and your team run.**

The bot receives messages from Slack through the Events API, routes them through an [ai-sdk](https://sdk.vercel.ai) agent backed by Anthropic Claude, and posts the reply back to the same Slack thread or channel. The agent can also call tools, such as posting a message to another channel.

> This is a mock demo. It stores events in memory and has no persistence, auth beyond Slack request signing, or rate limiting.

## Features

- **Slack Events API ingest** with request signature verification (`x-slack-signature`) and the URL verification handshake.
- **Open Channel Protocol runtime** (`@openchannelprotocol/sdk`) wiring the Slack channel, an in-memory event store, and the agent together.
- **Tool-using agent** built with ai-sdk `streamText`, with two tools:
  - `echo`: repeats a phrase back.
  - `slackPost`: posts a message to a Slack channel via the Slack Web API.
- **Typed, validated environment** via `@t3-oss/env-core` and Zod. The process fails fast on startup if a required variable is missing.
- **Typed error hierarchy** (`AppError` and subclasses) with stable error codes and HTTP status mapping.
- **Central project config** (`src/config.ts`) for project-wide constants.
- **Slack app manifest** (`slack/manifest.json`) so you can create the Slack app in one step.
- **Unit and integration tests** with Vitest.

## How it works

```
Slack ──(Events API POST /slack/events)──▶ Hono server (src/index.ts)
                                              │
                                              ├─ url_verification? → echo challenge
                                              ▼
                                  handleSlackWebhook (verify signature, normalize)
                                              ▼
                                  OCP runtime (openChannel)  ◀── InMemoryEventStore
                                              ▼
                                  Agent onMessage (ai-sdk streamText + tools)
                                              │         │
                                              │         └─ slackPost ─▶ Slack chat.postMessage
                                              ▼
                                  ctx.reply(text) ─▶ Slack chat.postMessage
```

1. Slack sends an Events API request to `POST /slack/events`.
2. `url_verification` requests are answered immediately with the challenge.
3. Other requests are verified against `SLACK_SIGNING_SECRET` and normalized into an OCP `message.received` envelope. Bot messages and messages from the bot's own user (`SLACK_BOT_USER_ID`) are ignored.
4. The OCP runtime routes the envelope to the agent.
5. The agent streams a reply, calling tools when needed, and posts the final text back to Slack.

## Project structure

```
.
├── .github/
│   ├── workflows/
│   │   └── ci.yml           # CI: typecheck, lint, test
│   └── dependabot.yml       # Weekly npm and GitHub Actions updates
├── slack/
│   └── manifest.json        # Slack app manifest (scopes, events, bot user)
├── src/
│   ├── index.ts             # Hono server, Slack route, OCP wiring, entrypoint
│   ├── env.ts               # Validated environment variables (single source)
│   ├── config.ts            # Project-wide constants (PROJECT, SERVER, SLACK, AGENT, MODEL)
│   ├── errors.ts            # AppError hierarchy and ErrorCode
│   ├── agent/
│   │   ├── index.ts         # Agent definition (onMessage, tools wiring)
│   │   ├── model.ts         # Anthropic model client factory
│   │   └── system-prompt.ts # Agent persona and tool instructions
│   ├── schemas/
│   │   └── agent.ts         # Zod schemas for tool inputs/outputs and Slack IDs
│   ├── slack/
│   │   ├── channel.ts       # OCP Slack channel definition
│   │   ├── store.ts         # In-memory OCP EventStore
│   │   ├── transport.ts     # Slack Web API client (chat.postMessage)
│   │   └── webhook.ts       # Signature verification and event normalization
│   └── tools/
│       ├── index.ts         # Tool registry
│       ├── echo.ts          # echo tool
│       └── slack-post.ts    # slackPost tool
├── tests/
│   ├── unit/                # env, config, error, schemas, tools, Slack modules
│   └── integration/         # Agent routed end to end with mocked network calls
├── .env.example             # Template for required environment variables
├── biome.json               # Biome config (extends Ultracite)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Prerequisites

- **Node.js 22.18.0 or newer** (`engines` in `package.json`)
- **pnpm** (the lockfile is `pnpm-lock.yaml`)
- A **Slack workspace** where you can install apps
- An **Anthropic API key**
- A **public HTTPS URL** for local development (for example, a tunnel such as ngrok or Cloudflare Tunnel), since Slack must reach `/slack/events`

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the Slack app

The app manifest lives in [`slack/manifest.json`](slack/manifest.json). It configures:

- **Bot scopes:** `chat:write`, `channels:history`, `groups:history`, `im:history`, `mpim:history`
- **Bot events:** `message.channels`, `message.groups`, `message.im`, `message.mpim`
- **Bot user:** "Mock Slack Assistant", always online
- **Event request URL:** `https://YOUR_PUBLIC_URL/slack/events`

To create the app:

1. Start a public tunnel to your local port (default `3333`), and note its HTTPS host.
2. Open `slack/manifest.json` and replace `YOUR_PUBLIC_URL` with your tunnel host. Slack checks this URL when the app is created.
3. Go to <https://api.slack.com/apps> → **Create New App** → **From a manifest**, choose your workspace, and paste the JSON.
4. Slack verifies the request URL when you create the app. Start the server first (step 4 below) so the `url_verification` challenge can be answered. That challenge does not need the signing secret.
5. Install the app to your workspace. Then copy:
   - **Bot User OAuth Token** (`xoxb-...`) from **OAuth & Permissions** → `SLACK_BOT_TOKEN`
   - **Signing Secret** from **Basic Information** → `SLACK_SIGNING_SECRET`
6. Find the bot's user ID (`U...`) from the bot's profile in Slack → `SLACK_BOT_USER_ID`.
7. Invite the bot to a channel with `/invite @Mock Slack Assistant`. Bots only receive channel messages where they are members.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in the values. `pnpm dev` and `pnpm start` load `.env` automatically. See [Environment variables](#environment-variables) for the full list.

### 4. Run it

```bash
pnpm dev
```

The server listens on `http://localhost:<PORT>` (default `3333`). Check it with:

```bash
curl http://localhost:3333/health
# {"status":"ok","model":"claude-haiku-4-5"}
```

## Environment variables

All variables are read and validated in [`src/env.ts`](src/env.ts). Nothing else reads `process.env` directly.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SLACK_BOT_TOKEN` | Yes | — | Bot token (`xoxb-...`) used for Slack Web API calls. |
| `SLACK_SIGNING_SECRET` | Yes | — | Signing secret used to verify inbound Slack requests. |
| `SLACK_BOT_USER_ID` | Yes | — | The bot's user ID. Its own messages are ignored to prevent loops. |
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key. |
| `ANTHROPIC_BASE_URL` | No | `https://api.anthropic.com` | Override for the Anthropic API or an Anthropic-compatible server. Must be a valid URL. |
| `ANTHROPIC_MODEL` | No | `claude-haiku-4-5` | Model ID passed to the Anthropic client. |
| `PORT` | No | `3333` | Port the HTTP server listens on. |

If a required variable is missing or invalid, startup fails with `Invalid environment variables: <path>: <message>`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs `src/index.ts` with `tsx watch`, loading `.env` if present and restarting on changes. |
| `pnpm build` | Type-checks with `tsc-rs`, then bundles `src/index.ts` to `dist/index.js` with esbuild (`--platform=node`). |
| `pnpm start` | Runs the bundled `dist/index.js`, loading `.env` if present. Run `pnpm build` first. |
| `pnpm test` | Runs the Vitest suite once. |
| `pnpm test:watch` | Runs Vitest in watch mode. |
| `pnpm typecheck` | Type-checks `src` and `tests` without emitting files. |
| `pnpm lint` | Runs Biome lint checks (via Ultracite) on `src` and `tests`. |
| `pnpm format` | Applies Biome lint fixes and formatting to `src` and `tests`. |
| `pnpm check` | Runs typecheck, lint, and tests in sequence. |
| `pnpm size` | Checks the gzipped size of `dist/index.js` against a 200 kB budget set in `scripts/size.mjs`. Run `pnpm build` first. |

CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`, then `pnpm typecheck`, `pnpm lint`, and `pnpm test` on pushes to `main` and on pull requests.

## Configuration

Two modules hold constants. Use the right one:

- **[`src/env.ts`](src/env.ts):** values that change per environment, such as tokens, the model, and the port. Read these as `env.X`.
- **[`src/config.ts`](src/config.ts):** fixed project constants.

| Export | Contents |
| --- | --- |
| `PROJECT` | `name`, `version`, and `description`. Matches `package.json`; a unit test enforces this. |
| `SERVER` | HTTP route paths: `routes.health` and `routes.slackEvents`. |
| `SLACK` | Web API base URL, method names, signature headers, and the manifest path. |
| `AGENT` | Agent `id`, `name`, `description`, and `maxRetries`. |
| `MODEL` | Default Anthropic base URL and model name. |
| `DEFAULT_PORT` | Default server port (`3333`). |

```ts
import { PROJECT, SERVER } from "./config.js";

console.log(`${PROJECT.name}@${PROJECT.version}`, SERVER.routes.slackEvents);
```

## Error handling

[`src/errors.ts`](src/errors.ts) provides `AppError`, a subclass of the built-in `Error`. It adds:

- `code`: a stable `ErrorCode` string, such as `SLACK_API_ERROR`.
- `status`: an HTTP status for responses (defaults to `500`).
- `details`: structured, JSON-serializable context.
- `isOperational`: `true` for expected failures, `false` for bugs.
- `cause`: the native cause, with helpers `rootCause()` and `causeChain()`.
- `toJSON()`: a serialization that omits the stack trace.

| Class | Code | Status | Use for |
| --- | --- | --- | --- |
| `AppError` | `UNKNOWN` (default) | 500 | Base class and generic failures. |
| `ConfigError` | `CONFIG_ERROR` | 500 | Invalid or missing configuration. |
| `ValidationError` | `VALIDATION_ERROR` | 400 | Input that fails schema validation. |
| `SignatureError` | `SIGNATURE_INVALID` | 401 | Slack signature verification failure. |
| `SlackApiError` | `SLACK_API_ERROR` | 502 | Slack Web API `ok: false` responses. Exposes `slackError`. |
| `ToolError` | `TOOL_ERROR` | 500 | Agent tool failures. Exposes `toolName`. |

Wrap anything caught from third-party code with `AppError.from`:

```ts
import { AppError, SlackApiError } from "./errors.js";

try {
  // ...
} catch (error) {
  throw AppError.from(error, { message: "Could not post reply" });
}

if (!data.ok) {
  throw new SlackApiError(data.error ?? "unknown_error", {
    details: { channelId },
  });
}
```

`AppError.from` returns an existing `AppError` unchanged, so it is safe to call on any caught value.

## Testing

```bash
pnpm test
```

- `tests/unit/` covers env validation, the config constants, the error hierarchy, the webhook signature and normalization logic, the Slack transport, the tools, and the schemas.
- `tests/integration/slack-agent.test.ts` routes a Slack message through the OCP runtime and agent and asserts a reply is posted. It mocks `streamText` and the Slack transport, so no network calls are made.

## Known issues


## Resources

- [Open Channel Protocol SDK](https://www.npmjs.com/package/@openchannelprotocol/sdk)
- [Slack Events API](https://api.slack.com/apis/events-api)
- [Slack app manifests](https://api.slack.com/reference/manifests)
- [ai-sdk](https://sdk.vercel.ai)
- [Anthropic API](https://docs.anthropic.com)
