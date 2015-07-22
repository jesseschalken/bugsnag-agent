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
        var server = http.createServer((
            req:http.IncomingMessage,
            res:http.ServerResponse
        ) => {
            var body = '';
            req.on('data', (chunk:string) => { body = body + chunk; });
            req.on('end', () => {
                res.end('okay. ' + body.length + ' bytes received.');

                this.count++;
                this.log('recv', {size: body.length, pending: this.count});
                this.sendRequest(body, 5);
            });
        });

        server.listen(3829, '127.0.0.1', () => {
            this.log('HTTP server started');
        });
    }

    private sendRequest(json:string, retry:number) {
        var req = https.request({
            host: 'notify.bugsnag.com',
            headers: {'content-type': 'application/json'},
            method: 'POST',
            agent: this.agent
        }, (res:http.IncomingMessage) => {
            var body = '';
            res.on('data', (chunk:string) => { body = body + chunk; });
            res.on('end', () => {
                this.handleResponse(json, body, res.statusCode, retry);
            });
        });
        req.on('error', (e:Object) => {
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

    private handleResponse(json:string, response:string, code:number, retry:number) {
        if (code == 502 && retry > 0) {
            this.log('error "502 Bad Gateway", retrying in 5 seconds, ' + retry + ' retries left');
            setTimeout(() => {
                this.sendRequest(json, retry - 1);
            }, 5000);
        } else if (code < 200 || code >= 300) {
            this.count--;
            this.log('error', {
                size: json.length,
                pending: this.count,
                code: code,
                message: response,
                payload: json,
            });
        } else {
            this.count--;
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

