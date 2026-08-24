const test = require('node:test')
const assert = require('node:assert/strict')

const { resolveUsableDate, formatLastSeen } = require('./date-utils')

test('uses the first valid timestamp when placeholder values are present', () => {
  const date = resolveUsableDate('الآن', '2026-08-23T15:50:45.920Z')
  assert.ok(date instanceof Date)
  assert.equal(date.toISOString().slice(0, 10), '2026-08-23')
})

test('formats valid ISO dates without exposing raw timestamp text', () => {
  const value = formatLastSeen('2026-08-23T15:50:45.920Z')
  assert.match(value, /^23\/08\/2026 \d{2}:\d{2}:\d{2}$/)
  assert.doesNotMatch(value, /الآن|now|today/i)
})
