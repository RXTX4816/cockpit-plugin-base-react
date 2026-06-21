#!/usr/bin/env bash
# scripts/test-vm.sh — Generic QEMU VM test harness for Cockpit plugins
#
# Spins up cloud VMs (Arch, Debian, Fedora by default) for end-to-end testing.
#
# Usage from your plugin directory:
#   ./node_modules/@rxtx4816/cockpit-plugin-base/scripts/test-vm.sh <command> [vm ...]
#
# Or add to your package.json scripts:
#   "vm": "node_modules/@rxtx4816/cockpit-plugin-base/scripts/test-vm.sh"
#
# Each plugin provides a scripts/test-vm.config.sh that customises:
#   - PLUGIN_NAME, MOUNT_TAG, INSTALL_PATH
#   - ALL_VMS, SSH_BASE, COCKPIT_BASE
#   - extra_packages(distro) — echo packages to install
#   - extra_runcmd(vm) — echo cloud-init runcmd lines
#   - pre_staged_files(vm) — echo cloud-init write_files blocks
#
# Dependencies (Arch): qemu-full cloud-image-utils wget
#   sudo pacman -S qemu-full cloud-image-utils wget
#
# Quick start:
#   npm run build
#   npm run vm download debian
#   npm run vm start debian
#   npm run vm wait debian
#   # Open https://localhost:$COCKPIT_BASE — login: test / test

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(pwd)"
VM_DIR="$PROJECT_DIR/.vms"
DIST_DIR="$PROJECT_DIR/src"

# ── Defaults (overridden by test-vm.config.sh) ────────────────────────────────

PLUGIN_NAME="cockpit-plugin"
MOUNT_TAG="cockpit_plugin"
INSTALL_PATH="/usr/share/cockpit/cockpit-plugin"

ALL_VMS=(arch debian fedora)
SSH_BASE=2220
COCKPIT_BASE=9090

VM_MEM="${VM_MEM:-1024}"
VM_CPUS="${VM_CPUS:-2}"
VM_DISK_SIZE="${VM_DISK_SIZE:-12G}"

# Default no-op hooks — plugins override these
extra_packages() { :; }
extra_runcmd()   { :; }
pre_staged_files() { :; }

# ── Load plugin config ────────────────────────────────────────────────────────

CONFIG_FILE="$PROJECT_DIR/scripts/test-vm.config.sh"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
else
  echo "WARNING: $CONFIG_FILE not found — using defaults (PLUGIN_NAME=$PLUGIN_NAME)"
fi

# ── Cloud image URLs ──────────────────────────────────────────────────────────

ARCH_IMAGE_URL="https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-cloudimg.qcow2"
DEBIAN_IMAGE_URL="https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2"
FEDORA_VERSION="41"
FEDORA_BUILD="1.4"
FEDORA_IMAGE_URL="https://download.fedoraproject.org/pub/fedora/linux/releases/${FEDORA_VERSION}/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-${FEDORA_VERSION}-${FEDORA_BUILD}.x86_64.qcow2"

# ── Helpers ───────────────────────────────────────────────────────────────────

die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }
ok()   { echo "    ✓ $*"; }

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [vm ...]

VM identifiers: ${ALL_VMS[*]}

Commands:
  download [vm|all]   Download base cloud images
  build               Run npm run build
  start    [vm ...]   Start VM(s) in background
  wait     <vm>       Block until cloud-init finishes (~2-5 min first boot)
  stop     [vm ...]   Stop VM(s)
  status              Show all VMs with ports and running state
  ssh      <vm>       Open SSH session
  logs     <vm>       Tail VM serial console
  clean    [vm ...]   Wipe disk + state (base image kept)
  rebuild  [vm ...]   clean + start in one step
  reset    [vm ...]   Remove all VM files including base image

Ports (Cockpit / SSH):
$(for i in "${!ALL_VMS[@]}"; do
  vm="${ALL_VMS[$i]}"
  printf "  %-18s → https://localhost:%d  ssh -p %d test@localhost\n" \
    "$vm" "$((COCKPIT_BASE + i))" "$((SSH_BASE + i))"
done)

Login: test / test  (your ~/.ssh/id_*.pub is also injected if found)

Environment overrides:
  VM_MEM=2048   VM_CPUS=2   VM_DISK_SIZE=12G
  CONFIG: $CONFIG_FILE
EOF
  exit 1
}

