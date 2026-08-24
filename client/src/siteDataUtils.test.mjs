import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizePages, isPageAccessible, defaultPages } from './siteDataUtils.mjs'

test('default activities page stays hidden from public navigation', () => {
  const pages = normalizePages(defaultPages)
  const activities = pages.find((page) => page.type === 'activities' || page.id === 'activities')

  assert.ok(activities)
  assert.equal(activities.status, 'hidden')
  assert.equal(isPageAccessible(activities, 'member'), false)
  assert.equal(isPageAccessible(activities, 'admin'), true)
})
