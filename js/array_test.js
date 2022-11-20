var gfg = new Array(90);

for (var i = 0; i < gfg.length; i++) {
    gfg[i] = new Array(60);
}

for (var i = 0; i < 2; i++) {
    for (var j = 0; j < 2; j++) {
        gfg[i][j] = 0;
    }
}

gfg[10][30] = 'lf'
console.log(gfg[10,20][30])