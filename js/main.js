const ctx = {
    YEAR: 2022,
    width: 1900,
    height: 3000,
    footballFieldLineWidth: 0.2,
    backgroundGrey: "#2b2b2b",
    grassGreen: "#338033",
    SELECTION: null,
    comparisonAttr: "overall",
    comparisonAttrRef: "Overall",
    comparisonColors: ["#4DD0F7","#F76590"],
    comparisonPlayers: {},
    radarAxisNames: ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physic"],
}

function updateYear(input) {
    if (ctx.YEAR + input >= 2015 && ctx.YEAR + input <= 2022) {
        ctx.YEAR = ctx.YEAR + input;
        d3.select("#yearLabel").text(ctx.YEAR);
        console.log("Number of players in " + ctx.YEAR + ": " + ctx.playersPerYear[ctx.YEAR].length);
        updatePlotsOnSelection(ctx.YEAR, ctx.SELECTION);
    } else {
        console.log("Year out of range");
    }
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    let svg = d3.select("#main").append("svg");
    svg.attr("width", ctx.width);
    svg.attr("height", ctx.height);
    var rootG = svg.append("g").attr("id", "rootG");
    rootG.append("g").attr("id", "bkgG");
    rootG.append("g").attr("id", "footballfieldG");
    rootG.append("g").attr("id", "bestPlayerListG");
    rootG.append("g").attr("id", "playerDetailG");
    rootG.append("g").attr("id","playersComparisonG");
    // rootG.append("g").attr("id","statsG");

    let background = d3.select("#bkgG");
    background.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", ctx.width)
        .attr("height", ctx.height)
        .attr("fill", ctx.backgroundGrey);

    loadPlayerPositions();
    initPlayersComparisonView(); //test
    initPlayerDetailView();
    loadData();
}

function loadPlayerPositions() {
    d3.csv("player_positions.csv").then((d) => {
        let playerPositions = {};
        for (let i = 0; i < (d.length); i++) {
            playerPositions[d[i].pos] = [d[i].x_min, d[i].x_max, d[i].y_min, d[i].y_max];
        }
        console.log("Players positions loaded");
        ctx.playerPositions = playerPositions;
        initFootballField();
    }).catch((error) => {
        console.log(error);
    });
}


function loadData() {
    d3.csv("fifa_players_15_22.csv").then((data) => {
        console.log("Number of rows: " + data.length);
        let playersPerYear = {};
        for (let i = 0; i < data.length; i++) {
            let row = data[i];
            let year = row["year"];
            if (year in playersPerYear) {
                playersPerYear[year].push(row);
            } else {
                playersPerYear[year] = [row];
            }
        }
        console.log("Number of years: " + Object.keys(playersPerYear).length);
        console.log("Number of players in " + ctx.YEAR + ": " + playersPerYear[ctx.YEAR].length);
        ctx.playersPerYear = playersPerYear;
        ctx.currentDataSelection = playersPerYear[ctx.YEAR];
        initPlots(ctx.playersPerYear[ctx.YEAR]);
        initSelectors(ctx.playersPerYear[ctx.YEAR]); // test
    }).catch((error) => {
        console.log(error);
    });
}

function initPlots(data) {
    initBestPlayerList(data);
    createRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
    createRadar("playerStatsG", "playerDetailG", data, getPlayerStatsCfg(), "individual");
    createRadar("comparisonRadarG", "playersComparisonG", data, getComparisonStatsCfg(), "comparison");

    drawRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
}

function updatePlotsOnSelection(year, selection) {
    let playerPositions = findPlayerPositions(selection);
    data = ctx.playersPerYear[year].filter(d => playerPositions.includes(d.club_position));
    ctx.currentDataSelection = data;
    updateBestPlayerList(data);
    // groupStatsRadar(data);
    drawRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
    // playerStatsRadar(data);
    // statsRadar(data);
}

function findPlayerPositions(selection) {
    if (selection === null) {
        console.log(Object.keys(ctx.playerPositions));
        return Object.keys(ctx.playerPositions);
    } else {
        let x_min = ctx.footballFieldInverseScaleX(selection[0][0]);
        let x_max = ctx.footballFieldInverseScaleX(selection[1][0]);
        let y_min = ctx.footballFieldInverseScaleY(selection[0][1]);
        let y_max = ctx.footballFieldInverseScaleY(selection[1][1]);
        console.log("x_min: " + x_min + ", x_max: " + x_max + ", y_min: " + y_min + ", y_max: " + y_max);
        let selectedPositions = [];
        for (let position in ctx.playerPositions) {
            let pos = ctx.playerPositions[position];
            // select position if there is an overlap between the selection and the position
            if (x_min < pos[1] && x_max > pos[0] && y_min < pos[3] && y_max > pos[2]) {
                selectedPositions.push(position);
            }
        }
        console.log(selectedPositions);
        return selectedPositions;
    }
}

//---------------------------------------------------------------------------------------------------------

