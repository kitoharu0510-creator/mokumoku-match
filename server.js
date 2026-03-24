/**
 * MOKUMOKU MATCH — Production Server
 * MongoDB + Resend + port 3003
 */

const express  = require('express');
const mongoose = require('mongoose');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { Resend } = require('resend');

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const resend = new Resend(process.env.RESEND_API_KEY);

// UPLOAD_DIR: Render Disk は /var/data/uploads、ローカルは ./uploads
let UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.warn('⚠️ UPLOAD_DIR 作成失敗、./uploads にフォールバック:', err.message);
  UPLOAD_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================
// MongoDB Schemas
// ============================================
const StoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  area: String,
  prefecture: String,
  station: String,
  address: String,
  atmosphere: [String],
  clientele: [String],
  mainPhoto: String,
  photos: [String],
  shishaInfo: {
    flavorCount: Number,
    mixFreedom: String,
    equipment: String,
    nonNicotine: Boolean,
    training: Boolean,
  },
  sns: { instagram: String, website: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const JobSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  title: { type: String, required: true },
  employmentType: String,
  salary: String,
  salaryMin: Number,
  salaryMax: Number,
  hours: String,
  workDays: String,
  description: String,
  requirements: String,
  benefits: String,
  area: String,
  prefecture: String,
  tags: {
    atmosphere:     [String],
    clientele:      [String],
    workStyle:      [String],
    shishaElements: [String],
  },
  isFeatured: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

const TagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
});

const ApplicationSchema = new mongoose.Schema({
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  jobTitle:     String,
  storeId:      mongoose.Schema.Types.ObjectId,
  storeName:    String,
  name:         { type: String, required: true },
  nameKana:     String,
  email:        { type: String, required: true },
  phone:        { type: String, required: true },
  age:          String,
  experience:   String,
  motivation:   String,
  availableDays: String,
  resumeFile:   String,
  status:       { type: String, default: 'new', enum: ['new', 'reviewing', 'hired', 'rejected'] },
}, { timestamps: true });

const InquirySchema = new mongoose.Schema({
  storeName:    { type: String, required: true },
  contactName:  { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, required: true },
  plan:         String,
  hiringNeeds:  String,
  message:      String,
  status:       { type: String, default: 'new', enum: ['new', 'contacted', 'contracted', 'closed'] },
}, { timestamps: true });

const AdminSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

const Store       = mongoose.model('Store',       StoreSchema);
const Job         = mongoose.model('Job',         JobSchema);
const Tag         = mongoose.model('Tag',         TagSchema);
const Application = mongoose.model('Application', ApplicationSchema);
const Inquiry     = mongoose.model('Inquiry',     InquirySchema);
const Admin       = mongoose.model('Admin',       AdminSchema);

// ============================================
// Auth middleware
// ============================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: '認証が必要です' });
  const token = authHeader.split(' ')[1];
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
};

// ============================================
// Public Routes
// ============================================

app.get('/api/jobs', async (req, res) => {
  try {
    const { area, atmosphere, clientele, workStyle, shishaElements, employmentType, q, featured, page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };
    if (area)           filter.area = area;
    if (employmentType) filter.employmentType = employmentType;
    if (atmosphere)     filter['tags.atmosphere'] = atmosphere;
    if (clientele)      filter['tags.clientele'] = clientele;
    if (workStyle)      filter['tags.workStyle'] = workStyle;
    if (shishaElements) filter['tags.shishaElements'] = shishaElements;
    if (featured === 'true') filter.isFeatured = true;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .populate('storeId')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      items: jobs.map(j => ({ ...j.toObject(), store: j.storeId })),
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('storeId');
    if (!job || !job.isActive) return res.status(404).json({ error: '求人が見つかりません' });
    res.json({ ...job.toObject(), store: job.storeId });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tags', async (req, res) => {
  const tags = await Tag.find();
  const byCategory = {};
  tags.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });
  res.json(byCategory);
});

app.get('/api/stores', async (req, res) => {
  res.json(await Store.find({ isActive: true }));
});

