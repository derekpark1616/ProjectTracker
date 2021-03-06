var express = require('express');
var excel = require('node-excel-export');
var Intake = require('../models/intake');
var Completed = require('../models/completed');
var router = express.Router();

const styles = {
    headerDark: {
      fill: {
        fgColor: {
          rgb: 'FF000000'
        }
      },
      font: {
        color: {
          rgb: 'FFFFFFFF'
        },
        sz: 14,
        bold: true,
        underline: true
      }
    },
    cellPink: {
      fill: {
        fgColor: {
          rgb: 'FFFFCCFF'
        }
      }
    },
    cellGreen: {
      fill: {
        fgColor: {
          rgb: 'FF00FF00'
        }
      }
    }
  };

//sets headings for the in progress excel report
const inProgressHeading = [
    ['Request Name', 'Status', 'Create Date', 'Target Date', 'Package #', 'Detailed Description',
'Target System', 'Business Justification', 'Requestor', 'Approver & PAES', 'Offer Configurator', 
'Offer Configurator Estimate', 'QA', 'QA Estimate']
];

//headings for versions excel report
const versionsHeading = [
    ['Request Name', 'Version', 'Updated', 'Status', 'Create Date', 'Target Date', 'Package #', 'Detailed Description',
'Target System', 'Business Justification', 'Requestor', 'Approver & PAES', 'Offer Configurator', 
'Offer Configurator Estimate', 'QA', 'QA Estimate']
];

//headings for status report
const statusHeading = [
    ['Request Name', 'Package #', 'Time in Requirements (Hours)', 'Time in Requirements (%)',
    'Time in Ready for Development (Hours)', 'Time in Ready for Development (%)',
    'Time in Development (Hours)', 'Time in Development (%)',
    'Time in QA (Hours)', 'Time in QA (%)','Time in Approval (Hours)', 'Time in Approval (%)',]
];

//sets the data scheme for the in progress excel report
const inProgressSpec = {
    requestName: {
        displayName: 'Request Name',
        width: 100,
        headerStyle: styles.headerDark
    },
    phase: {
        displayName: 'Status',
        width: 100,
        headerStyle: styles.headerDark
    },
    requestDate: {
        displayName: 'Create Date',
        width: 100,
        headerStyle: styles.headerDark
    },
    targetDate: {
        displayName: 'Target Date',
        width: 100,
        headerStyle: styles.headerDark
    },
    package: {
        displayName: 'Package #',
        width: 100,
        headerStyle: styles.headerDark
    },
    description: {
        displayName: 'Detailed Description',
        width: 100,
        headerStyle: styles.headerDark
    },
    targetSystem: {
        displayName: 'Target System',
        width: 100,
        headerStyle: styles.headerDark
    },
    justification: {
        displayName: 'Business Justification',
        width: 100,
        headerStyle: styles.headerDark
    },
    requestor: {
        displayName: 'Requestor',
        width: 100,
        headerStyle: styles.headerDark
    },
    paesNumber: {
        displayName: 'Approver & PAES',
        width: 100,
        headerStyle: styles.headerDark
    },
    offerConfigurator: {
        displayName: 'Offer Configurator',
        width: 100,
        headerStyle: styles.headerDark
    },
    offerConfiguratorEstimate: {
        displayName: 'Offer Configurator Estimate',
        width: 100,
        headerStyle: styles.headerDark
    },
    qa: {
        displayName: 'QA',
        width: 100,
        headerStyle: styles.headerDark
    },
    qaEstimate: {
        displayName: 'QA Estimate',
        width: 100,
        headerStyle: styles.headerDark
    }

}

