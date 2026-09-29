const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const baseUrl = `https://littlehood-boardgame-sigma.vercel.app/join/LITTLEHOOD?house=`;

const characters = [
  { id: 1, name: 'หนูน้อยหมวกแดง' },
  { id: 2, name: 'หมาป่า' },
  { id: 3, name: 'คุณยาย' },
  { id: 4, name: 'คนตัดไม้' },
  { id: 5, name: 'นายพราน' },
  { id: 6, name: 'แม่มด' } // According to folder list, there is แม่มด (Witch). Wait, earlier it was นางฟ้า (Fairy) or ชาวป่า. The folder is แม่มด.
];

async function generateQRCodes() {
  for (const char of characters) {
    const dirPath = path.join(__dirname, 'charactor', char.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `qrcode_house_${char.id}.png`);
    const url = `${baseUrl}${char.id}`;
    
    try {
      await QRCode.toFile(filePath, url, {
        width: 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      console.log(`Generated QR code for ${char.name} at ${filePath}`);
    } catch (err) {
      console.error(`Failed to generate QR code for ${char.name}:`, err);
    }
  }
}

generateQRCodes();
