let player_positions = ["LM"];
let selectedPositions = ["lm", "lam"]
// let array = JSON.parse("[" + string + "]");


console.log(player_positions.some(position => selectedPositions.includes(position.toLowerCase())));