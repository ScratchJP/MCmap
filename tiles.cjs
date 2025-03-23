const fs = require('fs');
const path = require('path');
const readline = require('node:readline');
const sharp = require('sharp');

async function mapSplit(dimension) {
  const inputDir = `./src/input/${dimension}`;
  const files = fs.readdirSync(inputDir);
  const outputDir = './public/map'
  
  /* fs.readdirSync(outputDir)
    .forEach(file => fs.unlinkSync(path.join(outputDir, file))); */
  for (let k in files) {
    const pos = files[k].match(/(x|z)-?\d+/g)
      ?.sort((a,b) => b.startsWith("x") - a.startsWith("x"))
      ?.map(i => parseInt(i.replace(/^(x|z)/g, "")));
    if (pos) {
      const image = sharp(path.join(inputDir, files[k]));

      const metadata = await image.clone().metadata();

      if (metadata.width !== 1024 || metadata.height !== 1024) throw new Error('make sure you have a 1024x1024 image.');

      /*
      // level 0
      await image
        .clone()
        .resize(256, 256)
        .toFile(path.join(outputDir, `/0/${dimension}/${pos[0] / 1024}_${pos[1] / 1024}.png`))
      */

      for (let level = 2; level <= 5; level++) {
        console.log(`Current Zoom Level: ${level}`)
        const size = 2048 / 2 ** level;
        if (!fs.existsSync(path.join(outputDir, `/${level}/${dimension}`))) {
          fs.mkdirSync(path.join(outputDir, `/${level}/${dimension}`));
        }
        for (let i = 0; i < 2 ** (level - 1); i++) {
          for (let j = 0; j < 2 ** (level - 1); j++) {
            const output = `/${level}/${dimension}/${(pos[0] + size * i) / size}_${(pos[1] + size * j) / size}.png`;
            const resImg = await image
              .clone()
              .extract({ left: size * i, top: size * j, width: size, height: size })
              .resize(256, 256, { kernel: "nearest" });
            const { data } = await resImg
              .clone()
              .greyscale()
              .raw()
              .toBuffer({ resolveWithObject: true });
            if (data.every(p => p === 0)) {
              console.log(pos[0] + size * i, pos[1] + size * j, output, `Lv${level} Extracted, blank.`)
            } else {
              resImg.clone().toFile(path.join(outputDir, output), er => {})
              console.log(pos[0] + size * i, pos[1] + size * j, output, `Lv${level} Extracted!`)
            }
          }
        }
      }
    } else {
      console.log(files[k], "Skipped. Is this really an exported image?")
    }
  }

  return true;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('which map image do you want to split? (default: *)\n"overworld", "nether", "end", "*" (every dimension) is recommended.\n', ans => {
  try {
    const aliases = {
      overworld: [
        "overworld",
        "world",
        "ow",
        "o"
      ],
      nether: [
        "nether",
        "the_nether",
        "hell",
        "n"
      ],
      end: [
        "end",
        "the_end",
        "e"
      ],
      every: [
        "*",
        "every",
        "every_dimensions",
        "everything",
        "all"
      ],
    }

    const dimension = !ans || aliases.every.includes(ans) ? "*"
      : aliases.overworld.includes(ans) ? "overworld"
        : aliases.nether.includes(ans) ? "nether"
          : aliases.end.includes(ans) ? "end" 
            : ans;
    if (dimension === "*") {
      ["overworld", "nether", "end"].forEach(async d => await mapSplit(d))
    } else {
      mapSplit(dimension)
    }
    rl.close();
    return;
  } catch (er) { 
    console.error(er);
    rl.close()
  }
})