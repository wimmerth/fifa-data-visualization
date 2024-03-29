/*
MIT License

Copyright (c) 2022 Thomas Martin Wimmer, Haileleul Zeyede Haile

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const ctx = {
    YEAR: 2022,
    width: 1900,
    height: 2250,
    footballFieldLineWidth: 0.2,
    backgroundGrey: "#2b2b2b",
    grassGreen: "#338033",
    SELECTION: null,
    comparisonAttr: "overall",
    comparisonAttrRef: "Overall",
    comparisonColors: ["#4DD0F7", "#F76590"],
    comparisonPlayers: {},
    radarAxisNames: ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physic"],
    selectedPositions: [],
}

function setupYearSelection(yearSelection){
    // Year selection with "scrollable" buttons to select the year
    let yearList = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];
    years = yearSelection.selectAll("g")
        .data(yearList)
        .enter()
        .append("g")
        .attr("class", "yearButton")
        .attr("id", (d) => "yearButton" + d)
        .attr("transform", (d, i) => "translate(" + (i * 100) + ",10)");
    years.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 100)
        .attr("height", 50)
        .attr("fill", "#6C8289");
    years.append("text")
        .attr("x", 50)
        .attr("y", 30)
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text((d) => d);
    years.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 100)
        .attr("height", 30)
        .attr("fill", "transparent")
        .on("click", (event, d) => {
            console.log("Year selected: " + d);
            moveYearSelectionIndicator(d);
            updatePlotsOnSelection(d, ctx.SELECTION);
        })
        .style("cursor", "pointer");
    yearSelection.append("rect")
        .attr("id","yearSelectionIndicator")
        .attr("x", 700)
        .attr("y", 10)
        .attr("width", 100)
        .attr("height", 50)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
}

function moveYearSelectionIndicator(year) {
    d3.select("#yearSelectionIndicator")
        .transition()
        .duration(1000)
        .attr("x", (year - 2015) * 100);
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
    rootG.append("g").attr("id", "playersComparisonG");
    rootG.append("g").attr("id", "generalStatsG");
    rootG.append("g").attr("id", "yearSelectionG").attr("transform", "translate(550, 0)");
    rootG.append("g").attr("id", "playerDetailG");
    let background = d3.select("#bkgG");
    background.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", ctx.width)
    .attr("height", ctx.height)
    .attr("fill", ctx.backgroundGrey);
    showLoadingScreen();
    setupYearSelection(d3.select("#yearSelectionG"));
    popupG = rootG.append("g")
        .attr("id", "popupG2")
        .attr("transform", "translate(25, 95)");
    addInformationBubble(popupG, ["Click and drag the mouse over the football field", "to select the areas you are interested in.", "When changing this selection, you will observe", "a change in the top-10 player list on the right.", "You can get more details on a player by clicking", "on the respective list item."], "#6C8289", "white");
    loadPlayerPositions();
    loadRelevantAttrs();
    initPlayersComparisonView();
    initPlayerDetailView();
    loadData();
}

function showLoadingScreen() {
    JsLoadingOverlay.setOptions({
        'overlayBackgroundColor': '#18414e',
        'overlayOpacity': 0.6,
        'spinnerIcon': 'line-scale',
        'spinnerColor': 'white',
        'spinnerSize': '2x',
        'overlayIDName': 'overlay',
        'spinnerIDName': 'spinner',
        'offsetY': 0,
        'offsetX': 0,
        'lockScroll': false,
        'containerID': null,

    });
    JsLoadingOverlay.show();
}

function hideLoadingScreen() {
    JsLoadingOverlay.hide();
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

function parsePosition(club_position, positions) {
    if (club_position == "SUB" || club_position == "RES" || club_position == "") {
        let pos = positions.split(",");
        let position = pos[0];
        if (position == "" && pos.length > 1) {
            position = pos[1];
        }
        return position;
    } else {
        return club_position;
    }
}

function loadData() {
    d3.csv("fifa_players_15_22_clean.csv").then((data) => {
        console.log("Number of rows: " + data.length);
        let playersPerYear = {};
        for (let i = 0; i < data.length; i++) {
            let row = data[i];
            let year = row["year"];
            let position = parsePosition(row["club_position"], row["player_positions"]);
            if (row["league_name"] == ""){
                row["league_name"] = "Unknown";
            }
            if (row["club_name"] == ""){
                row["club_name"] = "Unknown";
            }
            row["position"] = position;
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
        initSelectors(ctx.playersPerYear[ctx.YEAR]);
        initGeneralDataAnalysis();
        
        updatePlayerDetailView(ctx.playersPerYear[ctx.YEAR][0]);
        drawRadar("playerStatsG", "playerDetailG", [ctx.playersPerYear[ctx.YEAR][0]], getPlayerStatsCfg(), "individual");
        
        hideLoadingScreen();
    }).catch((error) => {
        console.log(error);
    });
}

function initPlots(data) {
    initBestPlayerList(data);
    createRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
    
    let popupG = d3.select("#rootG")
        .append("g")
        .attr("id", "popupG4")
        .attr("transform", `translate(${getGroupStatsCfg().x-getGroupStatsCfg().w / 2}, ${getGroupStatsCfg().y-getGroupStatsCfg().h / 2})`);
    addInformationBubble(popupG, ["The radar plot gives you valuable insight into the", "profiles of players in different areas of the field.", "The different hexagons provide information about", "the distribution (quartiles and median) of the", "six key attributes."], "#6C8289", "white");
    createRadar("playerStatsG", "playerDetailG", data, getPlayerStatsCfg(), "individual");
    createRadar("comparisonRadarG", "playersComparisonG", data, getComparisonStatsCfg(), "comparison");

    drawRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
}

function equalArray(arr1, arr2) {
    if (arr1.length != arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i]) {
            return false;
        }
    }
    return true;
}

function updatePlotsOnSelection(year, selection) {
    let playerPositions = findPlayerPositions(selection);
    if (equalArray(ctx.selectedPositions, playerPositions) && ctx.YEAR == year) {
        console.log("No change in player positions or year");
        ctx.SELECTION = selection;
        ctx.YEAR = year;
        return;
    }
    ctx.SELECTION = selection;
    ctx.YEAR = year;
    ctx.selectedPositions = playerPositions;
    data = ctx.playersPerYear[year].filter(d => playerPositions.includes(d.position));
    ctx.currentDataSelection = data;
    updateBestPlayerList(data);
    drawRadar("statsG", "rootG", data, getGroupStatsCfg(), "group");
}

function findPlayerPositions(selection) {
    if (selection === null) {
        return Object.keys(ctx.playerPositions);
    } else {
        let x_min = ctx.footballFieldInverseScaleX(selection[0][0]);
        let x_max = ctx.footballFieldInverseScaleX(selection[1][0]);
        let y_min = ctx.footballFieldInverseScaleY(selection[0][1]);
        let y_max = ctx.footballFieldInverseScaleY(selection[1][1]);
        let selectedPositions = [];
        for (let position in ctx.playerPositions) {
            let pos = ctx.playerPositions[position];
            // select position if there is an overlap between the selection and the position
            if (x_min < pos[1] && x_max > pos[0] && y_min < pos[3] && y_max > pos[2]) {
                selectedPositions.push(position);
            }
        }
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

    footballfieldG.append("text")
        .attr("x", -ctx.footballFieldScaleY(90 / 2))
        .attr("y", -15)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text("Midfielders");
    
    footballfieldG.append("text")
        .attr("x", -ctx.footballFieldScaleY(15))
        .attr("y", -15)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text("Forwards");
    
    footballfieldG.append("text")
        .attr("x", -ctx.footballFieldScaleY(75))
        .attr("y", -15)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text("Defenders");

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
            updatePlotsOnSelection(ctx.YEAR, event.selection);
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
    overlay = bestPlayerButtons.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 300)
        .attr("height", 40)
        .attr("fill-opacity", 0)
        .attr("class", "overlay");
    overlay.on("click", (event, d) => {
        console.log("Clicked on " + d.short_name);
        updatePlayerDetailView(d);
        drawRadar("playerStatsG", "playerDetailG", [d], getPlayerStatsCfg(), "individual");
    });
    overlay.style("cursor", "pointer");
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
    overlay = bestPlayerButtons.select(".overlay");
    overlay.on("click", (event, d) => {
        console.log("Clicked on " + d.short_name);
        updatePlayerDetailView(d);
        drawRadar("playerStatsG", "playerDetailG", [d], getPlayerStatsCfg(), "individual");
    });
}

//---------------------------------------------------------------------------------------------------------

function summaryStats(playerList, task) {
    // compute median, 25th and 75th percentile, min and max for each relevant feature
    let player_features = ["pace", "shooting", "passing", "dribbling", "defending", "physic"];
    let player_features_nice_names = ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physic"];
    let gk_features = ["goalkeeping_diving", "goalkeeping_handling", "goalkeeping_kicking", "goalkeeping_reflexes", "goalkeeping_speed", "goalkeeping_positioning"];
    let gk_features_nice_names = ["Diving", "Handling", "Kicking", "Reflexes", "Speed", "Positioning"];
    let orderedStats = new Array();
    let stats = {};

    if (playerList.every(d => d.position == "GK")) {
        console.log("All GKs")
        features = gk_features;
        features_nice_names = gk_features_nice_names;
    } else {
        features = player_features;
        features_nice_names = player_features_nice_names;
    }

    if (task != "group") {
        for (let player in playerList) {
            stats[player] = new Array();
        }
        for (let feature of features) {
            let values = playerList.map(d => parseFloat(d[feature]));
            let nice_feature = features_nice_names[features.indexOf(feature)];
            playerList.forEach((player, i) => stats[i].push({ axis: nice_feature, value: values[i] }))
        }
        playerList.forEach((player, i) => {
            orderedStats.push({ "name": player.short_name, "values": stats[i] });
        })
    }
    else {
        // take only top 100 players into account
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
            if (task == "group") { return "white"; }
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
            if (task == "group") { return "white"; }
            else { return tinycolor("#18414e"); }
        })
        .style("stroke-width", "2px");

    //append small ticks for each axes at the intervalls indicated by cfg.levels
    for (let j = 1; j <= cfg.levels; j++) {
        let levelFactor = j / cfg.levels;
        axisGrid.selectAll(".levels")
            .data(axisNames)
            .enter()
            .append("circle")
            .attr("cx", function (d, i) { return radiusScale(cfg.maxValue * levelFactor) * Math.cos(angleSlice * i - Math.PI / 2); })
            .attr("cy", function (d, i) { return radiusScale(cfg.maxValue * levelFactor) * Math.sin(angleSlice * i - Math.PI / 2); })
            .attr("r", cfg.strokeWidth)
            .style("fill", function (d, i) {
                if (task == "group") { return "white"; }
                else { return "#18414e"; }
            }
            )
            .attr("class", "gridCircle");
    }


    //append the labels of each axis
    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("fill", function (d, i) {
            if (task == "group") { return "white"; }
            else { return "#18414e"; }
        })
        .attr("dy", "0.35em")
        .attr("x", function (d, i) { return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2); })
        .attr("y", function (d, i) { return radiusScale(cfg.maxValue * cfg.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2); })
        .text(string => { return string.charAt(0).toUpperCase() + string.slice(1) });
}



function drawRadar(id, rootId, playerList, cfg, task) {
    while (document.getElementById(`${task}RadarWrapper`) != null) {
        document.getElementById(`${task}RadarWrapper`).remove();
    }
    let allAxis = summaryStats(playerList, task);
    let axisNames = ctx.radarAxisNames
    let total = axisNames.length;					//total number of different axes
    let radius = Math.min(cfg.w / 2, cfg.h / 2); 	//radius of the outermost circle
    let angleSlice = Math.PI * 2 / total;		//width in radians of each "slice"

    let legendTitles = [];

    for (let entry of allAxis[0].values) {
        legendTitles.push(entry.axis);
    }

    // legend
    d3.select(`#${id}`).selectAll(".legend")
        .data(legendTitles)
        .text(string => { return string.charAt(0).toUpperCase() + string.slice(1) });

    // radius scale
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
            if (task == "comparison") {
                // player selected on selection 1 or 2?
                compPosition = Object.keys(ctx.comparisonPlayers).find(key => ctx.comparisonPlayers[key].short_name === d.name);
                return ctx.comparisonColors[compPosition - 1];
            }
            else if (task == "individual") {
                return cfg.color(i);
            }
            else {
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
            blobWrapper.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1);
            //Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);
        })
        .on('mouseout', function () {
            //Bring back all blobs
            blobWrapper.selectAll(".radarArea")
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
        .attr("x", 10)
        .attr("y", 140)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Age");

    playerDetailG.append("text")
        .attr("id", "playerAge")
        .attr("x", 10)
        .attr("y", 170)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("XY");

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 190)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Height");

    playerDetailG.append("text")
        .attr("id", "playerHeight")
        .attr("x", 10)
        .attr("y", 220)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("XY");

    playerDetailG.append("text")
        .attr("x", 130)
        .attr("y", 190)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Weight");

    playerDetailG.append("text")
        .attr("id", "playerWeight")
        .attr("x", 130)
        .attr("y", 220)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("XY");

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 240)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Value (in EUR)");

    playerDetailG.append("text")
        .attr("id", "playerValue")
        .attr("x", 10)
        .attr("y", 270)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("XY");

    playerDetailG.append("text")
        .attr("x", 130)
        .attr("y", 240)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Wage (in EUR)");

    playerDetailG.append("text")
        .attr("id", "playerWage")
        .attr("x", 130)
        .attr("y", 270)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("XY");

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 290)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Skill Moves");

    playerDetailG.append("g")
        .attr("id", "skillBarG")
        .attr("transform", "translate(10, 295)");

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 325)
        .attr("font-size", 11)
        .attr("fill", "#18414e")
        .text("Weak Foot");

    playerDetailG.append("g")
        .attr("id", "weakFootBarG")
        .attr("transform", "translate(10, 330)");

    ctx.attributeGroups = {}

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 420)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Attacking");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(10, i * 40 + 445, playerDetailG, Object.keys(statDicts.attacking_stats)[i], Object.values(statDicts.attacking_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 10)
        .attr("y", 660)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Skills");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(10, i * 40 + 685, playerDetailG, Object.keys(statDicts.skill_stats)[i], Object.values(statDicts.skill_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 197.5)
        .attr("y", 420)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Movement");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(197.5, i * 40 + 445, playerDetailG, Object.keys(statDicts.movement_stats)[i], Object.values(statDicts.movement_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 197.5)
        .attr("y", 660)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Power");

    for (let i = 0; i < 5; i++) {
        initPlayerStatDetailBar(197.5, i * 40 + 685, playerDetailG, Object.keys(statDicts.power_stats)[i], Object.values(statDicts.power_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 385)
        .attr("y", 420)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Mentality");

    for (let i = 0; i < 6; i++) {
        initPlayerStatDetailBar(385, i * 40 + 445, playerDetailG, Object.keys(statDicts.mentality_stats)[i], Object.values(statDicts.mentality_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 385)
        .attr("y", 700)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Defending");

    for (let i = 0; i < 3; i++) {
        initPlayerStatDetailBar(385, i * 40 + 725, playerDetailG, Object.keys(statDicts.defending_stats)[i], Object.values(statDicts.defending_stats)[i], 0);
    }

    playerDetailG.append("text")
        .attr("x", 572.5)
        .attr("y", 420)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Goalkeeping");

    for (let i = 0; i < 6; i++) {
        initPlayerStatDetailBar(572.5, i * 40 + 445, playerDetailG, Object.keys(statDicts.goalkeeping_stats)[i], Object.values(statDicts.goalkeeping_stats)[i], 0);
    }

    popupG = playerDetailG.append("g")
        .attr("id", "popupG3")
        .attr("transform", "translate(-25,-5)");
    addInformationBubble(popupG, ["Hover over single attributes to compare the value", "against other players in the selected area, and", "the attribute value history for the player.", "A similar feature can be discovered when", "hovering over the Overall value."], "#6C8289", "white");
}

function updatePlayerDetailView(player) {
    d3.select("#playerName").text(player.short_name);
    d3.select("#playerTeam").text(player.club_name);
    d3.select("#playerNationality").text(player.nationality_name);
    d3.select("#playerPosition").text(player.position);
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
                .attr("transform", "translate(" + 220 + "," + -75 + ")");
            detailG.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 310)
                .attr("height", 200)
                .attr("fill", "lightblue");
            detailG.append("rect")
                .attr("x", 5)
                .attr("y", 5)
                .attr("width", 300)
                .attr("height", 190)
                .attr("fill", "#18414e");
            attributeHistoryG = detailG.append("g")
                .attr("transform", "translate(5, 5)");
            densityG = detailG.append("g")
                .attr("transform", "translate(5, 100)");
            densityPlot(ctx.currentDataSelection, "overall", densityG, 300, 95, player.overall);
            attributeHistoryPlot(player, "overall", attributeHistoryG, 300, 95);
        })
        .on("mouseout", function () {
            d3.select("#playerPotentialG")
                .transition()
                .duration(500)
                .attr("transform", "translate(375, 150)");
            d3.select("#ovr-detail").remove();
        });
    d3.select("#playerAge").text(player.age);
    d3.select("#playerHeight").text(playerHeightString(player.height_cm));
    d3.select("#playerWeight").text(player.weight_kg + "kg");
    d3.select("#playerValue").text(playerValueString(player.value_eur));
    d3.select("#playerWage").text(playerValueString(player.wage_eur));
    d3.select("#playerImage").attr("xlink:href", player.player_face_url);
    d3.select("#clubFlag").attr("xlink:href", player.club_logo_url);
    d3.select("#nationalFlag").attr("xlink:href", player.nation_flag_url);
    skillBarPlot(d3.select("#skillBarG"), player.skill_moves);
    skillBarPlot(d3.select("#weakFootBarG"), player.weak_foot);

    for (let i = 0; i < 7; i++) {
        updatePlayerStatDetailBars(Object.values(Object.values(statDicts)[i]), player);
    }
}

function skillBarPlot(g, skills) {
    // draw a skill bar plot showing the player's skill level (from 0 to 5) as 5 separate bars
    for (let i = 0; i < 5; i++) {
        g.append("rect")
            .attr("x", i * 45)
            .attr("y", 0)
            .attr("width", 35)
            .attr("height", 10)
            .attr("fill", () => {
                if (i < skills) {
                    return "#82A0A9";
                } else {
                    return "#18414e";
                }
            });
    }

}

function playerValueString(value) {
    if (value < 1000) {
        return value.toString();
    } else if (value < 1000000) {
        return (value / 1000).toFixed(1) + "K";
    } else {
        return (value / 1000000).toFixed(1) + "M";
    }
}

function playerHeightString(value) {
    return (value / 100).toFixed(2) + "m";
}

function initPlayerStatDetailBar(x, y, G, name, attr_name, value) {
    let statScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 160]);

    /*g = G.append("g")
        .attr("id", "statDetailG_" + attr_name)
        .attr("transform", "translate(" + x + "," + y + ")");*/
    ctx.attributeGroups[attr_name] = [x, y]

    G.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("font-size", 15)
        .attr("fill", "#18414e")
        .text(name);

    G.append("text")
        .attr("id", "PlayerAttributeVal_" + attr_name)
        .attr("x", x + 160)
        .attr("y", y)
        .attr("font-size", 15)
        .attr("text-anchor", "end")
        .attr("fill", "#18414e")
        .text(value);

    G.append("rect")
        .attr("x", x)
        .attr("y", y + 5)
        .attr("width", 160)
        .attr("height", 10)
        .attr("fill", "#18414e");

    G.append("rect")
        .attr("id", "PlayerAttribute_" + attr_name)
        .attr("x", x - 1)
        .attr("y", y + 4)
        .attr("width", statScale(value) + 1)
        .attr("height", 12)
        .attr("fill", "#6C8289");

    G.append("rect")
        .attr("id", "PlayerAttribute_" + attr_name + "_overlay")
        .attr("x", x - 1)
        .attr("y", y - 15)
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
                xy = ctx.attributeGroups[attr_names[i]]
                detailG = d3.select("#playerDetailG").append("g")
                    .attr("id", "detailG_" + attr_names[i] + "Text")
                    .attr("transform", "translate(" + (xy[0] - 75) + "," + (xy[1] - 220) + ")");
                detailG.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 310)
                    .attr("height", 200)
                    .attr("fill", "lightblue");
                detailG.append("rect")
                    .attr("x", 5)
                    .attr("y", 5)
                    .attr("width", 300)
                    .attr("height", 190)
                    .attr("fill", "#18414e");
                attributeHistoryG = detailG.append("g")
                    .attr("transform", "translate(5, 5)");
                densityG = detailG.append("g")
                    .attr("transform", "translate(5, 100)");
                densityPlot(ctx.currentDataSelection, attr_names[i], densityG, 300, 95, player[attr_names[i]]);
                attributeHistoryPlot(player, attr_names[i], attributeHistoryG, 300, 95);
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
        .range([27, width - 12]);

    let yScale = d3.scaleLinear()
        .domain([history_min, history_max])
        .range([height - 25, 20]);

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

    // append an axis showing ticks for each year
    let xAxis = d3.axisBottom(xScale)
        .tickValues([2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022])
        .tickFormat(d3.format("d"));

    xAxisG = G.append("g")
        .attr("transform", "translate(0," + (height - 20) + ")")
        .call(xAxis);

    xAxisG.selectAll("text")
        .attr("font-size", 8)
        .attr("fill", "lightblue");

    xAxisG.selectAll("line")
        .attr("stroke", "lightblue");

    xAxisG.selectAll("path")
        .attr("stroke", "lightblue");

    // append a y axis showing
    let yAxis = d3.axisLeft(yScale)
        .tickValues([history_min, history_max])
        .tickFormat(d3.format("d"));

    yAxisG = G.append("g")
        .attr("transform", "translate(22,0)")
        .call(yAxis);

    yAxisG.selectAll("text")
        .attr("font-size", 8)
        .attr("fill", "lightblue");

    yAxisG.selectAll("line")
        .attr("stroke", "lightblue");

    yAxisG.selectAll("path")
        .attr("stroke", "lightblue");
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
                    attributeHistory.push([i, parseInt(data[j][attribute])]);
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
        .range([10, width - 10]);
    density = attributeDensity(data, attribute, xScale);
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(density, (d) => d[1])])
        .range([height - 25, 20]);
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
        .attr("y", 20)
        .attr("width", 2)
        .attr("height", height - 45)
        .attr("fill", "red");

    // show all the multiples of 10 on the x axis
    let xAxis = d3.axisBottom(xScale)
        .tickValues([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        .tickFormat(d3.format("d"));

    xAxisG = g.append("g")
        .attr("transform", "translate(0," + (height - 20) + ")")
        .call(xAxis);

    xAxisG.selectAll("text")
        .attr("font-size", 8)
        .attr("fill", "lightblue");

    xAxisG.selectAll("line")
        .attr("stroke", "lightblue");

    xAxisG.selectAll("path")
        .attr("stroke", "lightblue");
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



function initSelectors(playerList) {
    let ids = ["player1DropdownContent", "player2DropdownContent"]
    /*let allAttrs = []
    let attrRef = {}
    for (idx in Object.keys(statDicts)) {
        let stats = statDicts[Object.keys(statDicts)[idx]]
        Object.keys(stats).forEach(stat => allAttrs.push(stat))
        Object.keys(stats).forEach(stat => attrRef[stat] = stats[stat])
    }*/
    let attrRefBasis = generalStatsCTX.relevantAttrs;
    let attrRef = {};
    for (let [key, value] of Object.entries(attrRefBasis)) {
        if (!(["Value", "Wage", "Age", "Date of birth", "Height", "Weight", "Weak Foot", "Skill Moves"].includes(key))) {
            attrRef[key] = value;
        }
    }
    d3.select(".dropdown-content a:hover")
        .style("background-color", tinycolor("#18414e").darken(10));

    d3.select("#attrBtn")
        .attr("textContent", ctx.comparisonAttr);

    for (let id in ids) {
        d3.select("#" + ids[id])
            .selectAll("players")
            .data(playerList)
            .enter()
            .append("a")
            .on("click", (event, d) => {
                console.log("Clicked on " + d.short_name);
                ctx.comparisonPlayers[parseInt(id) + 1] = d
                updateYAxisScale();
                showPlayerDropdown(ids[id]);
                updatePlayerComparisonView(parseInt(id) + 1, d);
                updateComparison1(parseInt(id) + 1, d);
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
        .data(Object.keys(attrRef))
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + attrRef[d]);
            ctx.comparisonAttr = attrRef[d]
            ctx.comparisonAttrRef = d
            if (Object.keys(ctx.comparisonPlayers).length != 0) {
                updateYAxisScale();
                updateComparisonAttr(ctx.comparisonPlayers[1], ctx.comparisonPlayers[2]);
            }
            showPlayerDropdown("attrSelectionContent");
            // update y label
            d3.select("#yAxisLabelComp1")
                .text(d);
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


function updateYAxisScale() {
    let attr = ctx.comparisonAttr;
    let min_values = []
    Object.keys(ctx.comparisonPlayers).forEach((key) => {
        let history = attributeHistory(ctx.comparisonPlayers[key].sofifa_id, attr);
        let history_min = d3.min(history, d => {
            if (d != null){
                return d[1];
            }
        });
        min_values.push(history_min);
    })
    let min = d3.min(min_values, d => d);
    min = Math.floor(min / 10) * 10
    ctx.yRatingScale = d3.scaleLinear()
        .domain([min - 10, 100])
        .range([475, 75]);

    axis = d3.select("#yAxisComp1")
        .transition()
        .duration(500)
        .call(d3.axisLeft(ctx.yRatingScale));
        
    axis.selectAll("text").attr("fill", tinycolor("#18414e").darken(10).toString());
    axis.selectAll("line").attr("stroke", tinycolor("#18414e").darken(10).toString());
    axis.selectAll("path").attr("stroke", tinycolor("#18414e").darken(10).toString());
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

function initPlayersComparisonView() {
    let playersComparisonG = d3.select("#playersComparisonG");

    playersComparisonG.attr("transform", "translate(0,1050)");
    playersComparisonG.append("rect")
        .attr("width", 1900)
        .attr("height", 600)
        .attr("fill", "#6C8289");

    playersComparisonG.append("rect")
        .attr("transform", "translate(0,0)")
        .attr("width", 300)
        .attr("height", 600)
        .attr("fill", tinycolor("#6C8289").lighten(20));

    addPlayerFace("#playersComparisonG", 0, 0, 300, 150, 1);
    addPlayerFace("#playersComparisonG", 0, 300, 300, 150, 2);
    drawComparisonAxis(375, 75);
}

function addPlayerFace(rootId, x, y, w, h, playerNo) {
    y = y + 50
    let root = d3.select(rootId);

    // the detail rect(with light color) is from y = y+h to y = y+h+100
    if (playerNo == 1) {
        root.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", w)
            .attr("height", h + 100)
            .attr("fill", "#4DD0F7");
    }
    else {
        root.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", w)
            .attr("height", h + 100)
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
        .attr("x", x + 30)
        .attr("y", y + 26)
        .attr("width", 0.8 * w)
        .attr("height", 0.8 * h)
        .attr("anchor", "middle")
        .attr("xlink:href", "https://cdn.sofifa.net/players/notfound_0_120.png");

    root.append("image")
        .attr("id", `clubFlag${playerNo}`)
        .attr("x", x + 15)
        .attr("y", y + 10)
        .attr("width", 55)
        .attr("height", 55)
        .attr("xlink:href", "https://cdn.sofifa.net/teams/21/60.png");

    root.append("image")
        .attr("id", `nationalFlag${playerNo}`)
        .attr("x", x + (w - 60))
        .attr("y", y + 10)
        .attr("width", 45)
        .attr("height", 45)
        .attr("xlink:href", "https://cdn.sofifa.net/flags/de.png");

    root.append("text")
        .attr("id", `playerName${playerNo}`)
        .attr("x", 10)
        .attr("y", y + h + 30)
        .attr("font-size", 25)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .text("Player Name");

    root.append("text")
        .attr("id", `playerPosition${playerNo}`)
        .attr("x", 10)
        .attr("y", y + h + 60)
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        // .attr("text-anchor", "end")
        .text("POS");
}

function drawComparisonAxis(x, y) {
    let years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];
    let width = 700;
    let height = 400;
    let axis = d3.select("g#playersComparisonG").append("g").attr("id", "comparison1");

    ctx.yRatingScale = d3.scaleLinear()
        .domain([0, 100])
        .range([y + height, y]);

    ctx.xYearsScale = d3.scaleBand()
        .domain(years)
        .range([x, x + width])
        .padding([0.8])
    // x axis
    let xAxis = axis.append("g")
        .attr("id", "xAxisComp1")
        .attr("transform", `translate(0,${y + height})`)
        .call(d3.axisBottom(ctx.xYearsScale));
    
    // x axis label
    axis.append("text")
        .attr("id", "xAxisLabelComp1")
        .attr("x", x + width / 2)
        .attr("y", y + height + 50)
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .attr("text-anchor", "middle")
        .text("Year");
    
    // y axis
    let yAxis = axis.append("g")
        .attr("id", "yAxisComp1")
        .attr("transform", `translate(${x},${0})`)
        .call(d3.axisLeft(ctx.yRatingScale));
    
    // y axis label
    axis.append("text")
        .attr("id", "yAxisLabelComp1")
        .attr("x", - (y + height / 2))
        .attr("y", x - 40)
        .attr("transform", "rotate(-90)")
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .attr("fill", "#18414e")
        .attr("text-anchor", "middle")
        .text("Overall");

    xAxis.selectAll("line").attr("stroke", tinycolor("#18414e").darken(10).toString());
    xAxis.selectAll("path").attr("stroke", tinycolor("#18414e").darken(10).toString());
    xAxis.selectAll("text").attr("fill", tinycolor("#18414e").darken(10).toString());
    yAxis.selectAll("line").attr("stroke", tinycolor("#18414e").darken(10).toString());
    yAxis.selectAll("path").attr("stroke", tinycolor("#18414e").darken(10).toString());
    yAxis.selectAll("text").attr("fill", tinycolor("#18414e").darken(10).toString());
}

function updatePlayerComparisonView(playerNo, player) {
    d3.select(`#playerImage${playerNo}`).attr("xlink:href", player.player_face_url);
    d3.select(`#clubFlag${playerNo}`).attr("xlink:href", player.club_logo_url);
    d3.select(`#nationalFlag${playerNo}`).attr("xlink:href", player.nation_flag_url);
    d3.select(`#playerName${playerNo}`).text(player.short_name);
    d3.select(`#playerPosition${playerNo}`).text(player.position);
}

function updateComparison1(playerNo, player) {
    if (document.getElementById(`player${playerNo}LinePlot`) != null) {
        document.getElementById("comparison1").removeChild(
            document.getElementById(`player${playerNo}LinePlot`)
        );
    }
    let linePlot = d3.select("#comparison1").append("g")
        .attr("id", `player${playerNo}LinePlot`)
        .attr("transform", "translate(5, 5)");

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

    if (playerNo == 1) {
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
    else {
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

    let otherLinePlot = d3.select(`#player${3 - playerNo}LinePlot`);
    if (otherLinePlot != null) {
        let otherPlayer = ctx[`curPlayer${3 - playerNo}y`];
        let otherPlayerLine = d3.line()
            .curve(d3.curveLinear)
            .x(d => ctx.xYearsScale(d[0]))
            .y((d,i) => ctx.yRatingScale(d[1]));
        otherLinePlot.select("path")
            .transition()
            .ease(d3.easeCubic)
            .duration(1000)
            .attr("d", otherPlayerLine);
    }

    drawRadar("comparisonRadarG", "playersComparisonG", Object.values(ctx.comparisonPlayers), getComparisonStatsCfg(), "comparison");
}

function updateComparisonAttr(player1, player2) {
    let player1Plot = d3.select(`#player1LinePlot`)
    let player2Plot = d3.select(`#player2LinePlot`)
    let historyPlayer1 = new Object();
    let historyPlayer2 = new Object();

    if (ctx.comparisonPlayers[1] != null) {
        historyPlayer1 = attributeHistory(ctx.comparisonPlayers[1].sofifa_id, ctx.comparisonAttr);
        historyPlayer1 = historyPlayer1.filter(function (d) {
            return d != null;
        });
        let linePlayer1 = d3.line()
            .curve(d3.curveLinear)
            .x(d => ctx.xYearsScale(d[0]))
            .y(d => ctx.yRatingScale(d[1]));
        player1Plot.select("path")
            .datum(historyPlayer1)
            .transition()
            .ease(d3.easeCubic)
            .duration(1000)
            .attr("d", linePlayer1);
    }
    if (ctx.comparisonPlayers[2] != null) {
        historyPlayer2 = attributeHistory(ctx.comparisonPlayers[2].sofifa_id, ctx.comparisonAttr);
        historyPlayer2 = historyPlayer2.filter(function (d) {
            return d != null;
        });
        let linePlayer2 = d3.line()
            .curve(d3.curveLinear)
            .x(d => ctx.xYearsScale(d[0]))
            .y(d => ctx.yRatingScale(d[1]));
        player2Plot.select("path")
            .datum(historyPlayer2)
            .transition()
            .ease(d3.easeCubic)
            .duration(1000)
            .attr("d", linePlayer2);
    }
    drawRadar("comparisonRadarG", "playersComparisonG", Object.values(ctx.comparisonPlayers), getComparisonStatsCfg(), "comparison");

}

function getComparisonStatsCfg(data) {
    let cfg = {
        x: 1500,
        y: 300,
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

//---------------------------------------------------------------------------------------------------------

const generalStatsCTX = {
    attrX: "overall",
    attrY: "wage_eur",
    attrHue: "league_name",
    position_map: {
        "LB": "Defense",
        "LCB": "Defense",
        "CB": "Defense",
        "RCB": "Defense",
        "RB": "Defense",
        "LWB": "Defense",
        "RWB": "Defense",
        "LDM": "Midfield",
        "CDM": "Midfield",
        "RDM": "Midfield",
        "LM": "Midfield",
        "LCM": "Midfield",
        "CM": "Midfield",
        "RCM": "Midfield",
        "RM": "Midfield",
        "LAM": "Midfield",
        "CAM": "Midfield",
        "RAM": "Midfield",
        "LW": "Attack",
        "LF": "Attack",
        "CF": "Attack",
        "RF": "Attack",
        "RW": "Attack",
        "LS": "Attack",
        "ST": "Attack",
        "RS": "Attack",
    },
    important_leagues: [
        "English Premier League",
        "Spain Primera Division",
        "Italian Serie A",
        "German 1. Bundesliga",
        "French Ligue 1"
    ]
}

function initGeneralDataAnalysis() {
    generalStatsG = d3.select("#generalStatsG")
        .attr("transform", "translate(0, 1650)");
    scatterPlotG = generalStatsG.append("g")
        .attr("id", "scatterPlotG")
        .attr("transform", "translate(400, 30)");
    creditG = generalStatsG.append("g")
        .attr("id", "creditG")
        .attr("transform", "translate(1150, 450)");
    setupCredits(creditG);
    let attrRefBasis = generalStatsCTX.relevantAttrs;
    let attrRef = {};
        for (let [key, value] of Object.entries(attrRefBasis)) {
            if (!(["Date of birth", "Speed", "Skill Moves", "Weak Foot", "Diving", "Handling", "Kicking", "Reflexes", "Positioning (GK)"].includes(key))) {
                attrRef[key] = value;
            }
        }
    generalStatsCTX.relevantAttrs = attrRef;
    generalStatsCTX.relevantPlayers = ctx.playersPerYear[ctx.YEAR].filter(p => p.overall > 75 && p.position != "GK")
        .sort((a, b) => b.overall - a.overall).slice(0, 200);
    initVariableScatterPlot(scatterPlotG);
}

function loadRelevantAttrs() {
    dict = {};
    d3.csv("compAttributes.csv").then(function (data) {
        data.forEach(function (d) {
            dict[d.name] = d.attribute;  
        });
    });
    generalStatsCTX.relevantAttrs = dict;
    console.log("Loaded relevant attributes");
    let categoricalPlayerAttributes = {
        "Position": "position",
        "League": "league_name",
        "Preferred Foot": "preferred_foot",
        "Skill Moves": "skill_moves",
        "Weak Foot": "weak_foot"
    }
    generalStatsCTX.categoricalAttrs = categoricalPlayerAttributes;
}

function initVariableScatterPlot(g) {
    d3.select("#attrXSelectionContent")
        .selectAll("attributes")
        .data(Object.keys(generalStatsCTX.relevantAttrs))
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + generalStatsCTX.relevantAttrs[d]);
            if (generalStatsCTX.attrX == generalStatsCTX.relevantAttrs[d]) {
                return;
            }
            generalStatsCTX.attrX = generalStatsCTX.relevantAttrs[d];
            updateVariableScatterPlot("x");
            showPlayerDropdown("attrXSelectionContent");
        })
        .append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "white")
        .text(d => d);

    d3.select("#attrYSelectionContent")
        .selectAll("attributes")
        .data(Object.keys(generalStatsCTX.relevantAttrs))
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + generalStatsCTX.relevantAttrs[d]);
            if (generalStatsCTX.attrY == generalStatsCTX.relevantAttrs[d]) {
                return;
            }
            generalStatsCTX.attrY = generalStatsCTX.relevantAttrs[d];
            updateVariableScatterPlot("y");
            showPlayerDropdown("attrYSelectionContent");
        })
        .append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "#18414e")
        .text(d => d);
    
    d3.select("#attrHueSelectionContent")
        .selectAll("attributes")
        .data(Object.keys(generalStatsCTX.categoricalAttrs))
        .enter()
        .append("a")
        .on("click", (event, d) => {
            console.log("Clicked on " + generalStatsCTX.categoricalAttrs[d]);
            generalStatsCTX.attrHue = generalStatsCTX.categoricalAttrs[d];
            updateVariableScatterPlot("hue");
            showPlayerDropdown("attrHueSelectionContent");
        })
        .append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "#18414e")
        .text(d => d);
    
    x_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
    x_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
    y_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));
    y_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));

    let xYearsScale = d3.scaleLinear()
        .domain([
            x_min - 0.1 * (x_max - x_min),
            x_max + 0.1 * (x_max - x_min)
        ])
        .range([0, 500]);
    let yRatingScale = d3.scaleLinear()
        .domain([
            y_min - 0.1 * (y_max - y_min),
            y_max + 0.1 * (y_max - y_min)
        ])
        .range([500, 0]);
    let xAxis = d3.axisBottom(xYearsScale);
    let yAxis = d3.axisLeft(yRatingScale);

    let hueScale = d3.scaleOrdinal()
            .range(['#4DD0F7','#27E8AB', '#E04371', '#867C9C', '#7C9C81', '#E8E8E8']);
        
    if (generalStatsCTX.attrHue == "position") {
        hueScale = d3.scaleOrdinal()
            .domain(["Defense", "Midfield", "Attack"])
            .range(["#E04371", "#E0D216", "#4DD0F7"]);
    }
    else if (generalStatsCTX.attrHue == "preferred_foot") {
        hueScale = d3.scaleOrdinal()
            .range(["#E04371", "#4DD0F7"]);
    } else if (generalStatsCTX.attrHue == "weak_foot" || generalStatsCTX.attrHue == "skill_moves") {
        hueScale = d3.scaleLinear()
            .domain([2, 5])
            .range(["#E04371", "#4DD0F7"]);
    }

    let xAxisG = g.append("g")
        .attr("id", "xAxis")
        .attr("transform", "translate(0, 500)")
        .call(xAxis);
    xAxisG.selectAll("text")
        .attr("fill", "white");
    xAxisG.selectAll("line")
        .attr("stroke", "white");
    xAxisG.selectAll("path")
        .attr("stroke", "white");
    
    let yAxisG = g.append("g")
        .attr("id", "yAxis")
        .attr("transform", "translate(0, 0)")
        .call(yAxis);
    yAxisG.selectAll("text")
        .attr("fill", "white");
    yAxisG.selectAll("line")
        .attr("stroke", "white");
    yAxisG.selectAll("path")
        .attr("stroke", "white");

    g.append("text")
        .attr("id", "xAxisLabel")
        .attr("x", 250)
        .attr("y", 550)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "white")
        .text(getKeyByValue(generalStatsCTX.relevantAttrs, generalStatsCTX.attrX));
    g.append("text")
        .attr("id", "yAxisLabel")
        .attr("x", -250)
        .attr("y", -50)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "white")
        .attr("transform", "rotate(-90)")
        .text(getKeyByValue(generalStatsCTX.relevantAttrs, generalStatsCTX.attrY));
    
    scatterPlotG = g.append("g")
        .attr("id", "scatterPlot")
        .attr("transform", "translate(0, 0)");
    
    scatteredPoints = scatterPlotG.selectAll("circle")
        .data(generalStatsCTX.relevantPlayers)
        .enter()
        .append("circle")
        .attr("class", "scatteredPoint")
        .attr("id", d => `scatter_${d.sofifa_id}`)
        .attr("cx", d => xYearsScale(parseFloat(d[generalStatsCTX.attrX]) + randomNoise(x_max - x_min)))
        .attr("cy", d => yRatingScale(parseFloat(d[generalStatsCTX.attrY]) + randomNoise(y_max - y_min)))
        .attr("r", 3)
        .attr("fill", d => {
            if (generalStatsCTX.attrHue == "position") {
                return hueScale(generalStatsCTX.position_map[d[generalStatsCTX.attrHue]]);
            } else if (generalStatsCTX.attrHue == "league_name") {
                if (generalStatsCTX.important_leagues.includes(d[generalStatsCTX.attrHue])) {
                    return hueScale(d[generalStatsCTX.attrHue]);
                } else {
                    return hueScale("Other");
                }
            }
            return hueScale(d[generalStatsCTX.attrHue]);
        })
        .on("mouseover", (event,d) => {
            d3.selectAll(".scatteredPoint")
                .attr("fill-opacity", 0.5);
            d3.select(`#scatter_${d.sofifa_id}`)
                .attr("fill-opacity", 1);
        })
        .on("mouseout", (d,i) => {
            d3.selectAll(".scatteredPoint")
                .attr("fill-opacity", 1);
        });
    
    scatteredPoints.append("title")
        .text(d => `${d.short_name} (${d.position})\n${d.club_name}\n${d.nationality_name}`);

        
    let legend = g.append("g")
        .attr("id", "legend")
        .attr("transform", "translate(0, 0)");
        
    popupG = g.append("g")
        .attr("id", "popupG")
        .attr("transform", "translate(700, 30)");
    addInformationBubble(popupG, ["We found that there are various interesting attribute combinations:", " - Age (x) vs Acceleration (y) vs Preferred Foot (hue)", " - Overall (x) vs Wage (y) vs League (hue)", " - Age (x) vs Penalties (y) vs Position (hue)", " - Dribbling (x) vs Ball Control (y) vs Skill Moves (hue)"], "#6C8289", "white");

    legend.append("text")
        .attr("id", "legendTitle")
        .attr("x", 550)
        .attr("y", 50)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("fill", "white")
        .text(getKeyByValue(generalStatsCTX.categoricalAttrs, generalStatsCTX.attrHue));
    
    let uniqueLegendValues = [...new Set(generalStatsCTX.relevantPlayers.map(d => d[generalStatsCTX.attrHue]))];
    uniqueLegendValues = uniqueLegendValues.sort((a, b) => a.localeCompare(b));

    if (generalStatsCTX.attrHue == "position") {
        uniqueLegendValues = ["Defense", "Midfield", "Attack"];
    } else if (generalStatsCTX.attrHue == "league_name") {
        uniqueLegendValues = generalStatsCTX.important_leagues.concat(["Other"]);
    }

    let legendItems = legend.selectAll("g")
        .data(uniqueLegendValues)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(550, ${70 + i * 20})`);
    
    legendItems.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .attr("fill", d => hueScale(d));
    
    legendItems.append("text")
        .attr("x", 10)
        .attr("y", 5)
        .attr("font-size", 15)
        .attr("font-family", "sans-serif")
        .attr("fill", "white")
        .text(d => d);

    // plot linear regression with 95% confidence bands
    let x = generalStatsCTX.relevantPlayers.map(d => parseFloat(d[generalStatsCTX.attrX]));
    let y = generalStatsCTX.relevantPlayers.map(d => parseFloat(d[generalStatsCTX.attrY]));
    res = computeLinearRegression(x, y); // slope, intercept

    let x1 = x_min - 0.1 * (x_max - x_min);
    let x2 = x_max + 0.1 * (x_max - x_min);
    let y1 = res.slope * x1 + res.intercept;
    let y2 = res.slope * x2 + res.intercept;
    
    scatterPlotG.append("line")
        .attr("id", "regressionLine")
        .attr("x1", xYearsScale(x1))
        .attr("y1", yRatingScale(y1))
        .attr("x2", xYearsScale(x2))
        .attr("y2", yRatingScale(y2))
        .attr("stroke", "grey")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5, 5");
}

function randomNoise(span){
    span = 0.05 * span;
    let rand = Math.random() * span - span / 2;
    return rand;
}

function updateVariableScatterPlot(attribute) {
    scatterPlotG = d3.select("#scatterPlot");
    if (attribute == "x") {
        let x_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
        let x_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
        let xYearsScale = d3.scaleLinear()
        .domain([
            x_min - 0.1 * (x_max - x_min),
            x_max + 0.1 * (x_max - x_min)
        ])
        .range([0, 500]);
        let xAxis = d3.axisBottom(xYearsScale);
        scatterPlotG.selectAll("circle")
            .transition()
            .duration(500)
            .attr("cx", d => xYearsScale(parseFloat(d[generalStatsCTX.attrX]) + randomNoise(x_max - x_min)));
        let xAxisG = d3.select("#xAxis")
            .transition()
            .duration(500)
            .call(xAxis);
        xAxisG.selectAll("text")
            .attr("fill", "white");
        if (generalStatsCTX.attrX == "value_eur") {
            xAxisG.selectAll("text")
                .text(d => playerValueString(parseFloat(d)));
        }
        xAxisG.selectAll("path")
            .attr("stroke", "white");
        xAxisG.selectAll("line")
            .attr("stroke", "white");
        d3.select("#xAxisLabel")
            .transition()
            .duration(500)
            .text(getKeyByValue(generalStatsCTX.relevantAttrs, generalStatsCTX.attrX));
    } else if (attribute == "y") {
        let y_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));
        let y_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));
        let yRatingScale = d3.scaleLinear()
        .domain([
            y_min - 0.1 * (y_max - y_min),
            y_max + 0.1 * (y_max - y_min)
        ])
        .range([500, 0]);
        let yAxis = d3.axisLeft(yRatingScale);
        scatterPlotG.selectAll("circle")
            .transition()
            .duration(500)
            .attr("cy", d => yRatingScale(parseFloat(d[generalStatsCTX.attrY]) + randomNoise(y_max - y_min)));
        let yAxisG = d3.select("#yAxis")
            .transition()
            .duration(500)
            .call(yAxis);
        yAxisG.selectAll("text")
            .attr("fill", "white");
        if (generalStatsCTX.attrY == "value_eur") {
            yAxisG.selectAll("text")
                .text(d => playerValueString(parseFloat(d)));
        }
        yAxisG.selectAll("path")
            .attr("stroke", "white");
        yAxisG.selectAll("line")
            .attr("stroke", "white");
        d3.select("#yAxisLabel")
            .transition()
            .duration(500)
            .text(getKeyByValue(generalStatsCTX.relevantAttrs, generalStatsCTX.attrY));
    } else if (attribute == "hue") {
        let hueScale = d3.scaleOrdinal()
            .range(['#4DD0F7','#27E8AB', '#E04371', '#867C9C', '#7C9C81', '#E8E8E8']);
        
        if (generalStatsCTX.attrHue == "position") {
            hueScale = d3.scaleOrdinal()
                .domain(["Defense", "Midfield", "Attack"])
                .range(["#E04371", "#E0D216", "#4DD0F7"]);
        }
        else if (generalStatsCTX.attrHue == "preferred_foot") {
            hueScale = d3.scaleOrdinal()
                .range(["#E04371", "#4DD0F7"]);
        } else if (generalStatsCTX.attrHue == "weak_foot" || generalStatsCTX.attrHue == "skill_moves") {
            hueScale = d3.scaleLinear()
                .domain([2, 5])
                .range(["#E04371", "#4DD0F7"]);
        }

        scatterPlotG.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", d => {
                if (generalStatsCTX.attrHue == "position") {
                    console.log(generalStatsCTX.position_map[d[generalStatsCTX.attrHue]]);
                    return hueScale(generalStatsCTX.position_map[d[generalStatsCTX.attrHue]]);
                } else if (generalStatsCTX.attrHue == "league_name") {
                    if (generalStatsCTX.important_leagues.includes(d[generalStatsCTX.attrHue])) {
                        return hueScale(d[generalStatsCTX.attrHue]);
                    } else {
                        return hueScale("Other");
                    }
                }
                return hueScale(d[generalStatsCTX.attrHue]);
            });
        let uniqueLegendValues = [...new Set(generalStatsCTX.relevantPlayers.map(d => d[generalStatsCTX.attrHue]))];
        uniqueLegendValues = uniqueLegendValues.sort((a, b) => a.localeCompare(b));
        
        if (generalStatsCTX.attrHue == "position") {
            uniqueLegendValues = ["Defense", "Midfield", "Attack"];
        } else if (generalStatsCTX.attrHue == "league_name") {
            uniqueLegendValues = generalStatsCTX.important_leagues.concat(["Other"]);
        }

        let too_long = uniqueLegendValues.length > 24;
        if (too_long) {
            uniqueLegendValues = uniqueLegendValues.slice(0, 24);
        }

        d3.select("#legend").selectAll("g").remove();
        d3.select("#legendTooLong").remove();
    
        let legendItems = d3.select("#legend").selectAll("g")
            .data(uniqueLegendValues)
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(550, ${70 + i * 20})`);
        
        legendItems.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 5)
            .attr("fill", d => hueScale(d));
        
        legendItems.append("text")
            .attr("x", 10)
            .attr("y", 5)
            .attr("font-size", 15)
            .attr("font-family", "sans-serif")
            .attr("fill", "white")
            .text(d => d);
        
        if (too_long) {
            d3.select("#legend").append("text")
                .attr("id", "legendTooLong")
                .attr("x", 550)
                .attr("y", 70 + 24 * 20)
                .attr("font-size", 15)
                .attr("font-family", "sans-serif")
                .attr("fill", "white")
                .text("...");
        }
        
        d3.select("#legendTitle")
            .text(getKeyByValue(generalStatsCTX.categoricalAttrs, generalStatsCTX.attrHue));
    }
    if (attribute == "x" || attribute == "y") {
        let x_values = generalStatsCTX.relevantPlayers.map(d => parseFloat(d[generalStatsCTX.attrX]));
        let y_values = generalStatsCTX.relevantPlayers.map(d => parseFloat(d[generalStatsCTX.attrY]));
        let res = computeLinearRegression(x_values, y_values);
        let x_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
        let x_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrX]));
        let xYearsScale = d3.scaleLinear()
            .domain([
                x_min - 0.1 * (x_max - x_min),
                x_max + 0.1 * (x_max - x_min)
            ])
            .range([0, 500]);
        let y_min = d3.min(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));
        let y_max = d3.max(generalStatsCTX.relevantPlayers, d => parseFloat(d[generalStatsCTX.attrY]));
        let yRatingScale = d3.scaleLinear()
            .domain([
                y_min - 0.1 * (y_max - y_min),
                y_max + 0.1 * (y_max - y_min)
            ])
            .range([500, 0]);
        let x1 = x_min - 0.1 * (x_max - x_min);
        let x2 = x_max + 0.1 * (x_max - x_min);
        let y1 = res.slope * x1 + res.intercept;
        let y2 = res.slope * x2 + res.intercept;
        
        d3.select("#regressionLine")
            .transition()
            .duration(500)
            .attr("x1", xYearsScale(x1))
            .attr("y1", yRatingScale(y1))
            .attr("x2", xYearsScale(x2))
            .attr("y2", yRatingScale(y2));
    }
}

