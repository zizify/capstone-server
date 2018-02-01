// 'use strict';
// require('dotenv').config();

// const chai = require('chai');
// const chaiHttp = require('chai-http');
// process.stdout.write('\x1Bc\n');
// const {runServer, app} = require('../index');
// const {TEST_DATABASE_URL} = require('../config');
// const {dbConnect, dbDisconnect} = require('../db-mongoose');

// const { User } = require('../users/models');
// const { JWT_SECRET } = require('../config');
// const jwt = require('jsonwebtoken');

// process.env.NODE_ENV = 'test';

// const should = chai.should();
// const expect = chai.expect;
// chai.use(chaiHttp);

// before(function() {
// 	return dbConnect(TEST_DATABASE_URL).then(() => runServer(8081));
// });

// after(function() {
// 	return dbDisconnect(TEST_DATABASE_URL);
// });

// describe('Mocha and Chai', function() {
// 	it('should be properly setup', function() {
// 		expect(true).to.be.true;
// 	});
    
// 	it('should load homepage on GET', () => {
// 		return chai.request(app)
// 			.get('/api/users/test')
// 			.then((res) => {
// 				res.should.have.status(200);
// 			});
// 	});
// });
