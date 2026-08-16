# Contributing to claude-voice

Focused bug fixes, tests, provider improvements, terminal compatibility work, and accessibility improvements are welcome.

## Development setup

```bash
python3 -m venv .venv
.venv/bin/pip install -e . pytest ruff
.venv/bin/ruff check .
.venv/bin/pytest -q
.venv/bin/python -m compileall -q claude_voice.py speak.py tests
```

The test suite must run without cloud credentials, Kokoro model downloads, or a real audio device. Keep hardware-dependent checks separate and describe what you tested manually.

## Pull requests

- Keep each pull request centered on one user-visible problem.
- Add regression coverage for changed daemon, routing, parsing, history, or provider behavior.
- Preserve local-first defaults. New persistence and cloud egress must be explicit, opt-in, and documented.
- Never include API keys, private transcripts, generated audio, or machine-specific paths in commits or diagnostics.
- Pass text and subprocess arguments as data. Do not introduce shell interpolation for assistant, clipboard, transcript, history, provider, or configuration input.

Before a large refactor of `claude_voice.py`, open an issue describing the boundary and migration plan. The single-file runtime is deliberate today, even though smaller testable components may become appropriate.
