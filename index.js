const brain = require('brain.js');

const cortex = brain.NeuralNetwork;
const net = new cortex();

function param(x) {
	if (Array.isArray(x))
		return x.map(param) ; 
	
	return [].slice.call(JSON.stringify(x)).map(c => c.charCodeAt(0)/256)

}


const mathProblems = [];
for (let i = 0; i < 10; i++) {
	for (let j = 0; j < 10; j++) {
		if (i==3 && j==4) continue ;
		if (i==4 && j==3) continue ;
		mathProblems.push({input:[i/10,j/10], output:[(i+j)/20]});
		mathProblems.push({input:[j/10,i/10], output:[(i+j)/20]});
	}
}

net.train(mathProblems, {
//	hiddenLayers:[11,7,5,3,2],
	log: true, 
	errorThresh: 0.00001 
});

console.log(net.run([0.3,0.4])*20)
