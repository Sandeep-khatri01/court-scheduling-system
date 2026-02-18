const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'court.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema Creation ───
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT CHECK(role IN ('ADMIN','JUDGE','CLERK','LAWYER','CITIZEN')) NOT NULL,
        phone TEXT,
        bar_number TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        filing_date TEXT NOT NULL,
        case_type TEXT CHECK(case_type IN ('Civil','Criminal','Constitutional','Family','Labour','Cyber','Motor Vehicle','Tax','Other')) NOT NULL DEFAULT 'Civil',
        status TEXT CHECK(status IN ('PENDING','SCHEDULED','IN_PROGRESS','ADJOURNED','DISPOSED','CLOSED')) NOT NULL DEFAULT 'PENDING',
        priority_score INTEGER DEFAULT 0,
        urgency TEXT CHECK(urgency IN ('Low','Medium','High','Critical')) DEFAULT 'Medium',
        presiding_judge_id TEXT REFERENCES users(id),
        assigned_lawyer_id TEXT REFERENCES users(id),
        petitioner_name TEXT,
        respondent_name TEXT,
        adjournment_count INTEGER DEFAULT 0,
        last_adjournment_reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hearings (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(id),
        hearing_date TEXT NOT NULL,
        hearing_time TEXT DEFAULT '10:00',
        courtroom_id TEXT DEFAULT 'CR-1',
        judge_id TEXT REFERENCES users(id),
        status TEXT CHECK(status IN ('SCHEDULED','COMPLETED','ADJOURNED','CANCELLED')) DEFAULT 'SCHEDULED',
        adjournment_reason TEXT,
        notes TEXT,
        duration_minutes INTEGER DEFAULT 30,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS laws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        act_name TEXT NOT NULL,
        section TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        penalty TEXT,
        category TEXT,
        keywords TEXT,
        is_bailable INTEGER DEFAULT 1,
        max_imprisonment TEXT,
        fine_amount TEXT
    );

    CREATE TABLE IF NOT EXISTS courtrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        capacity INTEGER DEFAULT 50,
        has_video_conf INTEGER DEFAULT 0,
        floor TEXT,
        status TEXT CHECK(status IN ('AVAILABLE','OCCUPIED','MAINTENANCE')) DEFAULT 'AVAILABLE'
    );

    CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action_type TEXT,
        prompt_summary TEXT,
        ai_response TEXT,
        tokens_used INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        case_id TEXT REFERENCES cases(id),
        type TEXT CHECK(type IN ('HEARING_REMINDER','RESCHEDULE','STATUS_CHANGE','GENERAL')) NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_judge ON cases(presiding_judge_id);
    CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
    CREATE INDEX IF NOT EXISTS idx_hearings_case ON hearings(case_id);
    CREATE INDEX IF NOT EXISTS idx_laws_keywords ON laws(keywords);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);

