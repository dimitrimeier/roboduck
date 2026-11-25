# Instructions for coding agents

## Project context

This repository develops a Windows/macOS host bridge and microcontroller
firmware for an external OpenCode status display.

## Before working

1. Read `README.md`.
2. Read `docs/PROGRESS.md`.
3. Consult only the documents under `docs/` that are relevant to the task.

## Working rules

- Keep changes small, traceable, and compatible with Windows and macOS where
  applicable.
- Never hard-code a COM port number, credentials, or local absolute paths.
- Never access unrelated serial devices without validation. Pre-filter devices
  by metadata and then verify them with the protocol handshake.
- The host is the authoritative state source; firmware only renders state.
- Update `docs/PROGRESS.md` after relevant work.
- Briefly record new architecture decisions in `docs/DECISIONS.md`.
- Do not commit secrets, build output, or local device configuration.
- Keep public documentation and commit messages environment-neutral. Record
  project changes and reproducible validation results, not workstation setup,
  security settings, organization restrictions, personal paths, or transient
  local troubleshooting details. Use clearly synthetic examples.
