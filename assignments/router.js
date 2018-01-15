'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const router = express.Router();
const {Assignment} = require('./models');

//Create a new assignment
router.post('/teacher', jsonParser, (req, res) => {
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