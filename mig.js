import * as fs from 'node:fs'

const mrk = `rg(pScjp, "ScJP村", 10, -2, 0);
rg(pAsp, "阿斑市", -510, -190, 0);
rg(pRa, "乱歩市", -290, -410, 0);
rg(pRk, "陸果町", -448, -448, 0);
rg(pBy, "望洋市", -195, -800, 0);
rg(pys, "ysタウン", 285, 950, 0);
rg(psk, "すいこん島", 3190, 80, 0);
rg(paI, "あぁるごんアイランド", 3600, 344, 0);
rg(pUX, "UXRCF市", 872, 269, 0);
rg(pLi, "凛市", -6, 1420, 0);
rg(psm, "すいめろ島", 3126, -261, 0);`;

const r = mrk.split(/\r?\n/g).map(i=>i.replace(/^rg\([^,]+, "/gm,"").replace(/, 0\);$/,"").split(/, ?/g).map(j=>j.replace(/"$/,""))).map(i=>{return{name:i[0],position:[parseFloat(i[1]),parseFloat(i[2])],dimension:0}})

fs.writeFileSync('./mig.txt', JSON.stringify(r, null, 2))