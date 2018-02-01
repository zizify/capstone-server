'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const { Assignment } = require('./models');
const { User } = require('../users/models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });

//Confirmed
//Create a new assignment
router.post('/teacher', jwtAuth, (req, res) => {
	if (!req.user.isTeacher) 
		return res.status(403).json({ code: 403, message: 'Only teachers can create assignments.' });

	const { title, subject, className, points, goals, instructions, assignDate, dueDate } = req.body;
	User
		.findOne({username: req.user.username})
		.then(user => {
			const thisClass = user.classes.find(each => each.className === className);
			const studentIds = thisClass.studentIds;
			let students = studentIds.map(each => {
				return {username: each, pointsEarned: 0, comments: '', grade: null};
			});

			return Assignment.create({title, subject, teacher: req.user.username, className, points, goals, instructions, assignDate, dueDate, students});
		})
		.then(assignment => res.status(201).json(assignment.serialize()))
		.catch(err =>
			res.status(500).json({ code: 500, message: 'Bad request.', err })
		);
});

//Confirmed
//Modify an existing assignment to change properties other than students.
router.put('/teacher/change/:id', jwtAuth, (req, res) => {
	if (!req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only teachers can change assignments.' });

	const toUpdate = {};
	const updateableFields = [
		'title',
		'subject',
		'className',
		'points',
		'goals',
		'instructions',
		'assignDate',
		'dueDate'
	];

	updateableFields.forEach(field => {
		if (field in req.body) {
			toUpdate[field] = req.body[field];
		}
	});

	Assignment.findByIdAndUpdate(req.params.id, { $set: toUpdate })
		.then(newAssignment => res.status(204).json({ newAssignment }))
		.catch(err =>
			res.status(500).json({ message: 'Internal server error', err })
		);
});

//Confirmed
//Retrieves all of the assignments belonging to a student user.
router.get('/student', jwtAuth, (req, res) => {
	if (req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only for students.' });

	User.findOne({ username: req.user.username })
		.count()
		.then(count => {
			if (count === 0) {
				return Promise.reject({ code: 422, message: 'No such user exists' });
			}
		})
		.then(
			Assignment.find()
				.then(assignments => {
					let relevantAssignments = assignments.filter(assignment => {
						return assignment.students.find(student => student.username === req.user.username)
					}).map(assignment => {
						const studentObject = assignment.students.find(student => student.username === req.user.username);
						delete assignment._doc.students
						delete assignment._doc.__v
						return {...assignment._doc, username: studentObject.username, pointsEarned: studentObject.pointsEarned, comments: studentObject.comments, grade: studentObject.grade };
					});

					return relevantAssignments;
				})
				.then(relevant => {
					const grades = relevant.reduce((obj, assignment) => {
						if (!obj[assignment.className]) {
							obj[assignment.className] = {
								assignments: 0,
								points: 0,
								pointsEarned: 0
							}
						}

						obj[assignment.className].assignments++
						if (assignment.pointsEarned && assignment.points) {
							obj[assignment.className].points += assignment.points;
							obj[assignment.className].pointsEarned += assignment.pointsEarned;
							}
							
						return obj;
					}, {})

					return res.status(200).json({ relevant, grades });
				})
				.catch(err => {
					console.log(err);
					return res.status(500).json({ message: 'Internal server error.' });}));
});

//Confirmed
//Gets all assignments created by currently logged in teacher
router.get('/teacher', jwtAuth, (req, res) => {
	if (!req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only a teacher can access his/her created assignments.' });

	Assignment.find({ teacher: req.user.username }).then(all =>
		res.status(200).json({ all })
	);
});

//Confirmed
//Deletes assignment by ID for a teacher
router.delete('/teacher/delete/:id', jwtAuth, (req, res) => {
	if (!req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only teachers can delete assignments.' });

	Assignment.findById(req.params.id)
		.then(assignment => {
			if (assignment.teacher === req.user.username) {
				return Assignment.findByIdAndRemove(req.params.id);
			} else {
				return Promise.reject({
					message: 'Username and Assigment Teacher Need to Match'
				});
			}
		})
		.then(() => res.status(204).end())
		.catch(err => res.status(500).json({ message: 'Internal server error.' }));
});

//Confirmed
//Update student objects with grades, comments, etc.
router.post('/teacher/update/:id', jwtAuth, (req, res) => {
	if (!req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only teachers can update assignments.' });
	
	if (!req.body.student)
		return res.status(422).json({code: 422, message: 'Student missing from req body.'});
		
	const {student} = req.body;		

	Assignment
		.findById(req.params.id)
		.then(assignment => {
			let studentObject = assignment.students.find(each => each.username === student);
			let pointsEarned;
			let comments;

			if (req.body.pointsEarned) {
				pointsEarned = req.body.pointsEarned;
			}

			if (req.body.comments) {
				comments = studentObject.comments;
			}
			
			studentObject['pointsEarned'] = pointsEarned;
			studentObject['comments'] = comments;
			studentObject.grade = Math.floor((pointsEarned/assignment.points)*100)/100;

			return assignment;
		})
		.then(assignment => Assignment.findByIdAndUpdate(req.params.id, assignment))
		.then(() => res.status(200).end())
		.catch(err => res.status(500).json({message: 'Internal server error.'}));
});

module.exports = { router };
