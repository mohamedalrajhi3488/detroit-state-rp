import test from 'node:test'
import assert from 'node:assert/strict'

import { getAccountQuizLabel, getQuizEligibility, resolveQuizTimeoutMinutes, DEFAULT_QUIZ_TIMEOUT_MINUTES, shouldTreatQuizExitAsAbandon } from './quizStatusUtils.mjs'

test('minimizing or switching tabs is not treated as quiz abandonment', () => {
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'visibilitychange' }), false)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'blur' }), false)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'pagehide' }), true)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'beforeunload' }), true)
})

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

test('quiz timeout defaults to five minutes and supports admin overrides', () => {
  assert.equal(DEFAULT_QUIZ_TIMEOUT_MINUTES, 5)
  assert.equal(resolveQuizTimeoutMinutes({ quizTimeoutMinutes: 10 }), 10 * 60 * 1000)
  assert.equal(resolveQuizTimeoutMinutes({}), 5 * 60 * 1000)
  assert.equal(resolveQuizTimeoutMinutes({ quizTimeoutMinutes: -2 }), 5 * 60 * 1000)
})
