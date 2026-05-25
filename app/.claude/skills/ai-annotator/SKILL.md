---
name: ai-annotator
description: This skill should be used when the user asks to "check browser feedback", "get user feedback", "capture screenshot", "inspect element", "inject CSS", "inject JS", "read console logs", or mentions AI Annotator, browser session, or UI feedback.
---

AI Annotator provides access to the user's live browser session. Users select UI elements and add feedback comments. Use the REST API to read feedback, capture screenshots, inject CSS/JS, and read console logs.

Server: `http://127.0.0.1:7318`

## REST API

All endpoints return JSON. Obtain session ID from `GET /api/sessions` first.

| Method | Endpoint | Body/Query | Description |
|--------|----------|------------|-------------|
| `GET` | `http://127.0.0.1:7318/api/sessions` | — | List connected browser sessions |
| `GET` | `http://127.0.0.1:7318/api/sessions/:id/page-context` | — | Page URL, title, selection count |
| `POST` | `http://127.0.0.1:7318/api/sessions/:id/select` | `{mode?, selector?, selectorType?}` | Trigger feedback selection |
| `GET` | `http://127.0.0.1:7318/api/sessions/:id/feedback` | `?fields=xpath,attributes,styles,children` | Get selected feedback items |
| `DELETE` | `http://127.0.0.1:7318/api/sessions/:id/feedback` | — | Clear all selections |
| `POST` | `http://127.0.0.1:7318/api/sessions/:id/screenshot` | `{type?, selector?, quality?}` | Capture screenshot |
| `POST` | `http://127.0.0.1:7318/api/sessions/:id/inject-css` | `{css}` | Inject CSS into page |
| `POST` | `http://127.0.0.1:7318/api/sessions/:id/inject-js` | `{code}` | Execute JS in page context |
| `GET` | `http://127.0.0.1:7318/api/sessions/:id/console` | `?clear=true` | Get captured console logs |

## Workflow

1. `GET http://127.0.0.1:7318/api/sessions` → get session ID
2. `GET http://127.0.0.1:7318/api/sessions/{id}/feedback` → read user feedback
3. Make code changes based on feedback
4. `DELETE http://127.0.0.1:7318/api/sessions/{id}/feedback` → clear feedback after addressing it
