/**
 * New node file
 */

var tests = require('./tests/test.js');

describe('Fast', function() {
	tests(require('./conf/fast.conf.js'));
})