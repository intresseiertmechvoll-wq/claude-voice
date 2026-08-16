# Security policy

## Supported versions

Security fixes target the latest commit on `main` and the newest GitHub release.

## Reporting a vulnerability

Do not open a public issue with exploit details, credentials, private transcripts, or private paths.

Use GitHub's private **Report a vulnerability** flow on the repository Security tab when it is available. If the private form is unavailable, contact [@Null-Phnix](https://github.com/Null-Phnix) first to arrange a private channel. Include the affected version, realistic attack path, impact, and the smallest safe reproduction. Use synthetic text and placeholder credentials.

You should receive an acknowledgement within seven days. Coordinated disclosure timing will depend on validation, a tested fix, and release availability.

## Security boundaries

claude-voice is a local CLI and Claude Code hook, not a remote service. Important boundaries include:

- provider API keys in the environment or mode `0600` config file;
- assistant, transcript, clipboard, and opt-in history text;
- the mode `0600` Unix-domain daemon socket;
- optional HTTPS egress to configured speech providers;
- local Hammerspoon and Raycast integrations.

New text persistence and provider egress must be explicit and safe by default. Assistant, clipboard, transcript, history, and configuration content must never become shell or webview code.
