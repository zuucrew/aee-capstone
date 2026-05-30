# Student Setup Guide — Docker

Run the whole stack (FastAPI backend + React UI) with two containers.

---

## Prerequisites

```bash
docker --version                        # Docker Engine present
docker compose version                  # Compose v2 plugin present
```

Create a `.env` in the project root with the keys below (use Supabase port **6543**, not 5432):

```bash
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
QDRANT_URL=
QDRANT_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
TAVILY_API_KEY=          # optional
LANGFUSE_PUBLIC_KEY=     # optional
LANGFUSE_SECRET_KEY=     # optional
LANGFUSE_PROMPTS=false
PROVIDER=openai
```

---

## How to run

```bash
docker compose up --build -d            # build + start both detached
# → API:  http://localhost:8000
# → Web:  http://localhost:8080

docker compose logs -f api              # tail api logs
docker compose down                     # stop + remove containers
```

First boot: ~3–5 min (image build + lifespan warmup). Subsequent boots: ~30 s.

---

## Build

```bash
docker compose build                                # build both images
docker compose build api                            # build only api
docker compose build web                            # build only web
docker compose build --no-cache api                 # ignore layer cache
docker compose build --pull                         # pull fresh base images first
docker compose build --progress=plain api           # full build log (no spinner)

docker build -f docker/api/Dockerfile -t nawaloka-api:dev .   # raw build
docker build --target builder -f docker/api/Dockerfile .      # stop at builder stage
docker build --build-arg KEY=value -f docker/api/Dockerfile . # pass build arg
```

---

## Start

```bash
docker compose up                                   # foreground, both services
docker compose up -d                                # detached, no rebuild
docker compose up --build -d                       # build + detached
docker compose up -d --build api                    # rebuild + recreate just api
docker compose up -d --no-deps web                  # start web without touching api
docker compose up -d --force-recreate               # recreate even if config unchanged
docker compose up -d --remove-orphans               # also remove containers not in compose
docker compose up -d --scale web=2                  # not used here, but available

docker compose start                                # start existing stopped containers
docker compose start api                            # start one
```

## Stop / kill / pause

```bash
docker compose stop                                 # graceful stop, keep containers
docker compose stop api                             # stop one service
docker compose stop -t 30                           # 30s grace period (default 10s)

docker compose kill                                 # SIGKILL both (immediate)
docker compose kill api                             # SIGKILL one
docker compose kill -s SIGTERM api                  # send a specific signal

docker compose pause api                            # SIGSTOP — freeze the process
docker compose unpause api                          # SIGCONT — resume

docker compose restart                              # restart both in place
docker compose restart api                          # restart one (no rebuild, no env reload)
docker compose restart -t 30 api                    # 30s grace before SIGKILL
```

## Down (stop + remove containers)

```bash
docker compose down                                 # stop + remove containers (keep volumes, keep images)
docker compose down -v                              # ↑ + wipe named volumes (forces re-download of HF model)
docker compose down --rmi local                     # ↑ + delete images built by this compose
docker compose down --rmi all                       # ↑ + delete all images referenced (including base images)
docker compose down --remove-orphans                # also kill containers not in compose anymore
docker compose down -t 30                           # 30s grace before SIGKILL
```

## Inspect

```bash
docker compose ps                                   # state + health of services
docker compose ps -a                                # include stopped
docker compose ps --services                        # just service names
docker compose top                                  # processes inside each container
docker compose config                               # render the resolved compose file
docker compose config --quiet                      # syntax-check only
docker compose port api 8000                       # show host port mapping for a service
docker compose images                              # images used by services

docker ps                                           # all running containers (any source)
docker ps -a                                        # include stopped
docker ps -aq                                       # just IDs (useful for piping)
docker ps --filter status=exited                   # only exited containers
docker ps --filter name=nawaloka                   # filter by name
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

## Logs

```bash
docker compose logs                                 # both services, all-time
docker compose logs api                             # one service
docker compose logs -f api                          # follow live
docker compose logs --tail=100 api                  # last 100 lines
docker compose logs --tail=0 -f api                 # follow only new lines
docker compose logs --since 2m api                  # last 2 minutes
docker compose logs --since 2026-04-26T09:00:00 api # since a timestamp
docker compose logs --until 1m api                  # up to 1 minute ago
docker compose logs -t api                          # with timestamps
docker compose logs api | grep ROUTER               # filter