//sets the data scheme for the versions excel report
const versionsSpec = {
    requestName: {
        displayName: 'Request Name',
        width: 100,
        headerStyle: styles.headerDark
    },
    version: {
        displayName: 'Version',
        width: 100,
        headerStyle: styles.headerDark
    },
    updated: {
        displayName: 'Updated',
        width: 100,
        headerStyle: styles.headerDark
    },
    phase: {
        displayName: 'Status',
        width: 100,
        headerStyle: styles.headerDark
    },
    requestDate: {
        displayName: 'Create Date',
        width: 100,
        headerStyle: styles.headerDark
    },
    targetDate: {
        displayName: 'Target Date',
        width: 100,
        headerStyle: styles.headerDark
    },
    package: {
        displayName: 'Package #',
        width: 100,
        headerStyle: styles.headerDark
    },
    description: {
        displayName: 'Detailed Description',
        width: 100,
        headerStyle: styles.headerDark
    },
    targetSystem: {
        displayName: 'Target System',
        width: 100,
        headerStyle: styles.headerDark
    },
    justification: {
        displayName: 'Business Justification',
        width: 100,
        headerStyle: styles.headerDark
    },
    requestor: {
        displayName: 'Requestor',
        width: 100,
        headerStyle: styles.headerDark
    },
    paesNumber: {
        displayName: 'Approver & PAES',
        width: 100,
        headerStyle: styles.headerDark
    },
    offerConfigurator: {
        displayName: 'Offer Configurator',
        width: 100,
        headerStyle: styles.headerDark
    },
    offerConfiguratorEstimate: {
        displayName: 'Offer Configurator Estimate',
        width: 100,
        headerStyle: styles.headerDark
    },
    qa: {
        displayName: 'QA',
        width: 100,
        headerStyle: styles.headerDark
    },
    qaEstimate: {
        displayName: 'QA Estimate',
        width: 100,
        headerStyle: styles.headerDark
    }

}

//sets the data scheme for the status excel report
const statusSpec = {
    requestName: {
        displayName: 'Request Name',
        width: 100,
        headerStyle: styles.headerDark
    },
    package: {
        displayName: 'Package #',
        width: 100,
        headerStyle: styles.headerDark
    },
    requirementsHours: {
        displayName: 'Time in Requirements (Hours)',
        width: 100,
        headerStyle: styles.headerDark
    },
    requirementsPercent: {
        displayName: 'Time in Requirements (%)',
        width: 100,
        headerStyle: styles.headerDark
    },
    readyForDevHours: {
        displayName: 'Time in Ready for Development (Hours)',
        width: 100,
        headerStyle: styles.headerDark
    },
    readyForDevPercent: {
        displayName: 'Time in Ready for Development (%)',
        width: 100,
        headerStyle: styles.headerDark
    },
    developmentHours: {
        displayName: 'Time in Development (Hours)',
        width: 100,
        headerStyle: styles.headerDark
    },
    developmentPercent: {
        displayName: 'Time in Development (%)',
        width: 100,
        headerStyle: styles.headerDark
    },
    qaHours: {
        displayName: 'Time in QA (Hours)',
        width: 100,
        headerStyle: styles.headerDark
    },
    qaPercent: {
        displayName: 'Time in QA (%)',
        width: 100,
        headerStyle: styles.headerDark
    },
    approvalHours: {
        displayName: 'Time in Approval (Hours)',
        width: 100,
        headerStyle: styles.headerDark
    },
    approvalPercent: {
        displayName: 'Time in Approval (%)',
        width: 100,
        headerStyle: styles.headerDark
    },

}

//returns the landing page for reports
router.get('/', function(req,res) {
    res.render('reports', {
    });
});

//exports the in progress report to excel
router.get('/in-progress', function(req, res) {
    var dataset = [];
    Intake.find({}, function(err, intakes) {
        if(err){
            console.log(err);
            return err;
        } else {      
            intakes.forEach(function(intake) {
                //populates the array of objects with desired data
                dataset.push(
                    {
                        requestName: intake.requestName,
                        phase: intake.phase,
                        requestDate: intake.requestDate,
                        targetDate: intake.current.targetDate,
                        package: intake.package,
                        description: intake.current.description.replace(/<(?:.|\n)*?>/gm, '')
                        .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                        targetSystem: intake.current.targetSystem,
                        justification: intake.justification.replace(/<(?:.|\n)*?>/gm, '')
                        .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                        requestor: intake.requestor,
                        paesNumber: intake.paesNumber,
                        offerConfigurator: intake.offerConfigurator,
                        offerConfiguratorEstimate: intake.offerConfiguratorEstimate,
                        qa: intake.qa,
                        qaEstimate: intake.qaEstimate
                    }
                );
            });
        }
        //builds excel report using heading, specs, and data
        const report = excel.buildExport([{
            //heading: inProgressHeading,
            specification: inProgressSpec,
            data: dataset
        }]);
        res.attachment('requests-in-progress.xlsx');
        return res.send(report);
    });
});

