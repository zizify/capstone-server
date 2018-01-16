'use strict';
const express = require('express');
const bodyParser = require('body-parser');
// const jsonParser = bodyParser.json();
const router = express.Router();
const { Assignment } = require('./models');
const { User } = require('../users/models');

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });

//Create a new assignment

// router.get('/teacher', jwtAuth, (req, res) => {
// 	console.log('hello')
// })
router.post('/teacher', jwtAuth, (req, res) => {
  if (!req.user.isTeacher)
    return res
      .status(403)
      .json({ code: 403, message: 'Nice try, but no dice.' });

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
  } = req.body;
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
  })
    .then(assignment => res.status(201).json(assignment.serialize()))
    .catch(err =>
      res.status(500).json({ code: 500, message: 'Bad request.', err })
    );
});

//Modify an existing assignment to change properties other than students.
router.put('/teacher/change/:id', jwtAuth, (req, res) => {
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

//Add students to an assignment.
router.post('/teacher/add/:id', jwtAuth, (req, res) => {
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

//Retrieves all of the assignments belonging to a student user.
router.get('/student', jwtAuth, (req, res) => {
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
        .then(relevant => res.status(200).json({ relevant }))
    )
    .catch(err => res.status(500).json({ message: 'Internal server error.' }));
});

router.delete('/teacher/delete/:id', jwtAuth, (req, res) => {
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

module.exports = { router };
