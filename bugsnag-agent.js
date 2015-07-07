#!/usr/bin/env node

var http = require('http'),
    https = require('https');

var count = 0;

var agent = new https.Agent();
agent.maxSockets = 100;

var server = http.createServer(function (req, res) {
    var body = '';
    req.on('data', function (chunk) { body = body + chunk; });
    req.on('end', function () {
        var size = body.length;
        res.end('okay. ' + size + ' bytes received.');

        count++;
        console.log('recv', {size: size, pending: count});

        var req = https.request({
            host: 'notify.bugsnag.com',
            headers: {'content-type': 'application/json'},
            method: 'POST',
            agent: agent
        }, function (res) {
            var body = '';
            res.on('data', function (chunk) { body = body + chunk; });
            res.on('end', function () {
                count--;
                console.log('send', {size: size, pending: count});

                if (res.statusCode < 200 || res.statusCode >= 300)
                    console.error(res.statusCode + ' ' + res.statusMessage + ' ' + JSON.stringify(body));
            });
        });
        req.on('error', function (e) {
            count--;
            console.error('error', {size: size, pending: count, error: e});
        });
        req.end(body);
    });
});

server.listen(3829, '127.0.0.1', function () {
    console.log('HTTP server started');
});
