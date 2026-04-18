const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let gameStatus = false; // Butonun durumu

// 1. BU KISIM: Siteden veya Discord'dan tetiklenecek yer
app.get('/trigger', (req, res) => {
    gameStatus = true;
    res.send("Sinyal Roblox'a gönderilmek üzere sıraya alındı!");
});

// 2. BU KISIM: Roblox'un sürekli kontrol edeceği yer
app.get('/check', (req, res) => {
    res.json({ active: gameStatus });
    gameStatus = false; // Roblox bilgiyi alınca durumu sıfırla
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});