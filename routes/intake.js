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

/* GET list of intakes sorted by priority*/ 
router.get('/', function(req,res) {
    Intake.find({}, null, {sort: { priority: 1 } }, function(err, intakes) {
        if(err){
            console.log(err);
        } else {
            res.render('intakes', {
                title: 'All Requests',
                intakes: intakes
            });
        }
    });
});

//get the completed intakes
router.get('/completed/:page', function(req,res) {
    var perPage = 10;
    var page = req.params.page || 1;
    Completed.find({}).skip((perPage*page) - perPage).limit(perPage).exec(function(err, intakes) {
        Completed.count().exec(function(err, count) {
            if(err){
                console.log(err);
            } else {
                res.render('completed', {
                    title: 'Completed Intakes',
                    intakes: intakes,
                    current: page,
                    pages: Math.ceil(count/perPage)
                });
            }
        })     
    });
});

//get view for creating intake
router.get('/create', ensureAuthenticated, function(req, res, next) {
    res.render('createIntake', { title: 'Submit an Intake' });
});

//creating the intake
router.post('/create', upload.array('attachments', 10), function(req, res, next) {
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

        //initialize intakes with given fields and default values
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
        intake.priority = 0;
        intake.save(function(err) {
            if(err) {
                console.log(err);
                return;
            } else {
                //sendEmail(intake.requestName);
                req.flash('success', 'Your Intake Has Been Successfully Submitted');
                res.redirect('/intakes');
            }
        });
        //Set default priority to be last
        /*Intake.count({}, function(err, count) {
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
        });*/       
    }
});

//render the kanban
router.get('/kanban', function(req, res) {
    Intake.find({}, null, {sort: { priority: 1 } }, function(err, intakes) {
        res.render('kanban', {
            title: 'Kanban',
            intakes: intakes
        });
    });
});

//grab the updated phases from the kanban and update db
router.post('/kanban/submit', altUpload.fields([]), function(req, res) {
    for(name in req.body) {
        Intake.findOne({requestName: name}, function(err, intake) {
            if(err)
                req.flash('danger', err);
            else {
                //intake moved to complete, remove from current intakes and move to completed
                if(req.body[intake.requestName]=='complete') {
                    let swap = new Completed(intake);
                    swap._id = mongoose.Types.ObjectId();
                    //document time of status change for reporting purposes
                    timePhase(swap, 'complete');
                    swap.phase = 'complete'
                    swap.isNew = true;
                    swap.save(function(err, completed) {
                        if(err) {
                            console.log(err);
                            return err;
                        } else {
                            intake.remove();   
                        }
                    });                        
                    req.flash('success', 'Your changes have been successfully updated');
                } else {
                    //intake not moved to complete, update intake and keep it in kanban
                    timePhase(intake, req.body[intake.requestName]);
                    intake.phase = req.body[intake.requestName];
                    intake.save(function(err, intake) {
                        if(err) {
                            console.log(err);
                            return err;
                        } else {
                            req.flash('success', 'Your changes have been successfully updated');
                        }
                    })
                }
            }
        });
    }
    res.redirect('/intakes/kanban');
});

router.post('/priorityupdate', altUpload.fields([]), function(req, res) {
    for(name in req.body) {
        var type = name.substring(0,2);
        var id = name.substring(2);
        //extract type of change and make according modification to the intake
        console.log("type: " + type);
        console.log("id: " + id);
        if(type=='pr') {
            Intake.findOneAndUpdate({_id: id}, {priority: req.body[name]}, function(err, intake) {
                if(err)
                    req.flash('danger', err);
                else {
                    req.flash('success', 'Your changes have been successfully updated');
                }
            });
        } else if(type=='de') {
            Intake.findOneAndUpdate({_id: id}, {offerConfigurator: req.body[name]}, function(err, intake) {
                if(err)
                    req.flash('danger', err);
                else {
                    req.flash('success', 'Your changes have been successfully updated');
                }
            });
        } else {
            Intake.findOneAndUpdate({_id: id}, {qa: req.body[name]}, function(err, intake) {
                if(err)
                    req.flash('danger', err);
                else {
                    req.flash('success', 'Your changes have been successfully updated');
                }
            });
        }
        
    }
    res.redirect('/intakes');
})

