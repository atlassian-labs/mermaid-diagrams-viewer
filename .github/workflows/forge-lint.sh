#!/bin/bash
set -euox pipefail

cd app

# Define warnings to ignore (one per line)
IGNORED_WARNINGS="DeprecationWarning: The \`punycode\` module is deprecated"

output=$(forge lint -e "${FORGE_ENVIRONMENT}" 2>&1)
echo "$output"

# Filter out ignored warnings
filtered_output="$output"
while IFS= read -r ignored_warning; do
  if [[ -n "$ignored_warning" ]]; then
    filtered_output=$(echo "$filtered_output" | grep -v "$ignored_warning" || true)
  fi
done <<< "$IGNORED_WARNINGS"

# Check if any non-ignored warnings remain
if echo "$filtered_output" | grep -iq "Warning:"; then
  echo ""
  echo "⚠️ Found warnings (after filtering ignored warnings), forcing build failure"
  exit 1
fi

echo "✅ Forge lint passed"
