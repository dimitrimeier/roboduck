# WSL installation and autostart

Use this guide when the same status display should show both Windows OpenCode
sessions and **native Linux OpenCode sessions inside WSL**.

**This is an additional installation step.** Installing and starting the host
bridge on Windows does not install the WSL collector. Install it once for each
WSL distribution you want to observe.

```text
Windows OpenCode --------------------------+
                                           v
                                     Windows bridge --> USB/BLE --> Display
                                           ^
WSL OpenCode --> WSL collector --> local status file
```

Only the Windows bridge accesses USB or Bluetooth. The collector forwards only
session IDs, derived statuses, and timestamps, not prompts, files, or OpenCode
credentials. No additional network listener, fixed WSL IP address, USB
forwarding, or Linux Bluetooth setup is required.

## Before you start

On Windows:

- Complete the [host installation](../host/README.md#install-and-run) and confirm
  that the display works with Windows OpenCode.
- Keep the Windows checkout used for the host bridge. The installer copies a
  collector runtime into Linux; a second clone in WSL is not needed.
- Use Windows Node.js 22+ and npm for commands marked **Windows PowerShell**.

Inside the selected WSL distribution:

- Use WSL 2 with native Linux Node.js 22+, npm, OpenCode **V2**, and Bash.
- A `systemd` user manager must be running for your normal Linux user.
- Windows filesystem mounts and Windows-to-WSL command execution must be
  available. npm needs access to its registry during collector installation.
- Install and run the collector as the same Linux user who runs OpenCode, not
  as root and not with `sudo npm`.

The installer does not install or upgrade Node.js, OpenCode, or systemd.

## 1. Select the distribution and verify the Linux environment

**Windows PowerShell:**

```powershell
wsl --list --verbose
wsl --distribution Ubuntu
```

Replace `Ubuntu` throughout this guide with the exact distribution name from the
list. The installer uses that distribution's default Linux user; make sure it is
the user you intend to run OpenCode as.

**Inside the WSL shell you just opened:**

```bash
uname -s
whoami
command -v node npm opencode
node --version
npm --version
opencode --version
systemctl --user is-active default.target
```

Expected results:

- `uname -s` prints `Linux`.
- Node.js is version 22 or newer and OpenCode is version `2.x`.
- `node`, `npm`, and `opencode` resolve to Linux installations, not Windows
  executables under a mounted Windows directory.
- The systemd user target reports `active`.

If systemd is unavailable, follow
[Microsoft's WSL systemd guide](https://learn.microsoft.com/en-us/windows/wsl/systemd).
Preserve unrelated `/etc/wsl.conf` settings. Save your work before any required
WSL restart: it can disconnect VS Code, stop jobs, and affect Docker integration.

### Install OpenCode V2 if it is missing

**WSL, using your normal Linux user:**

```bash
npm install -g @opencode/cli@2
hash -r
opencode --version
```

If npm reports an `allow-scripts` warning for `@opencode/cli`, allow only that
package's installation script for this invocation:

```bash
npm install -g @opencode/cli@2 --allow-scripts=@opencode/cli
hash -r
opencode --version
```

The postinstall script selects the native Linux executable. A permanent
`npm config set allow-scripts` setting or permission for all scripts is not
needed. See the [official OpenCode installation guide](https://opencode.ai/docs/).

### Replace an existing npm-installed OpenCode V1

If `opencode --version` reports `1.x` and the old package is `opencode-ai`, this
is a major-version migration with a package-name change, not just an update of
the existing package. Save your sessions and back up your configuration first.
For example, **in WSL**:

```bash
config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
if [ -d "$config_dir" ]; then
  cp -a "$config_dir" "${config_dir}.backup-$(date +%Y%m%d-%H%M%S)"
fi

npm uninstall -g opencode-ai
npm install -g @opencode/cli@2
hash -r
opencode --version
```

Use the scoped `--allow-scripts` command above if npm requests it. For V1
installations managed by another package manager, follow the
[official V1-to-V2 migration guide](https://opencode.ai/docs/migrate-v1) instead.
Keep copies of relevant project-local definitions too. Existing supported
configuration is intended to remain compatible, but V1 plugins need migration.
Verify your providers and integrations in V2 before relying on them. None of
these Linux commands changes Windows OpenCode.

## 2. Install the WSL collector from Windows

Open a **Windows PowerShell** terminal in the repository's `host/` directory.
Use a separate terminal if the Windows bridge is already running. Do not run
these commands with Linux npm against the Windows checkout's `node_modules`.

```powershell
npm run build
npm run install:wsl -- --distribution Ubuntu
```

If host dependencies have not been installed in this checkout, run `npm install`
in Windows first, as described in the host guide. The build is required because
the installer deploys the compiled collector, not the TypeScript source.

The installer:

1. Checks for native OpenCode V2 and a working systemd user manager in WSL.
2. Copies the compiled runtime to the Linux user's data directory.
3. Installs only the locked JavaScript OpenCode client dependency there. It does
   not reuse Windows `node_modules` or install serial/BLE dependencies in WSL.
4. Creates a managed `opencode-status-collector.service` user unit with the
   detected Linux executable paths.
5. Enables **lingering** so the user manager starts when the distribution boots,
   without requiring an interactive login.
6. Enables and immediately starts the collector service.

If enabling lingering is blocked by local policy, run **in WSL**:

```bash
sudo loginctl enable-linger "$USER"
```

Then rerun the installer **from Windows**. Do not run the whole installer as root.
It refuses to overwrite an existing unmanaged unit or unrecognized installation.
Repeat this step with another distribution name only if you also want to observe
that distribution.

## 3. Verify the service and restart the Windows bridge

**WSL:**

```bash
systemctl --user is-enabled opencode-status-collector.service
systemctl --user is-active opencode-status-collector.service
loginctl show-user "$USER" --property=Linger
```

The results should be `enabled`, `active`, and `Linger=yes` respectively. To
inspect details or recent collector diagnostics:

```bash
systemctl --user status opencode-status-collector.service
journalctl --user -u opencode-status-collector.service -n 30 --no-pager
```

If the Windows bridge was running during installation or an update, stop that
process with `Ctrl+C`. Then start **one** bridge, from `host/` in **Windows
PowerShell**, using your usual transport settings:

```powershell
npm run dev
```

For a compiled run, use `npm start` after the build instead. There must not be a
second hardware bridge in WSL. This setup does **not** configure Windows autostart;
the Windows bridge still needs to be started manually.

## 4. Start a genuinely native WSL session and test the display

In VS Code, select a WSL/Ubuntu terminal or open a remote WSL window. Check the
terminal itself; the workspace path alone is not enough.

> [!IMPORTANT]
> PowerShell at `PS ...\\wsl.localhost\Ubuntu\...>` still runs Windows processes.
> OpenCode launched there is Windows OpenCode, even though its project files are
> in Linux. It is not a test of the native WSL collector.

**In a native WSL terminal, inside your project directory:**

```bash
uname -s
opencode
```

Confirm `Linux`, then start a normal OpenCode task. In another WSL terminal,
`opencode service status` should now show a running service endpoint. The collector
discovers that service automatically; no manual collector start is needed.

For a clear first display test, leave Windows OpenCode sessions idle so their
states do not mask WSL. The merged priority is:

```text
ERROR > ASKING > RUNNING > FINISHED > IDLE > OFF
```

After the WSL-only test, try independent tasks in both environments. A Windows
completion must not hide a still-running WSL task; a request for input in either
environment takes priority over `RUNNING`. The collector observes the shared
local service, not `--standalone` or unrelated remote servers.

## What starts automatically

| Component | Behavior |
|---|---|
| WSL distribution | This setup does not start WSL at Windows login. Start the distribution normally. |
| WSL collector | Starts with its configured distribution through the enabled user service and lingering. |
| Native OpenCode service | Starts/discovers normally when you use OpenCode. The collector does not start it just because WSL boots. |
| Windows hardware bridge | Remains manually started. Must run for either environment to reach the display. |

The collector can run before or after the Windows bridge. Systemd services alone
do not keep a WSL instance alive. When a distribution stops unexpectedly, its
relay expires after ten seconds, plus the bridge's polling delay; Windows state
is unaffected. `FINISHED` has its own deadline so it cannot remain stuck.

To check boot autostart, verify the service commands in step 3 after your next
normal distribution restart. If testing immediately, save and stop all work in
that distribution before terminating/restarting it. Avoid a blanket
`wsl --shutdown` while other WSL or Docker workloads are active.

## Installed files and relay directory

| Location | Purpose |
|---|---|
| `${XDG_DATA_HOME:-$HOME/.local/share}/opencode-status-collector/` in WSL | Collector runtime and its separate JavaScript dependencies |
| `${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/opencode-status-collector.service` in WSL | Generated user service unit |
| `%LOCALAPPDATA%\OpenCodeStatus\sources\` on Windows | One reduced status file per configured distribution |

The generated executable paths and service configuration are local to the
machine and are not committed. The Windows bridge reads local files; it does
not invoke WSL to discover or wake stopped distributions. Invalid, missing,
disconnected, or stale relay files are ignored independently of other sources.

For a different relay directory, set `OPENCODE_STATUS_RELAY_DIR` in Windows
before both installation and Windows bridge startup. Use the same setting in
both terminals. The installer records the corresponding mounted path in the
Linux service. Prefer the default or another local Windows directory, not a
`\\wsl.localhost\...` path that would depend on the distribution being available.

## Update, restart, or disable

After updating collector code, rebuild and rerun **from `host/` in Windows**:

```powershell
npm run build
npm run install:wsl -- --distribution Ubuntu
```

Restart the Windows bridge too if its code changed. The installed Linux runtime
is a copy, so rebuilding the repository alone does not update it. Rerun the
installer after moving/removing Node.js or OpenCode, such as switching nvm
versions, to refresh the executable paths. Use your normal Linux user.

**WSL, restart only the collector:**

```bash
systemctl --user restart opencode-status-collector.service
```

**WSL, disable collector autostart and stop it now:**

```bash
systemctl --user disable --now opencode-status-collector.service
```

To re-enable it without reinstalling:

```bash
systemctl --user enable --now opencode-status-collector.service
```

Disabling leaves the installed files and lingering setting in place. Do not
disable lingering blindly: other enabled user services may rely on it too.

## Troubleshooting

| Symptom | Check or action |
|---|---|
| Installer reports a missing `dist` module or `collector.js` | Run `npm run build` in the Windows `host/` directory before installing. |
| `node`, `npm`, or `opencode` is not found in WSL | Install native Linux tools and check their availability in the normal user's interactive Bash login shell. Do not substitute Windows executables. |
| Collector requires OpenCode V2 | Check `opencode --version` inside WSL, not only in PowerShell; follow step 1 if it is still `1.x`. |
| npm reports `allow-scripts` for `@opencode/cli` | Use the scoped, one-invocation permission shown in step 1. |
| `systemctl --user` cannot connect or the target is inactive | Check systemd support and that you are using the intended non-root Linux user. |
| Collector is active but no OpenCode service is running | Expected before starting native OpenCode. Start `opencode` in WSL; inspect `opencode service status` there if needed. |
| Works manually but not after a distribution start | Check that the unit is `enabled` and `Linger=yes`, and inspect the user-service journal. |
| Collector fails after an nvm or OpenCode path change | Rebuild and rerun the installer to regenerate native executable paths. |
| WSL tasks do not change the display | Confirm a native Linux terminal, a running Windows bridge with current code, matching relay directories, and no higher-priority Windows session. |
| Installer refuses to overwrite an unmanaged unit | Inspect and back up the existing unit or installation; do not delete unrelated service files to bypass the guard. |

For OpenCode service diagnosis, see the
[official troubleshooting guide](https://opencode.ai/docs/troubleshooting).
Do not delete or edit OpenCode's service registration or database to repair the
collector. Do not share credentials, prompts, or private logs when reporting
problems.