check_deps() {
  local missing=()
  for cmd in qemu-system-x86_64 qemu-img wget; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if ! command -v cloud-localds &>/dev/null \
  && ! command -v genisoimage &>/dev/null \
  && ! command -v mkisofs &>/dev/null; then
    missing+=("cloud-localds (cloud-image-utils) OR genisoimage")
  fi
  [[ ${#missing[@]} -eq 0 ]] || {
    echo "Missing dependencies:"
    printf '  %s\n' "${missing[@]}"
    echo ""
    echo "Install with:  sudo pacman -S qemu-full cloud-image-utils wget"
    exit 1
  }
}

vm_index() {
  local vm="$1"
  for i in "${!ALL_VMS[@]}"; do
    [[ "${ALL_VMS[$i]}" == "$vm" ]] && { echo "$i"; return; }
  done
  die "Unknown VM '$vm'. Valid: ${ALL_VMS[*]}"
}

ssh_port()     { echo $((SSH_BASE     + $(vm_index "$1"))); }
cockpit_port() { echo $((COCKPIT_BASE + $(vm_index "$1"))); }

vm_distro() {
  local vm="$1"
  # Distro is the first component before any '-' (arch, debian, fedora)
  echo "${vm%%-*}"
}

pid_file()    { echo "$VM_DIR/$1/qemu.pid"; }
disk_img()    { echo "$VM_DIR/$1/disk.qcow2"; }
base_img()    { local d; d="$(vm_distro "$1")"; echo "$VM_DIR/$d/base.qcow2"; }
seed_iso()    { echo "$VM_DIR/$1/seed.iso"; }
console_log() { echo "$VM_DIR/$1/console.log"; }

is_running() {
  local pf; pf="$(pid_file "$1")"
  [[ -f "$pf" ]] && kill -0 "$(cat "$pf")" 2>/dev/null
}

resolve_vms() {
  [[ $# -eq 0 ]] && { echo "${ALL_VMS[@]}"; return; }
  local result=() seen=() out=()
  for arg in "$@"; do
    if [[ "$arg" == "all" ]]; then
      result+=("${ALL_VMS[@]}")
    else
      # Accept exact VM names or distro names (which expand to all VMs for that distro)
      local matched=0
      for vm in "${ALL_VMS[@]}"; do
        if [[ "$vm" == "$arg" || "$(vm_distro "$vm")" == "$arg" ]]; then
          result+=("$vm"); matched=1
        fi
      done
      [[ $matched -eq 0 ]] && die "Unknown VM or shortcut: '$arg'. Valid: ${ALL_VMS[*]} all"
    fi
  done
  for v in "${result[@]}"; do
    [[ " ${seen[*]} " == *" $v "* ]] && continue
    seen+=("$v"); out+=("$v")
  done
  echo "${out[@]}"
}

resolve_distros() {
  [[ $# -eq 0 ]] && {
    local seen=() out=()
    for vm in "${ALL_VMS[@]}"; do
      local d; d="$(vm_distro "$vm")"
      [[ " ${seen[*]} " == *" $d "* ]] && continue
      seen+=("$d"); out+=("$d")
    done
    echo "${out[@]}"
    return
  }
  local result=() seen=() out=()
  for arg in "$@"; do
    case "$arg" in
      all) for vm in "${ALL_VMS[@]}"; do result+=("$(vm_distro "$vm")"); done ;;
      *)   result+=("$(vm_distro "$arg")") ;;
    esac
  done
  for v in "${result[@]}"; do
    [[ " ${seen[*]} " == *" $v "* ]] && continue
    seen+=("$v"); out+=("$v")
  done
  echo "${out[@]}"
}

find_ssh_pubkey() {
  for key in ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub ~/.ssh/id_ecdsa.pub; do
    [[ -f "$key" ]] && { cat "$key"; return; }
  done
  echo ""
}

make_seed_iso() {
  local iso="$1" userdata="$2" metadata="$3"
  if command -v cloud-localds &>/dev/null; then
    cloud-localds "$iso" "$userdata" "$metadata"
  elif command -v genisoimage &>/dev/null; then
    genisoimage -output "$iso" -volid cidata -joliet -rock "$userdata" "$metadata" 2>/dev/null
  else
    mkisofs -output "$iso" -volid cidata -joliet -rock "$userdata" "$metadata" 2>/dev/null
  fi
}

qemu_accel_args() {
  if [[ -r /dev/kvm ]]; then
    echo "-machine type=q35,accel=kvm -cpu host"
  else
    info "WARNING: /dev/kvm not accessible — running without KVM (will be slow)"
    echo "-machine type=q35"
  fi
}

# ── cloud-init user-data ──────────────────────────────────────────────────────

generate_userdata() {
  local vm="$1" ssh_pubkey="$2" outfile="$3"
  local distro; distro="$(vm_distro "$vm")"

  local group
  case "$distro" in
    arch|fedora) group="wheel" ;;
    debian)      group="sudo" ;;
    *)           group="sudo" ;;
  esac

  local ssh_keys_block="    ssh_authorized_keys: []"
  [[ -n "$ssh_pubkey" ]] && ssh_keys_block="    ssh_authorized_keys:
      - ${ssh_pubkey}"

  # ── header ──────────────────────────────────────────────────────────────────
  cat > "$outfile" <<YAML
#cloud-config
hostname: ${vm}-test

users:
  - name: test
    groups: ${group}
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: false
${ssh_keys_block}

chpasswd:
  list: |
    test:test
  expire: false

package_update: true
package_upgrade: false
packages:
  - cockpit
YAML

  # Plugin-specific packages ($vm passed as 2nd arg so scenario-aware plugins can use it)
  local pkg
  pkg="$(extra_packages "$distro" "$vm")"
  if [[ -n "$pkg" ]]; then
    while IFS= read -r line; do
      [[ -n "$line" ]] && printf '  - %s\n' "$line" >> "$outfile"
    done <<< "$pkg"
  fi

  # ── write_files ──────────────────────────────────────────────────────────────
  cat >> "$outfile" <<YAML

write_files:
  - path: /etc/modules-load.d/9p.conf
    content: |
      9p
      9pnet
      9pnet_virtio
YAML

  # Plugin-specific pre-staged files
  pre_staged_files "$vm" >> "$outfile" || true

  # ── runcmd ───────────────────────────────────────────────────────────────────
  cat >> "$outfile" <<YAML

runcmd:
  - modprobe 9p 9pnet 9pnet_virtio || true
  - mkdir -p ${INSTALL_PATH}
  - echo "${MOUNT_TAG} ${INSTALL_PATH} 9p trans=virtio,version=9p2000.L,ro,_netdev 0 0" >> /etc/fstab
  - mount ${INSTALL_PATH} || true
  - systemctl enable --now cockpit.socket
YAML

  # Plugin-specific runcmd
  extra_runcmd "$vm" >> "$outfile" || true

  # ── footer ───────────────────────────────────────────────────────────────────
  cat >> "$outfile" <<YAML

final_message: |
  ${vm} VM ready.
  Cockpit : https://localhost:$(cockpit_port "$vm")
  SSH     : ssh -p $(ssh_port "$vm") -o StrictHostKeyChecking=no test@localhost
  Login   : test / test
YAML
}

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_download() {
  local distros
  read -ra distros <<< "$(resolve_distros "$@")"

  for distro in "${distros[@]}"; do
    local url img
    case "$distro" in
      arch)   url="$ARCH_IMAGE_URL" ;;
      debian) url="$DEBIAN_IMAGE_URL" ;;
      fedora) url="$FEDORA_IMAGE_URL" ;;
      *)      die "No image URL configured for distro '$distro'" ;;
    esac
    img="$VM_DIR/$distro/base.qcow2"
    mkdir -p "$VM_DIR/$distro"

    if [[ -f "$img" ]]; then
      info "$distro: base image already exists ($(du -sh "$img" | cut -f1)) — skipping"
      continue
    fi

    info "$distro: downloading from $url"
    wget --progress=bar:force -O "${img}.tmp" "$url"
    mv "${img}.tmp" "$img"
    ok "$distro: saved to $img"
  done
}

