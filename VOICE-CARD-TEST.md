# Mama Said voice card assistant — isolated test

Branch: `test/mama-voice-card-guide-2026-11-10`. This branch is **not published** and does not modify `main`.

## Customer choices

- **Guide me:** `get_card_options` retrieves the real library; `guide_card_step` takes the customer to Picture, Words, Sound, or Send and explains that step without changing card content.
- **Do it for me:** `select_card_style`, `select_card_picture`, and `write_card_message` use existing card-builder functionality; the browser asks the customer for confirmation before any change.
- Pictures and styles are restricted to the available catalog. No fabricated items.
- Personal image and music files must be uploaded by the customer. No file access, music generation, automatic sending, or external services.
- This is a **technical test**, not a finished production feature. Browser confirm prompts and exact-match picture names are deliberately conservative.

## ElevenLabs configuration still required before testing

An ElevenLabs agent administrator would need to create matching **Client** tools with identical case-sensitive names and parameters, set **Wait for response** on, and refine the agent instructions to ask whether the customer wants guidance or direct edits. Do **not** enable on the live agent without separate approval or a safe agent test setup.

Suggested Client tool definitions:
- `get_card_options`: no parameters; returns the available catalog.
- `guide_card_step`: required string `step` (Picture, Words, Sound, Send).
- `select_card_style`: required string `style` (exact style name or ID).
- `select_card_picture`: required string `picture` (exact catalog picture name).
- `write_card_message`: required string `message` (1–500 characters).

Agent instructions to evaluate: Ask the visitor which mode they prefer. In **guide** mode, explain and navigate without editing. In **do** mode, first retrieve the catalog, propose an available option, confirm with the visitor, then request the tool. Browser confirmation is additionally required. Never claim to access device files or send cards.

## Verification required before release

- Check JavaScript syntax and load the isolated preview.
- Confirm the browser SDK supports the registered Client tools and returns tool responses.
- Test no-tool paths, declined permissions, canceled edits, invalid options, picture-load failures, mobile confirmation dialogs, and status updates.
- Revisit usability of repeated browser confirmations and decide if a card-level approval panel is preferable.
- Check privacy and cost impact of any actual voice sessions.
- Keep `main` unchanged until explicit review and approval.
