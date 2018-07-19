var express = require('express');
var multer = require('multer');
var fs = require('fs');
var nodemailer = require('nodemailer');
var mongoose = require('mongoose');
var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function(req, file, callback) {
        callback(null, req.body.requestName+'-'+file.originalname);
    }
});
var upload = multer({storage: storage});
var altUpload = multer();
var router = express.Router();
var Intake = require('../models/intake');
var Completed = require('../models/completed');

/* GET list of intakes */ 
router.get('/', function(req,res) {
    Intake.find({}, function(err, intakes) {
        if(err){
            console.log(err);
        } else {
            res.render('intakes', {
                title: 'Intakes',
                intakes: intakes
            });
        }
    });
});

//get view for creating intake
router.get('/create', ensureAuthenticated, function(req, res, next) {
  res.render('createIntake', { title: 'Submit an Intake' });
});

//creating the intake
router.post('/create', upload.array('attachments', 10), function(req, res, next) {
    console.log(req.body);
    console.log(req.files);
    req.checkBody('requestName', 'Request Name is required').notEmpty();
    req.checkBody('description', 'A Description is required').notEmpty();
    req.checkBody('justification', 'A Business Justification is required').notEmpty();
    
    let errors = req.validationErrors();
    if(errors) {
        res.render('createIntake', {
            title: 'Submit an Intake',
            errors: errors
        });
    } else {
        let intake = new Intake();

        intake.requestName = req.body.requestName.trim();
        intake.attachments = req.files;
        intake.current.updated = intake.requestDate = new Date();
        intake.current.targetDate = req.body.targetDate;
        intake.current.description = req.body.description;
        intake.justification = req.body.justification;
        //if requestor id is blank, set to current user
        var userAttId = req.user.email.substring(0, 6);
        intake.requestor = (req.body.requestor ? req.body.requestor : userAttId);
        intake.paesNumber = req.body.paesNumber;
        intake.current.targetSystem = req.body.targetSystem;
        intake.phase = "requirements";
        intake.current.version = 1;
        intake.requirements.entered.push(new Date());
        //Set default priority to be last
        Intake.count({}, function(err, count) {
            if(err)
                console.log(err);
            else {
                intake.priority = count+1;
                intake.save(function(err) {
                    if(err) {
                        console.log(err);
                        return;
                    } else {
                        //sendEmail(intake.requestName);
                        req.flash('success', 'Your Intake Has Been Successfully Submitted');
                        res.redirect('/');
                    }
                });
            }
        });       
    }
});

//render the kanban
router.get('/kanban', function(req, res) {
    Intake.find({}, function(err, intakes) {
        res.render('kanban', {
            title: 'Kanban',
            intakes: intakes
        });
    });
});

//grab the updated phases from the kanban and update db
router.post('/kanban/submit', altUpload.fields([]), function(req, res) {
    for(name in req.body) {
        //intake moved to complete, remove from current intakes and move to completed
        if(req.body[name]=='complete') {
            Intake.findOne({requestName: name}, function(err, intake) {
                if(err) {
                    console.log('error moving intake to complete');
                } else {
                    let swap = new Completed(intake);
                    swap._id = mongoose.Types.ObjectId();
                    timePhase(swap, req.body[name]);
                    swap.phase = 'complete'
                    swap.isNew = true;
                    swap.save(function(err, completed) {
                        if(err) {
                            console.log(err);
                            return err;
                        } else {
                            console.log(completed);
                            intake.remove();   
                        }
                    });                        
                    req.flash('success', 'Your changes have been successfully updated');
                }
            })
        //intake not moved to complete, update intake and keep it in kanban
        } else {
            Intake.findOne({requestName: name}, function(err, intake) {
                if(err)
                    req.flash('danger', err);
                else {
                    console.log("before time phase");
                    console.log(intake);
                    timePhase(intake, req.body[name]);
                    console.log("after time phase");
                    console.log(intake);
                    intake.phase = req.body[name];
                    intake.save(function(err, intake) {
                        if(err) {
                            console.log(err);
                            return err;
                        } else {
                            console.log("updated " + intake.requestName);
                            req.flash('success', 'Your changes have been successfully updated');
                        }
                    })                  
                }
            });
        }
    }
    res.redirect('/intakes/kanban');
});