function initFootballField() {
    let footballfieldG = d3.select("#footballfieldG");
    footballfieldG.attr("transform", "translate(50, 100)");
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
        .attr("y", ctx.footballFieldScaleY(45 - ctx.footballFieldLineWidth / 2))
        .attr("width", ctx.footballFieldScaleX(60))
        .attr("height", ctx.footballFieldScaleY(ctx.footballFieldLineWidth))
        .attr("fill", "white");

    footballfield.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", ctx.footballFieldScaleX(60))
        .attr("height", ctx.footballFieldScaleY(90))
        .attr("fill", "rgba(0,0,0,0)");

    for ([pos_title, pos] of Object.entries(ctx.playerPositions)) {
        footballfieldG.append("rect")
            .attr("id", "position-" + pos_title)
            .attr("x", ctx.footballFieldScaleX(pos[0]))
            .attr("y", ctx.footballFieldScaleY(pos[2]))
            .attr("width", ctx.footballFieldScaleX(pos[1] - pos[0]))
            .attr("height", ctx.footballFieldScaleY(pos[3] - pos[2]))
            .attr("fill", "green")
            .style("stroke-dasharray", "10,5")
            .style("stroke", "lightgrey")
            .style("stroke-opacity", 0.5)
            .attr("fill-opacity", 0);
    }

    setupBrush();
}

function setupBrush() {
    brush = d3.brush()
        .extent([
            [0, 0],
            [600, 900]
        ])
        .on("brush end", (event) => { // TODO: check if 'brush end' is doable with all changes in plots
            if (event.selection === null) {
                console.log("No selection");
                changeGrassColor(ctx.grassGreen);
                for (pos_title of Object.keys(ctx.playerPositions)) {
                    d3.select("#position-" + pos_title).attr("fill-opacity", 0);
                }
            } else {
                console.log("Selection: " + event.selection);
                changeGrassColor("gray");
                pos_list = findPlayerPositions(event.selection);
                for (pos_title of Object.keys(ctx.playerPositions)) {
                    if (pos_list.includes(pos_title)) {
                        d3.select("#position-" + pos_title).attr("fill-opacity", 0.6);
                    } else {
                        d3.select("#position-" + pos_title).attr("fill-opacity", 0);
                    }
                }
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

function initBestPlayerList(playerList) {
    let listGroup = d3.select("#bestPlayerListG");
    listGroup.attr("transform", "translate(655, 100)");
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
        .attr("fill", "#18414e")
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
        updatePlayerDetailView(d);
        // playerStatsRadar();
        drawRadar("playerStatsG", "playerDetailG", [d], getPlayerStatsCfg(), "individual");
    });
}

function updateBestPlayerList(playerList) {
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

function summaryStats(playerList, task) {
    // compute median, 25th and 75th percentile, min and max for each relevant feature
    let features = ["pace", "shooting", "passing", "dribbling", "defending", "physic"];
    let features_nice_names = ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physic"];
    let gk_features = ["gk_diving", "gk_handling", "gk_kicking", "gk_reflexes", "gk_speed", "gk_positioning"];
    let gk_features_nice_names = ["Diving", "Handling", "Kicking", "Reflexes", "Speed", "Positioning"];
    let orderedStats = new Array();
    let stats = {};
    // filter for top 100 players
    
    if(task != "group"){
        for (let player in playerList) {
            stats[player] = new Array();
        }
        for (let feature of features) {
            let values = playerList.map(d => parseFloat(d[feature]));
            let nice_feature = features_nice_names[features.indexOf(feature)];
            playerList.forEach((player, i) => stats[i].push({ axis: nice_feature, value: values[i] }))
        }
        playerList.forEach((player, i) =>{
            orderedStats.push({ "name": player.short_name, "values": stats[i] });
        })
    }
    else{
        playerList = playerList.sort((a, b) => b.overall - a.overall).slice(0, 100);
        let statsList = ["max", "q3", "median", "q1", "min"];
        for (let stat of statsList) {
            stats[stat] = new Array();
        }
        for (let feature of features) {
            let values = playerList.map(d => parseFloat(d[feature]));
            let nice_feature = features_nice_names[features.indexOf(feature)];
            values.sort((a, b) => a - b);
            stats["median"].push({ axis: nice_feature, value: d3.median(values) });
            stats["min"].push({ axis: nice_feature, value: d3.min(values) });
            stats["max"].push({ axis: nice_feature, value: d3.max(values) });
            stats["q1"].push({ axis: nice_feature, value: d3.quantile(values, 0.25) });
            stats["q3"].push({ axis: nice_feature, value: d3.quantile(values, 0.75) });
        }
        for (let stat of statsList) {
            orderedStats.push({ "name": stat, "values": stats[stat] });
        }
    }

    return orderedStats;
}

function getGroupStatsCfg() {
    let cfg = {
        x: 850,
        y: 750,
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
        color: (d) => "lightblue",
        roundStrokes: true
    };
    return cfg
}

function getPlayerStatsCfg() {
    let cfg = {
        x: 625,
        y: 265,
        w: 150,				//width of the circle
        h: 150,				//height of the circle
        levels: 3,				//levels of inner circles
        maxValue: 100, 			//value that the biggest circle will represent
        labelFactor: 1.25, 	//distance between outer circle and label
        wrapWidth: 60, 		//number of pixels after which a label needs to be given a new line
        opacityArea: 0.35, 	//opacity of the area of the blob
        dotRadius: 4, 			//size of the colored circles of each blog
        opacityCircles: 0.1, 	//opacity of the circles of each blob
        strokeWidth: 2, 		//width of the stroke around each blob
        color: (d) => "lightblue",
        roundStrokes: true
    };
    return cfg
}

function createRadar(id, rootId, playerList, cfg, task) {
    let axisNames = ctx.radarAxisNames
    let total = axisNames.length;					//total number of different axes
    let radius = Math.min(cfg.w / 2, cfg.h / 2); 	//radius of the outermost circle
    let angleSlice = Math.PI * 2 / total;		//width in radians of each "slice"

    //radius scale
    let radiusScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 100]);

    let statsRadar = d3.select("#" + rootId)
        .append("g")
        .attr("id", id);


    statsRadar.attr("transform", `translate(${cfg.x}, ${cfg.y})`);

    // circular grid
    //wrapper for the grid & axes
    let axisGrid = statsRadar.append("g").attr("class", "axisWrapper");

    //show percentage of each level
    axisGrid.selectAll(".axisLabel")
        .data(d3.range(1, (cfg.levels + 1)).reverse())
        .enter().append("text")
        .attr("class", "axisLabel")
        .attr("x", 4)
        .attr("y", function (d) { return -d * radius / cfg.levels; })
        .attr("dy", "0.4em")
        .style("font-size", "10px")
        .attr("fill", function (d, i) {
            if(task == "group"){ return "white"; }
            else { return "#18414e"; }
        })
        .text(function (d, i) { return (cfg.maxValue * d / cfg.levels).toFixed(0); });

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
        .attr("x2", function (d, i) { return radiusScale(cfg.maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2); })
        .attr("y2", function (d, i) { return radiusScale(cfg.maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2); })
        .attr("class", "line")
        .style("stroke", function (d, i) {
            if(task == "group"){ return "white"; }
            else { return tinycolor("#18414e"); }
        })
        .style("stroke-width", "2px");

    //append the labels of each axis
    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("fill", function (d, i) {
            if(task == "group"){ return "white"; }
            else { return "#18414e"; }
        })
        .attr("dy", "0.35em")
        .attr("x", function (d, i) { return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2); })
        .attr("y", function (d, i) { return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2); })
        .text(string => { return string.charAt(0).toUpperCase() + string.slice(1) });
}
    
    
    
