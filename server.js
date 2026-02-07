const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const path = require('path');

// --- KONFIGURASI ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'rahasia-keuangan-123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 Jam
}));

// --- DATABASE DUMMY (SIMULASI CRUD) ---
let users = [];
let transactions = [
    { id: 1, kategori: 'Makanan', nama: 'Nasi Goreng', tanggal: '2023-10-27', nominal: -25000, ikon: '🍴' },
    { id: 2, kategori: 'Gaji', nama: 'Gaji Kantor', tanggal: '2023-10-25', nominal: 5000000, ikon: '💰' }
];
let savingGoals = [
    { id: 1, nama: 'Beli Laptop', target: 10000000, terkumpul: 4500000 }
];

// --- MIDDLEWARE CEK SESSION ---
const isAuth = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/login');
};

// --- ROUTES ---

// Auth
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    req.session.user = { name: 'User Demo' }; // Simulasi login sukses
    res.redirect('/dashboard');
});

app.get('/register', (req, res) => res.render('register'));

// Dashboard (Pusat Informasi)
app.get('/dashboard', isAuth, (req, res) => {
    const pemasukan = transactions.filter(t => t.nominal > 0).reduce((a, b) => a + b.nominal, 0);
    const pengeluaran = Math.abs(transactions.filter(t => t.nominal < 0).reduce((a, b) => a + b.nominal, 0));
    const saldo = pemasukan - pengeluaran;
    res.render('dashboard', { saldo, pemasukan, pengeluaran });
});

// Riwayat & CRUD (Read/Delete)
app.get('/riwayat', isAuth, (req, res) => {
    res.render('riwayat', { transactions });
});

app.post('/transaksi/hapus/:id', isAuth, (req, res) => {
    transactions = transactions.filter(t => t.id != req.params.id);
    res.redirect('/riwayat');
});

// Fitur Jagoan: Goal-Based Saving
app.get('/target', isAuth, (req, res) => {
    res.render('target', { savingGoals });
});

app.listen(3000, () => console.log('Server running: http://localhost:3000'));