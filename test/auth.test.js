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

describe('Creates a user', function() {
	const username = 'tuser';
	const password = 'test';
	const firstName = 'Test';
	const lastName = 'User';
	const isTeacher = false;


	before(function() {
		return dbConnect(TEST_DATABASE_URL);
	});
    
	after(function() {
		return dbDisconnect();
	});
    
	beforeEach(() => {
		return User.hashPassword(password).then(password => {
			User.create({
				username,
				password,
				firstName,
				lastName,
				isTeacher
			});
		});
	});
    
	afterEach(() => {
		return User.remove({});
	});

	it('should be properly setup', function() {
		expect(true).to.be.true;
	});
});