let hgIstatistik = { 
    toplamKatilan: 0, 
    bugunKatilan: 0, 
    tarih: new Date().toISOString().slice(0, 10) 
};

function hgGunlukSifirla() {
    const bugun = new Date().toISOString().slice(0, 10);
    if (hgIstatistik.tarih !== bugun) {
        hgIstatistik.bugunKatilan = 0;
        hgIstatistik.tarih = bugun;
    }
}

const selamlamaCooldown = new Map();
const kullaniciRuhuHali = new Map();
let selamlamaDurum = { aktif: true };

module.exports = { hgIstatistik, hgGunlukSifirla, selamlamaCooldown, kullaniciRuhuHali, selamlamaDurum };
