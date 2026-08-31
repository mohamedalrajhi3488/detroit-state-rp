import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getQuizEligibility, QUIZ_COOLDOWN_MS, resolveQuizTimeoutMinutes, shouldTreatQuizExitAsAbandon, normalizeQuizFailureMeta } from '../quizStatusUtils.mjs'

const buildScoreSummary = (questions, answers = {}) => {
  let correct = 0

  questions.forEach((question) => {
    const selected = answers[question.id]
    const selectedIndex = typeof selected === 'number' ? selected : Number(selected)
    if (Number.isInteger(selectedIndex) && selectedIndex === question.correctIndex) {
      correct += 1
    }
  })

  return correct
}

export default function QuizPage({ loggedUser, questions = [], onSubmitResult, onLogin, quizResults = [], quizTimeoutMinutes = 5 }) {
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [localResult, setLocalResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [guildStatus, setGuildStatus] = useState(String(loggedUser?.status || '').trim().toLowerCase())
  const [isVerifyingMembership, setIsVerifyingMembership] = useState(false)
  const [membershipError, setMembershipError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(() => resolveQuizTimeoutMinutes({ quizTimeoutMinutes }))
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)
  const sessionStartAtRef = useRef(null)
  const failSubmissionRef = useRef(false)
  const answersRef = useRef(answers)
  const failMarkerKey = `quiz-failed-${loggedUser?.id || 'guest'}`

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const formatQuizTimer = (ms) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const recordQuizFailure = (options = {}) => {
    const { reason = 'abandon', customAnswers = answers } = options
    if (!loggedUser?.id || submitted || timedOut || failSubmissionRef.current) return

    const failureResult = normalizeQuizFailureMeta({
      discordId: loggedUser.id,
      userName: loggedUser.name || loggedUser.username || 'مستخدم',
      avatar: loggedUser.avatar || null,
      answers: customAnswers,
      score: buildScoreSummary(safeQuestions, customAnswers),
      total: safeQuestions.length,
      passed: false,
      submittedAt: new Date().toISOString(),
      timedOut: reason === 'timeout',
      abandoned: reason !== 'timeout',
      reason: reason === 'timeout' ? 'timeout' : 'cheat_attempt',
      cheatAttempt: reason !== 'timeout'
    })

    failSubmissionRef.current = true
    setTimedOut(reason === 'timeout')
    setSubmitted(true)
    setLocalResult(failureResult)
    const failMarkerPayload = {
      reason: failureResult.reason,
      cheatAttempt: Boolean(failureResult.cheatAttempt),
      abandoned: Boolean(failureResult.abandoned),
      timedOut: Boolean(failureResult.timedOut),
      recorded: true,
      submittedAt: failureResult.submittedAt,
      answers: customAnswers || {}
    }
    localStorage.setItem(failMarkerKey, JSON.stringify(failMarkerPayload))

    if (typeof onSubmitResult === 'function') {
      onSubmitResult(failureResult)
    }
  }

  useEffect(() => {
    if (!loggedUser?.id) {
      setGuildStatus('not_in_guild')
      return
    }

    let active = true

    const refreshGuildStatus = async () => {
      try {
        const response = await fetch('/api/discord/member-status', { credentials: 'same-origin' })
        if (!response.ok) {
          if (active) {
            setGuildStatus('not_in_guild')
          }
          return
        }

        const data = await response.json()
        if (!active) return
        setGuildStatus(String(data?.status || 'not_in_guild').trim().toLowerCase())
      } catch {
        if (active) {
          setGuildStatus('not_in_guild')
        }
      }
    }

    refreshGuildStatus()
    return () => { active = false }
  }, [loggedUser?.id, loggedUser?.status])

  const isLoggedIn = Boolean(loggedUser?.id)
  const normalizedGuildStatus = String(guildStatus || '').trim().toLowerCase()
  const validMembershipStatuses = ['online', 'idle', 'dnd', 'streaming', 'member']
  const hasGuildMembership = validMembershipStatuses.includes(normalizedGuildStatus) || (!['', 'offline', 'not_in_guild', 'not_member', 'pending', 'memberless'].includes(normalizedGuildStatus) && normalizedGuildStatus.length > 0)
  const isGuildVerified = isLoggedIn && hasGuildMembership

  const safeQuestions = Array.isArray(questions) ? questions : []
  const totalQuestions = safeQuestions.length
  const passRatio = 0.7
  const requiredCorrectAnswers = Math.ceil(totalQuestions * passRatio)
  const requiredPercentage = Math.ceil(passRatio * 100)
  const configuredQuizMinutes = Number.isFinite(Number(quizTimeoutMinutes)) && Number(quizTimeoutMinutes) > 0 ? Number(quizTimeoutMinutes) : 5

  const completion = useMemo(() => {
    const answered = Object.keys(answers).filter((key) => answers[key] !== undefined && answers[key] !== null && answers[key] !== '').length
    return Math.round((answered / Math.max(totalQuestions, 1)) * 100)
  }, [answers, totalQuestions])

  const latestQuizAttempt = useMemo(() => {
    if (!loggedUser?.id || !Array.isArray(quizResults)) return null

    const userId = String(loggedUser.id)
    return [...quizResults]
      .filter((entry) => String(entry?.discordId || '') === userId)
      .sort((a, b) => new Date(b?.submittedAt || 0).getTime() - new Date(a?.submittedAt || 0).getTime())[0] || null
  }, [loggedUser?.id, quizResults])

  const quizEligibility = useMemo(() => getQuizEligibility({
    latestQuizAttempt,
    now: Date.now()
  }), [latestQuizAttempt])

  const nextQuizUnlockAt = quizEligibility.unlockAt || null
  const canTakeQuizAgain = quizEligibility.canTakeQuiz

  const [timeLeft, setTimeLeft] = useState(() => quizEligibility.timeLeftMs || 0)

  useEffect(() => {
    if (!nextQuizUnlockAt) return

    const updateCountdown = () => {
      setTimeLeft(Math.max((nextQuizUnlockAt || Date.now()) - Date.now(), 0))
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [nextQuizUnlockAt])

  const formatTimeLeft = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (days > 0) return `${days} يوم ${hours} ساعة`
    if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`
    if (minutes > 0) return `${minutes} دقيقة ${seconds} ثانية`
    return `${seconds} ثانية`
  }

  const handleAnswerChange = (questionId, selectedIndex) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: selectedIndex
    }))
  }

  useEffect(() => {
    if (!started && !submitted) return

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0
      }
    }

    requestAnimationFrame(resetScroll)
    const timer = window.setTimeout(resetScroll, 80)
    return () => window.clearTimeout(timer)
  }, [started, submitted])

  useEffect(() => {
    if (!started || submitted || timedOut || !isLoggedIn) return

    const timeoutMs = resolveQuizTimeoutMinutes({ quizTimeoutMinutes })
    sessionStartAtRef.current = Date.now()
    setTimeRemaining(timeoutMs)

    const tick = () => {
      if (!sessionStartAtRef.current) return

      const elapsed = Date.now() - sessionStartAtRef.current
      const remaining = Math.max(0, timeoutMs - elapsed)
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        recordQuizFailure({ reason: 'timeout' })
      }
    }

    timerRef.current = window.setInterval(tick, 1000)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [started, submitted, timedOut, isLoggedIn, loggedUser?.id, quizTimeoutMinutes])

  useEffect(() => {
    if (!started || submitted || timedOut) return

    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined' && !failSubmissionRef.current) {
        localStorage.setItem(failMarkerKey, JSON.stringify({
          reason: 'cheat_attempt',
          cheatAttempt: true,
          abandoned: true,
          timedOut: false,
          recorded: true,
          submittedAt: new Date().toISOString(),
          answers: answersRef.current
        }))
      }
    }

    const handleVisibilityChange = () => {
      if (shouldTreatQuizExitAsAbandon({ eventName: 'visibilitychange', visibilityState: document.visibilityState })) {
        localStorage.setItem(failMarkerKey, JSON.stringify({
          reason: 'cheat_attempt',
          cheatAttempt: true,
          abandoned: true,
          timedOut: false,
          recorded: true,
          submittedAt: new Date().toISOString(),
          answers: answersRef.current
        }))
      }
    }

    const handleQuizLeave = () => {
      if (shouldTreatQuizExitAsAbandon({ eventName: 'pagehide' })) {
        recordQuizFailure({ reason: 'abandon', customAnswers: answersRef.current })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleQuizLeave)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      if (!failSubmissionRef.current && !submitted && !timedOut && started) {
        recordQuizFailure({ reason: 'abandon', customAnswers: answersRef.current })
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleQuizLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [started, submitted, timedOut, loggedUser?.id, failMarkerKey])

  useEffect(() => {
    if (!loggedUser?.id) return

    const failMarkerRaw = localStorage.getItem(failMarkerKey)
    if (!failMarkerRaw) return

    if (!latestQuizAttempt && !submitted && !timedOut && !failSubmissionRef.current) {
      clearQuizFailureMarker(loggedUser.id)
      return
    }

    try {
      const failMarker = JSON.parse(failMarkerRaw)
      if (!failMarker || !failMarker.recorded) {
        if (!submitted && !timedOut && !failSubmissionRef.current) {
          recordQuizFailure({ reason: 'abandon' })
        }
        return
      }

      if (failMarker && !submitted && !timedOut && !failSubmissionRef.current) {
        const normalizedFail = normalizeQuizFailureMeta(failMarker)
        failSubmissionRef.current = true
        setTimedOut(Boolean(normalizedFail.timedOut))
        setSubmitted(true)
        setLocalResult(normalizedFail)
        return
      }
    } catch {
      if (failMarkerRaw === '1' && !submitted && !timedOut && !failSubmissionRef.current) {
        recordQuizFailure({ reason: 'abandon' })
      }
    }
  }, [loggedUser?.id, failMarkerKey, submitted, timedOut, answers, safeQuestions, onSubmitResult, latestQuizAttempt])

  const clearQuizFailureMarker = (userId = loggedUser?.id) => {
    if (typeof window === 'undefined' || !userId) return

    const prefixedKey = `quiz-failed-${userId}`
    localStorage.removeItem(prefixedKey)

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith('quiz-failed-') && key.endsWith(`-${userId}`)) {
        localStorage.removeItem(key)
      }
    }
  }

  const handleStartQuiz = () => {
    failSubmissionRef.current = false
    sessionStartAtRef.current = Date.now()
    clearQuizFailureMarker(loggedUser?.id)
    setStarted(true)
    setTimedOut(false)
    setSubmitted(false)
    setLocalResult(null)
    setAnswers({})
    setTimeRemaining(resolveQuizTimeoutMinutes({ quizTimeoutMinutes }))
  }

  const handleVerifyMembership = async () => {
    setIsVerifyingMembership(true)
    setMembershipError('')

    const existingStatus = String(loggedUser?.status || '').trim().toLowerCase()
    const validExistingStatus = !['', 'offline', 'not_in_guild', 'not_member', 'pending', 'memberless'].includes(existingStatus)

    try {
      const response = await fetch('/api/discord/member-status', { credentials: 'same-origin' })
      if (!response.ok) {
        if (validExistingStatus) {
          setGuildStatus(existingStatus)
          setMembershipError('')
          return
        }

        setMembershipError('تعذر التحقق من العضوية في الوقت الحالي. حاول مرة أخرى بعد قليل.')
        return
      }

      const data = await response.json()
      const nextStatus = String(data?.status || 'not_in_guild').trim().toLowerCase()
      setGuildStatus(nextStatus)

      if (data?.member === true && !['', 'offline', 'not_in_guild', 'not_member', 'pending', 'memberless'].includes(nextStatus)) {
        setMembershipError('')
        return
      }

      if (validExistingStatus && !['offline', 'not_in_guild', 'not_member', 'pending', 'memberless'].includes(nextStatus)) {
        setMembershipError('')
        return
      }

      setMembershipError('أنت غير موجود في سيرفر Detroit State. انضم إلى السيرفر ثم حاول مرة أخرى.')
    } catch {
      if (validExistingStatus) {
        setGuildStatus(existingStatus)
        setMembershipError('')
        return
      }

      setMembershipError('تعذر التحقق من عضويتك. حاول مرة أخرى بعد قليل.')
    } finally {
      setIsVerifyingMembership(false)
    }
  }

  const handleSubmit = async () => {
    if (!isLoggedIn || !isGuildVerified || !safeQuestions.length) return

    const unanswered = safeQuestions.some((question) => answers[question.id] === undefined)
    if (unanswered) return

    setSubmitting(true)

    const score = buildScoreSummary(safeQuestions, answers)
    const passed = (score / Math.max(totalQuestions, 1)) >= passRatio

    const result = {
      discordId: loggedUser.id,
      userName: loggedUser.name || loggedUser.username || 'مستخدم',
      avatar: loggedUser.avatar || null,
      answers,
      score,
      total: safeQuestions.length,
      passed,
      submittedAt: new Date().toISOString(),
      timedOut: false
    }

    if (loggedUser?.id) {
      localStorage.removeItem(failMarkerKey)
    }
    failSubmissionRef.current = false
    sessionStartAtRef.current = null

    let response = null
    if (typeof onSubmitResult === 'function') {
      response = await onSubmitResult(result)
    }

    setLocalResult(response || result)
    setSubmitted(true)
    setSubmitting(false)
  }

  const renderHeroShell = (title, message, actionNode) => (
    <section className="faq-page-shell">
      <div className="faq-page-inner">
        <header className="faq-header faq-hero-shell">
          <div
            className="faq-hero-background"
            style={{
              backgroundImage: "linear-gradient(90deg, rgba(10, 6, 18, 0.8), rgba(10, 6, 18, 0.36)), url('/img/banner.png')"
            }}
          />

          <div className="faq-hero-content" style={{ gap: '18px' }}>
            <span className="faq-eyebrow">الاختبار الإلكتروني</span>
            <h1 style={{ margin: 0, lineHeight: 1.1, display: 'block' }}>{title}</h1>
            <p style={{ margin: 0, marginTop: '0.8rem', lineHeight: 1.7, display: 'block' }}>{message}</p>
            {membershipError && (
              <div style={{
                background: 'rgba(255, 86, 86, 0.12)',
                border: '1px solid rgba(255, 86, 86, 0.35)',
                color: '#ffd6d6',
                borderRadius: '12px',
                padding: '0.7rem 1rem',
                textAlign: 'center',
                maxWidth: '620px',
                fontWeight: 700,
                boxShadow: '0 10px 30px rgba(255, 86, 86, 0.15)'
              }}>
                {membershipError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1rem' }}>{actionNode}</div>
          </div>
        </header>
      </div>
    </section>
  )

  if (!isLoggedIn) {
    return renderHeroShell(
      'يجب تسجيل الدخول أولاً',
      'لا يمكنك بدء اختبار Detroit State إلا بعد تسجيل الدخول     .',
      <button type="button" className="quiz-primary-btn" onClick={onLogin}>تسجيل الدخول</button>
    )
  }

  if (latestQuizAttempt?.passed === true) {
    return renderHeroShell(
      'تم إكمال الاختبار',
      'تمت الموافقة على نجاحك في الاختبار، ولا يمكنك الدخول للأختبار مرة أخرى حتى يتم سحب الرتبة من قبل الإدارة إذا لزم الأمر.',
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '260px',
        minHeight: '48px',
        borderRadius: '14px',
        background: 'rgba(40, 255, 150, 0.08)',
        border: '1px solid rgba(40, 255, 150, 0.25)',
        color: '#dfffe9',
        fontWeight: 800,
        padding: '0.8rem 1rem'
      }}>
        نجحت في الاختبار
      </div>
    )
  }

  if (!canTakeQuizAgain && nextQuizUnlockAt) {
    const isFailedAttempt = latestQuizAttempt && latestQuizAttempt.passed === false

    return renderHeroShell(
      isFailedAttempt ? 'لم تنجح في الاختبار' : 'تم إكمال الاختبار',
      isFailedAttempt
        ? `لم تصل إلى الحد الأدنى للنجاح في هذه المحاولة. يمكنك إعادة الاختبار بعد ${formatTimeLeft(timeLeft)}.`
        : `لا يمكنك الدخول إلى الاختبار مرة أخرى إلا بعد ${formatTimeLeft(timeLeft)}.`,
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '260px',
        minHeight: '48px',
        borderRadius: '14px',
        background: isFailedAttempt ? 'rgba(255, 107, 107, 0.08)' : 'rgba(157, 77, 255, 0.08)',
        border: isFailedAttempt ? '1px solid rgba(255, 107, 107, 0.25)' : '1px solid rgba(157, 77, 255, 0.25)',
        color: isFailedAttempt ? '#ffd6d6' : '#e9d7ff',
        fontWeight: 800,
        padding: '0.8rem 1rem'
      }}>
        {formatTimeLeft(timeLeft)} متبقية
      </div>
    )
  }

  if (!isGuildVerified) {
    return renderHeroShell(
      'يجب أن تكون عضو في السيرفر',
      'لا يمكنك إكمال الاختبار إلا بعد التحقق من عضويتك في سيرفر Detroit State.',
      <button type="button" className="quiz-primary-btn" onClick={handleVerifyMembership} disabled={isVerifyingMembership}>
        {isVerifyingMembership ? 'جاري التحقق...' : 'التحقق من العضوية'}
      </button>
    )
  }

  if (submitted && localResult) {
    const percentage = localResult.total ? Math.round((localResult.score / localResult.total) * 100) : 0
    const timedOutResult = Boolean(localResult.timedOut || localResult.abandoned)

    return (
      <section className="quiz-page-shell">
        <div className="quiz-result-card">
          <div className="quiz-result-icon">
            <img src="/img/DS.webp" alt="Detroit State" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          <h1>{localResult.passed ? 'تم اجتياز الاختبار بنجاح' : timedOutResult ? 'انتهى الوقت' : 'لم تنجح في الاختبار'}</h1>
          <p>{timedOutResult ? 'انتهت مدة الاختبار.' : `نسبتك: ${percentage}%`}</p>
          {localResult.passed ? (
            <p className="quiz-result-note">مبروك، لقد اجتزت اختبار Detroit State الإلكتروني بنجاح، وتم تفعيل رتبة النجاح الخاصة بك في Discord. يمكنك الآن متابعة الأنشطة داخل المجتمع وفقًا لسياساتنا.</p>
          ) : timedOutResult ? (
            <p className="quiz-result-note">انتهى وقت الاختبار ولم تنجح. حاول مرة أخرى بعد 7 أيام.</p>
          ) : (
            <p className="quiz-result-note">لم تنجح في الاختبار، يمكنك إعادة المحاولة بعد 7 أيام، ويُنصح بمراجعة القوانين بشكل جيد قبل المحاولة التالية.</p>
          )}
        </div>
      </section>
    )
  }

  if (!started) {
    return (
      <section className="faq-page-shell">
        <div className="faq-page-inner">
          <header className="faq-header faq-hero-shell">
            <div
              className="faq-hero-background"
              style={{
                backgroundImage: "linear-gradient(90deg, rgba(10, 6, 18, 0.8), rgba(10, 6, 18, 0.36)), url('/img/banner.png')"
              }}
            />

            <div className="faq-hero-content">
              <span className="faq-eyebrow">الاختبار الإلكتروني</span>
              <h1>اختبار Detroit State</h1>
              <p>قبل أن تبدأ الاختبار، تأكد من أنك عضو فعلي في السيرفر وأنك مستعد للإجابة على الأسئلة بشكل صحيح.</p>
            </div>
          </header>

          <div className="quiz-intro-card" style={{ marginTop: '1.5rem' }}>
            <div className="quiz-gate-icon">
              <img src="/img/DS.webp" alt="Detroit State" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <div className="quiz-intro-meta">
              <span>{safeQuestions.length} أسئلة</span>
              <span>الحد الأدنى للنجاح: {requiredPercentage}%</span>
              <span>الوقت المحدد: {configuredQuizMinutes} دقيقة</span>
            </div>
            <button type="button" className="quiz-primary-btn" onClick={handleStartQuiz}>ابدأ الاختبار</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="quiz-page-shell">
      <div className="quiz-form-card">
        <div className="quiz-progress-header">
          <div>
            <span className="quiz-badge">الاختبار الإلكتروني</span>
            <h1>اختبار Detroit State</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="quiz-progress-pill">{completion}%</div>
            <div className="quiz-progress-pill" style={{ background: 'rgba(255, 107, 107, 0.12)', borderColor: 'rgba(255, 107, 107, 0.24)', color: '#ffd6d6' }}>
              {formatQuizTimer(timeRemaining)}
            </div>
          </div>
        </div>

        <div className="quiz-progress-bar">
          <span style={{ width: `${completion}%` }} />
        </div>

        <div className="quiz-question-list">
          {safeQuestions.map((question, index) => (
            <div key={question.id || `quiz-${index}`} className="quiz-question-item">
              <div className="quiz-question-head">
                <span className="quiz-question-no">{index + 1}</span>
                <h3>{question.question}</h3>
              </div>

              <div className="quiz-options">
                {(question.options || []).map((option, optionIndex) => (
                  <label key={`${question.id}-${optionIndex}`} className="quiz-option">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() => handleAnswerChange(question.id, optionIndex)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="quiz-primary-btn"
          disabled={submitting || Object.keys(answers).length !== safeQuestions.length}
          onClick={handleSubmit}
        >
          {submitting ? 'جارٍ إرسال النتيجة...' : 'إرسال الاختبار'}
        </button>
      </div>
    </section>
  )
}
