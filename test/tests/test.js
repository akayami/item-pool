/**
 * New node file
 */

var pool = require('../../index');

module.exports = function(config) {

	var getConfig = config;

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
				p.startup(function() {
					var idle = p.idle();
					if(idle == config.min) {
						done();
					} else {
						done('Unexpected connection count initialized:' + idle);
					}
				})
			} catch(e) {
				done(e);
			}
		});
		
		it('Should have the appropriate state when started', function(done) {
			var config = getConfig();
			var p = new pool(config);
			p.startup(function() {
				if(p.hasStarted()) {
					done();
				} else {
					done(new Error("Did not change state to started"));
				}
			});
		});
		
		it('Should have the appropriate state before being started', function(done) {
			var config = getConfig();
			var p = new pool(config);
			if(!p.hasStarted()) {
				done();
			} else {
				done(new Error("State not reflected properly"));
			}			
		});
		
		it('Should provide connection', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
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
		
		it('Should adjust idle count when connection provided', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						var idle = p.idle();
						if(idle == config.min - 1) {
							done();
						} else {
							done('Unexpected connection count :' + idle + ' expected ' + (config.min - 1));
						}
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should return appropriate used count', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						var used = p.used();
						if(used == 1) {
							done();
						} else {
							done('Unexpected connection count :' + used + ' expected 1');
						}
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should execute factory acquire callback', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						if(item.used) {
							done();
						} else {
							done('Factory callback was not executed');
						}
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should release connection on release()', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
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
				p.startup(function() {
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
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should have appropriate count of uses', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						item.release(function(err, item) {
							p.acquire(function(err, item) {
								item.release(function(err, item){
									var idle = p.getIdle();
									if(idle[Object.keys(idle)[0]].uses == 2) {
										done();
									} else {
										done('Done count does not match. Expected 2. Detected: ' + p.getPoolArray()[0].uses)
									}
								})
							})
						});
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should discart surplus resources', function(done) {
			try {
				var config = getConfig();
				config.ttl = 50;
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item1) {
						p.acquire(function(err, item2) {
							item2.release();
							item1.release();
						})
					});
					var itrv = setInterval(function() {
						if(p.idle()== 1) {
							clearInterval(itrv);
							done();
						}
					},100);
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should call callback on resource release', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						item.release(function(err, item) {
							if(err) { 
								done(err)
							} else { 
								done()
							}
						});
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
				p.startup(function() {
					p.acquire(function(err, item) {
						item.release(function(err) {
							p.drain(function() {
								done();
							});
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
				p.startup(function() {
					p.acquire(function(err, item) {
						p.drain(function() {
							done();
						}, true);
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should fail to shut down when resource is not released and force shutdown is not called', function(done) {
			try {
				var ttl = 100;
				this.timeout(this.timeout() + 5000);
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						var timeout = setTimeout(done, ttl);
						p.drain(function() {
							done(new Error('The pool is not expected to drain when items are not released'));
						}, false);
					});
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should callback with error when attemting to destory a used connection', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
//				this.timeout(20000);
				p.startup(function() {
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
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should destory a released connection', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
//				this.timeout(20000);
				p.startup(function() {
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
				});
			} catch(e) {
				done(e);
			}
		})
		
		it('Should destory connection correctly by passing through factory destory callback', function(done) {
			try {
				var config = getConfig();
				var p = new pool(config);
				p.startup(function() {
					p.acquire(function(err, item) {
						item.release(function(err, item) {
							item.destory(function(err, item){						
								if(err) {
									done(err);
								} else {
									if(item.destroyed) {
										done();
									} else {
										done(new Error('Item is not flagged as destoryed'));
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
		
		it('Should limit the number of connections', function(done) {
			try {
				var config = getConfig();
				config.max = 3;
				var p = new pool(config);
				p.startup(function(err) {
					if(err) {
						return done(err);
					}
					p.acquire(function(err, i) {
						if(err) {
							return done(err);
						}
						p.acquire(function(err, j) {
							if(err) {
								return done(err);
							}
							p.acquire(function(err, k) {
								if(err) {
									return done(err);
								}
								p.acquire(function(err, k) {
									if(!err) {
										return done(new Error('Acquire should have returned an error when asking for resources beyond maxium count'));
									} else {
										if(err.message == 'Maximum amount of items defined by config.max already created') {
											return done();
										} else {
											return done(new Error('Unexpected error message:' + e.message))
										}
									}
									
								})
							})
						})
					})
				});
			} catch(e) {
				done(e);
			}
		});
		
		it('Should readjust the number of connection to the minimum specified in config.min', function(done) {
			try {
				var config = getConfig();
				config.min = 2;
				var p = new pool(config);
				p.startup(function(err) {
					if(err) {
						return done(err);
					} else {
						p.acquire(function(err, conn) {
							conn.release(function(err) {
								conn.destory(function(err, conn) {
									if(err) {
										done(err);
									} else {
										var i = setInterval(function() {
											if(p.total() == config.min) {
												clearInterval(i);
												done();
											}
										}, 100);
									}
								});
							})
						});
					}
				});
			} catch(e) {
				done(e);
			}
		})
	});
}