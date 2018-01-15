'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const router = express.Router();
const {Assignment} = require('./models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });

//Create a new assignment
router.post('/teacher', jwtAuth, (req, res) => {
    console.log(req.user);
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
		.catch(err => res.status(500).json({code: 500, message: 'We done fucked up.', err}));
});

module.exports = {router};