docker logs nawaloka-api                            # raw docker form
docker logs -f --tail=50 nawaloka-api               # follow last 50
```

## Exec inside a container

```bash
docker compose exec api bash                       # interactive shell
docker compose exec -T api bash -c 'echo hi'        # non-interactive (no TTY)
docker compose exec -u root api bash                # as a specific user
docker compose exec -e FOO=bar api env              # with extra env
docker compose exec -w /app api ls                  # set working dir
docker compose exec api curl -s http://localhost:8000/health
docker compose exec api env | sort                  # show resolved env
docker compose exec api python -c 'import torch; print(torch.__version__)'

docker compose exec web sh                          # shell inside web (alpine)
docker compose exec web nginx -t                    # validate nginx config

docker compose run --rm api python scripts/foo.py  # one-off task in a fresh container
docker compose run --rm --entrypoint sh api        # override entrypoint
```

## Container management (raw docker)

```bash
docker start nawaloka-api                          # start an existing stopped container
docker stop nawaloka-api                            # graceful stop
docker stop -t 30 nawaloka-api                      # 30s grace
docker kill nawaloka-api                            # SIGKILL immediately
docker kill -s SIGTERM nawaloka-api                 # specific signal
docker pause nawaloka-api                           # freeze
docker unpause nawaloka-api                         # resume
docker restart nawaloka-api                         # stop + start
docker rename nawaloka-api nawaloka-api-old         # rename
docker rm nawaloka-api                              # remove stopped container
docker rm -f nawaloka-api                           # force remove (kills first)
docker rm $(docker ps -aq)                          # remove ALL stopped containers
docker rm -f $(docker ps -aq)                       # nuke everything (running too)
docker wait nawaloka-api                            # block until it exits, print exit code
```

## Inspect deeply

```bash
docker inspect nawaloka-api                                                  # full JSON
docker inspect --format '{{.State.Status}}' nawaloka-api                     # just status
docker inspect --format '{{.State.Health.Status}}' nawaloka-api              # health
docker inspect --format '{{.NetworkSettings.IPAddress}}' nawaloka-api        # IP
docker inspect --format '{{json .Config.Env}}' nawaloka-api | jq             # env vars
docker inspect --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' nawaloka-api

docker diff nawaloka-api                            # files changed since image was built
docker top nawaloka-api                             # processes (like ps)
docker stats                                        # live CPU / RAM / IO for all
docker stats nawaloka-api nawaloka-web             # specific containers
docker stats --no-stream                            # one snapshot, then exit
docker port nawaloka-api                            # published ports
docker events                                       # live event stream (start/stop/oom etc.)
docker events --since 10m --until 0s                # event history window
```

## Healthcheck

```bash
docker inspect --format '{{json .State.Health}}' nawaloka-api | jq
docker inspect --format '{{range .State.Health.Log}}{{.Output}}{{end}}' nawaloka-api
```

## Images

```bash
docker images                                       # all local images
docker images | grep nawaloka                       # project images
docker images -a                                    # include intermediate layers
docker image ls --format '{{.Repository}}:{{.Tag}}\t{{.Size}}'
docker image inspect nawaloka-api:latest           # full image config
docker image history nawaloka-api:latest           # layer history (size + cmd)

docker tag nawaloka-api:latest nawaloka-api:v1     # add a tag
docker rmi nawaloka-api:v1                          # remove a tag/image
docker rmi -f nawaloka-api:latest                   # force (even if used by stopped containers)
docker image prune                                  # remove dangling (untagged) images
docker image prune -a                               # remove ALL unused images

docker save nawaloka-api:latest -o api.tar         # export image to tar
docker load -i api.tar                              # import image from tar

