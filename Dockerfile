# Both websites in one image, each on its own port, served by nginx:
#
#   8080  the landing page  (detonato.wintercore.xyz)
#   8081  the web app       (detonato-app.wintercore.xyz)
#
# Built from the repository root: the landing page reads the app's styles
# and segment designs. See AGENTS.md › Hosting.
#
#   docker build -t detonato .
#   docker run --rm -p 8080:8080 -p 8081:8081 detonato

FROM node:22-slim AS build
RUN npm install -g pnpm@12.14.0
WORKDIR /repo
# The manifests first, so the install stays cached until a dependency changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json app/
COPY landing/package.json landing/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/landing/dist /srv/landing
COPY --from=build /repo/app/dist /srv/app
EXPOSE 8080 8081
