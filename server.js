var http = require('http');
var ecstatic = require('ecstatic');

http.createServer(ecstatic('public')).listen(process.env.PORT || 3000);
