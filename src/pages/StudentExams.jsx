import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { formatDate } from '../utils'

// ═══════════════════════════════════════════════════
//  STUDENT EXAMS
// ═══════════════════════════════════════════════════
export default function StudentExams({ showToast }) {
  const [view, setView]           = useState('list')
  const [exams, setExams]         = useState([])
  const [attempts, setAttempts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeExam, setActiveExam]     = useState(null)
  const [activeAttempt, setActiveAttempt] = useState(null)
  const [resultData, setResultData] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [er, ar] = await Promise.allSettled([
        api.get('/exams/'),
        api.get('/exams/my_attempts/'),
      ])
      setExams(er.status === 'fulfilled' ? (er.value.data.results || er.value.data || []) : [])
      setAttempts(ar.status === 'fulfilled' ? (ar.value.data.results || ar.value.data || []) : [])
    } finally { setLoading(false) }
  }

  async function startExam(examId) {
    try {
      const r = await api.post(`/exams/${examId}/start/`)
      const { attempt, exam, time_limit_minutes } = r.data
      let examData = exam
      // لو الأسئلة مش جايا في start → اجلبها
      if (!examData?.questions?.length) {
        const det = await api.get(`/exams/${examId}/`)
        examData = det.data
      }
      setActiveExam({ ...examData, time_limit_minutes })
      setActiveAttempt(attempt)
      setView('take')
    } catch (e) {
      showToast(e.response?.data?.error || e.response?.data?.detail || 'حدث خطأ في بدء الامتحان', 'error')
    }
  }

  async function showResult(attemptId) {
    try {
      const r = await api.get(`/exams/attempts/${attemptId}/result/`)
      setResultData(r.data)
      setView('result')
    } catch { showToast('تعذر تحميل النتيجة', 'error') }
  }

  // showResultNow = false لو show_result_immediately مغلق
  function finishExam(attemptId, showResultNow = true) {
    setView('list')
    loadAll()
    if (showResultNow) setTimeout(() => showResult(attemptId), 800)
  }

  if (view === 'take' && activeExam && activeAttempt)
    return <TakeExam exam={activeExam} attempt={activeAttempt}
              showToast={showToast} onFinish={finishExam}
              onCancel={() => { setView('list'); loadAll() }} />

  if (view === 'result' && resultData)
    return <ExamResult attempt={resultData}
              onBack={() => { setView('list'); setResultData(null) }} />

  // ── خريطة أفضل محاولة لكل امتحان ──
  const bestAttempt = {}
  attempts.forEach(a => {
    const prev = bestAttempt[a.exam]
    if (!prev || parseFloat(a.score || 0) > parseFloat(prev.score || 0))
      bestAttempt[a.exam] = a
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={S.title}>📝 الامتحانات</h2>
        <p style={{ color: 'var(--text2)', fontSize: '.85rem' }}>امتحانات الكورسات المسجل فيها</p>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : exams.length ? exams.map(exam => {
        const best         = bestAttempt[exam.id]
        const attemptsUsed = exam.attempts_used  ?? attempts.filter(a => a.exam === exam.id && a.status !== 'in_progress').length
        const attemptsLeft = exam.attempts_left  ?? Math.max(0, exam.max_attempts - attemptsUsed)
        const passed       = best?.passed

        return (
          <div key={exam.id} style={{ ...S.examCard, borderColor: passed ? 'rgba(0,212,170,.35)' : 'var(--border)' }}>
            <div style={S.examIcon}>📝</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.25rem' }}>{exam.title}</div>
              {exam.course_title && (
                <div style={{ fontSize: '.78rem', color: 'var(--accent)', marginBottom: '.3rem' }}>📚 {exam.course_title}</div>
              )}
              <div style={{ fontSize: '.82rem', color: 'var(--text3)', marginBottom: '.6rem' }}>
                ⏱️ {exam.duration} دقيقة &nbsp;•&nbsp;
                ❓ {exam.total_questions} سؤال &nbsp;•&nbsp;
                🎯 النجاح: {exam.passing_score}% &nbsp;•&nbsp;
                🔄 المتبقي: <strong style={{ color: attemptsLeft > 0 ? 'var(--accent3)' : 'var(--red)' }}>{attemptsLeft} / {exam.max_attempts}</strong>
              </div>

              {best && (
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>
                    {passed ? '✅ ناجح' : '❌ راسب'}
                  </span>
                  <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>
                    أعلى درجة: <strong>{parseFloat(best.score || 0).toFixed(1)}%</strong>
                  </span>
                  {/* زرار عرض النتيجة — بس لو الامتحان show_result_immediately أو عنده نتيجة سابقة */}
                  {(exam.show_result_immediately !== false || best.status === 'graded') && (
                    <button className="btn btn-ghost btn-sm" onClick={() => showResult(best.id)}>
                      👁️ عرض النتيجة
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0 }}>
              {attemptsLeft > 0 ? (
                <button className="btn btn-primary" onClick={() => startExam(exam.id)}>
                  {best ? '🔄 إعادة المحاولة' : '🚀 ابدأ الامتحان'}
                </button>
              ) : (
                <span className="badge badge-red">انتهت المحاولات</span>
              )}
            </div>
          </div>
        )
      }) : (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <h3>لا يوجد امتحانات متاحة</h3>
          <p>سجّل في كورس يحتوي على امتحانات منشورة</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  TAKE EXAM
// ═══════════════════════════════════════════════════
function TakeExam({ exam, attempt, showToast, onFinish, onCancel }) {
  const [answers, setAnswers]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [currentQ, setCurrentQ]   = useState(0)
  const [timeLeft, setTimeLeft]   = useState(() =>
    attempt.time_remaining ?? ((exam.time_limit_minutes ?? exam.duration) * 60)
  )
  const timerRef = useRef(null)
  const questions = exam.questions || []

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  function pick(qId, aId, type) {
    setAnswers(prev => {
      if (type === 'multiple_select') {
        const cur = prev[qId] || []
        return { ...prev, [qId]: cur.includes(aId) ? cur.filter(x => x !== aId) : [...cur, aId] }
      }
      return { ...prev, [qId]: [aId] }
    })
  }

  async function handleSubmit(auto = false) {
    if (!auto) {
      const unanswered = questions.length - Object.keys(answers).length
      if (unanswered > 0 && !window.confirm(`لم تجب على ${unanswered} سؤال. هل تريد التسليم؟`)) return
    }
    clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const payload = questions
        .filter(q => answers[q.id]?.length)
        .map(q => ({ question_id: q.id, answer_ids: answers[q.id] }))

      await api.post(`/exams/attempts/${attempt.id}/submit/`, { answers: payload })
      showToast('تم تسليم الامتحان ✅', 'success')

      const showResultNow = exam.show_result_immediately !== false
      if (!showResultNow) showToast('ستظهر نتيجتك لاحقاً', 'info')
      setTimeout(() => onFinish(attempt.id, showResultNow), 1000)
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ في التسليم', 'error')
      setSubmitting(false)
    }
  }

  const q          = questions[currentQ]
  const answered   = Object.keys(answers).length
  const progress   = Math.round(answered / Math.max(questions.length, 1) * 100)
  const timerColor = timeLeft < 60 ? 'var(--red)' : timeLeft < 300 ? 'var(--gold)' : 'var(--accent3)'

  if (!questions.length) return (
    <div className="empty">
      <div className="empty-icon">⚠️</div>
      <h3>لا يوجد أسئلة في هذا الامتحان</h3>
      <button className="btn btn-outline" onClick={onCancel}>رجوع</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      {/* Header */}
      <div style={S.examHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{exam.title}</div>
          <div style={{ fontSize: '.78rem', color: 'var(--text3)' }}>سؤال {currentQ + 1} من {questions.length}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: timerColor, fontFamily: 'monospace', letterSpacing: 2 }}>
            {fmtTime(timeLeft)}
          </div>
          <div style={{ fontSize: '.65rem', color: 'var(--text3)' }}>الوقت المتبقي</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text3)', marginBottom: '.25rem' }}>
          <span>الإجابات: {answered} / {questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      {/* Question Navigator */}
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {questions.map((q, i) => (
          <div key={i} onClick={() => setCurrentQ(i)} style={{
            width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
            background: answers[q.id]?.length ? 'var(--accent)' : currentQ === i ? 'var(--surface)' : 'var(--bg3)',
            color: answers[q.id]?.length ? 'white' : currentQ === i ? 'var(--accent)' : 'var(--text3)',
            border: currentQ === i ? '2px solid var(--accent)' : '1px solid var(--border)',
          }}>{i + 1}</div>
        ))}
      </div>

      {/* Question Box */}
      {q && (
        <div style={S.qBox}>
          {/* نوع السؤال + الدرجة */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--accent)', fontWeight: 700, background: 'rgba(79,140,255,.1)', padding: '.2rem .6rem', borderRadius: 6 }}>
              {q.question_type === 'multiple_choice' ? 'اختر إجابة واحدة' :
               q.question_type === 'true_false'      ? 'صح أو خطأ' : 'اختر أكثر من إجابة'}
            </span>
            <span style={{ fontSize: '.75rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '.2rem .6rem', borderRadius: 6 }}>
              {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
            </span>
          </div>

          {/* صورة السؤال */}
          {(q.image_url || q.image) && (
            <div style={{ marginBottom: '1rem', borderRadius: 10, overflow: 'hidden', background: 'var(--bg3)', textAlign: 'center' }}>
              <img
                src={q.image_url || (typeof q.image === 'string' && q.image.startsWith('http') ? q.image : `${(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || 'http://localhost:8000'}${q.image}`)}
                alt="صورة السؤال"
                style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 10 }}
                onError={e => { e.target.parentElement.style.display = 'none' }}
              />
            </div>
          )}

          {/* نص السؤال */}
          <div style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '1.25rem', color: 'var(--text)' }}>
            {q.question_text}
          </div>

          {/* الإجابات — دايما بتظهر */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {Array.isArray(q.answers) && q.answers.length > 0 ? q.answers.map((ans, idx) => {
              const ansId = ans.id ?? idx
              const sel   = (answers[q.id] || []).includes(ansId)
              return (
                <div key={ansId} onClick={() => pick(q.id, ansId, q.question_type)}
                  style={{ ...S.answerOpt, borderColor: sel ? 'var(--accent)' : 'var(--border)', background: sel ? 'rgba(79,140,255,.1)' : 'var(--bg3)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: q.question_type === 'multiple_select' ? 5 : '50%', border: sel ? 'none' : '2px solid var(--border2)', background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {sel && <span style={{ color: 'white', fontSize: '.72rem', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontSize: '.95rem', color: 'var(--text)', lineHeight: 1.5 }}>{ans.answer_text}</span>
                </div>
              )
            }) : (
              <div style={{ color: 'var(--text3)', fontSize: '.85rem', padding: '1rem', textAlign: 'center', background: 'var(--bg3)', borderRadius: 8 }}>
                ⚠️ لا تتوفر إجابات لهذا السؤال
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
        <button className="btn btn-outline" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>
          → السابق
        </button>
        {currentQ < questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrentQ(i => i + 1)}>التالي ←</button>
        ) : (
          <button className="btn btn-success" onClick={() => handleSubmit()} disabled={submitting} style={{ minWidth: 140 }}>
            {submitting ? '⏳ جاري التسليم...' : '✅ تسليم الامتحان'}
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '.8rem' }}>
          خروج بدون تسليم
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  EXAM RESULT
// ═══════════════════════════════════════════════════
function ExamResult({ attempt, onBack }) {
  const score   = parseFloat(attempt.score || 0)
  const passed  = attempt.passed
  const answers = attempt.student_answers || []
  const correct = answers.filter(a => a.is_correct).length
  const wrong   = answers.filter(a => !a.is_correct).length

  // إعدادات الامتحان من الـ response
  const allowReview        = attempt.allow_review !== false
  const showCorrectAnswers = attempt.show_correct_answers !== false

  return (
    <div>
      <button style={S.back} onClick={onBack}>← رجوع للامتحانات</button>

      {/* Score Card */}
      <div style={{ ...S.resultCard, borderColor: passed ? 'rgba(0,212,170,.4)' : 'rgba(255,79,106,.4)', background: passed ? 'rgba(0,212,170,.05)' : 'rgba(255,79,106,.05)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '.5rem' }}>{passed ? '🎉' : '😔'}</div>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: passed ? 'var(--accent3)' : 'var(--red)' }}>
          {score.toFixed(1)}%
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: passed ? 'var(--accent3)' : 'var(--red)', marginBottom: '1.5rem' }}>
          {passed ? 'مبروك! اجتزت الامتحان ✅' : 'لم تجتز الامتحان'}
        </div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'الدرجات', val: `${attempt.points_earned ?? 0} / ${attempt.total_points ?? '?'}` },
            { label: '✅ صح',   val: attempt.correct_count ?? correct, color: 'var(--accent3)' },
            { label: '❌ خطأ',  val: attempt.wrong_count  ?? wrong,   color: 'var(--red)' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color || 'var(--text)' }}>{s.val}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {attempt.passing_score && (
          <div style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--text3)' }}>
            درجة النجاح المطلوبة: {attempt.passing_score}%
          </div>
        )}
      </div>

      {/* المراجعة — بس لو allow_review=true */}
      {answers.length > 0 && allowReview ? (
        <div>
          <h3 style={{ fontFamily:"'Tajawal',sans-serif", fontSize: '1.1rem', fontWeight: 900, marginBottom: '1rem', marginTop: '2rem' }}>
            🔍 مراجعة الإجابات
          </h3>
          {answers.map((ans, i) => (
            <div key={i} style={{ ...S.answerReview, borderColor: ans.is_correct ? 'rgba(0,212,170,.3)' : 'rgba(255,79,106,.3)', background: ans.is_correct ? 'rgba(0,212,170,.05)' : 'rgba(255,79,106,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>سؤال {i + 1}</span>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: ans.is_correct ? 'var(--accent3)' : 'var(--red)' }}>
                  {ans.is_correct ? '✅ صح' : '❌ خطأ'}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: '.75rem', lineHeight: 1.6 }}>{ans.question_text}</div>

              {/* إجابة الطالب */}
              {(ans.selected_answers || []).map((sa, j) => (
                <div key={j} style={{ fontSize: '.85rem', padding: '.3rem .75rem', borderRadius: 8, marginBottom: '.3rem', background: 'var(--bg3)', color: 'var(--text2)' }}>
                  إجابتك: {sa.answer_text}
                </div>
              ))}

              {/* الإجابة الصحيحة — بس لو show_correct_answers=true وكان غلط */}
              {showCorrectAnswers && !ans.is_correct && (ans.correct_answers || []).map((ca, j) => (
                <div key={j} style={{ fontSize: '.85rem', padding: '.3rem .75rem', borderRadius: 8, marginBottom: '.3rem', background: 'rgba(0,212,170,.1)', color: 'var(--accent3)' }}>
                  ✅ الإجابة الصحيحة: {ca.answer_text}
                </div>
              ))}

              {/* الشرح */}
              {ans.explanation && (
                <div style={{ fontSize: '.82rem', color: 'var(--text3)', marginTop: '.5rem', padding: '.5rem', background: 'var(--bg3)', borderRadius: 8, borderRight: '3px solid var(--accent)' }}>
                  💡 {ans.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : answers.length > 0 && !allowReview ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 12, marginTop: '1.5rem', border: '1px solid var(--border)' }}>
          👀 مراجعة الإجابات التفصيلية غير متاحة لهذا الامتحان
        </div>
      ) : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════
const S = {
  title:       { fontFamily:"'Tajawal',sans-serif", fontSize:'1.5rem', fontWeight:900, marginBottom:'.25rem' },
  back:        { background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'.88rem', marginBottom:'1.5rem', padding:0, fontFamily:"'Cairo',sans-serif", display:'block' },
  examCard:    { display:'flex', alignItems:'center', gap:'1rem', background:'var(--surface)', border:'1px solid', borderRadius:14, padding:'1.25rem', marginBottom:'1rem', flexWrap:'wrap' },
  examIcon:    { fontSize:'2rem', width:48, height:48, background:'var(--bg3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  examHeader:  { display:'flex', alignItems:'center', gap:'1rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'1.25rem' },
  qBox:        { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.5rem', marginBottom:'1rem' },
  answerOpt:   { display:'flex', alignItems:'center', gap:'.75rem', padding:'.85rem 1rem', borderRadius:10, border:'2px solid', cursor:'pointer', transition:'all .15s' },
  resultCard:  { background:'var(--surface)', border:'2px solid', borderRadius:16, padding:'2rem', textAlign:'center', marginBottom:'2rem' },
  answerReview:{ background:'var(--surface)', border:'1px solid', borderRadius:12, padding:'1rem 1.25rem', marginBottom:'.75rem' },
}