// ─── Seed Data ───
function seedDatabase() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) return;

    console.log('🌱 Seeding database...');

    // Seed Users
    const users = [
        { id: uuidv4(), email: 'admin@court.gov.in', password: 'admin123', name: 'System Admin', role: 'ADMIN' },
        { id: uuidv4(), email: 'judge.sharma@court.gov.in', password: 'judge123', name: 'Hon. Justice R.K. Sharma', role: 'JUDGE' },
        { id: uuidv4(), email: 'judge.mehta@court.gov.in', password: 'judge123', name: 'Hon. Justice P.S. Mehta', role: 'JUDGE' },
        { id: uuidv4(), email: 'clerk.kumar@court.gov.in', password: 'clerk123', name: 'Anil Kumar', role: 'CLERK' },
        { id: uuidv4(), email: 'adv.singh@lawfirm.in', password: 'lawyer123', name: 'Adv. Rajesh Singh', role: 'LAWYER', bar: 'BAR/2010/1234' },
        { id: uuidv4(), email: 'adv.patel@lawfirm.in', password: 'lawyer123', name: 'Adv. Priya Patel', role: 'LAWYER', bar: 'BAR/2015/5678' },
    ];

    const insertUser = db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, bar_number) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const u of users) {
        const hash = bcrypt.hashSync(u.password, 10);
        insertUser.run(u.id, u.email, hash, u.name, u.role, u.bar || null);
    }

    // Seed Courtrooms
    const courtrooms = [
        { id: 'CR-1', name: 'Courtroom 1 - Main Hall', capacity: 100, video: 1, floor: 'Ground' },
        { id: 'CR-2', name: 'Courtroom 2 - Civil Division', capacity: 60, video: 1, floor: '1st' },
        { id: 'CR-3', name: 'Courtroom 3 - Criminal Division', capacity: 80, video: 0, floor: '1st' },
        { id: 'CR-4', name: 'Courtroom 4 - Family Court', capacity: 40, video: 1, floor: '2nd' },
    ];
    const insertCR = db.prepare('INSERT INTO courtrooms (id, name, capacity, has_video_conf, floor) VALUES (?, ?, ?, ?, ?)');
    for (const cr of courtrooms) insertCR.run(cr.id, cr.name, cr.capacity, cr.video, cr.floor);

    // Seed Sample Cases
    const judgeIds = users.filter(u => u.role === 'JUDGE').map(u => u.id);
    const lawyerIds = users.filter(u => u.role === 'LAWYER').map(u => u.id);

    const sampleCases = [
        { title: 'State vs. Rohit Mehra', type: 'Criminal', status: 'IN_PROGRESS', priority: 85, urgency: 'High', petitioner: 'State of Maharashtra', respondent: 'Rohit Mehra', adj: 3, adjReason: 'Lawyer absent' },
        { title: 'Sharma vs. Municipal Corp', type: 'Civil', status: 'PENDING', priority: 45, urgency: 'Medium', petitioner: 'Vikram Sharma', respondent: 'Mumbai Municipal Corp', adj: 1, adjReason: 'Documents pending' },
        { title: 'Gupta Property Dispute', type: 'Civil', status: 'SCHEDULED', priority: 60, urgency: 'Medium', petitioner: 'Ramesh Gupta', respondent: 'Suresh Gupta', adj: 0, adjReason: null },
        { title: 'Cyber Fraud Case #2024-CF-001', type: 'Cyber', status: 'PENDING', priority: 90, urgency: 'Critical', petitioner: 'State', respondent: 'Unknown (John Doe)', adj: 0, adjReason: null },
        { title: 'Motor Vehicle Accident Claim', type: 'Motor Vehicle', status: 'ADJOURNED', priority: 55, urgency: 'Medium', petitioner: 'Anjali Desai', respondent: 'National Insurance Co.', adj: 5, adjReason: 'Judge on leave' },
        { title: 'Labour Dispute - Factory Workers Union', type: 'Labour', status: 'IN_PROGRESS', priority: 70, urgency: 'High', petitioner: 'Workers Union Local 42', respondent: 'ABC Manufacturing Ltd.', adj: 2, adjReason: 'Settlement negotiations' },
        { title: 'Tax Evasion - Sunrise Enterprises', type: 'Tax', status: 'PENDING', priority: 75, urgency: 'High', petitioner: 'IT Department', respondent: 'Sunrise Enterprises Pvt. Ltd.', adj: 0, adjReason: null },
        { title: 'Family Custody - Kapoor vs Kapoor', type: 'Family', status: 'SCHEDULED', priority: 80, urgency: 'High', petitioner: 'Neha Kapoor', respondent: 'Amit Kapoor', adj: 1, adjReason: 'Mediation attempt' },
    ];

    const insertCase = db.prepare(`INSERT INTO cases (id, case_number, title, case_type, status, priority_score, urgency, presiding_judge_id, assigned_lawyer_id, petitioner_name, respondent_name, adjournment_count, last_adjournment_reason, filing_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    sampleCases.forEach((c, i) => {
        const caseId = uuidv4();
        const caseNum = `CASE/${2024}/${String(i + 1).padStart(4, '0')}`;
        const filingDate = new Date(Date.now() - (Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        insertCase.run(caseId, caseNum, c.title, c.type, c.status, c.priority, c.urgency, judgeIds[i % judgeIds.length], lawyerIds[i % lawyerIds.length], c.petitioner, c.respondent, c.adj, c.adjReason, filingDate);
    });

    // Seed Laws
    const laws = [
        { act: 'Indian Penal Code', section: 'Section 302', title: 'Punishment for Murder', desc: 'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.', penalty: 'Death or Life Imprisonment + Fine', category: 'Criminal', keywords: 'murder,kill,homicide,death', bailable: 0, imprisonment: 'Life/Death', fine: 'As determined by court' },
        { act: 'Indian Penal Code', section: 'Section 307', title: 'Attempt to Murder', desc: 'Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, he would be guilty of murder, shall be punished.', penalty: 'Up to 10 years + Fine', category: 'Criminal', keywords: 'attempt,murder,attack,intent to kill', bailable: 0, imprisonment: '10 years', fine: 'Variable' },
        { act: 'Indian Penal Code', section: 'Section 376', title: 'Punishment for Rape', desc: 'Rigorous imprisonment for not less than 10 years but may extend to life imprisonment and fine.', penalty: 'Min 10 years to Life Imprisonment + Fine', category: 'Criminal', keywords: 'rape,sexual assault,sexual offence', bailable: 0, imprisonment: '10 years to Life', fine: 'As determined' },
        { act: 'Indian Penal Code', section: 'Section 420', title: 'Cheating and Dishonesty', desc: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security.', penalty: 'Up to 7 years + Fine', category: 'Criminal', keywords: 'cheating,fraud,dishonesty,scam', bailable: 0, imprisonment: '7 years', fine: 'Variable' },
        { act: 'Indian Penal Code', section: 'Section 498A', title: 'Cruelty by Husband or Relatives', desc: 'Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished.', penalty: 'Up to 3 years + Fine', category: 'Criminal', keywords: 'dowry,cruelty,domestic violence,husband', bailable: 0, imprisonment: '3 years', fine: 'Variable' },
        { act: 'Motor Vehicles Act', section: 'Section 185', title: 'Driving Under Influence of Alcohol/Drugs', desc: 'Whoever while driving a motor vehicle has in his blood alcohol exceeding 30 mg per 100 ml of blood shall be punishable for the first offence with imprisonment up to 6 months or fine up to Rs 10,000 or both.', penalty: 'Up to 6 months imprisonment or Rs 10,000 fine or both', category: 'Motor Vehicle', keywords: 'drunk driving,alcohol,dui,drugs,driving', bailable: 1, imprisonment: '6 months', fine: 'Rs 10,000' },
        { act: 'Motor Vehicles Act', section: 'Section 129', title: 'Helmet Compulsory for Two-Wheeler', desc: 'Every person driving or riding on a two-wheeler motorcycle shall wear protective headgear (helmet) conforming to BIS standards.', penalty: 'Fine of Rs 1,000 and disqualification for 3 months', category: 'Motor Vehicle', keywords: 'helmet,two wheeler,motorcycle,bike,headgear', bailable: 1, imprisonment: 'None', fine: 'Rs 1,000' },
        { act: 'Motor Vehicles Act', section: 'Section 177', title: 'General Traffic Offences', desc: 'Whoever contravenes any provision of this Act or of any rule, regulation or notification made thereunder shall be punishable with fine which may extend to Rs 500 for first offence and Rs 1,500 for second or subsequent offence.', penalty: 'Rs 500 first offence, Rs 1,500 repeat', category: 'Motor Vehicle', keywords: 'traffic,violation,offence,fine,rules', bailable: 1, imprisonment: 'None', fine: 'Rs 500-1500' },
        { act: 'Information Technology Act', section: 'Section 66', title: 'Computer Related Offences (Hacking)', desc: 'If any person dishonestly or fraudulently does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or both.', penalty: 'Up to 3 years or Rs 5 lakh fine or both', category: 'Cyber', keywords: 'hacking,computer,cyber crime,unauthorized access', bailable: 1, imprisonment: '3 years', fine: 'Rs 5,00,000' },
        { act: 'Information Technology Act', section: 'Section 67', title: 'Publishing Obscene Material Online', desc: 'Whoever publishes or transmits any material which is lascivious or appeals to prurient interest electronically shall be punished.', penalty: 'First offence: 3 years + Rs 5 lakh. Second: 5 years + Rs 10 lakh', category: 'Cyber', keywords: 'obscene,pornography,online,publish,electronic', bailable: 1, imprisonment: '3-5 years', fine: 'Rs 5-10 lakh' },
        { act: 'Constitution of India', section: 'Article 21', title: 'Right to Life and Personal Liberty', desc: 'No person shall be deprived of his life or personal liberty except according to procedure established by law. This is a fundamental right.', penalty: 'N/A - Fundamental Right', category: 'Constitutional', keywords: 'life,liberty,fundamental right,freedom,personal liberty', bailable: 1, imprisonment: 'N/A', fine: 'N/A' },
        { act: 'Constitution of India', section: 'Article 14', title: 'Right to Equality', desc: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.', penalty: 'N/A - Fundamental Right', category: 'Constitutional', keywords: 'equality,discrimination,equal protection,fundamental right', bailable: 1, imprisonment: 'N/A', fine: 'N/A' },
        { act: 'Consumer Protection Act 2019', section: 'Section 2(7)', title: 'Definition of Consumer', desc: 'Consumer means any person who buys any goods or hires/avails any service for consideration which has been paid or promised.', penalty: 'Compensation as per complaint', category: 'Civil', keywords: 'consumer,buyer,goods,services,complaint,protection', bailable: 1, imprisonment: 'N/A', fine: 'As per claim' },
        { act: 'Indian Contract Act', section: 'Section 73', title: 'Compensation for Breach of Contract', desc: 'When a contract has been broken, the party who suffers by such breach is entitled to receive compensation for any loss or damage caused.', penalty: 'Compensation/Damages', category: 'Civil', keywords: 'contract,breach,compensation,damages,agreement', bailable: 1, imprisonment: 'N/A', fine: 'Damages' },
        { act: 'Bharatiya Nyaya Sanhita 2023', section: 'Section 103', title: 'Murder (New Code)', desc: 'Whoever causes death of another person with intention shall be punished with death or imprisonment for life and also liable to fine. This replaces IPC Section 302 under the new criminal code.', penalty: 'Death or Life Imprisonment + Fine', category: 'Criminal', keywords: 'murder,bns,new code,kill,death,bharatiya nyaya', bailable: 0, imprisonment: 'Life/Death', fine: 'As determined' },
    ];

    const insertLaw = db.prepare(`INSERT INTO laws (act_name, section, title, description, penalty, category, keywords, is_bailable, max_imprisonment, fine_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const l of laws) {
        insertLaw.run(l.act, l.section, l.title, l.desc, l.penalty, l.category, l.keywords, l.bailable, l.imprisonment, l.fine);
    }

    console.log('✅ Database seeded with users, cases, courtrooms, and laws.');
}

seedDatabase();

module.exports = db;
