///<reference path='typings/node/node.d.ts' />
"use strict";
var http = require("http");
var https = require("https");
module.exports = class {
    constructor() {
        this.count = 0;
        this.agent = new https.Agent();
        this.console = console;
        this.agent.maxSockets = 100;
    }
    start() {
        let server = http.createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => { body = body + chunk; });
            req.on('end', () => {
                res.end(`okay. ${body.length} bytes received.`);
                this.count++;
                this.log('recv', { size: body.length, pending: this.count });
                this.sendRequest(body, 5);
            });
        });
        server.listen(3829, '127.0.0.1', () => {
            this.log('HTTP server started');
        });
    }
    sendRequest(json, retry) {
        let req = https.request({
            host: 'notify.bugsnag.com',
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            agent: this.agent
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body = body + chunk; });
            res.on('end', () => {
                this.handleResponse(json, body, res.statusCode, retry);
            });
        });
        req.on('error', (e) => {
            this.count--;
            this.log('error', {
                size: json.length,
                pending: this.count,
                error: e,
                payload: json
            });
        });
        req.end(json);
    }
    handleResponse(json, response, code, retry) {
        if (code == 502 && retry > 0) {
            this.log(`error "502 Bad Gateway", retrying in 5 seconds, ${retry} retries left`);
            setTimeout(() => {
                this.sendRequest(json, retry - 1);
            }, 5000);
        }
        else if (code < 200 || code >= 300) {
            this.count--;
            this.log('error', {
                size: json.length,
                pending: this.count,
                code: code,
                message: response,
                payload: json,
            });
        }
        else {
            this.count--;
            this.log('send', { size: json.length, pending: this.count });
        }
    }
    log(name, body) {
        let time = '[' + new Date().toLocaleString() + ']';
        if (body) {
            this.console.log(time, name, body);
        }
        else {
            this.console.log(time, name);
        }
    }
}
;
