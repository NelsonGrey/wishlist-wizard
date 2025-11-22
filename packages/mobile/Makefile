## Makefile for packages/mobile convenience targets

.PHONY: help fastlane-ephemeral fastlane-beta fastlane-test

HELPER=../../scripts/ephemeral_keychain_fastlane.sh

help:
	@echo "Available targets:"
	@echo "  make fastlane-ephemeral  - Run arbitrary fastlane command via ephemeral keychain helper"
	@echo "  make fastlane-beta       - Run TestFlight upload (uses Gemfile if present)"
	@echo "  make fastlane-test       - Run test_and_build lane (dev builds)"

# Run arbitrary fastlane command via ephemeral helper if available
fastlane-ephemeral:
	@if [ -f "$(HELPER)" ]; then \
		echo "Using ephemeral helper: $(HELPER)"; \
		chmod +x "$(HELPER)" || true; \
		if [ -n "$(FASTLANE_CMD)" ]; then \
			$(HELPER) "$(FASTLANE_CMD)"; \
		else \
			echo "Please provide FASTLANE_CMD e.g. make fastlane-ephemeral FASTLANE_CMD='bundle exec fastlane beta'"; exit 2; \
		fi; \
	else \
		echo "Ephemeral helper not found at $(HELPER). Falling back to direct Fastlane invocation."; \
		if [ -n "$(FASTLANE_CMD)" ]; then \
			eval "$(FASTLANE_CMD)"; \
		else \
			echo "Please provide FASTLANE_CMD e.g. make fastlane-ephemeral FASTLANE_CMD='bundle exec fastlane beta'"; exit 2; \
		fi; \
	fi

fastlane-beta:
	@echo "Running Fastlane Beta (ephemeral helper if present)"
	@if [ -f "$(HELPER)" ]; then \
		chmod +x "$(HELPER)" || true; \
		if [ -f Gemfile ]; then \
			bundle config set --local path 'vendor/bundle' && bundle install --jobs 4 || true; \
			$(HELPER) "bundle exec fastlane beta"; \
		else \
			$(HELPER) "fastlane beta"; \
		fi; \
	else \
		if [ -f Gemfile ]; then \
			bundle config set --local path 'vendor/bundle' && bundle install --jobs 4 || true; \
			bundle exec fastlane beta; \
		else \
			fastlane beta; \
		fi; \
	fi

fastlane-test:
	@echo "Running Fastlane test_and_build (ephemeral helper if present)"
	@if [ -f "$(HELPER)" ]; then \
		chmod +x "$(HELPER)" || true; \
		if [ -f Gemfile ]; then \
			bundle config set --local path 'vendor/bundle' && bundle install --jobs 4 || true; \
			$(HELPER) "bundle exec fastlane test_and_build"; \
		else \
			$(HELPER) "fastlane test_and_build"; \
		fi; \
	else \
		if [ -f Gemfile ]; then \
			bundle config set --local path 'vendor/bundle' && bundle install --jobs 4 || true; \
			bundle exec fastlane test_and_build; \
		else \
			fastlane test_and_build; \
		fi; \
	fi
