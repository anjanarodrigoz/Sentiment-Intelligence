# Docker Publishing Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- A [Docker Hub](https://hub.docker.com/) account (username: `anjanarodrigo`)

## Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

## Build the Docker Image

From the project root directory:

```bash
docker build -t anjanarodrigo/sentiment-intelligence:latest .
```

To build for a specific platform (e.g., for deploying on a Linux server from a Mac):

```bash
docker build --platform linux/amd64 -t anjanarodrigo/sentiment-intelligence:latest .
```

## Tag the Image (Optional)

Tag with a version number alongside `latest`:

```bash
docker tag anjanarodrigo/sentiment-intelligence:latest anjanarodrigo/sentiment-intelligence:1.0.0
```

## Push to Docker Hub

```bash
docker push anjanarodrigo/sentiment-intelligence:latest
```

To push a specific version tag as well:

```bash
docker push anjanarodrigo/sentiment-intelligence:1.0.0
```

## Running the Published Image

Give the client the `docker-compose.prod.yml` file (renamed to `docker-compose.yml`) and run:

```bash
docker compose up -d
```

The app will be available at `http://localhost:3001`.

## Useful Commands

| Command | Description |
|---|---|
| `docker compose up` | Start all services |
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes (resets data) |
| `docker compose logs -f app` | Follow app logs |
| `docker images` | List local images |
| `docker system prune` | Clean up unused images/containers |
