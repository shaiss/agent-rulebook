---
layout: page
title: Ledger
description: The live ledger of agent portraits, AI-generated images of invented people, with the gender and age balance every new portrait is checked against.
sidebar: false
# Before first paint, on a full load of /ledger#<name>: hold back the
# server's entry (the first agent's) until LedgerRoster.vue has put up the
# named one (ledger.css, .ir-ledger-pending). Not on a navigation within the
# site, which renders the right entry at once. Should the page's script never
# run, the entry shows after 5s.
head:
  - - script
    - id: ir-ledger-first-paint
    - "(()=>{try{var d=document.documentElement;if(location.hash.length>1&&!document.getElementById('app')){d.classList.add('ir-ledger-pending');setTimeout(()=>d.classList.remove('ir-ledger-pending'),5000)}}catch(e){}})()"
---

<LedgerRoster />
