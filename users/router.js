'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });
const router = express.Router();
const {User} = require('./models');

// Post to register a new user
router.post('/', jsonParser, (req, res) => {
	const requiredFields = ['username', 'password', 'isTeacher'];
	const missingField = requiredFields.find(field => !(field in req.body));

	if (missingField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Missing field',
			location: missingField
		});
	}

	const stringFields = ['username', 'password', 'firstName', 'lastName'];
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

	const explicityTrimmedFields = ['username', 'password'];
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
		username: {
			min: 1
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

	let {username, password, firstName = '', lastName = '', isTeacher = false} = req.body;
	firstName = firstName.trim();
	lastName = lastName.trim();

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
			let specificClass = user.classes.find(eachClass => eachClass.className = req.params.id);
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
  
	const {className} = req.body;
	let {removeIds, addIds} = req.body;
	const userIds = [...removeIds, ...addIds];
  
	User
		.find({'username': { $in: userIds}})
		.then(users => users.filter(each => !each.isTeacher))
		.then(studentObjects => {
			const students = studentObjects.map(each => each.username);
			students.forEach(student => {
				if (!removeIds.includes(student)) {
					let index = removeIds.indexOf(student);
					removeIds.splice(index, 1);
				}

				if (!addIds.includes(student)) {
					let index = addIds.indexOf(student);
					addIds.splice(index, 1);
				}
			});
			return User
				.findOne({username: req.user.username})
				.then(user => {
					let classModify = user.classes.find(each => each.className === className);
					let studentIds = classModify.studentIds;

					studentIds.forEach(id => {
						if (removeIds.includes(id)) {
							let index = studentIds.indexOf(id);
							studentIds.splice(index, 1);
						}
					});

					addIds.forEach(id => studentIds.push(id));

					return user;
				})
				.then(user => User.findOneAndUpdate({username: req.user.username}, user))
				.then(() => res.status(201).end())
				.catch(err => {
					return res.status(500).json(err);});
		});
});

module.exports = {router};
