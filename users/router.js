'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
const router = express.Router();
const {User} = require('./models');

// Posts a new user to the database, requiring a first name and last name and automatically generating a username.

router.post('/', jsonParser, (req, res) => {
	const requiredFields = ['password', 'firstName', 'lastName', 'isTeacher'];
	const missingField = requiredFields.find(field => !(field in req.body));

	if (missingField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Missing field',
			location: missingField
		});
	}

	const stringFields = ['password', 'firstName', 'lastName'];
	const nonStringField = stringFields.find(
		field => field in req.body && typeof req.body[field] !== 'string'
	);

	if (nonStringField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Incorrect field type: expected string',
			location: nonStringField
		});
	}

	const explicityTrimmedFields = ['firstName', 'lastName', 'password'];
	const nonTrimmedField = explicityTrimmedFields.find(
		field => req.body[field].trim() !== req.body[field]
	);

	if (nonTrimmedField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Cannot start or end with whitespace',
			location: nonTrimmedField
		});
	}

	const sizedFields = {
		firstName: {
			min: 2
		},
		lastName: {
			min: 2
		},
		password: {
			min: 3,
			max: 72
		}
	};
	const tooSmallField = Object.keys(sizedFields).find(
		field =>
			'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
	);
	const tooLargeField = Object.keys(sizedFields).find(
		field =>
			'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
	);

	if (tooSmallField || tooLargeField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: tooSmallField
				? `Must be at least ${sizedFields[tooSmallField]
					.min} characters long`
				: `Must be at most ${sizedFields[tooLargeField]
					.max} characters long`,
			location: tooSmallField || tooLargeField
		});
	}

	let {password, firstName, lastName, isTeacher = false} = req.body;
	firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
	lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
	let username = firstName[0].toLowerCase() + lastName.toLowerCase();

	return User.find({username})
		.count()
		.then(count => {
			if (count > 0) {
				return Promise.reject({
					code: 422,
					reason: 'ValidationError',
					message: 'Username already taken',
					location: 'username'
				});
			}
			return User.hashPassword(password);
		})
		.then(hash => {
			return User.create({
				username,
				password: hash,
				firstName,
				lastName,
				isTeacher
			});
		})
		.then(user => {
			return res.status(201).json(user.serialize());
		})
		.catch(err => {
			if (err.reason === 'ValidationError') {
				return res.status(err.code).json(err);
			}
			res.status(500).json({code: 500, message: 'Internal server error'});
		});
});

//Gets all of the classes attached to a teacher user.
router.get('/class', jwtAuth, (req, res) => {
	if (req.user.isTeacher === false) {
		Promise.reject({message: 'Student users cannot create classes.'});
	}
  
	User
		.findOne({username: req.user.username})
		.then(user => res.status(200).json({classes: user.classes}))
		.catch(err => res.status(500).json({message: 'Internal server error'}));
});

//Gets one class given a className.
router.get('/class/get/:id', jwtAuth, (req, res) => {
	if (req.user.isTeacher === false) {
		Promise.reject({message: 'Student users cannot create classes.'});
	}
  
	User
		.findOne({username: req.user.username})
		.then(user => {
			let specificClass = user.classes.find(each => each.className = req.params.id);
			if (specificClass) {
				return specificClass;
			} else {
				return Promise.reject({message: 'Queried class does not exist'});
			}
		})
		.then(specificClass => res.status(200).json(specificClass))
		.catch(err => res.status(500).json({message: 'Internal server error.'}));
});

//Creates a new class attached to a teacher user
router.post('/class/create', jwtAuth, (req, res) => {
	if (req.user.isTeacher === false) {
		Promise.reject({message: 'Student users cannot create classes.'});
	}
  
	const {className, userIds} = req.body;
  
	User
		.find({'username': { $in: userIds}})
		.then(users => users.filter(each => !each.isTeacher))
		.then(studentObjects => {
			const students = studentObjects.map(each => each.username);
			return User
				.findOne({username: req.user.username})
				.then(user => {
					user.classes.push({className, studentIds: students});
					user.save();
					return user;
				});})
		.then(user => res.status(201).json(user))
		.catch(err => res.status(500).json({message: 'Internal server error.', err: err}));
});

//Allows teacher users to delete a class.
router.put('/class/remove', jwtAuth, (req, res) => {
	if (req.user.isTeacher === false) {
		Promise.reject({message: 'Student users cannot create classes.'});
	}
  
	User
		.findOne({username: req.user.username})
		.then(user => {
			user.classes = user.classes.filter(each => each.className !== req.body.className);
			user.save();
			return user;
		})
		.then(user => res.status(201).json(user))
		.catch(err => res.status(500).json({message: 'Internal server error'}));
});

//Allows teacher users to add or remove student usernames to a class.
router.post('/class/modify', jwtAuth, (req, res) => {
	if (req.user.isTeacher === false) {
		Promise.reject({message: 'Student users cannot create classes.'});
	}
  
	const {className, removeIds, addIds} = req.body;
	const userIds = removeIds.concat(addIds);
  
	User
		.find({'username': { $in: userIds}})
		.then(users => users.filter(each => !each.isTeacher))
		.then(studentObjects => {
			const students = studentObjects.map(each => each.username);
			return User
				.findOne({username: req.user.username})
				.then(user => {
					let classIndex = user.classes.findIndex(each => each.className === className);
					let classModify = user.classes.splice(classIndex, 1)[0];
					for (let i = 0; i < students.length; i++) {
						if (addIds.includes(students[i])) {
							classModify.studentIds.push(students[i]);
						} else if (removeIds.includes(students[i])) {
							let index = classModify.studentIds.indexOf(students[i]);
							classModify.studentIds.splice(index, 1);
						}
					}
					user.classes.push(classModify);
					user.save();
					return user;
				})
				.then(user => res.status(201).json(user))
				.catch(err => {
					console.log(err);
					return res.status(500).json(err);});
		});
});

module.exports = {router};
