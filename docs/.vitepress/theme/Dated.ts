import { defineComponent, h, type PropType } from 'vue'

// Text with its ISO dates kept on one line. Browsers break "2026-10-23" at
// its hyphens ("2026-10-" / "23" at the end of a line), and no CSS property
// stops a break after a hyphen, so each date is set in a
// <time class="ir-date"> that style.css keeps whole (white-space: nowrap),
// as markdown.ts does for the rule page's own text. For text the theme
// renders from the rulebook data: the page foot, the ledger entry's fields
// and notes, the landing's dated lines.
const DATE_RE = /\b(\d{4}-\d\d-\d\d)\b/

export default defineComponent({
  name: 'Dated',
  props: { text: { type: String as PropType<string | null>, default: '' } },
  setup(props) {
    // split() with a capture group: the dates sit at the odd indexes
    return () =>
      (props.text ?? '')
        .split(DATE_RE)
        .map((s, i) => (i % 2 ? h('time', { class: 'ir-date', datetime: s }, s) : s))
        .filter((s) => s !== '')
  }
})
