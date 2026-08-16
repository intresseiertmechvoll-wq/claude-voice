## What changed

Describe the user-visible behavior and the smallest implementation boundary.

## Why

Explain the problem this solves and any relevant issue.

## Validation

- [ ] `ruff check .`
- [ ] `pytest -q`
- [ ] `python -m compileall -q claude_voice.py speak.py tests`
- [ ] Manual audio or terminal checks are described when behavior depends on real hardware.

## Privacy and compatibility

- [ ] No credentials, private transcripts, generated audio, or machine-specific paths are committed.
- [ ] New persistence or cloud egress is opt-in and documented.
- [ ] macOS and Linux behavior were considered, or the platform limit is explicit.
