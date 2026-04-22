const express = require('express');
const app = express();

app.use(express.json()); // POST isteklerindeki JSON verilerini okumak için

// Ortak durum değişkenleri
const status = {
    isGameOpen: true,
    isMarketOpen: true,
    isAdaletSarayOpen: false
};

// Roblox'un tüm durumları kontrol ettiği GET isteği
app.get('/check-status', (req, res) => {
    res.json({ 
        open: status.isGameOpen, 
        market: status.isMarketOpen, 
        adaletSaray: status.isAdaletSarayOpen 
    });
});

// Roblox Ana Oyun'dan gelen POST isteği ile Adalet Sarayı'nı güncelleme
app.post('/update-adalet', (req, res) => {
    const { status: newStatus } = req.body;
    
    if (typeof newStatus === 'boolean') {
        status.isAdaletSarayOpen = newStatus;
        res.json({ success: true, current: status.isAdaletSarayOpen });
        console.log(`Adalet Sarayı durumu güncellendi: ${status.isAdaletSarayOpen ? 'AÇIK' : 'KAPALI'}`);
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi.' });
    }
});

// Sunucuyu başlatan fonksiyon
const startApi = (port) => {
    app.listen(port, () => console.log(`API ${port} portunda aktif.`));
};

// Diğer dosyalardan erişilebilmesi için dışa aktarıyoruz
module.exports = { status, startApi };
