'use strict';
const express = require('express');
const bodyParser = require('body-parser');
// const jsonParser = bodyParser.json();
const router = express.Router();
const {Assignment} = require('./models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });

//Create a new assignment
router.post('/teacher', jwtAuth, (req, res) => {
	if (!req.user.isTeacher) return res.status(403).json({code: 403, message: 'Nice try, but no dice.'});
    
	const {title, subject, teacher, className, points, goals, instructions, assignDate, dueDate, students} = req.body;
	Assignment.create({
		title,
		subject,
		teacher,
		className,
		points,
		goals,
		instructions,
		assignDate,
		dueDate,
		students
	}).then(assignment => res.status(201).json(assignment.serialize()))
		.catch(err => res.status(500).json({code: 500, message: 'Bad request.', err}));
});

//Modify an existing assignment to change properties other than students.
router.put('/teacher/change/:id', jwtAuth, (req, res) => {
	const toUpdate = {};
	const updateableFields = ['title', 'subject', 'className', 'points', 'goals', 'instructions', 'assignDate', 'dueDate'];
    
	updateableFields.forEach(field => {
		if (field in req.body) {
			toUpdate[field] = req.body[field];
		}
	});

	Assignment
		.findByIdAndUpdate(req.params.id, {$set: toUpdate})
		.then(newAssignment => res.status(204).json({newAssignment}))
		.catch(err => res.status(500).json({message: 'Internal server error', err}));
});

//Add students to an assignment.
router.post('/teacher/add/:id', jwtAuth, (req, res) => {
	let newStudents;
	if ('students' in req.body) {
		newStudents = req.body.students;
	} else {
		res.status(500).json({message: 'Internal server error'});
	}

	Assignment
		.findById(req.params.id)
		.then(assignment => {
			let newArray = assignment.students;
			for (let i = 0; i < newStudents.length; i++) {
				newArray.push(newStudents[i]);
			}
			return Assignment.findByIdAndUpdate(req.params.id, {students: assignment.students}, {new: true});
		})
		.then(newAssignment => res.status(201).json({newAssignment}))
		.catch(err => res.status(500).json({message: 'Internal server error'}));

});

module.exports = {router};