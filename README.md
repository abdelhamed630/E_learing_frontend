# EduVerse Frontend 🎓

فرونت احترافي مبني بـ **React + Vite** مربوط مع Django E-Learning Backend.

## 🗂️ هيكل المشروع

```
elearning-frontend/
├── src/
│   ├── api/
│   │   └── index.js          ← كل الـ API calls (axios)
│   ├── context/
│   │   └── AuthContext.jsx   ← JWT Auth state management
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── CourseCard.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Courses.jsx
│   │   ├── CourseDetail.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── Extra.jsx         ← Categories + Instructors
│   ├── hooks/
│   │   └── useToast.js
│   ├── utils.js              ← helpers + mock data
│   ├── App.jsx               ← Router + Routes
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js            ← proxy → localhost:8000
└── package.json
```

## 🚀 تشغيل المشروع

### 1. تثبيت المكتبات
```bash
npm install
```

### 2. تشغيل الفرونت
```bash
npm run dev
```
الفرونت هيشتغل على: **http://localhost:3000**

### 3. تشغيل الباك (في terminal تاني)
```bash
cd E_Learing-main
python manage.py runserver
```
الباك هيشتغل على: **http://localhost:8000**

---

## ⚙️ الـ Proxy

`vite.config.js` بيعمل proxy تلقائي:
```
/api/* → http://localhost:8000/api/*
```
يعني مش هتحتاج تتعامل مع CORS في الـ development.

## 🔗 الـ API Endpoints المربوطة

| الـ Module | الـ Endpoints |
|------------|--------------|
| Accounts | `/api/accounts/login/`, `/register/`, `/profile/` ... |
| Courses | `/api/courses/courses/`, `/categories/`, `/videos/` |
| Students | `/api/students/` |
| Instructors | `/api/instructors/` |
| Enrollments | `/api/enrollments/enrollments/`, `/progress/`, `/certificates/` |
| Exams | `/api/exams/` |
| Payments | `/api/payments/payments/`, `/coupons/`, `/refunds/` |
| Notifications | `/api/notifications/notifications/`, `/announcements/` |

## 📄 الصفحات

- `/` — الرئيسية (Hero + Courses + Categories)
- `/courses` — كل الكورسات مع بحث وفلتر
- `/courses/:id` — تفاصيل كورس + التسجيل
- `/categories` — جميع التصنيفات
- `/instructors` — المدربون
- `/login` — تسجيل دخول / إنشاء حساب / نسيت كلمة المرور
- `/dashboard` — لوحة التحكم (محمية بـ JWT)
- `/dashboard/:panel` — overview, my-courses, notifications, exams, payments, profile, settings