//exports the completed report to excel
router.get('/completed', function(req, res) {
    var dataset = [];
    Completed.find({}, function(err, intakes) {
        if(err){
            console.log(err);
            return err;
        } else {      
            intakes.forEach(function(intake) {
                //populates the array of objects with desired data
                dataset.push(
                    {
                        requestName: intake.requestName,
                        phase: intake.phase,
                        requestDate: intake.requestDate,
                        targetDate: intake.current.targetDate,
                        package: intake.package,
                        //regex removes html formatting from string
                        description: intake.current.description.replace(/<(?:.|\n)*?>/gm, '')
                        .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                        targetSystem: intake.current.targetSystem,
                        justification: intake.justification.replace(/<(?:.|\n)*?>/gm, '')
                        .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                        requestor: intake.requestor,
                        paesNumber: intake.paesNumber,
                        offerConfigurator: intake.offerConfigurator,
                        offerConfiguratorEstimate: intake.offerConfiguratorEstimate,
                        qa: intake.qa,
                        qaEstimate: intake.qaEstimate
                    }
                );
            });
        }
        //builds excel report using heading, specs, and data
        const report = excel.buildExport([{
            //heading: inProgressHeading,
            specification: inProgressSpec,
            data: dataset
        }]);
        res.attachment('completed-requests.xlsx');
        return res.send(report);
    });
});

//exports the version report to excel
router.post('/versions', function(req, res) {
    var dataset = [];
    //error validation for from and to dates
    req.checkBody('from', 'A \'From Date\' is required').notEmpty();
    req.checkBody('to', 'A \'To Date\' is required').notEmpty();

    if(req.body.to && req.body.from > req.body.to) {
        req.flash('danger', '\'From Date\' should be before a \'To Date\'');
        return res.redirect('/reports');
    } 
    let errors = req.validationErrors();
    if(errors) {
        res.render('reports', {
            errors: errors
        });
    } else {
        Intake.find({}, function(err, intakes) {
            if(err){
                console.log(err);
                return err;
            } else {      
                var from = req.body.from;
                var to = req.body.to;
                intakes.forEach(function(intake) {

                    //make sure intakes' target date is between the given date parameters
                    if(from <= intake.current.targetDate && to >= intake.current.targetDate) {
                        //populates the array of objects with desired data
                        dataset.push({
                            requestName: intake.requestName,
                            version: intake.current.version,
                            updated: intake.current.updated,
                            phase: intake.phase,
                            requestDate: intake.requestDate,
                            targetDate: intake.current.targetDate,
                            package: intake.package,
                            description: intake.current.description.replace(/<(?:.|\n)*?>/gm, '')
                            .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                            targetSystem: intake.current.targetSystem,
                            justification: intake.justification.replace(/<(?:.|\n)*?>/gm, '')
                            .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                            requestor: intake.requestor,
                            paesNumber: intake.paesNumber,
                            offerConfigurator: intake.offerConfigurator,
                            offerConfiguratorEstimate: intake.offerConfiguratorEstimate,
                            qa: intake.qa,
                            qaEstimate: intake.qaEstimate
                        });
                        var previous = intake.prev;
                        previous.forEach(function(previousVersion) {
                            dataset.push({
                                requestName: intake.requestName,
                                version: previousVersion.version,
                                updated: previousVersion.updated,
                                phase: intake.phase,
                                requestDate: intake.requestDate,
                                targetDate: previousVersion.targetDate,
                                package: intake.package,
                                description: previousVersion.description.replace(/<(?:.|\n)*?>/gm, '')
                                .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                                targetSystem: previousVersion.targetSystem,
                                justification: intake.justification.replace(/<(?:.|\n)*?>/gm, '')
                                .replace(/&nbsp;/g, ' ').replace(/&ldquo;|&rdquo;/g, '"'),
                                requestor: intake.requestor,
                                paesNumber: intake.paesNumber,
                                offerConfigurator: intake.offerConfigurator,
                                offerConfiguratorEstimate: intake.offerConfiguratorEstimate,
                                qa: intake.qa,
                                qaEstimate: intake.qaEstimate
                            });
                        });
                    }              
                });
            }
            //builds excel report using heading, specs, and data
            const report = excel.buildExport([{
                //heading: versionsHeading,
                specification: versionsSpec,
                data: dataset
            }]);
            res.attachment('request-versions.xlsx');
            return res.send(report);
        });
    }
});

