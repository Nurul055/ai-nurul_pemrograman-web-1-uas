const express = require('express');
const session = require('express-session');
const path = require('path');
const admin = require('firebase-admin');

// 1. Inisialisasi Firebase
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const app = express();

// 2. Konfigurasi Express & View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// 3. Konfigurasi Session
app.use(session({
    secret: 'rahasia_nurul_23552011403',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}));

// Middleware Cek Login
const authCheck = (req, res, next) => {
    if (req.session.isLoggedIn) return next();
    res.redirect('/login');
};

// --- ROUTES ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await db.collection('user').add({ email, password });
        res.redirect('/login');
    } catch (e) { res.send("Gagal Daftar: " + e); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const snapshot = await db.collection('user').where('email', '==', email).where('password', '==', password).get();
        if (!snapshot.empty) {
            req.session.isLoggedIn = true;
            res.redirect('/dashboard');
        } else {
            res.send('Login Gagal! <a href="/login">Coba lagi</a>');
        }
    } catch (e) { res.send("Error: " + e); }
});

app.get('/dashboard', authCheck, async (req, res) => {
    try {
        const snapshot = await db.collection('transactions').orderBy('date', 'desc').get();
        let transactions = [];
        let totalIncome = 0;
        let totalExpense = 0;
        
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            if (data.date && data.date.toDate) {
                data.date = data.date.toDate().toISOString();
            }
            transactions.push(data);
            if (data.tipe === 'masuk') totalIncome += data.nominal;
            else totalExpense += data.nominal;
        });
        
        res.render('dashboard', { total: totalIncome - totalExpense, masuk: totalIncome, keluar: totalExpense, transactions });
    } catch (e) { res.send("Error Dashboard: " + e); }
});

app.post('/add-transaction', authCheck, async (req, res) => {
    const { deskripsi, nominal, tipe, kategori } = req.body;
    try {
        await db.collection('transactions').add({
            deskripsi: deskripsi || "Tanpa Keterangan",
            nominal: parseInt(nominal) || 0,
            tipe: tipe || "keluar",
            kategori: kategori || "Umum", 
            date: admin.firestore.Timestamp.now() 
        });
        res.redirect('/dashboard');
    } catch (e) { res.send("Gagal Simpan: " + e); }
});

app.get('/delete-transaction/:id', authCheck, async (req, res) => {
    try {
        await db.collection('transactions').doc(req.params.id).delete();
        res.redirect('/dashboard');
    } catch (e) { res.send("Gagal Hapus: " + e); }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Bagian Krusial untuk Vercel
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server jalan di http://localhost:${PORT}`);
    });
}

module.exports = app; 

