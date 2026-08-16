#!/usr/bin/env bash
set -euo pipefail

npm install
curl -sSL https://strix.ai/install | bash

echo "Codespace setup complete. Run: docker version"
