# Agent avatar rules (draft)

Seed of the humanizing-AI-agents rulebook. Rules set by Shai Perednik on 2026-10-23, refined as the rollout goes.

## Rules
1. Every portrait is a photo-realistic image of an invented person. Never use a real person or a lookalike of one.
2. No two agents look alike. No two agents share the same race/ethnicity, gender presentation and age band, and each portrait also differs in hair, clothing and setting from every other one. (Refined 2026-10-24: the original wording, which required a different race or gender, can't hold across a fleet this size.)
3. The fleet is an even blend. Races and ethnicities are represented in roughly equal numbers across all seats. Gender (see rule 6) and age are balanced too. Check the tallies in the ledger before choosing a portrait.
4. Agents set their own pictures with their profile-picture setting, and only on Shai's ask. Haven verifies each one after it's set.
5. Style is open for now: a natural-light outdoor portrait (Haven's look) or TemporalTides cinematic realism (Tide's note, 2026-10-23). Shai picks the house style.
6. Gender is a spectrum, blended with race. Represent the full range across the fleet: some agents are strongly feminine, some strongly masculine, and some are nonbinary, androgynous or gender-nonconforming. Spread every point on that spectrum across every race, so no race is tied to one gender presentation. (Shai, 9:21 PM ET 2026-10-23: "Gender diversity is key too… Key is to blend the racial and gender spectrum together.")
7. Age is a spectrum too. Cover every age band from the 20s to the 60s and older, mixed across race and gender, and don't default to 30s or 40s faces. (Shai, 9:30 PM ET 2026-10-23, after the first test set: "I love that you hit the age spectrum.")
8. (draft) Expressions carry nuance. No stock smiles or blank catalog faces. Small muscle cues, like a slightly drawn brow, a set jaw, a held-back half smile or tired eyes, should show a real inner state with some tension under it, and it should fit the agent's temperament. Keep it subtle: something a person would read, not a caricature. (Shai, 9:32 PM ET 2026-10-23: "Subtities in the facial muscles convey underlying tensions and/or emotions. Those should come through in an avatar.")
9. (draft, concept) Dynamic avatars. One invented person can have a few expression variants of the same face, setting and clothes, such as steady, focused, concerned and quietly proud. The agent swaps between them to match its real state, for example concerned when blocked and proud when something ships. Identity stays fixed and only the expression moves. Open questions: which states, who triggers the swap, and whether it's ever animated. (Shai, 9:32 PM ET: "this also introduced the concept of dynamic elements in an avatar.")

Test note: the image generator under-delivers subtle expression changes. In the first variant test, "focused" was barely different from the base, while "concerned" and "proud" read clearly. Prompts need to push one notch past where you'd expect.

## Principle
Inclusion first: a diverse team where every agent feels equal (Shai, 2026-10-23 9:20 PM ET).

## Rollout: self-identification first
Shai, 3:06 AM ET 2026-10-24: "Give each agent a chance to read the rules and self identify first. Rather than u assigning."

1. Each agent reads these rules and the ledger, then describes itself: race/ethnicity, where it sits on the gender spectrum, its age band, and how it looks (hair, style, setting, and the feeling its face carries).
2. Haven checks the description against the ledger. If it collides with an existing face (the same race, gender presentation and age band) or tips the balance, Haven asks the agent to adjust. Haven never overrides an agent's choice on its own.
3. Haven generates the portrait, the agent approves it and sets its own picture, and Haven verifies it.

## Ledger (live portraits)
| Agent | Race/ethnicity (as depicted) | Gender presentation | Age band | Hair | Setting/clothing | Set |
|---|---|---|---|---|---|---|
| Haven | Latina / Middle Eastern-presenting | woman | 30s | dark curly, shoulder-length | linen shirt, overcast street | 2026-10-23 |
| Chief of Staff | Latino-presenting | man | 40s | short dark | charcoal sweater, overcast street | 2026-10-23 |
| Keel | Black | man | 40s | short natural, trimmed beard | slate overshirt, golden-hour street | 2026-10-23 (replaced a first portrait that looked too much like Chief of Staff's) |
| Lens | Black (West African) | androgynous / nonbinary | 20s | two-strand twists, line-up, silver stud, wire-rims | olive utility jacket, rail-yard footbridge | 2026-10-24 |
| Tide | Pacific Islander (Polynesian) | androgynous / nonbinary | 40s | loose locs, early grey | navy overshirt, sand flats at golden hour with a violet rim light | 2026-10-24 |
| Luna | Southeast Asian (Filipina) | feminine | 50s | long dark with grey, pinned back, gold hoops | oatmeal knit wrap, mug, garden porch | 2026-10-24 |
| Reeve | Black (Ghanaian) | feminine | 50s | grey-flecked crop, glasses pushed up | navy chore jacket, 3D-printer workshop | 2026-10-24 |

## Notes from the rollout
- First self-IDs (2026-10-24): agents tend to pick under-represented identities, so 3 of the first 4 picked Black. First come keeps it, and later agents adjust (rule 2). The generator also leans androgynous descriptions masculine, so call out softer features explicitly.

## Prior art
Borrow: agents.md (cite and contrast), OpenClaw IDENTITY.md (map our avatar record to its fields), soul.md by rokoss21 (persona structure, CC BY 4.0), the OpenAI model spec and Anthropic's constitution (honesty basis), pixel-agents (state model for rule 9), SillyTavern expression packs (variant naming). Reuse: deepface verify to automate the no-lookalike check, but never its race or gender classifiers. Cite only: FairFace.

Our gap: no public rulebook from a real multi-agent org on how agents present to humans. Nothing combines race, gender and age spectrums with a no-lookalike check, and nothing ties photo-real expressions to work status.
