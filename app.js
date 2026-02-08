const express = require('express');
const session = require('express-session');
const path = require('path');
const admin = require('firebase-admin');

// 1. Inisialisasi Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const app = express();

// 2. Konfigurasi Express & View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Frontend/views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// 3. Konfigurasi Session (Poin f UAS)
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

// --- ROUTES AUTH ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Nama koleksi 'user' sesuai gambar image_92e588.png
        await db.collection('user').add({ email, password });
        res.redirect('/login');
    } catch (e) { res.send("Gagal Daftar: " + e); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Sinkronisasi dengan koleksi 'user' di Firebase
        const snapshot = await db.collection('user').where('email', '==', email).where('password', '==', password).get();
        if (!snapshot.empty) {
            req.session.isLoggedIn = true;
            res.redirect('/dashboard');
        } else {
            res.send('Login Gagal! Cek email & password di Firebase. <a href="/login">Coba lagi</a>');
        }
    } catch (e) { res.send("Error: " + e); }
});

// --- FITUR DASHBOARD ---
app.get('/dashboard', authCheck, async (req, res) => {
    try {
        // Mengurutkan berdasarkan 'date' yang bertipe Timestamp
        const snapshot = await db.collection('transactions').orderBy('date', 'desc').get();
        let transactions = [];
        let totalIncome = 0;
        let totalExpense = 0;
        
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            
            // Konversi Timestamp ke String agar bisa dibaca di EJS
            if (data.date && data.date.toDate) {
                data.date = data.date.toDate().toISOString();
            }

            transactions.push(data);
            if (data.tipe === 'masuk') totalIncome += data.nominal;
            else totalExpense += data.nominal;
        });
        
        res.render('dashboard', { 
            total: totalIncome - totalExpense, 
            masuk: totalIncome, 
            keluar: totalExpense, 
            transactions 
        });
    } catch (e) { res.send("Error Dashboard: " + e); }
});

app.post('/add-transaction', authCheck, async (req, res) => {
    // Mengambil data dari form
    const { deskripsi, nominal, tipe, kategori } = req.body;
    
    try {
        await db.collection('transactions').add({
            deskripsi: deskripsi || "Tanpa Keterangan",
            nominal: parseInt(nominal) || 0,
            tipe: tipe || "keluar",
            // PERBAIKAN: Jika kategori kosong (undefined), isi dengan "Umum"
            kategori: kategori || "Umum", 
            date: admin.firestore.Timestamp.now() 
        });
        res.redirect('/dashboard');
    } catch (e) { 
        console.error("Error Simpan:", e);
        res.send("Gagal Simpan Transaksi: " + e); 
    }
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
    console.log(`Copyright by 23552011403_Ai Nurul Hidayah`);
});
module.exports = app;