app.post('/api/apply', (req, res, next) => {
  upload.single('resume')(req, res, err => {
    if (err) return res.status(400).json({ error: 'ファイルエラー: ' + err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { jobId, name, nameKana, email, phone, age, experience, motivation, availableDays } = req.body;
    if (!jobId || !name || !email || !phone) return res.status(400).json({ error: '必須項目を入力してください' });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: '求人が見つかりません' });

    const application = await Application.create({
      jobId, jobTitle: job.title, storeId: job.storeId,
      name, nameKana, email, phone, age, experience, motivation, availableDays,
      resumeFile: req.file?.filename || null,
    });

    // Send email via Resend
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@mokumoku.match',
        to: email,
        subject: `【MOKUMOKU MATCH】「${job.title}」へのご応募を受け付けました`,
        html: `
          <h2>応募受付確認</h2>
          <p>${name} 様</p>
          <p>「${job.title}」へのご応募を受け付けました。<br>内容を確認のうえ、担当者からご連絡いたします。</p>
          <p>MOKUMOKU MATCH</p>
        `,
      });
    } catch(mailErr) {
      console.error('Mail error:', mailErr);
    }

    res.json({ success: true, applicationId: application._id });
  } catch(e) {
    console.error('Apply error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/inquiry', async (req, res) => {
  try {
    const { storeName, contactName, email, phone, plan, hiringNeeds, message } = req.body;
    if (!storeName || !contactName || !email || !phone) return res.status(400).json({ error: '必須項目を入力してください' });

    const inquiry = await Inquiry.create({ storeName, contactName, email, phone, plan, hiringNeeds, message });

    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@mokumoku.match',
        to: email,
        subject: '【MOKUMOKU MATCH】掲載お問い合わせを受け付けました',
        html: `<p>${contactName} 様</p><p>お問い合わせありがとうございます。1〜2営業日以内にご連絡いたします。</p>`,
      });
    } catch(mailErr) { console.error('Mail error:', mailErr); }

    res.json({ success: true, inquiryId: inquiry._id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// Admin Auth
// ============================================
app.post('/api/auth/admin', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, email: admin.email });
});

// ============================================
// Admin API (Protected)
// ============================================

// Image upload
app.post('/api/admin/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ファイルがありません' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Stores
app.get('/api/admin/stores', authMiddleware, async (req, res) => res.json(await Store.find()));
app.post('/api/admin/stores', authMiddleware, async (req, res) => res.status(201).json(await Store.create(req.body)));
app.put('/api/admin/stores/:id', authMiddleware, async (req, res) => res.json(await Store.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/admin/stores/:id', authMiddleware, async (req, res) => {
  await Store.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});

// Jobs
app.get('/api/admin/jobs', authMiddleware, async (req, res) => {
  const jobs = await Job.find().populate('storeId');
  res.json(jobs.map(j => ({ ...j.toObject(), store: j.storeId })));
});
app.post('/api/admin/jobs', authMiddleware, async (req, res) => res.status(201).json(await Job.create(req.body)));
app.put('/api/admin/jobs/:id', authMiddleware, async (req, res) => res.json(await Job.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/admin/jobs/:id', authMiddleware, async (req, res) => {
  await Job.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});

// Tags
app.get('/api/admin/tags', authMiddleware, async (req, res) => res.json(await Tag.find()));
app.post('/api/admin/tags', authMiddleware, async (req, res) => res.status(201).json(await Tag.create(req.body)));
app.put('/api/admin/tags/:id', authMiddleware, async (req, res) => res.json(await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/admin/tags/:id', authMiddleware, async (req, res) => {
  await Tag.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Applications
app.get('/api/admin/applications', authMiddleware, async (req, res) => {
  res.json(await Application.find().sort({ createdAt: -1 }));
});
app.put('/api/admin/applications/:id', authMiddleware, async (req, res) => {
  res.json(await Application.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Inquiries
app.get('/api/admin/inquiries', authMiddleware, async (req, res) => {
  res.json(await Inquiry.find().sort({ createdAt: -1 }));
});
app.put('/api/admin/inquiries/:id', authMiddleware, async (req, res) => {
  res.json(await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Stats
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  const [totalJobs, totalStores, totalApplications, newApplications, totalInquiries] = await Promise.all([
    Job.countDocuments({ isActive: true }),
    Store.countDocuments({ isActive: true }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'new' }),
    Inquiry.countDocuments(),
  ]);
  res.json({ totalJobs, totalStores, totalApplications, newApplications, totalInquiries });
});

// ============================================
// Start
// ============================================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mokumoku-match')
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Seed admin if none exists
    const count = await Admin.countDocuments();
    if (count === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'changeme', 10);
      await Admin.create({ email: process.env.ADMIN_EMAIL || 'admin@mokumoku.match', passwordHash: hash });
      console.log('🔑 Admin created:', process.env.ADMIN_EMAIL || 'admin@mokumoku.match');
    }

    app.listen(PORT, () => {
      console.log(`\n🟢 MOKUMOKU MATCH Production Server`);
      console.log(`   → http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