function drawRadar(id, rootId, playerList, cfg, task){
    while(document.getElementById(`${task}RadarWrapper`) != null) {
        document.getElementById(`${task}RadarWrapper`).remove();
    }
    let allAxis = summaryStats(playerList, task);
    let axisNames = ctx.radarAxisNames
    let total = axisNames.length;					//total number of different axes
    let radius = Math.min(cfg.w / 2, cfg.h / 2); 	//radius of the outermost circle
    let angleSlice = Math.PI * 2 / total;		//width in radians of each "slice"

    //radius scale
    let radiusScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 100]);

    let statsRadar = d3.select(`#${id}`);
        // radar chart blobs
        // radial line function
    var radarLine = d3.lineRadial()
        .radius(function (d) { return radiusScale(d.value); })
        .angle(function (d, i) { return i * angleSlice; });
        
    if (cfg.roundStrokes) {
        radarLine.curve(d3.curveLinearClosed);
    }

    //wrapper for the blobs	
    var blobWrapper = statsRadar.selectAll(`#${task}RadarWrapper`)
        .data(allAxis)
        .enter().append("g")
        .attr("id", `${task}RadarWrapper`);

    blobWrapper.append("title")
        .text(function (d, i) { return d.name; });

    //append backgrounds	
    blobWrapper.append("path")
        .attr("class", "radarArea")
        .attr("d", function (d, i) { return radarLine(d.values); })
        .style("fill", function (d, i) {
            if(task == "comparison"){
                // player selected on selection 1 or 2?
                compPosition = Object.keys(ctx.comparisonPlayers).find(key => ctx.comparisonPlayers[key].short_name === d.name);
                return ctx.comparisonColors[compPosition-1];
            }
            else if(task == "individual"){
                return cfg.color(i);
            }
            else{
                if (["q1", "median", "q3"].includes(d.name)) {
                    return cfg.color(i);
                }
                else {
                    return "none";
                }
            } 
        })
        .style("fill-opacity", cfg.opacityArea)
        .on('mouseover', function (d, i) {
            //Dim all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1);
            //Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);
        })
        .on('mouseout', function () {
            //Bring back all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", cfg.opacityArea);
        });

    //outlines	
    blobWrapper.append("path")
        .attr("class", "radarStroke")
        .attr("d", function (d, i) { return radarLine(d.values); })
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", function (d, i) {
            if (["min", "max"].includes(d.name)) {
                return cfg.color(i);
            } else {
                return "none";
            }
        })
        .style("fill", "none")
        .style("filter", "url(#glow)");

}


//---------------------------------------------------------------------------------------------------------

// player detail view

const statDicts = {
    attacking_stats: { "Crossing": "attacking_crossing", "Finishing": "attacking_finishing", "Heading Accuracy": "attacking_heading_accuracy", "Short Passing": "attacking_short_passing", "Volleys": "attacking_volleys" },
    skill_stats: { "Dribbling": "skill_dribbling", "Curve": "skill_curve", "FK Accuracy": "skill_fk_accuracy", "Long Passing": "skill_long_passing", "Ball Control": "skill_ball_control" },
    movement_stats: { "Acceleration": "movement_acceleration", "Sprint Speed": "movement_sprint_speed", "Agility": "movement_agility", "Reactions": "movement_reactions", "Balance": "movement_balance" },
    power_stats: { "Shot Power": "power_shot_power", "Jumping": "power_jumping", "Stamina": "power_stamina", "Strength": "power_strength", "Long Shots": "power_long_shots" },
    mentality_stats: { "Aggression": "mentality_aggression", "Interceptions": "mentality_interceptions", "Positioning": "mentality_positioning", "Vision": "mentality_vision", "Penalties": "mentality_penalties", "Composure": "mentality_composure" },
    defending_stats: { "Marking": "defending_marking_awareness", "Standing Tackle": "defending_standing_tackle", "Sliding Tackle": "defending_sliding_tackle" },
    goalkeeping_stats: { "Diving": "goalkeeping_diving", "Handling": "goalkeeping_handling", "Kicking": "goalkeeping_kicking", "Positioning": "goalkeeping_positioning", "Reflexes": "goalkeeping_reflexes", "Speed": "goalkeeping_speed" },
}

