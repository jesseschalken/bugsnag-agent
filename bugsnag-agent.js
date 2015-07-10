///<reference path='typings/node/node.d.ts' />
var http = require("http");
var https = require("https");
var BugsnagAgent = (function () {
    function BugsnagAgent() {
        this.count = 0;
        this.agent = new https.Agent();
        this.console = console;
        this.agent.maxSockets = 100;
    }
    BugsnagAgent.prototype.start = function () {
        var self = this;
        var server = http.createServer(function (req, res) {
            var body = '';
            req.on('data', function (chunk) { body = body + chunk; });
            req.on('end', function () {
                res.end('okay. ' + body.length + ' bytes received.');
                self.count++;
                self.log('recv', { size: body.length, pending: self.count });
                self.sendRequest(body, 5);
            });
        });
        server.listen(3829, '127.0.0.1', function () {
            self.log('HTTP server started');
        });
    };
    BugsnagAgent.prototype.sendRequest = function (json, retry) {
        var self = this;
        var req = https.request({
            host: 'notify.bugsnag.com',
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            agent: this.agent
        }, function (res) {
            var body = '';
            res.on('data', function (chunk) { body = body + chunk; });
            res.on('end', function () {
                self.handleResponse(json, body, res.statusCode, retry);
            });
        });
        req.on('error', function (e) {
            self.count--;
            self.log('error', {
                size: json.length,
                pending: self.count,
                error: e,
                payload: json
            });
        });
        req.end(json);
    };
    BugsnagAgent.prototype.handleResponse = function (json, response, code, retry) {
        if (code == 502 && retry > 0) {
            var self = this;
            this.log('error "502 Bad Gateway", retrying in 5 seconds, ' + retry + ' retries left');
            setTimeout(function () {
                self.sendRequest(json, retry - 1);
            }, 5000);
        }
        else if (code < 200 || code >= 300) {
            this.count--;
            this.log('error', {
                size: json.length,
                pending: this.count,
                code: code,
                message: response,
                payload: json
            });
        }
        else {
            this.count--;
            this.log('send', { size: json.length, pending: this.count });
        }
    };
    BugsnagAgent.prototype.log = function (name, body) {
        var time = '[' + new Date().toLocaleString() + ']';
        if (body)
            this.console.log(time, name, body);
        else
            this.console.log(time, name);
    };
    return BugsnagAgent;
})();
(new BugsnagAgent()).start();
//# sourceMappingURL=bugsnag-agent.js.map