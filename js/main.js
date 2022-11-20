const ctx = {
    YEAR : 2015,
    width : 1900,
    height : 1900,
    footballFieldLineWidth : 0.2,
    backgroundGrey : "#2b2b2b",
    grassGreen : "#338033"
}

function updateYear(input){
    if (ctx.YEAR + input >= 2015 && ctx.YEAR + input <= 2022){
        ctx.YEAR = ctx.YEAR + input;
        d3.select("#yearLabel").text(ctx.YEAR);
        console.log("Number of players in " + ctx.YEAR + ": " + ctx.playersPerYear[ctx.YEAR].length);
        updatePlotsOnSelection(ctx.YEAR, ctx.SELECTION);
    } else {
        console.log("Year out of range");
    }
}

function createViz(){
    console.log("Using D3 v" + d3.version);
    let svg = d3.select("#main").append("svg");
    svg.attr("width", ctx.width);
    svg.attr("height", ctx.height);
    var rootG = svg.append("g").attr("id", "rootG");
    rootG.append("g").attr("id","bkgG");
    rootG.append("g").attr("id","footballfieldG");
    rootG.append("g").attr("id", "bestPlayerListG");
    rootG.append("g").attr("id","comparisonG");
    rootG.append("g").attr("id","statsG");

    let background = d3.select("#bkgG");
    background.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", ctx.width)
        .attr("height", ctx.height)
        .attr("fill", ctx.backgroundGrey);

    initFootballField();
    loadData();
}

function loadData(){
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
        initPlots(ctx.playersPerYear[ctx.YEAR]);
    }).catch((error) => {
        console.log(error);
    });

    d3.csv("player_positions.csv").then((d) => {
        let playerPositions = {};
        for (let i = 0; i < (d.length); i++){
            playerPositions[d[i].pos] = [d[i].x_min, d[i].x_max, d[i].y_min, d[i].y_max];
        }
        console.log("Players positions loaded");
        ctx.playerPositions = playerPositions;
        console.log(ctx.playerPositions);
    }).catch((error) => {
        console.log(error);
    });
}

function initPlots(data){
    initBestPlayerList(data);
}

function updatePlotsOnSelection(year, selection){
    let playerPositions = findPlayerPositions(selection);
    data = ctx.playersPerYear[year].filter(d => playerPositions.includes(d.club_position));
    updateBestPlayerList(data);
}

function findPlayerPositions(selection){
    if (selection === null){
        console.log(Object.keys(ctx.playerPositions));
        return Object.keys(ctx.playerPositions);
    } else {
        let x_min = ctx.footballFieldInverseScaleX(selection[0][0]);
        let x_max = ctx.footballFieldInverseScaleX(selection[1][0]);
        let y_min = ctx.footballFieldInverseScaleY(selection[0][1]);
        let y_max = ctx.footballFieldInverseScaleY(selection[1][1]);
        console.log("x_min: " + x_min + ", x_max: " + x_max + ", y_min: " + y_min + ", y_max: " + y_max);
        let selectedPositions = [];
        for (let position in ctx.playerPositions){
            let pos = ctx.playerPositions[position];
            // select position if there is an overlap between the selection and the position
            if (x_min < pos[1] && x_max > pos[0] && y_min < pos[3] && y_max > pos[2]){
                selectedPositions.push(position);
            }
        }
        console.log(selectedPositions);
        return selectedPositions;
    }
}

//---------------------------------------------------------------------------------------------------------

