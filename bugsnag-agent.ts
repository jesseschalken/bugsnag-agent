///<reference path='typings/node/node.d.ts' />

import http = require("http")
import https = require("https")

var count = 0;

var agent = new https.Agent();
agent.maxSockets = 100;

var server = http.createServer(function (req:http.IncomingMessage, res:http.ServerResponse) {
    var body = '';
    req.on('data', function (chunk:string) { body = body + chunk; });
    req.on('end', function () {
        var size = body.length;
        res.end('okay. ' + size + ' bytes received.');

        count++;
        console.log('recv', {size: size, pending: count});

        var payload = body;
        var req = https.request({
            host: 'notify.bugsnag.com',
            headers: {'content-type': 'application/json'},
            method: 'POST',
            agent: agent
        }, function (res:http.IncomingMessage) {
            var body = '';
            res.on('data', function (chunk:string) { body = body + chunk; });
            res.on('end', function () {
                count--;

                var code = res.statusCode;
                if (code < 200 || code >= 300) {
                    console.error('error', {
                        size: size,
                        pending: count,
                        code: code,
                        message: body,
                        payload: payload,
                    });
                } else {
                    console.log('send', {size: size, pending: count});
                }
            });
        });
        req.on('error', function (e) {
            count--;
            console.error('error', {
                size: size,
                pending: count,
                error: e,
                payload: payload
            });
        });
        req.end(body);
    });
});

server.listen(3829, '127.0.0.1', function () {
    console.log('HTTP server started');
});

