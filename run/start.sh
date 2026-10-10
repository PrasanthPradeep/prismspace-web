#!/usr/bin/env bash
# Copyright 2026 Prism AI Labs.
# SPDX-License-Identifier: Apache-2.0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run.sh" "$@"
