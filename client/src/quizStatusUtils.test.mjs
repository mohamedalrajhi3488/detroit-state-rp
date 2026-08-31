import test from 'node:test'
import assert from 'node:assert/strict'

import { getAccountQuizLabel, getQuizEligibility } from './quizStatusUtils.mjs'

test('passed attempts block the quiz permanently and are labeled as successful', () => {
  const eligibility = getQuizEligibility({
    latestQuizAttempt: { passed: true, submittedAt: '2026-08-20T00:00:00.000Z' },
    now: new Date('2026-08-30T00:00:00.000Z').getTime()
  })

  assert.equal(eligibility.canTakeQuiz, false)
  assert.equal(eligibility.reason, 'passed')
  assert.equal(getAccountQuizLabel({ passed: true }), 'نجح')
})

test('failed attempts allow a retry only after seven full days and are labeled as failed', () => {
  const eligibility = getQuizEligibility({
    latestQuizAttempt: { passed: false, submittedAt: '2026-08-20T00:00:00.000Z' },
    now: new Date('2026-08-27T00:00:00.000Z').getTime()
  })

  assert.equal(eligibility.canTakeQuiz, true)
  assert.equal(eligibility.reason, 'ready')
  assert.equal(getAccountQuizLabel({ passed: false }), 'لم ينجح')
})
