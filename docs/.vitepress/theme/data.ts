// Content for the landing page, mirrored from docs/rules/avatars.md.
// Keep in step with that page when rules or the ledger change.

export type Gender = 'fem' | 'nb' | 'masc'

export interface Agent {
  name: string
  race: string
  g: Gender
  age: '20s' | '30s' | '40s' | '50s' | '60s+'
}

export const agents: Agent[] = [
  { name: 'Haven', race: 'Latina / Middle Eastern-presenting', g: 'fem', age: '30s' },
  { name: 'Chief of Staff', race: 'Latino-presenting', g: 'masc', age: '40s' },
  { name: 'Keel', race: 'Black', g: 'masc', age: '40s' },
  { name: 'Nova', race: 'South Asian', g: 'fem', age: '60s+' },
  { name: 'Steward', race: 'White European', g: 'masc', age: '50s' },
  { name: 'Cipher', race: 'East Asian', g: 'fem', age: '30s' },
  { name: 'Hearth', race: 'South Asian', g: 'masc', age: '20s' },
  { name: 'Lens', race: 'Black (West African)', g: 'nb', age: '20s' },
  { name: 'Tide', race: 'Pacific Islander (Polynesian)', g: 'nb', age: '40s' },
  { name: 'Luna', race: 'Southeast Asian (Filipina)', g: 'fem', age: '50s' },
  { name: 'Reeve', race: 'Black (Ghanaian)', g: 'fem', age: '50s' }
]

export interface Rule {
  n: string
  t: string
  b: string
  draft?: boolean
}

export const rules: Rule[] = [
  { n: '01', t: 'Invented people only', b: 'Every portrait is a photo-realistic image of an invented person, never a real one or a lookalike.' },
  { n: '02', t: 'No two agents look alike', b: 'No shared race, gender presentation and age band, and every portrait differs in hair, clothing and setting.' },
  { n: '03', t: 'The fleet is an even blend', b: 'Races, genders and ages are balanced across all seats. Check the ledger tallies first.' },
  { n: '04', t: 'Agents set their own pictures', b: 'Only after approving the portrait made from their own description. Haven verifies each one.' },
  { n: '05', t: 'Style is open for now', b: 'Natural-light outdoor portrait or cinematic realism. Shai picks the house style.' },
  { n: '06', t: 'Gender is a spectrum, blended with race', b: 'Feminine, masculine, nonbinary and androgynous, spread across every race.' },
  { n: '07', t: 'Age is a spectrum too', b: 'Every band from the 20s to 60s and older. Don’t default to 30s or 40s faces.' },
  { n: '08', t: 'Expressions carry nuance', b: 'No stock smiles. Small muscle cues show a real inner state.', draft: true },
  { n: '09', t: 'Dynamic avatars', b: 'One face, a few expression variants that follow the agent’s real work state.', draft: true }
]

export const ageBands = ['20s', '30s', '40s', '50s', '60s+'] as const

export const genders: [Gender, string][] = [
  ['fem', 'Feminine'],
  ['nb', 'Nonbinary'],
  ['masc', 'Masculine']
]
