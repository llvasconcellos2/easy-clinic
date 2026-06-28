# Clínica Fácil — Meteor 1.4.1.3
#
# node:4 (Debian Jessie, the non-slim image) already ships curl, git, python2
# and build-essential — exactly what Meteor 1.4 needs to install its dev bundle
# and to compile the native `bcrypt` dependency. No apt-get required.
FROM node:4

# Released alongside Meteor 1.4; >=1.4.2.3 honors this env to permit running as
# root. It is a harmless no-op on 1.4.1.3 but keeps the image safe if the
# release is ever bumped.
ENV METEOR_ALLOW_SUPERUSER=true \
    METEOR_RELEASE=1.4.1.3

# Install the exact Meteor release this app was pinned to (.meteor/release).
RUN curl -fsSL "https://install.meteor.com/?release=${METEOR_RELEASE}" | sh

WORKDIR /src/app

# Copy the Meteor metadata + package manifest first so `meteor npm install`
# (which downloads the 1.4.1.3 dev bundle and compiles bcrypt) is cached
# independently of application source changes.
COPY src/app/.meteor /src/app/.meteor
COPY src/app/package.json /src/app/package.json
RUN meteor npm install

# Copy the rest of the application source.
COPY src/app/ /src/app/

# Pre-resolve and download every Atmosphere package this app pins (including
# babel-compiler 6.13.0) so they are baked into the image. The result is
# discarded — we only want the populated package cache in /root/.meteor, which
# lets `meteor run` start later with no network call to packages.meteor.com.
#
# TLS verification is relaxed for THIS BUILD STEP ONLY: node:4 ignores the OS
# trust store and predates NODE_EXTRA_CA_CERTS (Node 7.3+), so its bundled
# OpenSSL 1.0.x can't validate packages.meteor.com's current Let's Encrypt
# chain ("unable to get local issuer certificate"). The relaxation is confined
# to this ephemeral package fetch from Meteor's official server; the runtime
# `meteor run` below keeps verification on and needs no such access.
# --server-only skips the mobile (android) build, which has no SDK here.
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 meteor build /tmp/prewarm --directory --server-only \
    && rm -rf /tmp/prewarm

EXPOSE 3000

# MONGO_URL (provided by docker-compose) makes Meteor skip its bundled mongod
# and connect to the external mongo service instead. Bind to 0.0.0.0 so the
# dev server is reachable from the host.
CMD ["meteor", "run", "--port", "0.0.0.0:3000", "--settings", "config/settings.json"]
