# IT Tools Hub

A beautiful, self-hosted suite of network diagnostics and utility tools.

## Features
- **Ping**: Network latency testing.
- **NSLookup**: DNS record queries.
- **Base64**: Text encoding/decoding.
- **Modern UI**: Glassmorphism, Dark mode, and Framer Motion animations.
- **Dockerized**: Ready for production deployment.

## Quick Start (Docker)
The easiest way to run IT Tools Hub is using Docker:

```bash
docker-compose up -d --build
```
The app will be available at `http://localhost:3001`.

## Local Development

### Backend
```bash
cd server
npm install
npm start
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Security Note
This tool executes system commands (e.g., `ping`). Inputs are sanitized, but it is recommended to host this behind an authentication layer (like Authelia or Authentik) if exposed to the public internet.