docker pull python:3.13-slim                        # pull a base image
docker push myregistry/nawaloka-api:v1              # push to a registry (needs login)
docker login                                        # log in to a registry
docker logout
```

## Volumes

```bash
docker volume ls                                    # list all volumes
docker volume ls | grep nawaloka_hf_cache           # project volume
docker volume inspect nawaloka_hf_cache             # mountpoint, labels
docker volume create my-volume                      # create manually
docker volume rm nawaloka_hf_cache                  # wipe (forces HF model re-download)
docker volume rm $(docker volume ls -q)             # nuke all volumes
docker volume prune                                 # remove unused volumes

# Backup a volume
docker run --rm -v nawaloka_hf_cache:/data -v $(pwd):/backup \
    alpine tar czf /backup/hf_cache.tgz -C /data .

# Restore a volume
docker run --rm -v nawaloka_hf_cache:/data -v $(pwd):/backup \
    alpine sh -c "cd /data && tar xzf /backup/hf_cache.tgz"
```

## Networks

```bash
docker network ls                                   # all networks
docker network ls | grep appcontainerization       # project network
docker network inspect appcontainerization_default # full config
docker network create my-net                       # create one
docker network rm my-net                            # remove
docker network prune                                # remove unused
docker network connect my-net nawaloka-api         # attach a container
docker network disconnect my-net nawaloka-api      # detach
```

## File copy

```bash
docker cp nawaloka-api:/app/src/api/main.py .       # container → host
docker cp ./local.py nawaloka-api:/tmp/local.py     # host → container
docker cp - nawaloka-api:/tmp < archive.tar         # tar stream → container
```

## Cleanup

```bash
docker compose rm -f                                # remove stopped compose containers
docker container prune                              # remove all stopped containers
docker image prune -a                               # remove all unused images
docker volume prune                                 # remove all unused volumes
docker network prune                                # remove all unused networks
docker builder prune                                # remove build cache
docker builder prune -af                            # ↑ all of it, no prompt

docker system df                                    # disk usage by Docker
docker system df -v                                 # verbose breakdown per object
docker system prune                                 # remove all dangling everything
docker system prune -a                              # ↑ + ALL unused images
docker system prune --volumes                       # ↑ + volumes (DESTRUCTIVE)
docker system prune -af --volumes                   # nuclear option
```

## System info

```bash
docker info                                         # daemon info, storage driver, etc.
docker version                                      # client + server versions
docker context ls                                   # available contexts (e.g. desktop-linux)
docker context use desktop-linux                   # switch context
```

---

## Common issues

| Symptom | Fix |
|---|---|
| `port is already allocated` on 8000 or 8080 | `docker ps` to find culprit, then `docker stop <id>`. Or change the host port in `docker-compose.yml` (e.g. `"8001:8000"`) |
| api restarts every ~90 s | Lifespan warmup crashed — `docker compose logs api` for the exception (usually wrong `.env`) |
| `could not translate host name aws-0-<region>...` | `.env` still has placeholder text. Put real Supabase project ref + region in. |
| Web shows blank or 502 from `/api` | `docker compose ps` — web depends on api healthy. If api is healthy and still 502, check api logs. |
| First boot >2 min | Normal. Image build + ~90 MB embedder download. Cached afterwards. |
| Code change in `src/` not reflected | `docker compose up -d --build api` (src is baked into the image) |
| UI change not reflected | `docker compose up -d --build web` (ui is baked into the web image) |
| Stuck container won't stop | `docker kill <name>` then `docker rm -f <name>` |
| "no space left on device" | `docker system df` to see usage, then `docker system prune -af --volumes` |

---

## End-to-end flow

```bash
# 1. Create .env (one time) with the keys listed above
nano .env       # or your editor of choice

# 2. Build + start
docker compose up --build -d

# 3. Wait for api to become healthy
docker compose ps
# wait until api row shows "Up X (healthy)"

# 4. Browse to http://localhost:8080

# 5. Tail logs while testing
docker compose logs -f api

# 6. Stop when done
docker compose down
# or wipe everything including the model cache:
docker compose down -v
```