cmd_build() {
  info "Building $PLUGIN_NAME plugin..."
  cd "$PROJECT_DIR"
  npm run build
  ok "Build complete → $DIST_DIR/main.js"
}

cmd_start() {
  local vms
  read -ra vms <<< "$(resolve_vms "$@")"

  for vm in "${vms[@]}"; do
    local distro sp cp vm_path bimg dimg siso udata mdata
    distro="$(vm_distro "$vm")"
    sp="$(ssh_port "$vm")"
    cp="$(cockpit_port "$vm")"
    vm_path="$VM_DIR/$vm"
    bimg="$(base_img "$vm")"
    dimg="$(disk_img "$vm")"
    siso="$(seed_iso "$vm")"
    udata="$vm_path/user-data"
    mdata="$vm_path/meta-data"

    [[ -f "$bimg" ]] || die "$vm: base image missing — run: $0 download $distro"
    [[ -f "$DIST_DIR/main.js" ]] || die "src/main.js not found — run: $0 build (or npm run build)"

    if is_running "$vm"; then
      info "$vm: already running (PID $(cat "$(pid_file "$vm")"))"
      continue
    fi

    mkdir -p "$vm_path"

    if [[ ! -f "$dimg" || "$bimg" -nt "$dimg" ]]; then
      info "$vm: creating overlay disk (${VM_DISK_SIZE}) from $distro base..."
      qemu-img create -f qcow2 -b "$bimg" -F qcow2 "$dimg"
      qemu-img resize "$dimg" "$VM_DISK_SIZE"
    fi

    if [[ ! -f "$siso" ]]; then
      local ssh_pubkey
      ssh_pubkey="$(find_ssh_pubkey)"
      info "$vm: generating cloud-init seed..."
      [[ -n "$ssh_pubkey" ]] && ok "Found SSH public key — injecting into VM"
      generate_userdata "$vm" "$ssh_pubkey" "$udata"
      printf 'instance-id: %s-01\nlocal-hostname: %s-test\n' "$vm" "$vm" > "$mdata"
      make_seed_iso "$siso" "$udata" "$mdata"
    fi

    info "$vm: starting VM (mem=${VM_MEM}M cpus=${VM_CPUS})..."

    local accel_str; accel_str="$(qemu_accel_args)"
    # shellcheck disable=SC2206
    local accel_args=($accel_str)

    qemu-system-x86_64 \
      -name "${PLUGIN_NAME}-${vm}" \
      "${accel_args[@]}" \
      -smp "$VM_CPUS" \
      -m "$VM_MEM" \
      -drive "file=${dimg},format=qcow2,if=virtio,cache=writeback" \
      -drive "file=${siso},format=raw,if=virtio,readonly=on" \
      -virtfs "local,path=${DIST_DIR},mount_tag=${MOUNT_TAG},security_model=none,readonly=on" \
      -netdev "user,id=net0,hostfwd=tcp:127.0.0.1:${sp}-:22,hostfwd=tcp:127.0.0.1:${cp}-:9090" \
      -device virtio-net-pci,netdev=net0 \
      -display none \
      -serial "file:$(console_log "$vm")" \
      -pidfile "$(pid_file "$vm")" \
      -daemonize

    ok "$vm: started (PID $(cat "$(pid_file "$vm")"))"
    echo ""
    echo "    Cockpit → https://localhost:${cp}  (accept self-signed cert)"
    echo "    SSH     → ssh -p ${sp} -o StrictHostKeyChecking=no test@localhost"
    echo "    Ready?  → $0 wait $vm"
    echo "    Logs    → $0 logs $vm"
    echo ""
  done
}

