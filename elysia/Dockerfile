FROM oven/bun:1.2.13-slim AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ARG TARGET
ENV NODE_ENV=production
RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --target bun \
  --outfile server \
  ./${TARGET}

FROM debian:bullseye-slim AS release

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends tzdata && \
  ln -fs /usr/share/zoneinfo/UTC /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

COPY --from=prerelease /usr/src/app/server ./server

ENTRYPOINT [ "./server" ]