function initPlayerDetailView() {
    let playerDetailG = d3.select("#playerDetailG");
    playerDetailG.attr("transform", "translate(1100, 100)");
    playerDetailG.append("rect")
        .attr("width", 750)
        .attr("height", 900)
        .attr("fill", "#6C8289");

    playerDetailG.append("text")
        .attr("id", "playerName")
        .attr("x", 10)
        .attr("y", 50)
        .attr("font-size", 50)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Player Name");

    playerDetailG.append("text")
        .attr("id", "playerTeam")
        .attr("x", 10)
        .attr("y", 100)
        .attr("font-size", 30)
        .attr("fill", "#18414e")
        .text("Team Name");

    playerDetailG.append("text")
        .attr("id", "playerNationality")
        .attr("x", 740)
        .attr("y", 100)
        .attr("font-size", 30)
        .attr("fill", "#18414e")
        .attr("text-anchor", "end")
        .text("Nationality");

    playerDetailG.append("text")
        .attr("id", "playerPosition")
        .attr("x", 740)
        .attr("y", 50)
        .attr("font-size", 50)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .attr("text-anchor", "end")
        .text("POS");

    playerDetailG.append("circle")
        .attr("cx", 375)
        .attr("cy", 225)
        .attr("r", 125)
        .attr("fill", "#18414e");

    playerDetailG.append("rect")
        .attr("x", 250)
        .attr("y", 150)
        .attr("width", 250)
        .attr("height", 230)
        .attr("fill", "#18414e");

    playerDetailG.append("image")
        .attr("id", "playerImage")
        .attr("x", 300)
        .attr("y", 210)
        .attr("width", 150)
        .attr("height", 150)
        .attr("anchor", "middle")
        .attr("xlink:href", "https://cdn.sofifa.net/players/notfound_0_120.png");

    playerDetailG.append("image")
        .attr("id", "clubFlag")
        .attr("x", 275)
        .attr("y", 160)
        .attr("width", 40)
        .attr("height", 40)
        .attr("xlink:href", "https://cdn.sofifa.net/teams/21/60.png");

    playerDetailG.append("image")
        .attr("id", "nationalFlag")
        .attr("x", 435)
        .attr("y", 160)
        .attr("width", 40)
        .attr("height", 40)
        .attr("xlink:href", "https://cdn.sofifa.net/flags/de.png");
    
    potentialG = playerDetailG.append("g")
        .attr("id", "playerPotentialG")
        .attr("transform", "translate(375, 150)");
    potentialG.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 40)
        .attr("fill", "#516166");
    potentialG.append("text")
        .attr("id", "playerPotential")
        .attr("x", 0)
        .attr("y", 5)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .text("POT");
    potentialG.append("text")
        .attr("x", 0)
        .attr("y", 20)
        .attr("font-size", 10)
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .text("Potential");

    playerDetailG.append("circle")
        .attr("cx", 375)
        .attr("cy", 150)
        .attr("r", 40)
        .attr("fill", "#6C8289");

    playerDetailG.append("text")
        .attr("id", "playerOverall")
        .attr("x", 375)
        .attr("y", 155)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .attr("text-anchor", "middle")
        .text("OVR");
    playerDetailG.append("text")
        .attr("x", 375)
        .attr("y", 170)
        .attr("font-size", 10)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .attr("text-anchor", "middle")
        .text("Overall");
    
    playerDetailG.append("circle")
        .attr("id", "OVR_overlay")
        .attr("cx", 375)
        .attr("cy", 150)
        .attr("r", 40)
        .attr("fill-opacity", 0);

    playerDetailG.append("text")
        .attr("id", "playerAge")
        .attr("x", 10)
        .attr("y", 150)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .text("Age");

    playerDetailG.append("text")
        .attr("id", "playerHeight")
        .attr("x", 10)
        .attr("y", 180)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .text("Height");

    playerDetailG.append("text")
        .attr("id", "playerWeight")
        .attr("x", 10)
        .attr("y", 210)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .text("Weight");

    playerDetailG.append("text")
        .attr("id", "playerValue")
        .attr("x", 10)
        .attr("y", 240)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .text("Value");

    playerDetailG.append("text")
        .attr("id", "playerWage")
        .attr("x", 10)
        .attr("y", 270)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .text("Wage");

    playerDetailG.append("g")
        .attr("id", "attackingStats")
        .attr("transform", "translate(0, 420)");

    let attackingStats = d3.select("#attackingStats");

    attackingStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Attacking");

    i = 0;
    for (let [key, value] of Object.entries(statDicts.attacking_stats)) {
        initPlayerStatDetailBar(10, i * 40 + 25, attackingStats, key, value, 0);
        i++;
    }

    playerDetailG.append("g")
        .attr("id", "skillStats")
        .attr("transform", "translate(0, 660)");

    let skillStats = d3.select("#skillStats");

    skillStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Skills");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, skillStats, Object.keys(statDicts.skill_stats)[i], Object.values(statDicts.skill_stats)[i], 0);
    }

    playerDetailG.append("g")
        .attr("id", "movementStats")
        .attr("transform", "translate(187.5, 420)");

    let movementStats = d3.select("#movementStats");

    movementStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Movement");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, movementStats, Object.keys(statDicts.movement_stats)[i], Object.values(statDicts.movement_stats)[i], 0);
    }

    playerDetailG.append("g")
        .attr("id", "powerStats")
        .attr("transform", "translate(187.5, 660)");

    let powerStats = d3.select("#powerStats");

    powerStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Power");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, powerStats, Object.keys(statDicts.power_stats)[i], Object.values(statDicts.power_stats)[i], 0);
    }

    playerDetailG.append("g")
        .attr("id", "mentalityStats")
        .attr("transform", "translate(375, 420)");

    let mentalityStats = d3.select("#mentalityStats");

    mentalityStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Mentality");

    for (let i = 0; i < 6; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, mentalityStats, Object.keys(statDicts.mentality_stats)[i], Object.values(statDicts.mentality_stats)[i], 0);
    }

    playerDetailG.append("g")
        .attr("id", "defendingStats")
        .attr("transform", "translate(375, 700)");

    let defendingStats = d3.select("#defendingStats");

    defendingStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Defending");

    for (let i = 0; i < 3; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, defendingStats, Object.keys(statDicts.defending_stats)[i], Object.values(statDicts.defending_stats)[i], 0);
    }

    playerDetailG.append("g")
        .attr("id", "goalkeepingStats")
        .attr("transform", "translate(562.5, 420)");

    let goalkeepingStats = d3.select("#goalkeepingStats");

    goalkeepingStats.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Goalkeeping");

    for (let i = 0; i < 6; i++) {
        initPlayerStatDetailBar(10, i * 40 + 25, goalkeepingStats, Object.keys(statDicts.goalkeeping_stats)[i], Object.values(statDicts.goalkeeping_stats)[i], 0);
    }
}

