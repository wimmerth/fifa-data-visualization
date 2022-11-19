

const ctx = {
    YEAR : 2015,
}

function updateYear(input){
    if (ctx.YEAR + input >= 2015 && ctx.YEAR + input <= 2022){
        ctx.YEAR = ctx.YEAR + input;
        d3.select("#yearLabel").text(ctx.YEAR);
        console.log("Number of players in " + ctx.YEAR + ": " + ctx.playersPerYear[ctx.YEAR].length);
    } else {
        console.log("Year out of range");
    }
}

function createViz(){
    console.log("Using D3 v" + d3.version);
    let svg = d3.select("#main").append("svg");
    svg.attr("width", 500);
    svg.attr("height", 500);
    var rootG = svg.append("g").attr("id", "rootG");
    rootG.append("g").attr("id","bkgG");
    rootG.append("g").attr("id","footballfieldG");
    rootG.append("g").attr("id","comparisonG");
    rootG.append("g").attr("id","statsG");
    loadData(svg);
}

function loadData(svg){
    d3.csv("fifa_players_15_22.csv").then((data) => {
        console.log("Number of rows: " + data.length);
        let playersPerYear = {};
        for (let i = 0; i < data.length; i++){
            let row = data[i];
            let year = row["year"];
            if (year in playersPerYear){
                playersPerYear[year].push(row);
            } else {
                playersPerYear[year] = [row];
            }
        }
        console.log("Number of years: " + Object.keys(playersPerYear).length);
        console.log("Number of players in " + ctx.YEAR + ": " + playersPerYear[ctx.YEAR].length);
        ctx.playersPerYear = playersPerYear;
    }).catch((error) => {
        console.log(error);
    });
}

