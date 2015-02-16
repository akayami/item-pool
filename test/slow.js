/**
 * New node file
 */
var tests = require('./tests/test.js');

describe('Slow', function() {
	this.timeout(120000);
	tests(require('./conf/slow.conf.js'))
});