function updatePlayerDetailView(player) {
    d3.select("#playerName").text(player.short_name);
    d3.select("#playerTeam").text(player.club_name);
    d3.select("#playerNationality").text(player.nationality_name);
    d3.select("#playerPosition").text(player.club_position);
    d3.select("#playerOverall").text(player.overall);
    d3.select("#OVR_overlay")
        .on("mouseenter", function () {
            d3.select("#playerPotentialG")
                .transition()
                .duration(500)
                .attr("transform", "translate(440, 175)");
            d3.select("#playerPotential")
                .text(player.potential);
            detailG = d3.select("#playerDetailG").append("g")
                .attr("id", "ovr-detail")
                .attr("transform", "translate(" + 270 + "," + -55 + ")");
            detailG.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 210)
                .attr("height", 160)
                .attr("fill", "lightblue");
            detailG.append("rect")
                .attr("x", 5)
                .attr("y", 5)
                .attr("width", 200)
                .attr("height", 150)
                .attr("fill", "#18414e");
            attributeHistoryG = detailG.append("g")
                .attr("transform", "translate(5, 5)");
            densityG = detailG.append("g")
                .attr("transform", "translate(5, 80)");
            densityPlot(ctx.currentDataSelection, "overall", densityG, 200, 75, player.overall);
            attributeHistoryPlot(player, "overall", attributeHistoryG, 200, 75);
        })
        .on("mouseout", function () {
            d3.select("#playerPotentialG")
                .transition()
                .duration(500)
                .attr("transform", "translate(375, 150)");
            d3.select("#ovr-detail").remove();
        });
    d3.select("#playerAge").text("Age: " + player.age);
    d3.select("#playerHeight").text("Height: " + player.height_cm);
    d3.select("#playerWeight").text("Weight: " + player.weight_kg);
    d3.select("#playerValue").text("Value: " + player.value_eur);
    d3.select("#playerWage").text("Wage: " + player.wage_eur);
    d3.select("#playerImage").attr("xlink:href", player.player_face_url);
    d3.select("#clubFlag").attr("xlink:href", player.club_logo_url);
    d3.select("#nationalFlag").attr("xlink:href", player.nation_flag_url);

    for (let i = 0; i < 7; i++) {
        updatePlayerStatDetailBars(Object.values(Object.values(statDicts)[i]), player);
    }
}

function initPlayerStatDetailBar(x, y, G, name, attr_name, value) {
    let statScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 160]);

    g = G.append("g")
        .attr("id", "statDetailG_" + attr_name)
        .attr("transform", "translate(" + x + "," + y + ")");

    g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("fill", "#18414e")
        .text(name);

    g.append("text")
        .attr("id", "PlayerAttributeVal_" + attr_name)
        .attr("x", 0 + 160)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("text-anchor", "end")
        .attr("fill", "#18414e")
        .text(value);

    g.append("rect")
        .attr("x", 0)
        .attr("y", 0 + 5)
        .attr("width", 160)
        .attr("height", 10)
        .attr("fill", "#18414e");

    g.append("rect")
        .attr("id", "PlayerAttribute_" + attr_name)
        .attr("x", - 1)
        .attr("y", 4)
        .attr("width", statScale(value) + 1)
        .attr("height", 12)
        .attr("fill", "#6C8289");

    g.append("rect")
        .attr("id", "PlayerAttribute_" + attr_name + "_overlay")
        .attr("x", -1)
        .attr("y", -15)
        .attr("width", 162)
        .attr("height", 30)
        .attr("fill-opacity", 0);
}