router.post('/priorityupdate', altUpload.fields([]), function(req, res) {
    console.log(req.body);
    for(name in req.body) {
        Intake.findOneAndUpdate({_id: name}, {priority: req.body[name]}, function(err, intake) {
            if(err)
                req.flash('danger', err);
            else {
                console.log("updated " + intake.requestName);
                req.flash('success', 'Your changes have been successfully updated');
            }
        });
    }
    res.redirect('/intakes');
})

//edit an intake
router.get('/edit/:id', function(req, res) {
    Intake.findById(req.params.id, function(err, intake) {
        res.render('editIntake', {
            title: 'Edit Intake',
            intake: intake
        });
    });
});

router.post('/edit/:id', upload.array('attachments', 10), ensureAuthenticated, function(req, res, next) {

    Intake.findById(req.params.id, function(err, intake) {
        if(err) {
            console.log(err);
            return;
        } else {
            //updating all fields with new info
            var diffDescript = false;
            intake.requestName = req.body.requestName;

            //logic to only change description and justification for PMs and SUs
            if(req.user.type=='PM' || req.user.type=='SU') {
                intake.justification = req.body.justification;
                if(req.body.description!=intake.current.description) {
                    diffDescript = true;
                }    
            } 
            //if the files are not empty, push to attachments
            if(req.files!=undefined && req.files.length!=0) {
                console.log("nonempty array");
                intake.attachments.push(req.files);
            }
            intake.requestor = req.body.requestor;
            intake.package = req.body.package;
            intake.paesNumber = req.body.paesNumber;
            intake.offerConfigurator = req.body.offerConfigurator;
            intake.offerConfiguratorEstimate = req.body.offerConfiguratorEstimate;
            intake.qa = req.body.qa;
            intake.pm = req.body.pm;
            intake.qaEstimate = req.body.qaEstimate;
            //new version required, push current to prev and create new current
            if( (req.body.targetDate!='' && differentTime(intake.current.targetDate, req.body.targetDate)) 
            || diffDescript
            || (req.body.targetSystem!=undefined && !compareSystem(req.body.targetSystem, intake.current.targetSystem))) {
                 
                var currVersion = intake.current.version;
                var oldVersion = {};
                oldVersion.targetDate = intake.current.targetDate;
                oldVersion.description = intake.current.description;
                oldVersion.targetSystem = intake.current.targetSystem;
                oldVersion.version = currVersion;
                intake.prev.push(oldVersion);
                intake.current = {
                    "description": req.body.description,
                    "targetDate": req.body.targetDate!='' ? req.body.targetDate : intake.current.targetDate,
                    "targetSystem": req.body.targetSystem,
                    "version": currVersion+1,
                    "updated": new Date()
                }
                console.log(intake.prev);
            }
            //do the actual update
            Intake.update({_id: req.params.id }, {"$set": intake}, function(err) {
                if(err)
                    console.log(err);
                else {
                    req.flash('success', 'Your changes have been successfully updated');
                    res.redirect('/intakes');
                }
            });
        }
    });
});

//click on a single intake
router.get('/:id/version/:v', function(req, res) {
    Intake.findById(req.params.id, function(err, intake) {
        if(req.params.v==0) {
            res.render('intake', {
                intake: intake,
                description: intake.current.description,
                targetDate: intake.current.targetDate,
                targetSystem: intake.current.targetSystem,
                v: 'current',
                updated: intake.current.updated 
            });
        }      
        else {
            var versionIndex = req.params.v-1;
            console.log(versionIndex);
            console.log(intake.prev);
            res.render('intake', {
                intake: intake,
                description: intake.prev[versionIndex].description,
                targetDate: intake.prev[versionIndex].targetDate,
                targetSystem: intake.prev[versionIndex].targetSystem,
                v: req.params.v,
                updated: intake.prev[versionIndex].updated 
            });
        }
    });
});

