'use strict';
require('dotenv').config();
const chai = require('chai');
const chaiHttp = require('chai-http');

const {TEST_DATABASE_URL} = require('../config');
const {dbConnect, dbDisconnect} = require('../db-mongoose');
const {User} = require('../users/models');
const { JWT_SECRET } = require('../config');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';

// Clear the console before each run
process.stdout.write('\x1Bc\n');

const expect = chai.expect;
chai.use(chaiHttp);

before(function() {
	return dbConnect(TEST_DATABASE_URL);
});

after(function() {
	return dbDisconnect();
});

describe('Mocha and Chai', function() {
	it('should be properly setup', function() {
		expect(true).to.be.true;
	});
});
