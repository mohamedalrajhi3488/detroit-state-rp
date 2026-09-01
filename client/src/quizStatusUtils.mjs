export const DEFAULT_QUIZ_TIMEOUT_MINUTES = 5
export const QUIZ_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
export const QUIZ_OPTION_COUNTS = [4, 6, 8]

export const normalizeQuizQuestionOptions = (question = {}, optionCount = 4) => {
  const requestedCount = Number(optionCount)
  const safeCount = QUIZ_OPTION_COUNTS.includes(requestedCount) ? requestedCount : 4
  const existingOptions = Array.isArray(question?.options) ? question.options.slice(0, safeCount) : []
  const nextOptions = Array.from({ length: safeCount }, (_, index) => existingOptions[index] ?? `خيار ${index + 1}`)
  const currentCorrectIndex = Number(question?.correctIndex)
  const safeCorrectIndex = Number.isInteger(currentCorrectIndex) && currentCorrectIndex >= 0 && currentCorrectIndex < safeCount ? currentCorrectIndex : 0

  return {
    ...question,
    options: nextOptions,
    correctIndex: safeCorrectIndex
  }
}

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
    return false
  }

  return ['beforeunload', 'pagehide'].includes(normalizedEvent)
}

export const shouldIgnoreQuizAbandonRecording = ({ started, submitted, timedOut, failSubmissionRef, finalized } = {}) => {
  if (!started) return true
  if (Boolean(finalized)) return true
  if (Boolean(submitted)) return true
  if (Boolean(timedOut)) return true
  if (Boolean(failSubmissionRef)) return true
  return false
}

export const normalizeQuizFailureMeta = (result = {}) => {
  const reason = String(result?.reason || '').trim().toLowerCase()
  const isTimeout = Boolean(result?.timedOut) || reason === 'timeout'
  const isCheat = Boolean(result?.cheatAttempt) || Boolean(result?.abandoned) || reason === 'cheat_attempt' || reason === 'abandon'

  return {
    ...result,
    timedOut: isTimeout,
    abandoned: Boolean(result?.abandoned) || (!isTimeout && isCheat),
    cheatAttempt: Boolean(result?.cheatAttempt) || (!isTimeout && isCheat),
    reason: isTimeout ? 'timeout' : (reason === 'cheat_attempt' || reason === 'abandon' ? 'cheat_attempt' : (reason || 'cheat_attempt'))
  }
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