router.post('/status', function(req, res) {
    var dataset = [];
    //error validation for from and to dates
    req.checkBody('from', 'A \'From Date\' is required').notEmpty();
    req.checkBody('to', 'A \'To Date\' is required').notEmpty();

    if(req.body.to && req.body.from > req.body.to) {
        req.flash('danger', '\'From Date\' should be before a \'To Date\'');
        return res.redirect('/reports');
    } 

    let errors = req.validationErrors();
    if(errors) {
        res.render('reports', {
            errors: errors
        });
    } else {
        Intake.find({}, function(err, intakes) {
            if(err){
                console.log(err);
                return err;
            } else {      
                var from = req.body.from;
                var to = req.body.to;
                intakes.forEach(function(intake) {
                    //make sure intakes' target date is between the given date parameters
                    if(from <= intake.current.targetDate && to >= intake.current.targetDate) {
                        //populates the array of objects with desired data
                        calculateTimes(intake, dataset);
                    }              
                });
            }
            //builds excel report using heading, specs, and data
            const report = excel.buildExport([{
                //heading: statusHeading,
                specification: statusSpec,
                data: dataset
            }]);
            res.attachment('status-report.xlsx');
            return res.send(report);
        });
    }
});

function calculateTimes(intake, dataset) {
    //create variables to capture time in each phase
    var requirementsTime = readyfordevelopmentTime = developmentTime = 
    totalTime = qaTime = approvalTime = 0;
    //loop through each phase adding up the times, if package is still open, 
    //use current time to subtract from
    for(var i = 0; i < intake.requirements.entered.length; i++) {
        if(i >= intake.requirements.left.length) {
            requirementsTime += new Date() - intake.requirements.entered[i];
        } else {
            requirementsTime += intake.requirements.left[i] - intake.requirements.entered[i];
        }
    }
    for(var i = 0; i < intake.readyfordevelopment.entered.length; i++) {
        if(i >= intake.readyfordevelopment.left.length) {
            readyfordevelopmentTime += new Date() - intake.readyfordevelopment.entered[i];
        } else {
            readyfordevelopmentTime += intake.readyfordevelopment.left[i] - intake.readyfordevelopment.entered[i];
        }
    }
    for(var i = 0; i < intake.development.entered.length; i++) {
        if(i >= intake.development.left.length) {
            developmentTime += new Date() - intake.development.entered[i];
        } else {
            developmentTime += intake.development.left[i] - intake.development.entered[i];
        }
    }
    for(var i = 0; i < intake.qaTime.entered.length; i++) {
        if(i >= intake.qaTime.left.length) {
            qaTime += new Date() - intake.qaTime.entered[i];
        } else {
            qaTime += intake.qaTime.left[i] - intake.qaTime.entered[i];
        }
    }
    for(var i = 0; i < intake.inapproval.entered.length; i++) {
        if(i >= intake.inapproval.left.length) {
            approvalTime += new Date() - intake.inapproval.entered[i];
        } else {
            approvalTime += intake.inapproval.left[i] - intake.inapproval.entered[i];
        }
    }
    totalTime = requirementsTime + readyfordevelopmentTime + developmentTime + qaTime + approvalTime;
    dataset.push({
        requestName: intake.requestName,
        package: intake.package,
        requirementsHours: requirementsTime/3600000,
        requirementsPercent: requirementsTime/totalTime*100,
        readyForDevHours: readyfordevelopmentTime/3600000,
        readyForDevPercent: readyfordevelopmentTime/totalTime*100,
        developmentHours: developmentTime/3600000,
        developmentPercent: developmentTime/totalTime*100,
        qaHours: qaTime/3600000,
        qaPercent: qaTime/totalTime*100,
        approvalHours: approvalTime/3600000,
        approvalPercent: approvalTime/totalTime*100
    });
}

module.exports = router;