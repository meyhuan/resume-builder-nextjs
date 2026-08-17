import { LANGUAGE_VALUES } from '@/lib/ai/translate-schema'

export type ResumeUiLanguage = (typeof LANGUAGE_VALUES)[number]

type LabelDict = Record<string, string>

const BASE_INFO_LABELS: Record<ResumeUiLanguage, LabelDict> = {
  zh: {
    phone: '电话',
    email: '邮箱',
    gender: '性别',
    age: '年龄',
    currentLocation: '现居',
    nation: '民族',
    household: '户籍',
    workStartTime: '工作时间',
    politicalStatus: '政治面貌',
    height: '身高',
    weight: '体重',
  },
  en: {
    phone: 'Phone',
    email: 'Email',
    gender: 'Gender',
    age: 'Age',
    currentLocation: 'Location',
    nation: 'Ethnicity',
    household: 'Hometown',
    workStartTime: 'Experience',
    politicalStatus: 'Political Status',
    height: 'Height',
    weight: 'Weight',
  },
  ja: {
    phone: '電話',
    email: 'メール',
    gender: '性別',
    age: '年齢',
    currentLocation: '居住地',
    nation: '民族',
    household: '本籍',
    workStartTime: '職歴',
    politicalStatus: '政治面貌',
    height: '身長',
    weight: '体重',
  },
  ko: {
    phone: '전화',
    email: '이메일',
    gender: '성별',
    age: '나이',
    currentLocation: '거주지',
    nation: '민족',
    household: '본적',
    workStartTime: '경력',
    politicalStatus: '정치성향',
    height: '키',
    weight: '몸무게',
  },
  fr: {
    phone: 'Téléphone',
    email: 'E-mail',
    gender: 'Sexe',
    age: 'Âge',
    currentLocation: 'Ville',
    nation: 'Ethnicité',
    household: 'Origine',
    workStartTime: 'Expérience',
    politicalStatus: 'Statut politique',
    height: 'Taille',
    weight: 'Poids',
  },
  de: {
    phone: 'Telefon',
    email: 'E-Mail',
    gender: 'Geschlecht',
    age: 'Alter',
    currentLocation: 'Wohnort',
    nation: 'Ethnie',
    household: 'Heimatort',
    workStartTime: 'Erfahrung',
    politicalStatus: 'Politische Zugehörigkeit',
    height: 'Größe',
    weight: 'Gewicht',
  },
  es: {
    phone: 'Teléfono',
    email: 'Correo',
    gender: 'Género',
    age: 'Edad',
    currentLocation: 'Ubicación',
    nation: 'Etnia',
    household: 'Origen',
    workStartTime: 'Experiencia',
    politicalStatus: 'Estatus político',
    height: 'Estatura',
    weight: 'Peso',
  },
  pt: {
    phone: 'Telefone',
    email: 'E-mail',
    gender: 'Gênero',
    age: 'Idade',
    currentLocation: 'Local',
    nation: 'Etnia',
    household: 'Naturalidade',
    workStartTime: 'Experiência',
    politicalStatus: 'Status político',
    height: 'Altura',
    weight: 'Peso',
  },
  ru: {
    phone: 'Телефон',
    email: 'Почта',
    gender: 'Пол',
    age: 'Возраст',
    currentLocation: 'Город',
    nation: 'Национальность',
    household: 'Прописка',
    workStartTime: 'Опыт',
    politicalStatus: 'Полит. статус',
    height: 'Рост',
    weight: 'Вес',
  },
  ar: {
    phone: 'الهاتف',
    email: 'البريد',
    gender: 'الجنس',
    age: 'العمر',
    currentLocation: 'الموقع',
    nation: 'العرق',
    household: 'الأصل',
    workStartTime: 'الخبرة',
    politicalStatus: 'الحالة السياسية',
    height: 'الطول',
    weight: 'الوزن',
  },
}

const JOB_INTENTION_LABELS: Record<ResumeUiLanguage, LabelDict> = {
  zh: {
    position: '意向岗位',
    city: '意向城市',
    salary: '期望薪资',
    type: '求职类型',
    industry: '期望行业',
    currentStatus: '当前状态',
    sectionTitle: '求职意向',
  },
  en: {
    position: 'Desired Position',
    city: 'Desired City',
    salary: 'Expected Salary',
    type: 'Job Type',
    industry: 'Industry',
    currentStatus: 'Status',
    sectionTitle: 'Job Intention',
  },
  ja: {
    position: '希望職種',
    city: '希望勤務地',
    salary: '希望年収',
    type: '雇用形態',
    industry: '希望業界',
    currentStatus: '現状',
    sectionTitle: '志望動機',
  },
  ko: {
    position: '희망 직무',
    city: '희망 도시',
    salary: '희망 연봉',
    type: '고용 형태',
    industry: '희망 업종',
    currentStatus: '현재 상태',
    sectionTitle: '지원 직무',
  },
  fr: {
    position: 'Poste visé',
    city: 'Ville souhaitée',
    salary: 'Salaire souhaité',
    type: 'Type de poste',
    industry: 'Secteur',
    currentStatus: 'Statut',
    sectionTitle: 'Objectif',
  },
  de: {
    position: 'Wunschposition',
    city: 'Wunschort',
    salary: 'Gehaltsvorstellung',
    type: 'Anstellungsart',
    industry: 'Branche',
    currentStatus: 'Status',
    sectionTitle: 'Karriereziel',
  },
  es: {
    position: 'Puesto deseado',
    city: 'Ciudad deseada',
    salary: 'Salario esperado',
    type: 'Tipo de empleo',
    industry: 'Industria',
    currentStatus: 'Estado',
    sectionTitle: 'Objetivo laboral',
  },
  pt: {
    position: 'Cargo desejado',
    city: 'Cidade desejada',
    salary: 'Salário esperado',
    type: 'Tipo de vaga',
    industry: 'Setor',
    currentStatus: 'Status',
    sectionTitle: 'Objetivo',
  },
  ru: {
    position: 'Желаемая должность',
    city: 'Город',
    salary: 'Зарплата',
    type: 'Тип занятости',
    industry: 'Отрасль',
    currentStatus: 'Статус',
    sectionTitle: 'Цель',
  },
  ar: {
    position: 'الوظيفة المطلوبة',
    city: 'المدينة المطلوبة',
    salary: 'الراتب المتوقع',
    type: 'نوع الوظيفة',
    industry: 'المجال',
    currentStatus: 'الحالة',
    sectionTitle: 'الهدف الوظيفي',
  },
}

export function resolveResumeUiLanguage(value?: string | null): ResumeUiLanguage {
  if (value && (LANGUAGE_VALUES as readonly string[]).includes(value)) {
    return value as ResumeUiLanguage
  }
  return 'zh'
}

export function getBaseInfoFieldLabel(key: string, language?: string | null): string {
  const lang = resolveResumeUiLanguage(language)
  return BASE_INFO_LABELS[lang][key] ?? BASE_INFO_LABELS.zh[key] ?? key
}

export function getJobIntentionFieldLabel(key: string, language?: string | null): string {
  const lang = resolveResumeUiLanguage(language)
  return JOB_INTENTION_LABELS[lang][key] ?? JOB_INTENTION_LABELS.zh[key] ?? key
}

export function getJobIntentionSectionTitle(language?: string | null): string {
  return getJobIntentionFieldLabel('sectionTitle', language)
}

export function getDesiredPositionLabel(language?: string | null): string {
  return getJobIntentionFieldLabel('position', language)
}