function updatePlayerStatDetailBars(attr_names, player) {
    let statScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 160]);

    let colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(["maroon", "goldenrod", "ForestGreen"]);

    for (let i = 0; i < attr_names.length; i++) {
        let value = player[attr_names[i]];
        d3.select("#PlayerAttribute_" + attr_names[i])
            .transition()
            .duration(1000)
            .attr("width", statScale(value) + 1)
            .attr("fill", colorScale(value));
        d3.select("#PlayerAttributeVal_" + attr_names[i])
            .text(value);
        d3.select("#PlayerAttribute_" + attr_names[i] + "_overlay")
            .on("mouseenter", function () {
                detailG = d3.select("#statDetailG_" + attr_names[i]).append("g")
                    .attr("id", "detailG_" + attr_names[i] + "Text")
                    .attr("transform", "translate(" + -25 + "," + (- 180) + ")");
                detailG.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 210)
                    .attr("height", 160)
                    .attr("fill", "lightblue");
                detailG.append("rect")
                    .attr("x", 5)
                    .attr("y", 5)
                    .attr("width", 200)
                    .attr("height", 150)
                    .attr("fill", "#18414e");
                attributeHistoryG = detailG.append("g")
                    .attr("transform", "translate(5, 5)");
                densityG = detailG.append("g")
                    .attr("transform", "translate(5, 80)");
                densityPlot(ctx.currentDataSelection, attr_names[i], densityG, 200, 75, player[attr_names[i]]);
                attributeHistoryPlot(player, attr_names[i], attributeHistoryG, 200, 75);
            })
            .on("mouseout", function () {
                d3.select("#detailG_" + attr_names[i] + "Text").remove();
            });
    }
}

function attributeHistoryPlot(player, attr, G, width, height) {
    G.append("text")
        .attr("x", 2)
        .attr("y", 12)
        .attr("font-size", 10)
        .attr("fill", "lightblue")
        .text("Attribute History over Years");
    let currentYear = player.year;
    let playerId = player.sofifa_id;
    let history = attributeHistory(playerId, attr);
    history = history.filter(function (d) {
        return d != null;
    });
    let history_min = d3.min(history, d => {
        return d[1];
    });
    let history_max = d3.max(history, d => {
        return d[1];
    });
    // console.log(history, playerId, currentYear, history_min, history_max);
    let xScale = d3.scaleLinear()
        .domain([2015, 2022])
        .range([0, width]);
    
    let yScale = d3.scaleLinear()
        .domain([history_min, history_max])
        .range([height - 5, 20]);
    
    let line = d3.line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));
    
    G.append("path")
        .datum(history)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "lightblue")
        .attr("stroke-width", 2);
    
    G.append("circle")
        .attr("cx", xScale(currentYear))
        .attr("cy", yScale(player[attr]))
        .attr("r", 2)
        .attr("fill", "red");
}

function attributeHistory(playerId, attribute) {
    let attributeHistory = [];
    // add values of attribute for the player with playerId to attributeHistory
    for (let i = 2015; i < 2023; i++) {
        let data = ctx.playersPerYear[i];
        for (let j = 0; j < data.length; j++) {
            found = false;
            if (data[j].sofifa_id == playerId) {
                if (data[j][attribute] != null && data[j][attribute] != "") {
                    attributeHistory.push([i,parseInt(data[j][attribute])]);
                }
                found = true;
                break;
            }
        }
        if (!found) {
            attributeHistory.push(null);
        }
    }
    return attributeHistory;
}

function densityPlot(data, attribute, g, width, height, playerValue) {
    g.append("text")
        .attr("x", 2)
        .attr("y", 12)
        .attr("font-size", 10)
        .attr("fill", "lightblue")
        .text("Comparison to selected group");
    let xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, width]);
    density = attributeDensity(data, attribute, xScale);
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(density, (d) => d[1])])
        .range([height, 15]);
    density = density.map(d => {
        if (d[0] == 0 || d[0] == 100) {
            return [d[0], 0];
        } else {
            return d;
        }
    });

    g.append("path")
        .datum(density)
        .attr("fill", "lightblue")
        .attr("fill-opacity", 1)
        .attr("stroke", "lightblue")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", d3.line()
            .curve(d3.curveBasis)
            .x((d) => { return xScale(d[0]); })
            .y((d) => { return yScale(d[1]); }));

    g.append("rect")
        .attr("x", xScale(playerValue))
        .attr("y", 15)
        .attr("width", 1)
        .attr("height", height - 15)
        .attr("fill", "red");
}

function attributeDensity(data, attribute, scale) {
    let attributeValues = data.map(d => d[attribute]);
    density = kernelDensityEstimator(kernelEpanechnikov(7), scale.ticks(22))(attributeValues);
    return density;
}

function kernelDensityEstimator(kernel, X) {
    return function (V) {
        return X.map(function (x) {
            return [x, d3.mean(V, function (v) { return kernel(x - v); })];
        });
    };
}

