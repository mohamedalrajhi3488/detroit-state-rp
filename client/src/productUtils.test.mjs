import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeProductGallery } from './productUtils.mjs'

test('normalizes single image and gallery arrays', () => {
  assert.deepEqual(normalizeProductGallery({ image: '/img/a.png' }), ['/img/a.png'])
  assert.deepEqual(normalizeProductGallery({ image: '/img/a.png', image2: '/img/b.png', image3: '/img/c.png' }), ['/img/a.png', '/img/b.png', '/img/c.png'])
  assert.deepEqual(normalizeProductGallery({ images: ['/img/a.png', '/img/b.png'] }), ['/img/a.png', '/img/b.png'])
  assert.deepEqual(normalizeProductGallery({ gallery: '/img/a.png\n/img/b.png' }), ['/img/a.png', '/img/b.png'])
})