cmd_wait() {
  local vm="${1:-}"
  [[ -n "$vm" ]] || die "Usage: $0 wait <vm>"
  vm_index "$vm" > /dev/null
  local sp; sp="$(ssh_port "$vm")"

  is_running "$vm" || die "$vm is not running — start it first: $0 start $vm"

  info "$vm: waiting for SSH on port $sp..."
  local elapsed=0 timeout=300
  while ! ssh -p "$sp" \
              -o StrictHostKeyChecking=no \
              -o UserKnownHostsFile=/dev/null \
              -o ConnectTimeout=2 \
              -o BatchMode=yes \
              test@localhost true 2>/dev/null; do
    sleep 5; elapsed=$((elapsed + 5))
    [[ $elapsed -ge $timeout ]] && die "Timed out after ${timeout}s waiting for SSH"
    printf "."
  done
  echo ""
  info "$vm: SSH ready — waiting for cloud-init to complete..."
  local ci_out
  ci_out=$(ssh -p "$sp" \
               -o StrictHostKeyChecking=no \
               -o UserKnownHostsFile=/dev/null \
               -o ConnectTimeout=5 \
               -o BatchMode=yes \
               test@localhost 'sudo cloud-init status --wait' 2>/dev/null || true)
  if ! echo "$ci_out" | grep -q "status: done"; then
    echo "WARNING: cloud-init did not reach 'done' (got: $ci_out)"
    echo "         Check: $0 logs $vm"
    return 1
  fi
  echo ""
  ok "$vm: VM is ready!"
  echo ""
  echo "    Open  → https://localhost:$(cockpit_port "$vm")"
  echo "    Login → test / test"
}

cmd_stop() {
  local vms
  read -ra vms <<< "$(resolve_vms "$@")"

  for vm in "${vms[@]}"; do
    local pf; pf="$(pid_file "$vm")"
    if is_running "$vm"; then
      info "$vm: stopping (PID $(cat "$pf"))..."
      kill "$(cat "$pf")"
      local i=0
      while kill -0 "$(cat "$pf")" 2>/dev/null && [[ $i -lt 20 ]]; do
        sleep 0.5; i=$((i+1))
      done
      rm -f "$pf"
      ok "$vm: stopped"
    else
      info "$vm: not running"
    fi
  done
}

