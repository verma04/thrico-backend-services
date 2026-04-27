#!/bin/bash
# Script to add createAuditLog import to all resolver files that have Mutation but no createAuditLog
SCHEMA_DIR="/Users/pulseplay/thrico/thrico-backend/services/admin-graphql/src/schema"

# Files that need audit log added (have Mutation but no createAuditLog)
for f in $(find "$SCHEMA_DIR" -name "*.resolvers.ts" -o -name "resolvers.ts" | grep -v "node_modules" | grep -v "dist" | sort); do
  has_mutation=$(grep -l "Mutation" "$f" 2>/dev/null)
  has_audit=$(grep -l "createAuditLog" "$f" 2>/dev/null)
  if [ -n "$has_mutation" ] && [ -z "$has_audit" ]; then
    echo "STILL MISSING: $f"
  fi
done
