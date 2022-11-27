const ctx = {
    YEAR : 2015,
    width : 1900,
    height : 1900,
    footballFieldLineWidth : 0.2,
    backgroundGrey : "#2b2b2b",
    grassGreen : "#338033",
    SELECTION : null,
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
    statsRadar(data);
}

function updatePlotsOnSelection(year, selection){
    let playerPositions = findPlayerPositions(selection);
    data = ctx.playersPerYear[year].filter(d => playerPositions.includes(d.club_position));
    updateBestPlayerList(data);
    statsRadar(data);
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
//---------------------------------------------STATS RADAR-------------------------------------------------

function findAxis(playerList){
    let bestPlayers = playerList.sort((a, b) => b.overall - a.overall).slice(0, 10);
    let features = ["pace","shooting","passing","dribbling","defending","physic"];
    let allAxis = new Array();
    let length = bestPlayers.length;

    for (let player in bestPlayers){
        if(allAxis.length == 0)
            for (let feature in features){
                allAxis.push({axis:features[feature],value:parseFloat(bestPlayers[player][features[feature]])});
            }
        else{
            for (let feature in features){
                if(bestPlayers[player][features[feature]] == ""){
                    length -= 1;
                    break;
                }
                allAxis.forEach((element) => {
                    if(element.axis == features[feature]){
                        newValue = parseFloat(bestPlayers[player][features[feature]]);
                        element.value += newValue;
                    }
                });
            }
        }
    }
    allAxis.forEach((element) => {element.value = (element.value/length).toFixed(2);});
    console.log(allAxis);
    return allAxis;
}

function summaryStats(playerList){
    // compute median, 25th and 75th percentile, min and max for each relevant feature
    let features = ["pace","shooting","passing","dribbling","defending","physic"];
    // filter for top 100 players
    playerList = playerList.sort((a, b) => b.overall - a.overall).slice(0, 50);
    let statsList = ["max", "q3", "median", "q1", "min"];
    let stats = {};
    for (let stat of statsList) {
        stats[stat] = new Array();
    }
    for (let feature of features) {
        let values = playerList.map(d => parseFloat(d[feature]));
        values.sort((a, b) => a - b);
        stats["median"].push({axis: feature, value: d3.median(values)});
        stats["min"].push({axis: feature, value: d3.min(values)});
        stats["max"].push({axis: feature, value: d3.max(values)});
        stats["q1"].push({axis: feature, value: d3.quantile(values, 0.25)});
        stats["q3"].push({axis: feature, value: d3.quantile(values, 0.75)});
    }
    // stats = Object.values(stats)
    let orderedStats = new Array();
    for (let stat of statsList) {
        orderedStats.push({"name": stat, "values": stats[stat]});
    }
    return orderedStats;
}

function statsRadar(playerList){
    document.getElementById("statsG").innerHTML = '';

    let cfg = {
        w: 300,				//width of the circle
        h: 300,				//height of the circle
        levels: 3,				//levels of inner circles
        maxValue: 100, 			//value that the biggest circle will represent
        labelFactor: 1.25, 	//distance between outer circle and label
        wrapWidth: 60, 		//number of pixels after which a label needs to be given a new line
        opacityArea: 0.35, 	//opacity of the area of the blob
        dotRadius: 4, 			//size of the colored circles of each blog
        opacityCircles: 0.1, 	//opacity of the circles of each blob
        strokeWidth: 2, 		//width of the stroke around each blob
        // color: d3.scaleOrdinal(d3.schemeCategory10),
        color: (d) => "lightblue",
        roundStrokes: true
    };

    // let allAxis = [findAxis(playerList)];
    let allAxis = summaryStats(playerList);
    let axisNames = (allAxis[0]["values"].map(function(i, j){return i.axis}));	//names of each axis
    let total = axisNames.length;					//total number of different axes
    let radius = Math.min(cfg.w/2, cfg.h/2); 	//radius of the outermost circle
    let angleSlice = Math.PI * 2 / total;		//width in radians of each "slice"
    
    //radius scale
    let radiusScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 100]);

    let statsRadar = d3.select("#statsG");
    statsRadar.attr("transform", "translate(900, 700)");
    
    // circular grid
    //wrapper for the grid & axes
    let axisGrid = statsRadar.append("g").attr("class", "axisWrapper");
    
    //draw the background circles
    axisGrid.selectAll(".levels")
        .data(d3.range(1,(cfg.levels+1)).reverse())
        .enter()
        .append("circle")
        .attr("class", "gridCircle")
        .attr("r", function(d, i){return radius/cfg.levels*d;})
        .style("fill", "#CDCDCD")
        .style("stroke", "#CDCDCD")
        .style("fill-opacity", cfg.opacityCircles)
        .style("filter" , "url(#glow)");

    //show percentage of each level
	axisGrid.selectAll(".axisLabel")
        .data(d3.range(1,(cfg.levels+1)).reverse())
        .enter().append("text")
        .attr("class", "axisLabel")
        .attr("x", 4)
        .attr("y", function(d){return -d*radius/cfg.levels;})
        .attr("dy", "0.4em")
        .style("font-size", "10px")
        .attr("fill", "#FFFFFF")
        .text(function(d,i) { return (cfg.maxValue * d/cfg.levels).toFixed(0); });

    //straight line axes radiating outward from the center
    let axis = axisGrid.selectAll(".axis")
        .data(axisNames)
        .enter()
        .append("g")
        .attr("class", "axis");
    
    //append axes
    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", function(d, i){ return radiusScale(cfg.maxValue*1.1) * Math.cos(angleSlice*i - Math.PI/2); })
        .attr("y2", function(d, i){ return radiusScale(cfg.maxValue*1.1) * Math.sin(angleSlice*i - Math.PI/2); })
        .attr("class", "line")
        .style("stroke", "white")
        .style("stroke-width", "2px");

    //append the labels of each axis
	axis.append("text")
        .attr("class", "legend")
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("fill", "#FFFFFF")
        .attr("dy", "0.35em")
        .attr("x", function(d, i){ return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
        .attr("y", function(d, i){ return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
        .text(string => {return string.charAt(0).toUpperCase() + string.slice(1)});
    
    // radar chart blobs
	// radial line function
	var radarLine = d3.lineRadial()
        .radius(function(d) { return radiusScale(d.value); })
        .angle(function(d,i) {	return i*angleSlice; });
    
    if(cfg.roundStrokes) {
        radarLine.curve(d3.curveLinearClosed);
    }
                
    //wrapper for the blobs	
    var blobWrapper = statsRadar.selectAll(".radarWrapper")
        .data(allAxis)
        .enter().append("g")
        .attr("class", "radarWrapper");
           
    // create a tooltip
    /*
    var Tooltip = statsRadar
        .append("div")
        .style("opacity", 1)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
    */

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function(d) {
    }
    var mousemove = function(event, d) {
        statsRadar.select("#legend").text(d.name);
        // console.log(d3.pointer(event)[0] + " " + d3.pointer(event)[1] + " " + d.name);
    }
    var mouseleave = function() {
        statsRadar.select("#legend").text("");
    }

    //append backgrounds	
    blobWrapper.append("path")
        .attr("class", "radarArea")
        .attr("d", function(d,i) { return radarLine(d.values); })
        .style("fill", function(d,i) {
            if (["q1", "median", "q3"].includes(d.name)) {
                return cfg.color(i);
            } else {
                return "none";
            }
        })
        .style("fill-opacity", cfg.opacityArea)
        .on('mouseover', function (d,i){
            //Dim all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1); 
            //Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);
            mouseover(d);
        })
        .on('mousemove', (event, d) =>{
            mousemove(event, d);
        })
        .on('mouseout', function(){
            //Bring back all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", cfg.opacityArea);
            mouseleave();
        });

    //outlines	
	blobWrapper.append("path")
        .attr("class", "radarStroke")
        .attr("d", function(d,i) { return radarLine(d.values); })
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", function(d,i) {
            if (["min", "max"].includes(d.name)) {
                return cfg.color(i);
            } else {
                return "none";
            }
        })
        .style("fill", "none")
        .style("filter" , "url(#glow)");
    /*
    //append the circles
    blobWrapper.selectAll(".radarCircle")
        .data(function(d,i) { return d.values; })
        .enter().append("circle")
        .attr("class", "radarCircle")
        .attr("r", cfg.dotRadius)
        .attr("cx", function(d,i){ return radiusScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
        .attr("cy", function(d,i){ return radiusScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
        .style("fill", function(d,i,j) { return cfg.color(j); })
        .style("fill-opacity", 0.8);
    */
    // legend in top left corner
    statsRadar.append("text")
        .attr("class", "legend")
        .attr("id", "legend")
        .style("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("fill", "lightblue")
        .attr("dy", "0.35em")
        .attr("x", -cfg.w/2)
        .attr("y", -cfg.h/2)
        .text("");
}

function updateRadarChart(playerData){

}