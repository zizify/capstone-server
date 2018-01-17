'use strict';
const mongoose = require('mongoose');

const AssignmentSchema = mongoose.Schema({
	title: {type: String, required: true},
	subject: {type: String, required: true},
	teacher: {type: String, required: true},
	className: {type: String, required: true},
	points: {type: Number, required: true},
	goals: {type: String, required: true},
	instructions: {type: String, required: true},
	assignDate: {
		weekday: {type: Number, required: true},
		date: {type: String, required: true}
	},
	dueDate: {
		weekday: {type: Number, required: true},
		date: {type: String, required: true}
	},
	students: {type: Array}
});

AssignmentSchema.methods.serialize = function () {
	const {
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
	} = this;
	return { title, subject, teacher, className, points, goals, instructions, assignDate, dueDate, students };
};

const Assignment = mongoose.model('Assignment', AssignmentSchema);

module.exports = {
	Assignment,
};
