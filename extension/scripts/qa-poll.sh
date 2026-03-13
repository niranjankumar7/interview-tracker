#!/bin/bash
# QA Agent Polling Script
# Usage: ./scripts/qa-poll.sh

echo "=== QA Agent Polling ==="
echo "Date: $(date)"
echo ""

EXTENSION_DIR="/root/.openclaw/workspace/interview-tracker-extension"
DOCS_DIR="$EXTENSION_DIR/docs"
SRC_DIR="$EXTENSION_DIR/src"

echo "--- Checking Agent Deliverables ---"
echo ""

# Agent 1: ADR
if [ -f "$DOCS_DIR/ADR-001-trust-model.md" ]; then
    echo "✅ ext-adr-agent: ADR-001-trust-model.md FOUND"
    if [ -f "$DOCS_DIR/supported-domains.md" ]; then
        echo "✅ ext-adr-agent: supported-domains.md FOUND"
    else
        echo "⏳ ext-adr-agent: supported-domains.md MISSING"
    fi
else
    echo "⏳ ext-adr-agent: ADR-001-trust-model.md MISSING"
fi

# Agent 2: Extension Shell
echo ""
if [ -f "$SRC_DIR/manifest.json" ]; then
    echo "✅ ext-shell-agent: manifest.json FOUND"
else
    echo "⏳ ext-shell-agent: manifest.json MISSING"
fi

if [ -f "$SRC_DIR/popup/popup.html" ]; then
    echo "✅ ext-shell-agent: popup.html FOUND"
else
    echo "⏳ ext-shell-agent: popup.html MISSING"
fi

if [ -f "$SRC_DIR/popup/popup.ts" ]; then
    echo "✅ ext-shell-agent: popup.ts FOUND"
else
    echo "⏳ ext-shell-agent: popup.ts MISSING"
fi

if [ -f "$SRC_DIR/background/service-worker.ts" ]; then
    echo "✅ ext-shell-agent: service-worker.ts FOUND"
else
    echo "⏳ ext-shell-agent: service-worker.ts MISSING"
fi

if [ -f "$SRC_DIR/content/content-script.ts" ]; then
    echo "✅ ext-shell-agent: content-script.ts FOUND"
else
    echo "⏳ ext-shell-agent: content-script.ts MISSING"
fi

if [ -f "$EXTENSION_DIR/package.json" ]; then
    echo "✅ ext-shell-agent: package.json FOUND"
else
    echo "⏳ ext-shell-agent: package.json MISSING"
fi

# Agent 3: Backend Endpoint
echo ""
BACKEND_API_DIR="/root/.openclaw/workspace/interview-tracker"
if [ -d "$BACKEND_API_DIR" ]; then
    # Check for extension capture endpoint
    if grep -r "extension/capture" "$BACKEND_API_DIR" --include="*.ts" 2>/dev/null; then
        echo "✅ ext-backend-agent: POST /api/extension/capture FOUND"
    else
        echo "⏳ ext-backend-agent: POST /api/extension/capture NOT FOUND"
    fi
else
    echo "⏳ ext-backend-agent: Backend directory not accessible"
fi

echo ""
echo "--- File Counts ---"
echo "docs/: $(find "$DOCS_DIR" -type f 2>/dev/null | wc -l) files"
echo "src/: $(find "$SRC_DIR" -type f 2>/dev/null | wc -l) files"
echo ""
echo "=== Polling Complete ==="
