const express = require('express');
const app = express();

app.use(express.json());

const status = {
    isGameOpen: true,
    isMarketOpen: true,
    isAdaletSarayOpen: false
};

app.get('/check-status', (req, res) => {
    res.json({ open: status.isGameOpen, market: status.isMarketOpen, adaletSaray: status.isAdaletSarayOpen });
});

app.post('/update-adalet', (req, res) => {
    const { status: newStatus } = req.body;
    if (typeof newStatus === 'boolean') {
        status.isAdaletSarayOpen = newStatus;
        res.json({ success: true, current: status.isAdaletSarayOpen });
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi.' });
    }
});

const startApi = (port) => {
    app.listen(port, () => console.log(`API ${port} portunda aktif.`));
};

module.exports = { status, startApi };