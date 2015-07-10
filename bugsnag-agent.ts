///<reference path='typings/node/node.d.ts' />

import http = require("http")
import https = require("https")

class BugsnagAgent {
    private count = 0;
    private agent = new https.Agent();
    private console = console;

    constructor() {
        this.agent.maxSockets = 100;
    }

    public start() {
        var self = this;
        var server = http.createServer(function (
            req:http.IncomingMessage,
            res:http.ServerResponse
        ) {
            var body = '';
            req.on('data', function (chunk:string) { body = body + chunk; });
            req.on('end', function () {
                res.end('okay. ' + body.length + ' bytes received.');

                self.count++;
                self.log('recv', {size: body.length, pending: self.count});
                self.sendRequest(body);
            });
        });

        server.listen(3829, '127.0.0.1', function () {
            self.log('HTTP server started');
        });
    }

    private sendRequest(json:string) {
        var self = this;
        var req = https.request({
            host: 'notify.bugsnag.com',
            headers: {'content-type': 'application/json'},
            method: 'POST',
            agent: this.agent
        }, function (res:http.IncomingMessage) {
            var body = '';
            res.on('data', function (chunk:string) { body = body + chunk; });
            res.on('end', function () {
                self.count--;
                self.handleResponse(json, body, res.statusCode);
            });
        });
        req.on('error', function (e:Object) {
            self.count--;
            self.log('error', {
                size: json.length,
                pending: self.count,
                error: e,
                payload: json
            });
        });
        req.end(json);
    }

    private handleResponse(json:string, response:string, code:number) {
        if (code < 200 || code >= 300) {
            this.log('error', {
                size: json.length,
                pending: this.count,
                code: code,
                message: response,
                payload: json,
            });
        } else {
            this.log('send', {size: json.length, pending: this.count});
        }
    }

    private log(name:string, body?:Object) {
        var time = '[' + new Date().toLocaleString() + ']';
        if (body)
            this.console.log(time, name, body);
        else
            this.console.log(time, name);
    }
}

(new BugsnagAgent()).start();

