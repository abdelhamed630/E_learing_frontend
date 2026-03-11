export const formatPrice = (p) => {
  if (!p || parseFloat(p) === 0) return 'مجاني'
  return parseFloat(p).toFixed(0) + ' ج.م'
}

export const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ar-EG') } catch { return d }
}

export const levelLabel = (l) =>
  ({ beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }[l] || l || '')

export const roleLabel = (r) =>
  ({ student: 'طالب', instructor: 'مدرب', admin: 'مدير' }[r] || r || '')

export const payStatus = (s) => {
  const map = {
    completed: { label: 'مكتمل',  cls: 'badge-green' },
    pending:   { label: 'معلق',   cls: 'badge-gold'  },
    failed:    { label: 'فشل',    cls: 'badge-red'   },
    refunded:  { label: 'مسترد',  cls: 'badge-blue'  },
  }
  return map[s] || { label: s || '—', cls: 'badge-blue' }
}

export const courseEmoji = (name = '') => {
  const n = name.toLowerCase()
  if (n.includes('python') || n.includes('برمجة')) return '🐍'
  if (n.includes('web') || n.includes('ويب')) return '🌐'
  if (n.includes('design') || n.includes('تصميم')) return '🎨'
  if (n.includes('data') || n.includes('بيانات')) return '📊'
  if (n.includes('mobile') || n.includes('موبايل')) return '📱'
  if (n.includes('ai') || n.includes('ذكاء')) return '🤖'
  if (n.includes('market') || n.includes('تسويق')) return '📈'
  if (n.includes('english') || n.includes('لغة')) return '🌍'
  return '🎓'
}

export const MOCK_COURSES = [
  { id:1, title:'تطوير مواقع الويب من الصفر', category:{name:'برمجة'}, level:'beginner', language:'ar', price:299, discount_price:149, students_count:1240, rating:4.8, duration_hours:40, instructor_name:'أحمد محمد' },
  { id:2, title:'Python للمبتدئين إلى الاحترافيين', category:{name:'برمجة'}, level:'beginner', language:'ar', price:199, discount_price:null, students_count:980, rating:4.9, duration_hours:30, instructor_name:'محمد علي' },
  { id:3, title:'تصميم UI/UX الاحترافي', category:{name:'تصميم'}, level:'intermediate', language:'ar', price:249, discount_price:189, students_count:750, rating:4.7, duration_hours:25, instructor_name:'سارة أحمد' },
  { id:4, title:'Data Science مع Python', category:{name:'علوم البيانات'}, level:'advanced', language:'ar', price:399, discount_price:299, students_count:560, rating:4.8, duration_hours:60, instructor_name:'عمر خالد' },
  { id:5, title:'تطوير تطبيقات الموبايل', category:{name:'برمجة'}, level:'intermediate', language:'ar', price:0, discount_price:null, students_count:420, rating:4.6, duration_hours:35, instructor_name:'يوسف سامي' },
  { id:6, title:'التسويق الرقمي الشامل', category:{name:'تسويق'}, level:'beginner', language:'ar', price:179, discount_price:99, students_count:890, rating:4.5, duration_hours:20, instructor_name:'نور حسن' },
]

export const MOCK_CATS = [
  { id:1, name:'برمجة', icon:'💻', courses_count:45 },
  { id:2, name:'تصميم', icon:'🎨', courses_count:28 },
  { id:3, name:'تسويق', icon:'📈', courses_count:19 },
  { id:4, name:'علوم البيانات', icon:'📊', courses_count:22 },
  { id:5, name:'لغات', icon:'🌍', courses_count:14 },
  { id:6, name:'أعمال', icon:'💼', courses_count:31 },
  { id:7, name:'ذكاء اصطناعي', icon:'🤖', courses_count:17 },
  { id:8, name:'أمن معلومات', icon:'🔐', courses_count:12 },
]

// ── Image URL helper ──────────────────────────────
const _BASE = typeof window !== 'undefined'
  ? (window.__VITE_API_BASE__ || '')
  : ''

export function getImgUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // strip leading slash if base already has trailing slash
  const base = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '')
  return base + (url.startsWith('/') ? url : '/' + url)
}
