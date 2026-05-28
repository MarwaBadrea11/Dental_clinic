# SmileFix Patient App 🦷

تطبيق موبايل للمرضى لحجز مواعيد العيادة بذكاء ومنع تضارب الجدولة.

## Tech Stack
- **React Native** + **Expo Go** + **TypeScript**
- **Design System:** Clinical Serenity
- **Navigation:** React Navigation v7 (Stack + Bottom Tabs)
- **State:** Zustand
- **i18n:** Arabic (RTL) primary, English secondary

## Project Structure
```
src/
├── constants/
│   ├── theme.ts          # Colors, Typography, Spacing, Radius, Shadows
│   └── i18n.ts           # Arabic + English translations
├── hooks/
│   └── useTranslation.ts # RTL-aware translation hook
├── navigation/
│   └── AppNavigator.tsx  # Auth Stack + Main Tab Navigator
├── screens/
│   ├── LoginScreen.tsx       # Phone + Password/OTP login
│   ├── RegisterScreen.tsx    # 2-step patient registration
│   ├── HomeScreen.tsx        # Dashboard + next appointment
│   ├── BookingScreen.tsx     # Smart 4-step booking with conflict detection
│   ├── AppointmentsScreen.tsx # Upcoming/Past appointments
│   ├── ProfileScreen.tsx     # Patient profile + settings
│   └── QRScreen.tsx          # QR code for app sharing
└── store/
    └── appStore.ts       # Zustand global state + business rules
```

## تشغيل المشروع

```bash
cd smilefix-patient-app
npx expo start
```

ثم افتح تطبيق **Expo Go** على هاتفك وامسح الـ QR Code.

## Business Rules المطبقة
- ✅ منع تضارب المواعيد (conflict detection في `hasConflict`)
- ✅ الأوقات المتعارضة تظهر باللون الرمادي وغير قابلة للاختيار
- ✅ البيانات لا تُحذف بل تُرشف (`isArchived: true`)
- ✅ دعم RTL كامل للعربية
- ✅ تبديل اللغة من شاشة الملف الشخصي
