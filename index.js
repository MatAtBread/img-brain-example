const http = require('http') ;
const fs = require('fs');

http.createServer((req,res) => {
    res.write  
}).listen(8000,err => {
  if (err) console.warn(err) ;
  else console.log("Open http://localhost:8000/") ;
}) ;