function initFootballField(){
    let footballfieldG = d3.select("#footballfieldG");
    footballfieldG.attr("transform", "translate(100, 100)");
    ctx.footballFieldScaleX = d3.scaleLinear()
        .domain([0, 60])
        .range([0, 600]);
    ctx.footballFieldScaleY = d3.scaleLinear()
        .domain([0, 90])
        .range([0, 900]);
    ctx.footballFieldInverseScaleX = d3.scaleLinear()
        .domain([0, 600])
        .range([0, 60]);
    ctx.footballFieldInverseScaleY = d3.scaleLinear()
        .domain([0, 900])
        .range([0, 90]);
    let footballfield = footballfieldG.append("g").attr("id", "footballfield");
    let color = ctx.grassGreen;
    
    footballfield.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", ctx.footballFieldScaleX(60))
        .attr("height", ctx.footballFieldScaleY(90))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX(ctx.footballFieldLineWidth))
        .attr("y", ctx.footballFieldScaleY(ctx.footballFieldLineWidth))
        .attr("width", ctx.footballFieldScaleX(60 - 2 * ctx.footballFieldLineWidth))
        .attr("height", ctx.footballFieldScaleY(90 - 2 * ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");

    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(11))
        .attr("r", ctx.footballFieldScaleX(9.15))
        .attr("fill", "white");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(79))
        .attr("r", ctx.footballFieldScaleX(9.15))
        .attr("fill", "white");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(11))
        .attr("r", ctx.footballFieldScaleX(9.15 - ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(79))
        .attr("r", ctx.footballFieldScaleX(9.15 - ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 40.32) / 2))
        .attr("y", ctx.footballFieldScaleY(0))
        .attr("width", ctx.footballFieldScaleX(40.32))
        .attr("height", ctx.footballFieldScaleY(16.5))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 40.32) / 2 + ctx.footballFieldLineWidth))
        .attr("y", ctx.footballFieldScaleY(ctx.footballFieldLineWidth))
        .attr("width", ctx.footballFieldScaleX(40.32 - 2 * ctx.footballFieldLineWidth))
        .attr("height", ctx.footballFieldScaleY(16.5 - 2 * ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 40.32) / 2))
        .attr("y", ctx.footballFieldScaleY(90 - 16.5))
        .attr("width", ctx.footballFieldScaleX(40.32))
        .attr("height", ctx.footballFieldScaleY(16.5))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 40.32) / 2 + ctx.footballFieldLineWidth))
        .attr("y", ctx.footballFieldScaleY(90 - 16.5 + ctx.footballFieldLineWidth))
        .attr("width", ctx.footballFieldScaleX(40.32 - 2 * ctx.footballFieldLineWidth))
        .attr("height", ctx.footballFieldScaleY(16.5 - 2 * ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");

    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 18.32) / 2))
        .attr("y", ctx.footballFieldScaleY(0))
        .attr("width", ctx.footballFieldScaleX(18.32))
        .attr("height", ctx.footballFieldScaleY(5.5))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 18.32) / 2 + ctx.footballFieldLineWidth))
        .attr("y", ctx.footballFieldScaleY(ctx.footballFieldLineWidth))
        .attr("width", ctx.footballFieldScaleX(18.32 - 2 * ctx.footballFieldLineWidth))
        .attr("height", ctx.footballFieldScaleY(5.5 - 2 * ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 18.32) / 2))
        .attr("y", ctx.footballFieldScaleY(90 - 5.5))
        .attr("width", ctx.footballFieldScaleX(18.32))
        .attr("height", ctx.footballFieldScaleY(5.5))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", ctx.footballFieldScaleX((60 - 18.32) / 2 + ctx.footballFieldLineWidth))
        .attr("y", ctx.footballFieldScaleY(90 - 5.5 + ctx.footballFieldLineWidth))
        .attr("width", ctx.footballFieldScaleX(18.32 - 2 * ctx.footballFieldLineWidth))
        .attr("height", ctx.footballFieldScaleY(5.5 - 2 * ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(11))
        .attr("r", ctx.footballFieldScaleX(2 * ctx.footballFieldLineWidth))
        .attr("fill", "white");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(79))
        .attr("r", ctx.footballFieldScaleX(2 * ctx.footballFieldLineWidth))
        .attr("fill", "white");

    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(30))
        .attr("cy", ctx.footballFieldScaleY(45))
        .attr("r", ctx.footballFieldScaleX(9.15))
        .attr("fill", "white");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(60 / 2))
        .attr("cy", ctx.footballFieldScaleY(90 / 2))
        .attr("r", ctx.footballFieldScaleX(9.15 - ctx.footballFieldLineWidth))
        .attr("fill", color)
        .attr("class", "grass");
    footballfield.append("circle")
        .attr("cx", ctx.footballFieldScaleX(60 / 2))
        .attr("cy", ctx.footballFieldScaleY(90 / 2))
        .attr("r", ctx.footballFieldScaleX(2 * ctx.footballFieldLineWidth))
        .attr("fill", "white");
    footballfield.append("rect")
        .attr("x", 0)
        .attr("y", ctx.footballFieldScaleY(45-ctx.footballFieldLineWidth / 2))
        .attr("width", ctx.footballFieldScaleX(60))
        .attr("height", ctx.footballFieldScaleY(ctx.footballFieldLineWidth))
        .attr("fill", "white");
    
    footballfield.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", ctx.footballFieldScaleX(60))
        .attr("height", ctx.footballFieldScaleY(90))
        .attr("fill", "rgba(0,0,0,0)");

    setupBrush();
}

