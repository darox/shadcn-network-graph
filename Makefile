.PHONY: install dev build start lint test test-watch test-e2e registry-build typecheck clean

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

lint:
	pnpm lint

typecheck:
	pnpm tsc --noEmit

test:
	pnpm test

test-watch:
	pnpm test:watch

test-e2e:
	pnpm exec playwright test

registry-build:
	pnpm registry:build

clean:
	rm -rf .next node_modules

setup: install
	pnpm exec playwright install --with-deps
