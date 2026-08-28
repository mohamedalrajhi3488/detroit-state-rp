import React, { useMemo, useState } from 'react'

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

  const isLoggedIn = Boolean(loggedUser?.id)
  const isGuildVerified = isLoggedIn && loggedUser?.status !== 'not_in_guild' && loggedUser?.status !== 'not_member' && loggedUser?.status !== 'pending'

  const safeQuestions = Array.isArray(questions) ? questions : []
  const totalQuestions = safeQuestions.length

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

  const handleSubmit = async () => {
    if (!isLoggedIn || !isGuildVerified || !safeQuestions.length) return

    const unanswered = safeQuestions.some((question) => answers[question.id] === undefined)
    if (unanswered) return

    setSubmitting(true)

    const score = buildScoreSummary(safeQuestions, answers)
    const passed = score >= Math.ceil(safeQuestions.length * 0.7)

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

  if (!isLoggedIn) {
    return (
      <section className="quiz-gate-shell">
        <div className="quiz-gate-card">
          <div className="quiz-gate-icon">🔒</div>
          <h1>يجب تسجيل الدخول أولاً</h1>
          <p>لا يمكنك بدء اختبار Detroit State إلا بعد تسجيل الدخول من خلال حسابك في الديسكورد.</p>
          <button type="button" className="quiz-primary-btn" onClick={onLogin}>تسجيل الدخول</button>
        </div>
      </section>
    )
  }

  if (!isGuildVerified) {
    return (
      <section className="quiz-gate-shell">
        <div className="quiz-gate-card">
          <div className="quiz-gate-icon">🛡️</div>
          <h1>يجب أن تكون عضو في السيرفر</h1>
          <p>لا يمكنك إكمال الاختبار إلا بعد التحقق من عضويتك في سيرفر Detroit State عبر البوت.</p>
          <button type="button" className="quiz-primary-btn" onClick={() => window.location.href = '/auth/discord'}>
            التحقق من العضوية
          </button>
        </div>
      </section>
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
      <section className="quiz-page-shell">
        <div className="quiz-intro-card">
          <div className="quiz-gate-icon">🧠</div>
          <h1>اختبار Detroit State</h1>
          <p>قبل أن تبدأ الاختبار، تأكد من أنك عضو فعلي في السيرفر وأنك مستعد للإجابة على الأسئلة بشكل صحيح.</p>
          <div className="quiz-intro-meta">
            <span>{safeQuestions.length} أسئلة</span>
            <span>الحد الأدنى للنجاح: {Math.ceil(safeQuestions.length * 0.7)}/ {safeQuestions.length}</span>
          </div>
          <button type="button" className="quiz-primary-btn" onClick={() => setStarted(true)}>ابدأ الاختبار</button>
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
