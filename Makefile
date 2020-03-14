.PHONY: build
build:
	bin/build

.PHONY: invalidate
invalidate:
	aws cloudfront create-invalidation \
		--distribution-id $(shell pulumi stack output distributionID --cwd infra) \
		--paths $(shell find site/public -name "*.html" -o -name "*.css" -o -name "*.js" | sed "s/^site\/public//g")

.PHONY: process
process:
	bin/process

.PHONY: install
ensure:
	yarn install
	cd infra && yarn install && cd ..

.PHONY: serve
serve:
	yarn run serve

.PHONY: watch_site
watch_site:
	open "http://localhost:1313/"
	pushd site && \
	hugo serve && \
	popd

.PHONY: watch_sass
watch_components:
	pushd components && \
	npm start && \
	popd

.PHONY: test
test: build
	yarn run test

.PHONY: shipit
shipit: build
	pulumi -C infra up --skip-preview

.PHONY: logs
logs:
	pulumi logs -f -C infra

.PHONY: docker
processor:
	./processor/build-and-push.sh
