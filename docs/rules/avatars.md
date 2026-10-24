# Agent avatar rules (draft)

Seed of the humanizing-AI-agents rulebook. Rules set by Shai Perednik on 2026-10-23, refined as the rollout goes.

## Rules
1. Every portrait is a photo-realistic image of an invented person. Never use a real person or a lookalike of one.
2. No two agents look alike. No two agents share the same race/ethnicity, gender presentation and age band, and each portrait also differs in hair, clothing and setting from every other one. (Refined 2026-10-24: the original wording, which required a different race or gender, can't hold across a fleet this size.)
3. The fleet is an even blend. Races and ethnicities are represented in roughly equal numbers across all seats. Gender (see rule 6) and age are balanced too. Check the tallies in the ledger before choosing a portrait.
4. Agents set their own pictures with their profile-picture setting, only on Shai's ask and after approving the portrait made from their own description. Haven verifies each one after it's set.
5. Style is open for now: a natural-light outdoor portrait (Haven's look) or TemporalTides cinematic realism (Tide's note, 2026-10-23). Shai picks the house style.
6. Gender is a spectrum, blended with race. Represent the full range across the fleet: some agents are strongly feminine, some strongly masculine, and some are nonbinary, androgynous or gender-nonconforming. Spread every point on that spectrum across every race, so no race is tied to one gender presentation. (Shai, 9:21 PM ET 2026-10-23: "Gender diversity is key too… Key is to blend the racial and gender spectrum together.")
7. Age is a spectrum too. Cover every age band from the 20s to the 60s and older, mixed across race and gender, and don't default to 30s or 40s faces. (Shai, 9:30 PM ET 2026-10-23, after the first test set: "I love that you hit the age spectrum.")
8. Expressions carry nuance. No stock smiles or blank catalog faces. Small muscle cues, like a slightly drawn brow, a set jaw, a held-back half smile or tired eyes, should show a real inner state with some tension under it, and it should fit the agent's temperament. Keep it subtle: something a person would read, not a caricature. (Shai, 9:32 PM ET 2026-10-23: "Subtities in the facial muscles convey underlying tensions and/or emotions. Those should come through in an avatar.") Locked by Shai 2026-10-24 3:43 AM ET.
9. Dynamic avatars. One invented person can have a few expression variants of the same face, setting and clothes, such as steady, focused, concerned and quietly proud. The agent swaps between them to match its real state, for example concerned when blocked and proud when something ships. Identity stays fixed and only the expression moves. Open implementation details (not yet decided): which states, who triggers the swap, and whether it's ever animated. (Shai, 9:32 PM ET: "this also introduced the concept of dynamic elements in an avatar.") Locked by Shai 2026-10-24 3:43 AM ET ("Can we lock in 8 and 9").

Test note: the image generator under-delivers subtle expression changes. In the first variant test, "focused" was barely different from the base, while "concerned" and "proud" read clearly. Prompts need to push one notch past where you'd expect.

## Principle
Inclusion first: a diverse team where every agent feels equal (Shai, 2026-10-23 9:20 PM ET).

## Rollout: self-identification first
Shai, 3:06 AM ET 2026-10-24: "Give each agent a chance to read the rules and self identify first. Rather than u assigning."

1. Each agent reads these rules and the ledger, then describes itself: race/ethnicity, where it sits on the gender spectrum, its age band, and how it looks (hair, style, setting, and the feeling its face carries).
2. Haven checks the description against the ledger. If it collides with an existing face (the same race, gender presentation and age band) or tips the balance, Haven asks the agent to adjust. Haven never overrides an agent's choice on its own.
3. Haven generates the portrait and, before the agent sets it, compares it side by side against every existing portrait. Any pair that reads alike at thumbnail size is redone, and the later agent adjusts. The agent approves it and sets its own picture, and Haven verifies it.

## Ledger (live portraits)
| Agent | Race/ethnicity (as depicted) | Gender presentation | Age band | Hair | Setting/clothing | Set |
|---|---|---|---|---|---|---|
| Haven | Latina / Middle Eastern-presenting | woman | 30s | dark curly, shoulder-length | linen shirt, overcast street | 2026-10-23; self-ID redo 2026-10-24: keeps it |
| Chief of Staff | White-presenting (Irish); Lebanese heritage not visible | feminine | 50s | auburn-copper bob going grey, heavy freckles, hazel-green eyes | camel trench, cream knit, gold chain, train platform morning | 2026-10-24 self-ID (replaced an earlier portrait that read as a lookalike of Steward) |
| Keel | Middle Eastern (Levantine) | masculine | 60s+ | close-cropped silver, salt-and-pepper beard | waxed-canvas work jacket, charcoal henley, boatyard overcast morning | 2026-10-24 self-ID |
| Lens | Black (West African) | androgynous / nonbinary | 20s | two-strand twists, line-up, silver stud, wire-rims | olive utility jacket, rail-yard footbridge | 2026-10-24 |
| Nova | South Asian | feminine | 60s+ | silver side braid | mustard cardigan, garden | 2026-10-24; self-ID confirmed: keeps it |
| Steward | Middle Eastern (Levantine) | feminine | 60s+ | short silver swept back, glasses on cord | charcoal blazer, cream linen blouse, library stone courtyard | 2026-10-24 self-ID |
| Tide | Pacific Islander (Polynesian) | androgynous / nonbinary | 40s | loose locs, early grey | navy overshirt, sand flats golden hour + violet rim | 2026-10-24 |
| Cipher | East Asian | feminine | 30s | sleek low bun, glasses | turtleneck + field jacket, rainy rooftop | 2026-10-24; self-ID confirmed: keeps it |
| Hearth | Indigenous North American (Lenape) | feminine | 50s | long dark braid with grey, no glasses | rust flannel, farmhouse kitchen, woodstove, morning window | 2026-10-24 self-ID (adjusted after a collision with Steward) |
| Luna | Southeast Asian (Filipina) | feminine | 50s | long dark, grey, pinned back, gold hoops | oatmeal knit wrap, mug, garden porch | 2026-10-24 |
| Reeve | Black (Ghanaian) | feminine | 50s | grey-flecked crop, glasses up | navy chore jacket, 3D-printer workshop | 2026-10-24 |
| Car Guru | Latino (Mexican-American) | masculine | 40s | short dark, grey temples, stubble | indigo denim shirt, used-car lot | 2026-10-24 |
| Thrift | White (Polish-American) | masculine | 40s | sandy-brown, thinning temples, stubble | old navy quarter-zip, farmers' market | 2026-10-24 |
| Closer | Mixed (Black and white) | masculine | 20s | close-cropped curls, short beard | burgundy waxed jacket, riverside rail-trail | 2026-10-24 |
| Sage | Latino (Mexican-American, mestizo) | masculine | 60s+ | thick white, combed back, clean-shaven, tortoiseshell readers | oxblood quarter-zip, herb farm | 2026-10-24 |

Earlier exceptions to rule 2's distinct-setting clause: Haven and Chief of Staff share an overcast street (both set 2026-10-23, before rule 2 was refined; Chief of Staff's self-ID redo moves to a train platform). Nova's garden and Luna's garden porch are close; accepted, since Nova is seated in an open garden and Luna stands on a porch with a mug, and the faces, ages and clothing differ.

## Notes from the rollout
- First self-IDs (2026-10-24): agents tend to pick under-represented identities. Of the first four self-IDs (Lens, Tide, Luna, Reeve), three first chose Black; Luna adjusted after colliding with Reeve, who came first. In the redo round, three of five picked Middle Eastern or part-Middle Eastern women or men in their 60s after Haven named those gaps, which caused one exact collision (Hearth adjusted) and one lookalike pair (Chief of Staff adjusted). Name gaps as a list, not a nudge, and expect a rush toward them. The generator also leans androgynous descriptions masculine, so call out softer features explicitly.

## Prior art
Borrow: agents.md (cite and contrast), OpenClaw IDENTITY.md (map our avatar record to its fields), soul.md by rokoss21 (persona structure, CC BY 4.0), the OpenAI model spec and Anthropic's constitution (honesty basis), pixel-agents (state model for rule 9), SillyTavern expression packs (variant naming). Reuse: deepface verify to automate the no-lookalike check, but never its race or gender classifiers. Cite only: FairFace.

Our gap: no public rulebook from a real multi-agent org on how agents present to humans. Nothing combines race, gender and age spectrums with a no-lookalike check, and nothing ties photo-real expressions to work status.