//edit an intake
router.get('/edit/:id/:completed', function(req, res) {
    //'completed' flag is 0, this is a regular intake
    if(req.params.completed==0) {
        Intake.findById(req.params.id, function(err, intake) {
            res.render('editIntake', {
                title: 'Edit Intake',
                intake: intake
            });
        });
    //completed flag is 1, this is a completed intake
    } else {
        Completed.findById(req.params.id, function(err, intake) {
            res.render('editIntake', {
                title: 'Edit Intake',
                intake: intake
            });
        });
    }
    
});

router.post('/edit/:id/:completed', upload.array('attachments', 10), ensureAuthenticated, function(req, res, next) {

    //completed flag is not set, edit a regular intake
    if(req.params.completed==0) {
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
                    //intake.attachments.push(req.files);
                    for(var i = 0; i < req.files.length; i++) {
                        intake.attachments.push(req.files[i]);
                    }
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
                    oldVersion.updated = intake.current.updated;
                    intake.prev.push(oldVersion);
                    intake.current = {
                        "description": req.body.description,
                        "targetDate": req.body.targetDate!='' ? req.body.targetDate : intake.current.targetDate,
                        "targetSystem": req.body.targetSystem,
                        "version": currVersion+1,
                        "updated": new Date()
                    }
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
    //completed flag is set, edit the completed intake
    } else {
        Completed.findById(req.params.id, function(err, intake) {
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
                    for(var i = 0; i < req.files.length; i++) {
                        intake.attachments.push(req.files[i]);
                    }
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
                    oldVersion.updated = intake.current.updated;
                    intake.prev.push(oldVersion);
                    intake.current = {
                        "description": req.body.description,
                        "targetDate": req.body.targetDate!='' ? req.body.targetDate : intake.current.targetDate,
                        "targetSystem": req.body.targetSystem,
                        "version": currVersion+1,
                        "updated": new Date()
                    }
                }
                //do the actual update
                Completed.update({_id: req.params.id }, {"$set": intake}, function(err) {
                    if(err)
                        console.log(err);
                    else {
                        req.flash('success', 'Your changes have been successfully updated');
                        res.redirect('/intakes');
                    }
                });
            }
        });
    }
});

//click on a single intake
router.get('/:id/version/:v', function(req, res) {
    Intake.findById(req.params.id, function(err, intake) {
        //default, go to current version
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
        //user specified different version to view
        else {
            var versionIndex = req.params.v-1;
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

//click on a single completed intake
router.get('/completed/:id/version/:v', function(req, res) {
    Completed.findById(req.params.id, function(err, intake) {
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
router.post('/comment/:id/:completed', altUpload.fields([]), ensureAuthenticated, function(req, res, next) {
    //check to see comment isn't empty
    req.checkBody('comment', 'Comment Field is Empty').notEmpty();
    
    let errors = req.validationErrors();
    if(errors) {
        console.log(errors);
        //res.redirect('/intakes');
        return;
    } else {
        //create the comment
        let comment = {
            author: {}
        };
        comment.posted = new Date();
        comment.author.attuid = req.user.email.substring(0,6);
        comment.author.name = req.user.name;
        comment.text = req.body.comment;

        if(req.params.completed==1) {
            Completed.findById(req.params.id, function(err, intake) {
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
                            res.redirect('/intakes/completed/'+intake._id+'/version/0');
                        }
                    });
                }
            });
        } else {
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
    }
});

router.post('/search', function(req,res) {
    console.log(req.body.search)
    Intake.find({$text: { $search: req.body.search}}, function(err, intakes) {
        if(err) {
            console.log(err);
            return;
        } else {
            res.render('intakes', {
                title: 'Intakes',
                intakes: intakes
            });
        }
    })
});

router.get('/return/:id', function(req,res) {
    Completed.findById(req.params.id, function(err, completed) {
        if(!err) {
            let swap = new Intake(completed);
            console.log(swap);
            swap._id = mongoose.Types.ObjectId();
            //document time of status change for reporting purposes
            timePhase(swap, 'requirements');
            swap.phase = 'requirements'
            swap.isNew = true;
            swap.save(function(err, intake) {
                if(err) {
                    console.log(err);
                    req.flash('danger', 'There was an error in returning the intake');
                    res.redirect('/intakes/');
                    return err;
                } else {
                    intake.remove();   
                    req.flash('success', 'This intake has been returned to in progress');
                    res.redirect('/intakes/');
                }
            });  
        }
    });
});

//document timing for phase change
function timePhase(intake, to) {
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