function kernelEpanechnikov(k) {
    return function (v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}


//---------------------------------------------------------------------------------------------------------



function initSelectors(playerList){
    let ids = ["player1DropdownContent", "player2DropdownContent"]
    let allAttrs = []
    let attrRef = {}
    for(idx in Object.keys(statDicts)){
        let stats = statDicts[Object.keys(statDicts)[idx]]
        Object.keys(stats).forEach(stat => allAttrs.push(stat))
        Object.keys(stats).forEach(stat => attrRef[stat] = stats[stat])
    }
    d3.select(".dropdown-content a:hover")
        .style("background-color", tinycolor("#18414e").darken(10));
    
    d3.select("#attrBtn")
        .attr("textContent", ctx.comparisonAttr);

    for(let id in ids){
        d3.select("#"+ids[id])
        .selectAll("players")
        .data(playerList)
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + d.short_name);
            ctx.comparisonPlayers[parseInt(id)+1] = d
            showPlayerDropdown(ids[id]);
            updatePlayerComparisonView(parseInt(id)+1, d);
            updateComparison1(parseInt(id)+1, d);
        })
        .append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "#18414e")
            .text(d => d.short_name);
    }
    d3.select("#attrSelectionContent")
        .selectAll("attributes")
        .data(allAttrs)
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + attrRef[d]);
            ctx.comparisonAttr = attrRef[d]
            ctx.comparisonAttrRef = d
            showPlayerDropdown("attrSelectionContent");
            updateComparisonAttr(ctx.comparisonPlayers[1], ctx.comparisonPlayers[2]);
        })
        .append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "#18414e")
        .text(d => d);
}

function showPlayerDropdown(dropdownId) {
    document.getElementById(dropdownId).classList.toggle("show");
}

function filterFunction(dropdownId, searchId) {
    var input, filter, ul, li, a, i;
    input = document.getElementById(searchId);
    filter = input.value.toUpperCase();
    div = document.getElementById(dropdownId);
    a = div.getElementsByTagName("a");
    for (i = 0; i < a.length; i++) {
        txtValue = a[i].textContent || a[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            a[i].style.display = "";
        } else {
            a[i].style.display = "none";
        }
    }
}

function initPlayersComparisonView(){
    let playersComparisonG = d3.select("#playersComparisonG");
    
    playersComparisonG.attr("transform", "translate(0,1050)");
    playersComparisonG.append("rect")
        .attr("width", 1900)
        .attr("height", 1000)
        .attr("fill", "#6C8289");

    playersComparisonG.append("rect")
        .attr("transform", "translate(0,0)")
        .attr("width", 300)
        .attr("height", 1000)
        .attr("fill", tinycolor("#6C8289").lighten(20));
    
    addPlayerFace("#playersComparisonG",0,85,300,180,1);
    addPlayerFace("#playersComparisonG",0,585,300,180,2);
    drawComparisonAxis(375,25);
    // drawComparisonAxis(1150,25);
    // drawComparisonAxis(375,275);
}

function addPlayerFace(rootId, x, y, w, h, playerNo){
    y = y+50
    let root = d3.select(rootId);

    // the detail rect(with light color) is from y = y+h to y = y+h+100
    if(playerNo == 1){
        root.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", w)
            .attr("height", h+100)
            .attr("fill", "#4DD0F7");
    }
    else{
        root.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", w)
            .attr("height", h+100)
            .attr("fill", "#F76590");
    }

    root.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", h)
        .attr("fill", "#18414e");

    root.append("image")
        .attr("id", `playerImage${playerNo}`)
        .attr("x", x+30)
        .attr("y", y+26)
        .attr("width", 0.8*w)
        .attr("height", 0.8*h)
        .attr("anchor", "middle")
        .attr("xlink:href", "https://cdn.sofifa.net/players/notfound_0_120.png");
    
    root.append("image")
        .attr("id", `clubFlag${playerNo}`)
        .attr("x", x+15)
        .attr("y", y+10)
        .attr("width", 55)
        .attr("height", 55)
        .attr("xlink:href", "https://cdn.sofifa.net/teams/21/60.png");
    
    root.append("image")
        .attr("id", `nationalFlag${playerNo}`)
        .attr("x", x+(w-60))
        .attr("y", y+10)
        .attr("width", 45)
        .attr("height", 45)
        .attr("xlink:href", "https://cdn.sofifa.net/flags/de.png");
    
    root.append("text")
        .attr("id", `playerName${playerNo}`)
        .attr("x", 10)
        .attr("y", y+h+30)
        .attr("font-size", 25)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Player1 Name");

    root.append("text")
        .attr("id", `playerPosition${playerNo}`)
        .attr("x", 10)
        .attr("y", y+h+60)
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        // .attr("text-anchor", "end")
        .text("POS");
}

function drawComparisonAxis(x,y){
    let years = [2015,2016,2017,2018,2019,2020,2021,2022];
    let width = 700;
    let height = 400;
    let axis = d3.select("g#playersComparisonG").append("g").attr("id", "comparison1");

    ctx.yRatingScale = d3.scaleLinear()
        .domain([0, 100])
        .range([y+height, y]);

    ctx.xYearsScale = d3.scaleBand()
        .domain(years)
        .range([x, x+width])
        .padding([0.8])
    // x axis
    axis.append("g")
        .attr("id", "yAxisComp1")
        .attr("transform",`translate(0,${y+height})`)
        .call(d3.axisBottom(ctx.xYearsScale));
    // y axis
    axis.append("g")
        .attr("id", "xAxisComp1")
        .attr("transform", `translate(${x},${y})`)
        .call(d3.axisLeft(ctx.yRatingScale));
    // Y axis label:
    // axis.append("text")
    //     .attr("text-anchor", "end")
    //     .attr("font-size", 20)
    //     .attr("fill", "#18414e")
    //     .attr("transform", "rotate(-90)")
    //     .attr("y", x - 35)
    //     .attr("x", -(y+height)/2)
    //     .text("Text")
        
    d3.selectAll(".domain").style("stroke",tinycolor("#18414e").darken(40));
    d3.selectAll(".tick").select("line").style("stroke",tinycolor("#18414e").darken(40));
    d3.selectAll(".tick").select("text").attr("fill", "#18414e").attr("font-size", 15);
}

