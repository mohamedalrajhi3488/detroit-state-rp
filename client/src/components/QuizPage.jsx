import React, { useEffect, useMemo, useState } from 'react'

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

export default function QuizPage({ loggedUser, questions = [], onSubmitResult, onLogin }) {
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [localResult, setLocalResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [guildStatus, setGuildStatus] = useState(String(loggedUser?.status || '').trim().toLowerCase())
  const [isVerifyingMembership, setIsVerifyingMembership] = useState(false)
  const [membershipError, setMembershipError] = useState('')

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

  const completion = useMemo(() => {
    const answered = Object.keys(answers).filter((key) => answers[key] !== undefined && answers[key] !== null && answers[key] !== '').length
    return Math.round((answered / Math.max(totalQuestions, 1)) * 100)
  }, [answers, totalQuestions])

  const handleAnswerChange = (questionId, selectedIndex) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: selectedIndex
    }))
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
      submittedAt: new Date().toISOString()
    }

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
            <h1>{title}</h1>
            <p style={{ margin: 0 }}>{message}</p>
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
    const successText = localResult.passed ? 'تم اجتياز الاختبار بنجاح' : 'تم إنهاء الاختبار'

    return (
      <section className="quiz-page-shell">
        <div className="quiz-result-card">
          <div className="quiz-result-icon">{localResult.passed ? '✅' : '🎯'}</div>
          <h1>{successText}</h1>
          <p>درجتك: {localResult.score} من {localResult.total}</p>
          {localResult.passed ? (
            <p className="quiz-result-note">مبروك، لقد نجحت في الاختبار وتم تسجيل نتيجتك في لوحة الإدارة.</p>
          ) : (
            <p className="quiz-result-note">يمكنك إعادة المحاولة لاحقًا لتجربة جديدة وتحسين النتيجة.</p>
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
            </div>
            <button type="button" className="quiz-primary-btn" onClick={() => setStarted(true)}>ابدأ الاختبار</button>
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
          <div className="quiz-progress-pill">{completion}%</div>
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
