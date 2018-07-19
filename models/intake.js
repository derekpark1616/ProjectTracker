let mongoose = require('mongoose');

// Intake Schema
let intakeSchema = mongoose.Schema({
    requestName:{
        type: String,
        required: true
    },
    package: Number,
    attachments: {
        type: []
    },
    requestDate:{
        type: Date,
        required: true
    },
    justification: {
        type: String,
        required: true
    },
    requestor: {
        type: String,
        required: true
    },
    paesNumber: {
        type: String
    },
    priority: {
        type: Number
    },
    phase: {
        type: String,
        required: true
    },
    requirements: {
        entered: [Date],
        left: [Date]
    },
    readyfordevelopment: {
        entered: [Date],
        left: [Date]
    },
    development: {
        entered: [Date],
        left: [Date]
    },
    qaTime: {
        entered: [Date],
        left: [Date]
    },
    inapproval: {
        entered: [Date],
        left: [Date]
    },
    offerConfigurator: {
        type: String
    },
    offerConfiguratorEstimate: {
        type: Number
    },
    qa: {
        type: String
    }, 
    qaEstimate: {
        type: Number
    }, 
    pm: String,
    current: {
        targetDate: {
            type: String
        },
        description: {
            type: String,
            required: true
        },
        targetSystem: {
            type: [String]
        },
        version: {
            type: Number
        },
        updated: {
            type: Date
        }
    },
    prev: [],
    comments: [
        { 
            posted: Date,
            author: { 
                attuid: String, 
                name: String 
            },
            text: String 
        }
    ]
}, 
{versionKey: false});

let Intake = module.exports = mongoose.model('Intake', intakeSchema);