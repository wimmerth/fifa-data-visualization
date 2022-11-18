const ctx = {
    YEAR : 2015,
}

function updateYear(input){
    ctx.YEAR = ctx.YEAR + input;
    d3.select("#yearLabel").text(ctx.YEAR);
    console.log("Year changed to " + ctx.YEAR);
}

function createViz(){
    console.log("Using D3 v" + d3.version);
    let svg = d3.select("#main").append("svg");
    svg.attr("width", 500);
    svg.attr("height", 500);
    loadData(svg);
}

function loadData(svg){
    d3.csv("fifa_players_15_22.csv", (data) => {
        // do something
    }).catch((error) => {
        console.log(error);
    });
}