function updatePlayerComparisonView(playerNo, player){
    d3.select(`#playerImage${playerNo}`).attr("xlink:href", player.player_face_url);
    d3.select(`#clubFlag${playerNo}`).attr("xlink:href", player.club_logo_url);
    d3.select(`#nationalFlag${playerNo}`).attr("xlink:href", player.nation_flag_url);
    d3.select(`#playerName${playerNo}`).text(player.short_name);
    d3.select(`#playerPosition${playerNo}`).text(player.club_position);
}

function updateComparison1(playerNo, player){
    if(document.getElementById(`player${playerNo}LinePlot`) != null){
        document.getElementById("comparison1").removeChild(
            document.getElementById(`player${playerNo}LinePlot`)
        );
    }
    if(document.getElementById(`comparisonTitle`) != null){
        document.getElementById("comparison1").removeChild(
            document.getElementById("comparisonTitle")
        );
    }
    let linePlot = d3.select("#comparison1").append("g")
                        .attr("id", `player${playerNo}LinePlot`)
                        .attr("transform", "translate(5, 5)");


    d3.select("#comparison1")
        .append("g")
        .attr("id", "comparisonTitle")
        .append("text")
        .attr("x", 1070)
        .attr("y", 30)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .attr("text-anchor", "end")
        .text(ctx.comparisonAttrRef);

    let currentYear = player.year;
    let playerId = player.sofifa_id;
    let history = attributeHistory(playerId, ctx.comparisonAttr);
    history = history.filter(function (d) {
        return d != null;
    });

    ctx[`curPlayer${playerNo}y`] = history[1]

    let lineStart = d3.line()
        .curve(d3.curveLinear)
        .x(ctx.xYearsScale(2015))
        .y(d => ctx.yRatingScale(d[1]))

    let line = d3.line()
        .curve(d3.curveLinear)
        .x(d => ctx.xYearsScale(d[0]))
        .y(d => ctx.yRatingScale(d[1]));

    if(playerNo == 1){
        linePlot.append("path")
            .datum(history)
            .attr("fill", "none")
            .attr("stroke", "#4DD0F7")
            .attr("stroke-width", 2)
            .attr("d", lineStart)
            .transition()
            .ease(d3.easeCubic)
            .duration(1000)
            .attr("d", line);
    }
    else{
        linePlot.append("path")
            .datum(history)
            .attr("fill", "none")
            .attr("stroke", "#F76590")
            .attr("stroke-width", 2)
            .attr("d", lineStart)
            .transition()
            .ease(d3.easeCubic)
            .duration(1000)
            .attr("d", line);
    }
    
    drawRadar("comparisonRadarG", "playersComparisonG", Object.values(ctx.comparisonPlayers), getComparisonStatsCfg(), "comparison");
}

function updateComparisonAttr(player1, player2){
    let player1Plot = d3.select(`#player1LinePlot`)
    let player2Plot = d3.select(`#player2LinePlot`)

    let currentYear = player1.year;
    let historyPlayer1 = attributeHistory(player1.sofifa_id, ctx.comparisonAttr);
    let historyPlayer2 = attributeHistory(player2.sofifa_id, ctx.comparisonAttr);
    historyPlayer1 = historyPlayer1.filter(function (d) {
        return d != null;
    });
    historyPlayer2 = historyPlayer2.filter(function (d) {
        return d != null;
    });

    let linePlayer1 = d3.line()
        .curve(d3.curveLinear)
        .x(d => ctx.xYearsScale(d[0]))
        .y(d => ctx.yRatingScale(d[1]));

    let linePlayer2 = d3.line()
        .curve(d3.curveLinear)
        .x(d => ctx.xYearsScale(d[0]))
        .y(d => ctx.yRatingScale(d[1]));

    document.getElementById(`player1LinePlot`).innerHTML = '';
    document.getElementById(`player2LinePlot`).innerHTML = '';
    document.getElementById(`comparisonTitle`).innerHTML = '';

    player1Plot.append("path")
        .datum(historyPlayer1)
        .attr("d", linePlayer1)
        .attr("fill", "none")
        .attr("stroke", ctx.comparisonColors[0])
        .attr("stroke-width", 2);

    player2Plot.append("path")
        .datum(historyPlayer2)
        .attr("d", linePlayer2)
        .attr("fill", "none")
        .attr("stroke", ctx.comparisonColors[1])
        .attr("stroke-width", 2);
        
    d3.select("#comparisonTitle")
        .append("text")
        .attr("x", 1070)
        .attr("y", 30)
        .attr("font-size", 20)
        .attr("fill", "#18414e")
        .attr("text-anchor", "end")
        .text(ctx.comparisonAttrRef);

    drawRadar("comparisonRadarG", "playersComparisonG", [player1, player2], getComparisonStatsCfg(), "comparison");

}

function getComparisonStatsCfg(data) {
    let cfg = {
        x: 725,
        y: 745,
        w: 350,				//width of the circle
        h: 350,				//height of the circle
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
    return cfg;
}