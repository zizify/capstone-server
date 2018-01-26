'use strict';
const express = require('express');
const bodyParser = require('body-parser');
// const jsonParser = bodyParser.json();
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
			let students = [];

			for (let i = 0; i < studentIds.length; i++) {
				students.push({
					username: studentIds[i],
					pointsEarned: 0,
					comments: '',
					grade: null
				});
			}
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

//Deprecated, students created on assignment according to className
//Add students to an assignment.
router.post('/teacher/add/:id', jwtAuth, (req, res) => {
	if (!req.user.isTeacher)
		return res.status(403).json({ code: 403, message: 'Only teachers can add students to assignments.' });

	let newStudents;
	if ('students' in req.body) {
		newStudents = req.body.students;
	} else {
		res.status(500).json({ message: 'Internal server error' });
	}

	Assignment.findById(req.params.id)
		.then(assignment => {
			let newArray = assignment.students;
			for (let i = 0; i < newStudents.length; i++) {
				newArray.push(newStudents[i]);
			}
			return Assignment.findByIdAndUpdate(
				req.params.id,
				{ students: assignment.students },
				{ new: true }
			);
		})
		.then(newAssignment => res.status(201).json({ newAssignment }))
		.catch(err => res.status(500).json({ message: 'Internal server error' }));
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
				.then(all => {
					let relevant = [];
					for (let i = 0; i < all.length; i++) {
						for (let j = 0; j < all[i].students.length; j++) {
							if (all[i].students[j].username === req.user.username) {
								relevant.push({
									_id: all[i]._id,
									title: all[i].title,
									subject: all[i].subject,
									teacher: all[i].teacher,
									className: all[i].className,
									points: all[i].points,
									goals: all[i].goals,
									instructions: all[i].instructions,
									assignDate: all[i].assignDate,
									dueDate: all[i].dueDate,
									pointsEarned: all[i].students[j].pointsEarned,
									grade: all[i].students[j].grade,
									comments: all[i].students[j].comments
								});
							}
						}
					}
					return relevant;
				})
				.then(relevant => {
					let grades = {};

					for (let i = 0; i < relevant.length; i++) {
						if (!Object.keys(grades).includes(relevant[i].className)) {
							grades[relevant[i].className] = {
								assignments: 0,
								points: 0,
								pointsEarned: 0
							};
						}
						
						grades[relevant[i].className].assignments++;
						if (relevant[i].pointsEarned && relevant[i].points) {
							grades[relevant[i].className].points += relevant[i].points,
							grades[relevant[i].className].pointsEarned += relevant[i].pointsEarned;
						}
					}

					return res.status(200).json({ relevant, grades });
				})
				.catch(err => res.status(500).json({ message: 'Internal server error.' })));
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
	
	let {student, pointsEarned, comments} = req.body;

	Assignment
		.findById(req.params.id)
		.then(assignment => {
			let studentIndex = assignment.students.findIndex(each => each.username === student);
			let studentObject = assignment.students.splice(studentIndex, 1)[0];
			
			studentObject['pointsEarned'] = pointsEarned;
			studentObject['comments'] = comments;

			assignment.students.push(studentObject);
			assignment.save();
			return assignment;
		})
		.then(assignment => res.status(200).json(assignment))
		.catch(err => res.status(500).json({message: 'Internal server error.'}));
});

module.exports = { router };
