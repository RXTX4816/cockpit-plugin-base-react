# VM Testing

The package ships a QEMU-based VM harness for end-to-end testing against a real Cockpit instance running on a real OS. It spins up cloud VMs (Arch, Debian, Fedora by default), installs Cockpit, and mounts your built plugin via virtfs — no packaging or installation step required.

## Prerequisites

Arch Linux:
```bash
sudo pacman -S qemu-full cloud-image-utils wget
```

KVM access is strongly recommended. Without it the VMs run without hardware acceleration and will be significantly slower.

## How it works

1. A base cloud image is downloaded once per distro and kept on disk
2. Each VM gets a thin overlay disk so the base image is never modified
3. cloud-init provisions the VM on first boot: creates a `test` user, installs Cockpit and any plugin-specific packages, and mounts your plugin's `src/` directory read-only into the Cockpit install path via 9p/virtfs
4. Changes to your built output (`src/main.js`, `src/main.css`) are immediately visible inside the VM without a restart

## Plugin configuration

Each plugin provides `scripts/test-vm.config.sh` to customise the harness:

```bash
PLUGIN_NAME="cockpit-caddy"
MOUNT_TAG="cockpit_caddy"
INSTALL_PATH="/usr/share/cockpit/cockpit-caddy"

extra_packages() {
  echo "caddy"
}

extra_runcmd() {
  echo "  - systemctl enable --now caddy"
}
```

## Usage

Add to your plugin's `package.json`:
```json
"vm": "node_modules/@rxtx4816/cockpit-plugin-base-react/scripts/test-vm.sh"
```

Then:

```bash
npm run build                    # build the plugin first
npm run vm download arch         # download base image (once)
npm run vm start arch            # start the VM
npm run vm wait arch             # block until cloud-init finishes (~2 min first boot)
# open https://localhost:9090 — login: test / test
```

After the initial boot, subsequent starts are fast (no re-provisioning unless you `clean`).

## All commands

| Command | Description |
|---|---|
| `download [vm\|all]` | Download base cloud images |
| `build` | Run `npm run build` |
| `start [vm ...]` | Start VM(s) in background |
| `wait <vm>` | Block until cloud-init completes |
| `stop [vm ...]` | Stop VM(s) |
| `status` | Show all VMs with ports and running state |
| `ssh <vm>` | Open an SSH session into the VM |
| `logs <vm>` | Tail the VM serial console |
| `clean [vm ...]` | Wipe disk and cloud-init state (base image kept) |
| `rebuild [vm ...]` | `clean` + `start` in one step |
| `reset [vm ...]` | Remove all VM files including base image |

## Ports

By default the VMs are assigned sequential ports starting from:
- Cockpit: `9090`, `9091`, `9092` (arch, debian, fedora)
- SSH: `2220`, `2221`, `2222`

These can be changed in your `test-vm.config.sh` via `SSH_BASE` and `COCKPIT_BASE`.

## Live reload workflow

Because the plugin is mounted via virtfs, you can iterate quickly:

```bash
npm run watch       # rebuild on source changes
npm run vm start arch
npm run vm wait arch
# reload the browser tab after each rebuild — no VM restart needed
```

## Environment overrides

| Variable | Default | Description |
|---|---|---|
| `VM_MEM` | `1024` | Memory per VM in MB |
| `VM_CPUS` | `2` | vCPU count |
| `VM_DISK_SIZE` | `12G` | Overlay disk size |
