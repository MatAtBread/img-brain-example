const http = require('http');
const clients = {'http:':http, 'https:': require('https')};
const fs = require('fs');
const url = require('url');
const port = 8080;

const mime = require('mime/lite');

function proxy(res, req) {
  var request = url.parse(req.url);
  options = {
      host:    request.hostname,
      port:    request.port || (request.protocol==='https:' ? 443:80),
      path:    request.path,
      method:  req.method,
      headers: req.headers,
  };
  options.headers.host = options.host ;

  var backend_req = clients[request.protocol].request(options,   backend_res => {
    if (backend_res.statusCode >= 300 && backend_res.statusCode <= 399 && backend_res.headers.location)
      backend_res.headers.location = "/"+backend_res.headers.location ;

    res.writeHead(backend_res.statusCode, backend_res.headers);
    backend_res.on('data', chunk => res.write(chunk)) ;
    backend_res.on('end', _ => res.end()) ;
  });
  req.on('data', chunk => backend_req.write(chunk)) ;
  req.on('end', _ => backend_req.end()) ;
}

const requestHandler = (req, res) => {
  if (req.url==='/')
    req.url = '/index.html';

  if (req.url.startsWith("/http")) {
    req.url = req.url.slice(1);
    return proxy(res,req);
  }

  try {
    const data = fs.readFileSync('www'+req.url) ;
    const contentType = mime.getType(req.url.split(".").pop()) || "application/octet-stream" ;
    res.writeHead(200,{'Content-type':contentType}) ;
    res.end(data);
  } catch (ex) {
    res.writeHead(404,{'Content-type':"text/plain"}) ;
    res.end(ex.toString()) ;
  }
}

const server = http.createServer(requestHandler)

server.listen(port, err => console.log('server is listening on ',port));