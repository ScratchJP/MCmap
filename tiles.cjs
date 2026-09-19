const fs = require('fs');
const path = require('path');
const readline = require('node:readline');
const sharp = require('sharp');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function stripBlackToAlpha(imageBuffer, width, height) {
  const data = Buffer.from(imageBuffer);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  }).png().toBuffer();
}

async function mapSplit(dimension) {
  const inputDir = path.join(__dirname, 'src', 'input', dimension);
  const files = fs.readdirSync(inputDir);
  const outputDir = path.join(__dirname, 'public', 'map');
  ensureDir(outputDir);

  for (const file of files) {
    const pos = file.match(/(x|z)-?\d+/g)
      ?.sort((a, b) => b.startsWith('x') - a.startsWith('x'))
      ?.map(i => parseInt(i.replace(/^(x|z)/g, ''), 10));

    if (pos) {
      const image = sharp(path.join(inputDir, file));
      const metadata = await image.clone().metadata();

      if (metadata.width !== 1024 || metadata.height !== 1024) {
        throw new Error(`make sure you have a 1024x1024 image: ${file}`);
      }

      for (let level = 2; level <= 5; level++) {
        console.log(`Current Zoom Level: ${level}`);
        const size = 2048 / 2 ** level;
        const levelDir = path.join(outputDir, String(level), dimension);
        ensureDir(levelDir);

        for (let i = 0; i < 2 ** (level - 1); i++) {
          for (let j = 0; j < 2 ** (level - 1); j++) {
            const output = path.join(levelDir, `${(pos[0] + size * i) / size}_${(pos[1] + size * j) / size}.png`);
            const resImg = await image
              .clone()
              .extract({ left: size * i, top: size * j, width: size, height: size })
              .resize(256, 256, { kernel: 'nearest' });
            const { data } = await resImg
              .clone()
              .greyscale()
              .raw()
              .toBuffer({ resolveWithObject: true });

            if (data.every(p => p === 0)) {
              console.log(pos[0] + size * i, pos[1] + size * j, output, `Lv${level} Extracted, blank.`);
            } else if (fs.existsSync(output)) {
              const result = await resImg
                .clone()
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => stripBlackToAlpha(data, info.width, info.height));

              const existingTile = await sharp(output)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => stripBlackToAlpha(data, info.width, info.height));

              const mergedTile = await sharp(existingTile)
                .composite([
                  {
                    input: result,
                    top: 0,
                    left: 0
                  }
                ])
                .png()
                .toBuffer();

              await sharp(mergedTile).toFile(output);

              console.log(pos[0] + size * i, pos[1] + size * j, output, `Lv${level} Extracted, merged!`);
            } else {
              await resImg.clone().toFile(output);
              console.log(pos[0] + size * i, pos[1] + size * j, output, `Lv${level} Extracted!`);
            }
          }
        }
      }
    } else {
      console.log(file, 'Skipped. Is this really an exported image?');
    }

    ensureDir(path.join(outputDir, '1', dimension));

    const lv2Path = path.join(outputDir, '2', dimension);
    if (!fs.existsSync(lv2Path)) {
      continue;
    }

    const filesLv2 = fs.readdirSync(lv2Path);
    const emptyTile = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer();

    while (filesLv2.length) {
      const targetImg = filesLv2[0];
      const pos = targetImg.split('_').map(i => parseInt(i, 10));
      if (!pos) {
        console.log(targetImg, 'Skipped. Is this really an exported image?');
        return;
      }

      if (pos[0] % 2) pos[0]--;
      if (pos[1] % 2) pos[1]--;

      const images = [];
      [
        { input: path.join(lv2Path, `${pos[0] + 0}_${pos[1] + 0}.png`), top: 0, left: 0 },
        { input: path.join(lv2Path, `${pos[0] + 0}_${pos[1] + 1}.png`), top: 256, left: 0 },
        { input: path.join(lv2Path, `${pos[0] + 1}_${pos[1] + 0}.png`), top: 0, left: 256 },
        { input: path.join(lv2Path, `${pos[0] + 1}_${pos[1] + 1}.png`), top: 256, left: 256 }
      ].forEach(img => {
        if (fs.existsSync(img.input)) {
          filesLv2.splice(filesLv2.findIndex(i => i === path.basename(img.input)), 1);
          images.push(img);
        } else {
          const newImg = { ...img, input: emptyTile };
          images.push(newImg);
        }
      });

      const imgName = `${pos[0] / 2}_${pos[1] / 2}.png`;
      const combined = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      }).composite(images)
        .png()
        .toBuffer();

      const output = path.join(outputDir, '1', dimension, imgName);

      if (fs.existsSync(output)) {
        const result = await sharp(combined)
          .ensureAlpha()
          .resize(256, 256)
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data, info }) => stripBlackToAlpha(data, info.width, info.height));

        const existingTile = await sharp(output)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data, info }) => stripBlackToAlpha(data, info.width, info.height));

        const mergedTile = await sharp(existingTile)
          .composite([
            {
              input: result,
              top: 0,
              left: 0
            }
          ])
          .png()
          .toBuffer();

        await sharp(mergedTile).toFile(output);
      } else {
        const transparentCombined = await sharp(combined)
          .ensureAlpha()
          .resize(256, 256)
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data, info }) => stripBlackToAlpha(data, info.width, info.height));

        await sharp(transparentCombined).toFile(output);
      }

      console.log(imgName);
    }
  }

  return true;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

(async () => {
  try {
    const ans = await new Promise(resolve => {
      rl.question('which map image do you want to split? (default: *)\n"overworld", "nether", "end", "*" (every dimension) is recommended.\n', resolve);
    });

    const aliases = {
      overworld: ['overworld', 'world', 'ow', 'o'],
      nether: ['nether', 'the_nether', 'hell', 'n'],
      end: ['end', 'the_end', 'e'],
      every: ['*', 'every', 'every_dimensions', 'everything', 'all']
    };

    const dimension = !ans || aliases.every.includes(ans)
      ? '*'
      : aliases.overworld.includes(ans)
        ? 'overworld'
        : aliases.nether.includes(ans)
          ? 'nether'
          : aliases.end.includes(ans)
            ? 'end'
            : ans;

    const dims = dimension === '*' ? ['overworld', 'nether', 'end'] : [dimension];
    await Promise.all(dims.map(mapSplit));
    console.log('Tile generation complete.');
  } catch (er) {
    console.error(er);
  } finally {
    rl.close();
  }
})();