//deleting intake
router.delete('/:id', function(req, res) {
    let query = { _id: req.params.id };
    
    Intake.findById(req.params.id, function(err, intake) {
        if(!err){
            //grab the attachments so we can remove from uploads folder
            var attachments = intake.attachments;
            Intake.remove(query, function(err) {
                if(err)
                    console.log(err);
                else{
                    attachments.forEach(function(attachment) {
                        fs.unlink(attachment.path, (err) => {
                            if(err) throw err;
                        })
                    });
                    req.flash('success', 'Intake has been deleted');
                    res.send('Success');
                }   
            });
        } else {
            console.log(err);
        }
    })
});

//posting a comment
router.post('/comment/:id', altUpload.fields([]), ensureAuthenticated, function(req, res, next) {
    //check to see comment isn't empty
    req.checkBody('comment', 'Comment Field is Empty').notEmpty();
    
    let errors = req.validationErrors();
    if(errors) {
        console.log(errors);
        res.redirect('/intakes');
    } else {
        //create the comment
        let comment = {
            author: {}
        };
        comment.posted = new Date();
        comment.author.attuid = req.user.email.substring(0,6);
        comment.author.name = req.user.name;
        comment.text = req.body.comment;

        //find the desired intake and push the comment to it's 'comments' field
        Intake.findById(req.params.id, function(err, intake) {
            if(err)
                console.log(err);
            else {
                intake.comments.push(comment);
                intake.save(function(err) {
                    if(err) {
                        console.log(err);
                        return;
                    } else {
                        req.flash('success', 'Your Comment has been posted');
                        res.redirect('/intakes/'+intake._id+'/version/0');
                    }
                });
            }
        });       
    }
});

//document timing for phase change
function timePhase(intake, to) {
    console.log(intake.phase);
    console.log(to);
    var currentTime = new Date();
    if(intake.phase=='requirements') {
        intake.requirements.left.push(currentTime);
    } else if(intake.phase=='readyfordevelopment') {
        intake.readyfordevelopment.left.push(currentTime);
    } else if(intake.phase=='development') {
        intake.development.left.push(currentTime);
    } else if(intake.phase=='qa') {
        intake.qaTime.left.push(currentTime);
    } else if(intake.phase=='inapproval') {
        intake.inapproval.left.push(currentTime);
    }

    if(to=='requirements') {
        intake.requirements.entered.push(currentTime);
    } else if(to=='readyfordevelopment') {
        intake.readyfordevelopment.entered.push(currentTime);
    } else if(to=='development') {
        intake.development.entered.push(currentTime);
    } else if(to=='qa') {
        intake.qaTime.entered.push(currentTime);
    } else if(to=='inapproval') {
        intake.inapproval.entered.push(currentTime);
    }
}

// Access Control
function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
      return next();
    } else {
      req.flash('danger', 'Please login');
      res.redirect('/users/login');
    }
}

//helper functions for comparison. used in seeing which fields have been updated for editing
function differentTime(time1, time2) {
    var currentTarget = new Date(time1);
    var newTarget = new Date(time2);
    return currentTarget != newTarget;
}

function compareSystem(current, request) {
    return current.length === request.length && current.every(function(v,i) {return v===request[i]});
}

function sendEmail(requestName) {
    nodemailer.createTestAccount((err, account) => {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'email address here',
                pass: 'password here'
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"Project Tracker"', // sender address
            to: 'd', // list of receivers
            subject: 'Intake: ' +requestName+ ' has been created', // Subject line
            text: 'Some random text', // plain text body
            html: '<b>Hello world?</b>' // html body (what actually shows)
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });
    });
}
module.exports = router;
