/**
 * New node file
 */


module.exports = function() {
	return {	
		index: 0,
		min: 1,
		max: 10,
		create: function(cb) {
			var i = this.index;
			this.index++;
			setTimeout(function() {
				cb(null, {test: 5, useFlag: false, id: i, destoryed: false});
			}, 50);
		},
		acquire: function(err, item, cb) {
			item.used = true;
			if(cb) {
				cb(null, item);
			}
		},
		release: function(err, item, cb) {
			item.used = false;
			if(cb) {
				cb(null, item);
			}
		},
		destory: function(err, item, cb) {
			item.destroyed=true;
			if(err) {
				if(cb) cb(err);
			} else {
				if(cb) cb(null, item);
			}
		},
		ttl: 10000
	}
}