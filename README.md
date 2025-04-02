# Turborepo (NestJS + Prisma + NextJS + Tailwind + Typescript + Jest) Starter

This is fullstack turborepo starter. It comes with the following features. 

- ✅ Turborepo 
- ✅ Nestjs 
    - ✅ Env Config with Validation  
    - ✅ Prisma 
- ✅ NextJS 
    - ✅ Tailwind 
    - ✅ Redux Toolkit Query 
- ✅ Testing using Jest 
- ✅ Github Actions 
- ✅ Reverse Proxy using Nginx 
- ✅ Docker Integration 
- ✅ Postgres Database 
- ✅ Package scripts using NPS 

## What's inside?

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

### Apps and Packages

- `api`: a [NestJS](https://nestjs.com/) app
- `web`: a [Next.js](https://nextjs.org) app
- `ui`: a stub React component library used by `web`.
- `config`: `eslint`, `nginx` and `tailwind` (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This turborepo has some additional tools already setup for you:

- [Node Package Scripts](https://github.com/sezna/nps#readme) for automation scripts
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## Setup
This starter kit is using turborepo and yarn workspaces for monorepo workflow.

### Prerequisites 
- Install nps by running 
```bash
npm i -g nps
```
- Make sure docker and docker-compose are installed. Refer to docs for your operating system.

### Configure Environment
- Frontend 
    - `cd apps/web && cp .env.example .env`
- Backend 
    - `cd apps/api && cp .env.example .env`

### Install Dependencies
Make sure you are at root of the project and run: 
```bash
nps prepare
```

### Start the Application
To start all services using Docker:
```bash
docker-compose up -d
```

The app will be available at:
- Main app: http://localhost:8080 (Nginx reverse proxy)
- Frontend directly: http://localhost:3000
- Backend directly: http://localhost:5002
- API Documentation: http://localhost:5002/docs
- Database: PostgreSQL on port 5433

### Development
For development with hot-reload:
```bash
nps dev
```

### Build
To build all apps and packages:
```bash
nps build
```

## Docker Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs nginx_container
docker-compose logs postgres
```

### Rebuild services
```bash
docker-compose up -d --build
```

## Other available commands
Run `nps` in the terminal to see list of all available commands.

# Naraka Tournaments

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Install Nginx:
- Windows: Download and install Nginx from http://nginx.org/en/download.html
- Linux: `sudo apt-get install nginx`
- Mac: `brew install nginx`

3. Configure Nginx:
- Copy the `nginx.conf` file to your Nginx configuration directory:
  - Windows: `C:\nginx\conf\nginx.conf`
  - Linux: `/etc/nginx/nginx.conf`
  - Mac: `/usr/local/etc/nginx/nginx.conf`

4. Start Nginx:
- Windows: Run `nginx.exe` from the Nginx installation directory
- Linux/Mac: `sudo service nginx start` or `sudo nginx`

5. Start the development servers:
```bash
yarn dev
```

The app will be available at:
- Main app: http://localhost
- Frontend directly: http://localhost:3000
- Backend directly: http://localhost:5002
- API Documentation: http://localhost:5002/docs

## Development

To stop Nginx:
- Windows: `nginx -s stop`
- Linux/Mac: `sudo service nginx stop` or `sudo nginx -s stop`

To reload Nginx configuration:
- Windows: `nginx -s reload`
- Linux/Mac: `sudo service nginx reload` or `sudo nginx -s reload`
