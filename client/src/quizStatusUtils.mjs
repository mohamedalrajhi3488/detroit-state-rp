export const DEFAULT_QUIZ_TIMEOUT_MINUTES = 5
export const QUIZ_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export const resolveQuizTimeoutMinutes = ({ quizTimeoutMinutes, fallbackMinutes = DEFAULT_QUIZ_TIMEOUT_MINUTES } = {}) => {
  const numericValue = Number(quizTimeoutMinutes)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallbackMinutes * 60 * 1000
  }

  return numericValue * 60 * 1000
}

export const shouldTreatQuizExitAsAbandon = ({ eventName, visibilityState } = {}) => {
  if (!eventName) return false

  const normalizedEvent = String(eventName).toLowerCase()

  if (normalizedEvent === 'visibilitychange') {
    return visibilityState === 'hidden' && false
  }

  return ['beforeunload', 'pagehide'].includes(normalizedEvent)
}

export const getAccountQuizLabel = (result) => {
  if (!result) return 'لم يبدأ الاختبار'
  if (result.passed === true) return 'نجح'
  if (result.passed === false) return 'لم ينجح'
  return 'لم يبدأ الاختبار'
}

export const getQuizEligibility = ({ latestQuizAttempt, now = Date.now() }) => {
  if (!latestQuizAttempt) {
    return { canTakeQuiz: true, reason: 'not_started', timeLeftMs: 0 }
  }

  const submittedAt = latestQuizAttempt.submittedAt ? new Date(latestQuizAttempt.submittedAt).getTime() : 0
  const isPassed = Boolean(latestQuizAttempt.passed)

  if (isPassed) {
    return { canTakeQuiz: false, reason: 'passed', timeLeftMs: 0, unlockAt: null }
  }

  if (!submittedAt) {
    return { canTakeQuiz: true, reason: 'not_started', timeLeftMs: 0 }
  }

  const unlockAt = submittedAt + QUIZ_COOLDOWN_MS
  const timeLeftMs = Math.max(unlockAt - now, 0)

  return {
    canTakeQuiz: now >= unlockAt,
    reason: now >= unlockAt ? 'ready' : 'cooldown',
    timeLeftMs,
    unlockAt
  }
}

export default { getAccountQuizLabel, getQuizEligibility, QUIZ_COOLDOWN_MS, DEFAULT_QUIZ_TIMEOUT_MINUTES, resolveQuizTimeoutMinutes }
