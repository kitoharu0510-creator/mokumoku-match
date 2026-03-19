/**
 * MOKUMOKU MATCH — Preview Server
 * MongoDB不要・インメモリデータ・port 3002
 * 管理者PW: preview
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const app  = express();
const PORT = 3002;
const JWT_SECRET = 'preview-secret-key-mokumoku-match';

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// ============================================
// In-Memory Database
// ============================================

const db = {
  stores: [],
  jobs: [],
  tags: [],
  applications: [],
  inquiries: [],
  admins: [],
};

// ID generator
let _id = 1000;
const newId = () => String(++_id);

// ============================================
// Dummy Data: Tags
// ============================================
const TAGS = [
  // area
  { id: 't1',  category: 'area',          name: '渋谷' },
  { id: 't2',  category: 'area',          name: '新宿' },
  { id: 't3',  category: 'area',          name: '六本木' },
  { id: 't4',  category: 'area',          name: '池袋' },
  { id: 't5',  category: 'area',          name: '恵比寿' },
  { id: 't6',  category: 'area',          name: '銀座' },
  { id: 't7',  category: 'area',          name: '新橋' },
  { id: 't8',  category: 'area',          name: '横浜' },
  // atmosphere
  { id: 't10', category: 'atmosphere',    name: 'チル' },
  { id: 't11', category: 'atmosphere',    name: '落ち着き' },
  { id: 't12', category: 'atmosphere',    name: 'ワイワイ' },
  { id: 't13', category: 'atmosphere',    name: '高級感' },
  { id: 't14', category: 'atmosphere',    name: '隠れ家' },
  { id: 't15', category: 'atmosphere',    name: 'カフェ風' },
  // clientele
  { id: 't20', category: 'clientele',     name: '一人客多め' },
  { id: 't21', category: 'clientele',     name: '20代中心' },
  { id: 't22', category: 'clientele',     name: '外国人来店あり' },
  { id: 't23', category: 'clientele',     name: '常連多め' },
  { id: 't24', category: 'clientele',     name: '女性客多め' },
  { id: 't25', category: 'clientele',     name: '接待利用多め' },
  { id: 't26', category: 'clientele',     name: '学生多め' },
  // workStyle
  { id: 't30', category: 'workStyle',     name: '未経験歓迎' },
  { id: 't31', category: 'workStyle',     name: '週2日〜OK' },
  { id: 't32', category: 'workStyle',     name: '深夜OK' },
  { id: 't33', category: 'workStyle',     name: 'シーシャ研修あり' },
  { id: 't34', category: 'workStyle',     name: '副業OK' },
  { id: 't35', category: 'workStyle',     name: '長期歓迎' },
  { id: 't36', category: 'workStyle',     name: '外国語歓迎' },
  // shishaElements
  { id: 't40', category: 'shishaElements', name: 'フレーバー豊富' },
  { id: 't41', category: 'shishaElements', name: 'ミックス自由' },
  { id: 't42', category: 'shishaElements', name: 'ノンニコチンあり' },
  { id: 't43', category: 'shishaElements', name: 'KM使用' },
  { id: 't44', category: 'shishaElements', name: 'Khalil Mamoon' },
  { id: 't45', category: 'shishaElements', name: '希少フレーバー' },
];

TAGS.forEach(t => db.tags.push(t));

// ============================================
// Dummy Data: Stores (8件)
// ============================================
const STORES_DATA = [
  {
    id: 's1',
    name: 'CLOUD LOUNGE',
    description: '渋谷の喧騒を離れた隠れ家シーシャラウンジ。チルな音楽と落ち着いた照明で、日常から切り離されたひとときを提供します。一人でのんびり過ごすのに最適な空間です。',
    area: '渋谷',
    prefecture: '東京都',
    station: '渋谷駅',
    address: '東京都渋谷区道玄坂1-2-3 CLOUDビル2F',
    atmosphere: ['チル', '落ち着き'],
    clientele: ['一人客多め', '20代中心'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 80, mixFreedom: '自由', equipment: 'KM使用', nonNicotine: true, training: true },
    sns: { instagram: '@cloud_lounge_shibuya', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2',
    name: 'SMOKE & ROLL',
    description: '新宿エリア最大級のシーシャバー。DJブースを完備し、週末は音楽好きが集まる賑やかな雰囲気。フレーバーの種類は100種以上を誇ります。',
    area: '新宿',
    prefecture: '東京都',
    station: '新宿駅',
    address: '東京都新宿区歌舞伎町2-5-8 ROLLビル3F',
    atmosphere: ['ワイワイ'],
    clientele: ['20代中心'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 100, mixFreedom: '自由', equipment: 'Khalil Mamoon', nonNicotine: true, training: true },
    sns: { instagram: '@smoke_roll_shinjuku', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3',
    name: 'KIRI LOUNGE',
    description: '六本木の高層ビルに佇む高級シーシャラウンジ。外国人客も多く訪れる国際的な空間で、厳選されたフレーバーと上品なサービスを提供しています。',
    area: '六本木',
    prefecture: '東京都',
    station: '六本木駅',
    address: '東京都港区六本木6-1-5 KIRIタワー5F',
    atmosphere: ['高級感', '落ち着き'],
    clientele: ['外国人来店あり', '接待利用多め'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 60, mixFreedom: '要相談', equipment: 'KM使用', nonNicotine: true, training: true },
    sns: { instagram: '@kiri_lounge_roppongi', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's4',
    name: '煙草屋',
    description: '池袋の路地裏に佇む隠れ家系シーシャ専門店。常連客を中心にアットホームな雰囲気で営業。店主こだわりの希少フレーバーが揃っています。',
    area: '池袋',
    prefecture: '東京都',
    station: '池袋駅',
    address: '東京都豊島区池袋2-3-7 裏路地1F',
    atmosphere: ['隠れ家', 'チル'],
    clientele: ['常連多め', '一人客多め'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 50, mixFreedom: '自由', equipment: 'KM使用', nonNicotine: false, training: false },
    sns: { instagram: '@tabakoya_ikebukuro', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's5',
    name: 'FLAIR SHISHA',
    description: '恵比寿の女性に人気のカフェ系シーシャバー。おしゃれな内装と女性スタッフ多数で居心地抜群。フレーバーはフルーツ・スイーツ系が充実しています。',
    area: '恵比寿',
    prefecture: '東京都',
    station: '恵比寿駅',
    address: '東京都渋谷区恵比寿西1-8-3 FLAIRビル2F',
    atmosphere: ['カフェ風', 'チル'],
    clientele: ['女性客多め', '20代中心'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 70, mixFreedom: '自由', equipment: 'Khalil Mamoon', nonNicotine: true, training: true },
    sns: { instagram: '@flair_shisha_ebisu', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's6',
    name: 'MIST BAR',
    description: '銀座の一等地に位置する最高級シーシャラウンジ。ビジネス接待からカップルまで幅広く利用される洗練された空間。厳選されたウィスキーとシーシャのペアリングが人気。',
    area: '銀座',
    prefecture: '東京都',
    station: '銀座駅',
    address: '東京都中央区銀座4-9-2 MISTビル6F',
    atmosphere: ['高級感', '落ち着き'],
    clientele: ['接待利用多め', '常連多め'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 45, mixFreedom: '要相談', equipment: 'KM使用', nonNicotine: false, training: true },
    sns: { instagram: '@mist_bar_ginza', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's7',
    name: '煙',
    description: '新橋サラリーマン御用達の隠れ家シーシャスポット。仕事帰りのリラックスタイムに最適な庶民的な価格設定と温かみのある接客が評判。',
    area: '新橋',
    prefecture: '東京都',
    station: '新橋駅',
    address: '東京都港区新橋2-11-4 けむりビル地下1F',
    atmosphere: ['隠れ家', '落ち着き'],
    clientele: ['常連多め', '一人客多め'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 40, mixFreedom: '自由', equipment: 'KM使用', nonNicotine: true, training: false },
    sns: { instagram: '@kemuri_shimbashi', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's8',
    name: 'SHISHA PARK',
    description: '横浜みなとみらいエリアの開放的な大型シーシャバー。テラス席からは港の夜景を望め、若者グループに人気。学生割引あり。',
    area: '横浜',
    prefecture: '神奈川県',
    station: '桜木町駅',
    address: '神奈川県横浜市中区新港1-5-2 PARKビル3F',
    atmosphere: ['ワイワイ', 'カフェ風'],
    clientele: ['20代中心', '学生多め'],
    mainPhoto: '',
    photos: [],
    shishaInfo: { flavorCount: 90, mixFreedom: '自由', equipment: 'Khalil Mamoon', nonNicotine: true, training: true },
    sns: { instagram: '@shisha_park_yokohama', tiktok: '', website: '' },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

STORES_DATA.forEach(s => db.stores.push(s));

// ============================================
// Dummy Data: Jobs (15件)
// ============================================
const JOBS_DATA = [
  // CLOUD LOUNGE
  {
    id: 'j1',
    storeId: 's1',
    title: 'シーシャスタッフ（ホール・調理補助）',
    employmentType: 'アルバイト',
    salary: '時給1,400円〜1,700円',
    salaryMin: 1400, salaryMax: 1700,
    hours: '18:00〜翌3:00（シフト制）',
    workDays: '週2日〜OK',
    description: 'シーシャのセッティングからホールサービスまでお任せします。未経験でも研修制度が充実しているので安心してスタートできます。チルな雰囲気のお店で一緒に働きましょう！',
    requirements: '18歳以上（深夜シフトは20歳以上）/ シーシャ好き歓迎',
    benefits: '交通費支給・シーシャ無料・まかない有',
    area: '渋谷',
    prefecture: '東京都',
    tags: {
      atmosphere: ['チル', '落ち着き'],
      clientele: ['一人客多め'],
      workStyle: ['未経験歓迎', '週2日〜OK', 'シーシャ研修あり'],
      shishaElements: ['フレーバー豊富', 'KM使用'],
    },
    isFeatured: true,
    isActive: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  // SMOKE & ROLL
  {
    id: 'j2',
    storeId: 's2',
    title: 'ホールスタッフ・DJナイト担当',
    employmentType: 'アルバイト',
    salary: '時給1,500円〜1,900円',
    salaryMin: 1500, salaryMax: 1900,
    hours: '20:00〜翌5:00（週末メイン）',
    workDays: '週1日〜（週末歓迎）',
    description: '新宿最大級のシーシャバーで一緒に盛り上げてくれるスタッフ募集！DJイベント時はフロアを盛り上げながらサービス。音楽好き・シーシャ好き大歓迎。',
    requirements: '20歳以上 / 体力に自信のある方 / コミュ力高め',
    benefits: '交通費支給・シーシャ無料・深夜手当あり',
    area: '新宿',
    prefecture: '東京都',
    tags: {
      atmosphere: ['ワイワイ'],
      clientele: ['20代中心'],
      workStyle: ['深夜OK', '副業OK'],
      shishaElements: ['フレーバー豊富', 'ミックス自由'],
    },
    isFeatured: true,
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'j3',
    storeId: 's2',
    title: 'シーシャマスター（正社員）',
    employmentType: '正社員',
    salary: '月給26万円〜35万円',
    salaryMin: 260000, salaryMax: 350000,
    hours: '16:00〜翌2:00（シフト制）',
    workDays: '週5日',
    description: 'フレーバー管理からスタッフ教育まで担当するシーシャマスターを募集。100種以上のフレーバーを駆使した接客経験がある方歓迎。店舗マネジメントも徐々にお任せします。',
    requirements: 'シーシャバー経験2年以上 / 管理職候補',
    benefits: '社保完備・交通費全額支給・シーシャ無料・賞与年2回',
    area: '新宿',
    prefecture: '東京都',
    tags: {
      atmosphere: ['ワイワイ'],
      clientele: ['20代中心'],
      workStyle: ['長期歓迎'],
      shishaElements: ['フレーバー豊富', 'ミックス自由'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // KIRI LOUNGE
  {
    id: 'j4',
    storeId: 's3',
    title: '英語対応可能なシーシャスタッフ',
    employmentType: 'アルバイト',
    salary: '時給1,600円〜2,000円',
    salaryMin: 1600, salaryMax: 2000,
    hours: '19:00〜翌2:00（シフト制）',
    workDays: '週2日〜',
    description: '外国人ゲストが多い六本木の高級ラウンジ。英語での接客ができる方優遇。インターナショナルな環境で働きたい方にぴったりです。',
    requirements: '英語日常会話以上 / 高級感のある接客ができる方',
    benefits: '交通費支給・英語手当あり・シーシャ無料',
    area: '六本木',
    prefecture: '東京都',
    tags: {
      atmosphere: ['高級感', '落ち着き'],
      clientele: ['外国人来店あり'],
      workStyle: ['外国語歓迎'],
      shishaElements: ['KM使用', '希少フレーバー'],
    },
    isFeatured: true,
    isActive: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'j5',
    storeId: 's3',
    title: 'バーテンダー兼シーシャスタッフ',
    employmentType: '業務委託',
    salary: '時給2,000円〜（能力次第）',
    salaryMin: 2000, salaryMax: 3000,
    hours: '18:00〜翌3:00',
    workDays: '週3日〜',
    description: 'カクテルとシーシャの両方のスキルを活かせる稀有なポジション。高級ラウンジで質の高いサービスを提供したい経験者求む。',
    requirements: 'バーテンダー経験・シーシャ経験ともに1年以上',
    benefits: 'インセンティブあり・シーシャ無料',
    area: '六本木',
    prefecture: '東京都',
    tags: {
      atmosphere: ['高級感'],
      clientele: ['外国人来店あり', '接待利用多め'],
      workStyle: ['副業OK', '長期歓迎'],
      shishaElements: ['希少フレーバー', 'KM使用'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  // 煙草屋
  {
    id: 'j6',
    storeId: 's4',
    title: 'シーシャスタッフ（未経験大歓迎）',
    employmentType: 'アルバイト',
    salary: '時給1,200円〜1,500円',
    salaryMin: 1200, salaryMax: 1500,
    hours: '17:00〜翌1:00（応相談）',
    workDays: '週2日〜OK',
    description: '隠れ家系の小さなお店なので、アットホームな環境でシーシャを学べます。オーナーが丁寧に教えるので、まったくの未経験でも安心。シーシャが好きな方なら大歓迎！',
    requirements: '18歳以上 / シーシャが好きな方 / 長期歓迎',
    benefits: '交通費支給・シーシャ無料・まかないあり',
    area: '池袋',
    prefecture: '東京都',
    tags: {
      atmosphere: ['隠れ家', 'チル'],
      clientele: ['常連多め'],
      workStyle: ['未経験歓迎', '週2日〜OK', 'シーシャ研修あり'],
      shishaElements: ['希少フレーバー', 'ミックス自由'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  // FLAIR SHISHA
  {
    id: 'j7',
    storeId: 's5',
    title: 'カフェシーシャスタッフ（女性活躍中）',
    employmentType: 'アルバイト',
    salary: '時給1,350円〜1,600円',
    salaryMin: 1350, salaryMax: 1600,
    hours: '12:00〜23:00（ランチ・夕方シフトあり）',
    workDays: '週2日〜',
    description: 'カフェ感覚で働けるシーシャバー。女性スタッフ多数で働きやすい環境です。昼から夜まで幅広いシフトがあり、学生や主婦（夫）にも人気。',
    requirements: '18歳以上 / 接客経験あると尚可',
    benefits: '交通費支給・シーシャ無料・女性専用休憩室あり',
    area: '恵比寿',
    prefecture: '東京都',
    tags: {
      atmosphere: ['カフェ風', 'チル'],
      clientele: ['女性客多め'],
      workStyle: ['未経験歓迎', '週2日〜OK', '副業OK'],
      shishaElements: ['フレーバー豊富', 'ノンニコチンあり'],
    },
    isFeatured: true,
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'j8',
    storeId: 's5',
    title: 'SNS運用担当・シーシャスタッフ（兼任）',
    employmentType: 'アルバイト',
    salary: '時給1,500円〜1,800円',
    salaryMin: 1500, salaryMax: 1800,
    hours: '14:00〜21:00',
    workDays: '週3日〜',
    description: 'Instagramの投稿・撮影もお任せしたいシーシャスタッフ募集。おしゃれな空間でコンテンツ制作も楽しめます。SNS運営経験がある方は時給優遇します。',
    requirements: 'Instagram運用経験 / おしゃれな写真が撮れる方',
    benefits: '交通費支給・機材貸出あり・シーシャ無料',
    area: '恵比寿',
    prefecture: '東京都',
    tags: {
      atmosphere: ['カフェ風'],
      clientele: ['女性客多め', '20代中心'],
      workStyle: ['副業OK', '週2日〜OK'],
      shishaElements: ['ノンニコチンあり'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  // MIST BAR
  {
    id: 'j9',
    storeId: 's6',
    title: 'ラウンジスタッフ（シーシャ担当）',
    employmentType: 'アルバイト',
    salary: '時給1,800円〜2,200円',
    salaryMin: 1800, salaryMax: 2200,
    hours: '18:00〜翌2:00',
    workDays: '週2日〜',
    description: '銀座の高級ラウンジで洗練されたサービスを提供するスタッフを募集。シーシャの知識はもちろん、VIPゲストへの上質な接客ができる方を求めています。',
    requirements: '接客業経験1年以上 / 清潔感のある方 / 丁寧な言葉遣いができる方',
    benefits: '交通費支給・制服貸与・シーシャ無料・インセンティブあり',
    area: '銀座',
    prefecture: '東京都',
    tags: {
      atmosphere: ['高級感', '落ち着き'],
      clientele: ['接待利用多め'],
      workStyle: ['長期歓迎'],
      shishaElements: ['KM使用'],
    },
    isFeatured: true,
    isActive: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'j10',
    storeId: 's6',
    title: 'ラウンジマネージャー候補（正社員）',
    employmentType: '正社員',
    salary: '月給30万円〜45万円',
    salaryMin: 300000, salaryMax: 450000,
    hours: '17:00〜翌3:00（シフト制）',
    workDays: '週5日',
    description: '将来的にマネージャーとして店舗を牽引していただくポジション。シーシャ業界または飲食業界での管理職経験がある方優遇。銀座の旗艦店を一緒に育てましょう。',
    requirements: '飲食店管理職経験2年以上 / シーシャ経験あれば尚可',
    benefits: '社保完備・交通費全額支給・年間休日110日・シーシャ無料',
    area: '銀座',
    prefecture: '東京都',
    tags: {
      atmosphere: ['高級感', '落ち着き'],
      clientele: ['接待利用多め', '常連多め'],
      workStyle: ['長期歓迎'],
      shishaElements: ['KM使用', '希少フレーバー'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  // 煙
  {
    id: 'j11',
    storeId: 's7',
    title: 'シーシャスタッフ（副業OK）',
    employmentType: 'アルバイト',
    salary: '時給1,300円〜1,550円',
    salaryMin: 1300, salaryMax: 1550,
    hours: '18:00〜翌0:00',
    workDays: '週1日〜',
    description: '新橋の隠れ家シーシャバーでゆるく働きませんか？副業・掛け持ちOK。仕事終わりにシーシャを吸いながら働くような感覚でOKです。常連さんたちとの交流が楽しいお店です。',
    requirements: '18歳以上 / シーシャが好きな方',
    benefits: '交通費支給・シーシャ割引・まかないあり',
    area: '新橋',
    prefecture: '東京都',
    tags: {
      atmosphere: ['隠れ家', '落ち着き'],
      clientele: ['常連多め'],
      workStyle: ['副業OK', '週2日〜OK', '深夜OK'],
      shishaElements: ['ノンニコチンあり', 'KM使用'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // SHISHA PARK
  {
    id: 'j12',
    storeId: 's8',
    title: 'ホールスタッフ（学生歓迎）',
    employmentType: 'アルバイト',
    salary: '時給1,250円〜1,450円',
    salaryMin: 1250, salaryMax: 1450,
    hours: '15:00〜翌2:00（シフト制）',
    workDays: '週2日〜',
    description: '横浜みなとみらいの景色を眺めながら働けるシーシャバー！学生スタッフ多数在籍中。テスト前はシフト調整OK。フレーバーの勉強も楽しいですよ！',
    requirements: '18歳以上（高校生不可） / 明るい方歓迎',
    benefits: '交通費支給・シーシャ無料・友達紹介ボーナスあり',
    area: '横浜',
    prefecture: '神奈川県',
    tags: {
      atmosphere: ['ワイワイ', 'カフェ風'],
      clientele: ['学生多め', '20代中心'],
      workStyle: ['未経験歓迎', '週2日〜OK', 'シーシャ研修あり'],
      shishaElements: ['フレーバー豊富', 'ノンニコチンあり'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'j13',
    storeId: 's8',
    title: 'シニアスタッフ（副店長候補）',
    employmentType: '正社員',
    salary: '月給22万円〜28万円',
    salaryMin: 220000, salaryMax: 280000,
    hours: '14:00〜翌1:00（シフト制）',
    workDays: '週5日',
    description: '将来的に副店長として活躍していただける方を募集。シーシャ業界未経験でも飲食店経験があれば大歓迎。横浜の人気店で一緒にキャリアを積みましょう。',
    requirements: '飲食店経験2年以上 / リーダーシップがある方',
    benefits: '社保完備・交通費支給・昇給あり・シーシャ無料',
    area: '横浜',
    prefecture: '神奈川県',
    tags: {
      atmosphere: ['ワイワイ'],
      clientele: ['20代中心', '学生多め'],
      workStyle: ['長期歓迎'],
      shishaElements: ['フレーバー豊富', 'ミックス自由'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  // Additional variety
  {
    id: 'j14',
    storeId: 's1',
    title: 'キッチンスタッフ兼シーシャ担当',
    employmentType: 'アルバイト',
    salary: '時給1,300円〜1,600円',
    salaryMin: 1300, salaryMax: 1600,
    hours: '17:00〜翌2:00',
    workDays: '週2日〜',
    description: 'シーシャのセッティングとかんたんなフード調理を担当。渋谷のチルなラウンジで複数のスキルを身につけられます。料理が得意な方・シーシャが好きな方お待ちしています。',
    requirements: '18歳以上 / キッチン経験あれば尚可',
    benefits: '交通費支給・まかない有・シーシャ無料',
    area: '渋谷',
    prefecture: '東京都',
    tags: {
      atmosphere: ['チル', '落ち着き'],
      clientele: ['一人客多め'],
      workStyle: ['未経験歓迎', '週2日〜OK'],
      shishaElements: ['フレーバー豊富'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'j15',
    storeId: 's4',
    title: 'シーシャ職人見習い（長期正社員）',
    employmentType: '正社員',
    salary: '月給20万円〜28万円',
    salaryMin: 200000, salaryMax: 280000,
    hours: '15:00〜翌1:00',
    workDays: '週5日',
    description: '池袋の隠れ家シーシャ専門店でオーナーから直接シーシャ職人の技術を学べるレアなポジション。希少フレーバーの知識を深めたい方、シーシャを極めたい方にぴったり。',
    requirements: 'シーシャ好き / 長期勤務できる方（1年以上）',
    benefits: '社保完備・交通費支給・シーシャ無料・技術習得後昇給',
    area: '池袋',
    prefecture: '東京都',
    tags: {
      atmosphere: ['隠れ家', 'チル'],
      clientele: ['常連多め'],
      workStyle: ['長期歓迎', 'シーシャ研修あり'],
      shishaElements: ['希少フレーバー', 'ミックス自由', 'KM使用'],
    },
    isFeatured: false,
    isActive: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

JOBS_DATA.forEach(j => db.jobs.push(j));

// ============================================
// Seed admin (PW: preview)
// ============================================
(async () => {
  const hash = await bcrypt.hash('preview', 10);
  db.admins.push({ id: 'admin1', email: 'admin@mokumoku.match', passwordHash: hash });
})();

// ============================================
// Helpers
// ============================================
const getStore = (storeId) => db.stores.find(s => s.id === storeId) || null;

const enrichJob = (job) => ({
  ...job,
  store: getStore(job.storeId),
});

const paginate = (arr, page = 1, limit = 12) => {
  const start = (page - 1) * limit;
  return {
    items: arr.slice(start, start + limit),
    total: arr.length,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(arr.length / limit),
  };
};

// JWT auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: '認証が必要です' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
};

// ============================================
// Routes: Public API
// ============================================

// GET /api/jobs
app.get('/api/jobs', (req, res) => {
  let jobs = db.jobs.filter(j => j.isActive);

  const { area, atmosphere, clientele, workStyle, shishaElements, employmentType, q, featured, page, limit } = req.query;

  if (q) {
    const kw = q.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(kw) ||
      j.description.toLowerCase().includes(kw) ||
      (getStore(j.storeId)?.name || '').toLowerCase().includes(kw)
    );
  }
  if (area)             jobs = jobs.filter(j => j.area === area);
  if (employmentType)   jobs = jobs.filter(j => j.employmentType === employmentType);
  if (atmosphere)       jobs = jobs.filter(j => j.tags.atmosphere?.includes(atmosphere));
  if (clientele)        jobs = jobs.filter(j => j.tags.clientele?.includes(clientele));
  if (workStyle)        jobs = jobs.filter(j => j.tags.workStyle?.includes(workStyle));
  if (shishaElements)   jobs = jobs.filter(j => j.tags.shishaElements?.includes(shishaElements));
  if (featured === 'true') jobs = jobs.filter(j => j.isFeatured);

  // Sort: featured first, then newest
  jobs.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const result = paginate(jobs.map(enrichJob), page, limit || 12);
  res.json(result);
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', (req, res) => {
  const job = db.jobs.find(j => j.id === req.params.id && j.isActive);
  if (!job) return res.status(404).json({ error: '求人が見つかりません' });
  res.json(enrichJob(job));
});

// GET /api/tags
app.get('/api/tags', (req, res) => {
  const byCategory = {};
  db.tags.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });
  res.json(byCategory);
});

// GET /api/stores
app.get('/api/stores', (req, res) => {
  res.json(db.stores.filter(s => s.isActive));
});

// POST /api/apply
app.post('/api/apply', upload.single('resume'), (req, res) => {
  const { jobId, name, nameKana, email, phone, age, experience, motivation, availableDays } = req.body;
  if (!jobId || !name || !email || !phone) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: '求人が見つかりません' });

  const application = {
    id: newId(),
    jobId,
    jobTitle: job.title,
    storeId: job.storeId,
    storeName: getStore(job.storeId)?.name || '',
    name, nameKana, email, phone,
    age: age || '',
    experience: experience || '',
    motivation: motivation || '',
    availableDays: availableDays || '',
    resumeFile: req.file ? req.file.filename : null,
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  db.applications.push(application);

  // Preview: console.log instead of email
  console.log(`\n[応募通知] ${name}さんが「${job.title}」に応募しました。`);
  console.log(`  メール: ${email} / 電話: ${phone}`);

  res.json({ success: true, applicationId: application.id });
});

// POST /api/inquiry
app.post('/api/inquiry', (req, res) => {
  const { storeName, contactName, email, phone, plan, message } = req.body;
  if (!storeName || !contactName || !email || !phone) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  const inquiry = {
    id: newId(),
    storeName, contactName, email, phone,
    plan: plan || '',
    message: message || '',
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  db.inquiries.push(inquiry);
  console.log(`\n[掲載問い合わせ] ${storeName} / ${contactName} / ${email}`);

  res.json({ success: true, inquiryId: inquiry.id });
});

// ============================================
// Routes: Admin Auth
// ============================================
app.post('/api/auth/admin', async (req, res) => {
  const { email, password } = req.body;
  const admin = db.admins.find(a => a.email === email);
  if (!admin) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, email: admin.email });
});

// ============================================
// Routes: Admin API (protected)
// ============================================

// --- Stores CRUD ---
app.get('/api/admin/stores', authMiddleware, (req, res) => {
  res.json(db.stores);
});

app.post('/api/admin/stores', authMiddleware, (req, res) => {
  const store = { id: newId(), ...req.body, isActive: true, createdAt: new Date().toISOString() };
  db.stores.push(store);
  res.status(201).json(store);
});

app.put('/api/admin/stores/:id', authMiddleware, (req, res) => {
  const idx = db.stores.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '店舗が見つかりません' });
  db.stores[idx] = { ...db.stores[idx], ...req.body };
  res.json(db.stores[idx]);
});

app.delete('/api/admin/stores/:id', authMiddleware, (req, res) => {
  const idx = db.stores.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '店舗が見つかりません' });
  db.stores[idx].isActive = false;
  res.json({ success: true });
});

// --- Jobs CRUD ---
app.get('/api/admin/jobs', authMiddleware, (req, res) => {
  res.json(db.jobs.map(enrichJob));
});

app.post('/api/admin/jobs', authMiddleware, (req, res) => {
  const job = { id: newId(), ...req.body, isActive: true, createdAt: new Date().toISOString() };
  db.jobs.push(job);
  res.status(201).json(job);
});

app.put('/api/admin/jobs/:id', authMiddleware, (req, res) => {
  const idx = db.jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '求人が見つかりません' });
  db.jobs[idx] = { ...db.jobs[idx], ...req.body };
  res.json(db.jobs[idx]);
});

app.delete('/api/admin/jobs/:id', authMiddleware, (req, res) => {
  const idx = db.jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '求人が見つかりません' });
  db.jobs[idx].isActive = false;
  res.json({ success: true });
});

// --- Tags CRUD ---
app.get('/api/admin/tags', authMiddleware, (req, res) => {
  res.json(db.tags);
});

app.post('/api/admin/tags', authMiddleware, (req, res) => {
  const tag = { id: newId(), ...req.body };
  db.tags.push(tag);
  res.status(201).json(tag);
});

app.put('/api/admin/tags/:id', authMiddleware, (req, res) => {
  const idx = db.tags.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'タグが見つかりません' });
  db.tags[idx] = { ...db.tags[idx], ...req.body };
  res.json(db.tags[idx]);
});

app.delete('/api/admin/tags/:id', authMiddleware, (req, res) => {
  const idx = db.tags.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'タグが見つかりません' });
  db.tags.splice(idx, 1);
  res.json({ success: true });
});

// --- Applications ---
app.get('/api/admin/applications', authMiddleware, (req, res) => {
  const sorted = [...db.applications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.put('/api/admin/applications/:id', authMiddleware, (req, res) => {
  const idx = db.applications.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '応募が見つかりません' });
  db.applications[idx] = { ...db.applications[idx], ...req.body };
  res.json(db.applications[idx]);
});

// --- Inquiries ---
app.get('/api/admin/inquiries', authMiddleware, (req, res) => {
  const sorted = [...db.inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.put('/api/admin/inquiries/:id', authMiddleware, (req, res) => {
  const idx = db.inquiries.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '問い合わせが見つかりません' });
  db.inquiries[idx] = { ...db.inquiries[idx], ...req.body };
  res.json(db.inquiries[idx]);
});

// --- Image Upload ---
app.post('/api/admin/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ファイルが見つかりません' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// --- Dashboard Stats ---
app.get('/api/admin/stats', authMiddleware, (req, res) => {
  res.json({
    totalJobs: db.jobs.filter(j => j.isActive).length,
    totalStores: db.stores.filter(s => s.isActive).length,
    totalApplications: db.applications.length,
    newApplications: db.applications.filter(a => a.status === 'new').length,
    totalInquiries: db.inquiries.length,
  });
});

// ============================================
// SPA fallback / HTML pages
// ============================================
const htmlPages = ['jobs', 'job', 'apply', 'thanks', 'listing', 'inquiry'];
htmlPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `${page}.html`));
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// ============================================
// Start
// ============================================
app.listen(PORT, () => {
  console.log(`\n🟢 MOKUMOKU MATCH Preview Server`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → 管理画面: http://localhost:${PORT}/admin/login`);
  console.log(`   → 管理者PW: preview\n`);
});