function computeLinearRegression(x_values, y_values) {
    // compute linear regression and uncertainty for both, slope and intercept
    let x_mean = d3.mean(x_values);
    let y_mean = d3.mean(y_values);
    let x_dev = x_values.map(d => d - x_mean);
    let y_dev = y_values.map(d => d - y_mean);
    let x_dev_squared = x_dev.map(d => d * d);
    let x_dev_y_dev = x_dev.map((d, i) => d * y_dev[i]);
    let slope = d3.sum(x_dev_y_dev) / d3.sum(x_dev_squared);
    let intercept = y_mean - slope * x_mean;
    let y_dev_predicted = x_dev.map((d, i) => slope * d + intercept - y_mean);
    let y_dev_predicted_squared = y_dev_predicted.map(d => d * d);
    let s_squared = d3.sum(y_dev_predicted_squared) / (x_values.length - 2);
    let s = Math.sqrt(s_squared);
    let s_slope = s / Math.sqrt(d3.sum(x_dev_squared));
    let s_intercept = s * Math.sqrt(1 / x_values.length + x_mean * x_mean / d3.sum(x_dev_squared));
    return {
        slope: slope,
        intercept: intercept,
        s_slope: s_slope,
        s_intercept: s_intercept
    };
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

//---------------------------------------------------------------------------------------------------------

function setupCredits(g){
    g.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("font-size", 30)
        .attr("font-weight", "bold")
        .attr("fill", "grey")
        .text("FIFA Scouting Dashboard")
    lines = [
        "A project by Thomas Wimmer and Haileleul Haile.",
        "Developed as the final project of the Data Visualization Class (INF552) of École Polytechnique.",
        "Dataset taken from https://www.kaggle.com/datasets/stefanoleone992/fifa-22-complete-player-dataset."
    ]
    g.selectAll(".creditLine")
        .data(lines)
        .enter()
        .append("text")
        .attr("class", "creditLine")
        .attr("x", 0)
        .attr("y", (d, i) => 60 + 20 * i)
        .attr("font-size", 15)
        .attr("fill", "grey")
        .text(d => d);
}

function addInformationBubble(g, informationText, colorBg, colorText){
    let popupG = g.append("g")
        .attr("id", "popupG_" + g.attr("id"));

    g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 15)
        .attr("fill", colorBg);
    
    g.append("text")
        .attr("x", 0)
        .attr("y", 5)
        .attr("font-size", 15)
        .attr("font-weight", "bold")
        .attr("fill", colorText)
        .attr("text-anchor", "middle")
        .text("?");
    
    g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 15)
        .attr("fill", "transparent")
        .on("mouseover", function(){
            let popup = popupG.append("g");
            popup.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", d3.max(informationText, t => t.length) * 6.8 + 10)
                .attr("height", informationText.length * 20 + 10)
                .attr("fill", tinycolor(colorBg).darken(20).toString()); 
            popup.selectAll("text")
                .data(informationText)
                .enter()
                .append("text")
                .attr("x", 10)
                .attr("y", (d, i) => 20 + 20 * i)
                .attr("font-size", 15)
                .attr("fill", colorText)
                .text(d => d);
        })
        .on("mouseout", function(){
            popupG.select("g")
                .remove();
        });

}