cmd_status() {
  local distros=()
  local seen=()
  for vm in "${ALL_VMS[@]}"; do
    local d; d="$(vm_distro "$vm")"
    [[ " ${seen[*]} " == *" $d "* ]] && continue
    seen+=("$d"); distros+=("$d")
  done

  echo ""
  echo "Base images:"
  for d in "${distros[@]}"; do
    local img="$VM_DIR/$d/base.qcow2"
    if [[ -f "$img" ]]; then
      printf "  %-8s  ✓  %s\n" "$d" "$(du -sh "$img" | cut -f1)"
    else
      printf "  %-8s  ✗  not downloaded\n" "$d"
    fi
  done
  echo ""
  printf "  %-18s  %-8s  %-8s  %s\n" "VM" "STATE" "COCKPIT" "SSH"
  printf "  %-18s  %-8s  %-8s  %s\n" "--" "-----" "-------" "---"
  for vm in "${ALL_VMS[@]}"; do
    local state cp sp
    cp="$(cockpit_port "$vm")"
    sp="$(ssh_port "$vm")"
    if is_running "$vm"; then
      state="running"
    elif [[ -f "$(disk_img "$vm")" ]]; then
      state="stopped"
    else
      state="not created"
    fi
    printf "  %-18s  %-8s  :%-7s  :%s\n" "$vm" "$state" "$cp" "$sp"
  done
  echo ""
}

cmd_ssh() {
  local vm="${1:-}"
  [[ -n "$vm" ]] || die "Usage: $0 ssh <vm>"
  vm_index "$vm" > /dev/null
  is_running "$vm" || die "$vm is not running — start it: $0 start $vm"
  exec ssh \
    -p "$(ssh_port "$vm")" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    test@localhost
}

cmd_logs() {
  local vm="${1:-}"
  [[ -n "$vm" ]] || die "Usage: $0 logs <vm>"
  vm_index "$vm" > /dev/null
  local log; log="$(console_log "$vm")"
  [[ -f "$log" ]] || die "No console log yet for $vm (start it first)"
  exec tail -f "$log"
}

cmd_clean() {
  local vms
  read -ra vms <<< "$(resolve_vms "$@")"
  for vm in "${vms[@]}"; do
    is_running "$vm" && { info "$vm: stopping first"; cmd_stop "$vm"; }
    info "$vm: removing disk and cloud-init state (base image kept)..."
    rm -f "$(disk_img "$vm")" "$(seed_iso "$vm")" \
          "$VM_DIR/$vm/user-data" "$VM_DIR/$vm/meta-data" \
          "$(console_log "$vm")" "$(pid_file "$vm")"
    ok "$vm: cleaned — next 'start' will reprovision from the base image"
  done
}

cmd_rebuild() {
  local vms
  read -ra vms <<< "$(resolve_vms "$@")"
  cmd_clean "${vms[@]}"
  cmd_start "${vms[@]}"
}

cmd_reset() {
  local distros
  read -ra distros <<< "$(resolve_distros "$@")"
  for distro in "${distros[@]}"; do
    for vm in "${ALL_VMS[@]}"; do
      [[ "$(vm_distro "$vm")" == "$distro" ]] && is_running "$vm" && cmd_stop "$vm"
    done
    info "$distro: removing all VM files including base image..."
    rm -rf "$VM_DIR/$distro"
    for vm in "${ALL_VMS[@]}"; do
      [[ "$(vm_distro "$vm")" == "$distro" ]] && rm -rf "$VM_DIR/$vm"
    done
    ok "$distro: reset — run 'download $distro' to start fresh"
  done
}

# ── Main ──────────────────────────────────────────────────────────────────────

check_deps

case "${1:-}" in
  download) shift; cmd_download "$@" ;;
  build)    shift; cmd_build    ;;
  start)    shift; cmd_start    "$@" ;;
  wait)     shift; cmd_wait     "$@" ;;
  stop)     shift; cmd_stop     "$@" ;;
  status)         cmd_status    ;;
  ssh)      shift; cmd_ssh      "$@" ;;
  logs)     shift; cmd_logs     "$@" ;;
  clean)    shift; cmd_clean    "$@" ;;
  rebuild)  shift; cmd_rebuild  "$@" ;;
  reset)    shift; cmd_reset    "$@" ;;
  *)               usage ;;
esac
