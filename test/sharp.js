import sharp from "sharp";
import * as path from 'node:path'
import * as fs from 'node:fs'
const p = "C:/Users/258vr/Documents/ScJP/mcmap/MCmap/test";
(async (dimension) => {
  const outputDir = './public/map'
  const Lv2Path = path.join(outputDir, "2", dimension);
  const filesLv2 = fs.readdirSync(Lv2Path);

  const emptyTile = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 3,
      background: '#000000'
    }
  }).png().toBuffer()

  while (filesLv2.length) {
    const targetImg = filesLv2[0];
    const pos = targetImg.split('_').map(i=>parseInt(i));
    if (!pos) {
      console.log(targetImg, "Skipped. Is this really an exported image?")
      return;
    }
    if (pos[0] % 2) pos[0]--;
    if (pos[1] % 2) pos[1]--;
    const images = [];
    [
      { input: path.join(Lv2Path, `${pos[0]+0}_${pos[1]+0}.png`), top: 0, left: 0 },
      { input: path.join(Lv2Path, `${pos[0]+0}_${pos[1]+1}.png`), top: 256, left: 0 },
      { input: path.join(Lv2Path, `${pos[0]+1}_${pos[1]+0}.png`), top: 0, left: 256 },
      { input: path.join(Lv2Path, `${pos[0]+1}_${pos[1]+1}.png`), top: 256, left: 256 },
    ].forEach(img => {
      if (fs.existsSync(img.input)) {
        console.log(filesLv2.findIndex(i => i === path.basename(img.input)),fs.existsSync(img.input))
        filesLv2.splice(filesLv2.findIndex(i => i === path.basename(img.input)), 1)
        images.push(img)
      } else {
        const newImg = img;
        newImg.input = emptyTile;
        images.push(newImg)
      }
    });

    const imgName = `${pos[0] / 2}_${pos[1] / 2}.png`

    const combined = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: '#000000'
      }
    }).composite(images)
    .png()
    .toBuffer();
    await sharp(combined)
    .resize(256, 256)
    .toFile(path.join(outputDir, "1", dimension, imgName));
    console.log(imgName);
  }
})("overworld")