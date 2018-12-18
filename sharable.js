const config = {
    elasticsearch:{
      "apiVersion": "6.3",
      "hosts": [
          "54.73.0.229:9200"
//          "esrta-client-a2:9200",
//          "esrta-client-a3:9200"
      ]
    }
};

//const fetch = require('node-fetch');
const elasticsearch = require('elasticsearch');
const brain = require('brain.js');
const fs = require('fs');
const es = new elasticsearch.Client(config.elasticsearch);

(async function(){
console.log("Get data from ES");
var shares = await es.search({
  index:'views-20181216-*',
  body:{
    "size": 0,
    "aggs": {
      "a": {
        "terms": {
          "field": "page.article",
          "size": 5000
        },
        "aggs": {
          "t": {
            "top_hits": {
              "size": 1,
              "_source": {
                "includes": [
                  "title"
                ]
              }
            }
          },
          "x": {
            "filter": {
              "terms": {
                "referrer": [
                  "FBIA",
                  "facebook"
                ]
              }
            }
          }
        }
      }
    }
  }
});

const bowMax = 371;

var shared = shares.aggregations.a.buckets.filter(b => b.x.doc_count && b.doc_count);

console.log("Got data:",shared.length);
var bow = {}, nBow = 0;
shared.forEach(b => {
  var title = b.t.hits.hits[0]._source.title ;
  b.strings = title.split(/[^a-zA-Z]+/).filter(w => w.length>2).map(w => w.toLowerCase());
  b.strings.forEach(s => {
    if (!(s in bow)) {
      nBow = (nBow+1) % bowMax;
      bow[s] = {idx:nBow, count: 1};
    }
    else
      bow[s].count +=1 ;
  });
});

var bowKeys = Object.keys(bow) ;
console.log("BoW length",bowKeys.length,bowMax);
function getBoW(strings){
  if (typeof strings === 'string')
    strings = strings.split(/[^a-zA-Z]+/).filter(w => w.length>2).map(w => w.toLowerCase()) ;
  
  var bag = new Array(bowMax/*bowKeys.length*/);
  bag.fill(0);
  var step = 1/(strings.length+1)
  strings.forEach(s => bow[s] && (bag[bow[s].idx] += step)) ;
  return bag ;
}

function prepData(b) {
  var count = b.doc_count ;
  var shares = b.x.doc_count ;
  return {
    input:getBoW(b.strings),
    output:[shares/count]
  }
}

console.log("Prepping data");
var trainingData = shared.map(prepData);
console.log("Prepped data:",trainingData.length,"...training...");
var net = new brain.NeuralNetwork({});

console.log(net.train(trainingData,{
  log: true, 
  logPeriod: 10,
  iterations: 10000,    // the maximum times to iterate the training data --> number greater than 0
  errorThresh: 0.001,   // the acceptable error percentage from training data --> number between 0 and 1
}));

fs.writeFileSync("brain.json",JSON.stringify(net));

console.log("Running tests");
var result = shares.aggregations.a.buckets.map(b => {
  var title = b.t.hits.hits[0]._source.title ;
  var count = b.doc_count ;
  var shares = b.x.doc_count ;
  var s = net.run(getBoW(title));
  var delta = 2*(s[0] - shares/count) / (s[0] + shares/count)
  return [delta,shares/count,s[0],'"'+title+'"'].join(",")
});

fs.writeFileSync("shares.csv",result.join("\n"));

})();