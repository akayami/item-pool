/**
 * New node file
 */

var tests = require('./tests/test.js');

describe('Normal', function() {
	tests(require('./conf/normal.conf.js'))
});