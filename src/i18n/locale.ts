export const SUPPORTED_LOCALES = ['en', 'fr', 'pl', 'de', 'it', 'tr', 'es', 'cs', 'ru', 'ar', 'ur'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const LOCALE_STORAGE_KEY = 'safer_locale_v1';

export const LOCALE_OPTIONS: ReadonlyArray<{value: SupportedLocale; label: string; nativeName: string; direction: 'ltr' | 'rtl'}> = [
  {value:'en',label:'English',nativeName:'English',direction:'ltr'},
  {value:'fr',label:'French',nativeName:'Français',direction:'ltr'},
  {value:'pl',label:'Polish',nativeName:'Polski',direction:'ltr'},
  {value:'de',label:'German',nativeName:'Deutsch',direction:'ltr'},
  {value:'it',label:'Italian',nativeName:'Italiano',direction:'ltr'},
  {value:'tr',label:'Turkish',nativeName:'Türkçe',direction:'ltr'},
  {value:'es',label:'Spanish',nativeName:'Español',direction:'ltr'},
  {value:'cs',label:'Czech',nativeName:'Čeština',direction:'ltr'},
  {value:'ru',label:'Russian',nativeName:'Русский',direction:'ltr'},
  {value:'ar',label:'Arabic',nativeName:'العربية',direction:'rtl'},
  {value:'ur',label:'Urdu',nativeName:'اردو',direction:'rtl'},
];

const EN = {
  login:'Log In', createAccount:'Create Account', resetPassword:'Reset Password',
  continueGoogle:'Continue with Google', continueDemo:'Continue as Demo Guest',
  email:'Email address', password:'Password', confirmPassword:'Confirm password',
  verifyEmail:'Verify your email', dashboard:'Dashboard', personnel:'Personnel Readiness',
  incidents:'Incident Reports', cybersecurity:'Cybersecurity Hygiene',
  checklist:'Pre-Deployment Checklist', section:'Section:', toggleNavigation:'Toggle navigation menu',
  myAccount:'My Account', profile:'Profile', preferences:'Preferences', dataPrivacy:'Data & privacy',
  regionalPreferences:'Regional preferences', displayName:'Display name', callSign:'Call sign',
  shortBio:'Short bio', dateFormat:'Date format', timeFormat:'Time format',
  timezone:'Timezone', numberFormat:'Number format', language:'Language',
  savePreferences:'Save preferences', close:'Close', accountSecurity:'Account profile & security',
  logout:'Log Out', checkingSession:'Checking SAFER account session…',
  membership:'Organisation membership', verifyMembership:'Verify membership',
};
const TRANSLATIONS: Record<SupportedLocale, Partial<typeof EN>> = {
  en: EN,
  fr: {login:'Se connecter',createAccount:'Créer un compte',resetPassword:'Réinitialiser le mot de passe',continueGoogle:'Continuer avec Google',continueDemo:'Continuer comme invité de démonstration',email:'Adresse e-mail',password:'Mot de passe',confirmPassword:'Confirmer le mot de passe',verifyEmail:'Vérifiez votre adresse e-mail',dashboard:'Tableau de bord',personnel:'État du personnel',incidents:'Rapports d’incident',cybersecurity:'Hygiène de cybersécurité',checklist:'Liste de contrôle préalable au déploiement',section:'Section :',myAccount:'Mon compte',profile:'Profil',preferences:'Préférences',dataPrivacy:'Données et confidentialité',regionalPreferences:'Préférences régionales',language:'Langue',savePreferences:'Enregistrer les préférences',close:'Fermer',logout:'Se déconnecter'},
  pl: {login:'Zaloguj się',createAccount:'Utwórz konto',resetPassword:'Zresetuj hasło',continueGoogle:'Kontynuuj z Google',continueDemo:'Kontynuuj jako gość demonstracyjny',email:'Adres e-mail',password:'Hasło',confirmPassword:'Potwierdź hasło',verifyEmail:'Zweryfikuj adres e-mail',dashboard:'Pulpit',personnel:'Gotowość personelu',incidents:'Raporty o incydentach',cybersecurity:'Higiena cyberbezpieczeństwa',checklist:'Lista kontrolna przed wdrożeniem',section:'Sekcja:',myAccount:'Moje konto',profile:'Profil',preferences:'Preferencje',dataPrivacy:'Dane i prywatność',regionalPreferences:'Preferencje regionalne',language:'Język',savePreferences:'Zapisz preferencje',close:'Zamknij',logout:'Wyloguj się'},
  de: {login:'Anmelden',createAccount:'Konto erstellen',resetPassword:'Passwort zurücksetzen',continueGoogle:'Mit Google fortfahren',continueDemo:'Als Demo-Gast fortfahren',email:'E-Mail-Adresse',password:'Passwort',confirmPassword:'Passwort bestätigen',verifyEmail:'E-Mail-Adresse bestätigen',dashboard:'Übersicht',personnel:'Personalbereitschaft',incidents:'Vorfallberichte',cybersecurity:'Cybersecurity-Hygiene',checklist:'Checkliste vor dem Einsatz',section:'Bereich:',myAccount:'Mein Konto',profile:'Profil',preferences:'Einstellungen',dataPrivacy:'Daten & Datenschutz',regionalPreferences:'Regionale Einstellungen',language:'Sprache',savePreferences:'Einstellungen speichern',close:'Schließen',logout:'Abmelden'},
  it: {login:'Accedi',createAccount:'Crea account',resetPassword:'Reimposta password',continueGoogle:'Continua con Google',continueDemo:'Continua come ospite demo',email:'Indirizzo e-mail',password:'Password',confirmPassword:'Conferma password',verifyEmail:'Verifica la tua e-mail',dashboard:'Dashboard',personnel:'Prontezza del personale',incidents:'Rapporti sugli incidenti',cybersecurity:'Igiene informatica',checklist:'Lista di controllo pre-distribuzione',section:'Sezione:',myAccount:'Il mio account',profile:'Profilo',preferences:'Preferenze',dataPrivacy:'Dati e privacy',regionalPreferences:'Preferenze regionali',language:'Lingua',savePreferences:'Salva preferenze',close:'Chiudi',logout:'Esci'},
  tr: {login:'Giriş yap',createAccount:'Hesap oluştur',resetPassword:'Şifreyi sıfırla',continueGoogle:'Google ile devam et',continueDemo:'Demo misafiri olarak devam et',email:'E-posta adresi',password:'Şifre',confirmPassword:'Şifreyi doğrula',verifyEmail:'E-postanızı doğrulayın',dashboard:'Kontrol paneli',personnel:'Personel hazırlığı',incidents:'Olay raporları',cybersecurity:'Siber güvenlik hijyeni',checklist:'Görev öncesi kontrol listesi',section:'Bölüm:',myAccount:'Hesabım',profile:'Profil',preferences:'Tercihler',dataPrivacy:'Veri ve gizlilik',regionalPreferences:'Bölgesel tercihler',language:'Dil',savePreferences:'Tercihleri kaydet',close:'Kapat',logout:'Çıkış yap'},
  es: {login:'Iniciar sesión',createAccount:'Crear cuenta',resetPassword:'Restablecer contraseña',continueGoogle:'Continuar con Google',continueDemo:'Continuar como invitado de demostración',email:'Correo electrónico',password:'Contraseña',confirmPassword:'Confirmar contraseña',verifyEmail:'Verifica tu correo electrónico',dashboard:'Panel',personnel:'Preparación del personal',incidents:'Informes de incidentes',cybersecurity:'Higiene de ciberseguridad',checklist:'Lista de verificación previa al despliegue',section:'Sección:',myAccount:'Mi cuenta',profile:'Perfil',preferences:'Preferencias',dataPrivacy:'Datos y privacidad',regionalPreferences:'Preferencias regionales',language:'Idioma',savePreferences:'Guardar preferencias',close:'Cerrar',logout:'Cerrar sesión'},
  cs: {login:'Přihlásit se',createAccount:'Vytvořit účet',resetPassword:'Obnovit heslo',continueGoogle:'Pokračovat přes Google',continueDemo:'Pokračovat jako demonstrační host',email:'E-mailová adresa',password:'Heslo',confirmPassword:'Potvrdit heslo',verifyEmail:'Ověřte svůj e-mail',dashboard:'Přehled',personnel:'Připravenost personálu',incidents:'Hlášení incidentů',cybersecurity:'Kybernetická hygiena',checklist:'Kontrolní seznam před nasazením',section:'Sekce:',myAccount:'Můj účet',profile:'Profil',preferences:'Předvolby',dataPrivacy:'Data a soukromí',regionalPreferences:'Místní předvolby',language:'Jazyk',savePreferences:'Uložit předvolby',close:'Zavřít',logout:'Odhlásit se'},
  ru: {login:'Войти',createAccount:'Создать аккаунт',resetPassword:'Сбросить пароль',continueGoogle:'Продолжить с Google',continueDemo:'Продолжить как демонстрационный гость',email:'Адрес электронной почты',password:'Пароль',confirmPassword:'Подтвердите пароль',verifyEmail:'Подтвердите адрес электронной почты',dashboard:'Панель управления',personnel:'Готовность персонала',incidents:'Отчёты об инцидентах',cybersecurity:'Кибергигиена',checklist:'Контрольный список перед развёртыванием',section:'Раздел:',myAccount:'Мой аккаунт',profile:'Профиль',preferences:'Настройки',dataPrivacy:'Данные и конфиденциальность',regionalPreferences:'Региональные настройки',language:'Язык',savePreferences:'Сохранить настройки',close:'Закрыть',logout:'Выйти'},
  ar: {login:'تسجيل الدخول',createAccount:'إنشاء حساب',resetPassword:'إعادة تعيين كلمة المرور',continueGoogle:'المتابعة باستخدام Google',continueDemo:'المتابعة كضيف تجريبي',email:'عنوان البريد الإلكتروني',password:'كلمة المرور',confirmPassword:'تأكيد كلمة المرور',verifyEmail:'تحقق من بريدك الإلكتروني',dashboard:'لوحة التحكم',personnel:'جاهزية الموظفين',incidents:'تقارير الحوادث',cybersecurity:'النظافة السيبرانية',checklist:'قائمة التحقق قبل النشر',section:'القسم:',myAccount:'حسابي',profile:'الملف الشخصي',preferences:'التفضيلات',dataPrivacy:'البيانات والخصوصية',regionalPreferences:'التفضيلات الإقليمية',language:'اللغة',savePreferences:'حفظ التفضيلات',close:'إغلاق',logout:'تسجيل الخروج'},
  ur: {login:'لاگ اِن',createAccount:'اکاؤنٹ بنائیں',resetPassword:'پاس ورڈ دوبارہ ترتیب دیں',continueGoogle:'Google کے ساتھ جاری رکھیں',continueDemo:'ڈیمو مہمان کے طور پر جاری رکھیں',email:'ای میل پتہ',password:'پاس ورڈ',confirmPassword:'پاس ورڈ کی تصدیق کریں',verifyEmail:'اپنی ای میل کی تصدیق کریں',dashboard:'ڈیش بورڈ',personnel:'عملے کی تیاری',incidents:'واقعات کی رپورٹس',cybersecurity:'سائبر سکیورٹی حفظانِ صحت',checklist:'تعیناتی سے پہلے کی فہرست',section:'سیکشن:',myAccount:'میرا اکاؤنٹ',profile:'پروفائل',preferences:'ترجیحات',dataPrivacy:'ڈیٹا اور رازداری',regionalPreferences:'علاقائی ترجیحات',language:'زبان',savePreferences:'ترجیحات محفوظ کریں',close:'بند کریں',logout:'لاگ آؤٹ'},
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
export function getLocale(): SupportedLocale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : 'en';
  } catch { return 'en'; }
}
export function setLocale(locale: SupportedLocale): void {
  try { window.localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* optional preference */ }
  try {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' || locale === 'ur' ? 'rtl' : 'ltr';
    window.dispatchEvent(new CustomEvent('safer:preferences-changed'));
  } catch { /* server-side or restricted browser */ }
}
export function localeDirection(locale: SupportedLocale = getLocale()): 'ltr' | 'rtl' {
  return locale === 'ar' || locale === 'ur' ? 'rtl' : 'ltr';
}
export function translate(key: keyof typeof EN, locale: SupportedLocale = getLocale()): string {
  return TRANSLATIONS[locale][key] || EN[key];
}
export function applyLocaleDocumentSettings(): void {
  const locale = getLocale();
  try {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  } catch { /* server-side */ }
}
