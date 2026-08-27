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

test('staff page is always visible in the navbar even when a stale saved page marks it hidden', () => {
  const pages = normalizePages([
    { id: 'home', name: 'الرئيسية', status: 'visible', order: 1 },
    { id: 'staff', name: 'الطاقم الإداري', status: 'hidden', order: 4 },
    { id: 'rules', name: 'القوانين', status: 'visible', order: 8 }
  ])

  const staff = pages.find((page) => page.id === 'staff')
  assert.ok(staff)
  assert.equal(staff.status, 'visible')
  assert.equal(isPageAccessible(staff, 'member'), true)
})
