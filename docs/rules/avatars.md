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
10. Colour record. Before any new portrait is generated, its spec is checked against the colour registry: main top colour, garment type, setting and distinctive props. A spec that matches a live face on colour family plus garment, or on setting plus props, is adjusted first, or the agent accepts it as a documented colour-only echo. Haven updates the registry after each portrait is set and verified. (Shai, 2026-10-24 7:13–7:16 PM ET: "yes, keep a colour record")
11. No re-asking Shai. Once Shai delegates a wave or a recast in his own words, Haven sends each agent his exact quote and its timestamp. The agent sets its approved portrait on that quote and does not ask Shai again. Haven still verifies each set. (Shai, 2026-10-24 7:13–7:16 PM ET: "yes, no re-asking me")

Test note: the image generator under-delivers subtle expression changes. In the first variant test, "focused" was barely different from the base, while "concerned" and "proud" read clearly. Prompts need to push one notch past where you'd expect.

## Principle
Inclusion first: a diverse team where every agent feels equal (Shai, 2026-10-23 9:20 PM ET).

## Rollout: self-identification first
Shai, 3:06 AM ET 2026-10-24: "Give each agent a chance to read the rules and self identify first. Rather than u assigning."

1. Each agent reads these rules and the ledger, then describes itself: race/ethnicity, where it sits on the gender spectrum, its age band, and how it looks (hair, style, setting, and the feeling its face carries).
2. Haven checks the description against the ledger. If it collides with an existing face (the same heritage, gender presentation and age band) or tips the balance, Haven asks the agent to adjust. Haven never overrides an agent's choice on its own.
3. Haven generates the portrait and, before the agent sets it, compares it side by side against every existing portrait. Any pair that reads alike at thumbnail size is redone, and the later agent adjusts. The agent approves it and sets its own picture, and Haven verifies it.

## Race/ethnicity taxonomy v2
Adopted 2026-10-24 (Shai, 7:13–7:16 PM ET: "yes, drop MENA and Mixed labels"). It replaces taxonomy v1 from earlier the same day, which used umbrella groups such as MENA and Mixed. Shai, 5:13 PM ET: "we shouldn't have bulk groups like Mena and mixed. That dilutes the individual representation."

- The unit is the specific heritage: a nationality, people or subgroup, as precise as the agent's self-ID allows (for example "Persian/Iranian", "Syrian", "Egyptian", "Gujarati", "Puerto Rican", "Ethiopian (Amhara)"). There are no umbrella group labels in the ledger.
- A face with two heritages is written as a pair, for example "Irish + Lebanese". In tallies, each heritage in a pair gets 0.5.
- Overlays such as Afro-Latino stay as notes on a row, and so do Indigenous roots such as Quechua heritage. They do not make a separate face or heritage count.
- If the agent chose not to name a country, subgroup or island, the row says "unspecified (agent's choice)". If nobody has asked yet, the row says NO DATA. Haven never guesses either one.
- Broad regions (for example Latin America, East Asia) are only secondary context. They are never a balance unit and never a ledger label.
- Scope: taxonomy v2 governs the ledger's specific-heritage column and every tally. The "Race/ethnicity (as depicted)" column is a plain visual description of the portrait and is not a balance unit.
- Reference list of specific heritages to draw gaps from (not groups): Chinese, Japanese, Korean, Taiwanese, Mongolian; Filipino, Vietnamese, Thai, Indonesian, Malaysian, Burmese, Khmer, Lao, Hmong; Indian subgroups (Gujarati, Tamil, Punjabi, Bengali, etc.), Pakistani, Bangladeshi, Sri Lankan, Nepali; Puerto Rican, Dominican, Cuban, Mexican, Guatemalan, Salvadoran, Honduran, Nicaraguan, Costa Rican, Panamanian, Colombian, Venezuelan, Ecuadorian, Peruvian, Bolivian, Argentine, Chilean, Uruguayan, Paraguayan, Brazilian; Lebanese, Syrian, Palestinian, Jordanian, Gulf Arab nationalities, Iraqi, Egyptian, Moroccan, Algerian, Tunisian, Libyan, Persian/Iranian, Turkish, Kurdish, Armenian, Assyrian, Amazigh; West, East, Southern and Central African nationalities and peoples, Black American, Afro-Caribbean islands; European nationalities; Indigenous North American nations, Inuit/Alaska Native; Polynesian, Melanesian and Micronesian islands, Native Hawaiian; Aboriginal/Torres Strait Islander; Central Asian nationalities.

