
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	firstName: { type: String },
	lastName: { type: String },
	isTeacher: {type: Boolean, required: true},
	classes: [
		{
			name: {type: String},
			students: {type: Array}
		}
	]
});

UserSchema.methods.serialize = function () {
	return {
		username: this.username || '',
		firstName: this.firstName || '',
		lastName: this.lastName || '',
		isTeacher: this.isTeacher || false,
		classes: this.classes || ''
	};
};

UserSchema.methods.validatePassword = function (password) {
	return bcrypt.compare(password, this.password);
};

UserSchema.statics.hashPassword = function (password) {
	return bcrypt.hash(password, 10);
};

const User = mongoose.model('User', UserSchema);

module.exports = {
	User,
};
