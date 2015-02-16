/**
 * New node file
 */

var pool = require('../index');

function getConfig() {
	return {	
		index: 0,
		min: 1,
		max: 10,
		create: function(cb) {
			var i = this.index;
			this.index++;
			cb(null, {test: 5, useFlag: false, id: i});
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
			if(err) {
				if(cb) cb(err);
			} else {
				if(cb) cb(null, item);
			}
		},
		ttl: 10000
	}
}

describe('Resource Pool', function() {
	
	it('Should initialize', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			done();
		} catch(e) {
			done(e);
		}
	});
	
	
	it('Should have the minimum amount of connections at initalization', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			var idle = p.idle();
			if(idle == config.min) {
				done();
			} else {
				done('Unexpected connection count initialized:' + idle);
			}
		} catch(e) {
			done(e);
		}
	});
	
	it('Should provide connection', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				if(err) {
					done(err);
				} else {
					done();
				}
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should adjust idle count when connection provided', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				var idle = p.idle();
				if(idle == config.min - 1) {
					done();
				} else {
					done('Unexpected connection count :' + idle + ' expected ' + (config.min - 1));
				}
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should return appropriate used count', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				var used = p.used();
				if(used == 1) {
					done();
				} else {
					done('Unexpected connection count :' + used + ' expected 1');
				}
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should execute factory acquire callback', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				if(item.used) {
					done();
				} else {
					done('Factory callback was not executed');
				}
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should release connection on release()', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				if(err) {
					done(err);
				}
				item.release(function(err) {
					if(err) {
						done(err);
					} else {
						done();
					}
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	
	it('Should execute factory release callback', function(done) {
		try {
			var config = getConfig();
			var called = false;
			config.release = function(err, item, cb) {
				called = true;
				item.useFlag = false;
				cb(null, item);
			}
			var p = new pool(config);
			p.acquire(function(err, item) {
				item.release(function(err, item) {
					if(err) {
						done(err);
					}
					if(called) {
						done();
					} else {
						done('Factory release callback was not executed');
					}
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should have appropriate count of uses', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				item.release(function(err, item) {
					p.acquire(function(err, item) {
						item.release(function(err, item){
							if(p.getIdleArray()[0].uses == 2) {
								done();
							} else {
								done('Done count does not match. Expected 2. Detected: ' + p.getPoolArray()[0].uses)
							}
						})
					})
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should discart surplus resources', function(done) {
		try {
			var config = getConfig();
			config.ttl = 10;
			var p = new pool(config);
			p.acquire(function(err, item1) {	
				p.acquire(function(err, item2) {
					item2.release();
				})
				item1.release()
			});
			var itrv = setInterval(function() {
				if(p.getIdleArray().length == 1) {
					clearInterval(itrv);
					done();
				}
			},50);
		} catch(e) {
			done(e);
		}
	});
	
	it('Should call callback on resource release', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				item.release(function(err, item) {
					if(err) { 
						done(err)
					} else { 
						done()
					}
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should shut down when drained', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				item.release(function(err) {
					p.drain(function() {
						done();
					});
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should shut down when drained even if resource not released when boolean switch set', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				p.drain(function() {
					done();
				}, true);
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should fail to shut down when resource is not released and force shutdown is not called', function(done) {
		try {
			var ttl = 100;
			this.timeout(ttl + 5000);
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				var timeout = setTimeout(done, ttl);
				p.drain(function() {
					done(new Error('The pool is not expected to drain when items are not released'));
				}, false);
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should callback with error when attemting to destory a used connection', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				p.acquire(function(err, item) {
					p.acquire(function(err, item) {						
						item.destory(function(err, item){
							if(err && err.message == "Connection needs to be released before being destoryed") {
								done();
							} else {
								if(err) {
									done('Recieved wrong error message:' + err.message);
								} else {
									done('Recieved no error message');
								}
							}
						});
					});
				});
			});
		} catch(e) {
			done(e);
		}
	});
	
	it('Should destory a released connection', function(done) {
		try {
			var config = getConfig();
			var p = new pool(config);
			p.acquire(function(err, item) {
				p.acquire(function(err, item) {
					p.acquire(function(err, item) {
						item.release(function(err, item) {
							item.destory(function(err, item){
								if(err) {
									done(err);
								} else {
									done();
								}
							});
						});
					});
				});
			});
		} catch(e) {
			done(e);
		}
	})
});