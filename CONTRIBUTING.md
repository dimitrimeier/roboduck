# Contributing

This project is still a hardware proof of concept. Small bug reports, focused
pull requests, and reproducible test results are welcome, but no contribution
license has been selected yet. Discuss substantial work in an issue before
starting it.

## Development setup

See [host/README.md](host/README.md) and
[firmware/README.md](firmware/README.md) for platform and toolchain details.

Before submitting host changes, run:

```sh
cd host
npm ci
npm test
npm run check
npm run build
```

For Go changes, run tests in the affected module:

```sh
go test ./...
```

## Safety and privacy

- Never commit credentials, local configuration, logs, build output, device
  addresses, or absolute user paths.
- Never hard-code a COM port or BLE address.
- Do not probe unrelated serial devices. Pre-filter by metadata and require the
  protocol handshake before sending commands.
- Do not add prompts, file contents, form contents, or provider data to logs or
  fixtures.
- Keep the host as the authoritative state source.
- Document relevant progress and architecture decisions.

## Pull requests

- Keep changes focused and explain any hardware assumptions.
- Add or update automated tests where practical.
- State which operating systems and physical devices were tested.
- Do not claim physical validation when only simulation was performed.
