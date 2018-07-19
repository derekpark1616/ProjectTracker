var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var passport = require('passport');

var User = require('../models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  User.find({}, function(err, people) {
    if(err){
        console.log(err);
    } else {
        res.render('users', {
            people: people
        });
    }
  });
});

//click on a single user
router.get('/edit/:id', ensureAuthenticated, function(req, res) {
  User.findById(req.params.id, function(err, person) {
      res.render('editUser', {
          person: person
      });
  });
});

//handle user permission edit
router.post('/edit/:id', ensureAuthenticated, function(req, res, next) {
  let person = {};

  person.type = req.body.type;

  let query = {_id:req.params.id}
  User.update(query, person, function(err){
      if(err) {
        req.flash('danger', err);
      } else {
        req.flash('success', 'Your changes have been successfully updated');
        res.redirect('/users');
      }
  });
});

router.get('/register', function(req, res) {
  res.render('register');
});

router.post('/register', function(req, res) {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const password2 = req.body.password2;

  req.checkBody('name', 'Name is required').notEmpty();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Name is required').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  let errors = req.validationErrors();
  if(errors) {
    res.render('register', {
      errors:errors
    });
  }
  else {
    let newUser = new User({
      name: name,
      email: email,
      password: password,
      type: 'R'
    });

    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(newUser.password, salt, function(err, hash) {
        if(err) {
          console.log(err);
          req.flash('danger', 'An error occurred with your registration');
          res.redirect('/users/register');
        } else {
          newUser.password = hash;
          newUser.save(function(err) {
            if(err) {
              console.log(err);
              if(err.code==11000) {
                req.flash('danger', 'A user with this email already exists');
                res.redirect('/users/register');
              } else {
                req.flash('danger', 'An error occurred with your registration');
                res.redirect('/users/register');
              }
            } else {
              req.flash('success', 'You are now registered and can log in');
              res.redirect('/users/login');
            }
          });
        }
      });
    });
  }
});

router.get('/login', function(req, res) {
  res.render('login');
});

//Login
router.post('/login', function(req, res, next){
  passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/users/login',
    failureFlash: true
  })(req, res, next);
});

// logout
router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/users/login');
});

//delete user
router.delete('/:id', function(req, res) {
  let query = { _id: req.params.id };
    User.remove(query, function(err) {
        if(err)
            console.log(err);
        else{
            req.flash('success', 'User has been deleted');
            res.send('Success');
        }   
    });
});

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('danger', 'Please login');
    res.redirect('/users/login');
  }
}
module.exports = router;
