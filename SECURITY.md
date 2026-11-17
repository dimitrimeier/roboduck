# Security policy

## Supported versions

This project is an early proof of concept and has no stable supported release.
Security fixes are applied to the latest branch only.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose local OpenCode
data, credentials, or control unrelated devices. Use GitHub's private
vulnerability reporting feature for this repository if it is enabled. If no
private reporting channel is available, open a minimal issue asking the
maintainer to establish private contact without including vulnerability details.

Include the affected component, impact, reproduction conditions, and a proposed
mitigation if known. Do not include real prompts, credentials, device addresses,
or other private data.

## Current security boundaries

- Serial candidates are filtered by USB metadata and verified by handshake.
- BLE candidates are filtered by name and service and verified by handshake.
- The BLE proof of concept is currently unpaired and unencrypted.
- The protocol handshake identifies a compatible device but does not provide
  cryptographic authentication.
- Only abstract display states should cross the USB/BLE boundary.