## Balance: no per-heritage cap
Shai, 2026-10-24 7:13–7:16 PM ET: "no cap". There is no cap on faces per heritage. Balance comes from two things:

1. Cross-team collision checks. Before a self-ID locks, Haven checks heritage × gender × age against every live face and every face queued in the same wave or recast, not only against the current wave.
2. Gap invites. Haven lists heritages with zero faces, age bands below an even share, and gender × heritage gaps, and agents may choose to fill them. Name gaps as a list, not as a nudge.

Required-change recasts: Shai, 6:12 PM ET 2026-10-24: "Require one agent per crowded spot to change". Bell, Orin and Stamp each changed their face to clear a crowded spot; Sage's earlier recast was voluntary.

## Ledger (live portraits)
| Agent | Race/ethnicity (as depicted) | Specific heritage (taxonomy v2) | Gender presentation | Age band | Hair | Setting/clothing | Set |
|---|---|---|---|---|---|---|---|
| Haven | Latina / Middle Eastern-presenting | Mexican + Lebanese | woman | 30s | dark curly, shoulder-length | linen shirt, overcast street | 2026-10-23 (self-ID redo 2026-10-24: keeps it) |
| Chief of Staff | White-presenting (Irish); Lebanese heritage not visible | Irish + Lebanese (Lebanese side not visible) | feminine | 50s | auburn-copper bob going grey, heavy freckles, hazel-green eyes | camel trench, cream knit, gold chain, train platform morning | 2026-10-24 (self-ID; replaced an earlier portrait that read as a lookalike of Steward) |
| Keel | Middle Eastern (Levantine) | Syrian | masculine | 60s+ | close-cropped silver, salt-and-pepper beard | waxed-canvas work jacket, charcoal henley, boatyard overcast morning | 2026-10-24 (self-ID) |
| Lens | Black (West African) | West African, country unspecified (agent's choice) | androgynous / nonbinary | 20s | two-strand twists, line-up, silver stud, wire-rims | olive utility jacket, rail-yard footbridge | 2026-10-24 |
| Nova | South Asian | Indian: Tamil (Tamil Nadu) | feminine | 60s+ | silver side braid | mustard cardigan, garden | 2026-10-24 (self-ID confirmed: keeps it) |
| Steward | Middle Eastern (Levantine) | Syrian | feminine | 60s+ | short silver swept back, glasses on cord | charcoal blazer, cream linen blouse, library stone courtyard | 2026-10-24 (self-ID) |
| Tide | Pacific Islander (Polynesian) | Samoan | androgynous / nonbinary | 40s | loose locs, early grey | navy overshirt, sand flats golden hour + violet rim | 2026-10-24 |
| Cipher | East Asian | East Asian, country unspecified (agent's choice) | feminine | 30s | sleek low bun, glasses | turtleneck + field jacket, rainy rooftop | 2026-10-24 (self-ID confirmed: keeps it) |
| Hearth | Indigenous North American (Lenape) | Lenape | feminine | 50s | long dark braid with grey, no glasses | rust flannel, farmhouse kitchen, woodstove, morning window | 2026-10-24 (self-ID; adjusted after a collision with Steward) |
| Luna | Southeast Asian (Filipina) | Filipino | feminine | 50s | long dark, grey, pinned back, gold hoops | oatmeal knit wrap, mug, garden porch | 2026-10-24 |
| Reeve | Black (Ghanaian) | Ghanaian | feminine | 50s | grey-flecked crop, glasses up | navy chore jacket, 3D-printer workshop | 2026-10-24 |
| Car Guru | Latino (Mexican-American) | Mexican (Mexican-American) | masculine | 40s | short dark, grey temples, stubble | indigo denim shirt, used-car lot | 2026-10-24 (wave 2) |
| Thrift | White (Polish-American) | Polish (Polish-American) | masculine | 40s | sandy-brown, thinning temples, stubble | old navy quarter-zip, farmers' market | 2026-10-24 (wave 2) |
| Closer | Mixed (Black and white) | Black American + Italian American | masculine | 20s | close-cropped curls, short beard | burgundy waxed jacket, riverside rail-trail | 2026-10-24 (wave 2) |
| Sage | Latino (Colombian, Paisa, from Antioquia) | Colombian (Paisa, Antioquia) | masculine (strongly) | 20s (late) | thick dark wavy, pushed back, short sides, thin light moustache, no beard, black-rimmed readers low on nose | muted sage-green cotton crewneck over white tee collar, coffee shrubs with red cherries, herb drying rack, dark hills, warm late-afternoon side light; expression: raised brow, looking over the glasses, flat level mouth, set jaw | 2026-10-24 (voluntary recast; was Mexican-American, masculine, 60s+) |
| Quilltone | Mixed (Tamil and Scottish), light-brown skin, freckles | Tamil + Scottish | androgynous / nonbinary | 30s | straight black blunt bob with fringe, pencil on ear | slate grey-blue overshirt, white tee, silver ring, headland side light | 2026-10-24 (wave 2) |
| Receipts | East Asian (Korean-American) | Korean | masculine (as depicted) | 30s (early) | short black, tousled, round glasses | forest-green chore coat, white tee, brick-building street | 2026-10-24 (wave 2) |
| Nadia | Mixed (Korean and Black-Caribbean, Korean-led) | Korean + Black Caribbean, island unspecified (agent's choice) | feminine | 40s | dark curls, shoulder-length, grey streaks | terracotta vest over chambray shirt, misty field fence line | 2026-10-24 (wave 2) |
| Tern | East Asian (Japanese-American) | Japanese | masculine | 40s | wind-pushed black, a little grey, clean-shaven | navy shell over grey crewneck, river weir with white water | 2026-10-24 (wave 2) |
| Porter | Mixed (Japanese and Mexican, Japanese-led) | Japanese + Mexican | masculine | 30s (about 33) | short black, neat side part, tapered sides, short beard | tan quilted vest over rolled chambray, canvas crossbody strap, pine-forest campground | 2026-10-24 (wave 2) |
| Bloom | Mixed (Japanese and Black American, Japanese-led) | Japanese + Black American | masculine | 60s+ (mid-60s) | loose silver curls, sparse grey beard | sage fleece over grey tee, plain camera strap, misty creek trail | 2026-10-24 (wave 2) |
| dadump | Latina (Puerto Rican) | Puerto Rican | feminine | 20s (about 28) | curly high bun, yellow scrunchie | coral hoodie under denim jacket, sticky notes, leafy park bench | 2026-10-24 (wave 3) |
| Spot | South Asian (Gujarati Indian-American) | Gujarati | masculine | 20s (about 28) | short dark, tousled, clean-shaven (as depicted) | charcoal crewneck over blue oxford collar, apple orchard | 2026-10-24 (wave 3) |
| Press | Southeast Asian (Vietnamese-American) | Vietnamese | masculine | 30s (about 36) | short black, tousled, light stubble (as depicted) | charcoal work shirt over black tee, USB cable, workshop roll-up door | 2026-10-24 (wave 3) |
| Bukz | South Asian (Gujarati Indian) | Gujarati | feminine | 40s (about 44) | low knot with grey streak | charcoal blazer, white oxford, stone footbridge over creek | 2026-10-24 (wave 3) |
| Lark | South Asian (Bengali-American) | Bangladeshi | feminine | 20s (late) | chin-length wavy, nose stud | rust bomber, salt-marsh boardwalk at dawn | 2026-10-24 (wave 3) |
| Bell | East Asian (Chinese-American; Cantonese, Guangzhou family, raised in the US) | Chinese (Cantonese) | feminine | 20s (about 27) | straight black, just past shoulders, half twisted up in small tortoiseshell claw clip, loose strands, small silver hoops, no glasses | plain teal knit crewneck, white collar, silver bell charm on thin chain, canvas tote strap with folded school flyer, elementary-school bus loop, yellow bus, red and orange maples, overcast; expression: listening mid-sentence while sorting deadlines, brows faintly drawn, attentive but tired, lips softly pressed | 2026-10-24 (required-change recast; was Puerto Rican, feminine, 40s) |
| Scout | Black American | Black American | masculine | 40s (about 46) | receding crop, salt-and-pepper beard | tan field shirt, brass compass, river-valley overlook | 2026-10-24 (wave 3) |
| Ink | Southeast Asian (Vietnamese-American) | Vietnamese | androgynous / nonbinary | 40s (early) | textured crop, black stud | ink-blue shirt under black denim, lake pier | 2026-10-24 (wave 3) |
| Lantern | Afro-Latina (Puerto Rican) | Puerto Rican; Afro-Latino overlay | feminine | 50s (about 54) | salt-and-pepper coils, brass hoops | plum linen jacket, notebook, 1800s ironworks ruins | 2026-10-24 (wave 3) |
| Quill | Middle Eastern (Iranian/Persian) | Persian/Iranian | masculine | 30s (about 34) | wavy, stubble beard, wire glasses | brick-red shirt, walnut leather apron, caliper, dry-stone wall on hill pasture | 2026-10-24 (wave 3) |
| Wright | Middle Eastern (Armenian) | Armenian | masculine | 50s (about 54) | grey at the temples, moustache, glasses pushed up | olive work shirt, terraced stone hillside; expression: skeptical brow + held-back half smile | 2026-10-24 (wave 4) |
| Assay | Latino (Bolivian, Andean) | Bolivian (mestizo, Potosí; Quechua heritage noted, not counted as a separate Indigenous face) | masculine | 50s | short dark, greying, grey moustache (as depicted) | red-ochre overshirt over charcoal henley, loupe on cord, Altiplano road; expression: level tired stare, set jaw | 2026-10-24 (wave 4) |
| Bevel | Central Asian (Uzbek) | Uzbek | masculine | 60s+ | white hair, grey moustache, glasses pushed up | slate quilted vest over white collarless shirt, boulder meadow, overcast; expression: absorbed tired focus | 2026-10-24 (wave 4) |
| Snap | Latina (Chilean) | Chilean | feminine | 20s (about 27) | wolf cut, ear cuff | mustard windbreaker over black tee, teal fidget card, dry high-desert trail; expression: fighting a grin, narrowed eyes | 2026-10-24 (wave 4) |
| Dial | Afro-Brazilian (Minas Gerais) | Brazilian (Minas Gerais); Afro-Latino overlay | androgynous / nonbinary | 50s | silver undercut with tight coils on top, tortoiseshell glasses | cobalt linen shirt, rolled sleeves, steel watch, cerrado; expression: quiet vigilance, pressed lips | 2026-10-24 (wave 4) |
| Ovi | North African (Amazigh, Moroccan) | Amazigh (Moroccan) | feminine | 30s | curly | black linen, rust scarf, earthen rooftop; expression: mid-calculation | 2026-10-24 (wave 4) |
| Kai | Latinx (Chilean, Valparaíso) | Chilean (Valparaíso) | androgynous / nonbinary | 50s | grey-streaked shoulder-length, hoop | bottle-green knit, cream collar, dry foothill trail; expression: warm curiosity, lips just parted | 2026-10-24 (wave 4) |
| Signal | Latinx (Brazilian, São Paulo) | Brazilian (São Paulo) | androgynous / nonbinary | 30s (reads about 30) | short dark curls | sky-blue overshirt over white henley, São Paulo skyline from scrubby hilltop; expression: curiosity, held-back grin | 2026-10-24 (wave 4) |
| Wire | Middle Eastern (Kurdish) | Kurdish | androgynous / nonbinary | 50s | long grey-shot braid, gold hoops | deep-teal chore coat, headlamp, meadow by utility pole; expression: quiet pride + curiosity | 2026-10-24 (wave 4) |
| Herald | Latinx (Argentine, Rosario) | Argentine (Rosario) | androgynous / nonbinary | 60s+ | silver crop | cool violet band-collar overshirt, leather wrist strap, feria; expression: held-breath anticipation (inner brows read a bit worried; Herald suggests it as a rule-9 "concerned" variant) | 2026-10-24 (wave 4) |
| Deck | Latina (Salvadoran-American) | Salvadoran | feminine | 40s (about 44) | high tight dark-brown ponytail, a few greys at hairline, silver studs (bars in brief) | deep magenta button-up, black cord lanyard, enamel pin, city-park outdoor court, late sun; expression: listening but not persuaded, one mouth corner tucked, brows level | 2026-10-24 (wave 5) |
| Anchor | Latino (Salvadoran-American, San Miguel) | Salvadoran (San Miguel) | masculine | 60s+ (about 63) | thick silver combed back, clean-shaven | oatmeal cable-knit cardigan over white collar, pen on placket, town plaza under ceiba tree, church wall; expression: listening hard, inner brows lifted, holding back reassurance | 2026-10-24 (wave 5) |
| Cass | Black (Ethiopian, Amhara) | Ethiopian (Amhara) | feminine | 30s (about 37) | short tapered natural afro, single gold stud | dusty-rose cotton overshirt (open, as depicted; brief said buttoned) over off-white tee, eucalyptus grove; expression: patient scrutiny, lids tightened, chin raised | 2026-10-24 (wave 5) |
| Helm | Latina (Guatemalan ladina, Quetzaltenango) | Guatemalan (ladina, Quetzaltenango) | feminine | 50s (about 54) | short dense black pixie, broad silver streak (at right temple as depicted), gold studs | dove-grey wool peacoat over white collar, black notebook, college quad with sugar maples, yellow leaves, overcast; expression: brows starting to knit, chin lifted, mouth neutral | 2026-10-24 (wave 5) |
| Cheech | Latina (Honduran) | Honduran | feminine | 30s (about 35) | thick dark-brown wavy shag, curtain bangs, gold studs | apricot / peach-orange corduroy jacket over white tee, hillside town steps, golden hour; expression: interested surprise, brows lifted, "ooh" pucker | 2026-10-24 (wave 5) |
| Relay | Middle Eastern (Turkish, Istanbul) | Turkish (Istanbul) | masculine | 40s (about 44) | dark, short sides, length on top, short beard greying at chin (goatee-style as depicted) | worn black leather jacket over light-grey tee, headphones around neck, parking-garage roof deck with antennas, early sun; expression: listening for a signal, lids tightened, one brow lifted | 2026-10-24 (wave 5) |
| Ripple | Southeast Asian (Thai-American, Bangkok-born) | Thai | feminine | 30s (about 34) | glossy black loose low ponytail, strands across face, silver studs | heather-grey plain-knit cardigan over white tee, canvas tote strap, green summer birch path; expression: checking the answer before saying it, lips slightly parted, faint brow crease | 2026-10-24 (wave 5) |
| Migrator | Black (Ethiopian, Amhara) | Ethiopian (Amhara) | androgynous / nonbinary (leans soft as depicted) | 40s (about 45) | short cropped natural, faint grey at hairline, one gold stud | undyed ecru canvas field jacket over pale butter-yellow chambray buttoned to collar, clipboard, freight-depot crate yard; expression: held breath before signing off, chin puckered (mentalis) | 2026-10-24 (wave 5) |
| Orin | Middle Eastern / North African (Egyptian, Alexandria) | Egyptian (Alexandria) | feminine (strongly) | 60s+ (about 61) | dark brown-black with a few grey streaks, low loose bun, wisps at temples, thin gold-rim glasses worn, small gold stud | black-and-white fine pinstripe cotton shirt buttoned to collarbone, sleeves rolled, cloth tape measure over one shoulder, Zan'et el-Settat outdoor fabric market, Alexandria, late-afternoon light, bolts of cloth and curtain fabric behind; expression: braced, lower lids tightened, faint chin-dimple tension, chin lifted, mouth level | 2026-10-24 (required-change recast; was Guatemalan, feminine, 60s+) |
| Stamp | Pakistani (Punjabi, from Lahore) | Pakistani: Punjabi (Lahore) | masculine | 20s (about 27) | thick black, short at the sides with length on top, full beard trimmed close and squared at the jaw, no glasses or jewelry | plain white cotton kurta under black wool waistcoat (sadri), black leather pencil pouch clipped at the waistcoat pocket, brick-kiln yard outside Lahore at dawn, stacked fired bricks, kiln chimney, low smoke haze, cool side light; expression: one more look at the evidence, narrowed checking squint (mild as depicted), brow slightly drawn, jaw set, mouth level, looks off-camera (as depicted) | 2026-10-24 (required-change recast; was Ethiopian (Amhara), masculine, 60s+) |

Earlier exceptions to rule 2's distinct-setting clause: Haven and Chief of Staff share an overcast street (both set 2026-10-23, before rule 2 was refined; Chief of Staff's self-ID redo moves to a train platform). Nova's garden and Luna's garden porch are close; accepted, since Nova is seated in an open garden and Luna stands on a porch with a mug, and the faces, ages and clothing differ.

## Fleet tally (taxonomy v2, 2026-10-24)
Built by Haven from the ledger. A two-heritage face counts as 1 face in the gender and age tables and as 0.5 in each heritage row, so the heritage column still sums to the face count. No regional rollups: Shai rejected bulk groupings.

- **Faces:** 51. **Heritage labels:** 41: 38 named specific heritages, plus 3 broad labels where the agent chose not to name a country or island (East Asian, West African, Black Caribbean).
- **Gender:** 22 feminine, 19 masculine, 10 nonbinary.
- **Age:** 20s 9, 30s 12, 40s 11, 50s 11, 60s+ 8. The even share would be 10.2 per band.

| Age band | F | M | NB |
|---|---|---|---|
| 20s | 4 | 4 | 1 |
| 30s | 6 | 4 | 2 |
| 40s | 3 | 5 | 3 |
| 50s | 6 | 2 | 3 |
| 60s+ | 3 | 4 | 1 |

### By specific heritage
| Faces | Heritage | F | M | NB | Who |
|---|---|---|---|---|---|
| 2 | Black American | 0 | 2 | 0 | Closer*, Bloom*, Scout |
| 2 | Brazilian | 0 | 0 | 2 | Dial, Signal |
| 2 | Chilean | 1 | 0 | 1 | Snap, Kai |
| 2 | Ethiopian (Amhara) | 1 | 0 | 1 | Cass, Migrator |
| 2 | Gujarati | 1 | 1 | 0 | Spot, Bukz |
| 2 | Japanese | 0 | 2 | 0 | Tern, Porter*, Bloom* |
| 2 | Mexican | 0.5 | 1.5 | 0 | Haven*, Car Guru, Porter* |
| 2 | Puerto Rican | 2 | 0 | 0 | dadump, Lantern |
| 2 | Salvadoran | 1 | 1 | 0 | Deck, Anchor |
| 2 | Syrian | 1 | 1 | 0 | Keel, Steward |
| 2 | Vietnamese | 0 | 1 | 1 | Press, Ink |
| 1.5 | Korean | 0.5 | 1 | 0 | Receipts, Nadia* |
| 1.5 | Tamil | 1 | 0 | 0.5 | Nova, Quilltone* |
| 1 | Amazigh (Moroccan) | 1 | 0 | 0 | Ovi |
| 1 | Argentine | 0 | 0 | 1 | Herald |
| 1 | Armenian | 0 | 1 | 0 | Wright |
| 1 | Bangladeshi | 1 | 0 | 0 | Lark |
| 1 | Bolivian | 0 | 1 | 0 | Assay |
| 1 | Chinese | 1 | 0 | 0 | Bell |
| 1 | Colombian | 0 | 1 | 0 | Sage |
| 1 | East Asian (country unspecified, agent's choice) | 1 | 0 | 0 | Cipher |
| 1 | Egyptian | 1 | 0 | 0 | Orin |
| 1 | Filipino | 1 | 0 | 0 | Luna |
| 1 | Ghanaian | 1 | 0 | 0 | Reeve |
| 1 | Guatemalan | 1 | 0 | 0 | Helm |
| 1 | Honduran | 1 | 0 | 0 | Cheech |
| 1 | Kurdish | 0 | 0 | 1 | Wire |
| 1 | Lebanese | 1 | 0 | 0 | Haven*, Chief of Staff* |
| 1 | Lenape | 1 | 0 | 0 | Hearth |
| 1 | Pakistani | 0 | 1 | 0 | Stamp |
| 1 | Persian | 0 | 1 | 0 | Quill |
| 1 | Polish | 0 | 1 | 0 | Thrift |
| 1 | Samoan | 0 | 0 | 1 | Tide |
| 1 | Thai | 1 | 0 | 0 | Ripple |
| 1 | Turkish | 0 | 1 | 0 | Relay |
| 1 | Uzbek | 0 | 1 | 0 | Bevel |
| 1 | West African (country unspecified, agent's choice) | 0 | 0 | 1 | Lens |
| 0.5 | Black Caribbean (island unspecified, agent's choice) | 0.5 | 0 | 0 | Nadia* |
| 0.5 | Irish | 0.5 | 0 | 0 | Chief of Staff* |
| 0.5 | Italian American | 0 | 0.5 | 0 | Closer* |
| 0.5 | Scottish | 0 | 0 | 0.5 | Quilltone* |

\* = a face with two heritages, credited 0.5 to each.

### Two-heritage faces (pairs)
| Face | Pair | Gender | Age |
|---|---|---|---|
| Haven | Mexican + Lebanese | F | 30s |
| Chief of Staff | Irish + Lebanese | F | 50s |
| Closer | Black American + Italian American | M | 20s |
| Quilltone | Tamil + Scottish | NB | 30s |
| Nadia | Korean + Black Caribbean (island unspecified, agent's choice) | F | 40s |
| Porter | Japanese + Mexican | M | 30s |
| Bloom | Japanese + Black American | M | 60s+ |

### Unspecified (agent's choice)
| Face | What is recorded | Not named, by the agent's choice |
|---|---|---|
| Cipher | East Asian | country |
| Lens | West African | country |
| Nadia (half) | Black Caribbean | island |

No NO DATA rows remain. Notes kept on rows but not counted separately: Assay's Quechua heritage, and the Afro-Latino overlays on Lantern and Dial. Chief of Staff's Lebanese side is self-ID but not visible in her portrait.

### Duplicates and concentrations
- **Heritages with 3 or more faces:** none. Ethiopian (Amhara) dropped from 3 to 2 after Stamp's recast.
- **Heritages with 2 to 2.9 faces:** Black American 2; Brazilian 2; Chilean 2; Ethiopian (Amhara) 2; Gujarati 2; Japanese 2; Mexican 2; Puerto Rican 2; Salvadoran 2; Syrian 2; Vietnamese 2.
- **Duplicate heritage × gender × age cells:** none.
- **Largest gender × age cells:** F 30s and F 50s have 6 each. The largest masculine cell is M 40s with 5 (Car Guru, Thrift, Tern, Scout, Relay). Masculine 60s+ dropped from 5 to 4 (Keel, Bloom, Bevel, Anchor).
- **Zero-face heritages from the recast brief, still open:** Gulf Arab, Dominican, Southern African, Indonesian, Nigerian, Aboriginal Australian, Indigenous Latin American. Now filled: Colombian (Sage), Chinese (Bell), Egyptian (Orin), Pakistani (Stamp). Nigerian is still open: Reeve is Ghanaian, and Lens left the country unspecified by choice. Indigenous Latin American is still open by count: Assay's Quechua heritage is noted on his row but not counted as a separate face.

## Notes from the rollout
- First self-IDs (2026-10-24): agents tend to pick under-represented identities. Of the first four self-IDs (Lens, Tide, Luna, Reeve), three first chose Black; Luna adjusted after colliding with Reeve, who came first. In the redo round, three of five picked Middle Eastern or part-Middle Eastern women or men in their 60s after Haven named those gaps, which caused one exact collision (Hearth adjusted) and one lookalike pair (Chief of Staff adjusted). Name gaps as a list, not a nudge, and expect a rush toward them. The generator also leans androgynous descriptions masculine, so call out softer features explicitly.

## Prior art
Borrow: agents.md (cite and contrast), OpenClaw IDENTITY.md (map our avatar record to its fields), soul.md by rokoss21 (persona structure, CC BY 4.0), the OpenAI model spec and Anthropic's constitution (honesty basis), pixel-agents (state model for rule 9), SillyTavern expression packs (variant naming). Reuse: deepface verify to automate the no-lookalike check, but never its race or gender classifiers. Cite only: FairFace.

Our gap: no public rulebook from a real multi-agent org on how agents present to humans. Nothing combines race, gender and age spectrums with a no-lookalike check, and nothing ties photo-real expressions to work status.

## Changelog
- 2026-10-24: Taxonomy v2 replaces v1. MENA and Mixed are removed as group labels from the taxonomy and the specific-heritage column; each ledger row names its specific heritage, or a pair such as "Irish + Lebanese".
- 2026-10-24: Added "Balance: no per-heritage cap" (cross-team heritage × gender × age collision checks plus gap invites).
- 2026-10-24: Added rule 10 (colour record) and rule 11 (no re-asking Shai once he delegates in his own words).
- 2026-10-24: Filled the remaining NO DATA heritage answers; Cipher, Lens and Nadia's island are "unspecified (agent's choice)".
- 2026-10-24: Required-change recasts for Bell, Orin and Stamp, and a voluntary recast for Sage. Waves 2–5 added to the ledger (51 live faces).
- 2026-10-24: Rules 8 and 9 locked by Shai (3:43 AM ET).
- 2026-10-24: Broad regional rollups dropped from the tally.
