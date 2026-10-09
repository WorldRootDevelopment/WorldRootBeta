# Builds WorldRoot into one image that runs on any host that runs containers:
# Railway today, another host or your own server later. Nothing in it is
# specific to one provider.

# The official Node image, taken from Amazon's public mirror of it. Docker Hub limits how often shared
# build servers may download from it and refuses with "429 Too Many Requests" once they have; the
# mirror holds the same image and has no such limit.
FROM public.ecr.aws/docker/library/node:22-slim

# pnpm, at the version the repository names in package.json.
RUN npm install --global pnpm@12.9.1

WORKDIR /app

# Everything the build needs. What is left out is listed in .dockerignore.
COPY . .

# Development dependencies are needed to build (TypeScript, Tailwind) and to
# run the database migrations, so they are installed and kept.
RUN pnpm install --frozen-lockfile

# The build must not try to open the real database, and Next.js is quieter this way.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

ENV NODE_ENV=production
# The host says which port to listen on. 3000 is used when it does not.
ENV PORT=3000
EXPOSE 3000

# Bring the database up to date, then start the site. If the migrations fail
# the site does not start, which is safer than starting against a database it
# does not match.
CMD ["sh", "-c", "pnpm db:migrate && pnpm --filter @worldroot/web start"]