function setupBrush(){
    brush = d3.brush()
        .extent([
            [0,0],
            [600, 900]
        ])
        .on("brush end", (event) => { // TODO: check if 'brush end' is doable with all changes in plots
            if (event.selection === null) {
                console.log("No selection");
                changeGrassColor(ctx.grassGreen);
            } else {
                console.log("Selection: " + event.selection);
                changeGrassColor("gray");
            }
            ctx.SELECTION = event.selection;
            updatePlotsOnSelection(ctx.YEAR, ctx.SELECTION);
        });
    d3.select("#footballfieldG").call(brush);
}

function changeGrassColor(color) {
    d3.selectAll(".grass").attr("fill", color);
}

//---------------------------------------------------------------------------------------------------------

function initBestPlayerList(playerList){
    let listGroup = d3.select("#bestPlayerListG");
    listGroup.attr("transform", "translate(705, 100)");
    let bestPlayers = playerList.sort((a, b) => b.overall - a.overall).slice(0, 10);
    // show best players in button list next in the listGroup
    let bestPlayerButtons = listGroup.selectAll("g")
        .data(bestPlayers)
        .join("g")
        .attr("transform", (d, i) => "translate(0, " + i * 40 + ")");
    bestPlayerButtons.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 300)
        .attr("height", 40)
        .attr("fill", "#004e82")
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    bestPlayerButtons.append("text")
        .attr("x", 10)
        .attr("y", 30)
        .attr("font-size", 20)
        .attr("fill", "white")
        .attr("class", "playerName")
        .text(d => d.short_name);
    bestPlayerButtons.append("text")
        .attr("x", 200)
        .attr("y", 30)
        .attr("font-size", 20)
        .attr("fill", "white")
        .attr("class", "playerOverall")
        .text(d => d.overall);
    bestPlayerButtons.append("image")
        .attr("xlink:href", d => d.player_face_url)
        .attr("x", 250)
        .attr("y", 1)
        .attr("width", 38)
        .attr("height", 38);
    bestPlayerButtons.on("click", (event, d) => {
        console.log("Clicked on " + d.short_name);
    });
}

function updateBestPlayerList(playerList){
    let bestPlayers = playerList.sort((a, b) => b.overall - a.overall).slice(0, 10);
    bestPlayerButtons = d3.select("#bestPlayerListG").selectAll("g").data(bestPlayers).join(
        enter => console.log("enter"),
        update => {
            update.style("visibility", "visible");
            return update
        },
        exit => {
            console.log("exit");
            exit.style("visibility", "hidden");
        }
    );
    bestPlayerButtons.select(".playerName").text(d => d.short_name);
    bestPlayerButtons.select(".playerOverall").text(d => d.overall);
    bestPlayerButtons.select("image").attr("xlink:href", d => d.player_face_url);
}

//---------------------------------------------------------------------------------------------------------