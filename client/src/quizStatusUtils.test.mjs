import test from 'node:test'
import assert from 'node:assert/strict'

import { getAccountQuizLabel, getQuizEligibility, resolveQuizTimeoutMinutes, DEFAULT_QUIZ_TIMEOUT_MINUTES, shouldTreatQuizExitAsAbandon, normalizeQuizFailureMeta, shouldIgnoreQuizAbandonRecording, normalizeQuizQuestionOptions } from './quizStatusUtils.mjs'

test('quiz cheating metadata is preserved for admin review', () => {
  const meta = normalizeQuizFailureMeta({ reason: 'cheat_attempt', cheatAttempt: true, abandoned: true })
  assert.equal(meta.cheatAttempt, true)
  assert.equal(meta.reason, 'cheat_attempt')
  assert.equal(meta.abandoned, true)
  assert.equal(normalizeQuizFailureMeta({ reason: 'timeout', timedOut: true }).timedOut, true)
})

test('minimizing or switching tabs is not treated as quiz abandonment', () => {
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'visibilitychange' }), false)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'blur' }), false)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'pagehide' }), true)
  assert.equal(shouldTreatQuizExitAsAbandon({ eventName: 'beforeunload' }), true)
})

test('a finalized valid submission does not get treated as a cheating abandonment', () => {
  assert.equal(shouldIgnoreQuizAbandonRecording({ started: true, submitted: false, timedOut: false, failSubmissionRef: false, finalized: true }), true)
  assert.equal(shouldIgnoreQuizAbandonRecording({ started: true, submitted: false, timedOut: false, failSubmissionRef: false, finalized: false }), false)
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

test('question option counts can be normalized to 4, 6, or 8 choices', () => {
  const fourChoiceQuestion = normalizeQuizQuestionOptions({ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 2 }, 4)
  assert.deepEqual(fourChoiceQuestion.options, ['A', 'B', 'C', 'D'])
  assert.equal(fourChoiceQuestion.correctIndex, 2)

  const sixChoiceQuestion = normalizeQuizQuestionOptions({ question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 7 }, 6)
  assert.equal(sixChoiceQuestion.options.length, 6)
  assert.equal(sixChoiceQuestion.correctIndex, 0)

  const eightChoiceQuestion = normalizeQuizQuestionOptions({ question: 'Q3', options: ['A', 'B', 'C', 'D', 'E', 'F'], correctIndex: 3 }, 8)
  assert.equal(eightChoiceQuestion.options.length, 8)
  assert.equal(eightChoiceQuestion.options[7], 'خيار 8')
})
