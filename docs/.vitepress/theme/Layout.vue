<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import RuleHeader from './rulepage/RuleHeader.vue'
import FleetAside from './rulepage/FleetAside.vue'

const { page } = useData()
const isRulebook = computed(() => page.value.relativePath === 'rules/avatars.md')
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <RuleHeader v-if="isRulebook" />
    </template>
    <template #aside-outline-after>
      <FleetAside v-if="isRulebook" />
    </template>
  </DefaultTheme.Layout>
</template>
