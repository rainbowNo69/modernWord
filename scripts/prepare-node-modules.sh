#!/usr/bin/env bash
# Install dependencies on local disk and expose them to the source tree by symlink.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
if [ "$(basename "$(dirname "$SCRIPT_DIR")")" = ".cozeproj" ]; then
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
else
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
fi

command -v pnpm >/dev/null 2>&1 || {
  echo "[node_modules] pnpm is required" >&2
  exit 1
}

DRIVE_ROOT="${COZE_DRIVE_ROOT:-/Coze/Drive}"
if [ -d "$DRIVE_ROOT" ]; then
  DRIVE_ROOT="$(cd "$DRIVE_ROOT" && pwd -P)"
else
  DRIVE_ROOT="${DRIVE_ROOT%/}"
fi
case "$PROJECT_ROOT" in
  "$DRIVE_ROOT"|"$DRIVE_ROOT"/*) ;;
  *)
    (cd "$PROJECT_ROOT" && pnpm install "$@")
    exit 0
    ;;
esac

NM_ROOT="/tmp/nm"
PROJECT_ID="$(basename "$PROJECT_ROOT")-$(printf '%s' "$PROJECT_ROOT" | cksum | awk '{print $1}')"
mkdir -p "$NM_ROOT"
WORK_DIR="$NM_ROOT/$PROJECT_ID"
case "$WORK_DIR" in
  "$DRIVE_ROOT"|"$DRIVE_ROOT"/*)
    echo "[node_modules] local dependency directory must not be on Coze Drive: $WORK_DIR" >&2
    exit 1
    ;;
esac

LOCK_DIR="$NM_ROOT/$PROJECT_ID.lock"
LOCK_TIMEOUT_SECONDS="${COZE_NODE_MODULES_LOCK_TIMEOUT_SECONDS:-120}"
case "$LOCK_TIMEOUT_SECONDS" in
  ''|*[!0-9]*|0)
    echo "[node_modules] COZE_NODE_MODULES_LOCK_TIMEOUT_SECONDS must be a positive integer" >&2
    exit 1
    ;;
esac

lock_owner_is_alive() {
  local owner_pid=""
  [ -f "$LOCK_DIR/pid" ] || return 1
  IFS= read -r owner_pid < "$LOCK_DIR/pid" || return 1
  case "$owner_pid" in
    ''|*[!0-9]*) return 1 ;;
  esac
  kill -0 "$owner_pid" 2>/dev/null
}

release_lock() {
  local owner_pid=""
  [ -f "$LOCK_DIR/pid" ] || return 0
  IFS= read -r owner_pid < "$LOCK_DIR/pid" || true
  if [ "$owner_pid" = "$$" ]; then
    rm -f "$LOCK_DIR/pid"
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}

lock_started_at="$(date +%s)"
missing_owner_checks=0
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  if lock_owner_is_alive; then
    missing_owner_checks=0
  else
    missing_owner_checks=$((missing_owner_checks + 1))
    if [ "$missing_owner_checks" -ge 2 ]; then
      stale_lock_dir="$LOCK_DIR.stale.$$"
      if mv "$LOCK_DIR" "$stale_lock_dir" 2>/dev/null; then
        echo "[node_modules] Recovering stale dependency preparation lock."
        rm -rf "$stale_lock_dir"
      fi
      missing_owner_checks=0
      continue
    fi
  fi

  lock_now="$(date +%s)"
  if [ $((lock_now - lock_started_at)) -ge "$LOCK_TIMEOUT_SECONDS" ]; then
    echo "[node_modules] Timed out waiting ${LOCK_TIMEOUT_SECONDS}s for dependency preparation lock: $LOCK_DIR" >&2
    exit 1
  fi
  echo "[node_modules] Waiting for another dependency preparation for this project..."
  sleep 1
done
printf '%s\n' "$$" > "$LOCK_DIR/pid"
trap release_lock EXIT

mkdir -p "$WORK_DIR"

# Previous versions mirrored the whole project into WORK_DIR. That gives pnpm
# and framework dev servers two paths for the same source tree, which breaks
# file watching and on-demand compilation. Keep only managed local outputs.
cleanup_legacy_workspace() {
  local workspace_dir="$1" entry name
  if [ -L "$workspace_dir" ] || { [ -e "$workspace_dir" ] && [ ! -d "$workspace_dir" ]; }; then
    rm -rf "$workspace_dir"
    return
  fi
  if [ ! -d "$workspace_dir" ]; then
    return 0
  fi

  while IFS= read -r -d '' entry; do
    name="$(basename "$entry")"
    [ "$name" = "node_modules" ] || rm -rf "$entry"
  done < <(find "$workspace_dir" -mindepth 1 -maxdepth 1 -print0)
}

cleanup_legacy_shadow_project() {
  local entry name
  while IFS= read -r -d '' entry; do
    name="$(basename "$entry")"
    case "$name" in
      node_modules|client|server) continue ;;
    esac
    rm -rf "$entry"
  done < <(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -print0)

  for workspace in client server; do
    cleanup_legacy_workspace "$WORK_DIR/$workspace"
  done
}

link_install_entry() {
  local source_path="$1" target_path="$2"
  rm -rf "$target_path"
  if [ -e "$source_path" ]; then
    ln -s "$source_path" "$target_path"
  fi
}

copy_install_metadata() {
  local filename source_file target_file workspace
  for filename in pnpm-lock.yaml pnpm-workspace.yaml .npmrc; do
    source_file="$PROJECT_ROOT/$filename"
    target_file="$WORK_DIR/$filename"
    rm -f "$target_file"
    if [ -f "$source_file" ]; then
      cp "$source_file" "$target_file"
    fi
  done

  link_install_entry "$PROJECT_ROOT/package.json" "$WORK_DIR/package.json"
  link_install_entry "$PROJECT_ROOT/patches" "$WORK_DIR/patches"
  link_install_entry "$PROJECT_ROOT/scripts" "$WORK_DIR/scripts"

  for workspace in client server; do
    if [ -f "$PROJECT_ROOT/$workspace/package.json" ]; then
      mkdir -p "$WORK_DIR/$workspace"
      link_install_entry "$PROJECT_ROOT/$workspace/package.json" "$WORK_DIR/$workspace/package.json"
      link_install_entry "$PROJECT_ROOT/$workspace/scripts" "$WORK_DIR/$workspace/scripts"
    else
      rm -rf "$WORK_DIR/$workspace"
    fi
  done
}

link_node_modules() {
  local source_dir="$1" target_dir="$2"
  local current=""
  mkdir -p "$target_dir"
  if [ -L "$source_dir/node_modules" ]; then
    current="$(readlink "$source_dir/node_modules")"
    case "$current" in
      "$NM_ROOT"/*/node_modules|"$NM_ROOT"/*/*/node_modules) ;;
      *)
        echo "[node_modules] refusing to replace unmanaged symlink: $source_dir/node_modules" >&2
        exit 1
        ;;
    esac
    rm "$source_dir/node_modules"
  elif [ -e "$source_dir/node_modules" ]; then
    rm -rf "$source_dir/node_modules"
  fi
  ln -s "$target_dir" "$source_dir/node_modules"
}

cleanup_legacy_shadow_project
copy_install_metadata

echo "[node_modules] Installing dependencies in $WORK_DIR"
if ! (cd "$WORK_DIR" && pnpm install "$@"); then
  exit 1
fi

if [ -f "$WORK_DIR/pnpm-lock.yaml" ]; then
  temporary_lockfile="$(mktemp "$PROJECT_ROOT/.pnpm-lock.yaml.XXXXXX")"
  cp "$WORK_DIR/pnpm-lock.yaml" "$temporary_lockfile"
  chmod 0644 "$temporary_lockfile"
  mv -f "$temporary_lockfile" "$PROJECT_ROOT/pnpm-lock.yaml"
fi

link_node_modules "$PROJECT_ROOT" "$WORK_DIR/node_modules"
for workspace in client server; do
  if [ -f "$PROJECT_ROOT/$workspace/package.json" ]; then
    link_node_modules "$PROJECT_ROOT/$workspace" "$WORK_DIR/$workspace/node_modules"
  fi
done

echo "[node_modules] Dependencies ready"
