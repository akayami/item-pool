/**
 * New node file
 */

var async = require('async');

module.exports = function(object) {
	
	var factory = object;
	var idle = [];
	var used = [];
	var draining = false;
	
	var started = false;
	
	var minInterval;
	
	this.getIdleArray = function() {
		return idle;
	}
		
	this.getUsedArray = function() {
		return used;
	}

	this.hasStarted = function() {
		return started;
	}
	
	this.total = function() {
		return this.idle() + this.used();
	}
	
	this.idle = function() {
		return idle.length;
	}
	
	this.used = function() {
		return used.length;
	}
	
	this.state = function() {
		return {
			idle: this.idle(),
			used: this.used()
		}
	}
	
	this.acquire = function(callback) {
		if(draining) {
			callback(new Error('Pool is draining'));
		}
		if(idle.length) {
			var item = idle.shift();
			
			item.uses++;
			item.used=true;
			item.__usedIndex = used.push(item) -1;
			
			if(factory.acquire) {
				factory.acquire(null, item.resource, callback);
			} else {
				callback(null, item.resource);
			}
		} else {
			this.create(function(err) {
				if(err) {
					return callback(err);
				}
				this.acquire(callback);
			}.bind(this));
		}
	}
	
	/**
	 * Release all - Will force-release all items back into pool.
	 */
	
	this.releaseAll = function(released) {
		var l = [];		
		for(var x in used) {
			l.push(
				function(pcb) {
					used[x].resource.release(function(err, cb) {
						pcb();
					});
				}
			);
		}
		async.parallel(l, function(err, result) {
			released(err);
		});
	}
	
	
	/**
	 * Main drain function
	 */
	this.drain = function(cb, forced) {
		draining = true;		
		clearInterval(this.cleaner);		
		if(forced) {
			this.releaseAll(function() {
				__drain(cb);
			});
		} else {
			__drain(cb)
		}		
	};
	
	/**
	 * Draining routine
	 */
	function __drain(cb) {
		this.drainInterval = setInterval(function() {
			while (idle.length > 0) {
				var item = idle.shift();				
				item.resource.destory();
			}
			if(used.length == 0) {
				clearInterval(this.drainInterval);
				cb(null);
			}
		}.bind(this), 10);
	}
	
	this.destory = function(item, cb) {
		var err = null;
		if(item.used) {
			err = new Error('Connection needs to be released before being destoryed');
		}
		idle.splice(item.__idleIndex, 1);
		if(factory.destory) {
			return factory.destory(err, item.resource, cb);
		} else{
			if(cb) {
				return cb(err, item.resource)
			}
		}
	};
	
	/**
	 * Standard idle routine
	 */
	function makeIdle(item) {
		item.used = false;
		item.__idleIndex = idle.push(item) - 1;
	}
	
	/**
	 * Release a connection
	 */
	this.release = function(item, cb) {
		used.splice(item.__usedIndex, 1);
		makeIdle(item);
		if(factory.release) {
			return factory.release(null, item.resource, cb);
		} else if(cb != undefined) {
			return cb(null, item.resource);
		}
	};
	
	/**
	 * Create a connection
	 */
	this.create = function(createCB) {
		if((idle.length + used.length) >= factory.max) {
			return createCB(new Error('Maximum amount of items defined by config.max already created'));
		}
		factory.create(function(err, resource) {
			if(err) {
				throw new Exception(e);
			} else {
				var item = {resource: resource, used: false, uses: 0};
				makeIdle(item);
				item.resource.release = function(cb) {
					if(cb) {
						this.parent.release(this.item, cb);
					} else {
						this.parent.release(this.item);
					}
				}.bind({parent: this, item: item});
				
				
				item.resource.destory = function(cb) {
					this.parent.destory(this.item, cb);
				}.bind({parent: this, item: item});
				if(createCB) {
					createCB();
				}
			}
		}.bind(this));
	};
	
	this.spinMin = function(c, callback) {
		if(c >= factory.min) {
			callback();
		} else {
			this.create(function() {
				this.spinMin(this.total(), callback);
			}.bind(this));
		}
	};
	
	this.startup = function(cb) {
		this.spinMin(this.total(), function() {
			started = true;
			cb()
		});
	}
	
	this.cleaner = setInterval(function() {
		while ((this.total() >= factory.min) && (this.idle() > 0)) {
			var item = idle.shift();
			item.resource.destory();
		};
	}.bind(this), factory.ttl);
}
